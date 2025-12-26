import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    SchoolBasicInfo,
    DepartmentInfo,
    SubjectInfo,
    TimeOffSlot,
    BlockGroupDefinition,
    UnassignedCard
} from '@/types/schedule';
import { useScheduleStore } from './schedule-store';

interface WizardState {
    // 현재 단계
    currentStep: number;

    // Step 1: 기본 정보
    schoolBasicInfo: SchoolBasicInfo | null;

    // Step 2: 교사/부서
    departments: DepartmentInfo[];

    // Step 3: 교육과정 설계 (과목 시수 + 슬라이싱 + 특별실)
    subjects: SubjectInfo[];

    // Step 4: 제약 조건
    teacherTimeOffs: {
        teacherId: string;
        slots: TimeOffSlot[];
    }[];
    blockGroups: BlockGroupDefinition[];

    // 완료 상태
    wizardCompleted: boolean;

    // 액션
    setCurrentStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;

    setSchoolBasicInfo: (info: SchoolBasicInfo) => void;

    addDepartment: (dept: DepartmentInfo) => void;
    updateDepartment: (id: string, dept: Partial<DepartmentInfo>) => void;
    removeDepartment: (id: string) => void;

    setSubjects: (subjects: SubjectInfo[]) => void;
    addSubject: (subject: SubjectInfo) => void;
    updateSubject: (id: string, subject: Partial<SubjectInfo>) => void;
    removeSubject: (id: string) => void;

    addTeacherTimeOff: (teacherId: string, slot: TimeOffSlot) => void;
    removeTeacherTimeOff: (teacherId: string, slotIndex: number) => void;

    addBlockGroup: (group: BlockGroupDefinition) => void;
    removeBlockGroup: (id: string) => void;

    generateUnassignedCards: () => void; // Step 5에서 호출
    completeWizard: () => void;
    resetWizard: () => void;
}

export const useWizardStore = create<WizardState>()(
    persist(
        (set, get) => ({
            currentStep: 1,
            schoolBasicInfo: null,
            departments: [],
            subjects: [],
            teacherTimeOffs: [],
            blockGroups: [],
            wizardCompleted: false,

            setCurrentStep: (step) => set({ currentStep: step }),
            nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 5) })),
            prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),

            setSchoolBasicInfo: (info) => set({ schoolBasicInfo: info }),

            addDepartment: (dept) => set((state) => ({
                departments: [...state.departments, dept]
            })),

            updateDepartment: (id, updates) => set((state) => ({
                departments: state.departments.map(d => d.id === id ? { ...d, ...updates } : d)
            })),

            removeDepartment: (id) => set((state) => ({
                departments: state.departments.filter(d => d.id !== id)
            })),

            setSubjects: (subjects) => set({ subjects }),
            addSubject: (subject) => set((state) => ({ subjects: [...state.subjects, subject] })),
            updateSubject: (id, updates) => set((state) => ({
                subjects: state.subjects.map(s => s.id === id ? { ...s, ...updates } : s)
            })),
            removeSubject: (id) => set((state) => ({ subjects: state.subjects.filter(s => s.id !== id) })),

            addTeacherTimeOff: (teacherId, slot) => set((state) => {
                const existing = state.teacherTimeOffs.find(t => t.teacherId === teacherId);
                if (existing) {
                    return {
                        teacherTimeOffs: state.teacherTimeOffs.map(t =>
                            t.teacherId === teacherId ? { ...t, slots: [...t.slots, slot] } : t
                        )
                    };
                }
                return { teacherTimeOffs: [...state.teacherTimeOffs, { teacherId, slots: [slot] }] };
            }),

            removeTeacherTimeOff: (teacherId, slotIndex) => set((state) => ({
                teacherTimeOffs: state.teacherTimeOffs.map(t =>
                    t.teacherId === teacherId
                        ? { ...t, slots: t.slots.filter((_, i) => i !== slotIndex) }
                        : t
                )
            })),

            addBlockGroup: (group) => set((state) => ({ blockGroups: [...state.blockGroups, group] })),
            removeBlockGroup: (id) => set((state) => ({ blockGroups: state.blockGroups.filter(g => g.id !== id) })),

            generateUnassignedCards: () => {
                const state = get();
                const { schoolBasicInfo, subjects } = state;

                if (!schoolBasicInfo) return;

                const cards: UnassignedCard[] = [];

                // 각 과목에 대해
                subjects.forEach(subject => {
                    // 각 학년에 대해
                    subject.gradeCredits.forEach(({ grade, credits }) => {
                        if (credits === 0) return; // 해당 학년에 배정되지 않음

                        // 해당 학년의 반 수 확인
                        const gradeInfo = schoolBasicInfo.grades.find(g => g.grade === grade);
                        if (!gradeInfo) return;

                        // 슬라이싱 옵션에 따라 카드 생성
                        let cardCredits: number[] = [];
                        if (credits === 4 && subject.slicingOption) {
                            if (subject.slicingOption === '2+2') {
                                cardCredits = [2, 2];
                            } else if (subject.slicingOption === '3+1') {
                                cardCredits = [3, 1];
                            } else {
                                cardCredits = [4];
                            }
                        } else {
                            cardCredits = [credits];
                        }

                        // 각 반마다 카드 생성
                        for (let classNum = 1; classNum <= gradeInfo.classCount; classNum++) {
                            cardCredits.forEach((credit, index) => {
                                cards.push({
                                    id: `${subject.id}-${grade}-${classNum}-${index}-${Date.now()}`,
                                    subjectId: subject.id,
                                    credits: credit,
                                    slicingOption: subject.slicingOption,
                                    originalSubjectId: subject.id,
                                    grade: grade, // 🆕
                                    classNum: classNum, // 🆕
                                });
                            });
                        }
                    });
                });

                // schedule-store에 카드 추가
                useScheduleStore.getState().setUnassignedCards(cards);
            },

            completeWizard: () => set({ wizardCompleted: true }),
            resetWizard: () => set({
                currentStep: 1,
                schoolBasicInfo: null,
                departments: [],
                subjects: [],
                teacherTimeOffs: [],
                blockGroups: [],
                wizardCompleted: false
            })
        }),
        {
            name: 'wizard-storage'
        }
    )
);
