#!/usr/bin/env lua
local frame = require'websocket.frame'
local socket = require'socket'
local encode = frame.encode
local TEXT = frame.TEXT
local s = string.rep('abc',100)

-- 순서가 보장된 테스트 목록 (ipairs로 결정적 순서 사용)
local tests = {
  { name = '---WITH XOR---', do_xor = true },
  { name = '---WITHOUT XOR---', do_xor = false }
}

for _, test in ipairs(tests) do
  local name = test.name
  local do_xor = test.do_xor
  print(name)
  local n = 1000000
  local t1 = socket.gettime()
  for i=1,n do
    encode(s,TEXT,do_xor)
  end
  local dt = socket.gettime() - t1
  print('n=',n)
  print('dt=',dt)
  print('ops/sec=',n/dt)
  print('microsec/op=',1000000*dt/n)
end
