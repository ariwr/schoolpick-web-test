"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    AcademicCapIcon,
    BookOpenIcon,
    CalendarIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    EyeIcon,
    PencilIcon,
    PlusIcon,
    TrashIcon,
    UserGroupIcon,
    XCircleIcon,
    ChartBarIcon,
    DocumentTextIcon,
    CogIcon
} from "@heroicons/react/24/outline"
import { useState } from "react"

interface Subject {
  id: string
  name: string
  category: '국어' | '영어' | '수학' | '사회' | '과학' | '체육' | '음악' | '미술' | '기술가정' | '정보' | '기타'
  grade: string
  semester: '1학기' | '2학기' | '전학년'
  description: string
  maxStudents: number
  minStudents: number
  currentStudents: number
  status: 'active' | 'cancelled' | 'pending' | 'overbooked'
  teacherId?: string
  teacherName?: string
  schedule?: {
    day: '월' | '화' | '수' | '목' | '금'
    period: number
  }[]
}

interface Student {
  id: string
  name: string
  grade: string
  class: string
  studentNumber: string
  selectedSubjects: string[]
  surveyCompleted: boolean
  surveyDate?: string
}

interface Teacher {
  id: string
  name: string
  subjects: string[]
  preferences: {
    preferredDays: ('월' | '화' | '수' | '목' | '금')[]
    preferredPeriods: number[]
    avoidAfternoon: boolean
    maxHoursPerDay: number
    maxHoursPerWeek: number
  }
  currentSchedule: {
    subjectId: string
    day: '월' | '화' | '수' | '목' | '금'
    period: number
  }[]
}

interface SurveyResult {
  subjectId: string
  subjectName: string
  studentCount: number
  students: Student[]
  status: 'sufficient' | 'insufficient' | 'overbooked'
}

export default function SubjectSurveyPage() {
  const [currentStep, setCurrentStep] = useState<'survey' | 'results' | 'schedule' | 'teachers'>('survey')
  
  // Subject Survey States
  const [subjects, setSubjects] = useState<Subject[]>([
    { 
      id: '1', 
      name: '고급 수학', 
      category: '수학', 
      grade: '3', 
      semester: '1학기', 
      description: '대학 수학 준비를 위한 심화 과정', 
      maxStudents: 30, 
      minStudents: 15, 
      currentStudents: 23, 
      status: 'active',
      teacherName: '김수학'
    },
    { 
      id: '2', 
      name: '영어 회화', 
      category: '영어', 
      grade: '3', 
      semester: '1학기', 
      description: '실용적인 영어 회화 능력 향상', 
      maxStudents: 25, 
      minStudents: 10, 
      currentStudents: 8, 
      status: 'pending',
      teacherName: '이영어'
    },
    { 
      id: '3', 
      name: '과학 실험', 
      category: '과학', 
      grade: '2', 
      semester: '1학기', 
      description: '실험을 통한 과학적 사고력 개발', 
      maxStudents: 20, 
      minStudents: 12, 
      currentStudents: 18, 
      status: 'active',
      teacherName: '박과학'
    },
    { 
      id: '4', 
      name: '한국사 심화', 
      category: '사회', 
      grade: '3', 
      semester: '1학기', 
      description: '수능 한국사 대비 심화 과정', 
      maxStudents: 35, 
      minStudents: 20, 
      currentStudents: 42, 
      status: 'overbooked',
      teacherName: '최사회'
    }
  ])
  
  const [students] = useState<Student[]>([
    { 
      id: 's1', 
      name: '김철수', 
      grade: '3', 
      class: '1', 
      studentNumber: '2024001', 
      selectedSubjects: ['1', '2'], 
      surveyCompleted: true,
      surveyDate: '2024-01-15'
    },
    { 
      id: 's2', 
      name: '이영희', 
      grade: '3', 
      class: '1', 
      studentNumber: '2024002', 
      selectedSubjects: ['1', '4'], 
      surveyCompleted: true,
      surveyDate: '2024-01-15'
    },
    { 
      id: 's3', 
      name: '박민수', 
      grade: '2', 
      class: '2', 
      studentNumber: '2024003', 
      selectedSubjects: ['3'], 
      surveyCompleted: true,
      surveyDate: '2024-01-16'
    },
    { 
      id: 's4', 
      name: '최지영', 
      grade: '3', 
      class: '2', 
      studentNumber: '2024004', 
      selectedSubjects: [], 
      surveyCompleted: false
    }
  ])

  const [teachers] = useState<Teacher[]>([
    {
      id: 't1',
      name: '김수학',
      subjects: ['1'],
      preferences: {
        preferredDays: ['월', '화', '수'],
        preferredPeriods: [1, 2, 3],
        avoidAfternoon: true,
        maxHoursPerDay: 4,
        maxHoursPerWeek: 12
      },
      currentSchedule: []
    },
    {
      id: 't2',
      name: '이영어',
      subjects: ['2'],
      preferences: {
        preferredDays: ['화', '목'],
        preferredPeriods: [4, 5, 6],
        avoidAfternoon: false,
        maxHoursPerDay: 3,
        maxHoursPerWeek: 6
      },
      currentSchedule: []
    }
  ])

  const [newSubject, setNewSubject] = useState({
    name: '',
    category: '국어' as Subject['category'],
    grade: '1',
    semester: '1학기' as Subject['semester'],
    description: '',
    maxStudents: 30,
    minStudents: 15
  })

  const addSubject = () => {
    if (newSubject.name) {
      const subject: Subject = {
        id: Date.now().toString(),
        ...newSubject,
        currentStudents: 0,
        status: 'pending'
      }
      setSubjects([...subjects, subject])
      setNewSubject({ 
        name: '', 
        category: '국어', 
        grade: '1', 
        semester: '1학기', 
        description: '', 
        maxStudents: 30, 
        minStudents: 15 
      })
    }
  }

  const getSubjectById = (id: string) => subjects.find(s => s.id === id)
  const getStudentById = (id: string) => students.find(s => s.id === id)

  const getSurveyResults = (): SurveyResult[] => {
    return subjects.map(subject => {
      const subjectStudents = students.filter(student => 
        student.selectedSubjects.includes(subject.id)
      )
      
      let status: 'sufficient' | 'insufficient' | 'overbooked' = 'sufficient'
      if (subjectStudents.length < subject.minStudents) {
        status = 'insufficient'
      } else if (subjectStudents.length > subject.maxStudents) {
        status = 'overbooked'
      }
      
      return {
        subjectId: subject.id,
        subjectName: subject.name,
        studentCount: subjectStudents.length,
        students: subjectStudents,
        status
      }
    })
  }

  const cancelSubject = (subjectId: string) => {
    setSubjects(subjects.map(subject => 
      subject.id === subjectId ? { ...subject, status: 'cancelled' } : subject
    ))
  }

  const activateSubject = (subjectId: string) => {
    setSubjects(subjects.map(subject => 
      subject.id === subjectId ? { ...subject, status: 'active' } : subject
    ))
  }

  // Subject Survey Management View
  if (currentStep === 'survey') {
    const surveyStats = {
      totalSubjects: subjects.length,
      activeSubjects: subjects.filter(s => s.status === 'active').length,
      pendingSubjects: subjects.filter(s => s.status === 'pending').length,
      cancelledSubjects: subjects.filter(s => s.status === 'cancelled').length,
      totalStudents: students.length,
      completedSurveys: students.filter(s => s.surveyCompleted).length
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <BookOpenIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-godding-text-primary">과목 수요조사 관리</h1>
                  <p className="text-lg text-godding-text-secondary mt-2">
                    1단계: 과목 등록 및 학생 수요조사 현황 관리
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep('results')}
                >
                  다음 단계: 수요조사 결과
                </Button>
              </div>
            </div>
          </div>

          {/* Survey Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">전체 과목</p>
                    <p className="text-2xl font-bold text-godding-text-primary">{surveyStats.totalSubjects}</p>
                  </div>
                  <BookOpenIcon className="w-8 h-8 text-godding-primary" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">개설 예정</p>
                    <p className="text-2xl font-bold text-green-600">{surveyStats.activeSubjects}</p>
                  </div>
                  <CheckCircleIcon className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">검토 중</p>
                    <p className="text-2xl font-bold text-yellow-600">{surveyStats.pendingSubjects}</p>
                  </div>
                  <ClockIcon className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">폐강</p>
                    <p className="text-2xl font-bold text-red-600">{surveyStats.cancelledSubjects}</p>
                  </div>
                  <XCircleIcon className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student Survey Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">수요조사 완료율</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {Math.round((surveyStats.completedSurveys / surveyStats.totalStudents) * 100)}%
                    </p>
                  </div>
                  <UserGroupIcon className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">미완료 학생</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {surveyStats.totalStudents - surveyStats.completedSurveys}명
                    </p>
                  </div>
                  <ExclamationTriangleIcon className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Subject Registration */}
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardHeader>
                <CardTitle className="text-godding-text-primary flex items-center space-x-2">
                  <BookOpenIcon className="w-5 h-5" />
                  <span>과목 등록</span>
                </CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  새로운 과목을 수요조사에 추가하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Input
                    value={newSubject.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="과목 이름 (예: 고급 수학)"
                  />
                  <select
                    value={newSubject.category}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewSubject(prev => ({ ...prev, category: e.target.value as Subject['category'] }))}
                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="국어">국어</option>
                    <option value="영어">영어</option>
                    <option value="수학">수학</option>
                    <option value="사회">사회</option>
                    <option value="과학">과학</option>
                    <option value="체육">체육</option>
                    <option value="음악">음악</option>
                    <option value="미술">미술</option>
                    <option value="기술가정">기술가정</option>
                    <option value="정보">정보</option>
                    <option value="기타">기타</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newSubject.grade}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewSubject(prev => ({ ...prev, grade: e.target.value }))}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="1">1학년</option>
                      <option value="2">2학년</option>
                      <option value="3">3학년</option>
                    </select>
                    <select
                      value={newSubject.semester}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewSubject(prev => ({ ...prev, semester: e.target.value as Subject['semester'] }))}
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="1학기">1학기</option>
                      <option value="2학기">2학기</option>
                      <option value="전학년">전학년</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      value={newSubject.maxStudents}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSubject(prev => ({ ...prev, maxStudents: parseInt(e.target.value) || 0 }))}
                      placeholder="최대 수강 인원"
                    />
                    <Input
                      type="number"
                      value={newSubject.minStudents}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSubject(prev => ({ ...prev, minStudents: parseInt(e.target.value) || 0 }))}
                      placeholder="최소 개설 인원"
                    />
                  </div>
                  <Textarea
                    value={newSubject.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewSubject(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="과목 설명"
                    rows={2}
                  />
                  <Button onClick={addSubject} className="w-full">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    과목 등록
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Student Survey Status */}
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardHeader>
                <CardTitle className="text-godding-text-primary flex items-center space-x-2">
                  <UserGroupIcon className="w-5 h-5" />
                  <span>학생 수요조사 현황</span>
                </CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  학생들의 수요조사 참여 현황을 확인하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {students.map((student) => (
                    <div key={student.id} className="p-3 bg-white/50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-godding-text-primary">{student.name}</h4>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {student.grade}-{student.class}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              student.surveyCompleted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {student.surveyCompleted ? '완료' : '미완료'}
                            </span>
                          </div>
                          <div className="text-sm text-godding-text-secondary">
                            <p><strong>학번:</strong> {student.studentNumber}</p>
                            {student.surveyCompleted && (
                              <p><strong>수요조사 완료일:</strong> {student.surveyDate}</p>
                            )}
                            {student.selectedSubjects.length > 0 && (
                              <p><strong>선택한 과목:</strong> {student.selectedSubjects.map(id => getSubjectById(id)?.name).join(', ')}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Registered Subjects */}
          <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border mt-8">
            <CardHeader>
              <CardTitle className="text-godding-text-primary">등록된 과목 목록</CardTitle>
              <CardDescription className="text-godding-text-secondary">
                수요조사에 등록된 모든 과목의 상태를 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subjects.map((subject) => (
                  <div key={subject.id} className="p-4 bg-white/50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-godding-text-primary">{subject.name}</h4>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {subject.category}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {subject.grade}학년
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            subject.status === 'active' ? 'bg-green-100 text-green-700' :
                            subject.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {subject.status === 'active' ? '개설 예정' :
                             subject.status === 'pending' ? '검토 중' : '폐강'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-godding-text-secondary">
                          <div>
                            <p><strong>학기:</strong> {subject.semester}</p>
                            <p><strong>담당교사:</strong> {subject.teacherName || '미배정'}</p>
                          </div>
                          <div>
                            <p><strong>현재 신청자:</strong> {subject.currentStudents}명</p>
                            <p><strong>수용 인원:</strong> {subject.minStudents}~{subject.maxStudents}명</p>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-godding-text-secondary">
                          <p><strong>과목 설명:</strong> {subject.description}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        {subject.status === 'active' ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => cancelSubject(subject.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircleIcon className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => activateSubject(subject.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Survey Results View
  if (currentStep === 'results') {
    const surveyResults = getSurveyResults()
    const resultStats = {
      totalSubjects: surveyResults.length,
      sufficientSubjects: surveyResults.filter(r => r.status === 'sufficient').length,
      insufficientSubjects: surveyResults.filter(r => r.status === 'insufficient').length,
      overbookedSubjects: surveyResults.filter(r => r.status === 'overbooked').length
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep('survey')}
                  className="flex items-center space-x-2"
                >
                  ← 이전 단계
                </Button>
                <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <ChartBarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-godding-text-primary">수요조사 결과 분석</h1>
                  <p className="text-lg text-godding-text-secondary mt-2">
                    2단계: 학생 수요조사 결과 분석 및 과목 개설/폐강 결정
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep('teachers')}
                >
                  다음 단계: 교사 선호도
                </Button>
              </div>
            </div>
          </div>

          {/* Results Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">전체 과목</p>
                    <p className="text-2xl font-bold text-godding-text-primary">{resultStats.totalSubjects}</p>
                  </div>
                  <BookOpenIcon className="w-8 h-8 text-godding-primary" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">개설 가능</p>
                    <p className="text-2xl font-bold text-green-600">{resultStats.sufficientSubjects}</p>
                  </div>
                  <CheckCircleIcon className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">폐강 대상</p>
                    <p className="text-2xl font-bold text-red-600">{resultStats.insufficientSubjects}</p>
                  </div>
                  <XCircleIcon className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">초과 신청</p>
                    <p className="text-2xl font-bold text-yellow-600">{resultStats.overbookedSubjects}</p>
                  </div>
                  <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Survey Results List */}
          <div className="space-y-6">
            {surveyResults.map((result) => {
              const subject = getSubjectById(result.subjectId)
              return (
                <Card key={result.subjectId} className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-godding-text-primary">{result.subjectName}</CardTitle>
                        <CardDescription className="text-godding-text-secondary">
                          {subject?.category} | {subject?.grade}학년 | {subject?.semester}
                        </CardDescription>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        result.status === 'sufficient' ? 'bg-green-100 text-green-700' :
                        result.status === 'insufficient' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {result.status === 'sufficient' ? '개설 가능' :
                         result.status === 'insufficient' ? '폐강 대상' : '초과 신청'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-godding-text-secondary">신청 학생 수</p>
                        <p className="text-lg font-bold text-godding-text-primary">{result.studentCount}명</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-godding-text-secondary">최소 개설 인원</p>
                        <p className="text-lg font-bold text-godding-text-primary">{subject?.minStudents}명</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-godding-text-secondary">최대 수용 인원</p>
                        <p className="text-lg font-bold text-godding-text-primary">{subject?.maxStudents}명</p>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${
                          result.status === 'sufficient' ? 'bg-green-500' :
                          result.status === 'insufficient' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}
                        style={{ 
                          width: `${Math.min((result.studentCount / (subject?.maxStudents || 1)) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                    
                    {result.students.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-godding-text-secondary mb-2">신청 학생 목록</p>
                        <div className="grid grid-cols-2 gap-2">
                          {result.students.map((student) => (
                            <div key={student.id} className="text-sm text-godding-text-secondary flex items-center justify-between p-2 bg-white/50 rounded">
                              <span>{student.name} ({student.grade}-{student.class})</span>
                              <span className="text-xs text-godding-text-primary">{student.studentNumber}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      {result.status === 'insufficient' ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => cancelSubject(result.subjectId)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircleIcon className="w-4 h-4 mr-1" />
                          폐강 처리
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => activateSubject(result.subjectId)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircleIcon className="w-4 h-4 mr-1" />
                          개설 확정
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="flex-1">
                        <EyeIcon className="w-4 h-4 mr-1" />
                        상세보기
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Teacher Preferences View
  if (currentStep === 'teachers') {
    const [editingTeacher, setEditingTeacher] = useState<string | null>(null)
    const [teacherPreferences, setTeacherPreferences] = useState({
      preferredDays: [] as ('월' | '화' | '수' | '목' | '금')[],
      preferredPeriods: [] as number[],
      avoidAfternoon: false,
      maxHoursPerDay: 4,
      maxHoursPerWeek: 12
    })

    const updateTeacherPreferences = (teacherId: string, preferences: Teacher['preferences']) => {
      // 실제 구현에서는 상태 업데이트 로직이 필요합니다
      console.log('Updating teacher preferences:', teacherId, preferences)
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep('results')}
                  className="flex items-center space-x-2"
                >
                  ← 이전 단계
                </Button>
                <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <CogIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-godding-text-primary">교사 선호도 관리</h1>
                  <p className="text-lg text-godding-text-secondary mt-2">
                    3단계: 교사들의 시수 및 시간 선호도 설정
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep('schedule')}
                >
                  다음 단계: 시간표 생성
                </Button>
              </div>
            </div>
          </div>

          {/* Teacher Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">전체 교사</p>
                    <p className="text-2xl font-bold text-godding-text-primary">{teachers.length}</p>
                  </div>
                  <AcademicCapIcon className="w-8 h-8 text-godding-primary" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">선호도 설정 완료</p>
                    <p className="text-2xl font-bold text-green-600">
                      {teachers.filter(t => t.preferences.preferredDays.length > 0).length}
                    </p>
                  </div>
                  <CheckCircleIcon className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">미설정 교사</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {teachers.filter(t => t.preferences.preferredDays.length === 0).length}
                    </p>
                  </div>
                  <ClockIcon className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Teachers List */}
          <div className="space-y-6">
            {teachers.map((teacher) => (
              <Card key={teacher.id} className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-godding-text-primary">{teacher.name}</CardTitle>
                      <CardDescription className="text-godding-text-secondary">
                        담당 과목: {teacher.subjects.map(id => getSubjectById(id)?.name).join(', ')}
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setEditingTeacher(teacher.id)
                        setTeacherPreferences(teacher.preferences)
                      }}
                    >
                      <PencilIcon className="w-4 h-4 mr-1" />
                      선호도 설정
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-godding-text-secondary">선호 요일</p>
                      <p className="text-sm text-godding-text-primary">
                        {teacher.preferences.preferredDays.length > 0 
                          ? teacher.preferences.preferredDays.join(', ') 
                          : '미설정'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-godding-text-secondary">선호 교시</p>
                      <p className="text-sm text-godding-text-primary">
                        {teacher.preferences.preferredPeriods.length > 0 
                          ? teacher.preferences.preferredPeriods.join(', ') + '교시'
                          : '미설정'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-godding-text-secondary">오후 수업</p>
                      <p className="text-sm text-godding-text-primary">
                        {teacher.preferences.avoidAfternoon ? '제외' : '포함'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-godding-text-secondary">주간 최대 시수</p>
                      <p className="text-sm text-godding-text-primary">
                        {teacher.preferences.maxHoursPerWeek}시간
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Teacher Preferences Modal */}
          {editingTeacher && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="bg-white w-full max-w-2xl mx-4">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">
                    {teachers.find(t => t.id === editingTeacher)?.name} 선호도 설정
                  </CardTitle>
                  <CardDescription className="text-godding-text-secondary">
                    교사의 시간 선호도를 설정하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary mb-3">선호 요일</p>
                    <div className="flex space-x-2">
                      {(['월', '화', '수', '목', '금'] as const).map((day) => (
                        <Button
                          key={day}
                          variant={teacherPreferences.preferredDays.includes(day) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const newDays = teacherPreferences.preferredDays.includes(day)
                              ? teacherPreferences.preferredDays.filter(d => d !== day)
                              : [...teacherPreferences.preferredDays, day]
                            setTeacherPreferences(prev => ({ ...prev, preferredDays: newDays }))
                          }}
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary mb-3">선호 교시</p>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5, 6, 7].map((period) => (
                        <Button
                          key={period}
                          variant={teacherPreferences.preferredPeriods.includes(period) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const newPeriods = teacherPreferences.preferredPeriods.includes(period)
                              ? teacherPreferences.preferredPeriods.filter(p => p !== period)
                              : [...teacherPreferences.preferredPeriods, period]
                            setTeacherPreferences(prev => ({ ...prev, preferredPeriods: newPeriods }))
                          }}
                        >
                          {period}교시
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="avoidAfternoon"
                      checked={teacherPreferences.avoidAfternoon}
                      onChange={(e) => setTeacherPreferences(prev => ({ 
                        ...prev, 
                        avoidAfternoon: e.target.checked 
                      }))}
                      className="rounded"
                    />
                    <label htmlFor="avoidAfternoon" className="text-sm text-godding-text-secondary">
                      오후 수업 제외 (5교시 이후)
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-godding-text-secondary">
                        일일 최대 시수
                      </label>
                      <Input
                        type="number"
                        value={teacherPreferences.maxHoursPerDay}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTeacherPreferences(prev => ({ 
                          ...prev, 
                          maxHoursPerDay: parseInt(e.target.value) || 0 
                        }))}
                        min="1"
                        max="8"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-godding-text-secondary">
                        주간 최대 시수
                      </label>
                      <Input
                        type="number"
                        value={teacherPreferences.maxHoursPerWeek}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTeacherPreferences(prev => ({ 
                          ...prev, 
                          maxHoursPerWeek: parseInt(e.target.value) || 0 
                        }))}
                        min="1"
                        max="20"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => {
                        updateTeacherPreferences(editingTeacher, teacherPreferences)
                        setEditingTeacher(null)
                      }}
                      className="flex-1"
                    >
                      저장
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setEditingTeacher(null)}
                      className="flex-1"
                    >
                      취소
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>
    )
  }

  // Schedule Generation View
  if (currentStep === 'schedule') {
    const [generatedSchedule, setGeneratedSchedule] = useState<{
      [key: string]: {
        subjectId: string
        teacherId: string
        subjectName: string
        teacherName: string
        students: number
      }[][]
    }>({})

    const generateSchedule = () => {
      // 간단한 시간표 생성 로직 (실제로는 더 복잡한 알고리즘 필요)
      const schedule: typeof generatedSchedule = {}
      const days = ['월', '화', '수', '목', '금']
      const periods = [1, 2, 3, 4, 5, 6, 7]
      
      // 각 요일별로 빈 시간표 생성
      days.forEach(day => {
        schedule[day] = periods.map(() => [])
      })

      // 활성화된 과목들을 시간표에 배치
      subjects.filter(s => s.status === 'active').forEach(subject => {
        const teacher = teachers.find(t => t.subjects.includes(subject.id))
        if (!teacher) return

        // 교사의 선호도에 따라 시간 배치
        const preferredDays = teacher.preferences.preferredDays.length > 0 
          ? teacher.preferences.preferredDays 
          : days
        
        const preferredPeriods = teacher.preferences.preferredPeriods.length > 0 
          ? teacher.preferences.preferredPeriods 
          : periods

        // 각 과목당 주당 시수 계산 (예: 3시간)
        const weeklyHours = 3
        let assignedHours = 0

        for (const day of preferredDays) {
          if (assignedHours >= weeklyHours) break
          
          for (const period of preferredPeriods) {
            if (assignedHours >= weeklyHours) break
            if (schedule[day][period - 1].length === 0) {
              schedule[day][period - 1].push({
                subjectId: subject.id,
                teacherId: teacher.id,
                subjectName: subject.name,
                teacherName: teacher.name,
                students: subject.currentStudents
              })
              assignedHours++
            }
          }
        }
      })

      setGeneratedSchedule(schedule)
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep('teachers')}
                  className="flex items-center space-x-2"
                >
                  ← 이전 단계
                </Button>
                <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <CalendarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-godding-text-primary">시간표 자동 생성</h1>
                  <p className="text-lg text-godding-text-secondary mt-2">
                    4단계: 교사 선호도와 과목 정보를 바탕으로 한 시간표 자동 생성
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button onClick={generateSchedule}>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  시간표 생성
                </Button>
              </div>
            </div>
          </div>

          {/* Schedule Generation Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">개설 과목</p>
                    <p className="text-2xl font-bold text-godding-text-primary">
                      {subjects.filter(s => s.status === 'active').length}
                    </p>
                  </div>
                  <BookOpenIcon className="w-8 h-8 text-godding-primary" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">담당 교사</p>
                    <p className="text-2xl font-bold text-green-600">{teachers.length}</p>
                  </div>
                  <AcademicCapIcon className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">총 학생 수</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {subjects.filter(s => s.status === 'active').reduce((sum, s) => sum + s.currentStudents, 0)}
                    </p>
                  </div>
                  <UserGroupIcon className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">생성된 시간표</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {Object.keys(generatedSchedule).length > 0 ? '완료' : '대기'}
                    </p>
                  </div>
                  <CalendarIcon className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Generated Schedule */}
          {Object.keys(generatedSchedule).length > 0 && (
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border mb-8">
              <CardHeader>
                <CardTitle className="text-godding-text-primary">생성된 시간표</CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  교사 선호도와 과목 정보를 반영한 자동 생성 시간표입니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-godding-text-primary">교시</th>
                        {['월', '화', '수', '목', '금'].map(day => (
                          <th key={day} className="text-center p-3 font-medium text-godding-text-primary">
                            {day}요일
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5, 6, 7].map(period => (
                        <tr key={period} className="border-b">
                          <td className="p-3 font-medium text-godding-text-primary text-center">
                            {period}교시
                          </td>
                          {['월', '화', '수', '목', '금'].map(day => (
                            <td key={day} className="p-3 text-center">
                              {generatedSchedule[day]?.[period - 1]?.map((classInfo, index) => (
                                <div key={index} className="p-2 bg-blue-50 rounded text-sm">
                                  <div className="font-medium text-godding-text-primary">
                                    {classInfo.subjectName}
                                  </div>
                                  <div className="text-xs text-godding-text-secondary">
                                    {classInfo.teacherName}
                                  </div>
                                  <div className="text-xs text-godding-text-secondary">
                                    {classInfo.students}명
                                  </div>
                                </div>
                              )) || (
                                <div className="text-gray-400 text-sm">-</div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Schedule Actions */}
          <div className="flex space-x-4">
            <Button 
              onClick={generateSchedule}
              className="flex items-center space-x-2"
            >
              <CalendarIcon className="w-4 h-4" />
              <span>시간표 재생성</span>
            </Button>
            <Button 
              variant="outline"
              className="flex items-center space-x-2"
            >
              <DocumentTextIcon className="w-4 h-4" />
              <span>시간표 내보내기</span>
            </Button>
            <Button 
              variant="outline"
              className="flex items-center space-x-2"
            >
              <EyeIcon className="w-4 h-4" />
              <span>시간표 미리보기</span>
            </Button>
          </div>

        </div>
      </div>
    )
  }

  // Default view - redirect to survey
  return (
    <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="w-20 h-20 bg-godding-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
          <BookOpenIcon className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-godding-text-primary mb-4">
          과목 수요조사 관리 시스템
        </h1>
        <p className="text-xl text-godding-text-secondary mb-8">
          4단계 프로세스로 체계적인 과목 수요조사 및 시간표 관리를 진행하세요
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-white/50 rounded-lg">
            <BookOpenIcon className="w-8 h-8 text-godding-primary mx-auto mb-2" />
            <h3 className="font-medium text-godding-text-primary">1. 과목 수요조사</h3>
            <p className="text-sm text-godding-text-secondary">과목 등록 및 학생 수요조사 관리</p>
          </div>
          <div className="p-4 bg-white/50 rounded-lg">
            <ChartBarIcon className="w-8 h-8 text-godding-primary mx-auto mb-2" />
            <h3 className="font-medium text-godding-text-primary">2. 수요조사 결과</h3>
            <p className="text-sm text-godding-text-secondary">결과 분석 및 과목 개설/폐강 결정</p>
          </div>
          <div className="p-4 bg-white/50 rounded-lg">
            <CogIcon className="w-8 h-8 text-godding-primary mx-auto mb-2" />
            <h3 className="font-medium text-godding-text-primary">3. 교사 선호도</h3>
            <p className="text-sm text-godding-text-secondary">교사 시수 및 시간 선호도 설정</p>
          </div>
          <div className="p-4 bg-white/50 rounded-lg">
            <CalendarIcon className="w-8 h-8 text-godding-primary mx-auto mb-2" />
            <h3 className="font-medium text-godding-text-primary">4. 시간표 생성</h3>
            <p className="text-sm text-godding-text-secondary">자동 시간표 생성 및 관리</p>
          </div>
        </div>
        <Button 
          onClick={() => setCurrentStep('survey')}
          size="lg"
          className="text-lg px-8 py-4"
        >
          시작하기
        </Button>
      </div>
    </div>
  )
}