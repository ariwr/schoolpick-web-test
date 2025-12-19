import { create } from 'zustand';
import { ClassBlock, Conflict, DayOfWeek, Period, Subject, Teacher } from '../types/schedule';
import { v4 as uuidv4 } from 'uuid'; // We might need uuid, or just use simple random string for now

interface ScheduleState {
    subjects: Subject[];
    teachers: Teacher[];
    blocks: ClassBlock[]; // Flat list of all assigned blocks
    conflicts: Conflict[];

    // Actions
    addSubject: (subject: Subject) => void;
    removeSubject: (id: string) => void;
    addTeacher: (teacher: Teacher) => void;

    // DnD Actions
    addBlock: (subjectId: string, day: DayOfWeek, period: Period) => void;
    moveBlock: (blockId: string, toDay: DayOfWeek, toPeriod: Period) => void;
    removeBlock: (blockId: string) => void;
    assignTeacherToBlock: (blockId: string, teacherId: string) => void;

    // Validation
    validateSchedule: () => void;
}

// Temporary ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

export const useScheduleStore = create<ScheduleState>((set, get) => ({
    subjects: [
        { id: 'sub-1', name: '국어', category: '국어', requiredHours: 4, color: 'bg-red-100 hover:bg-red-200 border-red-300' },
        { id: 'sub-2', name: '수학', category: '수학', requiredHours: 4, color: 'bg-blue-100 hover:bg-blue-200 border-blue-300' },
        { id: 'sub-3', name: '영어', category: '영어', requiredHours: 4, color: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300' },
        { id: 'sub-4', name: '한국사', category: '탐구', requiredHours: 3, color: 'bg-green-100 hover:bg-green-200 border-green-300' },
        { id: 'sub-5', name: '통합사회', category: '탐구', requiredHours: 3, color: 'bg-green-100 hover:bg-green-200 border-green-300' },
        { id: 'sub-6', name: '음악', category: '체육예술', requiredHours: 2, color: 'bg-purple-100 hover:bg-purple-200 border-purple-300' },
        { id: 'sub-7', name: '창체/진로', category: '창체', requiredHours: 2, color: 'bg-gray-100 hover:bg-gray-200 border-gray-300' },
    ],
    teachers: [
        { id: 'tea-1', name: '김국어', subjectId: 'sub-1', maxHoursPerWeek: 15 },
        { id: 'tea-2', name: '이수학', subjectId: 'sub-2', maxHoursPerWeek: 15 },
        { id: 'tea-3', name: '박영어', subjectId: 'sub-3', maxHoursPerWeek: 15 },
        { id: 'tea-4', name: '최사회', subjectId: 'sub-5', maxHoursPerWeek: 12 },
        { id: 'tea-5', name: '정음악', subjectId: 'sub-6', maxHoursPerWeek: 10 },
    ],
    blocks: [],
    conflicts: [],

    addSubject: (subject) => set((state) => ({ subjects: [...state.subjects, subject] })),
    removeSubject: (id) => set((state) => ({ subjects: state.subjects.filter(s => s.id !== id) })),
    addTeacher: (teacher) => set((state) => ({ teachers: [...state.teachers, teacher] })),

    addBlock: (subjectId, day, period) => {
        const newBlock: ClassBlock = {
            id: generateId(),
            subjectId,
            day,
            period,
        };

        set((state) => {
            const newBlocks = [...state.blocks, newBlock];
            // Trigger validation immediately? Or wait? 
            // Let's trigger it.
            return { blocks: newBlocks };
        });
        get().validateSchedule();
    },

    moveBlock: (blockId, toDay, toPeriod) => {
        set((state) => ({
            blocks: state.blocks.map(b =>
                b.id === blockId
                    ? { ...b, day: toDay, period: toPeriod }
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

        // 1. Double Booking (Teacher)
        // Check if a teacher is assigned to multiple blocks at the same time
        // For this simplified demo, we assume "blocks" are for ONE class.
        // But the requirements say "Logic Contradiction" -> "Total Math Classes > Math Teachers"

        // Group by Day-Period
        const slots: Record<string, ClassBlock[]> = {};
        blocks.forEach(b => {
            const key = `${b.day}-${b.period}`;
            if (!slots[key]) slots[key] = [];
            slots[key].push(b);
        });

        // Check Logic: "Teacher overflow"
        // Ideally, we need to know "How many classes are running in parallel?"
        // If this dashboard is for ONE GRADE (e.g., 10 classes), and we schedule 11 Math classes at Mon-1st,
        // and we only have 10 Math teachers, that's a problem.
        // **Assumption**: This dashboard is simulating a single class's timetable for now, 
        // BUT the requirement mentions "Math Teacher Count (3)".
        // So let's implement the "Subject Limit" check per slot.

        // "Specific time block math class count > Math teacher count"
        // We need to count how many MATH blocks are in Mon-1st across "All Classes"?
        // OR, is this dashboard just for "User" (a Head Teacher) managing ONE class?
        // "Left: Subject hour input, Right: 5-day grid" -> This looks like ONE class timetable.
        // If it's one class, you can't have 4 Math classes at Mon-1st. You can only have 1.
        //
        // Re-reading: "Left: Subject hour input, Right: 5-day grid"
        // "Specific time block math class > Math teacher count (e.g. 3)" -> This implies MULTIPLE classes context.
        // Maybe the user means: "I am allocating resources for the WHOLE SCHOOL/GRADE".
        // 
        // Let's interpret: I (Head Teacher) am setting the "Standard Time Grid" or managing resources.
        // OR, maybe the user wants to see: "If I put Math here, does it conflict with OTHER classes?"
        // Since we don't have other classes data, let's allow "Multiple Blocks per Cell" for now
        // to simulate the "Aggregate View" or just implement the logic as requested:
        // "Count blocks with Subject='Math' at Mon-1" (maybe user drags multiple Math cards there?)

        // Let's enable putting multiple cards in one cell to test this logic.

        Object.entries(slots).forEach(([key, slotBlocks]) => {
            // Count per subject
            const subjectCounts: Record<string, number> = {};
            slotBlocks.forEach(b => {
                const sub = subjects.find(s => s.id === b.subjectId);
                if (sub) {
                    subjectCounts[sub.id] = (subjectCounts[sub.id] || 0) + 1;
                }
            });

            // Check against teacher count
            Object.entries(subjectCounts).forEach(([subId, count]) => {
                const sub = subjects.find(s => s.id === subId);
                const availableTeachers = teachers.filter(t => t.subjectId === subId).length;

                if (availableTeachers > 0 && count > availableTeachers) {
                    conflicts.push({
                        id: generateId(),
                        type: 'teacher-overflow',
                        message: `${sub?.name} 교사 부족! (${count}명 필요 / ${availableTeachers}명 가능)`,
                        blockIds: slotBlocks.filter(b => b.subjectId === subId).map(b => b.id)
                    });
                }
            });
        });

        set({ conflicts });
    }
}));
