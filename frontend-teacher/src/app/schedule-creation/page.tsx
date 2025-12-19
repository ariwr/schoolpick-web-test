"use client";

import DndProviderWrapper from "@/components/schedule/dnd-provider-wrapper";
import SubjectPanel from "@/components/schedule/subject-panel";
import TimetableGrid from "@/components/schedule/timetable-grid";
import ConflictAlert from "@/components/schedule/conflict-alert";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ScheduleCreationPage() {
    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
            {/* Header for this feature */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">시간표 생성 (베타)</h1>
                        <p className="text-sm text-gray-500">교육과정-시간표 스마트 배정 시스템</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">저장하기</Button>
                    <Button>게시하기</Button>
                </div>
            </div>

            {/* Main Content */}
            <DndProviderWrapper>
                <div className="flex flex-1 p-6 gap-6 overflow-hidden">
                    {/* Left Panel */}
                    <div className="flex-shrink-0">
                        <SubjectPanel />
                    </div>

                    {/* Right Panel (Grid) */}
                    <div className="flex-1 overflow-auto">
                        <TimetableGrid />
                    </div>
                </div>

                <ConflictAlert />
            </DndProviderWrapper>
        </div>
    );
}
