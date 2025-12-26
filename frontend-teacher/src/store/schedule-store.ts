import { create } from 'zustand';
import { ClassBlock, Conflict, DayOfWeek, Period, Subject, Teacher, UnassignedCard } from '../types/schedule';
import { MOCK_TEACHERS } from "@/data/mock-data";

interface ScheduleState {
    subjects: Subject[];
    teachers: Teacher[];
    blocks: ClassBlock[]; // Flat list of all assigned blocks
    conflicts: Conflict[];
    unassignedCards: UnassignedCard[]; // 미배정 카드 리스트
    activeScheduleId?: number; // Active Backend Schedule ID

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
    fetchActiveSchedule: () => Promise<number | null>;
    fetchScheduleState: (scheduleId: number) => Promise<void>;
    createLectureGroupsBatch: (cards: UnassignedCard[]) => Promise<boolean>;
    autoScheduleUnassigned: () => Promise<boolean>; // 🆕 Auto-Scheduler
    // Unassigned Cards Actions
    createUnassignedCard: (subjectId: string, credits: number, grade: number, classNum: number, slicingOption?: '2+2' | '3+1' | '4') => void;
    assignCardToSlot: (cardId: string, day: DayOfWeek, period: Period, grade: number, classNum: number) => void;
    returnCardToUnassigned: (blockId: string) => void;
    setUnassignedCards: (cards: UnassignedCard[]) => void; // wizard-store에서 사용
    createLectureGroupHelper: (card: UnassignedCard) => Promise<number | null>; // Helper for JIT creation
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

    fetchActiveSchedule: async () => {
        try {
            const res = await fetch(`${API_BASE}/api/schedule/active`);
            if (res.ok) {
                const data = await res.json();
                set({ activeScheduleId: data.id });
                console.log("Active Schedule Loaded:", data.id, data.name);

                // 🆕 Load actual schedule data after getting ID
                await get().fetchScheduleState(data.id);
                return data.id;
            } else if (res.status === 404) {
                // 없다면 하나 자동 생성 (편의상)
                console.warn("No active schedule found. Creating default...");
                const createRes = await fetch(`${API_BASE}/api/schedule/metadata`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: '2025-1학기 기본',
                        semester: '2025-1',
                        is_active: true
                    })
                });
                if (createRes.ok) {
                    const newData = await createRes.json();
                    set({ activeScheduleId: newData.id });
                    // Newly created, so empty state is correct
                    return newData.id;
                }
            }
        } catch (e) {
            console.error("Failed to fetch schedule:", e);
        }
        return null;
    },

    fetchScheduleState: async (scheduleId: number) => {
        try {
            const [groupsRes, blocksRes] = await Promise.all([
                fetch(`${API_BASE}/api/schedule/groups?schedule_id=${scheduleId}`),
                fetch(`${API_BASE}/api/schedule/blocks?schedule_id=${scheduleId}`)
            ]);

            if (groupsRes.ok && blocksRes.ok) {
                const groups = await groupsRes.json();
                const blocks = await blocksRes.json();

                // 1. Map Blocks
                const mappedBlocks: ClassBlock[] = blocks.map((b: any) => ({
                    id: b.id.toString(), // Backend ID is int, Frontend uses string
                    subjectId: 'unknown', // Need to resolve from group? -> Optimally Backend Block should imply Subject, but we need Group info for that.
                    // Wait, Block only has group_id. We need detailed info.
                    // We can map from groups.
                    day: b.day,
                    period: b.period,
                    grade: 0,   // Resolve later
                    classNum: 0, // Resolve later
                    groupId: b.group_id
                }));

                // 2. Map Groups (Unassigned + Context for Blocks)
                const mappedUnassigned: UnassignedCard[] = [];
                const groupMap = new Map<number, any>();

                groups.forEach((g: any) => {
                    groupMap.set(g.id, g);

                    // Check if this group is fully assigned or not?
                    // "UnassignedCards" are technically "LectureGroups that need blocks".
                    // If total_credits > assigned_blocks_count, it appears in Unassigned.
                    // Complex logic: We need to count assigned blocks per group.

                    const assignedCount = blocks.filter((b: any) => b.group_id === g.id).length;
                    const remaining = g.total_credits - assignedCount;

                    if (remaining > 0) {
                        // Create a card for the remaining hours? 
                        // Or usually 1 card = 1 group in simple drag mode?
                        // If slicing is 2+2, we might have multiple cards?
                        // For simplicity: If group exists, and has remaining credits, show as Unassigned Card.
                        // Ideally, we need ID for the Card. Using `group-${g.id}` might be distinct from `UnassignedCard.id`.
                        // Let's assume 1 Group = 1 Card in 'Unassigned' list until fully placed?
                        // Actually, if I place 1 block of a 4 credit class, 3 are left.
                        // The store logic usually treats "UnassignedCard" as a distinct entity that *becomes* a block.
                        // But here, we are reconstructing state.

                        // Let's create `remaining` number of 1-credit cards? Or one 2-credit card?
                        // Simplest: Create one card representing the group with `credits` = remaining.

                        mappedUnassigned.push({
                            id: `group-${g.id}-rem`, // Virtual ID
                            groupId: g.id,
                            subjectId: g.subject_id.toString(), // or map to 'sub-1' if needed
                            credits: remaining,
                            grade: g.grade,
                            classNum: g.class_num,
                            slicingOption: g.slicing_option as any
                        });
                    }
                });

                // 3. Hydrate Blocks with Group Info
                const hydratedBlocks = mappedBlocks.map(b => {
                    const g = groupMap.get(b.groupId!);
                    if (g) {
                        return {
                            ...b,
                            subjectId: g.subject_id.toString(),
                            grade: g.grade,
                            classNum: g.class_num,
                        };
                    }
                    return b;
                });

                set({
                    blocks: hydratedBlocks,
                    unassignedCards: mappedUnassigned
                });
                get().validateSchedule();
                console.log("Schedule State Synced:", hydratedBlocks.length, "blocks", mappedUnassigned.length, "cards");
            }
        } catch (e) {
            console.error("Failed to load schedule state:", e);
        }
    },

    // API Integration: Create Lecture Group (Backend)
    // In real app, this should be called when Wizard finishes.
    createLectureGroupHelper: async (card: UnassignedCard) => {
        const { activeScheduleId } = get();
        if (!activeScheduleId) {
            console.error("No active schedule ID found! Cannot create Lecture Group.");
            return null;
        }

        try {
            const body = {
                schedule_id: activeScheduleId, // 🆕 Dynamic ID usage
                subject_id: parseInt(card.subjectId.replace(/\D/g, '')) || 1, // Try parse 'sub-1' -> 1
                teacher_id: 1, // Default mock teacher
                grade: card.grade,
                class_num: card.classNum,
                total_credits: card.credits,
                slicing_option: card.slicingOption,
            };
            const res = await fetch(`${API_BASE}/api/schedule/groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                const data = await res.json();
                console.log("Lecture Group Created:", data);
                return data.id; // Returns group_id
            } else {
                console.error("Failed to create group:", res.status);
            }
        } catch (e) {
            console.error("Failed to create lecture group:", e);
        }
        return null;
    },

    // 🆕 Batch Creation for Wizard (Optimized)
    createLectureGroupsBatch: async (cards: UnassignedCard[]) => {
        const { activeScheduleId } = get();
        if (!activeScheduleId) return false;

        try {
            // Prepare Payload
            const payload = {
                schedule_id: activeScheduleId,
                groups: cards.map(card => ({
                    subject_id: parseInt(card.subjectId.replace(/\D/g, '')) || 1,
                    teacher_id: 1, // Mock
                    grade: card.grade,
                    class_num: card.classNum,
                    total_credits: card.credits,
                    slicing_option: card.slicingOption,
                    // neis_class_code optional
                }))
            };

            const res = await fetch(`${API_BASE}/api/schedule/groups/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                // Refresh state
                await get().fetchScheduleState(activeScheduleId);
                return true;
            } else {
                console.error("Batch creation failed:", res.status);
                return false;
            }
        } catch (e) {
            console.error("Batch creation failed:", e);
            return false;
        }
    },

    autoScheduleUnassigned: async () => {
        const { activeScheduleId } = get();
        if (!activeScheduleId) return false;

        try {
            console.log("Requesting Auto-Schedule...");
            const res = await fetch(`${API_BASE}/api/schedule/${activeScheduleId}/auto-schedule`, {
                method: 'POST',
            });

            if (res.ok) {
                const newBlocks = await res.json();
                console.log("Auto-Schedule Success:", newBlocks.length, "blocks created");

                // Refresh full state
                await get().fetchScheduleState(activeScheduleId);
                return true;
            } else {
                console.error("Auto-Schedule Failed:", res.status);
                const err = await res.json();
                alert(`자동 배정 실패: ${err.detail || '알 수 없는 오류'}`);
                return false;
            }
        } catch (e) {
            console.error("Auto-Schedule Network Error:", e);
            return false;
        }


    },

    assignCardToSlot: async (cardId, day, period, grade, classNum) => {
        const { unassignedCards, blocks } = get();
        const card = unassignedCards.find((c) => c.id === cardId);
        if (!card) return;

        // 1. Ensure Group ID exists (Sync process)
        // Since our mock cards don't have DB IDs yet, we attempt to create one on the fly for TESTING.
        let groupId = card.groupId;
        if (!groupId) {
            // Check if we already have a block for this "logical" group?
            // Or assume Wizard should have created it.
            // If JIT creation is needed:
            const newGroupId = await get().createLectureGroupHelper(card);
            if (newGroupId) groupId = newGroupId;
            if (!groupId) {
                console.warn("Backend sync failed, falling back to local only mode.");
                // We proceed locally anyway to avoid UI freezing
            }
        }

        // 2. Call Backend Validation & Save
        let isBackendValid = true;
        if (groupId) {
            try {
                const blockBody = {
                    group_id: groupId,
                    day,
                    period,
                    is_fixed: false
                };
                const res = await fetch(`${API_BASE}/api/schedule/blocks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(blockBody)
                });

                const data = await res.json();

                if (!res.ok) {
                    // Validation Failed (Hard Error)
                    if (data.detail && data.detail.errors) {
                        alert(`[배정 불가] ${data.detail.errors.join("\n")}`);
                        return; // Stop here!
                    }
                    console.error("API Error", data);
                }
                // If success, we update local store below
            } catch (e) {
                console.error("Failed to save block to backend:", e);
            }
        }

        // 3. Update Frontend Store (Optimistic or Confirmed)
        // ... rest of logic

        // 3. Update Frontend Store (Optimistic or Confirmed)
        const newBlock: ClassBlock = {
            id: generateId(),
            subjectId: card.subjectId,
            day,
            period,
            grade,
            classNum,
            groupId, // Store the linked ID
        };

        set((state) => ({
            blocks: [...state.blocks, newBlock],
            unassignedCards: state.unassignedCards.filter((c) => c.id !== cardId),
        }));

        get().validateSchedule(); // Local basic check
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
