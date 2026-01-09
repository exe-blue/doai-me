/**
 * queue_automation.js
 * AutoX.js script for queue mode YouTube watching
 * Handles priority video campaigns with targeted watching
 */

'ui';

// Configuration
const CONFIG = {
  serverUrl: 'http://192.168.1.100:3000',
  delayMinMs: 5000,
  delayMaxMs: 10000,
  clickErrorPx: 20,
  adSkipWaitMinMs: 7000,
  adSkipWaitMaxMs: 20000,
  watchMinSeconds: 120,
  watchMaxSeconds: 600
};

// Random action probabilities (per second)
const RANDOM_ACTIONS = {
  backDouble: 0.01,
  forwardDouble: 0.01,
  scrollComments: 0.01
};

// State
let isRunning = false;
let currentVideo = null;
let actionsPerformed = [];

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

function searchByTitle(title) {
  log('Searching by title: ' + title);

  // Tap search icon
  const pos1 = randomClick(device.width * 0.85, 100);
  click(pos1.x, pos1.y);
  sleep(randomInt(500, 1000));

  // Tap search input
  click(device.width / 2, 100);
  sleep(300);

  // Set clipboard and paste (for Korean support)
  setClip(title);
  sleep(200);

  // Long press to paste
  longClick(device.width / 2, 100);
  sleep(500);

  // Find and click paste option
  const pasteBtn = text('붙여넣기').findOne(3000) || text('Paste').findOne(1000);
  if (pasteBtn) {
    pasteBtn.click();
    sleep(500);
  } else {
    // Fallback to setText
    setText(title);
  }

  // Press enter
  KeyCode('KEYCODE_ENTER');
  sleep(3000);
}

function findAndClickTitle(targetTitle, maxScrolls) {
  log('Looking for video: ' + targetTitle);

  for (let scroll = 0; scroll < maxScrolls; scroll++) {
    // For simplicity, click first result
    // In production, would use accessibility API to find matching title
    if (scroll === 0) {
      const pos = randomClick(device.width / 2, device.height * 0.25);
      click(pos.x, pos.y);
      return true;
    }

    // Scroll to see more results
    swipe(device.width / 2, device.height * 0.7, device.width / 2, device.height * 0.3, 500);
    sleep(randomInt(1000, 2000));
  }

  return false;
}

function trySkipAd() {
  log('Attempting to skip ad');

  // Wait for skip button
  const waitTime = randomInt(CONFIG.adSkipWaitMinMs, CONFIG.adSkipWaitMaxMs);
  sleep(waitTime);

  // Try multiple positions for skip button
  const skipPositions = [
    { x: 0.9, y: 0.9 },
    { x: 0.85, y: 0.85 },
    { x: 0.9, y: 0.8 }
  ];

  for (const pos of skipPositions) {
    const clickPos = randomClick(device.width * pos.x, device.height * pos.y);
    click(clickPos.x, clickPos.y);
    sleep(500);
  }

  return Math.round(waitTime / 1000);
}

function watchWithRandomActions(durationSeconds) {
  log('Watching for ' + durationSeconds + ' seconds with random actions');

  const startTime = Date.now();
  let elapsed = 0;

  while (elapsed < durationSeconds * 1000) {
    if (!isRunning) break;

    const currentSecond = Math.round(elapsed / 1000);

    // Check for random actions
    if (shouldOccur(RANDOM_ACTIONS.backDouble)) {
      performBackDouble();
      actionsPerformed.push({
        type: 'back_double',
        timestampSec: currentSecond
      });
    }

    if (shouldOccur(RANDOM_ACTIONS.forwardDouble)) {
      performForwardDouble();
      actionsPerformed.push({
        type: 'forward_double',
        timestampSec: currentSecond
      });
    }

    if (shouldOccur(RANDOM_ACTIONS.scrollComments)) {
      performScrollComments();
      actionsPerformed.push({
        type: 'scroll_comments',
        timestampSec: currentSecond
      });
    }

    sleep(1000);
    elapsed = Date.now() - startTime;
  }

  return Math.round(elapsed / 1000);
}

function performBackDouble() {
  log('Back double tap');
  const pos = randomClick(device.width * 0.2, device.height * 0.3);
  click(pos.x, pos.y);
  sleep(100);
  click(pos.x, pos.y);
}

function performForwardDouble() {
  log('Forward double tap');
  const pos = randomClick(device.width * 0.8, device.height * 0.3);
  click(pos.x, pos.y);
  sleep(100);
  click(pos.x, pos.y);
}

function performScrollComments() {
  log('Scrolling to comments');
  swipe(device.width / 2, device.height * 0.7, device.width / 2, device.height * 0.3, 500);
  sleep(2000);
  swipe(device.width / 2, device.height * 0.3, device.width / 2, device.height * 0.7, 500);
}

function clickLike() {
  log('Clicking like');
  const pos = randomClick(device.width * 0.15, device.height * 0.35);
  click(pos.x, pos.y);
  sleep(1000);
}

function writeComment(comment) {
  log('Writing comment: ' + comment);

  // Scroll to comments
  swipe(device.width / 2, device.height * 0.7, device.width / 2, device.height * 0.3, 500);
  sleep(1500);

  // Tap comment input
  const pos = randomClick(device.width / 2, device.height * 0.8);
  click(pos.x, pos.y);
  sleep(1000);

  // Set clipboard and paste
  setClip(comment);
  sleep(200);

  longClick(device.width / 2, device.height * 0.5);
  sleep(500);

  const pasteBtn = text('붙여넣기').findOne(3000) || text('Paste').findOne(1000);
  if (pasteBtn) {
    pasteBtn.click();
    sleep(500);
  } else {
    setText(comment);
  }

  // Post
  sleep(500);
  KeyCode('KEYCODE_ENTER');
  sleep(1000);

  // Scroll back up
  swipe(device.width / 2, device.height * 0.3, device.width / 2, device.height * 0.7, 500);
}

function pressBack() {
  back();
  sleep(500);
}

// ===== Main Queue Processing =====

function processVideo(video) {
  log('Processing video: ' + video.title);

  actionsPerformed = [];
  const result = {
    videoId: video.id,
    videoTitle: video.title,
    success: false,
    watchDuration: 0,
    randomActions: [],
    liked: false,
    commented: false,
    commentContent: null,
    adSkipped: false,
    adSkipTime: null,
    error: null
  };

  try {
    // Launch YouTube
    launchYouTube();
    sleep(randomDelay());

    // Search by title
    searchByTitle(video.title);
    sleep(randomDelay());

    // Find and click
    const found = findAndClickTitle(video.title, 5);
    if (!found) {
      throw new Error('Video not found');
    }

    // Handle ads
    result.adSkipTime = trySkipAd();
    result.adSkipped = true;

    // Watch with random actions
    const watchDuration = randomInt(CONFIG.watchMinSeconds, CONFIG.watchMaxSeconds);
    result.watchDuration = watchWithRandomActions(watchDuration);
    result.randomActions = actionsPerformed;

    // Like (10% probability)
    if (shouldOccur(0.10)) {
      clickLike();
      result.liked = true;
    }

    // Comment (5% probability)
    if (shouldOccur(0.05) && video.comment) {
      writeComment(video.comment);
      result.commented = true;
      result.commentContent = video.comment;
    }

    // Go back
    pressBack();
    pressBack();

    result.success = true;

  } catch (error) {
    result.error = error.message;
    log('Processing error: ' + error.message);
  }

  return result;
}

// ===== Communication =====

function reportResult(result) {
  try {
    const response = http.postJson(CONFIG.serverUrl + '/api/automation/queue/report', {
      type: 'queue_watch',
      deviceId: device.serial,
      result: result,
      timestamp: Date.now()
    });
    log('Queue report sent: ' + response.statusCode);
  } catch (error) {
    log('Queue report failed: ' + error.message);
  }
}

// ===== Broadcast Receiver =====

events.on('broadcast', function(action, extra) {
  log('Broadcast received: ' + action);

  if (action === 'com.automation.PROCESS_VIDEO') {
    try {
      const video = JSON.parse(extra);
      currentVideo = video;
      isRunning = true;

      threads.start(function() {
        const result = processVideo(video);
        reportResult(result);
        currentVideo = null;
        isRunning = false;
      });
    } catch (error) {
      log('Video parse error: ' + error.message);
    }
  }

  if (action === 'com.automation.STOP_QUEUE') {
    isRunning = false;
  }
});

// ===== UI =====

ui.layout(
  <vertical padding="16">
    <text text="YouTube Queue Automation" textSize="20sp" textStyle="bold"/>
    <text id="status" text="Status: Waiting for command" marginTop="16"/>
    <text id="currentVideo" text="Current: None" marginTop="8"/>
    <button id="testBtn" text="Test Video" marginTop="16"/>
  </vertical>
);

ui.testBtn.on('click', function() {
  const testVideo = {
    id: 'test123',
    title: '테스트 영상',
    comment: '테스트 댓글입니다'
  };

  currentVideo = testVideo;
  isRunning = true;
  ui.status.setText('Status: Processing');
  ui.currentVideo.setText('Current: ' + testVideo.title);

  threads.start(function() {
    const result = processVideo(testVideo);
    log('Test result: ' + JSON.stringify(result));
    currentVideo = null;
    isRunning = false;
    ui.run(function() {
      ui.status.setText('Status: Completed');
      ui.currentVideo.setText('Current: None');
    });
  });
});

log('Queue automation script loaded');
