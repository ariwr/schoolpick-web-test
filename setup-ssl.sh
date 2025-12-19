#!/bin/bash
# SSL 인증서 설정 스크립트 (EC2에서 실행)

echo "🔒 SSL 인증서 설정 시작..."

# Certbot 설치
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급 (자동으로 Nginx 설정 업데이트)
sudo certbot --nginx -d web.godingpick.com --non-interactive --agree-tos --email your-email@example.com

# 자동 갱신 테스트
sudo certbot renew --dry-run

echo "✅ SSL 인증서 설정 완료!"
echo "🌐 https://web.godingpick.com 으로 접속 가능합니다."

