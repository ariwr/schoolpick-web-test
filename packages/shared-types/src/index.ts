// 공통 타입 정의 (예시)
export type UserRole = 'teacher' | 'admin' | 'student';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  user_type: UserRole;
}

