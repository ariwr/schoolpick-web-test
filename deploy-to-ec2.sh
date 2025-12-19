#!/bin/bash
# 전체 배포 자동화 스크립트

set -e

echo "🚀 SchoolPick Web 배포 시작..."

# 설정
EC2_USER="ubuntu"
EC2_HOST="3.35.3.225"
EC2_KEY="/Users/hjw/Desktop/Real_Project/godingpick_ec2_key.pem"
FRONTEND_DIR="frontend-teacher"
BACKEND_DIR="backend-teacher"
EC2_FRONTEND_DEST="/home/ubuntu/frontend-dist"
EC2_BACKEND_DEST="/home/ubuntu/backend-teacher"

# 1. 프론트엔드 빌드
echo "📦 프론트엔드 빌드 중..."
cd "$FRONTEND_DIR"
NEXT_PUBLIC_API_URL=http://web.godingpick.com:8000 npm run build
cd ..

# 2. 프론트엔드 전송
echo "📤 프론트엔드 파일 전송 중..."
scp -i "$EC2_KEY" -r "$FRONTEND_DIR/out" "$EC2_USER@$EC2_HOST:$EC2_FRONTEND_DEST"

# 3. 백엔드 전송 (압축)
echo "📤 백엔드 파일 전송 중..."
tar -czf /tmp/backend-teacher.tar.gz \
  --exclude='node_modules' \
  --exclude='venv' \
  --exclude='__pycache__' \
  --exclude='.git' \
  --exclude='*.pyc' \
  "$BACKEND_DIR/"
scp -i "$EC2_KEY" /tmp/backend-teacher.tar.gz "$EC2_USER@$EC2_HOST:/tmp/"

# 4. EC2에서 백엔드 배포 및 재시작
echo "🔄 EC2에서 백엔드 배포 중..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << 'EOF'
  # 백엔드 디렉토리 백업
  if [ -d ~/backend-teacher ]; then
    cp -r ~/backend-teacher ~/backend-teacher.backup.$(date +%Y%m%d_%H%M%S)
  fi
  
  # 압축 해제
  cd ~
  rm -rf backend-teacher
  tar -xzf /tmp/backend-teacher.tar.gz
  
  # 가상환경 활성화 및 의존성 설치
  cd backend-teacher
  if [ ! -d venv ]; then
    python3 -m venv venv
  fi
  source venv/bin/activate
  pip install -q --upgrade pip
  pip install -q -r requirements.txt
  
  # systemd 서비스 재시작
  sudo systemctl daemon-reload
  sudo systemctl restart backend-teacher
  sudo systemctl enable backend-teacher
  
  # 서비스 상태 확인
  sleep 3
  sudo systemctl status backend-teacher --no-pager | head -10
  
  # 헬스 체크
  sleep 2
  curl -s http://localhost:8000/health || echo "⚠️ 백엔드 서버 응답 없음"
EOF

# 5. Nginx 재시작
echo "🔄 Nginx 재시작 중..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "sudo nginx -t && sudo systemctl reload nginx"

echo "✅ 배포 완료!"
echo "🌐 http://web.godingpick.com 에서 확인하세요."

