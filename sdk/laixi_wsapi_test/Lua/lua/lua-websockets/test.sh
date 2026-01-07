#!/bin/bash
# 기존 echows.js 프로세스만 종료 (시스템 전체 Node.js 프로세스가 아님)
pkill -f "node echows.js" 2>/dev/null || true
npm install ws
node echows.js ${LUAWS_WSTEST_PORT:=11000} &
pid=$!
echo "Waiting for wstest to start..."
sleep 5
busted -c spec/
bustedcode=$?
kill ${pid}
exit $bustedcode
