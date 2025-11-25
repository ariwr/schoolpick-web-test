-- location_settings 테이블 생성
-- 야자 출석 및 정독실 위치 설정을 위한 테이블

CREATE TABLE IF NOT EXISTS location_settings (
    room_id VARCHAR(50) PRIMARY KEY,  -- 정독실/야자 공간 ID (R01, R02, Y31 등)
    latitude DECIMAL(10, 8) NOT NULL,  -- Geo-Fence 중심 위도
    longitude DECIMAL(11, 8) NOT NULL,  -- Geo-Fence 중심 경도
    radius_m INTEGER NOT NULL,  -- 허용 반경 (미터, 예: 20m)
    allowed_wifi_bssid JSONB,  -- 허용된 Wi-Fi AP의 BSSID 목록 (Array of String)
    
    -- 출석 가능 시간 설정
    attendance_start_time VARCHAR(10),  -- 출석 가능 시작 시간 (예: "07:50", "18:50")
    attendance_end_time VARCHAR(10),  -- 출석 가능 종료 시간 (예: "08:10", "19:10")
    late_threshold_time VARCHAR(10),  -- 지각 기준 시간 (예: "08:00", "19:00")
    
    -- 야자 종료 시간 설정 (야자 출석용)
    checkout_time VARCHAR(10),  -- 야자 종료 시간 (예: "22:00")
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_location_settings_room_id ON location_settings(room_id);

-- 코멘트 추가
COMMENT ON TABLE location_settings IS '정독실 및 야자 공간 위치 설정 테이블';
COMMENT ON COLUMN location_settings.room_id IS '정독실/야자 공간 고유 ID (R01, R02, Y31 등)';
COMMENT ON COLUMN location_settings.latitude IS 'Geo-Fence 중심 위도';
COMMENT ON COLUMN location_settings.longitude IS 'Geo-Fence 중심 경도';
COMMENT ON COLUMN location_settings.radius_m IS '허용 반경 (미터)';
COMMENT ON COLUMN location_settings.allowed_wifi_bssid IS '허용된 Wi-Fi AP의 BSSID 목록 (JSON 배열)';
COMMENT ON COLUMN location_settings.attendance_start_time IS '출석 가능 시작 시간 (HH:MM 형식)';
COMMENT ON COLUMN location_settings.attendance_end_time IS '출석 가능 종료 시간 (HH:MM 형식)';
COMMENT ON COLUMN location_settings.late_threshold_time IS '지각 기준 시간 (HH:MM 형식)';
COMMENT ON COLUMN location_settings.checkout_time IS '야자 종료 시간 (HH:MM 형식)';
















