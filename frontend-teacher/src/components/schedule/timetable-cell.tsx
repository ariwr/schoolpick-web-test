"use client";

import { useDroppable } from "@dnd-kit/core";
import { ClassBlock, Conflict, DayOfWeek, Period } from "@/types/schedule";
import { cn } from "@/lib/utils";
import { useScheduleStore } from "@/store/schedule-store";
import { XMarkIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import AssignedBlock from "./assigned-block";

interface TimetableCellProps {
    cellId: string;
    day: DayOfWeek;
    period: Period;
    blocks: ClassBlock[];
    conflicts: Conflict[];
    onClick?: () => void;
    context?: Record<string, any>;
}

export default function TimetableCell({ cellId, day, period, blocks, conflicts, onClick, context }: TimetableCellProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: cellId,
        data: { day, period, type: "cell", cellId, ...context },
    });

    const { removeBlock, subjects } = useScheduleStore();

    const hasConflict = conflicts.some(c => c.blockIds.some(id => blocks.map(b => b.id).includes(id)));

    // If there are multiple blocks, stack them? Or just show the first one?
    // The plan discussed "Conflicts" when putting 4 math classes in one slot.
    // So we should verify we can render multiple.

    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            className={cn(
                "relative h-24 border border-gray-200 rounded-md transition-all duration-200 flex flex-col gap-1 p-1 overflow-y-auto cursor-pointer hover:ring-1 hover:ring-blue-300",
                isOver ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200" : "bg-white",
                hasConflict ? "bg-red-50 border-red-300 ring-2 ring-red-200 animate-pulse" : "" // Simple pulse for conflict
            )}
        >
            {blocks.map((block) => (
                <AssignedBlock
                    key={block.id}
                    block={block}
                    hasConflict={conflicts.some(c => c.blockIds.includes(block.id))}
                />
            ))}

            {hasConflict && (
                <div className="absolute top-0 right-0 p-1">
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                </div>
            )}

            {blocks.length === 0 && !isOver && (
                <div className="flex-1 flex items-center justify-center text-gray-300 text-xs text-center pointer-events-none">
                    {/* Empty placeholder */}
                </div>
            )}
        </div>
    );
}
