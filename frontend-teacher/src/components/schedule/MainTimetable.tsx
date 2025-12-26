"use client";

import { useState, useEffect } from "react";
import { ViewMode, DayOfWeek, Period, ClassBlock, Teacher } from "@/types/schedule";
import { useScheduleStore } from "@/store/schedule-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, FunnelIcon, Bars3Icon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import TimetableCell from "./timetable-cell";
import ResourceDashboard from "./ResourceDashboard";
import UnassignedCardsList from "./UnassignedCardsList";
import { AutoAssignButton } from "./AutoAssignButton";
import { MOCK_TEACHERS } from "@/data/mock-data";

// Mock Data for visualization
const MOCK_CLASSES = [
    { grade: 1, classNum: 1 }, { grade: 1, classNum: 2 }, { grade: 1, classNum: 3 },
    { grade: 2, classNum: 1 }, { grade: 2, classNum: 2 }, { grade: 2, classNum: 3 },
    { grade: 3, classNum: 1 }, { grade: 3, classNum: 2 }, { grade: 3, classNum: 3 },
];

// Note: MOCK_TEACHERS imported from @/data/mock-data

const PERIODS: Period[] = [1, 2, 3, 4, 5, 6, 7];
const DAYS: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI"];
const DAY_LABELS: Record<DayOfWeek, string> = {
    "MON": "월요일", "TUE": "화요일", "WED": "수요일", "THU": "목요일", "FRI": "금요일"
};

export default function MainTimetable() {
    const { blocks, conflicts, teachers, fetchSchoolData } = useScheduleStore();
    const [viewMode, setViewMode] = useState<ViewMode>("CLASS");
    const [selectedDay, setSelectedDay] = useState<DayOfWeek>("MON");
    const [selectedCell, setSelectedCell] = useState<{ day: string, period: number, target: string } | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        fetchSchoolData();
    }, [fetchSchoolData]);

    function handleDayChange(delta: number) {
        const currentIndex = DAYS.indexOf(selectedDay);
        const nextIndex = (currentIndex + delta + DAYS.length) % DAYS.length;
        setSelectedDay(DAYS[nextIndex]);
    }

    function renderRows() {
        if (viewMode === "CLASS") {
            return MOCK_CLASSES.map((cls) => (
                <div key={`${cls.grade}-${cls.classNum}`} className="grid grid-cols-[120px_repeat(7,1fr)] hover:bg-gray-50 transition-colors">
                    {/* Row Header */}
                    <div className="sticky left-0 bg-white p-3 border-r border-gray-200 flex flex-col items-center justify-center font-bold text-gray-700 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <span>{cls.grade}-{cls.classNum}</span>
                        {/* Optional: Show Homeroom Teacher */}
                        <span className="text-xs text-gray-400 font-normal">담임</span>
                    </div>

                    {/* Cells */}
                    {PERIODS.map((period) => {
                        const cellId = `cell-${cls.grade}-${cls.classNum}-${selectedDay}-${period}`;
                        const cellBlocks = blocks.filter(b =>
                            b.day === selectedDay &&
                            b.period === period &&
                            b.grade === cls.grade &&
                            b.classNum === cls.classNum
                        );
                        // Find conflicts
                        const cellConflicts = conflicts.filter(c =>
                            c.blockIds.some(id => cellBlocks.map(b => b.id).includes(id))
                        );

                        return (
                            <div key={period} className="relative min-h-[100px] border-r border-gray-100 p-1 last:border-r-0 group">
                                <TimetableCell
                                    cellId={cellId}
                                    day={selectedDay}
                                    period={period}
                                    blocks={cellBlocks}
                                    conflicts={cellConflicts}
                                    context={{ grade: cls.grade, classNum: cls.classNum }}
                                    onClick={() => setSelectedCell({
                                        day: DAY_LABELS[selectedDay],
                                        period,
                                        target: `${cls.grade}학년 ${cls.classNum}반`
                                    })}
                                />
                            </div>
                        );
                    })}
                </div>
            ));
        }
        else if (viewMode === "TEACHER") {
            return teachers.map((teacher) => (
                <div key={teacher.id} className="grid grid-cols-[120px_repeat(7,1fr)] hover:bg-gray-50 transition-colors">
                    {/* Row Header */}
                    <div className="sticky left-0 bg-white p-3 border-r border-gray-200 flex flex-col items-center justify-center font-bold text-gray-700 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <span>{teacher.name}</span>
                        <span className="text-xs text-blue-500 font-normal">{teacher.subjectId}</span>
                    </div>

                    {/* Cells */}
                    {PERIODS.map((period) => {
                        const cellId = `cell-${teacher.id}-${selectedDay}-${period}`;
                        // In Teacher View, we want to see what this teacher is teaching at this time
                        const cellBlocks = blocks.filter(b =>
                            b.day === selectedDay &&
                            b.period === period &&
                            b.teacherId === teacher.id
                        );
                        const cellConflicts = conflicts.filter(c =>
                            c.blockIds.some(id => cellBlocks.map(b => b.id).includes(id))
                        );

                        return (
                            <div key={period} className="relative min-h-[80px] border-r border-gray-100 p-1 last:border-r-0">
                                <TimetableCell
                                    cellId={cellId}
                                    day={selectedDay}
                                    period={period}
                                    blocks={cellBlocks}
                                    conflicts={cellConflicts}
                                    context={{ teacherId: teacher.id }}
                                    onClick={() => setSelectedCell({
                                        day: DAY_LABELS[selectedDay],
                                        period,
                                        target: `${teacher.name} 선생님`
                                    })}
                                />
                            </div>
                        );
                    })}
                </div>
            ));
        }
        return <div className="p-8 text-center text-gray-400">준비 중인 뷰 모드입니다.</div>;
    }

    return (
        <>
            <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                {/* Top Toolbar */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant={drawerOpen ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setDrawerOpen(!drawerOpen)}
                            className="gap-2"
                        >
                            <Bars3Icon className="w-4 h-4" />
                            {drawerOpen ? "미배정 닫기" : "미배정 카드"}
                        </Button>
                        <h2 className="text-lg font-bold text-gray-800">전체 시간표 관리</h2>

                        {/* 설정 수정 버튼 */}
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => window.location.href = '/schedule-creation/setup?mode=edit'}
                            title="학교 데이터 수정"
                            className="bg-godding-primary hover:bg-godding-primary-dark text-white gap-2 font-bold px-4 shadow-sm"
                        >
                            <Cog6ToothIcon className="w-4 h-4" />
                            학교 데이터 수정
                        </Button>

                        {/* View Mode Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {(["CLASS", "TEACHER", "BLOCK"] as ViewMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={cn(
                                        "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                        viewMode === mode
                                            ? "bg-white text-godding-primary shadow-sm"
                                            : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    {mode === "CLASS" && "반별 보기"}
                                    {mode === "TEACHER" && "교사별 보기"}
                                    {mode === "BLOCK" && "블록 보기"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        {/* Day Selector */}
                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 px-2 py-1">
                            <Button variant="ghost" size="sm" onClick={() => handleDayChange(-1)} className="h-8 w-8 p-0">
                                <ChevronLeftIcon className="w-4 h-4" />
                            </Button>
                            <span className="min-w-[80px] text-center font-semibold text-gray-700">
                                {DAY_LABELS[selectedDay]}
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => handleDayChange(1)} className="h-8 w-8 p-0">
                                <ChevronRightIcon className="w-4 h-4" />
                            </Button>
                        </div>

                        <Button variant="outline" size="sm" className="gap-2">
                            <FunnelIcon className="w-4 h-4" />
                            필터
                        </Button>
                    </div>
                </div>

                {/* Content Area (Sidebar + Grid) */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Persistent Sidebar for Unassigned Cards */}
                    <div
                        className={cn(
                            "border-r border-gray-200 bg-white transition-all duration-300 ease-in-out overflow-hidden flex flex-col",
                            drawerOpen ? "w-80 opacity-100" : "w-0 opacity-0"
                        )}
                    >
                        <div className="w-80 h-full overflow-hidden">
                            <UnassignedCardsList />
                        </div>
                    </div>

                    {/* Main Grid Area */}
                    <div className="flex-1 overflow-auto bg-gray-50/50 p-4 relative">
                        <div className="bg-white rounded-lg shadow border border-gray-200 min-w-[1000px]">
                            {/* Grid Header (Periods) */}
                            <div className="sticky top-0 z-20 grid grid-cols-[120px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50 shadow-sm">
                                <div className="p-3 text-center text-sm font-bold text-gray-500 border-r border-gray-200">
                                    {viewMode === "CLASS" ? "학년/반" : "교사명"}
                                </div>
                                {PERIODS.map((p) => (
                                    <div key={p} className="p-3 text-center text-sm font-bold text-gray-600 border-r border-gray-100 last:border-r-0">
                                        {p}교시
                                    </div>
                                ))}
                            </div>

                            {/* Grid Rows */}
                            <div className="divide-y divide-gray-100">
                                {renderRows()}
                            </div>
                        </div>

                        {/* Resource Dashboard Overlay */}
                        {selectedCell && (
                            <div className="absolute top-0 right-0 h-full z-30 shadow-2xl">
                                <ResourceDashboard
                                    day={selectedCell.day}
                                    period={selectedCell.period}
                                    targetName={selectedCell.target}
                                    onClose={() => setSelectedCell(null)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
