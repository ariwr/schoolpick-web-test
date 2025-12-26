"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useScheduleStore } from "@/store/schedule-store";
import { useState } from "react";

export function AutoAssignButton() {
    const { autoScheduleUnassigned } = useScheduleStore();
    const [isLoading, setIsLoading] = useState(false);

    const handleAutoAssign = async () => {
        if (!confirm("현재 미배정된 모든 카드를 자동으로 배치하시겠습니까?\n(기존 배정된 시간표는 유지됩니다)")) {
            return;
        }

        setIsLoading(true);
        try {
            const success = await autoScheduleUnassigned();
            if (success) {
                alert("자동 배정이 완료되었습니다!");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            onClick={handleAutoAssign}
            variant="outline"
            className="gap-2"
            disabled={isLoading}
        >
            <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? "배정 중..." : "AI 자동 배정"}
        </Button>
    );
}
