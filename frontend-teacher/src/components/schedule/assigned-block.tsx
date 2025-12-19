"use client";

import { useDraggable } from "@dnd-kit/core";
import { ClassBlock } from "@/types/schedule";
import { useScheduleStore } from "@/store/schedule-store";
import { cn } from "@/lib/utils";
import { XMarkIcon } from "@heroicons/react/24/outline";
import ChangChePopover from "./changche-popover";

interface AssignedBlockProps {
    block: ClassBlock;
    hasConflict?: boolean;
}

export default function AssignedBlock({ block, hasConflict }: AssignedBlockProps) {
    const { subjects, removeBlock } = useScheduleStore();
    const subject = subjects.find((s) => s.id === block.subjectId);

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `block-${block.id}`,
        data: { type: "block", block, subject }, // Pass subject for overlay rendering
    });

    if (!subject) return null;

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "relative group text-xs p-1.5 rounded border shadow-sm flex justify-between items-center cursor-grab active:cursor-grabbing",
                subject.color,
                hasConflict ? "border-red-400 ring-1 ring-red-400" : "border-transparent",
                isDragging ? "opacity-30" : "hover:shadow-md"
            )}
        >
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-medium truncate">{subject.name}</span>
                {subject.category === '창체' && (
                    <div onPointerDown={(e) => e.stopPropagation()}>
                        <ChangChePopover block={block} />
                    </div>
                )}
            </div>
            <button
                type="button"
                onPointerDown={(e) => {
                    e.stopPropagation(); // Prevent drag start when clicking delete
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    removeBlock(block.id);
                }}
                className="text-gray-500 hover:text-red-900 bg-white/50 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <XMarkIcon className="w-3 h-3" />
            </button>
        </div>
    );
}
