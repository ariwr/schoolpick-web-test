# 출석 유효성 검증 서비스 (명세서 F-03)
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, time
from math import radians, sin, cos, sqrt, atan2
from app.models.attendance import LocationSetting
from sqlalchemy.orm import Session

class AttendanceValidationService:
    """출석 유효성 검증 서비스"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        두 GPS 좌표 간 거리 계산 (Haversine 공식)
        
        Returns:
            거리 (미터)
        """
        # 지구 반경 (미터)
        R = 6371000
        
        # 라디안 변환
        lat1_rad = radians(lat1)
        lat2_rad = radians(lat2)
        delta_lat = radians(lat2 - lat1)
        delta_lon = radians(lon2 - lon1)
        
        # Haversine 공식
        a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        distance = R * c
        
        return distance
    
    def validate_token(self, token_payload: Optional[Dict[str, Any]]) -> Tuple[bool, Optional[str]]:
        """
        토큰 검증 (명세서 F-03 - 3.1)
        
        Args:
            token_payload: 검증된 토큰 페이로드 (None이면 만료 또는 무효)
        
        Returns:
            (검증 성공 여부, 실패 원인)
        """
        if token_payload is None:
            return False, "QR 코드 만료"
        
        if token_payload.get("type") != "attendance_qr":
            return False, "잘못된 토큰 타입"
        
        # exp 필드 확인 (이미 jwt.decode에서 검증됨, 하지만 추가 확인)
        exp = token_payload.get("exp")
        if exp and datetime.utcnow().timestamp() > exp:
            return False, "QR 코드 만료"
        
        return True, None
    
    def validate_location(self, location_data: Dict[str, Any], room_id: str) -> Tuple[bool, Optional[str]]:
        """
        위치 검증 (명세서 F-03 - 3.2)
        GPS와 Wi-Fi 둘 다 검증
        
        Args:
            location_data: GPS 좌표 및 Wi-Fi BSSID 목록
            room_id: 정독실 ID
        
        Returns:
            (검증 성공 여부, 실패 원인)
        """
        # 위치 설정 조회
        location_setting = self.db.query(LocationSetting).filter(
            LocationSetting.room_id == room_id
        ).first()
        
        if not location_setting:
            return False, "정독실 위치 설정을 찾을 수 없습니다"
        
        # GPS 검증
        gps_latitude = location_data.get("gps", {}).get("latitude")
        gps_longitude = location_data.get("gps", {}).get("longitude")
        
        if gps_latitude is None or gps_longitude is None:
            return False, "GPS 좌표가 제공되지 않았습니다"
        
        # GPS 거리 계산
        distance = self.calculate_distance(
            float(gps_latitude),
            float(gps_longitude),
            float(location_setting.latitude),
            float(location_setting.longitude)
        )
        
        if distance > location_setting.radius_m:
            return False, f"정독실 위치에서 벗어났습니다 (거리: {distance:.1f}m, 허용: {location_setting.radius_m}m)"
        
        # Wi-Fi 검증
        wifi_bssids = location_data.get("wifi", {}).get("bssids", [])
        if not wifi_bssids:
            return False, "Wi-Fi 정보가 제공되지 않았습니다"
        
        allowed_bssids = location_setting.allowed_wifi_bssid or []
        if not allowed_bssids:
            # Wi-Fi 검증이 설정되지 않았으면 GPS만으로 판단
            return True, None
        
        # 허용된 Wi-Fi AP 중 하나라도 포함되어 있는지 확인
        wifi_match = any(bssid in allowed_bssids for bssid in wifi_bssids)
        if not wifi_match:
            return False, "정독실 Wi-Fi에 연결되어 있지 않습니다"
        
        # GPS와 Wi-Fi 둘 다 통과
        return True, None
    
    def validate_device(self, device_id: str, student_id: int) -> Tuple[bool, Optional[str]]:
        """
        기기 검증 (명세서 F-03 - 3.3)
        현재는 기본 검증만 수행 (선택 사항: 1차 등록된 기기만 허용)
        
        Args:
            device_id: 기기 ID
            student_id: 학생 ID
        
        Returns:
            (검증 성공 여부, 실패 원인)
        """
        # TODO: 향후 기기 등록 기능 구현 시 여기서 검증
        # 현재는 기본 검증만 수행 (device_id가 제공되었는지 확인)
        if not device_id or len(device_id.strip()) == 0:
            return False, "기기 ID가 제공되지 않았습니다"
        
        return True, None
    
    def validate_time(self, scan_time: datetime, room_id: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        시간 검증 (명세서 F-03 - 3.4)
        
        Args:
            scan_time: 스캔 시각
            room_id: 정독실 ID
        
        Returns:
            (검증 성공 여부, 실패 원인, 상태(정상/지각))
        """
        # 위치 설정 조회
        location_setting = self.db.query(LocationSetting).filter(
            LocationSetting.room_id == room_id
        ).first()
        
        if not location_setting:
            return False, "정독실 위치 설정을 찾을 수 없습니다", None
        
        # 출석 가능 시간 확인
        start_time_str = location_setting.attendance_start_time
        end_time_str = location_setting.attendance_end_time
        late_threshold_str = location_setting.late_threshold_time
        
        if not start_time_str or not end_time_str:
            # 시간 제한이 설정되지 않았으면 항상 통과
            return True, None, "present"
        
        # 시간 파싱
        try:
            start_hour, start_minute = map(int, start_time_str.split(":"))
            end_hour, end_minute = map(int, end_time_str.split(":"))
            
            scan_time_only = scan_time.time()
            start_time = time(start_hour, start_minute)
            end_time = time(end_hour, end_minute)
            
            # 출석 가능 시간 범위 확인
            if scan_time_only < start_time or scan_time_only > end_time:
                return False, f"출석 가능 시간이 아닙니다 ({start_time_str} ~ {end_time_str})", None
            
            # 지각 여부 확인
            if late_threshold_str:
                late_hour, late_minute = map(int, late_threshold_str.split(":"))
                late_threshold = time(late_hour, late_minute)
                
                if scan_time_only > late_threshold:
                    return True, None, "late"  # 지각
                else:
                    return True, None, "present"  # 정상
            else:
                return True, None, "present"
        
        except (ValueError, AttributeError) as e:
            return False, f"시간 설정 오류: {str(e)}", None
    
    def validate_all(
        self,
        token_payload: Optional[Dict[str, Any]],
        location_data: Dict[str, Any],
        device_id: str,
        student_id: int,
        scan_time: datetime,
        room_id: str
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        전체 검증 통합 (명세서 F-03)
        
        Returns:
            (검증 성공 여부, 실패 원인, 상태(정상/지각))
        """
        # 1. 토큰 검증
        token_valid, token_error = self.validate_token(token_payload)
        if not token_valid:
            return False, token_error, None
        
        # 2. 위치 검증
        location_valid, location_error = self.validate_location(location_data, room_id)
        if not location_valid:
            return False, location_error, None
        
        # 3. 기기 검증
        device_valid, device_error = self.validate_device(device_id, student_id)
        if not device_valid:
            return False, device_error, None
        
        # 4. 시간 검증
        time_valid, time_error, status = self.validate_time(scan_time, room_id)
        if not time_valid:
            return False, time_error, None
        
        # 모든 검증 통과
        return True, None, status


