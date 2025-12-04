"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import {
  BookOpenIcon,
  ClockIcon,
  EyeIcon,
  MapIcon,
  PlusIcon,
  QrCodeIcon,
  UserIcon,
  TrashIcon
} from "@heroicons/react/24/outline"
import { useState } from "react"

interface StudyRoom {
  id: string
  name: string
  capacity: number
  description: string
  entranceQrCode: string
  qrExpiresAt: string
}

interface Student {
  id: string
  name: string
  grade: string
  class: string
  studentNumber: string
}

interface CheckInRecord {
  id: string
  roomId: string
  student: Student
  checkInTime: string
  checkOutTime?: string
  duration?: number
}

// QR 코드 이미지 표시 컴포넌트
const QRCodeDisplay = ({ value }: { value: string }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  
  // 온라인 QR 코드 생성 API 사용 (더 간단하고 확실한 방법)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(value)}`
  
  return (
    <div className="flex flex-col items-center relative">
      {hasError ? (
        <div className="w-48 h-48 border-2 border-gray-300 rounded-lg p-2 bg-white flex items-center justify-center">
          <div className="text-sm text-gray-500 text-center">QR 코드 생성 실패</div>
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-sm text-gray-500">QR 코드 생성 중...</div>
            </div>
          )}
          <img 
            src={qrImageUrl} 
            alt="QR Code" 
            className={`w-48 h-48 border-2 border-gray-300 rounded-lg p-2 bg-white ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setHasError(true)
            }}
          />
        </>
      )}
    </div>
  )
}

// QR 코드 화면 열기 함수
const openQRDisplayWindow = (room: StudyRoom) => {
  // 새 창으로 QR 코드 표시 화면 열기
  const width = 800
  const height = 600
  const left = (window.screen.width - width) / 2
  const top = (window.screen.height - height) / 2
  
  const qrWindow = window.open(
    '',
    'QRDisplay',
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`
  )
  
  if (!qrWindow) {
    alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.')
    return
  }
  
  // QR 코드 HTML 생성 (간단한 텍스트 기반 또는 백엔드 API 호출)
  qrWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${room.name} - QR 코드</title>
        <meta charset="utf-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 600px;
            width: 100%;
          }
          .room-name {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
          }
          .qr-code-container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            margin: 30px 0;
            border: 3px solid #667eea;
          }
          .qr-code-text {
            font-family: 'Courier New', monospace;
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
            word-break: break-all;
            letter-spacing: 2px;
          }
          .qr-info {
            margin-top: 20px;
            color: #666;
            font-size: 14px;
          }
          .expires-at {
            margin-top: 10px;
            color: #999;
            font-size: 12px;
          }
          .instruction {
            margin-top: 30px;
            padding: 15px;
            background: #f0f4ff;
            border-radius: 10px;
            color: #555;
            font-size: 14px;
          }
          @media print {
            body {
              background: white;
            }
            .container {
              box-shadow: none;
            }
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
      </head>
      <body>
        <div class="container">
          <div class="room-name">${room.name}</div>
          <div class="qr-info">입구 QR 코드</div>
          <div class="qr-code-container">
            <div id="qrcode"></div>
            <div class="qr-code-text">${room.entranceQrCode}</div>
          </div>
          <div class="expires-at">만료: ${new Date(room.qrExpiresAt).toLocaleString()}</div>
          <div class="instruction">
            학생들은 이 QR 코드를 스캔하여 정독실에 입실할 수 있습니다.
          </div>
        </div>
        <script>
          // QR 코드 생성
          QRCode.toCanvas(document.getElementById('qrcode'), '${room.entranceQrCode}', {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          }, function (error) {
            if (error) {
              console.error(error);
              document.getElementById('qrcode').innerHTML = '<p style="color: red;">QR 코드 생성 실패</p>';
            }
          });
          
          // 1분마다 페이지 새로고침 (QR 코드 갱신을 위해)
          setInterval(function() {
            location.reload();
          }, 60000);
        </script>
      </body>
    </html>
  `)
  qrWindow.document.close()
}

function StudyRoomPageContent() {
  const [currentStep, setCurrentStep] = useState<'setup' | 'dashboard' | 'records'>('setup')
  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null)
  
  const [newRoom, setNewRoom] = useState({
    name: '',
    capacity: 0,
    description: ''
  })

  // Helpers for QR
  const generateEntranceQRCode = () => {
    const token = Math.random().toString(36).substring(2, 10).toUpperCase()
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    return { code: `ROOMQR_${token}`, expiresAt: today.toISOString() }
  }

  // Mock data - 초기값은 빈 배열로 설정 (등록부터 시작)
  const [studyRooms, setStudyRooms] = useState<StudyRoom[]>([])
  const [isInitialized, setIsInitialized] = useState(true) // 초기화 완료로 설정하여 빈 배열 유지

  const [checkInRecords] = useState<CheckInRecord[]>([
    {
      id: 'r1',
      roomId: '1',
      student: { id: 'st1', name: '김철수', grade: '3', class: '1', studentNumber: '2024001' },
      checkInTime: '2024-01-20 14:30',
      duration: 120
    },
    {
      id: 'r2',
      roomId: '1',
      student: { id: 'st2', name: '이영희', grade: '3', class: '2', studentNumber: '2024002' },
      checkInTime: '2024-01-20 15:00',
      duration: 90
    },
    {
      id: 'r3',
      roomId: '2',
      student: { id: 'st3', name: '박민수', grade: '2', class: '3', studentNumber: '2023003' },
      checkInTime: '2024-01-20 16:00',
      duration: 45
    }
  ])

  const addRoom = () => {
    if (newRoom.name && newRoom.capacity > 0) {
      const { code, expiresAt } = generateEntranceQRCode()
      const room: StudyRoom = {
        id: Date.now().toString(),
        name: newRoom.name,
        capacity: newRoom.capacity,
        description: newRoom.description,
        entranceQrCode: code,
        qrExpiresAt: expiresAt
      }
      setStudyRooms([...studyRooms, room])
      setNewRoom({ name: '', capacity: 0, description: '' })
    }
  }

  const deleteRoom = (roomId: string) => {
    if (confirm('정말 이 정독실을 삭제하시겠습니까?')) {
      setStudyRooms(studyRooms.filter(room => room.id !== roomId))
      // 선택된 방이 삭제되면 선택 해제
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(null)
        setCurrentStep('setup')
      }
    }
  }

  const regenerateRoomQr = (roomId: string) => {
    const { code, expiresAt } = generateEntranceQRCode()
    setStudyRooms(prev => prev.map(room => room.id === roomId ? { ...room, entranceQrCode: code, qrExpiresAt: expiresAt } : room))
  }

  const getRoomUsageStats = (room: StudyRoom) => {
    const currentUsers = checkInRecords.filter(r => r.roomId === room.id && !r.checkOutTime).length
    const usageRate = room.capacity > 0 ? Math.min(100, Math.round((currentUsers / room.capacity) * 100)) : 0
    return { currentUsers, capacity: room.capacity, usageRate }
  }

  // Setup View - 공간 등록 및 입구 QR
  if (currentStep === 'setup') {
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
                  <h1 className="text-4xl font-bold text-godding-text-primary">정독실 관리</h1>
                  <p className="text-lg text-godding-text-secondary mt-2">
                    1단계: 공간 등록 - 공간별 입구 QR을 생성합니다
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setCurrentStep('dashboard')}
                >
                  다음 단계: 실시간 대시보드
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add New Room */}
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardHeader>
                <CardTitle className="text-godding-text-primary flex items-center space-x-2">
                  <PlusIcon className="w-5 h-5" />
                  <span>새 공간 등록</span>
                </CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  공간을 등록하고 입구 QR을 발급하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-godding-text-primary mb-1">
                    공간 이름
                  </label>
                  <Input
                    value={newRoom.name}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="예: 1정독실, 도서관"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-godding-text-primary mb-1">
                    수용 인원
                  </label>
                  <Input
                    type="number"
                    value={newRoom.capacity}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                    placeholder="예: 30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-godding-text-primary mb-1">
                    설명
                  </label>
                  <Input
                    value={newRoom.description}
                    onChange={(e) => setNewRoom(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="예: 1층 정독실"
                  />
                </div>
                <Button onClick={addRoom} className="w-full">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  공간 등록
                </Button>
              </CardContent>
            </Card>

            {/* Existing Rooms */}
            <div className="lg:col-span-2 space-y-6">
              {!isInitialized ? (
                <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                  <CardContent className="py-8 text-center">
                    <div className="text-godding-text-secondary">로딩 중...</div>
                  </CardContent>
                </Card>
              ) : studyRooms.length === 0 ? (
                <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                  <CardContent className="py-8 text-center">
                    <div className="text-godding-text-secondary">등록된 정독실이 없습니다.</div>
                  </CardContent>
                </Card>
              ) : (
                studyRooms.map((room) => {
                const stats = getRoomUsageStats(room)
                return (
                  <Card key={room.id} className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-godding-text-primary">{room.name}</CardTitle>
                          <CardDescription className="text-godding-text-secondary">
                            {room.description} | 수용 {room.capacity}명
                          </CardDescription>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedRoom(room)
                              setCurrentStep('dashboard')
                            }}
                          >
                            <EyeIcon className="w-4 h-4 mr-1" />
                            대시보드
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteRoom(room.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <TrashIcon className="w-4 h-4 mr-1" />
                            삭제
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Room Stats */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{stats.capacity}</div>
                          <div className="text-sm text-godding-text-secondary">수용 인원</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{stats.currentUsers}</div>
                          <div className="text-sm text-godding-text-secondary">현재 이용자</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{stats.usageRate}%</div>
                          <div className="text-sm text-godding-text-secondary">사용률</div>
                        </div>
                      </div>

                      {/* Entrance QR */}
                      <div className="p-4 bg-white/50 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="text-sm text-godding-text-secondary">입구 QR코드 (오늘자)</div>
                            <div className="font-mono font-semibold text-godding-text-primary break-all mt-1">{room.entranceQrCode}</div>
                            <div className="text-xs text-godding-text-secondary mt-1">만료: {typeof window !== 'undefined' ? new Date(room.qrExpiresAt).toLocaleString() : room.qrExpiresAt}</div>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" onClick={() => regenerateRoomQr(room.id)}>QR 재생성</Button>
                            <Button variant="outline" onClick={() => openQRDisplayWindow(room)}>QR 화면 열기</Button>
                          </div>
                        </div>
                        <div className="flex justify-center">
                          <QRCodeDisplay value={room.entranceQrCode} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              }))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard View - 실시간 공간 현황 대시보드
  if (currentStep === 'dashboard' && selectedRoom) {
    const stats = getRoomUsageStats(selectedRoom)
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep('setup')}
                  className="flex items-center space-x-2"
                >
                  ← 이전 단계
                </Button>
                <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <MapIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-godding-text-primary">실시간 공간 현황</h1>
                  <p className="text-lg text-godding-text-secondary mt-2">
                    {selectedRoom.name} - 입구 QR 기반 입실/퇴실 체크인 현황
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep('records')}
                >
                  이용 기록 보기
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Stats Panel */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">현황 요약</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.capacity}</div>
                    <div className="text-sm text-godding-text-secondary">수용 인원</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.currentUsers}</div>
                    <div className="text-sm text-godding-text-secondary">현재 이용자</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{stats.usageRate}%</div>
                    <div className="text-sm text-godding-text-secondary">사용률</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">현재 이용자</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {checkInRecords
                      .filter(r => r.roomId === selectedRoom.id && !r.checkOutTime)
                      .map((r) => (
                        <div key={r.id} className="flex items-center space-x-3 p-2 bg-white/50 rounded">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm text-godding-text-primary">{r.student.name}</div>
                            <div className="text-xs text-godding-text-secondary">{r.student.grade}-{r.student.class} | {r.student.studentNumber}</div>
                          </div>
                          <div className="text-xs text-godding-text-secondary">
                            {r.checkInTime.split(' ')[1]}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Entrance QR Panel */}
            <div className="lg:col-span-3">
              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">입구 QR코드</CardTitle>
                  <CardDescription className="text-godding-text-secondary">해당 공간 입구에 표시할 오늘의 동적 QR입니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-6 bg-white/60 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm text-godding-text-secondary">오늘의 입구 QR코드</div>
                        <div className="font-mono text-xl font-bold text-godding-text-primary break-all mt-1">{selectedRoom.entranceQrCode}</div>
                        <div className="text-xs text-godding-text-secondary mt-1">
                          <ClockIcon className="w-3 h-3 inline mr-1" /> 만료: {typeof window !== 'undefined' ? new Date(selectedRoom.qrExpiresAt).toLocaleString() : selectedRoom.qrExpiresAt}
                        </div>
                      </div>
                      <div className="space-x-2">
                        <Button variant="outline" onClick={() => regenerateRoomQr(selectedRoom.id)}>QR 재생성</Button>
                        <Button onClick={() => openQRDisplayWindow(selectedRoom)}>QR 화면 열기</Button>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <QRCodeDisplay value={selectedRoom.entranceQrCode} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Records View - 이용 기록
  if (currentStep === 'records') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep('dashboard')}
                  className="flex items-center space-x-2"
                >
                  ← 이전 단계
                </Button>
                <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <ClockIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-godding-text-primary">이용 기록</h1>
                  <p className="text-lg text-godding-text-secondary mt-2">
                    QR코드 기반 입실/퇴실 체크인 기록을 확인하세요
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline">
                  엑셀 다운로드
                </Button>
              </div>
            </div>
          </div>

          <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
            <CardHeader>
              <CardTitle className="text-godding-text-primary">체크인 기록</CardTitle>
              <CardDescription className="text-godding-text-secondary">
                학생들의 정독실 이용 기록입니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checkInRecords.map((record) => {
                  const room = studyRooms.find(r => r.id === record.roomId)
                  return (
                    <div key={record.id} className="flex items-center justify-between p-4 bg-white/50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-godding-primary rounded-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-godding-text-primary">{record.student.name}</h4>
                          <p className="text-sm text-godding-text-secondary">{record.student.grade}-{record.student.class} | {record.student.studentNumber}</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-godding-text-secondary">정독실</div>
                        <div className="font-medium text-godding-text-primary">{room?.name}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-godding-text-secondary">입실 시간</div>
                        <div className="font-medium text-godding-text-primary">{record.checkInTime.split(' ')[1]}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-godding-text-secondary">이용 시간</div>
                        <div className="font-medium text-godding-text-primary">{record.duration}분</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-green-600">이용 중</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Default view
  return (
    <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="w-20 h-20 bg-godding-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
          <BookOpenIcon className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-godding-text-primary mb-4">
          정독실 관리
        </h1>
        <p className="text-xl text-godding-text-secondary mb-8">
          입구 동적 QR 기반 입실/퇴실 체크인으로 정독실을 효율적으로 관리하세요
        </p>
        <Button 
          onClick={() => setCurrentStep('setup')}
          size="lg"
          className="text-lg px-8 py-4"
        >
          시작하기
        </Button>
      </div>
    </div>
  )
}

export default function StudyRoomPage() {
  return (
    <ProtectedRoute>
      <StudyRoomPageContent />
    </ProtectedRoute>
  )
}
