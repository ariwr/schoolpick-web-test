"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  MoonIcon,
  QrCodeIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  EyeIcon,
  ArrowLeftIcon
} from "@heroicons/react/24/outline"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"

interface Student {
  id: number
  student_id: string
  name: string
  grade: number
  class_number: number
  student_number: number
}

interface AttendanceRecord {
  id: number
  student_id: number
  student?: Student
  teacher_id: number
  date: string
  status: 'present' | 'absent' | 'late' | 'early_leave' | 'early_leave_request' | 'completed' | 'excused'
  check_in_time?: string
  check_out_time?: string
  room_id?: string
  note?: string
}

interface QRCodeData {
  qr_code_image: string
  token: string
  expires_at: string
  room_id: string
}

// QR 코드 이미지 표시 컴포넌트
const QRCodeDisplay = ({ imageData }: { imageData: string }) => {
  return (
    <div className="flex flex-col items-center">
      <img 
        src={`data:image/png;base64,${imageData}`}
        alt="QR Code"
        className="w-64 h-64 border-2 border-gray-300 rounded-lg p-2 bg-white"
      />
    </div>
  )
}

type ViewMode = 'main' | 'students' | 'qr'

export default function NightStudyPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('main')
  const [students, setStudents] = useState<Student[]>([])
  const [participatingStudents, setParticipatingStudents] = useState<number[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [newRoomId, setNewRoomId] = useState('')
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  // 서버 연결 테스트
  const testServerConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        console.log('서버 연결 성공:', data)
        return true
      }
      return false
    } catch (error) {
      console.error('서버 연결 실패:', error)
      return false
    }
  }

  // 인증 확인
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userInfo = localStorage.getItem('userInfo')
    
    if (!token || !userInfo) {
      router.push('/login')
      return
    }
    
    setIsAuthenticated(true)
    
    // 서버 연결 테스트
    testServerConnection().then(isConnected => {
      if (!isConnected) {
        setServerError('백엔드 서버가 실행되지 않았습니다. 서버를 시작해주세요.')
      }
    })
  }, [router])

  // localStorage에서 참여 학생 목록 불러오기
  const loadParticipatingStudents = (): number[] => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('night_study_participating_students')
      return saved ? JSON.parse(saved) : []
    }
    return []
  }

  const saveParticipatingStudents = (studentIds: number[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('night_study_participating_students', JSON.stringify(studentIds))
    }
  }

  useEffect(() => {
    setParticipatingStudents(loadParticipatingStudents())
  }, [])

  // 학생 목록 조회
  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('토큰이 없습니다')
        router.push('/login')
        return
      }
      
      // 서버 연결 확인
      try {
        // 타임아웃을 위한 AbortController
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10초 타임아웃
        
        const response = await fetch(`${API_BASE_URL}/api/students/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        })
        
        clearTimeout(timeoutId) // 성공 시 타임아웃 제거
        
        if (response.ok) {
          const data = await response.json()
          setStudents(data)
          setServerError(null) // 성공 시 에러 메시지 제거
        } else if (response.status === 401) {
          // 토큰이 만료되었거나 유효하지 않음
          console.error('인증 실패: 토큰이 유효하지 않습니다')
          localStorage.removeItem('token')
          localStorage.removeItem('userInfo')
          router.push('/login')
          return
        } else {
          // 401이 아닌 다른 에러인 경우
          try {
            const errorData = await response.json()
            console.error('학생 목록 조회 실패:', errorData.detail || response.statusText)
            setServerError(`서버 오류: ${errorData.detail || response.statusText}`)
          } catch {
            console.error('학생 목록 조회 실패:', response.statusText)
            setServerError(`서버 오류: ${response.statusText}`)
          }
        }
      } catch (fetchError) {
        // 네트워크 오류 처리
        if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
          console.error('서버 연결 실패: 백엔드 서버가 실행 중인지 확인하세요.')
          setServerError('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.')
        } else if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
          console.error('요청 타임아웃')
          setServerError('서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.')
        } else {
          console.error('학생 목록 조회 실패:', fetchError)
          setServerError('서버 연결 중 오류가 발생했습니다.')
        }
      }
    } catch (error) {
      console.error('학생 목록 조회 실패:', error)
      setServerError('알 수 없는 오류가 발생했습니다.')
    }
  }

  // QR 코드 생성 및 조회
  const generateQRCode = async (roomId: string) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) {
        alert('로그인이 필요합니다')
        return
      }

      // 먼저 위치 설정이 있는지 확인하고, 없으면 생성
      let locationExists = false
      try {
        const checkResponse = await fetch(`${API_BASE_URL}/api/attendance/location-settings/${roomId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        locationExists = checkResponse.ok
      } catch (e) {
        // 위치 설정이 없으면 생성
      }

      if (!locationExists) {
        // 위치 설정 생성
        const createResponse = await fetch(`${API_BASE_URL}/api/attendance/location-settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            room_id: roomId,
            latitude: 37.5665, // 기본값 (실제로는 입력받아야 함)
            longitude: 126.9780, // 기본값
            radius_m: 20,
            attendance_start_time: '18:50',
            attendance_end_time: '19:10',
            late_threshold_time: '19:00',
            checkout_time: '22:00'
          })
        })

        if (!createResponse.ok) {
          const error = await createResponse.json().catch(() => ({ detail: '위치 설정 생성 실패' }))
          alert(error.detail || '위치 설정 생성 실패')
          setLoading(false)
          return
        }
      }

      // QR 코드 조회
      const response = await fetch(`${API_BASE_URL}/api/attendance/qr/image/${roomId}?expires_in=1`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setQrCode(data)
        setSelectedRoomId(roomId)
        setViewMode('qr')
        // 출석 기록도 함께 조회
        await fetchAttendanceRecords(roomId)
      } else {
        const error = await response.json().catch(() => ({ detail: 'QR 코드 생성 실패' }))
        alert(error.detail || 'QR 코드 생성 실패')
      }
    } catch (error) {
      console.error('QR 코드 생성 실패:', error)
      alert('QR 코드 생성 중 오류가 발생했습니다. 서버가 실행 중인지 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  // 출석 기록 조회
  const fetchAttendanceRecords = async (roomId?: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`${API_BASE_URL}/api/attendance/?date=${today}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        // 특정 room_id로 필터링하거나, room_id가 있는 모든 야자 출석 기록
        let filteredRecords = data.filter((record: AttendanceRecord) => 
          record.room_id && record.room_id.length > 0
        )

        if (roomId) {
          filteredRecords = filteredRecords.filter((record: AttendanceRecord) => 
            record.room_id === roomId
          )
        }
        
        // 학생 정보 매핑
        const recordsWithStudents = filteredRecords.map((record: AttendanceRecord) => {
          if (!record.student && record.student_id) {
            const student = students.find(s => s.id === record.student_id)
            return { ...record, student }
          }
          return record
        })
        
        setAttendanceRecords(recordsWithStudents)
      }
    } catch (error) {
      console.error('출석 기록 조회 실패:', error)
    }
  }

  // 조퇴 승인/거부
  const handleApproveCheckout = async (attendanceId: number, approve: boolean) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/api/admin/approve_checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          attendance_id: attendanceId,
          approve: approve
        })
      })
      if (response.ok) {
        await fetchAttendanceRecords(selectedRoomId)
        alert(approve ? '조퇴가 승인되었습니다' : '조퇴 요청이 거부되었습니다')
      } else {
        const error = await response.json().catch(() => ({ detail: '처리 실패' }))
        alert(error.detail || '처리 실패')
      }
    } catch (error) {
      console.error('조퇴 승인 실패:', error)
      alert('처리 실패')
    } finally {
      setLoading(false)
    }
  }

  // 초기 데이터 로드 (인증 확인 후)
  useEffect(() => {
    if (isAuthenticated) {
      fetchStudents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // 학생 목록이 로드된 후 출석 기록 조회
  useEffect(() => {
    if (students.length > 0 && selectedRoomId) {
      fetchAttendanceRecords(selectedRoomId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.length, selectedRoomId])

  // QR 코드 자동 갱신
  useEffect(() => {
    if (selectedRoomId && viewMode === 'qr') {
      const interval = setInterval(() => {
        generateQRCode(selectedRoomId)
      }, 60000) // 1분마다 갱신
      return () => clearInterval(interval)
    }
  }, [selectedRoomId, viewMode])

  // 출석 기록 주기적 갱신
  useEffect(() => {
    if (viewMode === 'qr' && selectedRoomId) {
      const interval = setInterval(() => {
        fetchAttendanceRecords(selectedRoomId)
      }, 10000) // 10초마다 갱신
      return () => clearInterval(interval)
    }
  }, [viewMode, selectedRoomId])

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      'present': { label: '출석', color: 'bg-green-100 text-green-800' },
      'late': { label: '지각', color: 'bg-yellow-100 text-yellow-800' },
      'absent': { label: '결석', color: 'bg-red-100 text-red-800' },
      'early_leave_request': { label: '조퇴 요청', color: 'bg-blue-100 text-blue-800' },
      'early_leave': { label: '조퇴', color: 'bg-purple-100 text-purple-800' },
      'completed': { label: '정상 완료', color: 'bg-green-100 text-green-800' },
      'excused': { label: '공결', color: 'bg-gray-100 text-gray-800' }
    }
    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    )
  }

  // 필터링된 학생 목록
  const filteredStudents = students.filter(student => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      student.name.toLowerCase().includes(query) ||
      student.student_id.toLowerCase().includes(query) ||
      `${student.grade}-${student.class_number}-${student.student_number}`.includes(query)
    )
  })

  // selectedRoomId에서 학년과 반 추출 (예: "Y31" -> grade=3, class=1)
  const roomGradeClass = useMemo(() => {
    if (!selectedRoomId || !selectedRoomId.startsWith('Y')) {
      return null
    }
    // "Y31" 형식에서 학년과 반 추출
    const match = selectedRoomId.match(/^Y(\d)(\d)$/)
    if (match) {
      return {
        grade: parseInt(match[1], 10),
        class_number: parseInt(match[2], 10)
      }
    }
    return null
  }, [selectedRoomId])

  // 참여 학생 목록과 출석 기록 매핑
  // 선택된 반의 학생들만 표시하고, 출석 기록이 있으면 해당 상태를, 없으면 'absent'로 표시
  const participatingRecords = useMemo(() => {
    if (!selectedRoomId || participatingStudents.length === 0) {
      return []
    }

    // 선택된 반의 학생들만 필터링
    let filteredParticipatingStudents = participatingStudents
    
    if (roomGradeClass) {
      // 해당 학년-반의 학생들만 필터링
      filteredParticipatingStudents = participatingStudents.filter(studentId => {
        const student = students.find(s => s.id === studentId)
        return student && 
               student.grade === roomGradeClass.grade && 
               student.class_number === roomGradeClass.class_number
      })
    }
    
    return filteredParticipatingStudents.map(studentId => {
      // 해당 학생의 출석 기록 찾기 (오늘 날짜, 해당 room_id)
      const today = new Date().toISOString().split('T')[0]
      const record = attendanceRecords.find(r => 
        r.student_id === studentId && 
        r.room_id === selectedRoomId &&
        r.date.startsWith(today) // 오늘 날짜의 기록만
      )
      
      if (record) {
        // 출석 기록이 있으면 해당 기록 반환
        return record
      } else {
        // 출석 기록이 없으면 학생 정보를 가져와서 'absent' 상태로 생성
        const student = students.find(s => s.id === studentId)
        return {
          id: 0, // 임시 ID (실제 기록이 없으므로)
          student_id: studentId,
          student: student,
          teacher_id: 0,
          date: new Date().toISOString(),
          status: 'absent' as const,
          check_in_time: undefined,
          check_out_time: undefined,
          room_id: selectedRoomId,
          note: undefined
        }
      }
    })
  }, [participatingStudents, attendanceRecords, selectedRoomId, students, roomGradeClass])

  // 인증되지 않은 경우 로딩 화면 표시
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-godding-primary rounded-full mb-4 shadow-lg">
            <MoonIcon className="w-8 h-8 text-white" />
          </div>
          <p className="text-godding-text-secondary">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 메인 화면
  if (viewMode === 'main') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                <MoonIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-godding-text-primary">야간 자율 학습 출석</h1>
                <p className="text-lg text-godding-text-secondary mt-2">
                  참여 학생 관리 및 QR 코드 생성
                </p>
              </div>
            </div>
            
            {/* 서버 오류 알림 */}
            {serverError && (
              <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <XCircleIcon className="w-5 h-5 text-red-600" />
                      <p className="text-sm text-red-800 font-medium">{serverError}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setServerError(null)
                        fetchStudents()
                      }}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      다시 시도
                    </Button>
                  </div>
                  <div className="text-xs text-red-700 bg-red-50 p-3 rounded border border-red-200">
                    <p className="font-semibold mb-2">백엔드 서버 실행 방법:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>PowerShell에서 <code className="bg-red-100 px-1 rounded">cd backend-teacher</code> 실행</li>
                      <li><code className="bg-red-100 px-1 rounded">.\venv\Scripts\Activate.ps1</code> 실행 (가상환경 활성화)</li>
                      <li><code className="bg-red-100 px-1 rounded">python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000</code> 실행</li>
                      <li>서버가 실행되면 브라우저에서 <code className="bg-red-100 px-1 rounded">http://localhost:8000/docs</code> 접속하여 확인</li>
                    </ol>
                    <p className="mt-2 text-xs">또는 <code className="bg-red-100 px-1 rounded">.\start_server_simple.ps1</code> 스크립트를 실행하세요.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 참여 학생 관리 */}
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardHeader>
                <CardTitle className="text-godding-text-primary flex items-center space-x-2">
                  <UserGroupIcon className="w-5 h-5" />
                  <span>1단계: 참여 학생 관리</span>
                </CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  야자에 참여하는 학생들을 선택하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => setViewMode('students')}
                  className="w-full"
                  variant="outline"
                  disabled={students.length === 0 && serverError !== null}
                >
                  <UserGroupIcon className="w-4 h-4 mr-2" />
                  참여 학생 선택하기
                </Button>
                {students.length === 0 && !serverError && (
                  <div className="space-y-2">
                    <p className="text-xs text-godding-text-secondary text-center">
                      학생 데이터가 없습니다. 샘플 데이터를 생성하세요.
                    </p>
                    <Button
                      onClick={async () => {
                        try {
                          setLoading(true)
                          const token = localStorage.getItem('token')
                          const response = await fetch(`${API_BASE_URL}/api/students/create-sample`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            }
                          })
                          if (response.ok) {
                            await fetchStudents()
                            alert('샘플 학생 데이터가 생성되었습니다.')
                          } else {
                            const error = await response.json().catch(() => ({ detail: '생성 실패' }))
                            alert(error.detail || '샘플 데이터 생성 실패')
                          }
                        } catch (error) {
                          console.error('샘플 데이터 생성 실패:', error)
                          alert('샘플 데이터 생성 중 오류가 발생했습니다.')
                        } finally {
                          setLoading(false)
                        }
                      }}
                      disabled={loading}
                      className="w-full"
                      variant="outline"
                    >
                      {loading ? '생성 중...' : '샘플 학생 데이터 생성'}
                    </Button>
                  </div>
                )}
                {students.length === 0 && serverError && (
                  <p className="text-xs text-red-600 text-center">
                    학생 목록을 불러올 수 없습니다. 서버 연결을 확인해주세요.
                  </p>
                )}
                <div className="p-4 bg-godding-primary/10 rounded-lg">
                  <div className="text-sm text-godding-text-secondary">
                    현재 참여 학생: <span className="font-bold text-godding-primary">{participatingStudents.length}명</span>
                  </div>
                  {students.length > 0 && (
                    <div className="text-xs text-godding-text-secondary mt-1">
                      전체 학생: {students.length}명
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* QR 코드 생성 */}
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardHeader>
                <CardTitle className="text-godding-text-primary flex items-center space-x-2">
                  <QrCodeIcon className="w-5 h-5" />
                  <span>2단계: QR 코드 생성</span>
                </CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  반 번호를 입력하고 QR 코드를 생성하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-godding-text-primary">
                    반 번호 입력
                  </label>
                  <Input
                    placeholder="예: 1-1, 2-3, 3-5"
                    value={newRoomId}
                    onChange={(e) => setNewRoomId(e.target.value)}
                  />
                  <p className="text-xs text-godding-text-secondary">
                    형식: 학년-반 (예: 1-1, 2-3)
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (!newRoomId.trim()) {
                      alert('반 번호를 입력해주세요')
                      return
                    }
                    // 형식을 Y{학년}{반}으로 변환 (예: 1-1 -> Y11, 2-3 -> Y23)
                    const formattedRoomId = newRoomId.trim().replace(/-/g, '')
                    if (!/^\d{2}$/.test(formattedRoomId)) {
                      alert('올바른 형식으로 입력해주세요 (예: 1-1, 2-3)')
                      return
                    }
                    generateQRCode(`Y${formattedRoomId}`)
                  }}
                  disabled={loading || !newRoomId.trim()}
                  className="w-full"
                >
                  <QrCodeIcon className="w-4 h-4 mr-2" />
                  {loading ? '생성 중...' : `${newRoomId || '00'}반 QR코드 생성하기`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // 참여 학생 선택 화면
  if (viewMode === 'students') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-godding-text-primary flex items-center space-x-2">
                    <UserGroupIcon className="w-5 h-5" />
                    <span>참여 학생 선택</span>
                  </CardTitle>
                  <CardDescription className="text-godding-text-secondary">
                    야자에 참여하는 학생들을 선택하세요
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setViewMode('main')}
                  variant="outline"
                >
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  돌아가기
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 학생 검색 */}
                <Input
                  placeholder="학생 이름 또는 학번으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-4"
                />

                {/* 전체 학생 목록 */}
                {students.length === 0 && serverError ? (
                  <div className="text-center py-8 text-godding-text-secondary">
                    <p className="mb-2">학생 목록을 불러올 수 없습니다.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchStudents}
                    >
                      다시 시도
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                    {filteredStudents.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-godding-text-secondary">
                        검색 결과가 없습니다.
                      </div>
                    ) : (
                      filteredStudents.map((student) => {
                        const isParticipating = participatingStudents.includes(student.id)
                        return (
                          <div
                            key={student.id}
                            className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                              isParticipating
                                ? 'border-godding-primary bg-godding-primary/10'
                                : 'border-godding-card-border bg-godding-card-bg hover:border-godding-primary/50'
                            }`}
                            onClick={() => {
                              let updated: number[]
                              if (isParticipating) {
                                updated = participatingStudents.filter(id => id !== student.id)
                              } else {
                                updated = [...participatingStudents, student.id]
                              }
                              setParticipatingStudents(updated)
                              saveParticipatingStudents(updated)
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-godding-text-primary">
                                  {student.name}
                                </div>
                                <div className="text-sm text-godding-text-secondary">
                                  {student.grade}-{student.class_number} {student.student_number}번
                                </div>
                                <div className="text-xs text-godding-text-secondary mt-1">
                                  학번: {student.student_id}
                                </div>
                              </div>
                              {isParticipating && (
                                <CheckCircleIcon className="w-6 h-6 text-godding-primary" />
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}

                {/* 참여 학생 수 표시 */}
                <div className="mt-4 p-4 bg-godding-primary/10 rounded-lg">
                  <div className="text-sm text-godding-text-secondary">
                    참여 학생: <span className="font-bold text-godding-primary">{participatingStudents.length}명</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // QR 코드 및 출석 현황 화면
  if (viewMode === 'qr') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <Button
              onClick={() => {
                setViewMode('main')
                setQrCode(null)
                setSelectedRoomId('')
              }}
              variant="outline"
              className="mb-4"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              돌아가기
            </Button>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                <QrCodeIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-godding-text-primary">
                  {selectedRoomId} QR 코드 및 출석 현황
                </h1>
                <p className="text-lg text-godding-text-secondary mt-2">
                  QR 코드를 학생들에게 보여주고 출석 현황을 확인하세요
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* QR 코드 */}
            {qrCode && (
              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">
                    {selectedRoomId} - QR 코드
                  </CardTitle>
                  <CardDescription className="text-godding-text-secondary">
                    학생들이 스캔할 QR 코드입니다 (1분마다 자동 갱신)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center space-y-4">
                    <QRCodeDisplay imageData={qrCode.qr_code_image} />
                    <div className="text-sm text-godding-text-secondary">
                      <ClockIcon className="w-4 h-4 inline mr-1" />
                      만료: {new Date(qrCode.expires_at).toLocaleString()}
                    </div>
                    <Button
                      onClick={() => {
                        const qrWindow = window.open('', 'QRDisplay', 'width=1200,height=1000')
                        if (qrWindow) {
                          qrWindow.document.write(`
                            <!DOCTYPE html>
                            <html>
                              <head>
                                <title>${selectedRoomId} - QR 코드</title>
                                <style>
                                  body {
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                    justify-content: center;
                                    min-height: 100vh;
                                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                    font-family: sans-serif;
                                    margin: 0;
                                    padding: 20px;
                                  }
                                  .container {
                                    background: white;
                                    padding: 40px;
                                    border-radius: 20px;
                                    text-align: center;
                                    max-width: 100%;
                                    box-sizing: border-box;
                                  }
                                  h1 {
                                    font-size: 32px;
                                    margin-bottom: 20px;
                                    color: #333;
                                  }
                                  img {
                                    width: 400px;
                                    height: 400px;
                                    border: 3px solid #667eea;
                                    border-radius: 15px;
                                    padding: 20px;
                                    margin: 20px 0;
                                  }
                                  p {
                                    font-size: 18px;
                                    color: #666;
                                    margin-top: 20px;
                                  }
                                </style>
                              </head>
                              <body>
                                <div class="container">
                                  <h1>${selectedRoomId}</h1>
                                  <img src="data:image/png;base64,${qrCode.qr_code_image}" alt="QR Code" />
                                  <p>만료: ${new Date(qrCode.expires_at).toLocaleString()}</p>
                                </div>
                              </body>
                            </html>
                          `)
                          qrWindow.document.close()
                        }
                      }}
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      QR 화면 열기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 출석 현황 */}
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardHeader>
                <CardTitle className="text-godding-text-primary">참여 학생 출석 현황</CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  실시간 출석 현황 및 조퇴 요청 관리 (10초마다 자동 갱신)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 통계 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-green-100 rounded-lg">
                      <div className="text-sm text-gray-600">출석</div>
                      <div className="text-2xl font-bold text-green-800">
                        {participatingRecords.filter(r => r.status === 'present' || r.status === 'completed').length}
                      </div>
                    </div>
                    <div className="p-4 bg-yellow-100 rounded-lg">
                      <div className="text-sm text-gray-600">지각</div>
                      <div className="text-2xl font-bold text-yellow-800">
                        {participatingRecords.filter(r => r.status === 'late').length}
                      </div>
                    </div>
                    <div className="p-4 bg-red-100 rounded-lg">
                      <div className="text-sm text-gray-600">결석</div>
                      <div className="text-2xl font-bold text-red-800">
                        {participatingRecords.filter(r => r.status === 'absent' || !r.check_in_time).length}
                      </div>
                    </div>
                    <div className="p-4 bg-blue-100 rounded-lg">
                      <div className="text-sm text-gray-600">조퇴 요청</div>
                      <div className="text-2xl font-bold text-blue-800">
                        {participatingRecords.filter(r => r.status === 'early_leave_request').length}
                      </div>
                    </div>
                  </div>

                  {/* 출석 기록 목록 */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {participatingStudents.length === 0 ? (
                      <div className="text-center py-8 text-godding-text-secondary">
                        참여 학생을 먼저 선택해주세요
                      </div>
                    ) : (
                      participatingRecords.map((record, index) => {
                        const student = record.student || students.find(s => s.id === record.student_id)
                        return (
                          <div
                            key={record.id || `temp-${record.student_id}-${index}`}
                            className="p-4 bg-white/60 rounded-lg border border-godding-card-border flex items-center justify-between"
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="font-medium text-godding-text-primary">
                                  {student?.name || `학생 ID: ${record.student_id}`}
                                </div>
                                {student && (
                                  <div className="text-xs text-godding-text-secondary">
                                    {student.grade}-{student.class_number} {student.student_number}번
                                  </div>
                                )}
                                {getStatusBadge(record.status)}
                              </div>
                              <div className="text-sm text-godding-text-secondary mt-1">
                                {record.check_in_time && (
                                  <span>입실: {new Date(record.check_in_time).toLocaleString()}</span>
                                )}
                                {record.check_out_time && (
                                  <span className="ml-4">퇴실: {new Date(record.check_out_time).toLocaleString()}</span>
                                )}
                                {!record.check_in_time && record.status === 'absent' && (
                                  <span className="text-red-600">QR 코드 미스캔</span>
                                )}
                              </div>
                              {record.note && (
                                <div className="text-xs text-gray-500 mt-1">
                                  사유: {record.note}
                                </div>
                              )}
                            </div>
                            {record.status === 'early_leave_request' && record.id > 0 && (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveCheckout(record.id, true)}
                                  disabled={loading}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                                  승인
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApproveCheckout(record.id, false)}
                                  disabled={loading}
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  <XCircleIcon className="w-4 h-4 mr-1" />
                                  거부
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return null
}
