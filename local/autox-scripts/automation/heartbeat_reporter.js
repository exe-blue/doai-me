/**
 * heartbeat_reporter.js
 * AutoX.js script for device heartbeat reporting
 * Runs in background and reports device status to server
 */

// Configuration
const CONFIG = {
  serverUrl: 'http://192.168.1.100:3000',
  heartbeatIntervalMs: 30000,
  enabled: true
};

// State
let currentMode = 'idle';  // idle, queue, stopped
let currentTaskId = null;
let lastHeartbeatTime = null;

// ===== Device Info =====

function getDeviceInfo() {
  return {
    serial: device.serial || device.getIMEI() || 'unknown',
    model: device.model || 'unknown',
    brand: device.brand || 'unknown',
    sdkInt: device.sdkInt || 0,
    release: device.release || 'unknown',
    screenWidth: device.width,
    screenHeight: device.height
  };
}

function getBatteryLevel() {
  try {
    const batteryManager = context.getSystemService(context.BATTERY_SERVICE);
    if (batteryManager) {
      return batteryManager.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_CAPACITY);
    }
  } catch (e) {
    // Fallback method
    try {
      const intent = context.registerReceiver(null,
        new android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED));
      if (intent) {
        const level = intent.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1);
        const scale = intent.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, -1);
        if (level >= 0 && scale > 0) {
          return Math.round((level / scale) * 100);
        }
      }
    } catch (e2) {
      log('Battery check failed: ' + e2.message);
    }
  }
  return -1;
}

function isYouTubeRunning() {
  try {
    const pkgName = 'com.google.android.youtube';
    return currentPackage() === pkgName;
  } catch (e) {
    return false;
  }
}

function getNetworkStatus() {
  try {
    const connectivityManager = context.getSystemService(context.CONNECTIVITY_SERVICE);
    if (connectivityManager) {
      const networkInfo = connectivityManager.getActiveNetworkInfo();
      if (networkInfo && networkInfo.isConnected()) {
        return networkInfo.getTypeName();
      }
    }
    return 'disconnected';
  } catch (e) {
    return 'unknown';
  }
}

// ===== Heartbeat =====

function sendHeartbeat() {
  const deviceInfo = getDeviceInfo();
  const batteryLevel = getBatteryLevel();
  const youtubeRunning = isYouTubeRunning();
  const networkStatus = getNetworkStatus();

  const heartbeatData = {
    deviceSerial: deviceInfo.serial,
    status: currentMode === 'stopped' ? 'idle' : 'busy',
    batteryLevel: batteryLevel,
    currentMode: currentMode,
    currentTaskId: currentTaskId,
    metadata: {
      deviceInfo: deviceInfo,
      youtubeRunning: youtubeRunning,
      networkStatus: networkStatus,
      timestamp: Date.now()
    }
  };

  try {
    const response = http.postJson(CONFIG.serverUrl + '/api/automation/heartbeat', heartbeatData);

    if (response.statusCode === 200) {
      lastHeartbeatTime = Date.now();
      log('Heartbeat sent successfully');

      // Check for commands in response
      try {
        const responseData = JSON.parse(response.body.string());
        if (responseData.command) {
          handleCommand(responseData.command);
        }
      } catch (e) {
        // No command or parse error
      }
    } else {
      log('Heartbeat failed: ' + response.statusCode);
    }
  } catch (error) {
    log('Heartbeat error: ' + error.message);
  }
}

function handleCommand(command) {
  log('Received command: ' + command.type);

  switch (command.type) {
    case 'START_IDLE':
      currentMode = 'idle';
      // Broadcast to idle automation script
      app.sendBroadcast({
        action: 'com.automation.START_IDLE'
      });
      break;

    case 'STOP_IDLE':
      currentMode = 'stopped';
      app.sendBroadcast({
        action: 'com.automation.STOP_IDLE'
      });
      break;

    case 'PAUSE_IDLE':
      app.sendBroadcast({
        action: 'com.automation.PAUSE_IDLE'
      });
      break;

    case 'RESUME_IDLE':
      app.sendBroadcast({
        action: 'com.automation.RESUME_IDLE'
      });
      break;

    case 'PROCESS_VIDEO':
      currentMode = 'queue';
      currentTaskId = command.videoId;
      app.sendBroadcast({
        action: 'com.automation.PROCESS_VIDEO',
        extra: JSON.stringify(command.video)
      });
      break;

    case 'STOP_ALL':
      currentMode = 'stopped';
      currentTaskId = null;
      app.sendBroadcast({ action: 'com.automation.STOP_IDLE' });
      app.sendBroadcast({ action: 'com.automation.STOP_QUEUE' });
      break;

    default:
      log('Unknown command: ' + command.type);
  }
}

// ===== Broadcast Receiver =====

events.on('broadcast', function(action, extra) {
  // Update state based on other automation scripts
  if (action === 'com.automation.MODE_CHANGED') {
    try {
      const data = JSON.parse(extra);
      currentMode = data.mode;
      currentTaskId = data.taskId;
    } catch (e) {
      log('Mode change parse error: ' + e.message);
    }
  }
});

// ===== Main Loop =====

function startHeartbeatLoop() {
  log('Starting heartbeat loop');

  setInterval(function() {
    if (CONFIG.enabled) {
      sendHeartbeat();
    }
  }, CONFIG.heartbeatIntervalMs);

  // Send initial heartbeat
  sendHeartbeat();
}

// ===== Entry Point =====

log('Heartbeat reporter starting...');
log('Device: ' + device.serial);
log('Interval: ' + CONFIG.heartbeatIntervalMs + 'ms');

// Start the heartbeat loop
startHeartbeatLoop();

// Keep script running
setInterval(function() {
  // Keep alive
}, 60000);

log('Heartbeat reporter running');
