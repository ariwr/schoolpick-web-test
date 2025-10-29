"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  PencilIcon
} from "@heroicons/react/24/outline"

interface Question {
  id: string
  text: string
  type: 'text' | 'textarea'
  required: boolean
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
}

interface StudentResponse {
  studentId: string
  studentName: string
  submitted: boolean
  submittedAt?: string
  answers: Record<string, string>
}

export default function SaeTeukPage() {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'dashboard' | 'workspace'>('list')
  const [selectedRequest, setSelectedRequest] = useState<ActivityRequest | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<StudentResponse | null>(null)
  
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    targetClass: '',
    deadline: ''
  })
  
  const [questions, setQuestions] = useState<Question[]>([])
  const [newQuestion, setNewQuestion] = useState('')

  // Mock data
  const [activityRequests] = useState<ActivityRequest[]>([
    {
      id: '1',
      title: '3-1반 체육대회 자율활동',
      description: '체육대회 준비 및 참여 과정에서의 자율활동 기록',
      targetClass: '3학년 1반',
      deadline: '2024-01-15',
      status: 'sent',
      createdAt: '2024-01-10',
      questions: [
        { id: 'q1', text: '준비과정에 기여한 점', type: 'textarea', required: true },
        { id: 'q2', text: '현장에서의 역할', type: 'textarea', required: true },
        { id: 'q3', text: '활동을 통해 느낀 점', type: 'textarea', required: true }
      ],
      responses: [
        {
          studentId: 's1',
          studentName: '김철수',
          submitted: true,
          submittedAt: '2024-01-12',
          answers: {
            q1: '체육대회 준비 과정에서 깃발 제작을 담당했습니다. 팀원들과 협력하여 학교 색상을 활용한 깃발을 만들었습니다.',
            q2: '체육대회 당일에는 응원단장 역할을 맡아 팀원들의 사기를 북돋아주었습니다.',
            q3: '팀워크의 중요성과 리더십의 의미를 깊이 이해할 수 있었습니다.'
          }
        },
        {
          studentId: 's2',
          studentName: '이영희',
          submitted: false,
          answers: {}
        }
      ]
    }
  ])

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
    console.log('Creating request:', { ...newRequest, questions })
    setCurrentView('list')
    setNewRequest({ title: '', description: '', targetClass: '', deadline: '' })
    setQuestions([])
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

  if (currentView === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
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
                  학생들에게 받을 정보의 틀을 만들고 발송하세요
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Request Info */}
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
                      placeholder="예: 3-1반 체육대회 자율활동"
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

              {/* Form Builder */}
              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">질문 항목 설계</CardTitle>
                  <CardDescription className="text-godding-text-secondary">
                    학생들이 답변해야 할 질문 항목들을 추가하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Question */}
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

                  {/* Questions List */}
                  <div className="space-y-3">
                    {questions.map((question, index) => (
                      <div key={question.id} className="flex items-center space-x-3 p-3 bg-white/50 rounded-lg">
                        <span className="text-sm font-medium text-godding-text-primary w-8">
                          {index + 1}.
                        </span>
                        <span className="flex-1 text-godding-text-secondary">{question.text}</span>
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

            {/* Preview & Actions */}
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
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
            {/* Stats */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">현황 요약</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedRequest?.responses.filter(r => r.submitted).length || 0}
                    </div>
                    <div className="text-sm text-godding-text-secondary">제출 완료</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {selectedRequest?.responses.filter(r => !r.submitted).length || 0}
                    </div>
                    <div className="text-sm text-godding-text-secondary">미제출</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedRequest?.responses.length || 0}
                    </div>
                    <div className="text-sm text-godding-text-secondary">전체 학생</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Student List */}
            <div className="lg:col-span-3">
              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">학생별 응답 현황</CardTitle>
                  <CardDescription className="text-godding-text-secondary">
                    학생 이름을 클릭하면 답변 내용을 확인할 수 있습니다
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

  if (currentView === 'workspace') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
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
                  {selectedStudent?.studentName} - {selectedRequest?.title}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Student Answers */}
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardHeader>
                <CardTitle className="text-godding-text-primary">학생 답변 원문</CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  학생이 제출한 구조화된 답변 내용입니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedRequest?.questions.map((question, index) => (
                  <div key={question.id} className="p-4 bg-white/50 rounded-lg">
                    <h4 className="font-medium text-godding-text-primary mb-2">
                      {index + 1}. {question.text}
                    </h4>
                    <p className="text-godding-text-secondary">
                      {selectedStudent?.answers[question.id] || '답변 없음'}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* LLM Generation */}
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardHeader>
                <CardTitle className="text-godding-text-primary">세특 생성</CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  LLM을 활용하여 세특 초안을 생성하고 편집하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Button onClick={generateLLM} className="flex-1">
                    <ClipboardDocumentListIcon className="w-4 h-4 mr-2" />
                    LLM 초안 생성
                  </Button>
                  <Button variant="outline">
                    템플릿 적용
                  </Button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-godding-text-primary mb-1">
                    바이트 제한
                  </label>
                  <Input placeholder="1500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-godding-text-primary mb-1">
                    추가 키워드
                  </label>
                  <Input placeholder="리더십, 협력, 책임감" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-godding-text-primary mb-1">
                    생성된 세특
                  </label>
                  <Textarea
                    placeholder="LLM 초안 생성 버튼을 클릭하면 여기에 결과가 표시됩니다"
                    rows={12}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button className="flex-1">
                    최종 저장
                  </Button>
                  <Button variant="outline">
                    미리보기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Default List View
  return (
    <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
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
              onClick={() => setCurrentView('create')}
              className="flex items-center space-x-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>새 요청 생성</span>
            </Button>
          </div>
        </div>

        {/* Activity Requests List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activityRequests.map((request) => (
            <Card key={request.id} className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border hover:bg-white transition-all duration-300 cursor-pointer group">
              <CardHeader>
                <div className="flex items-start justify-between">
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
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-godding-text-secondary">
                    {request.responses.filter(r => r.submitted).length} / {request.responses.length} 제출
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openDashboard(request)}
                  >
                    <EyeIcon className="w-4 h-4 mr-1" />
                    현황 보기
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}