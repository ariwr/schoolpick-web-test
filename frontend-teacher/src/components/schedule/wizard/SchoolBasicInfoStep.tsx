"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import { useWizardStore } from "@/store/wizard-store";
import { TagInput } from "@/components/ui/tag-input";

export function SchoolBasicInfoStep() {
    const { schoolBasicInfo, setSchoolBasicInfo, nextStep } = useWizardStore();

    const [schoolName, setSchoolName] = useState(schoolBasicInfo?.schoolName || "고딩픽 고등학교");
    const [grades, setGrades] = useState(schoolBasicInfo?.grades || [
        { grade: 1, classCount: 10 },
        { grade: 2, classCount: 10 },
        { grade: 3, classCount: 10 },
    ]);
    const [periodsPerDay, setPeriodsPerDay] = useState(schoolBasicInfo?.periodsPerDay || 7);
    const [daysPerWeek, setDaysPerWeek] = useState(schoolBasicInfo?.daysPerWeek || 5);
    const [lunchPeriod, setLunchPeriod] = useState(schoolBasicInfo?.lunchPeriod || 4);

    const [facilities, setFacilities] = useState<string[]>(schoolBasicInfo?.facilities || []);

    const handleNext = () => {
        setSchoolBasicInfo({
            schoolName,
            totalGrades: grades.length,
            periodsPerDay,
            daysPerWeek,
            lunchPeriod,
            grades,
            facilities
        });
        nextStep();
    };

    const updateClassCount = (grade: number, classCount: number) => {
        setGrades(grades.map(g => g.grade === grade ? { ...g, classCount } : g));
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Step 1: 학교 기본 정보</h2>
                <p className="text-gray-500 mt-1">학년별 반 수와 특별실 정보를 입력해주세요.</p>
            </div>

            {/* <Card>
                <CardHeader>
                    <CardTitle>기본 설정</CardTitle>
                    <CardDescription>학교 이름 및 시간표 기본 설정을 입력하세요</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>학교 이름</Label>
                            <Input 
                                value={schoolName} 
                                onChange={(e) => setSchoolName(e.target.value)} 
                                placeholder="예: 고딩픽 고등학교"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>하루 교시 수</Label>
                            <Input 
                                type="number" 
                                value={periodsPerDay} 
                                onChange={(e) => setPeriodsPerDay(parseInt(e.target.value) || 7)} 
                                min={4} max={12}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label>주당 수업 일수</Label>
                            <Input 
                                type="number" 
                                value={daysPerWeek} 
                                onChange={(e) => setDaysPerWeek(parseInt(e.target.value) || 5)} 
                                min={1} max={7}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label>점심 시간 (교시 후)</Label>
                            <Input 
                                type="number" 
                                value={lunchPeriod} 
                                onChange={(e) => setLunchPeriod(parseInt(e.target.value) || 4)} 
                                min={1} max={periodsPerDay}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card> */}

            <Card>
                <CardHeader>
                    <CardTitle>학년별 반 수</CardTitle>
                    <CardDescription>각 학년의 반 개수를 입력하세요</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {grades.map(({ grade, classCount }) => (
                        <div key={grade} className="flex items-center gap-4">
                            <Label className="w-20">{grade}학년</Label>
                            <Input
                                type="number"
                                min={1}
                                max={20}
                                value={classCount}
                                onChange={(e) => updateClassCount(grade, parseInt(e.target.value) || 1)}
                                className="w-32"
                            />
                            <span className="text-sm text-gray-500">개 반</span>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>특별실 목록</CardTitle>
                    <CardDescription>
                        특별실 이름을 입력하고 Enter를 누르세요 (예: 음악실, 미술실, 과학실1)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TagInput
                        value={facilities}
                        onChange={setFacilities}
                        placeholder="특별실 이름 입력 후 Enter"
                    />
                </CardContent>
            </Card>

            <div className="flex justify-between">
                <Button variant="outline" disabled>
                    이전
                </Button>
                <Button onClick={handleNext}>
                    다음 단계
                </Button>
            </div>
        </div>
    );
}
