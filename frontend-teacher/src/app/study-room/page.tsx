"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  MapIcon,
  PlusIcon,
  QrCodeIcon,
  TrashIcon,
  UserIcon,
  XCircleIcon
} from "@heroicons/react/24/outline"
import { useState } from "react"

interface StudyRoom {
  id: string
  name: string
  capacity: number
  description: string
  seats: Seat[]
}

interface Seat {
  id: string
  number: string
  qrCode: string
  isOccupied: boolean
  occupiedBy?: Student
  occupiedAt?: string
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
  studentId: string
  seatId: string
  checkInTime: string
  checkOutTime?: string
  duration?: number
}

export default function StudyRoomPage() {
  const [currentStep, setCurrentStep] = useState<'setup' | 'dashboard' | 'records'>('setup')
  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null)
  
  const [newRoom, setNewRoom] = useState({
    name: '',
    capacity: 0,
    description: ''
  })

  const [newSeat, setNewSeat] = useState({
    number: '',
    qrCode: ''
  })

  // Mock data
  const [studyRooms, setStudyRooms] = useState<StudyRoom[]>([
    {
      id: '1',
      name: '1정독실',
      capacity: 30,
      description: '1층 정독실',
      seats: [
        { id: 's1', number: 'A1', qrCode: 'QR_A1_001', isOccupied: true, occupiedBy: { id: 'st1', name: '김철수', grade: '3', class: '1', studentNumber: '2024001' }, occupiedAt: '2024-01-20 14:30' },
        { id: 's2', number: 'A2', qrCode: 'QR_A2_002', isOccupied: false },
        { id: 's3', number: 'A3', qrCode: 'QR_A3_003', isOccupied: true, occupiedBy: { id: 'st2', name: '이영희', grade: '3', class: '2', studentNumber: '2024002' }, occupiedAt: '2024-01-20 15:00' },
        { id: 's4', number: 'A4', qrCode: 'QR_A4_004', isOccupied: false },
        { id: 's5', number: 'A5', qrCode: 'QR_A5_005', isOccupied: false }
      ]
    },
    {
      id: '2',
      name: '도서관',
      capacity: 50,
      description: '중앙 도서관',
      seats: [
        { id: 's6', number: 'B1', qrCode: 'QR_B1_006', isOccupied: false },
        { id: 's7', number: 'B2', qrCode: 'QR_B2_007', isOccupied: true, occupiedBy: { id: 'st3', name: '박민수', grade: '2', class: '3', studentNumber: '2023003' }, occupiedAt: '2024-01-20 16:00' },
        { id: 's8', number: 'B3', qrCode: 'QR_B3_008', isOccupied: false }
      ]
    }
  ])

  const [checkInRecords] = useState<CheckInRecord[]>([
    {
      id: 'r1',
      studentId: 'st1',
      seatId: 's1',
      checkInTime: '2024-01-20 14:30',
      duration: 120
    },
    {
      id: 'r2',
      studentId: 'st2',
      seatId: 's3',
      checkInTime: '2024-01-20 15:00',
      duration: 90
    }
  ])

  const addRoom = () => {
    if (newRoom.name && newRoom.capacity > 0) {
      const room: StudyRoom = {
        id: Date.now().toString(),
        ...newRoom,
        seats: []
      }
      setStudyRooms([...studyRooms, room])
      setNewRoom({ name: '', capacity: 0, description: '' })
    }
  }

  const addSeat = (roomId: string) => {
    if (newSeat.number && newSeat.qrCode) {
      const seat: Seat = {
        id: Date.now().toString(),
        ...newSeat,
        isOccupied: false
      }
      setStudyRooms(prev => prev.map(room => 
        room.id === roomId 
          ? { ...room, seats: [...room.seats, seat] }
          : room
      ))
      setNewSeat({ number: '', qrCode: '' })
    }
  }

  const removeSeat = (roomId: string, seatId: string) => {
    setStudyRooms(prev => prev.map(room => 
      room.id === roomId 
        ? { ...room, seats: room.seats.filter(seat => seat.id !== seatId) }
        : room
    ))
  }

  const getRoomStats = (room: StudyRoom) => {
    const occupiedSeats = room.seats.filter(seat => seat.isOccupied).length
    const availableSeats = room.seats.length - occupiedSeats
    return { occupiedSeats, availableSeats, totalSeats: room.seats.length }
  }

  const generateQRCode = () => {
    return `QR_${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  }

  // Setup View - 공간 및 좌석 등록
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
                    1단계: 공간 및 좌석 등록 - 정독실과 좌석 배치도 설정
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
                  <span>새 정독실 등록</span>
                </CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  정독실 공간을 등록하고 좌석 배치도를 설정하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-godding-text-primary mb-1">
                    정독실 이름
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
                  정독실 등록
                </Button>
              </CardContent>
            </Card>

            {/* Existing Rooms */}
            <div className="lg:col-span-2 space-y-6">
              {studyRooms.map((room) => {
                const stats = getRoomStats(room)
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
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Room Stats */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{stats.totalSeats}</div>
                          <div className="text-sm text-godding-text-secondary">전체 좌석</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{stats.availableSeats}</div>
                          <div className="text-sm text-godding-text-secondary">빈 좌석</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">{stats.occupiedSeats}</div>
                          <div className="text-sm text-godding-text-secondary">사용 중</div>
                        </div>
                      </div>

                      {/* Add Seat */}
                      <div className="mb-4 p-4 bg-white/50 rounded-lg">
                        <h4 className="font-medium text-godding-text-primary mb-3">좌석 추가</h4>
                        <div className="flex space-x-2">
                          <Input
                            value={newSeat.number}
                            onChange={(e) => setNewSeat(prev => ({ ...prev, number: e.target.value }))}
                            placeholder="좌석 번호 (예: A1)"
                          />
                          <Input
                            value={newSeat.qrCode}
                            onChange={(e) => setNewSeat(prev => ({ ...prev, qrCode: e.target.value }))}
                            placeholder="QR 코드"
                          />
                          <Button 
                            variant="outline"
                            onClick={() => setNewSeat(prev => ({ ...prev, qrCode: generateQRCode() }))}
                          >
                            <QrCodeIcon className="w-4 h-4" />
                          </Button>
                          <Button 
                            onClick={() => addSeat(room.id)}
                            disabled={!newSeat.number || !newSeat.qrCode}
                          >
                            <PlusIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Seats Grid */}
                      <div className="grid grid-cols-5 gap-2">
                        {room.seats.map((seat) => (
                          <div 
                            key={seat.id} 
                            className={`p-3 rounded-lg border-2 text-center ${
                              seat.isOccupied 
                                ? 'bg-red-100 border-red-300' 
                                : 'bg-green-100 border-green-300'
                            }`}
                          >
                            <div className="font-medium text-sm">{seat.number}</div>
                            <div className="text-xs text-godding-text-secondary mt-1">
                              {seat.isOccupied ? (
                                <div>
                                  <div className="text-red-600">사용 중</div>
                                  <div className="text-xs">{seat.occupiedBy?.name}</div>
                                </div>
                              ) : (
                                <div className="text-green-600">빈 좌석</div>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeSeat(room.id, seat.id)}
                              className="mt-2 w-full text-xs"
                            >
                              <TrashIcon className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard View - 실시간 좌석 현황 대시보드
  if (currentStep === 'dashboard' && selectedRoom) {
    const stats = getRoomStats(selectedRoom)
    
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
                  <h1 className="text-4xl font-bold text-godding-text-primary">실시간 좌석 현황</h1>
                  <p className="text-lg text-godding-text-secondary mt-2">
                    {selectedRoom.name} - QR코드 기반 입실/퇴실 체크인 현황
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
                    <div className="text-2xl font-bold text-blue-600">{stats.totalSeats}</div>
                    <div className="text-sm text-godding-text-secondary">전체 좌석</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.availableSeats}</div>
                    <div className="text-sm text-godding-text-secondary">빈 좌석</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{stats.occupiedSeats}</div>
                    <div className="text-sm text-godding-text-secondary">사용 중</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round((stats.occupiedSeats / stats.totalSeats) * 100)}%
                    </div>
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
                    {selectedRoom.seats
                      .filter(seat => seat.isOccupied)
                      .map((seat) => (
                        <div key={seat.id} className="flex items-center space-x-3 p-2 bg-white/50 rounded">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm text-godding-text-primary">
                              {seat.occupiedBy?.name}
                            </div>
                            <div className="text-xs text-godding-text-secondary">
                              {seat.number} | {seat.occupiedBy?.grade}-{seat.occupiedBy?.class}
                            </div>
                          </div>
                          <div className="text-xs text-godding-text-secondary">
                            {seat.occupiedAt?.split(' ')[1]}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Seats Layout */}
            <div className="lg:col-span-3">
              <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                <CardHeader>
                  <CardTitle className="text-godding-text-primary">좌석 배치도</CardTitle>
                  <CardDescription className="text-godding-text-secondary">
                    실시간 좌석 현황을 확인하세요. 학생들이 QR코드로 체크인한 상태입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-4">
                    {selectedRoom.seats.map((seat) => (
                      <div 
                        key={seat.id} 
                        className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                          seat.isOccupied 
                            ? 'bg-red-100 border-red-300 hover:bg-red-200' 
                            : 'bg-green-100 border-green-300 hover:bg-green-200'
                        }`}
                      >
                        <div className="flex items-center justify-center mb-2">
                          {seat.isOccupied ? (
                            <XCircleIcon className="w-6 h-6 text-red-600" />
                          ) : (
                            <CheckCircleIcon className="w-6 h-6 text-green-600" />
                          )}
                        </div>
                        <div className="font-bold text-lg text-godding-text-primary">{seat.number}</div>
                        <div className="text-sm text-godding-text-secondary mt-1">
                          {seat.isOccupied ? (
                            <div>
                              <div className="text-red-600 font-medium">사용 중</div>
                              <div className="text-xs mt-1">{seat.occupiedBy?.name}</div>
                              <div className="text-xs">{seat.occupiedBy?.grade}-{seat.occupiedBy?.class}</div>
                            </div>
                          ) : (
                            <div className="text-green-600 font-medium">빈 좌석</div>
                          )}
                        </div>
                        <div className="text-xs text-godding-text-secondary mt-2">
                          QR: {seat.qrCode}
                        </div>
                        {seat.occupiedAt && (
                          <div className="text-xs text-godding-text-secondary mt-1">
                            <ClockIcon className="w-3 h-3 inline mr-1" />
                            {seat.occupiedAt.split(' ')[1]}
                          </div>
                        )}
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
                  const student = studyRooms
                    .flatMap(room => room.seats)
                    .find(seat => seat.id === record.seatId)?.occupiedBy
                  const room = studyRooms.find(room => 
                    room.seats.some(seat => seat.id === record.seatId)
                  )
                  const seat = room?.seats.find(seat => seat.id === record.seatId)
                  
                  return (
                    <div key={record.id} className="flex items-center justify-between p-4 bg-white/50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-godding-primary rounded-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-godding-text-primary">{student?.name}</h4>
                          <p className="text-sm text-godding-text-secondary">
                            {student?.grade}-{student?.class} | {student?.studentNumber}
                          </p>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-godding-text-secondary">좌석</div>
                        <div className="font-medium text-godding-text-primary">{seat?.number}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-godding-text-secondary">정독실</div>
                        <div className="font-medium text-godding-text-primary">{room?.name}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-godding-text-secondary">입실 시간</div>
                        <div className="font-medium text-godding-text-primary">
                          {record.checkInTime.split(' ')[1]}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-godding-text-secondary">이용 시간</div>
                        <div className="font-medium text-godding-text-primary">
                          {record.duration}분
                        </div>
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
          QR코드 기반 입실/퇴실 체크인으로 정독실을 효율적으로 관리하세요
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
