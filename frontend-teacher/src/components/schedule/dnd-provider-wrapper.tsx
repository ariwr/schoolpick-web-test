"use client";

import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
    DragStartEvent,
    DragEndEvent,
    closestCenter,
    rectIntersection,
    defaultDropAnimationSideEffects,
    DragOverlayProps,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";
import { useScheduleStore } from "@/store/schedule-store";
import SubjectCard from "./subject-card";
import { Subject } from "@/types/schedule";

interface DndProviderWrapperProps {
    children: React.ReactNode;
}

const dropAnimation: DragOverlayProps['dropAnimation'] = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};

export default function DndProviderWrapper({ children }: DndProviderWrapperProps) {
    const { addBlock, moveBlock } = useScheduleStore();
    const [activeSubject, setActiveSubject] = useState<Subject | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Avoid accidental drags
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const type = active.data.current?.type;

        if (type === "subject") {
            setActiveSubject(active.data.current?.subject);
        } else if (type === "block") {
            // If we are dragging an already assigned block
            setActiveSubject(active.data.current?.subject);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveSubject(null);

        if (!over) return;

        // Check if dropped on a cell
        if (over.data.current?.type === "cell") {
            const { day, period } = over.data.current;

            // Case 1: Dragging from Subject List (New Block)
            if (active.data.current?.type === "subject") {
                const subjectId = active.data.current?.subject.id;
                addBlock(subjectId, day, period);
            }

            // Case 2: Dragging existing Block (Move)
            else if (active.data.current?.type === "block") {
                const blockId = active.data.current?.block.id;
                moveBlock(blockId, day, period);
            }
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {children}
            <DragOverlay dropAnimation={dropAnimation}>
                {activeSubject ? (
                    <div className="w-[150px]">
                        <SubjectCard subject={activeSubject} isOverlay />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
