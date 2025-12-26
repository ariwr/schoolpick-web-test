"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useWizardStore } from "@/store/wizard-store";
import { BlockGroupDefinition, DayOfWeek, Period, TimeOffSlot } from "@/types/schedule";

const DAYS: { value: DayOfWeek; label: string }[] = [
    { value: "MON", label: "월요일" },
    { value: "TUE", label: "화요일" },
    { value: "WED", label: "수요일" },
    { value: "THU", label: "목요일" },
    { value: "FRI", label: "금요일" },
];

const PERIODS: Period[] = [1, 2, 3, 4, 5, 6, 7];

export function ConstraintsStep() {
    const {
        departments,
        schoolBasicInfo,
        teacherTimeOffs,
        blockGroups,
        addTeacherTimeOff,
        removeTeacherTimeOff,
        addBlockGroup,
        removeBlockGroup,
        nextStep,
        prevStep
    } = useWizardStore();

    const [selectedTeacherId, setSelectedTeacherId] = useState("");
    const [selectedDay, setSelectedDay] = useState<DayOfWeek>("MON");
    const [selectedPeriod, setSelectedPeriod] = useState<Period>(1);
    const [timeOffReason, setTimeOffReason] = useState("");

    const [blockGroupName, setBlockGroupName] = useState("");
    const [blockGroupGrades, setBlockGroupGrades] = useState<number[]>([]);

    // 모든 교사 목록
    const allTeachers = departments.flatMap(dept => dept.teachers);

    const handleAddTimeOff = () => {
        if (!selectedTeacherId) return;

        const slot: TimeOffSlot = {
            day: selectedDay,
            period: selectedPeriod,
            reason: timeOffReason || undefined,
        };

        addTeacherTimeOff(selectedTeacherId, slot);
        setTimeOffReason("");
    };

    const handleRemoveTimeOff = (teacherId: string, slotIndex: number) => {
        removeTeacherTimeOff(teacherId, slotIndex);
    };

    const handleAddBlockGroup = () => {
        if (!blockGroupName.trim() || blockGroupGrades.length === 0) return;

        const group: BlockGroupDefinition = {
            id: `block-${Date.now()}`,
            name: blockGroupName.trim(),
            targetGrades: blockGroupGrades,
        };

        addBlockGroup(group);
        setBlockGroupName("");
        setBlockGroupGrades([]);
    };

    const toggleGrade = (grade: number) => {
        setBlockGroupGrades(prev =>
            prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
        );
    };

    const getTeacherName = (teacherId: string) => {
        return allTeachers.find(t => t.id === teacherId)?.name || teacherId;
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Step 4: 제약 조건 설정</h2>
                <p className="text-gray-500 mt-1">교사별 수업 불가 시간과 블록 그룹을 설정하세요.</p>
            </div>

            {/* 교사 수업 불가 시간 */}
            <Card>
                <CardHeader>
                    <CardTitle>교사 수업 불가 시간 (Time-off)</CardTitle>
                    <CardDescription>
                        특정 교사가 수업할 수 없는 시간을 설정하세요 (예: 육아 시간, 행정 업무)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>교사 선택</Label>
                            <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="교사 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allTeachers.map(teacher => (
                                        <SelectItem key={teacher.id} value={teacher.id}>
                                            {teacher.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>요일</Label>
                            <Select value={selectedDay} onValueChange={(v) => setSelectedDay(v as DayOfWeek)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DAYS.map(day => (
                                        <SelectItem key={day.value} value={day.value}>
                                            {day.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>교시</Label>
                            <Select value={selectedPeriod.toString()} onValueChange={(v) => setSelectedPeriod(parseInt(v) as Period)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PERIODS.map(period => (
                                        <SelectItem key={period} value={period.toString()}>
                                            {period}교시
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>사유 (선택)</Label>
                            <Input
                                placeholder="예: 육아 시간"
                                value={timeOffReason}
                                onChange={(e) => setTimeOffReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <Button onClick={handleAddTimeOff} disabled={!selectedTeacherId}>
                        <Plus className="w-4 h-4 mr-2" />
                        Time-off 추가
                    </Button>

                    {/* Time-off 목록 */}
                    {teacherTimeOffs.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <Label>등록된 Time-off</Label>
                            <div className="space-y-2">
                                {teacherTimeOffs.map((timeOff, index) => (
                                    <div key={index} className="space-y-1">
                                        <div className="font-medium">{getTeacherName(timeOff.teacherId)}</div>
                                        {timeOff.slots.map((slot, slotIndex) => (
                                            <div key={slotIndex} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                                <span className="text-sm">
                                                    {DAYS.find(d => d.value === slot.day)?.label} {slot.period}교시
                                                    {slot.reason && ` - ${slot.reason}`}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveTimeOff(timeOff.teacherId, slotIndex)}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 블록 그룹 정의 */}
            <Card>
                <CardHeader>
                    <CardTitle>블록 그룹 정의</CardTitle>
                    <CardDescription>
                        이동 수업을 위한 타임 블록 그룹을 정의하세요 (예: A타임, B타임)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>블록 그룹 이름</Label>
                            <Input
                                placeholder="예: A"
                                value={blockGroupName}
                                onChange={(e) => setBlockGroupName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>대상 학년</Label>
                            <div className="flex gap-2 items-center h-10">
                                {schoolBasicInfo?.grades.map(({ grade }) => (
                                    <button
                                        key={grade}
                                        type="button"
                                        onClick={() => toggleGrade(grade)}
                                        className={`px-4 py-2 rounded border ${blockGroupGrades.includes(grade)
                                                ? 'bg-blue-500 text-white border-blue-500'
                                                : 'bg-white text-gray-700 border-gray-300'
                                            }`}
                                    >
                                        {grade}학년
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <Button onClick={handleAddBlockGroup} disabled={!blockGroupName.trim() || blockGroupGrades.length === 0}>
                        <Plus className="w-4 h-4 mr-2" />
                        블록 그룹 추가
                    </Button>

                    {/* 블록 그룹 목록 */}
                    {blockGroups.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <Label>등록된 블록 그룹</Label>
                            <div className="space-y-2">
                                {blockGroups.map((group) => (
                                    <div key={group.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                                        <div>
                                            <span className="font-medium">{group.name} 타임</span>
                                            <span className="text-sm text-gray-500 ml-2">
                                                ({group.targetGrades.map(g => `${g}학년`).join(', ')})
                                            </span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeBlockGroup(group.id)}
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                    이전
                </Button>
                <Button onClick={nextStep}>
                    다음 단계
                </Button>
            </div>
        </div>
    );
}
