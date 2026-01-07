const WebSocket = require("ws");
const { toastMsg, pointEvent, launchApp, listKeywordPackages } = require("./laixi")

const WS_URL = "ws://127.0.0.1:22221"

const socket = new WebSocket(WS_URL);
socket.onopen = async function () {
    console.info("连接开启")

    // 发送toast消息
    // socket.send(
    //     toastMsg("ToastMsg from wsapi-node"),
    //     () => console.log("toastMsg Done.")
    // )


    // 获取关键词包名  gallery、laixi等
    // socket.send(listKeywordPackages('laixi'), () => {
    //     socket.once("message", (data) => {
    //         console.info("包名", JSON.parse(data.toString()))
    //     })
    // })


    // 打开指定app 传入包名
    socket.send(
        launchApp("youhu.laixijs"),
        () => console.log("launchApp Done.")
    )

    // 下滑屏幕
    // socket.send(
    //     pointEvent('all', 7),
    //     () => console.log("pointEvent Done.")
    // )
};


socket.on("message", (data) => {
    console.info("msg", data.toString())
})


socket.onclose = function (event) {
    console.info("连接被关闭")
};

