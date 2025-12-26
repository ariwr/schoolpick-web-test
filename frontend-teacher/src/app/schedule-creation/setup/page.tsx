"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { useWizardStore } from "@/store/wizard-store";
import { SchoolBasicInfoStep } from "@/components/schedule/wizard/SchoolBasicInfoStep";
import { DepartmentTeachersStep } from "@/components/schedule/wizard/DepartmentTeachersStep";
import { CurriculumDesignStep } from "@/components/schedule/wizard/CurriculumDesignStep";
import { ConstraintsStep } from "@/components/schedule/wizard/ConstraintsStep";
import { ReviewAndGenerateStep } from "@/components/schedule/wizard/ReviewAndGenerateStep";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";

const STEPS = [
    { number: 1, title: "학교 기본 정보", component: SchoolBasicInfoStep },
    { number: 2, title: "교과군 및 교사", component: DepartmentTeachersStep },
    { number: 3, title: "교육과정 설계", component: CurriculumDesignStep },
    { number: 4, title: "제약 조건", component: ConstraintsStep },
    { number: 5, title: "검토 및 생성", component: ReviewAndGenerateStep },
];

export default function SchoolDataWizardPage() {
    const { currentStep, setCurrentStep, resetWizard, loadFromBackend } = useWizardStore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isEditMode = searchParams.get('mode') === 'edit';
    const [isLoading, setIsLoading] = React.useState(true);

    // Auth Check & Reset Logic
    React.useEffect(() => {
        const initWizard = async () => {
            // 1. Auth Check - 엄격 모드로 복구
            if (!isAuthenticated()) {
                alert("로그인이 필요한 서비스입니다.");
                router.push("/login"); // 메인 또는 로그인 페이지로 이동
                return;
            }

            // 2. Wizard Reset Logic
            try {
                if (isEditMode) {
                    await loadFromBackend();
                } else {
                    // Check if data exists? Or just reset.
                    // If user explicitly wants NEW wizard, reset.
                    resetWizard();
                }
            } catch (error) {
                console.error("Failed to load/reset wizard:", error);
                // Optionally show error toast
            } finally {
                setIsLoading(false);
            }
        };

        initWizard();
    }, [isEditMode, resetWizard, loadFromBackend, router]);

    const handleStepClick = (stepNumber: number) => {
        if (stepNumber === currentStep) return;

        // 미래 단계로 이동 불가능
        if (stepNumber > currentStep) return;

        // 이전 단계로 이동 시 확인
        if (stepNumber < currentStep) {
            if (window.confirm("이전 단계로 돌아가시겠습니까?\n저장되지 않은 내용은 사라질 수 있습니다.")) {
                setCurrentStep(stepNumber);
            }
        }
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    const CurrentStepComponent = STEPS[currentStep - 1]?.component || SchoolBasicInfoStep;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-5xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900">
                        {isEditMode ? "학교 데이터 수정" : "학교 정보 설정"}
                    </h1>
                    <p className="text-gray-600 mt-2">
                        {isEditMode
                            ? "기존에 입력된 학교 정보를 수정합니다"
                            : "시간표 생성을 위한 학교 기본 정보를 단계별로 입력하세요"}
                    </p>
                </div>

                {/* Stepper */}
                <div className="mb-8 max-w-4xl mx-auto">
                    <div className="flex items-center justify-between">
                        {STEPS.map((step, index) => {
                            const isClickable = step.number < currentStep;
                            const isCurrent = step.number === currentStep;

                            return (
                                <div key={step.number} className="flex items-center flex-1 select-none">
                                    <div
                                        className={`flex flex-col items-center ${isClickable ? 'cursor-pointer' : isCurrent ? 'cursor-default' : 'cursor-not-allowed opacity-50'}`}
                                        onClick={() => handleStepClick(step.number)}
                                    >
                                        <div
                                            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${currentStep > step.number
                                                ? 'bg-green-500 border-green-500'
                                                : currentStep === step.number
                                                    ? 'bg-blue-500 border-blue-500'
                                                    : 'bg-white border-gray-300'
                                                }`}
                                        >
                                            {currentStep > step.number ? (
                                                <CheckCircle2 className="w-6 h-6 text-white" />
                                            ) : (
                                                <span
                                                    className={`text-sm font-semibold ${currentStep === step.number ? 'text-white' : 'text-gray-500'
                                                        }`}
                                                >
                                                    {step.number}
                                                </span>
                                            )}
                                        </div>
                                        <span
                                            className={`mt-2 text-xs font-medium ${currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'
                                                }`}
                                        >
                                            {step.title}
                                        </span>
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div
                                            className={`flex-1 h-0.5 mx-2 ${currentStep > step.number ? 'bg-green-500' : 'bg-gray-300'
                                                }`}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Current Step Content */}
                <Card className="p-8">
                    <CurrentStepComponent />
                </Card>

                {/* Footer */}
                <div className="mt-6 text-center text-sm text-gray-500">
                    <p>Step {currentStep} / {STEPS.length}</p>
                </div>
            </div>
        </div>
    );
}
