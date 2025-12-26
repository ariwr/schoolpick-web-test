"use client";

import { useDraggable } from "@dnd-kit/core";
import { useScheduleStore } from "@/store/schedule-store";
import { UnassignedCard } from "@/types/schedule";
import { cn } from "@/lib/utils";
import { GripVerticalIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UnassignedCardItemProps {
    card: UnassignedCard;
    isOverlay?: boolean;
}

export default function UnassignedCardItem({ card, isOverlay }: UnassignedCardItemProps) {
    const { subjects } = useScheduleStore();
    const subject = subjects.find((s) => s.id === card.subjectId);

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `unassigned-${card.id}`,
        data: { type: "unassigned-card", card, subject },
    });

    if (!subject) return null;

    return (
        <div
            ref={!isOverlay ? setNodeRef : undefined} // Only set ref if not overlay (overlay uses its own ref in DndContext)
            {...(!isOverlay ? listeners : {})}
            {...(!isOverlay ? attributes : {})}
            className={cn(
                "relative group p-3 rounded-lg border shadow-sm transition-all cursor-grab active:cursor-grabbing bg-white",
                subject.color,
                isDragging ? "opacity-30" : "hover:shadow-md",
                isOverlay ? "shadow-xl cursor-grabbing scale-105 opacity-100 z-50" : ""
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
