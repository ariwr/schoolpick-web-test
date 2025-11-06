# QR 코드 생성 및 검증 서비스 (명세서 F-01, F-03)
import jwt
import qrcode
import io
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from app.config import settings

class QRCodeService:
    """동적 QR 코드 생성 및 검증 서비스"""
    
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.ALGORITHM
    
    def generate_dynamic_token(self, room_id: str, expires_in_minutes: int = 1) -> Dict[str, Any]:
        """
        동적 인증 토큰 생성 (명세서 F-01)
        
        Args:
            room_id: 정독실 ID (R01, R02 등)
            expires_in_minutes: 토큰 유효 기간 (분, 기본값 1분)
        
        Returns:
            토큰 정보 딕셔너리
        """
        now = datetime.utcnow()
        expires_at = now + timedelta(minutes=expires_in_minutes)
        
        # 토큰 페이로드 (명세서 예시 참고)
        payload = {
            "exp": int(expires_at.timestamp()),
            "iat": int(now.timestamp()),
            "room_id": room_id,
            "type": "attendance_qr"
        }
        
        # JWT 토큰 생성 (서버 Secret Key로 서명)
        # PyJWT 2.x는 문자열을 반환하지만, 타입 체크를 위해 명시적으로 변환
        token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
        if isinstance(token, bytes):
            token = token.decode('utf-8')
        
        return {
            "token": str(token),
            "expires_at": expires_at,
            "room_id": room_id
        }
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        동적 토큰 검증 (명세서 F-03 - 3.1)
        
        Args:
            token: 검증할 토큰
        
        Returns:
            검증 성공 시 토큰 페이로드, 실패 시 None
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            return None  # 토큰 만료
        except jwt.InvalidTokenError:
            return None  # 토큰 무효
    
    def generate_qr_code_image(self, token: str) -> str:
        """
        QR 코드 이미지 생성 (Base64 인코딩)
        
        Args:
            token: 인코딩할 토큰
        
        Returns:
            Base64 인코딩된 QR 코드 이미지 문자열
        """
        # QR 코드 생성
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(token)
        qr.make(fit=True)
        
        # 이미지 생성
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Base64 인코딩
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return img_str
    
    def generate_qr_code_with_image(self, room_id: str, expires_in_minutes: int = 1) -> Dict[str, Any]:
        """
        QR 코드 토큰과 이미지를 함께 생성
        
        Args:
            room_id: 정독실 ID
            expires_in_minutes: 토큰 유효 기간 (분)
        
        Returns:
            토큰, 만료 시간, QR 코드 이미지 포함 딕셔너리
        """
        token_data = self.generate_dynamic_token(room_id, expires_in_minutes)
        qr_image = self.generate_qr_code_image(token_data["token"])
        
        return {
            **token_data,
            "qr_code_image": qr_image
        }

