"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Battery0Icon,
    BellIcon,
    BuildingOfficeIcon,
    CheckCircleIcon,
    ClockIcon,
    DevicePhoneMobileIcon,
    ExclamationTriangleIcon,
    EyeIcon,
    MapPinIcon,
    PencilIcon,
    PlusIcon,
    SignalIcon,
    TrashIcon,
    UserGroupIcon,
    XCircleIcon
} from "@heroicons/react/24/outline"
import { useState } from "react"

interface Beacon {
  id: string
  uuid: string
  major: number
  minor: number
  name: string
  location: string
  spaceId: string
  batteryLevel: number
  lastSignalTime: string
  status: 'active' | 'low_battery' | 'offline' | 'maintenance'
  signalStrength: number
  installDate: string
}

interface Space {
  id: string
  name: string
  type: '정독실' | '도서관' | '컴퓨터실' | '실험실' | '강의실' | '휴게실'
  capacity: number
  currentOccupancy: number
  beaconId?: string
  description: string
  operatingHours: {
    start: string
    end: string
  }
  rules: string[]
}

interface Student {
  id: string
  name: string
  grade: string
  class: string
  studentNumber: string
  currentSpace?: string
  checkInTime?: string
  checkOutTime?: string
  totalStudyTime: number
  lastActivity: string
}

// interface SpaceUsage {
//   spaceId: string
//   spaceName: string
//   currentStudents: Student[]
//   peakHours: { hour: number; count: number }[]
//   averageStayTime: number
//   utilizationRate: number
// }

interface BeaconAlert {
  id: string
  beaconId: string
  type: 'low_battery' | 'offline' | 'signal_weak' | 'maintenance_due'
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  resolved: boolean
}

export default function BeaconSpaceManagementPage() {
  const [currentStep, setCurrentStep] = useState<'beacons' | 'spaces' | 'monitoring' | 'alerts'>('beacons')
  // const [selectedSpace] = useState<Space | null>(null)
  
  // Beacon System States
  const [beacons, setBeacons] = useState<Beacon[]>([
    { 
      id: '1', 
      uuid: '550e8400-e29b-41d4-a716-446655440001', 
      major: 1001, 
      minor: 1, 
      name: '1정독실 입구 비콘', 
      location: '1정독실 입구 천장', 
      spaceId: '1', 
      batteryLevel: 85, 
      lastSignalTime: '2024-01-20 14:30:00', 
      status: 'active', 
      signalStrength: -45, 
      installDate: '2024-01-01' 
    },
    { 
      id: '2', 
      uuid: '550e8400-e29b-41d4-a716-446655440002', 
      major: 1002, 
      minor: 1, 
      name: '2정독실 입구 비콘', 
      location: '2정독실 입구 천장', 
      spaceId: '2', 
      batteryLevel: 92, 
      lastSignalTime: '2024-01-20 14:28:00', 
      status: 'active', 
      signalStrength: -42, 
      installDate: '2024-01-01' 
    },
    { 
      id: '3', 
      uuid: '550e8400-e29b-41d4-a716-446655440003', 
      major: 1003, 
      minor: 1, 
      name: '도서관 입구 비콘', 
      location: '도서관 입구 벽면', 
      spaceId: '3', 
      batteryLevel: 15, 
      lastSignalTime: '2024-01-20 13:45:00', 
      status: 'low_battery', 
      signalStrength: -65, 
      installDate: '2024-01-01' 
    }
  ])
  
  const [spaces, setSpaces] = useState<Space[]>([
    { 
      id: '1', 
      name: '1정독실', 
      type: '정독실', 
      capacity: 50, 
      currentOccupancy: 23, 
      beaconId: '1', 
      description: '조용한 개인 학습 공간', 
      operatingHours: { start: '08:00', end: '22:00' }, 
      rules: ['조용히 학습하기', '음식물 반입 금지', '휴대폰 무음 모드'] 
    },
    { 
      id: '2', 
      name: '2정독실', 
      type: '정독실', 
      capacity: 40, 
      currentOccupancy: 18, 
      beaconId: '2', 
      description: '그룹 스터디 가능한 공간', 
      operatingHours: { start: '08:00', end: '22:00' }, 
      rules: ['적당한 소음 허용', '그룹 토론 가능', '정리정돈 필수'] 
    },
    { 
      id: '3', 
      name: '중앙도서관', 
      type: '도서관', 
      capacity: 100, 
      currentOccupancy: 67, 
      beaconId: '3', 
      description: '종합 학습 및 자료 열람 공간', 
      operatingHours: { start: '09:00', end: '21:00' }, 
      rules: ['완전 무음', '도서 대출 규칙 준수', '개인 소지품 정리'] 
    }
  ])
  
  const [students] = useState<Student[]>([
    { 
      id: 's1', 
      name: '김철수', 
      grade: '3', 
      class: '1', 
      studentNumber: '2024001', 
      currentSpace: '1', 
      checkInTime: '2024-01-20 14:00:00', 
      totalStudyTime: 120, 
      lastActivity: '2024-01-20 14:30:00' 
    },
    { 
      id: 's2', 
      name: '이영희', 
      grade: '3', 
      class: '1', 
      studentNumber: '2024002', 
      currentSpace: '2', 
      checkInTime: '2024-01-20 13:30:00', 
      totalStudyTime: 90, 
      lastActivity: '2024-01-20 14:25:00' 
    },
    { 
      id: 's3', 
      name: '박민수', 
      grade: '3', 
      class: '2', 
      studentNumber: '2024003', 
      currentSpace: '3', 
      checkInTime: '2024-01-20 12:00:00', 
      totalStudyTime: 150, 
      lastActivity: '2024-01-20 14:20:00' 
    }
  ])

  // Additional States
  const [alerts, setAlerts] = useState<BeaconAlert[]>([
    {
      id: 'a1',
      beaconId: '3',
      type: 'low_battery',
      message: '도서관 입구 비콘 배터리 잔량이 15%입니다. 교체가 필요합니다.',
      severity: 'high',
      timestamp: '2024-01-20 14:00:00',
      resolved: false
    },
    {
      id: 'a2',
      beaconId: '1',
      type: 'signal_weak',
      message: '1정독실 비콘 신호가 약해졌습니다. 위치를 확인해주세요.',
      severity: 'medium',
      timestamp: '2024-01-20 13:30:00',
      resolved: false
    }
  ])

  const [newBeacon, setNewBeacon] = useState({
    uuid: '',
    major: 0,
    minor: 0,
    name: '',
    location: '',
    spaceId: '',
    installDate: ''
  })

  const [newSpace, setNewSpace] = useState({
    name: '',
    type: '정독실' as '정독실' | '도서관' | '컴퓨터실' | '실험실' | '강의실' | '휴게실',
    capacity: 0,
    description: '',
    operatingHours: { start: '08:00', end: '22:00' },
    rules: [] as string[]
  })

  const addBeacon = () => {
    if (newBeacon.name && newBeacon.uuid) {
      const beacon: Beacon = {
        id: Date.now().toString(),
        ...newBeacon,
        batteryLevel: 100,
        lastSignalTime: new Date().toISOString(),
        status: 'active',
        signalStrength: -50
      }
      setBeacons([...beacons, beacon])
      setNewBeacon({ uuid: '', major: 0, minor: 0, name: '', location: '', spaceId: '', installDate: '' })
    }
  }

  const addSpace = () => {
    if (newSpace.name) {
      const space: Space = {
        id: Date.now().toString(),
        ...newSpace,
        currentOccupancy: 0
      }
      setSpaces([...spaces, space])
      setNewSpace({ 
        name: '', 
        type: '정독실', 
        capacity: 0, 
        description: '', 
        operatingHours: { start: '08:00', end: '22:00' }, 
        rules: [] 
      })
    }
  }

  const getBeaconById = (id: string) => beacons.find(b => b.id === id)
  const getSpaceById = (id: string) => spaces.find(s => s.id === id)
  // const getStudentById = (id: string) => students.find(s => s.id === id)

  const getSpaceUsage = () => {
    return spaces.map(space => {
      const currentStudents = students.filter(s => s.currentSpace === space.id)
      const utilizationRate = (space.currentOccupancy / space.capacity) * 100
      
      return {
        spaceId: space.id,
        spaceName: space.name,
        currentStudents,
        peakHours: [], // 실제로는 시간대별 데이터 필요
        averageStayTime: 0, // 실제로는 계산 필요
        utilizationRate
      }
    })
  }

  const getBeaconStatus = () => {
    const activeBeacons = beacons.filter(b => b.status === 'active').length
    const lowBatteryBeacons = beacons.filter(b => b.status === 'low_battery').length
    const offlineBeacons = beacons.filter(b => b.status === 'offline').length
    
    return {
      total: beacons.length,
      active: activeBeacons,
      lowBattery: lowBatteryBeacons,
      offline: offlineBeacons
    }
  }

  const resolveAlert = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ))
  }

  // Beacon Management View
  if (currentStep === 'beacons') {
    const beaconStatus = getBeaconStatus()
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <SignalIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-godding-text-primary">비콘 기반 공간 관리 시스템</h1>
                  <p className="text-lg text-godding-text-secondary mt-2">
                    1단계: 비콘 등록 및 공간 매핑 - 하드웨어 설정 및 공간 연결
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep('spaces')}
                >
                  다음 단계: 공간 관리
                </Button>
              </div>
            </div>
          </div>

          {/* Beacon Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">전체 비콘</p>
                    <p className="text-2xl font-bold text-godding-text-primary">{beaconStatus.total}</p>
                  </div>
                  <SignalIcon className="w-8 h-8 text-godding-primary" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">정상 작동</p>
                    <p className="text-2xl font-bold text-green-600">{beaconStatus.active}</p>
                  </div>
                  <CheckCircleIcon className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">배터리 부족</p>
                    <p className="text-2xl font-bold text-yellow-600">{beaconStatus.lowBattery}</p>
                  </div>
                  <Battery0Icon className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">오프라인</p>
                    <p className="text-2xl font-bold text-red-600">{beaconStatus.offline}</p>
                  </div>
                  <XCircleIcon className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Beacon Registration */}
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardHeader>
                <CardTitle className="text-godding-text-primary flex items-center space-x-2">
                  <SignalIcon className="w-5 h-5" />
                  <span>비콘 등록</span>
                </CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  새로운 비콘 하드웨어를 시스템에 등록하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Input
                    value={newBeacon.name}
                    onChange={(e) => setNewBeacon(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="비콘 이름 (예: 1정독실 입구 비콘)"
                  />
                  <Input
                    value={newBeacon.uuid}
                    onChange={(e) => setNewBeacon(prev => ({ ...prev, uuid: e.target.value }))}
                    placeholder="UUID (예: 550e8400-e29b-41d4-a716-446655440001)"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      value={newBeacon.major}
                      onChange={(e) => setNewBeacon(prev => ({ ...prev, major: parseInt(e.target.value) || 0 }))}
                      placeholder="Major ID"
                    />
                    <Input
                      type="number"
                      value={newBeacon.minor}
                      onChange={(e) => setNewBeacon(prev => ({ ...prev, minor: parseInt(e.target.value) || 0 }))}
                      placeholder="Minor ID"
                    />
                  </div>
                  <Input
                    value={newBeacon.location}
                    onChange={(e) => setNewBeacon(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="설치 위치 (예: 1정독실 입구 천장)"
                  />
                  <Input
                    type="date"
                    value={newBeacon.installDate}
                    onChange={(e) => setNewBeacon(prev => ({ ...prev, installDate: e.target.value }))}
                    placeholder="설치 날짜"
                  />
                  <Button onClick={addBeacon} className="w-full">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    비콘 등록
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Space Mapping */}
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardHeader>
                <CardTitle className="text-godding-text-primary flex items-center space-x-2">
                  <MapPinIcon className="w-5 h-5" />
                  <span>공간 매핑</span>
                </CardTitle>
                <CardDescription className="text-godding-text-secondary">
                  비콘을 특정 공간과 연결하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Input
                    value={newSpace.name}
                    onChange={(e) => setNewSpace(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="공간 이름 (예: 1정독실)"
                  />
                  <select
                    value={newSpace.type}
                    onChange={(e) => setNewSpace(prev => ({ ...prev, type: e.target.value as Space['type'] }))}
                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="정독실">정독실</option>
                    <option value="도서관">도서관</option>
                    <option value="컴퓨터실">컴퓨터실</option>
                    <option value="실험실">실험실</option>
                    <option value="강의실">강의실</option>
                    <option value="휴게실">휴게실</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      value={newSpace.capacity}
                      onChange={(e) => setNewSpace(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                      placeholder="수용 인원"
                    />
                    <select className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                      <option>비콘 선택</option>
                      {beacons.map((beacon) => (
                        <option key={beacon.id} value={beacon.id}>
                          {beacon.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Textarea
                    value={newSpace.description}
                    onChange={(e) => setNewSpace(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="공간 설명"
                    rows={2}
                  />
                  <Button onClick={addSpace} className="w-full">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    공간 등록
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Registered Beacons */}
          <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border mt-8">
            <CardHeader>
              <CardTitle className="text-godding-text-primary">등록된 비콘 목록</CardTitle>
              <CardDescription className="text-godding-text-secondary">
                시스템에 등록된 모든 비콘의 상태를 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {beacons.map((beacon) => {
                  const space = getSpaceById(beacon.spaceId)
                  return (
                    <div key={beacon.id} className="p-4 bg-white/50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-godding-text-primary">{beacon.name}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              beacon.status === 'active' ? 'bg-green-100 text-green-700' :
                              beacon.status === 'low_battery' ? 'bg-yellow-100 text-yellow-700' :
                              beacon.status === 'offline' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {beacon.status === 'active' ? '정상' :
                               beacon.status === 'low_battery' ? '배터리 부족' :
                               beacon.status === 'offline' ? '오프라인' : '점검중'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-godding-text-secondary">
                            <div>
                              <p><strong>위치:</strong> {beacon.location}</p>
                              <p><strong>연결된 공간:</strong> {space?.name || '미연결'}</p>
                            </div>
                            <div>
                              <p><strong>배터리:</strong> {beacon.batteryLevel}%</p>
                              <p><strong>신호 강도:</strong> {beacon.signalStrength} dBm</p>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-godding-text-secondary">
                            <p>UUID: {beacon.uuid}</p>
                            <p>Major: {beacon.major}, Minor: {beacon.minor}</p>
                            <p>마지막 신호: {beacon.lastSignalTime}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <TrashIcon className="w-4 h-4" />
                          </Button>
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
    )
  }

  // Space Management View
  if (currentStep === 'spaces') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep('beacons')}
                  className="flex items-center space-x-2"
                >
                  ← 이전 단계
                </Button>
                <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <BuildingOfficeIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-godding-text-primary">공간 관리</h1>
                  <p className="text-lg text-godding-text-secondary mt-2">
                    2단계: 학습 공간 설정 및 운영 규칙 관리
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep('monitoring')}
                >
                  다음 단계: 실시간 모니터링
                </Button>
              </div>
            </div>
          </div>

          {/* Space Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">전체 공간</p>
                    <p className="text-2xl font-bold text-godding-text-primary">{spaces.length}</p>
                  </div>
                  <BuildingOfficeIcon className="w-8 h-8 text-godding-primary" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">현재 이용자</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {spaces.reduce((sum, space) => sum + space.currentOccupancy, 0)}
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
                    <p className="text-sm font-medium text-godding-text-secondary">전체 수용 인원</p>
                    <p className="text-2xl font-bold text-green-600">
                      {spaces.reduce((sum, space) => sum + space.capacity, 0)}
                    </p>
                  </div>
                  <UserGroupIcon className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Spaces List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {spaces.map((space) => {
              const beacon = getBeaconById(space.beaconId || '')
              const utilizationRate = (space.currentOccupancy / space.capacity) * 100
              
              return (
                <Card key={space.id} className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-godding-text-primary">{space.name}</CardTitle>
                        <CardDescription className="text-godding-text-secondary">
                          {space.type} | {space.description}
                        </CardDescription>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        utilizationRate > 80 ? 'bg-red-100 text-red-700' :
                        utilizationRate > 60 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {utilizationRate.toFixed(0)}% 이용률
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-godding-text-secondary">현재 이용자</p>
                        <p className="text-lg font-bold text-godding-text-primary">
                          {space.currentOccupancy} / {space.capacity}명
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-godding-text-secondary">운영 시간</p>
                        <p className="text-sm text-godding-text-primary">
                          {space.operatingHours.start} - {space.operatingHours.end}
                        </p>
                      </div>
                    </div>
                    
                    {beacon && (
                      <div className="p-3 bg-white/50 rounded-lg">
                        <p className="text-sm font-medium text-godding-text-secondary mb-1">연결된 비콘</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-godding-text-primary">{beacon.name}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            beacon.status === 'active' ? 'bg-green-100 text-green-700' :
                            beacon.status === 'low_battery' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {beacon.status === 'active' ? '정상' :
                             beacon.status === 'low_battery' ? '배터리 부족' : '오프라인'}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm font-medium text-godding-text-secondary mb-2">운영 규칙</p>
                      <div className="space-y-1">
                        {space.rules.map((rule, index) => (
                          <div key={index} className="text-xs text-godding-text-secondary flex items-center">
                            <CheckCircleIcon className="w-3 h-3 mr-1 text-green-500" />
                            {rule}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <EyeIcon className="w-4 h-4 mr-1" />
                        상세보기
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <PencilIcon className="w-4 h-4 mr-1" />
                        수정
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

  // Real-time Monitoring View
  if (currentStep === 'monitoring') {
    const spaceUsage = getSpaceUsage()
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep('spaces')}
                  className="flex items-center space-x-2"
                >
                  ← 이전 단계
                </Button>
                <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <EyeIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-godding-text-primary">실시간 모니터링</h1>
                  <p className="text-lg text-godding-text-secondary mt-2">
                    3단계: 실시간 공간 현황 및 학생 활동 모니터링
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep('alerts')}
                >
                  다음 단계: 알림 관리
                </Button>
              </div>
            </div>
          </div>

          {/* Real-time Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">현재 이용자</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {students.filter(s => s.currentSpace).length}
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
                    <p className="text-sm font-medium text-godding-text-secondary">활성 공간</p>
                    <p className="text-2xl font-bold text-green-600">
                      {spaces.filter(s => s.currentOccupancy > 0).length}
                    </p>
                  </div>
                  <BuildingOfficeIcon className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">평균 이용률</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {Math.round(spaceUsage.reduce((sum, usage) => sum + usage.utilizationRate, 0) / spaceUsage.length)}%
                    </p>
                  </div>
                  <ClockIcon className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">정상 비콘</p>
                    <p className="text-2xl font-bold text-green-600">
                      {beacons.filter(b => b.status === 'active').length}
                    </p>
                  </div>
                  <SignalIcon className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Students */}
          <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border mb-8">
            <CardHeader>
              <CardTitle className="text-godding-text-primary">현재 이용 중인 학생</CardTitle>
              <CardDescription className="text-godding-text-secondary">
                실시간으로 공간을 이용하고 있는 학생들의 현황입니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {students.filter(s => s.currentSpace).map((student) => {
                  const space = getSpaceById(student.currentSpace || '')
                  const checkInTime = new Date(student.checkInTime || '')
                  const currentTime = new Date()
                  const studyTime = Math.floor((currentTime.getTime() - checkInTime.getTime()) / (1000 * 60))
                  
                  return (
                    <div key={student.id} className="p-4 bg-white/50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-godding-text-primary">{student.name}</h4>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {student.grade}-{student.class}
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              {space?.name}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm text-godding-text-secondary">
                            <div>
                              <p><strong>학번:</strong> {student.studentNumber}</p>
                              <p><strong>입실 시간:</strong> {student.checkInTime}</p>
                            </div>
                            <div>
                              <p><strong>현재 공간:</strong> {space?.name}</p>
                              <p><strong>이용 시간:</strong> {studyTime}분</p>
                            </div>
                            <div>
                              <p><strong>총 학습 시간:</strong> {student.totalStudyTime}분</p>
                              <p><strong>마지막 활동:</strong> {student.lastActivity}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Space Utilization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {spaceUsage.map((usage) => {
              const space = getSpaceById(usage.spaceId)
              return (
                <Card key={usage.spaceId} className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
                  <CardHeader>
                    <CardTitle className="text-godding-text-primary">{usage.spaceName}</CardTitle>
                    <CardDescription className="text-godding-text-secondary">
                      실시간 이용 현황 및 통계
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-godding-text-secondary">이용률</span>
                      <span className="text-lg font-bold text-godding-text-primary">
                        {usage.utilizationRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          usage.utilizationRate > 80 ? 'bg-red-500' :
                          usage.utilizationRate > 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(usage.utilizationRate, 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-godding-text-secondary">현재 이용자</p>
                        <p className="font-bold text-godding-text-primary">{usage.currentStudents.length}명</p>
                      </div>
                      <div>
                        <p className="text-godding-text-secondary">수용 인원</p>
                        <p className="font-bold text-godding-text-primary">{space?.capacity}명</p>
                      </div>
                    </div>
                    
                    {usage.currentStudents.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-godding-text-secondary mb-2">현재 이용자 목록</p>
                        <div className="space-y-1">
                          {usage.currentStudents.map((student) => (
                            <div key={student.id} className="text-xs text-godding-text-secondary flex items-center justify-between">
                              <span>{student.name} ({student.grade}-{student.class})</span>
                              <span className="text-godding-text-primary">
                                {Math.floor((new Date().getTime() - new Date(student.checkInTime || '').getTime()) / (1000 * 60))}분
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Alerts Management View
  if (currentStep === 'alerts') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep('monitoring')}
                  className="flex items-center space-x-2"
                >
                  ← 이전 단계
                </Button>
                <div className="w-12 h-12 bg-godding-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <BellIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-godding-text-primary">알림 관리</h1>
                  <p className="text-lg text-godding-text-secondary mt-2">
                    4단계: 비콘 하드웨어 원격 모니터링 및 알림 관리
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Alert Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">전체 알림</p>
                    <p className="text-2xl font-bold text-godding-text-primary">{alerts.length}</p>
                  </div>
                  <BellIcon className="w-8 h-8 text-godding-primary" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">미해결</p>
                    <p className="text-2xl font-bold text-red-600">
                      {alerts.filter(a => !a.resolved).length}
                    </p>
                  </div>
                  <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">높은 우선순위</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length}
                    </p>
                  </div>
                  <ExclamationTriangleIcon className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-godding-text-secondary">해결됨</p>
                    <p className="text-2xl font-bold text-green-600">
                      {alerts.filter(a => a.resolved).length}
                    </p>
                  </div>
                  <CheckCircleIcon className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Alerts */}
          <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border mb-8">
            <CardHeader>
              <CardTitle className="text-godding-text-primary">활성 알림</CardTitle>
              <CardDescription className="text-godding-text-secondary">
                즉시 처리해야 할 비콘 관련 알림들입니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.filter(a => !a.resolved).map((alert) => {
                  const beacon = getBeaconById(alert.beaconId)
                  return (
                    <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                      alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                      alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                      alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-blue-50 border-blue-500'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-godding-text-primary">{alert.message}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                              alert.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                              alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {alert.severity === 'critical' ? '긴급' :
                               alert.severity === 'high' ? '높음' :
                               alert.severity === 'medium' ? '보통' : '낮음'}
                            </span>
                          </div>
                          <div className="text-sm text-godding-text-secondary">
                            <p><strong>관련 비콘:</strong> {beacon?.name}</p>
                            <p><strong>발생 시간:</strong> {alert.timestamp}</p>
                            <p><strong>알림 유형:</strong> {
                              alert.type === 'low_battery' ? '배터리 부족' :
                              alert.type === 'offline' ? '오프라인' :
                              alert.type === 'signal_weak' ? '신호 약함' : '점검 필요'
                            }</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            <CheckCircleIcon className="w-4 h-4 mr-1" />
                            해결
                          </Button>
                          <Button variant="outline" size="sm">
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Student App Simulation */}
          <Card className="bg-godding-card-bg backdrop-blur-sm border-godding-card-border">
            <CardHeader>
              <CardTitle className="text-godding-text-primary flex items-center space-x-2">
                <DevicePhoneMobileIcon className="w-5 h-5" />
                <span>학생용 앱 &apos;고딩픽&apos; 시뮬레이션</span>
              </CardTitle>
              <CardDescription className="text-godding-text-secondary">
                비콘 감지 시 학생이 경험하게 될 자동화된 상호작용을 시뮬레이션합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* App Flow Steps */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white/50 rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">1</span>
                      </div>
                      <h4 className="font-medium text-godding-text-primary">자동 감지</h4>
                    </div>
                    <p className="text-sm text-godding-text-secondary">
                      학생이 비콘 범위에 접근하면 앱이 자동으로 BLE 신호를 감지합니다.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-white/50 rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-green-600">2</span>
                      </div>
                      <h4 className="font-medium text-godding-text-primary">상황인지 알림</h4>
                    </div>
                    <p className="text-sm text-godding-text-secondary">
                      &quot;1정독실 근처에 계시네요. 입실할까요?&quot; 푸시 알림이 표시됩니다.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-white/50 rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-purple-600">3</span>
                      </div>
                      <h4 className="font-medium text-godding-text-primary">원탭 체크인</h4>
                    </div>
                    <p className="text-sm text-godding-text-secondary">
                      학생이 &apos;입실하기&apos; 버튼을 한 번만 눌러 입실 처리를 완료합니다.
                    </p>
                  </div>
                </div>

                {/* Grace Period Explanation */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-3 mb-2">
                    <ClockIcon className="w-5 h-5 text-yellow-600" />
                    <h4 className="font-medium text-yellow-800">Grace Period (유예 시간)</h4>
                  </div>
                  <p className="text-sm text-yellow-700">
                    학생이 비콘 신호 범위에서 벗어났을 때 바로 퇴실 처리하는 것이 아니라, 
                    3-5분의 유예 시간을 두어 일시적인 신호 유실로 인한 오퇴실을 방지합니다.
                  </p>
                </div>

                {/* Demo Buttons */}
                <div className="flex space-x-4">
                  <Button className="flex items-center space-x-2">
                    <SignalIcon className="w-4 h-4" />
                    <span>비콘 감지 시뮬레이션</span>
                  </Button>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <BellIcon className="w-4 h-4" />
                    <span>푸시 알림 테스트</span>
                  </Button>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <DevicePhoneMobileIcon className="w-4 h-4" />
                    <span>앱 UI 미리보기</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Default view - redirect to beacons
  return (
    <div className="min-h-screen bg-gradient-to-br from-godding-bg-primary to-godding-bg-secondary py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="w-20 h-20 bg-godding-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
          <SignalIcon className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-godding-text-primary mb-4">
          비콘 기반 공간 관리 시스템
        </h1>
        <p className="text-xl text-godding-text-secondary mb-8">
          4단계 프로세스로 체계적인 비콘 기반 공간 관리를 진행하세요
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-white/50 rounded-lg">
            <SignalIcon className="w-8 h-8 text-godding-primary mx-auto mb-2" />
            <h3 className="font-medium text-godding-text-primary">1. 비콘 등록</h3>
            <p className="text-sm text-godding-text-secondary">하드웨어 설정 및 공간 연결</p>
          </div>
          <div className="p-4 bg-white/50 rounded-lg">
            <BuildingOfficeIcon className="w-8 h-8 text-godding-primary mx-auto mb-2" />
            <h3 className="font-medium text-godding-text-primary">2. 공간 관리</h3>
            <p className="text-sm text-godding-text-secondary">학습 공간 설정 및 운영 규칙</p>
          </div>
          <div className="p-4 bg-white/50 rounded-lg">
            <EyeIcon className="w-8 h-8 text-godding-primary mx-auto mb-2" />
            <h3 className="font-medium text-godding-text-primary">3. 실시간 모니터링</h3>
            <p className="text-sm text-godding-text-secondary">현황 및 학생 활동 추적</p>
          </div>
          <div className="p-4 bg-white/50 rounded-lg">
            <BellIcon className="w-8 h-8 text-godding-primary mx-auto mb-2" />
            <h3 className="font-medium text-godding-text-primary">4. 알림 관리</h3>
            <p className="text-sm text-godding-text-secondary">비콘 상태 모니터링 및 알림</p>
          </div>
        </div>
        <Button 
          onClick={() => setCurrentStep('beacons')}
          size="lg"
          className="text-lg px-8 py-4"
        >
          시작하기
        </Button>
      </div>
    </div>
  )
}