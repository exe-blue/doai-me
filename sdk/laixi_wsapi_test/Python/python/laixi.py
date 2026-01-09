import json
import re


# 发送指定设备toast消息
def toastMsg(msg="这是来喜弹出的一个Toast提示", deviceIds="all"):
    # msg를 문자열로 변환하여 직렬화 오류 방지
    content = str(msg) if msg is not None else "这是来喜弹出的一个Toast提示"
    return json.dumps(
        {
            "action": "Toast",
            "comm": {
                "deviceIds": deviceIds,
                "content": content,
            },
        }
    )


# 通过app名称直接启动app
def launchApp(appName, deviceIds="all"):
    # 앱 패키지명 유효성 검사 (커맨드 인젝션 방지)
    if not appName or not re.match(r"^[A-Za-z0-9._]+$", appName):
        raise ValueError("Invalid appName: only letters, numbers, dots and underscores allowed")
    return json.dumps(
        {
            "action": "ADB",
            "comm": {
                "deviceIds": deviceIds,
                "command": "adb shell monkey -p "
                + appName
                + " -c android.intent.category.LAUNCHER 1",
            },
        }
    )


# /**
#  * 触屏操作
#  * @param {*} deviceIds 设备id 全部则 all
#  * @param {*} mask //0按下 1移动 2松开 3鼠标右键 4滚轮向上 5滚轮向下 6上滑 7下滑 8左滑 9右滑
#  * @param {*} x 坐标  百分比
#  * @param {*} y 坐标  百分比
#  * @param {*} endx 终止坐标  百分比
#  * @param {*} endy 终止坐标  百分比
#  * @param {*} delta 滚动参数 上 -2   下 2
#  * @returns
#  */
def pointEvent(deviceIds, mask, x="0.5", y="0.5", endx="0", endy="0", delta="2"):
    return json.dumps(
        {
            "action": "PointerEvent",
            "comm": {
                "deviceIds": deviceIds,  # 设备id
                "mask": mask,  # 0按下 1移动 2松开 3鼠标右键 4滚轮向上 5滚轮向下 6上滑 7下滑 8左滑 9右滑
                "x": x,
                "y": y,
                "endx": endx,
                "endy": endy,
                "delta": delta,
            },
        }
    )


# /**
#  * 列出关键词包名
#  * @param {*} keyword - 검색 키워드 (영문, 숫자, 밑줄, 하이픈만 허용)
#  * @param {*} deviceIds
#  * @returns
#  */
def listKeywordPackages(keyword, deviceIds="all"):
    # 키워드 유효성 검사 (커맨드 인젝션 방지)
    if not keyword or not re.match(r"^[A-Za-z0-9_-]+$", keyword):
        raise ValueError("Invalid keyword: only letters, numbers, underscores and hyphens allowed")
    return json.dumps(
        {
            "action": "ADB",
            "comm": {"deviceIds": deviceIds, "command": "pm list package | grep " + keyword},
        }
    )
