"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { useWizardStore } from "@/store/wizard-store";

export function ReviewAndGenerateStep() {
    const router = useRouter();
    const {
        schoolBasicInfo,
        departments,
        subjects,
        teacherTimeOffs,
        blockGroups,
        generateUnassignedCards,
        completeWizard,
        prevStep
    } = useWizardStore();

    const handleGenerate = () => {
        // 미배정 카드 생성
        generateUnassignedCards();

        // 마법사 완료 표시
        completeWizard();

        // 메인 시간표 페이지로 이동
        router.push('/schedule-creation');
    };

    const totalClasses = schoolBasicInfo?.grades.reduce((sum, g) => sum + g.classCount, 0) || 0;
    const totalTeachers = departments.reduce((sum, d) => sum + d.teachers.length, 0);
    const totalSubjects = subjects.length;
    const totalTimeOffs = teacherTimeOffs.reduce((sum, t) => sum + t.slots.length, 0);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Step 5: 검토 및 생성</h2>
                <p className="text-gray-500 mt-1">입력한 정보를 확인하고 수업 카드를 생성하세요.</p>
            </div>

            {/* 요약 정보 */}
            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">학교 기본 정보</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600">전체 학년:</span>
                            <span className="font-medium">{schoolBasicInfo?.grades.length || 0}개</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">전체 반:</span>
                            <span className="font-medium">{totalClasses}개</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">특별실:</span>
                            <span className="font-medium">{schoolBasicInfo?.facilities.length || 0}개</span>
                        </div>
                        {schoolBasicInfo?.facilities && schoolBasicInfo.facilities.length > 0 && (
                            <div className="text-sm text-gray-500 mt-2">
                                {schoolBasicInfo.facilities.join(', ')}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">교사 및 교과군</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600">교과군:</span>
                            <span className="font-medium">{departments.length}개</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">전체 교사:</span>
                            <span className="font-medium">{totalTeachers}명</span>
                        </div>
                        {departments.length > 0 && (
                            <div className="text-sm text-gray-500 mt-2">
                                {departments.map(d => `${d.name}(${d.teachers.length}명)`).join(', ')}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">교육과정</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600">전체 과목:</span>
                            <span className="font-medium">{totalSubjects}개</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">슬라이싱 과목:</span>
                            <span className="font-medium">
                                {subjects.filter(s => s.slicingOption).length}개
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">특별실 필수 과목:</span>
                            <span className="font-medium">
                                {subjects.filter(s => s.requiredRoom).length}개
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">제약 조건</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Time-off:</span>
                            <span className="font-medium">{totalTimeOffs}개</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">블록 그룹:</span>
                            <span className="font-medium">{blockGroups.length}개</span>
                        </div>
                        {blockGroups.length > 0 && (
                            <div className="text-sm text-gray-500 mt-2">
                                {blockGroups.map(bg => `${bg.name} 타임`).join(', ')}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 생성 안내 */}
            <Card className="border-green-200 bg-green-50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                        <CardTitle className="text-lg text-green-900">준비 완료!</CardTitle>
                    </div>
                    <CardDescription className="text-green-700">
                        모든 정보가 입력되었습니다. 아래 버튼을 클릭하면 수업 카드가 자동으로 생성됩니다.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm text-green-800">
                        <p>✓ 학년별, 반별로 필요한 모든 수업 카드가 생성됩니다</p>
                        <p>✓ 슬라이싱 옵션에 따라 카드가 분할됩니다 (2+2, 3+1, 4)</p>
                        <p>✓ 생성된 카드는 "미배정 카드 보관함"에 저장됩니다</p>
                        <p>✓ 드래그앤드롭으로 시간표에 배치할 수 있습니다</p>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                    이전
                </Button>
                <Button onClick={handleGenerate} size="lg" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    수업 카드 생성 및 완료
                </Button>
            </div>
        </div>
    );
}
