# 정독실 QR 코드 시스템 현재 상태 분석

## 🔍 현재 QR 코드 출처 및 로직

### 1. **프론트엔드 (정독실 관리 페이지)**

**파일**: `frontend-teacher/src/app/study-room/page.tsx`

#### QR 코드 생성 방식
```typescript
// 232-237번 줄
const generateEntranceQRCode = () => {
  const token = Math.random().toString(36).substring(2, 10).toUpperCase()
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return { code: `ROOMQR_${token}`, expiresAt: today.toISOString() }
}
```

**특징:**
- ❌ **클라이언트 사이드에서만 생성** (프론트엔드에서 `Math.random()` 사용)
- ❌ **서버 검증 없음** - 단순 문자열 생성
- ❌ **보안 키 없음** - 위조 가능
- ❌ **만료 시간만 체크** - 실제 검증 로직 없음

#### QR 코드 이미지 표시
```typescript
// 49번 줄
const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(value)}`
```

**출처:**
- 🌐 **온라인 서비스**: `api.qrserver.com` (외부 API)
- ✅ 무료 공개 API
- ⚠️ **데이터 전송**: QR 코드 내용이 외부 서버로 전송됨

---

### 2. **백엔드 (출석 시스템)**

**파일**: `backend-teacher/app/services/qr_service.py`

#### 보안 강화된 QR 코드 생성 시스템
```python
def generate_dynamic_token(self, room_id: str, expires_in_minutes: int = 1):
    # JWT 토큰 생성
    payload = {
        "exp": int(expires_at.timestamp()),
        "iat": int(now.timestamp()),
        "room_id": room_id,
        "type": "attendance_qr"
    }
    # SECRET_KEY로 서명
    token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    return token
```

**특징:**
- ✅ **서버 사이드 생성** - 보안 강화
- ✅ **JWT 서명** - SECRET_KEY로 위조 방지
- ✅ **1분마다 자동 갱신** - 재사용 방지
- ✅ **다중 검증 시스템** - 토큰, 위치, 시간, 기기 검증

#### API 엔드포인트
- `GET /api/attendance/qr/image/{room_id}` - QR 코드 이미지 생성
- `POST /api/attendance/qr/scan` - QR 코드 스캔 및 검증

---

## ⚠️ 현재 문제점

### 1. **프론트엔드와 백엔드 시스템 분리**

**현재 상황:**
```
프론트엔드 (정독실 관리)
  └─ 단순 랜덤 문자열 (ROOMQR_XXXXX)
  └─ 보안 검증 없음
  └─ 외부 API로 QR 이미지 생성

백엔드 (출석 시스템)
  └─ JWT 기반 보안 토큰
  └─ 다중 검증 시스템
  └─ 서버에서 QR 이미지 생성
```

**문제:**
- ❌ 두 시스템이 **연결되지 않음**
- ❌ 정독실 관리에서 생성한 QR 코드는 **검증 불가**
- ❌ 학생이 스캔해도 백엔드 검증 시스템과 **호환되지 않음**

### 2. **보안 취약점**

#### 프론트엔드 QR 코드
- ❌ **위조 가능**: `Math.random()`으로 생성된 문자열은 누구나 생성 가능
- ❌ **서버 검증 없음**: 생성된 QR 코드가 유효한지 확인할 수 없음
- ❌ **재사용 가능**: 같은 QR 코드를 계속 사용 가능
- ❌ **만료 시간 의미 없음**: 클라이언트에서만 체크, 서버 검증 없음

#### 외부 API 사용
- ⚠️ **데이터 유출 위험**: QR 코드 내용이 외부 서버로 전송
- ⚠️ **의존성**: 외부 서비스 다운 시 QR 코드 생성 불가
- ⚠️ **개인정보**: QR 코드에 포함된 정보가 외부 서버에 전송될 수 있음

---

## 🔒 보안 분석

### 현재 프론트엔드 QR 코드 보안 수준: ⭐☆☆☆☆ (1/5)

**위험 요소:**
1. ❌ **위조 가능**: 누구나 `ROOMQR_XXXXX` 형식의 코드 생성 가능
2. ❌ **재사용 가능**: 같은 QR 코드를 계속 사용 가능
3. ❌ **서버 검증 없음**: 클라이언트에서만 생성 및 검증
4. ⚠️ **외부 데이터 전송**: QR 코드 내용이 외부 API로 전송

### 백엔드 QR 코드 보안 수준: ⭐⭐⭐⭐☆ (4/5)

**강점:**
1. ✅ **JWT 서명**: 위조 불가능
2. ✅ **시간 제한**: 1분마다 자동 갱신
3. ✅ **다중 검증**: 토큰, 위치, 시간, 기기 검증
4. ✅ **부정행위 감지**: 검증 실패 시 기록

---

## 🔧 권장 해결 방안

### 옵션 1: 백엔드 API 연동 (권장) ⭐

**프론트엔드에서 백엔드 API 호출:**
```typescript
// 정독실 QR 코드 생성 시
const generateQRCode = async (roomId: string) => {
  const response = await fetch(`/api/attendance/qr/image/${roomId}?expires_in=1`)
  const data = await response.json()
  return {
    code: data.token,  // JWT 토큰
    qrImage: data.qr_code_image,  // Base64 이미지
    expiresAt: data.expires_at
  }
}
```

**장점:**
- ✅ 보안 강화된 JWT 토큰 사용
- ✅ 서버 검증 가능
- ✅ 자동 갱신 시스템 활용
- ✅ 출석 시스템과 호환

**단점:**
- ⚠️ 백엔드 API 연동 필요
- ⚠️ 기존 코드 수정 필요

### 옵션 2: 하이브리드 방식

**프론트엔드:**
- QR 코드 생성은 백엔드 API 사용
- QR 이미지는 백엔드에서 받은 Base64 이미지 사용 (외부 API 불필요)

**장점:**
- ✅ 외부 API 의존성 제거
- ✅ 데이터 유출 방지
- ✅ 보안 강화

---

## 📋 현재 사용 흐름

### 정독실 관리 페이지
```
1. 페이지 로드
   ↓
2. Math.random()으로 QR 코드 생성 (ROOMQR_XXXXX)
   ↓
3. api.qrserver.com에 QR 코드 내용 전송
   ↓
4. 외부 서버에서 QR 이미지 생성
   ↓
5. 이미지 표시
```

### 문제점
- ❌ 생성된 QR 코드는 **검증 불가**
- ❌ 학생이 스캔해도 **출석 시스템과 연결 안 됨**
- ❌ 단순히 **표시만 하는 용도**

---

## 🎯 결론

### 현재 상태
1. **프론트엔드**: 단순 표시용 QR 코드 (보안 없음)
2. **백엔드**: 보안 강화된 출석 시스템 (사용되지 않음)
3. **연결**: 두 시스템이 **완전히 분리**됨

### 권장 사항
1. ✅ **프론트엔드를 백엔드 API와 연동**
2. ✅ **백엔드의 보안 QR 코드 시스템 활용**
3. ✅ **외부 API 제거** (백엔드에서 이미지 생성)
4. ✅ **출석 시스템과 통합**

이렇게 하면 정독실 관리에서 생성한 QR 코드를 학생이 스캔했을 때 실제로 출석이 기록되고, 보안 검증도 이루어집니다.

