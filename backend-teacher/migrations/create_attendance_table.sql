-- attendance 테이블 생성
-- 출석 기록을 저장하는 테이블

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    
    -- 학생 정보
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- 교사 정보
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 출석 정보
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'absent',  -- present, absent, late, early_leave, early_leave_request, completed, excused
    note TEXT,  -- 비고
    
    -- 시간 정보
    check_in_time TIMESTAMP WITH TIME ZONE,  -- 등교 시간
    check_out_time TIMESTAMP WITH TIME ZONE,  -- 하교 시간
    
    -- QR 코드 기반 출석 시스템 필드
    room_id VARCHAR(50),  -- 정독실/야자 공간 ID (R01, R02, Y31 등)
    scanned_token TEXT,  -- 스캔 시 사용된 동적 토큰 (Audit용)
    geo_data JSONB,  -- 스캔 시 수집된 GPS 및 Wi-Fi 원본 데이터
    device_id VARCHAR(255),  -- 스캔 시 사용된 기기 ID
    is_fraud_detected BOOLEAN DEFAULT FALSE,  -- 부정행위 의심 기록 여부
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_teacher_id ON attendance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_room_id ON attendance(room_id);
CREATE INDEX IF NOT EXISTS idx_attendance_device_id ON attendance(device_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date_teacher ON attendance(date, teacher_id);

-- 코멘트 추가
COMMENT ON TABLE attendance IS '출석 기록 테이블';
COMMENT ON COLUMN attendance.student_id IS '학생 ID (students 테이블 참조)';
COMMENT ON COLUMN attendance.teacher_id IS '교사 ID (users 테이블 참조)';
COMMENT ON COLUMN attendance.date IS '출석 날짜';
COMMENT ON COLUMN attendance.status IS '출석 상태 (present, absent, late, early_leave, early_leave_request, completed, excused)';
COMMENT ON COLUMN attendance.check_in_time IS '입실 시간';
COMMENT ON COLUMN attendance.check_out_time IS '퇴실 시간';
COMMENT ON COLUMN attendance.room_id IS '정독실/야자 공간 ID';
COMMENT ON COLUMN attendance.scanned_token IS '스캔 시 사용된 동적 토큰';
COMMENT ON COLUMN attendance.geo_data IS 'GPS 및 Wi-Fi 원본 데이터 (JSON)';
COMMENT ON COLUMN attendance.device_id IS '스캔 시 사용된 기기 ID';
COMMENT ON COLUMN attendance.is_fraud_detected IS '부정행위 의심 기록 여부';
















