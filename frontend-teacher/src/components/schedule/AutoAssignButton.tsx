"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function AutoAssignButton() {
    const handleAutoAssign = () => {
        // TODO: Phase 2+ - OR-Tools 백엔드 연동
        alert("Auto 편성 기능은 백엔드 연동 후 구현됩니다.");
    };

    return (
        <Button onClick={handleAutoAssign} variant="outline" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Auto 편성 (AI Solver)
        </Button>
    );
}
