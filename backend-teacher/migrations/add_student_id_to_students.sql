-- students 테이블에 student_id 컬럼 추가
-- 이 스크립트는 students 테이블 구조를 업데이트합니다.

-- 먼저 테이블 구조 확인
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'students';

-- student_id 컬럼이 없으면 추가
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'students' 
        AND column_name = 'student_id'
    ) THEN
        -- student_id 컬럼 추가 (학번)
        ALTER TABLE students 
        ADD COLUMN student_id VARCHAR(50) UNIQUE;
        
        -- 기존 데이터가 있다면 student_number를 student_id로 복사
        UPDATE students 
        SET student_id = CAST(student_number AS VARCHAR) 
        WHERE student_id IS NULL;
        
        -- NOT NULL 제약 조건 추가
        ALTER TABLE students 
        ALTER COLUMN student_id SET NOT NULL;
        
        -- 인덱스 생성
        CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
        
        RAISE NOTICE 'student_id 컬럼이 추가되었습니다.';
    ELSE
        RAISE NOTICE 'student_id 컬럼이 이미 존재합니다.';
    END IF;
END $$;

-- 테이블 구조 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'students'
ORDER BY ordinal_position;
















