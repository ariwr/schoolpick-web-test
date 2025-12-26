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

import { MOCK_TEACHERS } from "@/data/mock-data";

export default function AssignedBlock({ block, hasConflict }: AssignedBlockProps) {
    const { subjects, removeBlock } = useScheduleStore();
    const subject = subjects.find((s) => s.id === block.subjectId);
    const teacher = MOCK_TEACHERS.find(t => t.id === block.teacherId);

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
                "relative group text-xs p-1.5 rounded border shadow-sm flex flex-col gap-0.5 justify-start cursor-grab active:cursor-grabbing",
                subject.color,
                hasConflict ? "border-red-400 ring-1 ring-red-400" : "border-transparent",
                isDragging ? "opacity-30" : "hover:shadow-md"
            )}
        >
            {/* Teacher Name */}
            <span className="font-bold text-gray-900 truncate">
                {teacher?.name || "미배정"}
            </span>

            {/* Subject and Block Tag */}
            <div className="flex items-center gap-1 text-[10px] text-gray-600">
                <span className="truncate">{subject.name}</span>
                {block.blockGroup && (
                    <span className="font-mono bg-black/10 px-1 rounded text-[9px]">
                        {block.blockGroup}
                    </span>
                )}
            </div>

            {/* Custom Popover for Creative Activities */}
            {subject.category === '창체' && (
                <div onPointerDown={(e) => e.stopPropagation()} className="mt-1">
                    <ChangChePopover block={block} />
                </div>
            )}

            {/* Delete Button */}
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
