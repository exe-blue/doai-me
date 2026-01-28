#!/usr/bin/env sh
mkdir min
mkdir min/src
mkdir min/src/websocket

# 안전한 파일명 처리를 위해 while read 루프 사용
find src -name "*.lua" -print0 | while IFS= read -r -d '' i
do
  echo "minifying" "$i"
  luamin -f "$i" > "min/$i"
done
