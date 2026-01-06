/**
 * Device Status Script (AutoX.js)
 *
 * 디바이스 상태 정보 수집
 * 배터리, 네트워크, 앱 상태 등
 *
 * @returns {Object} 디바이스 상태 정보
 */

// ═══════════════════════════════════════════════════════════
// 메인 함수
// ═══════════════════════════════════════════════════════════

function main() {
    log('[DeviceStatus] 상태 수집 시작');

    const status = {
        timestamp: new Date().toISOString(),
        battery: getBatteryInfo(),
        network: getNetworkInfo(),
        display: getDisplayInfo(),
        memory: getMemoryInfo(),
        apps: getAppStatus(),
        device: getDeviceInfo()
    };

    log('[DeviceStatus] 상태 수집 완료');
    return status;
}

// ═══════════════════════════════════════════════════════════
// 배터리 정보
// ═══════════════════════════════════════════════════════════

function getBatteryInfo() {
    try {
        const batteryManager = context.getSystemService(
            context.BATTERY_SERVICE
        );

        return {
            level: device.battery,
            isCharging: device.isCharging,
            health: 'good'
        };
    } catch (e) {
        return {
            level: device.battery || 100,
            isCharging: device.isCharging || false,
            health: 'unknown'
        };
    }
}

// ═══════════════════════════════════════════════════════════
// 네트워크 정보
// ═══════════════════════════════════════════════════════════

function getNetworkInfo() {
    try {
        const wifiEnabled = device.wifiEnabled;
        const dataEnabled = device.dataEnabled;

        return {
            wifi: {
                enabled: wifiEnabled,
                connected: wifiEnabled,
                ssid: getWifiSSID()
            },
            mobile: {
                enabled: dataEnabled,
                type: getMobileNetworkType()
            },
            isOnline: wifiEnabled || dataEnabled
        };
    } catch (e) {
        return {
            wifi: { enabled: false, connected: false },
            mobile: { enabled: false },
            isOnline: false,
            error: e.message
        };
    }
}

function getWifiSSID() {
    try {
        const wifiManager = context.getSystemService(
            android.content.Context.WIFI_SERVICE
        );
        const wifiInfo = wifiManager.getConnectionInfo();
        return wifiInfo.getSSID().replace(/"/g, '');
    } catch (e) {
        return 'unknown';
    }
}

function getMobileNetworkType() {
    try {
        const telephonyManager = context.getSystemService(
            android.content.Context.TELEPHONY_SERVICE
        );
        const networkType = telephonyManager.getNetworkType();

        const types = {
            0: 'unknown',
            1: '2G (GPRS)',
            2: '2G (EDGE)',
            3: '3G (UMTS)',
            4: '3G (CDMA)',
            5: '3G (EVDO_0)',
            6: '3G (EVDO_A)',
            7: '3G (1xRTT)',
            8: '3G (HSDPA)',
            9: '3G (HSUPA)',
            10: '3G (HSPA)',
            11: '3G (iDEN)',
            12: '3G (EVDO_B)',
            13: '4G (LTE)',
            14: '4G (eHRPD)',
            15: '3G (HSPA+)',
            16: '4G (GSM)',
            17: '4G (TD_SCDMA)',
            18: '4G (IWLAN)',
            19: '4G (LTE_CA)',
            20: '5G (NR)'
        };

        return types[networkType] || `unknown (${networkType})`;
    } catch (e) {
        return 'unknown';
    }
}

// ═══════════════════════════════════════════════════════════
// 화면 정보
// ═══════════════════════════════════════════════════════════

function getDisplayInfo() {
    return {
        width: device.width,
        height: device.height,
        brightness: device.brightness,
        isScreenOn: device.isScreenOn
    };
}

// ═══════════════════════════════════════════════════════════
// 메모리 정보
// ═══════════════════════════════════════════════════════════

function getMemoryInfo() {
    try {
        const activityManager = context.getSystemService(
            android.content.Context.ACTIVITY_SERVICE
        );
        const memInfo = new android.app.ActivityManager.MemoryInfo();
        activityManager.getMemoryInfo(memInfo);

        const totalMB = Math.round(memInfo.totalMem / (1024 * 1024));
        const availMB = Math.round(memInfo.availMem / (1024 * 1024));

        return {
            total: totalMB,
            available: availMB,
            used: totalMB - availMB,
            usagePercent: Math.round(((totalMB - availMB) / totalMB) * 100),
            lowMemory: memInfo.lowMemory
        };
    } catch (e) {
        return {
            total: 0,
            available: 0,
            error: e.message
        };
    }
}

// ═══════════════════════════════════════════════════════════
// 앱 상태
// ═══════════════════════════════════════════════════════════

function getAppStatus() {
    const currentPkg = currentPackage();
    const currentAct = currentActivity();

    // YouTube 설치 및 버전 확인
    const youtubeInfo = getAppInfo('com.google.android.youtube');

    return {
        current: {
            package: currentPkg,
            activity: currentAct
        },
        youtube: youtubeInfo,
        autoxjs: {
            running: true,
            version: app.autojs.versionName || 'unknown'
        }
    };
}

function getAppInfo(packageName) {
    try {
        const pm = context.getPackageManager();
        const appInfo = pm.getPackageInfo(packageName, 0);

        return {
            installed: true,
            version: appInfo.versionName,
            versionCode: appInfo.versionCode,
            enabled: pm.getApplicationEnabledSetting(packageName) !==
                     android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED
        };
    } catch (e) {
        return {
            installed: false,
            error: e.message
        };
    }
}

// ═══════════════════════════════════════════════════════════
// 디바이스 정보
// ═══════════════════════════════════════════════════════════

function getDeviceInfo() {
    return {
        brand: device.brand,
        model: device.model,
        product: device.product,
        sdkInt: device.sdkInt,
        release: device.release,
        serial: device.serial,
        imei: getIMEI()
    };
}

function getIMEI() {
    try {
        const telephonyManager = context.getSystemService(
            android.content.Context.TELEPHONY_SERVICE
        );
        return telephonyManager.getDeviceId() || 'unavailable';
    } catch (e) {
        return 'permission_denied';
    }
}

// ═══════════════════════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════════════════════

function log(msg) {
    console.log(msg);
}

// ═══════════════════════════════════════════════════════════
// 실행
// ═══════════════════════════════════════════════════════════

main();
