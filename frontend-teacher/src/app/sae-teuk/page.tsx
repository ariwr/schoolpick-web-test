"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { getByteLength } from "@/lib/utils"
import { 
  ClipboardDocumentListIcon, 
  PlusIcon,
  TrashIcon,
  EyeIcon,
  PaperAirplaneIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  UserCircleIcon,
  BookOpenIcon,
  InformationCircleIcon,
  DocumentArrowDownIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline"

interface Question {
  id: string
  text: string
  type: 'text' | 'textarea'
  required: boolean
  placeholder?: string
  byteLimit?: number
  category?: string
}

interface ActivityRequest {
  id: string
  title: string
  description: string
  questions: Question[]
  targetClass: string
  deadline: string
  status: 'draft' | 'sent' | 'completed'
  createdAt: string
  responses: StudentResponse[]
  templateType?: 'autonomy' | 'career' | 'club' | 'custom'
}

interface StudentResponse {
  studentId: string
  studentName: string
  studentNumber?: string
  submitted: boolean
  submittedAt?: string
  answers: Record<string, string>
}

// 새로운 API 구조 타입 정의
interface ErrorDetail {
  original: string        // 오류 원본
  corrected: string | null // 교정 제안 (금칙어는 null)
  type: string           // 오류 유형 (e.g., 'banned_university', 'spelling')
  help: string           // 도움말
  start_index: number    // 오류 시작 위치
}

interface CheckResponse {
  original_text: string
  errors: ErrorDetail[]
}

// 텍스트 세그먼트 타입 정의
type TextSegment = 
  | { type: 'correct'; content: string }
  | { type: 'error'; data: ErrorDetail }

// 템플릿 데이터
const FORM_TEMPLATES = {
  autonomy: {
    title: '자율활동 3-1',
    description: '자율활동 관련 항목 작성',
    questions: [
      { id: 'q1', text: '올해 기울인 노력, 공부하는 습관', type: 'textarea' as const, required: true },
      { id: 'q2', text: '교과활동을 비롯해 여러 활동 중 리더로서 보인 면모(반장, 부반장, 학습부장, 에너지 절약도우미, 학습장 등등)', type: 'textarea' as const, required: true },
      { id: 'q3', text: '소풍(준비과정에 기여, 현장에서 역할, 활동을 통해 느낀점)', type: 'textarea' as const, required: true },
      { id: 'q4', text: '체육대회(준비과정에 기여, 현장에서 역할, 활동을 통해 느낀점)', type: 'textarea' as const, required: true },
      { id: 'q5', text: '교통안전교육, 민주시민교육, 유권자교육, 화재대피훈련, 장애인식개선교육, 다문화이해교육, 통일교육, 교육활동 침해 예방 교육, 아동학대 예방교육, 학교폭력예방교육, 흡연예방교육 중 인상깊었던 활동에 대한 참여 태도, 느낀점, 변화된 인식, 또는 확산활동내용 작성', type: 'textarea' as const, required: true },
      { id: 'q6', text: '청소 관련하여 맡은 역할, 협력과 배려, 문제해결및 개선제안이 잘 드러나게 작성', type: 'textarea' as const, required: true },
      { id: 'q7', text: '인성교육 실천주간(감사편지, 표어, 캘리그라피) 활동내용 느낀점', type: 'textarea' as const, required: true },
      { id: 'q8', text: '학급에서 자신의 역할에 대해 강조하고 싶은 내용', type: 'textarea' as const, required: true },
      { id: 'q9', text: '과학축전 참여 종목, 활동 및 느낀점', type: 'textarea' as const, required: true },
      { id: 'q10', text: '독서활동, 독서관련행사, 강연 본인에게 의미 있었던 행사에서 활동, 느낀점', type: 'textarea' as const, required: true },
    ]
  },
  career: {
    title: '3-1 진로활동',
    description: '진로활동 관련 항목 작성',
    questions: [
      { id: 'q1', text: '진로희망분야(관심분야 또는 희망직업)', type: 'text' as const, required: true },
      { id: 'q2', text: '진로관련 탐구조사 보고서 (탐구동기, 탐구 내용, 새롭게 알게된점, 더 알아보고 싶은점)', type: 'textarea' as const, required: true },
      { id: 'q3', text: '진로관련 독서(책제목, 저자, 느낀점, 향후 각오나 다짐)', type: 'textarea' as const, required: true },
      { id: 'q4', text: '교내 활동이 아닌 평상시에 자신의 꿈이나 목표를 이루기 위해 노력한 점(에피소드가 있다면 이를 중심으로)', type: 'textarea' as const, required: true },
      { id: 'q5', text: '진학박람회 다녀와서 느낀점', type: 'textarea' as const, required: true },
    ]
  },
  club: {
    title: '미래사회과제연구 동아리 자유탐구',
    description: '동아리 활동 관련 항목 작성',
    questions: [
      { id: 'q1', text: '탐구주제', type: 'text' as const, required: true },
      { id: 'q2', text: '900바이트로 요약하기', type: 'textarea' as const, required: true, byteLimit: 900, placeholder: '예) 고령화가 심화되는 사회에서 고령자 돌봄 문제를 기술로 해결할 수 있는 방법에 관심을 가지게 되어 AI 기반 돌봄 시스템을 주제로 탐구함...' },
    ]
  }
}

export default function SaeTeukPage() {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'dashboard' | 'workspace'>('list')
  const [selectedRequest, setSelectedRequest] = useState<ActivityRequest | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<StudentResponse | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<'autonomy' | 'career' | 'club' | 'custom' | null>(null)
  
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    targetClass: '',
    deadline: ''
  })
  
  const [questions, setQuestions] = useState<Question[]>([])
  const [newQuestion, setNewQuestion] = useState('')
  
  // 학생별 세특 최종안 저장
  const [studentFinalTexts, setStudentFinalTexts] = useState<Record<string, Record<string, string>>>({})
  const [byteLimits, setByteLimits] = useState<Record<string, number>>({})
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filteringContent, setFilteringContent] = useState("")
  const [filterErrors, setFilterErrors] = useState<ErrorDetail[]>([]) // errors로 변경
  const [isFiltering, setIsFiltering] = useState(false)
  const [filterError, setFilterError] = useState<string | null>(null)
  const [showInlineHighlights, setShowInlineHighlights] = useState(false)
  const [selectedErrorIndex, setSelectedErrorIndex] = useState<number | null>(null)

  // Mock data - 더 많은 샘플 데이터 추가
  const [activityRequests, setActivityRequests] = useState<ActivityRequest[]>([
    {
      id: '1',
      title: '자율활동 3-1',
      description: '3학년 1반 자율활동 기록',
      targetClass: '3학년 1반',
      deadline: '2024-01-15',
      status: 'sent',
      createdAt: '2024-01-10',
      templateType: 'autonomy',
      questions: FORM_TEMPLATES.autonomy.questions,
      responses: [
        {
          studentId: 's1',
          studentName: '김철수',
          studentNumber: '3101',
          submitted: true,
          submittedAt: '2024-01-12',
          answers: {
            q1: '올해부터 공부 계획을 세워 매일 아침 6시에 일어나 독서와 영어 단어 암기를 하기 시작했습니다. 수업 시간에는 적극적으로 질문하고, 방과후에는 복습 시간을 확보하며 성실하게 노력했습니다.',
            q2: '반장으로서 학급 회의를 주도하며 학생들의 의견을 수렴하고, 체육대회와 소풍 준비 시 조직력을 발휘했습니다. 또한 학습부장으로서 조별 학습 활동을 계획하고 운영했습니다.',
            q3: '소풍 준비 과정에서 안전 점검 체크리스트를 만들고, 현장에서는 그룹별로 나누어 안전하게 이동할 수 있도록 도왔습니다. 소풍을 통해 친구들과의 협력과 소통의 중요성을 깨달았습니다.',
            q4: '체육대회 준비에서 응원 도구 제작을 담당했고, 당일에는 응원단장으로서 팀원들의 사기를 북돋았습니다. 우승은 하지 못했지만, 팀워크의 힘을 느낄 수 있었습니다.',
          }
        },
        {
          studentId: 's2',
          studentName: '이영희',
          studentNumber: '3102',
          submitted: false,
          answers: {}
        },
        {
          studentId: 's3',
          studentName: '박민수',
          studentNumber: '3103',
          submitted: true,
          submittedAt: '2024-01-14',
          answers: {
            q1: '매일 복습 노트를 작성하며 학습 내용을 정리하는 습관을 기르기 시작했습니다.',
            q2: '에너지 절약도우미로서 교실 전등 관리와 재활용 분리수거를 적극적으로 실천했습니다.',
          }
        }
      ]
    },
    {
      id: '2',
      title: '3-1 진로활동',
      description: '3학년 1반 진로활동 기록',
      targetClass: '3학년 1반',
      deadline: '2024-01-20',
      status: 'sent',
      createdAt: '2024-01-15',
      templateType: 'career',
      questions: FORM_TEMPLATES.career.questions,
      responses: [
        {
          studentId: 's1',
          studentName: '김철수',
          studentNumber: '3101',
          submitted: true,
          submittedAt: '2024-01-18',
          answers: {
            q1: 'AI 개발자',
            q2: '챗봇의 원리와 자연어 처리 기술에 대해 탐구했습니다. 머신러닝 알고리즘의 작동 방식을 이해하게 되었고, 실제로 간단한 챗봇을 만들어보는 프로젝트를 진행했습니다.',
          }
        }
      ]
    }
  ])

  // 템플릿 선택 시 질문 항목 자동 채우기
  useEffect(() => {
    if (selectedTemplate && selectedTemplate !== 'custom') {
      const template = FORM_TEMPLATES[selectedTemplate]
      setNewRequest(prev => ({
        ...prev,
        title: template.title,
        description: template.description
      }))
      setQuestions(template.questions.map(q => ({ ...q, id: Date.now().toString() + Math.random() })))
    }
  }, [selectedTemplate])

  const addQuestion = () => {
    if (newQuestion.trim()) {
      const question: Question = {
        id: Date.now().toString(),
        text: newQuestion.trim(),
        type: 'textarea',
        required: true
      }
      setQuestions([...questions, question])
      setNewQuestion('')
    }
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id))
  }

  const createRequest = () => {
    // 실제로는 API 호출
    const newActivityRequest: ActivityRequest = {
      id: Date.now().toString(),
      ...newRequest,
      questions,
      status: 'sent',
      createdAt: new Date().toISOString().split('T')[0],
      responses: [],
      templateType: selectedTemplate || 'custom'
    }
    setActivityRequests([...activityRequests, newActivityRequest])
    setCurrentView('list')
    setNewRequest({ title: '', description: '', targetClass: '', deadline: '' })
    setQuestions([])
    setSelectedTemplate(null)
  }

  const openDashboard = (request: ActivityRequest) => {
    setSelectedRequest(request)
    setCurrentView('dashboard')
  }

  const openWorkspace = (student: StudentResponse) => {
    setSelectedStudent(student)
    setCurrentView('workspace')
  }

  const generateLLM = () => {
    // LLM 생성 로직
    console.log('Generating LLM content for:', selectedStudent?.studentName)
  }

  const getSubmissionProgress = (request: ActivityRequest) => {
    const submitted = request.responses.filter(r => r.submitted).length
    const total = request.responses.length
    return total > 0 ? Math.round((submitted / total) * 100) : 0
  }

  const getByteCounter = (text: string, limit?: number) => {
    const current = getByteLength(text)
    if (limit) {
      const percentage = (current / limit) * 100
      return { current, limit, percentage: Math.min(percentage, 100) }
    }
    return { current, limit: undefined, percentage: 0 }
  }

  // 바이트 카운터 컴포넌트
  const ByteCounter = ({ text, limit, label }: { text: string; limit?: number; label?: string }) => {
    const { current, limit: maxLimit, percentage } = getByteCounter(text, limit)
    const isWarning = maxLimit && current > maxLimit * 0.9
    const isOver = maxLimit && current > maxLimit
    
    return (
      <div className="mt-2">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className={`font-medium ${isOver ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-gray-600'}`}>
            {label || '바이트'}
          </span>
          <span className={isOver ? 'text-red-600 font-bold' : isWarning ? 'text-yellow-600' : 'text-gray-600'}>
            {current} {maxLimit ? `/ ${maxLimit}` : ''} Byte
          </span>
        </div>
        {maxLimit && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  // 템플릿 선택 화면
  if (currentView === 'create' && selectedTemplate === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <Button 
                variant="outline" 
                onClick={() => setCurrentView('list')}
                className="flex items-center space-x-2"
              >
                ← 목록으로
              </Button>
              <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                <PlusIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-godding-text-primary">새 활동 기록 요청</h1>
                <p className="text-lg text-godding-text-secondary mt-2">
                  템플릿을 선택하거나 빈 폼으로 시작하세요
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card 
              className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setSelectedTemplate('autonomy')}
            >
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <UserCircleIcon className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-godding-text-primary">자율활동</CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  자율활동 관련 항목 (10개 질문)
                </CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setSelectedTemplate('career')}
            >
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <AcademicCapIcon className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-godding-text-primary">진로활동</CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  진로활동 관련 항목 (5개 질문)
                </CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setSelectedTemplate('club')}
            >
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <BookOpenIcon className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-godding-text-primary">동아리</CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  동아리 활동 관련 항목 (2개 질문)
                </CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border hover:shadow-lg transition-all cursor-pointer md:col-span-3"
              onClick={() => setSelectedTemplate('custom')}
            >
              <CardHeader>
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <DocumentTextIcon className="w-6 h-6 text-gray-600" />
                </div>
                <CardTitle className="text-godding-text-primary">빈 템플릿</CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  처음부터 직접 만들기
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedTemplate(null)
                  setCurrentView('list')
                }}
                className="flex items-center space-x-2"
              >
                ← 목록으로
              </Button>
              <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                <PlusIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-godding-text-primary">새 활동 기록 요청</h1>
                <p className="text-lg text-godding-text-secondary mt-2">
                  학생들에게 받을 정보의 틀을 만들고 발송하세요
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">기본 정보</CardTitle>
                  <CardDescription className="text-godding-text-secondary">
                    활동 요청의 기본 정보를 입력하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-godding-text-primary mb-1">
                      활동 제목
                    </label>
                    <Input
                      value={newRequest.title}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="예: 자율활동 3-1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-godding-text-primary mb-1">
                      활동 설명
                    </label>
                    <Textarea
                      value={newRequest.description}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="학생들이 어떤 활동에 대해 기록해야 하는지 설명하세요"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-godding-text-primary mb-1">
                        대상 반
                      </label>
                      <Input
                        value={newRequest.targetClass}
                        onChange={(e) => setNewRequest(prev => ({ ...prev, targetClass: e.target.value }))}
                        placeholder="예: 3학년 1반"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-godding-text-primary mb-1">
                        제출 마감일
                      </label>
                      <Input
                        type="date"
                        value={newRequest.deadline}
                        onChange={(e) => setNewRequest(prev => ({ ...prev, deadline: e.target.value }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">질문 항목 설계</CardTitle>
                  <CardDescription className="text-godding-text-secondary">
                    학생들이 답변해야 할 질문 항목들을 추가하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="새 질문을 입력하세요"
                      onKeyPress={(e) => e.key === 'Enter' && addQuestion()}
                    />
                    <Button onClick={addQuestion} className="flex items-center space-x-2">
                      <PlusIcon className="w-4 h-4" />
                      <span>추가</span>
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {questions.map((question, index) => (
                      <div key={question.id} className="flex items-center space-x-3 p-3 bg-white/50 rounded-lg">
                        <span className="text-sm font-medium text-godding-text-primary w-8">
                          {index + 1}.
                        </span>
                        <span className="flex-1 text-godding-text-secondary">{question.text}</span>
                        {question.byteLimit && (
                          <span className="text-xs text-gray-500">({question.byteLimit} Byte 제한)</span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeQuestion(question.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">미리보기</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-godding-text-primary">{newRequest.title || '활동 제목'}</h4>
                      <p className="text-sm text-godding-text-secondary">{newRequest.description || '활동 설명'}</p>
                    </div>
                    <div className="text-sm text-godding-text-secondary">
                      <p>대상: {newRequest.targetClass || '대상 반'}</p>
                      <p>마감일: {newRequest.deadline || '마감일'}</p>
                    </div>
                    <div className="space-y-2">
                      {questions.map((question, index) => (
                        <div key={question.id} className="text-sm">
                          <span className="font-medium text-godding-text-primary">{index + 1}. </span>
                          <span className="text-godding-text-secondary">{question.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">작업</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={createRequest}
                    disabled={!newRequest.title || !newRequest.targetClass || questions.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                    요청 발송하기
                  </Button>
                  <Button variant="outline" className="w-full">
                    임시 저장
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'dashboard') {
    const progress = getSubmissionProgress(selectedRequest!)
    const submittedCount = selectedRequest?.responses.filter(r => r.submitted).length || 0
    const totalCount = selectedRequest?.responses.length || 0

    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <Button 
                variant="outline" 
                onClick={() => setCurrentView('list')}
                className="flex items-center space-x-2"
              >
                ← 목록으로
              </Button>
              <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                <EyeIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-godding-text-primary">응답 현황 대시보드</h1>
                <p className="text-lg text-godding-text-secondary mt-2">
                  {selectedRequest?.title}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-4">
              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">제출 현황</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {submittedCount}
                    </div>
                    <div className="text-sm text-godding-text-secondary mt-1">제출 완료</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-3xl font-bold text-red-600">
                      {totalCount - submittedCount}
                    </div>
                    <div className="text-sm text-godding-text-secondary mt-1">미제출</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {totalCount}
                    </div>
                    <div className="text-sm text-godding-text-secondary mt-1">전체 학생</div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium text-godding-text-primary">진행률</span>
                      <span className="text-godding-text-secondary">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-500 h-3 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">학생별 응답 현황</CardTitle>
                  <CardDescription className="text-godding-text-secondary">
                    학생 이름을 클릭하면 세특 작성을 시작할 수 있습니다
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedRequest?.responses.map((student) => (
                      <div 
                        key={student.studentId}
                        className="flex items-center justify-between p-4 bg-white/50 rounded-lg hover:bg-white/70 transition-colors cursor-pointer"
                        onClick={() => openWorkspace(student)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            student.submitted ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {student.submitted ? (
                              <CheckCircleIcon className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircleIcon className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-godding-text-primary">{student.studentName}</h4>
                            <p className="text-sm text-godding-text-secondary">
                              {student.submitted 
                                ? `제출 완료 - ${student.submittedAt}` 
                                : '미제출'
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              openWorkspace(student)
                            }}
                          >
                            <PencilIcon className="w-4 h-4 mr-1" />
                            세특 작성
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // InlineError 컴포넌트: 오류 텍스트와 제안 상자 표시
  const InlineError = ({
    errorData,
    onFix
  }: {
    errorData: ErrorDetail
    onFix: (correctedText: string | null) => void
  }) => {
    const { original, corrected, help } = errorData
    const isBanned = errorData.type.startsWith('banned_')

    return (
      <span className="relative inline-block">
        {/* 제안 상자 (오류 위에 표시) */}
        {corrected && (
          <button
            onClick={() => onFix(corrected)}
            className="absolute -top-7 left-0 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-10 hover:bg-gray-800 transition-colors whitespace-nowrap"
            title={help}
          >
            {corrected}
          </button>
        )}
        {isBanned && !corrected && (
          <button
            onClick={() => onFix(null)}
            className="absolute -top-7 left-0 bg-red-900 text-white text-xs px-2 py-1 rounded shadow-lg z-10 hover:bg-red-800 transition-colors whitespace-nowrap"
            title={help}
          >
            삭제
          </button>
        )}
        {/* 오류 텍스트 (빨간 밑줄) */}
        <span className="underline decoration-red-500 decoration-2 underline-offset-2">
          {original}
        </span>
      </span>
    )
  }

  // SpellCheckDisplay 메인 컴포넌트
  const SpellCheckDisplay = ({
    originalText,
    errors,
    onFix
  }: {
    originalText: string
    errors: ErrorDetail[]
    onFix: (correctedText: string | null, errorIndex: number) => void
  }) => {
    const segments = segmentText(originalText, errors)

    return (
      <div className="whitespace-pre-wrap text-base leading-relaxed p-4 bg-white border border-gray-200 rounded-lg min-h-[400px]">
        {segments.map((segment, index) => {
          if (segment.type === 'correct') {
            return <span key={index}>{segment.content}</span>
          } else {
            // error 타입인 경우, 해당 error의 인덱스 찾기
            const errorIndex = errors.findIndex(
              e => e.start_index === segment.data.start_index && e.original === segment.data.original
            )
            return (
              <InlineError
                key={index}
                errorData={segment.data}
                onFix={(correctedText) => onFix(correctedText, errorIndex)}
              />
            )
          }
        })}
      </div>
    )
  }

  // 수정/삭제 적용 함수 (SpellCheckDisplay에서 사용)
  const handleFixError = async (correctedText: string | null, errorIndex: number) => {
    const error = filterErrors[errorIndex]
    if (!error) return

    const studentKey = `${selectedRequest?.id}_${selectedStudent?.studentId}`
    const currentText = studentFinalTexts[studentKey]?.main || ''
    
    const { start_index, original } = error
    const originalLength = original.length
    const endIndex = start_index + originalLength
    
    // start_index가 유효한지 확인
    if (start_index < 0 || start_index >= currentText.length || endIndex > currentText.length) {
      console.warn('Error 위치를 찾을 수 없습니다:', error)
      return
    }
    
    let newText = ''
    
    if (correctedText === null) {
      // 삭제: 해당 부분을 제거하되, 주변 공백 처리로 자연스러운 문장 구성
      const beforeText = currentText.substring(0, start_index)
      const afterText = currentText.substring(endIndex)
      
      // 삭제된 텍스트 앞뒤 문자 확인
      const beforeChar = beforeText.slice(-1)
      const afterChar = afterText.charAt(0)
      
      let cleanedBefore = beforeText
      let cleanedAfter = afterText
      
      // 공백 처리 규칙:
      // 1. 삭제된 단어 뒤에 공백이 있고, 앞에 공백이 없으면 뒤 공백 제거
      if (afterChar === ' ' && beforeChar !== ' ' && beforeChar !== '' && beforeChar !== '\n' && beforeChar !== '\r') {
        cleanedAfter = afterText.substring(1)
      }
      // 2. 삭제된 단어 앞에 공백이 있고 뒤에도 공백이면 하나만 유지
      if (beforeChar === ' ' && afterChar === ' ') {
        cleanedBefore = beforeText.slice(0, -1)
      }
      
      newText = cleanedBefore + cleanedAfter
    } else {
      // 수정: correctedText로 교체
      const beforeText = currentText.substring(0, start_index)
      const afterText = currentText.substring(endIndex)
      newText = beforeText + correctedText + afterText
    }

    // 텍스트 업데이트
    setStudentFinalTexts(prev => ({
      ...prev,
      [studentKey]: { ...prev[studentKey], main: newText }
    }))

    // API 재호출로 인덱스 밀림 문제 해결
    setIsFiltering(true)
    setSelectedErrorIndex(null)
    
    try {
      // 수정된 텍스트로 다시 검열 API 호출
      await handleInlineFilter(newText)
    } catch (err) {
      setFilterError(err instanceof Error ? err.message : "검열 중 오류가 발생했습니다.")
    } finally {
      setIsFiltering(false)
    }
  }

  if (currentView === 'workspace') {
    const studentKey = `${selectedRequest?.id}_${selectedStudent?.studentId}`
    const finalText = studentFinalTexts[studentKey] || {}
    const byteLimit = byteLimits[studentKey] || 1500

    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <Button 
                variant="outline" 
                onClick={() => setCurrentView('dashboard')}
                className="flex items-center space-x-2"
              >
                ← 대시보드로
              </Button>
              <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                <PencilIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-godding-text-primary">세특 생성 워크스페이스</h1>
                <p className="text-lg text-godding-text-secondary mt-2">
                  {selectedStudent?.studentName} ({selectedStudent?.studentNumber}) - {selectedRequest?.title}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 학생 답변 원문 */}
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardHeader>
                <CardTitle className="text-godding-text-primary">학생 답변 원문</CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  학생이 제출한 구조화된 답변 내용입니다 (읽기 전용)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[800px] overflow-y-auto">
                {selectedRequest?.questions.map((question, index) => {
                  const answer = selectedStudent?.answers[question.id] || '답변 없음'
                  return (
                    <div key={question.id} className="p-4 bg-white/50 rounded-lg border border-gray-200">
                      <div className="flex items-start space-x-2 mb-2">
                        <span className="font-semibold text-godding-text-primary">{index + 1}.</span>
                        <h4 className="font-medium text-godding-text-primary flex-1">
                          {question.text}
                        </h4>
                      </div>
                      <div className="mt-2 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-godding-text-secondary whitespace-pre-wrap">
                          {answer}
                        </p>
                      </div>
                      {question.byteLimit && (
                        <ByteCounter text={answer} limit={question.byteLimit} />
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* 교사용 편집기 */}
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardHeader>
                <CardTitle className="text-godding-text-primary">세특 최종안 작성</CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  학생의 답변을 바탕으로 세특을 작성하고 편집하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex space-x-2">
                  <Button onClick={generateLLM} className="flex-1">
                    <ClipboardDocumentListIcon className="w-4 h-4 mr-2" />
                    LLM 초안 생성
                  </Button>
                  <Button variant="outline">
                    템플릿 적용
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-godding-text-primary mb-1">
                      바이트 제한
                    </label>
                    <Input 
                      type="number"
                      value={byteLimit}
                      onChange={(e) => setByteLimits(prev => ({ ...prev, [studentKey]: parseInt(e.target.value) || 1500 }))}
                      placeholder="1500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-godding-text-primary mb-1">
                      추가 키워드
                    </label>
                    <Input placeholder="리더십, 협력, 책임감" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-godding-text-primary">
                      세특 최종안
                    </label>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // 임시 저장
                          console.log('Saving draft...')
                        }}
                      >
                        <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                        임시 저장
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    {showInlineHighlights && filterErrors.length > 0 ? (
                      // 검열 모드: SpellCheckDisplay 사용
                      <SpellCheckDisplay
                        originalText={finalText['main'] || ''}
                        errors={filterErrors}
                        onFix={handleFixError}
                      />
                    ) : (
                      // 일반 편집 모드: Textarea 사용
                      <Textarea
                        value={finalText['main'] || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                          setStudentFinalTexts(prev => ({
                            ...prev,
                            [studentKey]: { ...prev[studentKey], main: e.target.value }
                          }))
                        }}
                        placeholder="학생의 답변을 바탕으로 세특을 작성하거나, LLM 초안 생성 버튼을 클릭하여 자동으로 생성하세요"
                        rows={15}
                        className="resize-none"
                      />
                    )}
                  </div>
                  <ByteCounter text={finalText['main'] || ''} limit={byteLimit} label="세특 최종안" />
                  {showInlineHighlights && filterErrors.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">{filterErrors.length}개의 문제가 발견되었습니다.</span>
                      <span className="ml-2 text-gray-500">하이라이트된 텍스트를 클릭하여 수정하세요.</span>
                    </div>
                  )}
                  {filterError && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{filterError}</p>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      // 최종 저장
                      console.log('Saving final text...')
                    }}
                  >
                    <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                    최종 저장
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={async () => {
                      const contentToFilter = finalText['main'] || ''
                      if (!contentToFilter.trim()) {
                        alert('검열할 내용이 없습니다. 세특을 먼저 작성해주세요.')
                        return
                      }
                      // 인라인 검열 모드로 전환
                      setFilteringContent(contentToFilter)
                      await handleInlineFilter(contentToFilter)
                    }}
                    disabled={isFiltering}
                  >
                    {isFiltering ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                        검열 중...
                      </>
                    ) : (
                      <>
                        <ShieldCheckIcon className="w-4 h-4 mr-2" />
                        세특 검열
                      </>
                    )}
                  </Button>
                  {showInlineHighlights && (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setShowInlineHighlights(false)
                        setFilterErrors([])
                        setSelectedErrorIndex(null)
                      }}
                    >
                      하이라이트 숨기기
                    </Button>
                  )}
                  <Button variant="outline">
                    미리보기
                  </Button>
                </div>

                {/* 완료 체크박스 */}
                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="completed"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="completed" className="text-sm font-medium text-godding-text-primary">
                    이 학생의 세특 작성 완료
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // 인라인 검열 함수 (새로운 API 구조 사용)
  const handleInlineFilter = async (content: string) => {
    if (!content.trim()) {
      setFilterError('검열할 내용이 없습니다.')
      return
    }

    const byteCount = getByteLength(content)
    const maxBytes = 2000
    
    if (byteCount > maxBytes) {
      setFilterError(`내용이 최대 바이트 수(${maxBytes}바이트)를 초과했습니다. 현재: ${byteCount}바이트`)
      return
    }

    setIsFiltering(true)
    setFilterError(null)
    setFilterErrors([])
    setShowInlineHighlights(false)
    setSelectedErrorIndex(null)

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      
      if (!API_BASE_URL) {
        throw new Error("API 서버 주소가 설정되지 않았습니다.")
      }

      // 새로운 API 엔드포인트 사용
      const response = await fetch(`${API_BASE_URL}/check/setuek`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: content,
        }),
      })

      if (!response.ok) {
        let errorMessage = "검열 중 오류가 발생했습니다."
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorData.message || errorMessage
        } catch {
          errorMessage = `서버 오류 (${response.status}): ${response.statusText || '알 수 없는 오류'}`
        }
        throw new Error(errorMessage)
      }

      const data: CheckResponse = await response.json()
      
      // errors를 start_index 기준으로 정렬
      const sortedErrors = [...(data.errors || [])].sort((a, b) => a.start_index - b.start_index)
      setFilterErrors(sortedErrors)
      setShowInlineHighlights(true)
      setSelectedErrorIndex(null)
    } catch (err) {
      setFilterError(err instanceof Error ? err.message : "검열 중 오류가 발생했습니다.")
      setShowInlineHighlights(false)
    } finally {
      setIsFiltering(false)
    }
  }



  // 검열 함수 (기존 모달용)
  const handleFilterContent = async () => {
    if (!filteringContent.trim()) {
      setFilterError('검열할 내용이 없습니다.')
      return
    }

    const byteCount = getByteLength(filteringContent)
    const maxBytes = 2000
    
    if (byteCount > maxBytes) {
      setFilterError(`내용이 최대 바이트 수(${maxBytes}바이트)를 초과했습니다. 현재: ${byteCount}바이트`)
      return
    }

    setIsFiltering(true)
    setFilterError(null)
    setFilterErrors([])

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      
      // API URL 유효성 검사
      if (!API_BASE_URL) {
        throw new Error("API 서버 주소가 설정되지 않았습니다.")
      }

      let response
      try {
        response = await fetch(`${API_BASE_URL}/api/content-filter/filter`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: filteringContent,
            max_bytes: maxBytes,
          }),
        })
      } catch (fetchError) {
        // 네트워크 오류 처리
        if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
          throw new Error(`서버에 연결할 수 없습니다. 백엔드 서버(${API_BASE_URL})가 실행 중인지 확인해주세요.`)
        }
        throw new Error(`요청 실패: ${fetchError instanceof Error ? fetchError.message : '알 수 없는 오류'}`)
      }

      if (!response.ok) {
        let errorMessage = "검열 중 오류가 발생했습니다."
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorData.message || errorMessage
        } catch {
          // JSON 파싱 실패 시 상태 텍스트 사용
          errorMessage = `서버 오류 (${response.status}): ${response.statusText || '알 수 없는 오류'}`
        }
        throw new Error(errorMessage)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error("서버 응답을 파싱할 수 없습니다.")
      }
      
      // issues의 original_text를 원본 filteringContent에서 정확히 찾아서 position 재계산
      const validatedIssues = (data.issues || []).map((issue: any) => {
        const originalText = issue.original_text || ''
        if (!originalText) {
          return issue
        }
        
        // 원본 filteringContent에서 original_text 찾기
        const searchResult = findTextInContent(originalText, filteringContent, issue.position)
        if (searchResult.position !== -1) {
          // 실제 찾은 위치와 텍스트로 업데이트
          return {
            ...issue,
            position: searchResult.position,
            length: searchResult.length,
            original_text: searchResult.actualText || originalText
          }
        }
        
        // 못 찾으면 원래대로 반환
        return issue
      })
      
      // 원본과 filtered_content를 비교하여 issues에 없는 삭제된 항목 찾기
      const missingIssues: typeof validatedIssues = []
      const originalContent = filteringContent
      const filteredContent = data.filtered_content
      
      // 금지된 단어 패턴 목록
      const forbiddenPatterns = [
        /대회/g,
        /서울대|고려대|하버드|MIT|옥스포드|케임브리지/g,
        /보건복지부|환경부|통계청|YMCA|OECD|유엔|WHO|식약처|질병관리청|국민연금관리공단/g,
        /삼성|애플|구글|유튜브|틱톡|TED|인스타그램|넷플릭스/g,
        /[·]/g, // 가운뎃점
        /[""]/g, // 큰따옴표
        /[<>]/g, // < > 괄호
      ]
      
      // 원본에서 각 금지 단어를 찾아서 filtered_content에 없는지 확인
      let searchIndex = 0
      while (searchIndex < originalContent.length) {
        let foundPattern = false
        let foundText = ''
        let foundPosition = -1
        
        for (const pattern of forbiddenPatterns) {
          pattern.lastIndex = 0 // 패턴 리셋
          const match = originalContent.substring(searchIndex).match(pattern)
          if (match && match.index !== undefined) {
            const matchText = match[0]
            const matchPosition = searchIndex + match.index
            
            // 이 텍스트가 filtered_content에서 삭제되었는지 확인
            const contextStart = Math.max(0, matchPosition - 20)
            const contextEnd = Math.min(originalContent.length, matchPosition + matchText.length + 20)
            const originalContext = originalContent.substring(contextStart, contextEnd)
            
            // filtered_content에서 이 문맥을 찾을 수 없거나 해당 단어가 없으면 삭제된 것으로 간주
            if (!filteredContent.includes(matchText) || !filteredContent.includes(originalContext.replace(matchText, ''))) {
              // 이미 issues에 포함되어 있는지 확인
              const alreadyInIssues = validatedIssues.some(issue => {
                const issueStart = issue.position
                const issueEnd = issue.position + issue.length
                return matchPosition >= issueStart && matchPosition + matchText.length <= issueEnd
              })
              
              if (!alreadyInIssues) {
                foundPattern = true
                foundText = matchText
                foundPosition = matchPosition
                searchIndex = matchPosition + matchText.length
                break
              }
            }
          }
        }
        
        if (foundPattern && foundPosition !== -1) {
          // 삭제된 항목을 issues에 추가
          missingIssues.push({
            type: 'delete' as const,
            position: foundPosition,
            length: foundText.length,
            original_text: foundText,
            suggestion: null,
            reason: `금지된 용어로 인해 삭제되었습니다.`
          })
        } else {
          searchIndex++
        }
      }
      
      // validatedIssues와 missingIssues를 합침 (position 기준 정렬)
      // 주의: 이 함수는 기존 모달용이며, 현재는 사용하지 않음
      // const allIssues = [...validatedIssues, ...missingIssues].sort((a: any, b: any) => a.position - b.position)
      // 모달은 현재 사용하지 않으므로 이 부분은 주석 처리
    } catch (err) {
      setFilterError(err instanceof Error ? err.message : "검열 중 오류가 발생했습니다.")
    } finally {
      setIsFiltering(false)
    }
  }

  // 검열 결과를 원본에 적용 (모달용 - 현재는 사용하지 않음)
  const applyFilteredContent = () => {
    const studentKey = `${selectedRequest?.id}_${selectedStudent?.studentId}`
    setStudentFinalTexts(prev => ({
      ...prev,
      [studentKey]: { ...prev[studentKey], main: filteringContent }
    }))
    setShowFilterModal(false)
  }

  // 텍스트 검색 헬퍼 함수 (따옴표 제거, 변형 버전 등으로 검색)
  const findTextInContent = (searchText: string, content: string, startPos: number): { position: number; length: number; actualText: string } => {
    if (!searchText) {
      return { position: -1, length: 0, actualText: '' }
    }

    // 1. 원본 텍스트 그대로 검색
    let pos = content.indexOf(searchText, Math.max(0, startPos - 50))
    if (pos !== -1) {
      return { position: pos, length: searchText.length, actualText: searchText }
    }

    // 2. 따옴표 제거한 버전으로 검색
    const withoutQuotes = searchText.replace(/['"]/g, '').trim()
    if (withoutQuotes && withoutQuotes !== searchText) {
      pos = content.indexOf(withoutQuotes, Math.max(0, startPos - 50))
      if (pos !== -1) {
        return { position: pos, length: withoutQuotes.length, actualText: withoutQuotes }
      }
    }

    // 3. 대소문자 구분 없이 검색
    const lowerSearch = searchText.toLowerCase()
    const lowerContent = content.toLowerCase()
    pos = lowerContent.indexOf(lowerSearch, Math.max(0, startPos - 50))
    if (pos !== -1) {
      // 실제 대소문자로 매칭된 텍스트 가져오기
      const actualText = content.substring(pos, pos + searchText.length)
      return { position: pos, length: actualText.length, actualText }
    }

    // 4. 따옴표 제거 + 대소문자 구분 없이 검색
    if (withoutQuotes && withoutQuotes !== searchText) {
      const lowerWithoutQuotes = withoutQuotes.toLowerCase()
      pos = lowerContent.indexOf(lowerWithoutQuotes, Math.max(0, startPos - 50))
      if (pos !== -1) {
        const actualText = content.substring(pos, pos + withoutQuotes.length)
        return { position: pos, length: actualText.length, actualText }
      }
    }

    // 못 찾으면 -1 반환
    return { position: -1, length: 0, actualText: '' }
  }

  // TextSegmenter 유틸리티 함수: original_text와 errors를 segments 배열로 파싱
  const segmentText = (originalText: string, errors: ErrorDetail[]): TextSegment[] => {
    if (errors.length === 0) {
      return [{ type: 'correct', content: originalText }]
    }

    // errors를 start_index 기준으로 정렬
    const sortedErrors = [...errors].sort((a, b) => a.start_index - b.start_index)
    
    const segments: TextSegment[] = []
    let lastIndex = 0

    sortedErrors.forEach((error) => {
      const { start_index, original } = error
      const endIndex = start_index + original.length

      // 오류 전의 정상 텍스트
      if (start_index > lastIndex) {
        segments.push({
          type: 'correct',
          content: originalText.substring(lastIndex, start_index)
        })
      }

      // 오류 텍스트
      segments.push({
        type: 'error',
        data: error
      })

      lastIndex = endIndex
    })

    // 마지막 오류 이후의 정상 텍스트
    if (lastIndex < originalText.length) {
      segments.push({
        type: 'correct',
        content: originalText.substring(lastIndex)
      })
    }

    return segments
  }

  // 인라인 하이라이트 오버레이 컴포넌트 (기존 - 제거 예정)
  const InlineHighlightOverlay = ({
    text,
    errors,
    selectedIndex,
    onErrorClick,
    onApplyCorrection,
    textareaId
  }: {
    text: string
    errors: ErrorDetail[]
    selectedIndex: number | null
    onErrorClick: (index: number) => void
    onApplyCorrection: (index: number, action: 'correct' | 'delete') => void
    textareaId: string
  }) => {
    const [textareaRect, setTextareaRect] = useState<DOMRect | null>(null)
    const [textareaStyle, setTextareaStyle] = useState<{
      paddingTop: number
      paddingLeft: number
      borderTop: number
      borderLeft: number
      lineHeight: number
      fontSize: number
      fontFamily: string
    } | null>(null)

    useEffect(() => {
      const updateRect = () => {
        const textarea = document.getElementById(textareaId) as HTMLTextAreaElement
        if (textarea) {
          const rect = textarea.getBoundingClientRect()
          setTextareaRect(rect)
          
          const computedStyle = window.getComputedStyle(textarea)
          setTextareaStyle({
            paddingTop: parseFloat(computedStyle.paddingTop) || 0,
            paddingLeft: parseFloat(computedStyle.paddingLeft) || 0,
            borderTop: parseFloat(computedStyle.borderTopWidth) || 0,
            borderLeft: parseFloat(computedStyle.borderLeftWidth) || 0,
            lineHeight: parseFloat(computedStyle.lineHeight) || 20,
            fontSize: parseFloat(computedStyle.fontSize) || 14,
            fontFamily: computedStyle.fontFamily,
          })
        }
      }

      updateRect()
      const interval = setInterval(updateRect, 100) // 주기적으로 업데이트
      window.addEventListener('resize', updateRect)
      window.addEventListener('scroll', updateRect, true)

      return () => {
        clearInterval(interval)
        window.removeEventListener('resize', updateRect)
        window.removeEventListener('scroll', updateRect, true)
      }
    }, [textareaId])

    if (!textareaRect || !textareaStyle) return null

    // 텍스트를 줄 단위로 분할
    const lines = text.split('\n')

    return (
      <div
        className="absolute pointer-events-none z-20"
        style={{
          top: textareaRect.top + textareaStyle.paddingTop + textareaStyle.borderTop,
          left: textareaRect.left + textareaStyle.paddingLeft + textareaStyle.borderLeft,
          width: textareaRect.width - textareaStyle.paddingLeft * 2,
          height: textareaRect.height - textareaStyle.paddingTop - (parseFloat(window.getComputedStyle(document.getElementById(textareaId)!).paddingBottom) || 0),
          fontFamily: textareaStyle.fontFamily,
          fontSize: `${textareaStyle.fontSize}px`,
          lineHeight: `${textareaStyle.lineHeight}px`,
        }}
      >
        {errors.map((error, idx) => {
          const { start_index, original, corrected, type, help } = error
          const isSelected = selectedIndex === idx
          const isBanned = type.startsWith('banned_') // 금칙어 타입 확인
          const originalLength = original.length

          // 텍스트에서 해당 위치의 줄과 컬럼 계산
          let lineStart = 0
          let lineNum = 0
          let colNum = 0

          for (let i = 0; i < lines.length; i++) {
            const lineEnd = lineStart + lines[i].length
            if (start_index < lineEnd || (start_index === lineEnd && i === lines.length - 1)) {
              lineNum = i
              colNum = start_index - lineStart
              break
            }
            lineStart = lineEnd + 1 // +1 for newline
          }

          // 하이라이트 위치 계산
          const top = lineNum * textareaStyle.lineHeight
          const charWidth = textareaStyle.fontSize * 0.6
          const left = colNum * charWidth
          
          // 원본 텍스트의 실제 너비 계산
          const width = Math.max(originalLength * charWidth, 20)

          // 타입에 따른 색상 클래스
          const colorClass = isBanned
            ? "bg-red-200/80 border-red-400 border-b-2"
            : type === "spelling"
            ? "bg-yellow-200/80 border-yellow-400 border-b-2"
            : "bg-blue-200/80 border-blue-400 border-b-2"

          return (
            <div
              key={idx}
              className={`absolute pointer-events-auto cursor-pointer ${colorClass} ${isSelected ? 'ring-2 ring-blue-500' : ''} transition-all group hover:ring-2 hover:ring-blue-400`}
              style={{
                top: `${top}px`,
                left: `${left}px`,
                width: `${width}px`,
                height: `${textareaStyle.lineHeight}px`,
                minWidth: '20px',
              }}
              onClick={() => onErrorClick(idx)}
              onMouseEnter={() => onErrorClick(idx)}
              title={help}
            >
              {/* 클릭 시 표시되는 팝오버 (부산대 맞춤법 검사기 스타일) */}
              {isSelected && (
                <div className="absolute -top-24 left-0 bg-gray-900 text-white text-xs rounded-lg shadow-2xl z-50 min-w-[280px] max-w-[400px] border border-gray-700">
                  {/* 도움말 */}
                  <div className="px-3 py-2 border-b border-gray-700">
                    <div className="font-semibold text-sm mb-1">{help}</div>
                    <div className="text-gray-400 text-[10px]">
                      <span className="font-mono bg-gray-800 px-2 py-0.5 rounded">{original}</span>
                      {corrected && (
                        <>
                          <span className="mx-2">→</span>
                          <span className="font-mono bg-blue-900 px-2 py-0.5 rounded">{corrected}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* 버튼 영역 */}
                  <div className="px-3 py-2 flex items-center justify-between gap-2">
                    <div className="flex gap-2 flex-1">
                      {corrected ? (
                        <button
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-white text-xs font-medium transition-colors flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            onApplyCorrection(idx, 'correct')
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          수정하기
                        </button>
                      ) : null}
                      {isBanned ? (
                        <button
                          className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-white text-xs font-medium transition-colors flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            onApplyCorrection(idx, 'delete')
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          삭제하기
                        </button>
                      ) : null}
                    </div>
                    <button
                      className="bg-gray-600 hover:bg-gray-700 px-3 py-1.5 rounded text-white text-xs font-medium transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        onErrorClick(-1)
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      무시
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // 하이라이트된 텍스트 렌더링
  const renderHighlightedContent = (content: string, issues: any[]) => {
    if (!issues || issues.length === 0) {
      return <p className="whitespace-pre-wrap text-gray-800">{content}</p>
    }

    // position 기준으로 정렬 (이미 validatedIssues로 재계산된 position 사용)
    const sortedIssues = [...issues].sort((a, b) => a.position - b.position)
    
    let result: React.ReactElement[] = []
    let lastIndex = 0

    sortedIssues.forEach((issue, idx) => {
      // validatedIssues에서 이미 실제 위치와 텍스트로 재계산되었으므로 직접 사용
      // 하지만 한번 더 검증하여 정확도 향상
      const originalText = issue.original_text || ''
      let actualPosition = issue.position
      let actualText = originalText
      let actualLength = issue.length
      
      // 실제 컨텐츠에서 해당 위치의 텍스트 확인
      const actualContentText = content.substring(actualPosition, Math.min(actualPosition + actualLength, content.length))
      
      // original_text가 실제 컨텐츠와 정확히 일치하는지 확인
      if (actualContentText === originalText) {
        // 일치하면 그대로 사용
        actualText = originalText
      } else if (originalText.length > 0) {
        // 다르면 다시 찾기 (더 넓은 범위에서 검색)
        const searchResult = findTextInContent(originalText, content, Math.max(0, actualPosition - 100))
        if (searchResult.position !== -1) {
          actualPosition = searchResult.position
          actualText = searchResult.actualText
          actualLength = searchResult.length
        } else {
          // 그래도 못 찾으면 실제 컨텐츠의 텍스트 사용 (가장 가까운 것)
          actualText = actualContentText || originalText
        }
      } else {
        // original_text가 없으면 position 기반으로
        actualText = actualContentText
      }
      
      const actualEnd = actualPosition + actualLength

      // 이슈 전 텍스트
      if (actualPosition > lastIndex) {
        result.push(
          <span key={`text-${idx}`}>
            {content.substring(lastIndex, actualPosition)}
          </span>
        )
      }

      // 이슈 텍스트 (하이라이트) - 실제 찾은 텍스트 사용
      const issueText = actualText
        
      const colorClass = issue.type === "delete" 
        ? "bg-red-200 text-red-900 underline decoration-red-500 font-semibold"
        : issue.type === "modify"
        ? "bg-yellow-200 text-yellow-900 underline decoration-yellow-500 font-semibold"
        : "bg-blue-200 text-blue-900 underline decoration-blue-500 font-semibold"

      // 중복 방지: lastIndex보다 앞에 있으면 건너뛰기
      if (actualPosition < lastIndex) {
        // 겹치는 경우: 이전 이슈가 끝나는 지점부터 시작
        if (actualEnd > lastIndex) {
          // 겹치는 부분만 하이라이트
          const overlapStart = lastIndex
          const overlapText = content.substring(overlapStart, Math.min(actualEnd, content.length))
          if (overlapText.length > 0) {
            result.push(
              <span
                key={`issue-${idx}`}
                className={`${colorClass} cursor-help relative inline-block group`}
                title={`${issue.type === 'delete' ? '삭제 필요' : issue.type === 'modify' ? '수정 필요' : '맞춤법 오류'}: ${issue.reason}${issue.suggestion ? ` → ${issue.suggestion}` : ""}`}
              >
                {overlapText}
                {/* 툴팁 */}
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                  {issue.reason}
                  {issue.suggestion && ` → ${issue.suggestion}`}
                </div>
              </span>
            )
          }
          lastIndex = Math.max(lastIndex, actualEnd)
        }
        // 완전히 포함된 경우는 건너뛰기
      } else {
        // 정상적인 경우: 하이라이트 추가
        result.push(
          <span
            key={`issue-${idx}`}
            className={`${colorClass} cursor-help relative inline-block group`}
            title={`${issue.type === 'delete' ? '삭제 필요' : issue.type === 'modify' ? '수정 필요' : '맞춤법 오류'}: ${issue.reason}${issue.suggestion ? ` → ${issue.suggestion}` : ""}`}
          >
            {/* 하이라이트된 텍스트 */}
            {issueText}
            {/* 툴팁 */}
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
              {issue.reason}
              {issue.suggestion && ` → ${issue.suggestion}`}
            </div>
          </span>
        )
        lastIndex = actualEnd
      }
    })

    // 마지막 이슈 이후 텍스트
    if (lastIndex < content.length) {
      result.push(
        <span key="text-end">
          {content.substring(lastIndex)}
        </span>
      )
    }

    return <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">{result}</p>
  }

  // FilterModal 컴포넌트 (현재는 사용하지 않음 - 인라인 UI 사용)
  const FilterModal = () => {
    if (!showFilterModal) return null

    const byteCount = getByteLength(filteringContent)
    const maxBytes = 2000
    // const hasIssues = filterErrors.length > 0 // 인라인 UI 사용으로 변경

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <ShieldCheckIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">세특 검열 결과</h2>
                <p className="text-blue-100 text-sm mt-1">작성한 세특을 검열하고 수정 제안을 받아보세요</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowFilterModal(false)
                setFilterErrors([])
                setFilterError(null)
              }}
              className="w-10 h-10 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>

          {/* 내용 영역 - 최종 검열 결과 중심 */}
          <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-white">
            <div className="max-w-5xl mx-auto space-y-6">
              {/* 최종 검열 결과 (메인 영역) */}
              {(!isFiltering && filterErrors.length === 0 && filteringContent) ? (
                <Card className="bg-white border-2 border-blue-300 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white flex items-center space-x-2">
                        <CheckCircleIcon className="w-6 h-6" />
                        <span className="text-xl font-bold">검열된 최종 내용</span>
                      </CardTitle>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="px-3 py-1 bg-white/20 text-white rounded-full font-medium">
                          {getByteLength(filteringContent)} / {maxBytes} 바이트
                        </span>
                        {filterErrors.length > 0 && (
                          <span className="px-3 py-1 bg-orange-500 text-white rounded-full font-medium">
                            {filterErrors.length}개 항목 처리됨
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 min-h-[400px] max-h-[600px] overflow-y-auto bg-white">
                    <div className="prose prose-lg max-w-none">
                      <p className="whitespace-pre-wrap text-gray-800 leading-relaxed text-base">
                        {filteringContent}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white border-2 border-gray-200 shadow-lg">
                  <CardHeader className="bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-gray-800 flex items-center space-x-2">
                        <DocumentTextIcon className="w-5 h-5" />
                        <span>작성한 세특</span>
                      </CardTitle>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className={`font-medium ${
                          byteCount > maxBytes ? 'text-red-600' : 
                          byteCount > maxBytes * 0.9 ? 'text-yellow-600' : 
                          'text-gray-600'
                        }`}>
                          {byteCount} / {maxBytes} 바이트
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 min-h-[300px] max-h-[500px] overflow-y-auto bg-white">
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">{filteringContent}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 처리된 항목 요약 */}
              {filterErrors.length > 0 && (
                <Card className="border-2 border-gray-200 shadow-sm">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <CardTitle className="text-gray-800 flex items-center space-x-2">
                      <ExclamationTriangleIcon className="w-5 h-5" />
                      <span>처리된 항목 상세 ({filterErrors.length}개)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {/* 삭제된 항목 */}
                    {filterErrors.filter((error: ErrorDetail) => error.type.startsWith('banned_')).length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <h3 className="font-semibold text-gray-700">
                            삭제된 항목 ({filterErrors.filter((error: ErrorDetail) => error.type.startsWith('banned_')).length}개)
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {filterErrors
                            .filter((error: ErrorDetail) => error.type.startsWith('banned_'))
                            .map((error: ErrorDetail, idx: number) => {
                              return (
                                <div key={`delete-${idx}`} className="bg-red-50 border border-red-200 rounded-lg p-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-red-900 mb-1">
                                        "{error.original}"
                                      </div>
                                      <div className="text-xs text-red-700 opacity-75">
                                        {error.help}
                                      </div>
                                    </div>
                                    <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded ml-2">
                                      삭제됨
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )}

                    {/* 수정된 항목 */}
                    {filterErrors.filter((error: ErrorDetail) => !error.type.startsWith('banned_') && error.corrected).length > 0 && (
                      <div>
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <h3 className="font-semibold text-gray-700">
                            수정된 항목 ({filterErrors.filter((error: ErrorDetail) => !error.type.startsWith('banned_') && error.corrected).length}개)
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {filterErrors
                            .filter((error: ErrorDetail) => !error.type.startsWith('banned_') && error.corrected)
                            .map((error: ErrorDetail, idx: number) => {
                              return (
                                <div key={`modify-${idx}`} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="font-medium text-yellow-900 mb-1">
                                        "{error.original}"
                                      </div>
                                      {error.corrected && (
                                        <div className="text-sm mb-1">
                                          <span className="text-yellow-700 opacity-75">→ </span>
                                          <span className="font-semibold text-yellow-800">{error.corrected}</span>
                                        </div>
                                      )}
                                      <div className="text-xs text-yellow-700 opacity-75">
                                        {error.help}
                                      </div>
                                    </div>
                                    <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded ml-2">
                                      수정됨
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 에러 메시지 */}
              {filterError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{filterError}</p>
                </div>
              )}

              {/* 검열 결과 없음 */}
              {!isFiltering && filterErrors.length === 0 && filteringContent && (
                <Card className="bg-green-50 border-2 border-green-200">
                  <CardContent className="p-6 text-center">
                    <CheckCircleIcon className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <p className="text-green-800 font-medium">검열 버튼을 클릭하여 검열을 시작하세요</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* 하단 액션 버튼 */}
          <div className="bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleFilterContent}
                disabled={isFiltering || !filteringContent.trim()}
              >
                {isFiltering ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                    검열 중...
                  </>
                ) : (
                  <>
                    <ShieldCheckIcon className="w-4 h-4 mr-2" />
                    검열하기
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowFilterModal(false)
                  setFilterErrors([])
                  setFilterError(null)
                }}
              >
                닫기
              </Button>
              {filterErrors.length > 0 && (
                <Button
                  onClick={() => {
                    setShowFilterModal(false)
                    setShowInlineHighlights(true)
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  인라인 검열로 전환
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default List View - 개선된 카드 UI
  return (
    <>
      <FilterModal />
    <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-godding-text-primary">세특 조사 관리</h1>
                <p className="text-lg text-godding-text-secondary mt-2">
                  학생들의 활동 기록을 체계적으로 수집하고 세특을 생성하세요
                </p>
              </div>
            </div>
            <Button 
              onClick={() => {
                setSelectedTemplate(null)
                setCurrentView('create')
              }}
              className="flex items-center space-x-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>새 요청 생성</span>
            </Button>
          </div>
        </div>

        {/* Activity Requests List - 개선된 카드 UI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activityRequests.map((request) => {
            const progress = getSubmissionProgress(request)
            const submittedCount = request.responses.filter(r => r.submitted).length
            const totalCount = request.responses.length

            return (
              <Card key={request.id} className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <CardTitle className="text-godding-text-primary group-hover:text-godding-primary transition-colors">
                        {request.title}
                      </CardTitle>
                      <CardDescription className="text-godding-text-secondary mt-2">
                        {request.description}
                      </CardDescription>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      request.status === 'sent' ? 'bg-green-100 text-green-700' :
                      request.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {request.status === 'sent' ? '발송됨' : 
                       request.status === 'draft' ? '임시저장' : '완료'}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4 text-sm text-godding-text-secondary">
                    <div className="flex items-center space-x-1">
                      <UserGroupIcon className="w-4 h-4" />
                      <span>{request.targetClass}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>{request.deadline}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-godding-text-secondary">제출 현황</span>
                      <span className="font-medium text-godding-text-primary">
                        {submittedCount} / {totalCount} 명
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        openDashboard(request)
                      }}
                      className="flex-1"
                    >
                      <EyeIcon className="w-4 h-4 mr-1" />
                      현황 보기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
    </>
  )
}
