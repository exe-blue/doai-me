package.path = package.path .. ";./lua-websockets/?.lua"
local ws_client = require('websocket.client_sync')()
local laixi = require('laixi')()

-- connect 결과 확인
local success, err = ws_client:connect('ws://127.0.0.1:22221', 'echo')
if not success then
    print('WebSocket 연결 실패: ' .. (err or 'unknown error'))
    return
end

-- toastMsg 发送toast消息
ws_client:send(laixi:toastMsg('Toast from wsapi by Lua.'), 1)

-- launchApp  打开指定app  传入包名
ws_client:send(laixi:launchApp('youhu.laixijs'), 1)

-- pointEvent 屏幕操作 下滑屏幕
ws_client:send(laixi:pointEvent('all', 7), 1)

-- listKeywordPackages  获取关键词包名
ws_client:send(laixi:listKeywordPackages('laixi'), 1)

local rec_msg = ws_client:receive()
print(rec_msg)

-- 사용 완료 후 명시적으로 닫기
ws_client:close()

