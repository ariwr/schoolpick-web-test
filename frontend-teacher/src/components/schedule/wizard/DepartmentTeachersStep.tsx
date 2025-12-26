"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2 } from "lucide-react";
import { useWizardStore } from "@/store/wizard-store";
import { TeacherTagInput } from "@/components/ui/teacher-tag-input";
import { DepartmentInfo, Teacher } from "@/types/schedule";

const DEPARTMENT_CATEGORIES = [
    { value: "국어", label: "국어" },
    { value: "수학", label: "수학" },
    { value: "영어", label: "영어" },
    { value: "탐구", label: "탐구" },
    { value: "체육예술", label: "체육/예술" },
    { value: "생활교양", label: "생활/교양" },
    { value: "전문교과", label: "전문교과" },
    { value: "창체", label: "창체" },
] as const;

export function DepartmentTeachersStep() {
    const { departments, addDepartment, updateDepartment, removeDepartment, schoolBasicInfo, nextStep, prevStep } = useWizardStore();

    const [newDeptName, setNewDeptName] = useState("");
    const [newDeptCategory, setNewDeptCategory] = useState<string>("국어");
    const [newDeptTeacherCount, setNewDeptTeacherCount] = useState(3);
    const [newDeptDefaultHours, setNewDeptDefaultHours] = useState(16);

    // 학년별 반 목록 생성 (TeacherTagInput에서 사용)
    const availableClasses = schoolBasicInfo?.grades.flatMap(({ grade, classCount }) =>
        Array.from({ length: classCount }, (_, i) => `${grade}-${i + 1}`)
    ) || [];

    const handleAddDepartment = () => {
        console.log('🔍 handleAddDepartment called');
        console.log('📝 newDeptName:', newDeptName);
        console.log('📝 newDeptName.trim():', newDeptName.trim());

        if (!newDeptName.trim()) {
            console.log('❌ Department name is empty, returning');
            return;
        }

        const newDept: DepartmentInfo = {
            id: `dept-${Date.now()}`,
            name: newDeptName.trim(),
            category: newDeptCategory as any,
            teacherCount: newDeptTeacherCount,
            teachers: [],
            defaultHours: newDeptDefaultHours,
        };

        console.log('✅ Adding department:', newDept);
        addDepartment(newDept);
        console.log('📊 Current departments count:', departments.length + 1);

        setNewDeptName("");
        setNewDeptTeacherCount(3);
        setNewDeptDefaultHours(16);
    };

    const handleUpdateTeachers = (deptId: string, teachers: Teacher[]) => {
        updateDepartment(deptId, { teachers });
    };

    const handleNext = () => {
        nextStep();
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Step 2: 교과군 및 교사 정보</h2>
                <p className="text-gray-500 mt-1">교과군을 추가하고 소속 교사 정보를 입력해주세요.</p>
            </div>

            {/* 교과군 추가 폼 */}
            <Card>
                <CardHeader>
                    <CardTitle>교과군 추가</CardTitle>
                    <CardDescription>새로운 교과군을 추가하세요</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>교과군 이름</Label>
                            <Input
                                placeholder="예: 국어과"
                                value={newDeptName}
                                onChange={(e) => setNewDeptName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>카테고리</Label>
                            <select
                                className="w-full px-3 py-2 border rounded-md"
                                value={newDeptCategory}
                                onChange={(e) => setNewDeptCategory(e.target.value)}
                            >
                                {DEPARTMENT_CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>교사 인원</Label>
                            <Input
                                type="number"
                                min={1}
                                max={20}
                                value={newDeptTeacherCount}
                                onChange={(e) => setNewDeptTeacherCount(parseInt(e.target.value) || 1)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>기준 시수</Label>
                            <Input
                                type="number"
                                min={1}
                                max={30}
                                value={newDeptDefaultHours}
                                onChange={(e) => setNewDeptDefaultHours(parseInt(e.target.value) || 16)}
                            />
                        </div>
                    </div>
                    <Button onClick={handleAddDepartment} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        교과군 추가
                    </Button>
                </CardContent>
            </Card>

            {/* 교과군 목록 */}
            {departments.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>교과군 목록</CardTitle>
                        <CardDescription>{departments.length}개 교과군이 등록되었습니다</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {departments.map((dept) => (
                                <AccordionItem key={dept.id} value={dept.id}>
                                    <AccordionTrigger>
                                        <div className="flex items-center justify-between w-full pr-4">
                                            <span className="font-medium">{dept.name}</span>
                                            <span className="text-sm text-gray-500">
                                                {dept.teachers.length}/{dept.teacherCount}명
                                            </span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-4 pt-4">
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <div>
                                                    <span className="text-gray-500">카테고리:</span> {dept.category}
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">기준 시수:</span> {dept.defaultHours}시간
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">인원:</span> {dept.teacherCount}명
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>교사 명단 (이름 입력 후 Enter, 태그 클릭하여 역할 설정)</Label>
                                                <TeacherTagInput
                                                    value={dept.teachers}
                                                    onChange={(teachers) => handleUpdateTeachers(dept.id, teachers)}
                                                    placeholder="교사 이름 입력"
                                                    maxTags={dept.teacherCount}
                                                    availableClasses={availableClasses}
                                                    departmentId={dept.id}
                                                />
                                            </div>

                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => removeDepartment(dept.id)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                교과군 삭제
                                            </Button>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                    이전
                </Button>
                <Button onClick={handleNext} disabled={departments.length === 0}>
                    다음 단계
                </Button>
            </div>
        </div>
    );
}
