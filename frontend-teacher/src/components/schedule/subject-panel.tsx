"use client";

import { useScheduleStore } from "@/store/schedule-store";
import SubjectCard from "./subject-card";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

export default function SubjectPanel() {
    const { subjects } = useScheduleStore();

    return (
        <div className="w-80 flex flex-col gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-200 h-full overflow-y-auto">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">과목 목록</h2>
                <button className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>

            <div className="flex flex-col gap-3">
                {subjects.map((subject) => (
                    <div key={subject.id} className="flex flex-col gap-1">
                        <SubjectCard subject={subject} />
                    </div>
                ))}
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-500 text-center border border-dashed border-gray-300">
                + 새 과목 추가하기
            </div>
        </div>
    );
}
