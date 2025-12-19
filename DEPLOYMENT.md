# 🚀 web.godingpick.com 배포 가이드

## 📋 배포 전 체크리스트

### 1. DNS 설정 확인
- [ ] Route 53 또는 DNS 제공자에서 `web.godingpick.com` A 레코드가 EC2 IP(`3.35.3.225`)를 가리키는지 확인
- [ ] DNS 전파 확인: `nslookup web.godingpick.com` 또는 `dig web.godingpick.com`

### 2. EC2 보안 그룹 설정
- [ ] 포트 80 (HTTP) 인바운드 허용
- [ ] 포트 443 (HTTPS) 인바운드 허용
- [ ] 포트 8000 (백엔드)는 로컬호스트에서만 접근 가능 (Nginx 프록시 사용)

### 3. 환경변수 설정
- [ ] `/home/ubuntu/backend-web.env` 파일에 모든 필요한 환경변수 설정 확인
  - `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`
  - `SECRET_KEY`
  - `ALLOWED_ORIGINS` (프론트엔드 도메인 포함)

---

## 🔧 초기 설정 (최초 1회만)

### 1. Nginx 설정 파일 복사

```bash
# 로컬에서
scp -i /Users/hjw/Desktop/Real_Project/godingpick_ec2_key.pem \
  nginx-web.godingpick.com.conf \
  ubuntu@3.35.3.225:/tmp/

# EC2에서
ssh -i /Users/hjw/Desktop/Real_Project/godingpick_ec2_key.pem ubuntu@3.35.3.225
sudo cp /tmp/nginx-web.godingpick.com.conf /etc/nginx/sites-available/web.godingpick.com
sudo ln -sf /etc/nginx/sites-available/web.godingpick.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 2. SSL 인증서 설정

```bash
# EC2에서
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급 (이메일 주소 변경 필요)
sudo certbot --nginx -d web.godingpick.com \
  --non-interactive \
  --agree-tos \
  --email your-email@example.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

### 3. 백엔드 systemd 서비스 설정

```bash
# 로컬에서
scp -i /Users/hjw/Desktop/Real_Project/godingpick_ec2_key.pem \
  backend-teacher.service \
  ubuntu@3.35.3.225:/tmp/

# EC2에서
sudo cp /tmp/backend-teacher.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable backend-teacher
sudo systemctl start backend-teacher
sudo systemctl status backend-teacher
```

---

## 🚀 정기 배포 (코드 업데이트 시)

### 자동 배포 스크립트 사용 (권장)

```bash
cd /Users/hjw/Desktop/Real_Project/heartware_highschool/schoolpick-web
./deploy-to-ec2.sh
```

### 수동 배포

#### 1. 프론트엔드 배포

```bash
# 로컬에서 빌드
cd frontend-teacher
NEXT_PUBLIC_API_URL=http://web.godingpick.com:8000 npm run build

# EC2로 전송
cd ..
scp -i /Users/hjw/Desktop/Real_Project/godingpick_ec2_key.pem \
  -r frontend-teacher/out \
  ubuntu@3.35.3.225:/home/ubuntu/frontend-dist
```

#### 2. 백엔드 배포

```bash
# 로컬에서 압축
cd backend-teacher
tar -czf /tmp/backend-teacher.tar.gz \
  --exclude='node_modules' \
  --exclude='venv' \
  --exclude='__pycache__' \
  --exclude='.git' \
  .

# EC2로 전송
scp -i /Users/hjw/Desktop/Real_Project/godingpick_ec2_key.pem \
  /tmp/backend-teacher.tar.gz \
  ubuntu@3.35.3.225:/tmp/

# EC2에서 배포
ssh -i /Users/hjw/Desktop/Real_Project/godingpick_ec2_key.pem ubuntu@3.35.3.225 << 'EOF'
  cd ~
  rm -rf backend-teacher
  tar -xzf /tmp/backend-teacher.tar.gz
  cd backend-teacher
  source venv/bin/activate
  pip install -q -r requirements.txt
  sudo systemctl restart backend-teacher
EOF
```

---

## 🔍 모니터링 및 로그 확인

### 백엔드 서버 상태 확인

```bash
# EC2에서
sudo systemctl status backend-teacher
ps aux | grep uvicorn | grep -v grep
curl http://localhost:8000/health
```

### 로그 확인

```bash
# 백엔드 로그
tail -f ~/backend-teacher/server.log

# Nginx 액세스 로그
sudo tail -f /var/log/nginx/web.godingpick.com_access.log

# Nginx 에러 로그
sudo tail -f /var/log/nginx/web.godingpick.com_error.log
```

### 서비스 재시작

```bash
# 백엔드 재시작
sudo systemctl restart backend-teacher

# Nginx 재시작
sudo systemctl restart nginx
```

---

## 🐛 문제 해결

### 백엔드 서버가 시작되지 않는 경우

1. 환경변수 확인: `cat /home/ubuntu/backend-web.env`
2. 가상환경 확인: `source ~/backend-teacher/venv/bin/activate && which python`
3. 의존성 확인: `pip list`
4. 로그 확인: `tail -50 ~/backend-teacher/server.log`

### Nginx 502 Bad Gateway

1. 백엔드 서버 실행 확인: `curl http://localhost:8000/health`
2. 포트 확인: `netstat -tlnp | grep 8000`
3. Nginx 설정 확인: `sudo nginx -t`

### 프론트엔드가 표시되지 않는 경우

1. 파일 권한 확인: `ls -la /home/ubuntu/frontend-dist`
2. Nginx 설정 확인: `sudo nginx -t`
3. Nginx 에러 로그 확인: `sudo tail -f /var/log/nginx/web.godingpick.com_error.log`

---

## 📝 참고사항

- 프론트엔드는 정적 파일로 빌드되어 Nginx로 서빙됩니다
- 백엔드는 FastAPI (Uvicorn)로 실행되며 systemd로 관리됩니다
- SSL 인증서는 Let's Encrypt로 자동 갱신됩니다 (90일마다)
- 환경변수는 `/home/ubuntu/backend-web.env`에서 관리됩니다

