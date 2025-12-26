"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useWizardStore } from "@/store/wizard-store";
import { SubjectInfo } from "@/types/schedule";

export function CurriculumDesignStep() {
    const { subjects, addSubject, removeSubject, updateSubject, departments, schoolBasicInfo, nextStep, prevStep } = useWizardStore();

    const [newSubjectName, setNewSubjectName] = useState("");
    const [newSubjectCategory, setNewSubjectCategory] = useState("");

    const facilities = schoolBasicInfo?.facilities || [];
    const grades = schoolBasicInfo?.grades || [];

    const handleAddSubject = () => {
        if (!newSubjectName.trim() || !newSubjectCategory) return;

        const newSubject: SubjectInfo = {
            id: `subject-${Date.now()}`,
            name: newSubjectName.trim(),
            category: newSubjectCategory,
            gradeCredits: grades.map(({ grade }) => ({ grade, credits: 0 })),
            slicingOption: undefined,
            requiredRoom: undefined,
        };

        addSubject(newSubject);
        setNewSubjectName("");
    };

    const handleUpdateCredits = (subjectId: string, grade: number, credits: number) => {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;

        const updatedGradeCredits = subject.gradeCredits.map(gc =>
            gc.grade === grade ? { ...gc, credits } : gc
        );

        updateSubject(subjectId, { gradeCredits: updatedGradeCredits });
    };

    const handleUpdateSlicing = (subjectId: string, slicingOption: '2+2' | '3+1' | '4' | '') => {
        updateSubject(subjectId, {
            slicingOption: slicingOption || undefined
        });
    };

    const handleUpdateRoom = (subjectId: string, requiredRoom: string) => {
        updateSubject(subjectId, {
            requiredRoom: requiredRoom || undefined
        });
    };

    const getTotalCredits = (subjectId: string): number => {
        const subject = subjects.find(s => s.id === subjectId);
        return subject?.gradeCredits.reduce((sum, gc) => sum + gc.credits, 0) || 0;
    };

    const has4Credits = (subjectId: string): boolean => {
        const subject = subjects.find(s => s.id === subjectId);
        return subject?.gradeCredits.some(gc => gc.credits === 4) || false;
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Step 3: 교육과정 설계</h2>
                <p className="text-gray-500 mt-1">과목별 시수, 슬라이싱 옵션, 특별실 매핑을 설정하세요.</p>
            </div>

            {/* 과목 추가 폼 */}
            <Card>
                <CardHeader>
                    <CardTitle>과목 추가</CardTitle>
                    <CardDescription>새로운 과목을 추가하세요</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>과목명</Label>
                            <Input
                                placeholder="예: 국어Ⅰ"
                                value={newSubjectName}
                                onChange={(e) => setNewSubjectName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>교과군</Label>
                            <select
                                className="w-full px-3 py-2 border rounded-md"
                                value={newSubjectCategory}
                                onChange={(e) => setNewSubjectCategory(e.target.value)}
                            >
                                <option value="">선택하세요</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.category}>{dept.category}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <Button onClick={handleAddSubject} className="w-full">
                                <Plus className="w-4 h-4 mr-2" />
                                과목 추가
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 과목 목록 테이블 */}
            {subjects.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>과목 목록</CardTitle>
                        <CardDescription>{subjects.length}개 과목이 등록되었습니다</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[150px]">과목명</TableHead>
                                        <TableHead className="w-[100px]">카테고리</TableHead>
                                        {grades.map(({ grade }) => (
                                            <TableHead key={grade} className="w-[80px] text-center">
                                                {grade}학년
                                            </TableHead>
                                        ))}
                                        <TableHead className="w-[120px]">슬라이싱</TableHead>
                                        <TableHead className="w-[120px]">특별실</TableHead>
                                        <TableHead className="w-[80px]">삭제</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {subjects.map((subject) => (
                                        <TableRow key={subject.id}>
                                            <TableCell className="font-medium">{subject.name}</TableCell>
                                            <TableCell>{subject.category}</TableCell>
                                            {grades.map(({ grade }) => {
                                                const gc = subject.gradeCredits.find(g => g.grade === grade);
                                                return (
                                                    <TableCell key={grade}>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={8}
                                                            value={gc?.credits || 0}
                                                            onChange={(e) => handleUpdateCredits(subject.id, grade, parseInt(e.target.value) || 0)}
                                                            className="w-16 text-center"
                                                        />
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell>
                                                <select
                                                    className="w-full px-2 py-1 border rounded text-sm"
                                                    value={subject.slicingOption || ''}
                                                    onChange={(e) => handleUpdateSlicing(subject.id, e.target.value as any)}
                                                    disabled={!has4Credits(subject.id)}
                                                >
                                                    <option value="">없음</option>
                                                    <option value="2+2">2+2</option>
                                                    <option value="3+1">3+1</option>
                                                    <option value="4">4</option>
                                                </select>
                                            </TableCell>
                                            <TableCell>
                                                <select
                                                    className="w-full px-2 py-1 border rounded text-sm"
                                                    value={subject.requiredRoom || ''}
                                                    onChange={(e) => handleUpdateRoom(subject.id, e.target.value)}
                                                >
                                                    <option value="">없음</option>
                                                    {facilities.map(facility => (
                                                        <option key={facility} value={facility}>{facility}</option>
                                                    ))}
                                                </select>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeSubject(subject.id)}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                    이전
                </Button>
                <Button onClick={nextStep} disabled={subjects.length === 0}>
                    다음 단계
                </Button>
            </div>
        </div>
    );
}
