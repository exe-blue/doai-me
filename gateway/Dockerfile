# DoAi.Me Gateway Server Dockerfile
# Node.js + Express + adbkit

FROM node:18-alpine

# 필수 패키지 설치 (ADB 통신용)
RUN apk add --no-cache \
    android-tools \
    python3 \
    make \
    g++

# 작업 디렉토리
WORKDIR /app

# 로그 디렉토리 생성
RUN mkdir -p /app/logs

# 패키지 파일 복사 (client 포함)
COPY package.json ./
COPY client/package.json ./client/

# 의존성 설치
RUN npm install --omit=dev

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 3100

# 실행
CMD ["node", "server.js"]

