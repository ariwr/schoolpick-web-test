"use client";

import { useDraggable } from "@dnd-kit/core";
import { Subject } from "@/types/schedule";
import { cn } from "@/lib/utils";

interface SubjectCardProps {
    subject: Subject;
    isOverlay?: boolean;
}

export default function SubjectCard({ subject, isOverlay }: SubjectCardProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `subject-${subject.id}`,
        data: { type: "subject", subject },
    });

    if (isOverlay) {
        return (
            <div
                className={cn(
                    "w-full p-3 rounded-lg shadow-xl cursor-grabbing transform scale-105 border-2",
                    subject.color,
                    "border-indigo-500 opacity-90 z-50 text-center font-bold"
                )}
            >
                {subject.name}
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
                "w-full p-3 rounded-lg border cursor-grab transition-all duration-200",
                subject.color,
                isDragging ? "opacity-30" : "hover:shadow-md hover:scale-[1.02]",
                "flex justify-between items-center"
            )}
        >
            <span className="font-semibold text-gray-800">{subject.name}</span>
            <span className="text-xs text-gray-600 bg-white/50 px-2 py-1 rounded-full">
                {subject.requiredHours}시간
            </span>
        </div>
    );
}
