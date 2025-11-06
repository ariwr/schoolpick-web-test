-- 교사용 웹: teachers 테이블에 password_hash 컬럼 추가
-- 실행 전 백업을 권장합니다!

-- 1. teachers 테이블에 password_hash 컬럼 추가
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- 2. 기존 데이터가 있는 경우, users 테이블의 password_hash를 teachers로 복사
-- (기존 교사 데이터 마이그레이션용 - 새로운 회원가입에는 불필요)
UPDATE teachers t
SET password_hash = u.password_hash
FROM users u
WHERE t.user_id = u.id 
  AND u.user_type = 'teacher'
  AND t.password_hash IS NULL;

-- 3. NOT NULL 제약 추가 (기존 데이터 마이그레이션 완료 후)
-- 주의: 기존 데이터가 모두 마이그레이션된 후에만 실행하세요!
-- ALTER TABLE teachers 
-- ALTER COLUMN password_hash SET NOT NULL;

-- 4. (선택사항) users 테이블의 password_hash 컬럼 삭제
-- 주의: 다른 시스템(학생용 앱 등)에서 사용 중일 수 있으므로 확인 후 실행!
-- ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

-- 실행 후 확인
SELECT 
    t.id,
    t.user_id,
    u.email,
    u.name,
    CASE 
        WHEN t.password_hash IS NOT NULL THEN '비밀번호 있음'
        ELSE '비밀번호 없음'
    END as password_status
FROM teachers t
JOIN users u ON t.user_id = u.id
WHERE u.user_type = 'teacher'
LIMIT 10;




