/**
 * idle_automation.js
 * AutoX.js script for idle mode YouTube watching
 * Runs on Android device via AutoX.js framework
 *
 * Communication:
 * - Receives commands via ADB broadcast
 * - Reports results back to server via HTTP
 */

'ui';

// Configuration
const CONFIG = {
  serverUrl: 'http://192.168.1.100:3000',  // Gateway server URL
  heartbeatIntervalMs: 30000,
  delayMinMs: 3000,
  delayMaxMs: 7000,
  clickErrorPx: 20,
  watchMinSeconds: 5,
  watchMaxSeconds: 60,
  likeProbability: 0.10,
  commentProbability: 0.05
};

// State
let isRunning = false;
let isPaused = false;
let currentTask = null;

// ===== Human Simulation =====

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDelay() {
  return randomInt(CONFIG.delayMinMs, CONFIG.delayMaxMs);
}

function randomClick(x, y) {
  const offsetX = randomInt(-CONFIG.clickErrorPx, CONFIG.clickErrorPx);
  const offsetY = randomInt(-CONFIG.clickErrorPx, CONFIG.clickErrorPx);
  return {
    x: Math.max(0, x + offsetX),
    y: Math.max(0, y + offsetY)
  };
}

function shouldOccur(probability) {
  return Math.random() < probability;
}

// ===== YouTube Actions =====

function launchYouTube() {
  log('Launching YouTube');
  app.launch('com.google.android.youtube');
  sleep(3000);
}

function tapSearchIcon() {
  const screenWidth = device.width;
  const pos = randomClick(screenWidth * 0.85, 100);
  click(pos.x, pos.y);
  sleep(randomDelay() / 2);
}

function inputSearchText(keyword) {
  log('Searching: ' + keyword);

  // Tap search input
  const screenWidth = device.width;
  click(screenWidth / 2, 100);
  sleep(500);

  // Input text
  setText(keyword);
  sleep(300);

  // Press enter
  KeyCode('KEYCODE_ENTER');
  sleep(2000);
}

function scrollResults() {
  const scrollCount = randomInt(1, 5);
  log('Scrolling ' + scrollCount + ' times');

  for (let i = 0; i < scrollCount; i++) {
    const startY = device.height * 0.7;
    const endY = device.height * 0.3;
    swipe(device.width / 2, startY, device.width / 2, endY, 500);
    sleep(randomInt(500, 1500));
  }

  return scrollCount;
}

function selectVideo(rank) {
  log('Selecting video rank: ' + rank);

  const yPositions = [0.25, 0.40, 0.55, 0.70, 0.85];
  const y = device.height * yPositions[Math.min(rank - 1, yPositions.length - 1)];
  const pos = randomClick(device.width / 2, y);

  click(pos.x, pos.y);
  sleep(2000);
}

function watchVideo(durationSeconds) {
  log('Watching for ' + durationSeconds + ' seconds');

  const startTime = Date.now();
  let elapsed = 0;

  while (elapsed < durationSeconds * 1000) {
    // Check if paused or stopped
    if (!isRunning || isPaused) {
      break;
    }

    // Random touch occasionally
    if (Math.random() < 0.05) {
      const pos = randomClick(device.width / 2, device.height * 0.3);
      click(pos.x, pos.y);
    }

    sleep(5000);
    elapsed = Date.now() - startTime;
  }

  return Math.round(elapsed / 1000);
}

function clickLike() {
  log('Clicking like');
  const pos = randomClick(device.width * 0.15, device.height * 0.35);
  click(pos.x, pos.y);
  sleep(1000);
}

function writeComment(comment) {
  log('Writing comment');

  // Scroll to comments
  swipe(device.width / 2, device.height * 0.7, device.width / 2, device.height * 0.3, 500);
  sleep(1500);

  // Tap comment section
  const pos = randomClick(device.width / 2, device.height * 0.8);
  click(pos.x, pos.y);
  sleep(1000);

  // Write comment
  setText(comment);
  sleep(500);

  // Post
  KeyCode('KEYCODE_ENTER');
  sleep(1000);
}

function pressBack() {
  back();
  sleep(1000);
}

// ===== Main Loop =====

function runIdleCycle(keyword) {
  const result = {
    keyword: keyword,
    success: false,
    watchDuration: 0,
    scrollCount: 0,
    liked: false,
    commented: false,
    error: null
  };

  try {
    // Launch YouTube
    launchYouTube();
    sleep(randomDelay());

    // Search
    tapSearchIcon();
    inputSearchText(keyword);
    sleep(randomDelay());

    // Scroll
    result.scrollCount = scrollResults();

    // Select video
    const rank = randomInt(1, 5);
    selectVideo(rank);
    sleep(randomDelay());

    // Watch
    const watchDuration = randomInt(CONFIG.watchMinSeconds, CONFIG.watchMaxSeconds);
    result.watchDuration = watchVideo(watchDuration);

    // Like
    if (shouldOccur(CONFIG.likeProbability)) {
      clickLike();
      result.liked = true;
    }

    // Comment (would need comment text from server)
    // if (shouldOccur(CONFIG.commentProbability)) {
    //   writeComment('좋은 영상이네요!');
    //   result.commented = true;
    // }

    // Go back
    pressBack();

    result.success = true;

  } catch (error) {
    result.error = error.message;
    log('Cycle error: ' + error.message);
  }

  return result;
}

// ===== Communication =====

function reportResult(result) {
  try {
    const response = http.postJson(CONFIG.serverUrl + '/api/automation/report', {
      type: 'idle_cycle',
      deviceId: device.serial,
      result: result,
      timestamp: Date.now()
    });
    log('Report sent: ' + response.statusCode);
  } catch (error) {
    log('Report failed: ' + error.message);
  }
}

function fetchKeyword() {
  try {
    const response = http.get(CONFIG.serverUrl + '/api/automation/keyword?deviceId=' + device.serial);
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body.string());
      return data.keyword;
    }
  } catch (error) {
    log('Keyword fetch failed: ' + error.message);
  }

  // Fallback keywords
  const fallbacks = ['음악', '게임', 'vlog', '영화', '리뷰'];
  return fallbacks[randomInt(0, fallbacks.length - 1)];
}

// ===== Broadcast Receiver =====

events.on('broadcast', function(action, extra) {
  log('Broadcast received: ' + action);

  if (action === 'com.automation.START_IDLE') {
    isRunning = true;
    isPaused = false;
    threads.start(mainLoop);
  }

  if (action === 'com.automation.STOP_IDLE') {
    isRunning = false;
  }

  if (action === 'com.automation.PAUSE_IDLE') {
    isPaused = true;
  }

  if (action === 'com.automation.RESUME_IDLE') {
    isPaused = false;
  }
});

// ===== Main Entry =====

function mainLoop() {
  log('Idle automation started');

  while (isRunning) {
    if (isPaused) {
      sleep(1000);
      continue;
    }

    // Get keyword
    const keyword = fetchKeyword();
    log('Using keyword: ' + keyword);

    // Run cycle
    const result = runIdleCycle(keyword);

    // Report result
    reportResult(result);

    // Delay before next cycle
    sleep(randomDelay());
  }

  log('Idle automation stopped');
}

// UI
ui.layout(
  <vertical padding="16">
    <text text="YouTube Idle Automation" textSize="20sp" textStyle="bold"/>
    <text id="status" text="Status: Stopped" marginTop="16"/>
    <button id="startBtn" text="Start" marginTop="16"/>
    <button id="stopBtn" text="Stop"/>
  </vertical>
);

ui.startBtn.on('click', function() {
  isRunning = true;
  isPaused = false;
  ui.status.setText('Status: Running');
  threads.start(mainLoop);
});

ui.stopBtn.on('click', function() {
  isRunning = false;
  ui.status.setText('Status: Stopped');
});
