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
import { Subject, UnassignedCard } from "@/types/schedule";
import UnassignedCardItem from "./unassigned-card-item";

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
    const [activeUnassignedCard, setActiveUnassignedCard] = useState<UnassignedCard | null>(null);

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
            setActiveUnassignedCard(null);
        } else if (type === "block") {
            // If we are dragging an already assigned block
            setActiveSubject(active.data.current?.subject);
            setActiveUnassignedCard(null);
        } else if (type === "unassigned-card") {
            setActiveUnassignedCard(active.data.current?.card);
            setActiveSubject(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveSubject(null);
        setActiveUnassignedCard(null);

        if (!over) return;

        // Check if dropped on a cell
        if (over.data.current?.type === "cell") {
            const { day, period, grade, classNum } = over.data.current;

            // Only allow drop if we have target class info
            if (!grade || !classNum) return;

            // Case 1: Dragging from Subject List (New Block) - Legacy or Quick Add
            if (active.data.current?.type === "subject") {
                const subjectId = active.data.current?.subject.id;
                addBlock(subjectId, day, period, grade, classNum);
            }

            // Case 2: Dragging existing Block (Move)
            else if (active.data.current?.type === "block") {
                const blockId = active.data.current?.block.id;
                moveBlock(blockId, day, period, grade, classNum);
            }

            // Case 3: Dragging Unassigned Card (Assign)
            else if (active.data.current?.type === "unassigned-card") {
                const card = active.data.current?.card;
                // Validate if dropping to correct class (Optional but recommended)
                if (card.grade === grade && card.classNum === classNum) {
                    useScheduleStore.getState().assignCardToSlot(card.id, day, period, grade, classNum);
                } else {
                    // Alert user or just fail silently?
                    // Ideally show visual feedback, but for now strict check.
                    // Or maybe allow it if user wants to change schedule class? 
                    // Usually safer to restrict self-drop.
                    alert("해당 학급의 수업 카드만 배정할 수 있습니다.");
                    console.warn(`Mismatch: Card(G${card.grade}-C${card.classNum}) -> Cell(G${grade}-C${classNum})`);
                }
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
                ) : activeUnassignedCard ? (
                    <div className="w-[200px]">
                        <UnassignedCardItem card={activeUnassignedCard} isOverlay />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
