"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    CheckCircleIcon,
    ClockIcon,
    DocumentArrowDownIcon,
    ExclamationTriangleIcon,
    PlusIcon,
    QrCodeIcon,
    UserGroupIcon,
    XCircleIcon
} from "@heroicons/react/24/outline"
import { useEffect, useState } from "react"

interface Student {
  id: string
  name: string
  grade: string
  class: string
  studentNumber: string
  isActive: boolean
}

interface AttendanceRecord {
  id: string
  studentId: string
  date: string
  attendanceCode: string
  checkInTime: string
  status: 'present' | 'absent' | 'late'
  notes?: string
}

interface AttendanceSession {
  id: string
  date: string
  attendanceCode: string
  qrCode: string
  startTime: string
  endTime: string
  isActive: boolean
  records: AttendanceRecord[]
}

export default function AttendancePage() {
  const [currentStep, setCurrentStep] = useState<'students' | 'session' | 'reports'>('students')
  // const [selectedSession] = useState<AttendanceSession | null>(null)
  
  const [newStudent, setNewStudent] = useState({
    name: '',
    grade: '',
    class: '',
    studentNumber: ''
  })

  // Mock data
  const [students, setStudents] = useState<Student[]>([
    { id: '1', name: '김철수', grade: '3', class: '1', studentNumber: '2024001', isActive: true },
    { id: '2', name: '이영희', grade: '3', class: '1', studentNumber: '2024002', isActive: true },
    { id: '3', name: '박민수', grade: '3', class: '2', studentNumber: '2024003', isActive: true },
    { id: '4', name: '최지영', grade: '3', class: '2', studentNumber: '2024004', isActive: true },
    { id: '5', name: '정현우', grade: '3', class: '3', studentNumber: '2024005', isActive: false }
  ])

  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([
    {
      id: '1',
      date: '2024-01-20',
      attendanceCode: '1234',
      qrCode: 'QR_ATT_20240120_1234',
      startTime: '19:00',
      endTime: '22:00',
      isActive: true,
      records: [
        {
          id: 'r1',
          studentId: '1',
          date: '2024-01-20',
          attendanceCode: '1234',
          checkInTime: '19:05',
          status: 'present'
        },
        {
          id: 'r2',
          studentId: '2',
          date: '2024-01-20',
          attendanceCode: '1234',
          checkInTime: '19:15',
          status: 'late'
        },
        {
          id: 'r3',
          studentId: '3',
          date: '2024-01-20',
          attendanceCode: '1234',
          checkInTime: '19:02',
          status: 'present'
        }
      ]
    },
    {
      id: '2',
      date: '2024-01-19',
      attendanceCode: '5678',
      qrCode: 'QR_ATT_20240119_5678',
      startTime: '19:00',
      endTime: '22:00',
      isActive: false,
      records: [
        {
          id: 'r4',
          studentId: '1',
          date: '2024-01-19',
          attendanceCode: '5678',
          checkInTime: '19:01',
          status: 'present'
        },
        {
          id: 'r5',
          studentId: '2',
          date: '2024-01-19',
          attendanceCode: '5678',
          checkInTime: '19:03',
          status: 'present'
        }
      ]
    }
  ])

  const [currentAttendanceCode, setCurrentAttendanceCode] = useState('')
  const [currentQRCode, setCurrentQRCode] = useState('')

  useEffect(() => {
    // 현재 활성화된 세션 찾기
    const activeSession = attendanceSessions.find(session => session.isActive)
    if (activeSession) {
      setCurrentAttendanceCode(activeSession.attendanceCode)
      setCurrentQRCode(activeSession.qrCode)
    }
  }, [attendanceSessions])

  const addStudent = () => {
    if (newStudent.name && newStudent.grade && newStudent.class) {
      const student: Student = {
        id: Date.now().toString(),
        ...newStudent,
        isActive: true
      }
      setStudents([...students, student])
      setNewStudent({ name: '', grade: '', class: '', studentNumber: '' })
    }
  }

  const toggleStudentStatus = (studentId: string) => {
    setStudents(prev => prev.map(student => 
      student.id === studentId 
        ? { ...student, isActive: !student.isActive }
        : student
    ))
  }

  const generateAttendanceCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  const generateQRCode = () => {
    return `QR_ATT_${new Date().toISOString().split('T')[0].replace(/-/g, '')}_${generateAttendanceCode()}`
  }

  const startAttendanceSession = () => {
    const today = new Date().toISOString().split('T')[0]
    const code = generateAttendanceCode()
    const qrCode = generateQRCode()
    
    const newSession: AttendanceSession = {
      id: Date.now().toString(),
      date: today,
      attendanceCode: code,
      qrCode: qrCode,
      startTime: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      endTime: '22:00',
      isActive: true,
      records: []
    }
    
    setAttendanceSessions(prev => [newSession, ...prev])
    setCurrentAttendanceCode(code)
    setCurrentQRCode(qrCode)
  }

  const endAttendanceSession = (sessionId: string) => {
    setAttendanceSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, isActive: false, endTime: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) }
        : session
    ))
  }

  const getSessionStats = (session: AttendanceSession) => {
    const activeStudents = students.filter(s => s.isActive)
    const presentStudents = session.records.filter(r => r.status === 'present').length
    const lateStudents = session.records.filter(r => r.status === 'late').length
    const absentStudents = activeStudents.length - presentStudents - lateStudents
    
    return { 
      totalStudents: activeStudents.length, 
      presentStudents, 
      lateStudents, 
      absentStudents 
    }
  }

  const getStudentAttendanceStats = (studentId: string) => {
    const studentRecords = attendanceSessions.flatMap(session => session.records)
      .filter(record => record.studentId === studentId)
    
    const totalSessions = attendanceSessions.filter(session => !session.isActive).length
    const presentCount = studentRecords.filter(record => record.status === 'present').length
    const lateCount = studentRecords.filter(record => record.status === 'late').length
    const absentCount = totalSessions - presentCount - lateCount
    
    return { totalSessions, presentCount, lateCount, absentCount }
  }

  // Students Management View
  if (currentStep === 'students') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <UserGroupIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-godding-text-primary">야자 출첵 관리</h1>
                  <p className="text-lg text-godding-text-secondary mt-2">
                    1단계: 야자 참여 학생 관리 - 참여 학생 명단 등록 및 관리
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setCurrentStep('session')}
                >
                  다음 단계: 출결 체크
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add New Student */}
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardHeader>
                <CardTitle className="text-godding-text-primary flex items-center space-x-2">
                  <PlusIcon className="w-5 h-5" />
                  <span>새 학생 등록</span>
                </CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  야자 참여 학생을 등록하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-godding-text-primary mb-1">
                    학생 이름
                  </label>
                  <Input
                    value={newStudent.name}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="예: 김철수"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-godding-text-primary mb-1">
                      학년
                    </label>
                    <Input
                      value={newStudent.grade}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, grade: e.target.value }))}
                      placeholder="예: 3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-godding-text-primary mb-1">
                      반
                    </label>
                    <Input
                      value={newStudent.class}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, class: e.target.value }))}
                      placeholder="예: 1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-godding-text-primary mb-1">
                    학번
                  </label>
                  <Input
                    value={newStudent.studentNumber}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, studentNumber: e.target.value }))}
                    placeholder="예: 2024001"
                  />
                </div>
                <Button onClick={addStudent} className="w-full">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  학생 등록
                </Button>
              </CardContent>
            </Card>

            {/* Students List */}
            <div className="lg:col-span-2">
              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">참여 학생 명단</CardTitle>
                  <CardDescription className="text-godding-text-secondary">
                    야자 참여 학생 목록입니다. 상태를 클릭하여 활성화/비활성화할 수 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {students.map((student) => {
                      const stats = getStudentAttendanceStats(student.id)
                      return (
                        <div key={student.id} className="flex items-center justify-between p-4 bg-white/50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              student.isActive ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              <UserGroupIcon className={`w-5 h-5 ${
                                student.isActive ? 'text-green-600' : 'text-gray-400'
                              }`} />
                            </div>
                            <div>
                              <h4 className="font-medium text-godding-text-primary">{student.name}</h4>
                              <p className="text-sm text-godding-text-secondary">
                                {student.grade}-{student.class} | {student.studentNumber}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-center">
                              <div className="text-sm text-godding-text-secondary">출석률</div>
                              <div className="font-medium text-godding-text-primary">
                                {stats.totalSessions > 0 ? Math.round((stats.presentCount / stats.totalSessions) * 100) : 0}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-godding-text-secondary">총 출석</div>
                              <div className="font-medium text-godding-text-primary">
                                {stats.presentCount}/{stats.totalSessions}
                              </div>
                            </div>
                            <Button
                              variant={student.isActive ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleStudentStatus(student.id)}
                            >
                              {student.isActive ? '활성' : '비활성'}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Attendance Session View
  if (currentStep === 'session') {
    const activeSession = attendanceSessions.find(session => session.isActive)
    const activeStudents = students.filter(s => s.isActive)
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep('students')}
                  className="flex items-center space-x-2"
                >
                  ← 이전 단계
                </Button>
                <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <QrCodeIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-godding-text-primary">출결 체크</h1>
                  <p className="text-lg text-godding-text-secondary mt-2">
                    2단계: 일일 인증코드를 이용한 출결 체크
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep('reports')}
                >
                  다음 단계: 출결 현황
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Attendance Code Panel */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">출결 인증코드</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeSession ? (
                    <div className="text-center">
                      <div className="text-4xl font-bold text-godding-text-primary mb-2">
                        {currentAttendanceCode}
                      </div>
                      <div className="text-sm text-godding-text-secondary mb-4">
                        학생들이 앱에 입력할 4자리 코드
                      </div>
                      <div className="p-4 bg-white/50 rounded-lg mb-4">
                        <QrCodeIcon className="w-16 h-16 mx-auto text-godding-primary mb-2" />
                        <div className="text-xs text-godding-text-secondary break-all">
                          {currentQRCode}
                        </div>
                      </div>
                      <Button 
                        onClick={() => endAttendanceSession(activeSession.id)}
                        variant="outline"
                        className="w-full"
                      >
                        출결 종료
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-godding-text-secondary mb-4">
                        현재 활성화된 출결 세션이 없습니다
                      </div>
                      <Button onClick={startAttendanceSession} className="w-full">
                        <ClockIcon className="w-4 h-4 mr-2" />
                        출결 시작
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {activeSession && (
                <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                  <CardHeader>
                    <CardTitle className="text-godding-text-primary">현재 현황</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{activeStudents.length}</div>
                        <div className="text-sm text-godding-text-secondary">전체 학생</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {activeSession.records.filter(r => r.status === 'present').length}
                        </div>
                        <div className="text-sm text-godding-text-secondary">출석</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                          {activeSession.records.filter(r => r.status === 'late').length}
                        </div>
                        <div className="text-sm text-godding-text-secondary">지각</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {activeStudents.length - activeSession.records.length}
                        </div>
                        <div className="text-sm text-godding-text-secondary">결석</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Students Attendance Status */}
            <div className="lg:col-span-2">
              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">학생별 출결 현황</CardTitle>
                  <CardDescription className="text-godding-text-secondary">
                    실시간 출결 체크 현황을 확인하세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activeStudents.map((student) => {
                      const record = activeSession?.records.find(r => r.studentId === student.id)
                      return (
                        <div key={student.id} className="flex items-center justify-between p-4 bg-white/50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              record ? 
                                record.status === 'present' ? 'bg-green-100' :
                                record.status === 'late' ? 'bg-yellow-100' : 'bg-red-100'
                                : 'bg-gray-100'
                            }`}>
                              {record ? (
                                record.status === 'present' ? <CheckCircleIcon className="w-5 h-5 text-green-600" /> :
                                record.status === 'late' ? <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" /> :
                                <XCircleIcon className="w-5 h-5 text-red-600" />
                              ) : (
                                <ClockIcon className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-godding-text-primary">{student.name}</h4>
                              <p className="text-sm text-godding-text-secondary">
                                {student.grade}-{student.class} | {student.studentNumber}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {record ? (
                              <div>
                                <div className={`font-medium ${
                                  record.status === 'present' ? 'text-green-600' :
                                  record.status === 'late' ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {record.status === 'present' ? '출석' :
                                   record.status === 'late' ? '지각' : '결석'}
                                </div>
                                <div className="text-sm text-godding-text-secondary">
                                  {record.checkInTime}
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-400">대기 중</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Reports View
  if (currentStep === 'reports') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep('session')}
                  className="flex items-center space-x-2"
                >
                  ← 이전 단계
                </Button>
                <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <DocumentArrowDownIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-godding-text-primary">출결 현황 집계</h1>
                  <p className="text-lg text-godding-text-secondary mt-2">
                    3단계: 출결 현황 집계 및 리포트
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline">
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  엑셀 다운로드
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Summary Stats */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">전체 통계</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{attendanceSessions.length}</div>
                    <div className="text-sm text-godding-text-secondary">총 출결 세션</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {attendanceSessions.reduce((sum, session) => sum + session.records.filter(r => r.status === 'present').length, 0)}
                    </div>
                    <div className="text-sm text-godding-text-secondary">총 출석</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {attendanceSessions.reduce((sum, session) => sum + session.records.filter(r => r.status === 'late').length, 0)}
                    </div>
                    <div className="text-sm text-godding-text-secondary">총 지각</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Reports */}
            <div className="lg:col-span-2 space-y-6">
              {/* Session History */}
              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">출결 세션 기록</CardTitle>
                  <CardDescription className="text-godding-text-secondary">
                    일별 출결 세션 현황입니다
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {attendanceSessions.map((session) => {
                      const stats = getSessionStats(session)
                      return (
                        <div key={session.id} className="p-4 bg-white/50 rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-medium text-godding-text-primary">
                                {new Date(session.date).toLocaleDateString('ko-KR')}
                              </h4>
                              <p className="text-sm text-godding-text-secondary">
                                {session.startTime} ~ {session.endTime} | 코드: {session.attendanceCode}
                              </p>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              session.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {session.isActive ? '진행중' : '종료'}
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-4">
                            <div className="text-center">
                              <div className="text-lg font-bold text-blue-600">{stats.totalStudents}</div>
                              <div className="text-xs text-godding-text-secondary">전체</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-600">{stats.presentStudents}</div>
                              <div className="text-xs text-godding-text-secondary">출석</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-yellow-600">{stats.lateStudents}</div>
                              <div className="text-xs text-godding-text-secondary">지각</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-red-600">{stats.absentStudents}</div>
                              <div className="text-xs text-godding-text-secondary">결석</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Student Attendance Summary */}
              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">학생별 출석률</CardTitle>
                  <CardDescription className="text-godding-text-secondary">
                    개별 학생의 출석 현황을 확인하세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {students.filter(s => s.isActive).map((student) => {
                      const stats = getStudentAttendanceStats(student.id)
                      const attendanceRate = stats.totalSessions > 0 ? (stats.presentCount / stats.totalSessions) * 100 : 0
                      
                      return (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-godding-primary rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {student.name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-medium text-godding-text-primary">{student.name}</h4>
                              <p className="text-sm text-godding-text-secondary">
                                {student.grade}-{student.class} | {student.studentNumber}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-center">
                              <div className="text-sm text-godding-text-secondary">출석률</div>
                              <div className={`font-medium ${
                                attendanceRate >= 90 ? 'text-green-600' :
                                attendanceRate >= 70 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {Math.round(attendanceRate)}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-godding-text-secondary">출석/지각/결석</div>
                              <div className="font-medium text-godding-text-primary">
                                {stats.presentCount}/{stats.lateCount}/{stats.absentCount}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Default view
  return (
    <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="w-20 h-20 bg-godding-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
          <UserGroupIcon className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-godding-text-primary mb-4">
          야자 출첵 관리
        </h1>
        <p className="text-xl text-godding-text-secondary mb-8">
          인증코드 기반 출결 체크로 야간자율학습을 효율적으로 관리하세요
        </p>
        <Button 
          onClick={() => setCurrentStep('students')}
          size="lg"
          className="text-lg px-8 py-4"
        >
          시작하기
        </Button>
      </div>
    </div>
  )
}
