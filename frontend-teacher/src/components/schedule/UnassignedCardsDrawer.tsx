"use client";

import { useDraggable } from "@dnd-kit/core";
import { useScheduleStore } from "@/store/schedule-store";
import { UnassignedCard } from "@/types/schedule";
import { cn } from "@/lib/utils";
import { GripVerticalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";

interface UnassignedCardsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

function UnassignedCardItem({ card }: { card: UnassignedCard }) {
    const { subjects } = useScheduleStore();
    const subject = subjects.find((s) => s.id === card.subjectId);

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `unassigned-${card.id}`,
        data: { type: "unassigned-card", card, subject },
    });

    if (!subject) return null;

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "relative group p-3 rounded-lg border shadow-sm transition-all cursor-grab active:cursor-grabbing",
                subject.color,
                isDragging ? "opacity-30" : "hover:shadow-md"
            )}
        >
            <div className="flex items-start gap-2">
                <GripVerticalIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                        <Badge variant="outline" className="px-1.5 py-0 h-5 text-[10px] bg-white border-gray-300 text-gray-700">
                            {card.grade}-{card.classNum}
                        </Badge>
                        <span className="text-[10px] text-gray-500">
                            {card.credits}학점
                        </span>
                    </div>
                    <div className="font-bold text-sm text-gray-900 truncate">
                        {subject.name}
                    </div>
                    {card.slicingOption && (
                        <div className="mt-1">
                            <Badge variant="secondary" className="text-[10px] px-1 h-4 bg-gray-100 text-gray-500">
                                {card.slicingOption} 분할
                            </Badge>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function UnassignedCardsDrawer({
    isOpen,
    onClose,
}: UnassignedCardsDrawerProps) {
    const { unassignedCards, subjects } = useScheduleStore();
    const [filterCategory, setFilterCategory] = useState<string | null>(null);

    // 카테고리별 필터링
    const filteredCards = filterCategory
        ? unassignedCards.filter((card) => {
            const subject = subjects.find((s) => s.id === card.subjectId);
            return subject?.category === filterCategory;
        })
        : unassignedCards;

    // 고유 카테고리 목록
    const categories = Array.from(
        new Set(
            unassignedCards
                .map((card) => subjects.find((s) => s.id === card.subjectId)?.category)
                .filter(Boolean)
        )
    );

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="left" className="w-80 sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="text-xl font-bold">
                        미배정 수업 카드
                    </SheetTitle>
                    <SheetDescription>
                        아래 카드를 드래그하여 시간표에 배치하세요
                    </SheetDescription>
                </SheetHeader>

                {/* 진행률 표시 */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm">배치 진행률</h3>
                        <Badge variant="outline">
                            {unassignedCards.length > 0
                                ? `${Math.round(((useScheduleStore.getState().blocks.length / (unassignedCards.length + useScheduleStore.getState().blocks.length)) * 100))}% 완료`
                                : "100% 완료"
                            }
                        </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                        배치됨: {useScheduleStore.getState().blocks.length} / 전체: {unassignedCards.length + useScheduleStore.getState().blocks.length}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{
                                width: `${unassignedCards.length > 0
                                    ? Math.round(((useScheduleStore.getState().blocks.length / (unassignedCards.length + useScheduleStore.getState().blocks.length)) * 100))
                                    : 100}%`
                            }}
                        />
                    </div>
                </div>

                {/* 필터 버튼 */}
                <div className="mt-6 mb-4">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilterCategory(null)}
                            className={cn(
                                "px-3 py-1 text-xs rounded-full transition-all",
                                filterCategory === null
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                        >
                            전체 ({unassignedCards.length})
                        </button>
                        {categories.map((category) => {
                            const count = unassignedCards.filter((card) => {
                                const subject = subjects.find((s) => s.id === card.subjectId);
                                return subject?.category === category;
                            }).length;

                            return (
                                <button
                                    key={category}
                                    onClick={() => setFilterCategory(category as string)}
                                    className={cn(
                                        "px-3 py-1 text-xs rounded-full transition-all",
                                        filterCategory === category
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    )}
                                >
                                    {category} ({count})
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 카드 리스트 */}
                <div className="space-y-3 pb-6">
                    {filteredCards.length > 0 ? (
                        filteredCards.map((card) => (
                            <UnassignedCardItem key={card.id} card={card} />
                        ))
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            <p className="text-sm">
                                {filterCategory
                                    ? `${filterCategory} 카테고리에 미배정 카드가 없습니다`
                                    : "모든 카드가 배정되었습니다"}
                            </p>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
