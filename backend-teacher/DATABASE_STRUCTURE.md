# 데이터베이스 구조 설명

## 테이블 구조와 비밀번호 저장 위치

### 1. **users 테이블** (공통 사용자 기본 정보)

회원가입하는 모든 사용자(교사, 학생, 학부모)의 **공통 기본 정보**를 저장합니다.

**주요 컬럼:**
- `id`: 사용자 고유 ID
- `email`: 이메일 (로그인 아이디)
- `name`: 이름
- `phone`: 전화번호
- `birth_date`: 생년월일
- **`user_type`**: 사용자 유형 ("teacher", "student", "parent")
- `created_at`, `updated_at`: 생성/수정 시간

**중요**: 
- ❌ **비밀번호는 여기에 저장되지 않습니다!** (교사용 웹에서는)
- ✅ 교사용 웹에서는 기본 정보만 저장됩니다

### 2. **teachers 테이블** (교사 전용 정보 및 비밀번호 저장)

교사 전용 정보와 **비밀번호**를 저장합니다.

**주요 컬럼:**
- `id`: 교사 고유 ID
- **`user_id`**: `users` 테이블의 `id`를 참조하는 외래키 ← **User와 연결**
- **`password_hash`**: **교사 비밀번호 해시값** ← **여기에 저장됩니다!**
- `teacher_number`: 교사번호
- `school_id`: 학교 ID
- `school_name`: 학교 이름
- `position`: 직책 (교과, 담임 등)
- `hire_date`: 채용일
- `is_homeroom_teacher`: 담임 여부
- `certification_number`: 자격증 번호

**중요**:
- ✅ **비밀번호는 `teachers` 테이블의 `password_hash` 컬럼에 저장됩니다!**
- ✅ 교사 전용 정보 및 비밀번호가 여기에 저장됩니다
- ✅ 원본 비밀번호가 아닌 **해시값(bcrypt)**으로 저장됩니다 (보안)
- ✅ `user_id`로 `users` 테이블과 연결됩니다

## 회원가입 프로세스 (교사)

교사가 회원가입할 때 다음과 같이 진행됩니다:

```
1. 사용자가 회원가입 폼 입력
   └─ 이메일, 비밀번호, 이름, 전화번호 등

2. 백엔드에서 처리:
   
   Step 1: users 테이블에 레코드 생성 (기본 정보만)
   ├─ email: 입력한 이메일
   ├─ name: 이름
   ├─ phone: 전화번호
   ├─ user_type: "teacher"
   └─ 기타 기본 정보...
   
   Step 2: teachers 테이블에 레코드 생성 (비밀번호 포함)
   ├─ user_id: 위에서 생성한 users.id를 참조
   ├─ password_hash: 비밀번호를 bcrypt로 해시화하여 저장 ← 여기!
   ├─ teacher_number: 자동 생성 (예: T2024123456)
   ├─ position: 직책
   ├─ is_homeroom_teacher: 담임 여부
   └─ 기타 교사 정보...
```

## 관계 구조

```
users 테이블 (1) ←→ (1) teachers 테이블
    │
    ├─ id (PK)
    ├─ email
    ├─ name
    └─ user_type: "teacher"

teachers 테이블
    │
    ├─ id (PK)
    ├─ user_id (FK) → users.id 참조
    ├─ password_hash ← 비밀번호 저장 (교사 전용)
    └─ 교사 전용 정보...
```

**예시 데이터:**

```sql
-- users 테이블
id | email           | name  | user_type
---|-----------------|-------|----------
1  | teacher@edu.kr | 김교사 | teacher

-- teachers 테이블
id | user_id | password_hash                    | teacher_number | position | is_homeroom_teacher
---|---------|----------------------------------|----------------|----------|-------------------
1  | 1       | $2b$12$abc123...  | T2024000001    | 교과     | false
```

## 정리

### ✅ 비밀번호 저장 위치 (교사용 웹)
- **`teachers` 테이블의 `password_hash` 컬럼**에 저장됩니다
- `users` 테이블에는 저장되지 않습니다 (교사용 웹에서는)

### ✅ 테이블 역할 (교사용 웹)
- **`users` 테이블**: 모든 사용자의 공통 기본 정보 (이메일, 이름 등)
- **`teachers` 테이블**: 교사 전용 정보 + **비밀번호**

### ✅ 왜 이렇게 설계했나요? (교사용 웹)
1. **교사 전용**: 교사용 웹이므로 교사 비밀번호는 teachers 테이블에 저장
2. **분리**: 사용자 기본 정보와 교사 전용 정보를 분리
3. **보안**: 비밀번호를 해시화하여 저장 (원본 비밀번호 저장 안 함)

## 로그인 프로세스

로그인할 때 `teachers` 테이블의 `password_hash`를 확인합니다:

```
1. 사용자: 이메일 + 비밀번호 입력
2. 백엔드:
   └─ users 테이블에서 이메일로 사용자 찾기
   └─ user_type이 "teacher"인지 확인
   └─ teachers 테이블에서 해당 user_id의 Teacher 찾기
   └─ 입력한 비밀번호를 해시화하여 teachers.password_hash와 비교
3. 성공 시: JWT 토큰 발급
```

## 데이터베이스 마이그레이션

기존 데이터베이스에 `password_hash` 컬럼을 추가하려면:

```bash
# migrations/add_password_to_teachers.sql 파일 실행
psql -h 3.35.3.225 -U postgres -d hw_project001 -f migrations/add_password_to_teachers.sql
```

또는 SQL 파일 내용을 직접 데이터베이스에서 실행하세요.

