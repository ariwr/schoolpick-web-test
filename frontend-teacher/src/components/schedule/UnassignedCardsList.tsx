"use client";

import { useDraggable } from "@dnd-kit/core";
import { useScheduleStore } from "@/store/schedule-store";
import { UnassignedCard } from "@/types/schedule";
import { cn } from "@/lib/utils";
import { GripVerticalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

import UnassignedCardItem from "./unassigned-card-item";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@heroicons/react/24/outline";

export default function UnassignedCardsList() {
    const { unassignedCards, subjects, createUnassignedCard } = useScheduleStore();
    const [filterCategory, setFilterCategory] = useState<string | null>(null);

    const handleAddMockCards = () => {
        // Test Data: 3 cards
        // Ensure subjects exist or fallback to known IDs (sub-1, sub-2 from store init)
        // If subjects are empty, we might need to rely on store having default subjects.
        // Assuming 'sub-1' (Korean) and 'sub-2' (Math) exist from mock init.

        createUnassignedCard('sub-1', 4, 1, 1); // 1-1 Korean
        createUnassignedCard('sub-2', 4, 1, 2); // 1-2 Math
        createUnassignedCard('sub-1', 3, 2, 1); // 2-1 Korean
    };

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
        <div className="h-full flex flex-col">
            <div className="p-4 pb-0 flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-bold">미배정 수업 카드</h3>
                    <p className="text-sm text-gray-500">카드를 드래그하여 배치하세요</p>
                </div>
                {/* Test Button - Only show if empty? Or always for now */}
                {unassignedCards.length === 0 && (
                    <Button variant="outline" size="xs" onClick={handleAddMockCards} title="테스트용 카드 3개 추가">
                        <PlusIcon className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* 진행률 표시 */}
            <div className="px-4 mt-6">
                <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm">배치 진행률</h3>
                        <Badge variant="outline">
                            {unassignedCards.length > 0
                                ? `${Math.round(((useScheduleStore.getState().blocks.length / (unassignedCards.length + useScheduleStore.getState().blocks.length)) * 100))}% 완료`
                                : "100% 완료"
                            }
                        </Badge>
                    </div>
                    {/* <div className="text-sm text-gray-500 mb-2">
                        배치됨: {useScheduleStore.getState().blocks.length} / 전체: {unassignedCards.length + useScheduleStore.getState().blocks.length}
                    </div> */}
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
            </div>

            {/* 필터 버튼 */}
            <div className="px-4 mt-6 mb-4">
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
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
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
        </div>
    );
}
