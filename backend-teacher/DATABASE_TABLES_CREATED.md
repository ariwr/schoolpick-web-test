# 생성된 데이터베이스 테이블

## 생성 완료된 테이블

### 1. `location_settings` 테이블
- **용도**: 정독실 및 야자 공간 위치 설정
- **생성 스크립트**: `migrations/create_location_settings_table.sql`
- **생성 확인**: `python check_location_settings_table.py`

### 2. `attendance` 테이블
- **용도**: 출석 기록 저장
- **생성 스크립트**: `migrations/create_attendance_table.sql`
- **생성 확인**: `python check_attendance_table.py`

## 테이블 구조

### `location_settings`
- `room_id` (PK): 정독실/야자 공간 ID
- `latitude`, `longitude`: Geo-Fence 중심 좌표
- `radius_m`: 허용 반경 (미터)
- `allowed_wifi_bssid`: 허용된 Wi-Fi BSSID 목록 (JSONB)
- `attendance_start_time`, `attendance_end_time`: 출석 가능 시간
- `late_threshold_time`: 지각 기준 시간
- `checkout_time`: 야자 종료 시간

### `attendance`
- `id` (PK): 출석 기록 ID
- `student_id` (FK): 학생 ID
- `teacher_id` (FK): 교사 ID
- `date`: 출석 날짜
- `status`: 출석 상태 (VARCHAR(20))
- `check_in_time`, `check_out_time`: 입실/퇴실 시간
- `room_id`: 정독실/야자 공간 ID
- `scanned_token`: 스캔 시 사용된 토큰
- `geo_data`: GPS/Wi-Fi 데이터 (JSONB)
- `device_id`: 스캔 기기 ID
- `is_fraud_detected`: 부정행위 의심 여부

## 주의사항

1. **`status` 컬럼**: 모델에서는 `AttendanceStatus` Enum을 사용하지만, 실제 DB에는 VARCHAR(20)로 저장됩니다.
   - 코드에서 `status.value`를 사용하여 저장
   - 비교 시에도 `.value` 사용 필요

2. **날짜 필터링**: `get_attendance_records`에서 날짜 비교는 `func.date()`를 사용하여 날짜 부분만 비교합니다.

