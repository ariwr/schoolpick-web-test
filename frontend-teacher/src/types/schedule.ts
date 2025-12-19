export type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI";
export type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Subject {
    id: string;
    name: string;
    category: "국어" | "수학" | "영어" | "탐구" | "체육예술" | "생활교양" | "전문교과" | "창체";
    requiredHours: number; // 주당 권장 시수
    color: string;
}

export interface Teacher {
    id: string;
    name: string;
    subjectId: string; // 주 담당 과목
    maxHoursPerWeek?: number; // 주당 최대 수업 시수 (권장)
    homeroomClass?: string;
}

export interface ClassBlock {
    id: string; // unique instance id
    subjectId: string;
    teacherId?: string; // assigned teacher (optional at first)
    day: DayOfWeek;
    period: Period;
    roomId?: string; // special room if needed
    warnings?: string[]; // list of conflict messages
}

export interface TimetableState {
    grid: Record<string, ClassBlock[]>; // Key: "MON-1", Value: Array of blocks (usually 1, but multiple for conflicts?)
    // Actually, for a single class schedule, it's 1 block. 
    // But this system seems to be for *managing* the teacher's view or a logical view.
    // "General High School vs Specialized High School" -> "Logical Decoupling"
    // Let's assume this is a "Master Schedule" or specific grade/class schedule.
    // The prompt says "Teacher's Dashboard". It implies managing *Curriculum vs Timetable*.
    // Let's structure the grid to support drag-dropped items.
}

export interface Conflict {
    id: string;
    message: string;
    type: "teacher-overflow" | "room-double-book" | "teacher-double-book";
    blockIds: string[];
}
