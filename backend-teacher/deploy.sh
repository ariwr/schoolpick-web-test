#!/bin/bash
# EC2 배포 스크립트

echo "🚀 SchoolPick Teacher Backend 배포 시작..."

# 환경변수 설정
export DOCKER_IMAGE_NAME="schoolpick-teacher-backend"
export DOCKER_TAG="latest"
export CONTAINER_NAME="schoolpick-teacher-backend"

# 기존 컨테이너 중지 및 제거
echo "📦 기존 컨테이너 정리..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Docker 이미지 빌드
echo "🔨 Docker 이미지 빌드..."
docker build -t $DOCKER_IMAGE_NAME:$DOCKER_TAG .

# 새 컨테이너 실행
echo "🚀 새 컨테이너 실행..."
docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -p 8000:8000 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e SECRET_KEY="$SECRET_KEY" \
  -e DEBUG=False \
  -e ENVIRONMENT=production \
  $DOCKER_IMAGE_NAME:$DOCKER_TAG

# 컨테이너 상태 확인
echo "✅ 배포 완료! 컨테이너 상태 확인..."
docker ps | grep $CONTAINER_NAME

echo "🎉 배포가 성공적으로 완료되었습니다!"
echo "📊 애플리케이션 로그: docker logs $CONTAINER_NAME"
echo "🔍 실시간 로그: docker logs -f $CONTAINER_NAME"
