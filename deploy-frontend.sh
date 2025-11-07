#!/bin/bash
# 프론트엔드 배포 스크립트

set -e

echo "🚀 프론트엔드 배포 시작..."

# 경로 설정
FRONTEND_DIR="frontend-teacher"
EC2_USER="ubuntu"
EC2_HOST="3.35.3.225"
EC2_KEY="/Users/hjw/Desktop/Real_Project/godingpick_ec2_key.pem"
EC2_DEST="/home/ubuntu/frontend-dist"

# 1. 프론트엔드 빌드
echo "📦 프론트엔드 빌드 중..."
cd "$FRONTEND_DIR"
NEXT_PUBLIC_API_URL=http://web.godingpick.com:8000 npm run build

# 2. EC2로 전송
echo "📤 EC2로 파일 전송 중..."
cd ..
scp -i "$EC2_KEY" -r "$FRONTEND_DIR/out" "$EC2_USER@$EC2_HOST:$EC2_DEST"

echo "✅ 배포 완료!"
echo "🌐 http://web.godingpick.com 에서 확인하세요."

