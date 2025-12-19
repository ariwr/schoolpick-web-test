"use client";

import { useScheduleStore } from "@/store/schedule-store";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function ConflictAlert() {
    const { conflicts } = useScheduleStore();
    const [shake, setShake] = useState(false);

    useEffect(() => {
        if (conflicts.length > 0) {
            setShake(true);
            const timer = setTimeout(() => setShake(false), 500);
            return () => clearTimeout(timer);
        }
    }, [conflicts.length]);

    if (conflicts.length === 0) return null;

    return (
        <div
            className={cn(
                "fixed bottom-8 right-8 z-50 bg-white border-l-4 border-red-500 shadow-xl rounded-lg p-4 max-w-sm transition-all duration-300 transform",
                shake ? "animate-bounce" : "translate-y-0"
            )}
        >
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900">
                        시간표 충돌 발생 ({conflicts.length}건)
                    </h3>
                    <div className="mt-2 text-sm text-gray-500 max-h-32 overflow-y-auto">
                        <ul className="list-disc pl-5 space-y-1">
                            {conflicts.map((conflict) => (
                                <li key={conflict.id} className="text-red-600">
                                    {conflict.message}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
