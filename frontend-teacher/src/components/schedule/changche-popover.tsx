"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { UserCircleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useScheduleStore } from "@/store/schedule-store";
import { ClassBlock, Teacher } from "@/types/schedule";
import { cn } from "@/lib/utils";

interface ChangChePopoverProps {
    block: ClassBlock;
}

export default function ChangChePopover({ block }: ChangChePopoverProps) {
    const { teachers, blocks, assignTeacherToBlock } = useScheduleStore();

    const assignedTeacher = teachers.find((t) => t.id === block.teacherId);

    // Filter available teachers
    // A teacher is available if they are NOT assigned to another block at THIS same time
    const availableTeachers = teachers.filter((teacher) => {
        const isBusy = blocks.some(
            (b) =>
                b.day === block.day &&
                b.period === block.period &&
                b.teacherId === teacher.id &&
                b.id !== block.id // Ignore self
        );
        return !isBusy;
    });

    // Sort: Assigned first, then by name
    const sortedTeachers = [...availableTeachers].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <Popover className="relative">
            <PopoverButton className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-indigo-600 focus:outline-none">
                {assignedTeacher ? (
                    <span className="text-indigo-600 font-bold">{assignedTeacher.name}</span>
                ) : (
                    <span className="text-gray-400 italic">교사 배정</span>
                )}
                <UserCircleIcon className="w-3 h-3" />
            </PopoverButton>

            <PopoverPanel className="absolute z-50 w-64 p-2 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 left-0 transform translate-x-[-10%] sm:left-auto sm:translate-x-0">
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    <h3 className="text-xs font-bold text-gray-500 px-2 pb-1 border-b">
                        가용 교사 ({sortedTeachers.length}명)
                    </h3>
                    {sortedTeachers.map((teacher) => (
                        <button
                            key={teacher.id}
                            onClick={() => assignTeacherToBlock(block.id, teacher.id)}
                            className={cn(
                                "flex items-center justify-between p-2 rounded text-sm text-left transition-colors",
                                assignedTeacher?.id === teacher.id
                                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                                    : "hover:bg-gray-50 text-gray-700"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <span>{teacher.name}</span>
                                <span className="text-xs text-gray-400">({teacher.subjectId})</span>
                            </div>
                            {assignedTeacher?.id === teacher.id && (
                                <CheckCircleIcon className="w-4 h-4 text-indigo-600" />
                            )}
                        </button>
                    ))}
                    {sortedTeachers.length === 0 && (
                        <div className="p-2 text-xs text-gray-400 text-center">
                            가능한 교사가 없습니다.
                        </div>
                    )}
                </div>
            </PopoverPanel>
        </Popover>
    );
}
