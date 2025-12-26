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

    // 역할 관리 (Phase 5 창체 배정에 필수)
    homeroomClass?: string; // "1-1" 형태
    isAssistantHomeroom?: boolean; // 부담임 여부
    isDepartmentHead?: boolean; // 교과 부장 여부

    // 수업 불가 시간 (OR-Tools 제약 조건)
    timeOff?: TimeOffSlot[];
}

export interface ClassBlock {
    id: string; // unique instance id
    subjectId: string;
    teacherId?: string; // assigned teacher (optional at first)
    day: DayOfWeek;
    period: Period;
    roomId?: string; // special room if needed
    warnings?: string[]; // list of conflict messages
    grade: number; // 1, 2, 3
    classNum: number; // 1 ~ 10
    blockGroup?: string; // e.g. "A", "B" (Logical time block tag)
}

export type ViewMode = "CLASS" | "TEACHER" | "BLOCK";

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

export interface UnassignedCard {
    id: string;
    subjectId: string;
    credits: number; // 1, 2, 3, 4
    slicingOption?: '2+2' | '3+1' | '4'; // 원본 슬라이싱 옵션
    originalSubjectId?: string; // 슬라이싱된 경우 원본 과목 ID
    grade: number; // 🆕 학년
    classNum: number; // 🆕 반
    teacherId?: string; // 🆕 담당 교사 (아직 배정되지 않음)
}

// ===== Phase 0: School Data Wizard 타입 =====

// 교사 수업 불가 시간
export interface TimeOffSlot {
    day: DayOfWeek;
    period: Period;
    reason?: string; // "육아 시간", "행정 업무" 등
}

// 학교 기본 정보
export interface SchoolBasicInfo {
    grades: {
        grade: number; // 1, 2, 3
        classCount: number; // 반 수
    }[];
    facilities: string[]; // 특별실 목록 ["음악실", "미술실", "과학실1"]
}

// 교과군 및 교사 정보
export interface DepartmentInfo {
    id: string;
    name: string; // "국어과", "수학과" 등
    category: "국어" | "수학" | "영어" | "탐구" | "체육예술" | "생활교양" | "전문교과" | "창체";
    teacherCount: number;
    teachers: Teacher[]; // 교사 배열 (역할 관리 포함)
    defaultHours: number; // 기준 시수 (예: 16시간)
}

// 과목 정보 (Step 3에서 입력)
export interface SubjectInfo {
    id: string;
    name: string; // "국어Ⅰ", "수학Ⅰ"
    category: string; // 교과군 (DepartmentInfo.category와 매칭)
    gradeCredits: {
        grade: number;
        credits: number;
    }[]; // 학년별 학점 (예: [{grade: 1, credits: 4}, {grade: 2, credits: 0}])
    slicingOption?: '2+2' | '3+1' | '4'; // 4학점인 경우만
    requiredRoom?: string; // 특별실 필수 여부 (예: "미술실")
}

// 블록 그룹 정의 (Step 4에서 입력)
export interface BlockGroupDefinition {
    id: string;
    name: string; // "A", "B", "C", "D", "E", "F", "G"
    targetGrades: number[]; // [1, 2, 3]
}
