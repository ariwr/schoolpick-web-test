import { create } from 'zustand';
import { ClassBlock, Conflict, DayOfWeek, Period, Subject, Teacher, UnassignedCard } from '../types/schedule';
import { MOCK_TEACHERS } from "@/data/mock-data";

interface ScheduleState {
    subjects: Subject[];
    teachers: Teacher[];
    blocks: ClassBlock[]; // Flat list of all assigned blocks
    conflicts: Conflict[];
    unassignedCards: UnassignedCard[]; // 미배정 카드 리스트

    // Actions
    addSubject: (subject: Subject) => void;
    removeSubject: (id: string) => void;
    addTeacher: (teacher: Teacher) => void;

    // DnD Actions
    addBlock: (subjectId: string, day: DayOfWeek, period: Period, grade: number, classNum: number) => void;
    moveBlock: (blockId: string, toDay: DayOfWeek, toPeriod: Period, grade: number, classNum: number) => void;
    removeBlock: (blockId: string) => void;
    assignTeacherToBlock: (blockId: string, teacherId: string) => void;

    // Validation
    validateSchedule: () => void;

    // API Actions
    fetchSchoolData: () => Promise<void>;

    // Unassigned Cards Actions
    createUnassignedCard: (subjectId: string, credits: number, grade: number, classNum: number, slicingOption?: '2+2' | '3+1' | '4') => void;
    assignCardToSlot: (cardId: string, day: DayOfWeek, period: Period, grade: number, classNum: number) => void;
    returnCardToUnassigned: (blockId: string) => void;
    setUnassignedCards: (cards: UnassignedCard[]) => void; // wizard-store에서 사용
}

// Temporary ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useScheduleStore = create<ScheduleState>((set, get) => ({
    subjects: [], // Initial empty, fetched from API
    teachers: [], // Initial empty, fetched from API
    blocks: [],
    conflicts: [],
    unassignedCards: [], // 미배정 카드 초기 상태

    addSubject: (subject) => set((state) => ({ subjects: [...state.subjects, subject] })),
    removeSubject: (id) => set((state) => ({ subjects: state.subjects.filter(s => s.id !== id) })),
    addTeacher: (teacher) => set((state) => ({ teachers: [...state.teachers, teacher] })),

    fetchSchoolData: async () => {
        try {
            console.log("Fetching school data from:", API_BASE);
            const [teachersRes, subjectsRes] = await Promise.all([
                fetch(`${API_BASE}/api/school-data/teachers-detail`),
                fetch(`${API_BASE}/api/school-data/subjects-detail`)
            ]);

            if (teachersRes.ok && subjectsRes.ok) {
                const teachersData = await teachersRes.json();
                const subjectsData = await subjectsRes.json();

                // Transform API data to Frontend format if needed
                // Backend TeacherResponse: {id, teacher_number, name, department_id, max_hours_per_week}
                // Frontend Teacher: {id, name, subjectId, homeroomClass, maxHoursPerWeek}

                // We need to map backend Subject ID to frontend Subject ID logic or just use ID.
                // Assuming backend IDs are integers, frontend uses strings mostly in mocks but string|number is fine if consistent.

                const mappedTeachers: Teacher[] = teachersData.map((t: any) => ({
                    id: t.id.toString(),
                    name: t.name,
                    subjectId: t.department_id ? `dept-${t.department_id}` : 'unknown', // Map department to subjectGroup?
                    // Frontend 'subjectId' in Teacher meant "Major Subject". Backends 'department_id' is similar.
                    maxHoursPerWeek: t.max_hours_per_week,
                    homeroomClass: undefined // Not yet in backend API, maybe add later?
                }));

                const mappedSubjects: Subject[] = subjectsData.map((s: any) => ({
                    id: s.id.toString(),
                    name: s.name,
                    category: s.category || '기타',
                    requiredHours: s.required_hours,
                    color: 'bg-white border-gray-200' // Default color, maybe map category to color
                }));

                // If API returns empty (no data seeded), fallback to Mock?
                if (mappedTeachers.length === 0) {
                    console.warn("API returned no teachers, using mock data fallback.");
                    set({ teachers: MOCK_TEACHERS });
                } else {
                    set({ teachers: mappedTeachers });
                }

                if (mappedSubjects.length > 0) {
                    set({ subjects: mappedSubjects });
                } else {
                    // Fallback subjects
                    set({
                        subjects: [
                            { id: 'sub-1', name: '국어', category: '국어', requiredHours: 4, color: 'bg-red-100 hover:bg-red-200 border-red-300' },
                            { id: 'sub-2', name: '수학', category: '수학', requiredHours: 4, color: 'bg-blue-100 hover:bg-blue-200 border-blue-300' }
                        ]
                    });
                }


            } else {
                console.error("Failed to fetch data", teachersRes.status, subjectsRes.status);
                // Fallback to Mocks on API Error (500 etc)
                console.warn("⚠️ Backend error - using mock data for frontend testing.");
                set({ teachers: MOCK_TEACHERS });
                set({
                    subjects: [
                        { id: 'sub-1', name: '국어', category: '국어', requiredHours: 4, color: 'bg-red-100 hover:bg-red-200 border-red-300' },
                        { id: 'sub-2', name: '수학', category: '수학', requiredHours: 4, color: 'bg-blue-100 hover:bg-blue-200 border-blue-300' }
                    ]
                });
            }
        } catch (e) {
            console.warn("⚠️ Backend not available - using mock data for frontend testing:", e);
            // Fallback to Mocks on Network Error
            set({ teachers: MOCK_TEACHERS });
            set({
                subjects: [
                    { id: 'sub-1', name: '국어', category: '국어', requiredHours: 4, color: 'bg-red-100 hover:bg-red-200 border-red-300' },
                    { id: 'sub-2', name: '수학', category: '수학', requiredHours: 4, color: 'bg-blue-100 hover:bg-blue-200 border-blue-300' }
                ]
            });
        }
    },

    addBlock: (subjectId, day, period, grade, classNum) => {
        const newBlock: ClassBlock = {
            id: generateId(),
            subjectId,
            day,
            period,
            grade,
            classNum,
        };

        set((state) => {
            const newBlocks = [...state.blocks, newBlock];
            return { blocks: newBlocks };
        });
        get().validateSchedule();
    },

    moveBlock: (blockId, toDay, toPeriod, grade, classNum) => {
        set((state) => ({
            blocks: state.blocks.map(b =>
                b.id === blockId
                    ? { ...b, day: toDay, period: toPeriod, grade, classNum }
                    : b
            )
        }));
        get().validateSchedule();
    },

    removeBlock: (blockId) => {
        set((state) => ({ blocks: state.blocks.filter(b => b.id !== blockId) }));
        get().validateSchedule();
    },

    assignTeacherToBlock: (blockId, teacherId) => {
        set((state) => ({
            blocks: state.blocks.map(b =>
                b.id === blockId ? { ...b, teacherId } : b
            )
        }));
        get().validateSchedule();
    },

    validateSchedule: () => {
        const { blocks, teachers, subjects } = get();
        const conflicts: Conflict[] = [];

        // Simple validation logic placeholder
        // Group by Day-Period
        const slots: Record<string, ClassBlock[]> = {};
        blocks.forEach(b => {
            // For conflict detection, we check collisions globally across all classes?
            // Or maybe just "Teacher Double Booking"
            const key = `${b.day}-${b.period}`;
            if (!slots[key]) slots[key] = [];
            slots[key].push(b);
        });

        // 1. Teacher Double Booking
        // Iterate all blocks, check if same teacher is in different blocks at same time (and not same block)
        // Actually, we can just iterate slots.

        Object.values(slots).forEach(slotBlocks => {
            const teacherCounts: Record<string, number> = {};
            slotBlocks.forEach(b => {
                if (b.teacherId) {
                    teacherCounts[b.teacherId] = (teacherCounts[b.teacherId] || 0) + 1;
                }
            });

            Object.entries(teacherCounts).forEach(([tid, count]) => {
                if (count > 1) {
                    const teacherName = teachers.find(t => t.id === tid)?.name || tid;
                    conflicts.push({
                        id: generateId(),
                        type: 'teacher-double-book',
                        message: `${teacherName} 선생님 중복 배정!`,
                        blockIds: slotBlocks.filter(b => b.teacherId === tid).map(b => b.id)
                    });
                }
            });
        });

        set({ conflicts });
    },

    // Unassigned Cards Actions
    createUnassignedCard: (subjectId, credits, grade, classNum, slicingOption) => {
        const newCard: UnassignedCard = {
            id: generateId(),
            subjectId,
            credits,
            slicingOption,
            originalSubjectId: slicingOption ? subjectId : undefined,
            grade,
            classNum,
        };

        set((state) => ({
            unassignedCards: [...state.unassignedCards, newCard],
        }));
    },

    assignCardToSlot: (cardId, day, period, grade, classNum) => {
        const card = get().unassignedCards.find((c) => c.id === cardId);
        if (!card) return;

        // Create a new block from the card
        const newBlock: ClassBlock = {
            id: generateId(),
            subjectId: card.subjectId,
            day,
            period,
            grade,
            classNum,
        };

        set((state) => ({
            blocks: [...state.blocks, newBlock],
            unassignedCards: state.unassignedCards.filter((c) => c.id !== cardId),
        }));

        get().validateSchedule();
    },

    returnCardToUnassigned: (blockId) => {
        const block = get().blocks.find((b) => b.id === blockId);
        if (!block) return;

        // Create an unassigned card from the block
        const newCard: UnassignedCard = {
            id: generateId(),
            subjectId: block.subjectId,
            credits: 1,
            grade: block.grade,
            classNum: block.classNum,
        };

        set((state) => ({
            unassignedCards: [...state.unassignedCards, newCard],
            blocks: state.blocks.filter((b) => b.id !== blockId),
        }));

        get().validateSchedule();
    },

    // wizard-store에서 사용
    setUnassignedCards: (cards) => set({ unassignedCards: cards }),
}));
