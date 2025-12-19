"use client";

import { useScheduleStore } from "@/store/schedule-store";
import { DayOfWeek, Period } from "@/types/schedule";
import TimetableCell from "./timetable-cell";

const DAYS: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI"];
const PERIODS: Period[] = [1, 2, 3, 4, 5, 6, 7];

const DAY_LABELS = {
    "MON": "월",
    "TUE": "화",
    "WED": "수",
    "THU": "목",
    "FRI": "금",
};

export default function TimetableGrid() {
    const { blocks, conflicts } = useScheduleStore();

    return (
        <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <div className="min-w-[600px] grid grid-cols-[50px_repeat(5,1fr)] gap-2">
                {/* Header Row */}
                <div className="col-start-2 col-span-5 grid grid-cols-5 gap-2 mb-2">
                    {DAYS.map((day) => (
                        <div key={day} className="text-center font-bold text-gray-700 py-2 bg-gray-50 rounded-lg">
                            {DAY_LABELS[day]}
                        </div>
                    ))}
                </div>

                {/* Grid Body */}
                {PERIODS.map((period) => (
                    <>
                        {/* Period Label */}
                        <div className="flex items-center justify-center font-semibold text-gray-500">
                            {period}교시
                        </div>

                        {/* Cells for this period */}
                        {DAYS.map((day) => {
                            const cellBlocks = blocks.filter(b => b.day === day && b.period === period);

                            // Find conflicts for this cell
                            const cellConflicts = conflicts.filter(c =>
                                c.blockIds.some(id => cellBlocks.map(b => b.id).includes(id))
                            );

                            return (
                                <TimetableCell
                                    key={`${day}-${period}`}
                                    day={day}
                                    period={period}
                                    blocks={cellBlocks}
                                    conflicts={cellConflicts}
                                />
                            );
                        })}
                    </>
                ))}
            </div>
        </div>
    );
}
