import asyncio
import json

import laixi
import websockets

# 프로토콜 종료 마커 (빈 문자열 대신 명시적인 종료 메시지 사용)
CLOSE_MARKER = "__CLOSE__"


async def command(url, cmdStr):
    try:
        async with websockets.connect(url) as websocket:
            await websocket.send(cmdStr)
            print("发送cmd", cmdStr)
            while True:
                try:
                    recv_text = await websocket.recv()
                    print(">{}".format(recv_text))

                    # 종료 조건: 명시적인 종료 마커 또는 JSON "type":"close" 메시지
                    # 빈 문자열은 유효한 메시지일 수 있으므로 종료 조건으로 사용하지 않음
                    if recv_text == CLOSE_MARKER:
                        print("Received close marker, terminating.")
                        break

                    # JSON 메시지의 경우 type 필드 확인
                    try:
                        msg = json.loads(recv_text)
                        if isinstance(msg, dict) and msg.get("type") == "close":
                            print("Received close message, terminating.")
                            break
                    except (json.JSONDecodeError, TypeError):
                        # JSON이 아닌 메시지는 계속 처리
                        pass

                except websockets.exceptions.ConnectionClosed:
                    print("WebSocket connection closed")
                    break
    except websockets.exceptions.WebSocketException as e:
        print(f"WebSocket error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")


# 发送指定设备toast消息
asyncio.get_event_loop().run_until_complete(
    command("ws://127.0.0.1:22221", laixi.toastMsg("This is wsapi-demo from Python."))
)

# 查询符合关键词包名
# asyncio.get_event_loop().run_until_complete(
#     command('ws://127.0.0.1:22221',
#             laixi.listKeywordPackages('laixi'))
# )

# 运行指定包名的程序
# asyncio.get_event_loop().run_until_complete(
#     command('ws://127.0.0.1:22221',
#             laixi.launchApp('youhu.laixijs'))
# )

# 触屏操作
# asyncio.get_event_loop().run_until_complete(
#     command('ws://127.0.0.1:22221',
#             laixi.pointEvent('all', 7))
# )
