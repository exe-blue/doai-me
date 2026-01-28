local laixi = function()

    local self = {}

    self.toastMsg = function(self, msg, deviceIds)
        deviceIds = deviceIds or "all"
        return '{"action":"Toast","comm":{"deviceIds":"' .. deviceIds .. '","content":"' .. msg .. '"}}'
    end

    self.launchApp = function(self, appName, deviceIds)
        deviceIds = deviceIds or "all"
        return '{"action":"ADB","comm":{"deviceIds":"' .. deviceIds .. '","command":"adb shell monkey -p ' .. appName ..
                   '-c android.intent.category.LAUNCHER 1"}}'
    end

    -- * 这里的all代表所有手机,也可以指定 连接名,例如 a83dhuias,hudisw7812
    -- * 触屏操作
    -- * @param {*} deviceIds 设备id 全部则 all
    -- * @param {*} mask //0按下 1移动 2松开 3鼠标右键 4滚轮向上 5滚轮向下 6上滑 7下滑 8左滑 9右滑
    -- * @param {*} x 坐标  百分比
    -- * @param {*} y 坐标  百分比
    -- * @param {*} endx 终止坐标  百分比
    -- * @param {*} endy 终止坐标  百分比
    -- * @param {*} delta 滚动参数 上 -2   下 2
    self.pointEvent = function(self, deviceIds, mask, x, y, endx, endy, delta)
        deviceIds = deviceIds or "all"
        mask = mask or "0"
        x = x or "0.5"
        y = y or "0.5"
        endx = endx or "0"
        endy = endy or "0"
        delta = delta or "2"
        return
            '{"action":"PointerEvent","comm":{"deviceIds":"' .. deviceIds .. '","mask":"' .. mask .. '","x":"' .. x ..
                '","y":"' .. y .. '","endx":"' .. endx .. '","endy":"' .. endy .. '","delta":"' .. delta .. '"}}'
    end

    self.listKeywordPackages = function(self, keyword, deviceIds)
        deviceIds = deviceIds or "all"
        return '{"action":"ADB","comm":{"deviceIds":"' .. deviceIds .. '","command":"pm list package | grep  ' ..
                   keyword .. '"}}'
    end

    return self
end

return laixi
