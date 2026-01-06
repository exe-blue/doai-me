/**
 * DoAi.Me Local YouTube Watcher
 *
 * 단일 파일 로컬 테스트용 AutoX.js 스크립트
 * CSV 파일에서 영상 목록을 읽고 인간처럼 시청
 *
 * 사용법:
 * 1. videos.txt 파일을 /sdcard/DoAiMe/ 폴더에 복사
 * 2. 이 스크립트를 AutoX.js에서 실행
 *
 * @version 1.0.0
 * @date 2026-01-06
 */

"auto";

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
    // 파일 경로
    VIDEO_LIST_PATH: "/sdcard/DoAiMe/videos.txt",

    // 시청 설정
    MIN_WATCH_PERCENT: 30,  // 최소 시청 비율 (%)
    MAX_WATCH_PERCENT: 79,  // 최대 시청 비율 (%)

    // 인간 행동 시뮬레이션
    HUMAN_ACTION_PROBABILITY: 0.7,  // 인간 동작 발생 확률
    MIN_ACTION_INTERVAL: 5000,      // 최소 동작 간격 (ms)
    MAX_ACTION_INTERVAL: 15000,     // 최대 동작 간격 (ms)

    // YouTube 앱 패키지
    YOUTUBE_PACKAGE: "com.google.android.youtube",

    // 타임아웃
    LOAD_TIMEOUT: 10000,

    // 디버그 모드
    DEBUG: true
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * 로그 출력 (디버그 모드)
 */
function log(message) {
    if (CONFIG.DEBUG) {
        console.log("[DoAiMe] " + message);
        toast(message);
    }
}

/**
 * 랜덤 정수 생성 (min ~ max)
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 랜덤 실수 생성 (min ~ max)
 */
function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * 랜덤 딜레이
 */
function randomDelay(minMs, maxMs) {
    const delay = randomInt(minMs, maxMs);
    sleep(delay);
    return delay;
}

/**
 * 확률 기반 실행
 */
function withProbability(probability, action) {
    if (Math.random() < probability) {
        action();
        return true;
    }
    return false;
}

// ============================================================
// STEP 1: CSV 파일 읽기
// ============================================================

/**
 * CSV 파일에서 영상 목록 로드
 * @returns {Array} [{title, url}, ...]
 */
function loadVideoList() {
    log("STEP 1: CSV 파일 로드 중...");

    const videos = [];

    try {
        // 파일 존재 확인
        if (!files.exists(CONFIG.VIDEO_LIST_PATH)) {
            log("ERROR: videos.txt 파일이 없습니다!");
            log("경로: " + CONFIG.VIDEO_LIST_PATH);

            // 샘플 파일 생성
            createSampleVideoFile();
            return [];
        }

        // 파일 읽기
        const content = files.read(CONFIG.VIDEO_LIST_PATH);
        const lines = content.split("\n");

        // 첫 줄은 헤더 (제목,URL)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(",");
            if (parts.length >= 2) {
                videos.push({
                    title: parts[0].trim(),
                    url: parts[1].trim()
                });
            }
        }

        log("로드된 영상: " + videos.length + "개");

    } catch (e) {
        log("ERROR: 파일 읽기 실패 - " + e.message);
    }

    return videos;
}

/**
 * 샘플 영상 파일 생성
 */
function createSampleVideoFile() {
    log("샘플 videos.txt 생성 중...");

    const sampleContent = `제목,URL
Never Gonna Give You Up,https://www.youtube.com/watch?v=dQw4w9WgXcQ
PSY - GANGNAM STYLE,https://www.youtube.com/watch?v=9bZkp7q19f0
Ed Sheeran - Shape of You,https://www.youtube.com/watch?v=JGwWNGJdvx8`;

    // 폴더 생성
    files.ensureDir("/sdcard/DoAiMe/");

    // 파일 쓰기
    files.write(CONFIG.VIDEO_LIST_PATH, sampleContent);

    log("샘플 파일 생성 완료: " + CONFIG.VIDEO_LIST_PATH);
}

// ============================================================
// STEP 2: YouTube 앱 실행
// ============================================================

/**
 * YouTube 앱 실행 및 준비
 */
function launchYouTube() {
    log("STEP 2: YouTube 앱 실행...");

    // YouTube 앱 실행
    app.launch(CONFIG.YOUTUBE_PACKAGE);

    // 로드 대기
    sleep(3000);

    // YouTube 실행 확인
    if (currentPackage() !== CONFIG.YOUTUBE_PACKAGE) {
        log("WARNING: YouTube가 실행되지 않았습니다. 재시도...");
        app.launch(CONFIG.YOUTUBE_PACKAGE);
        sleep(3000);
    }

    log("YouTube 앱 실행 완료");
}

// ============================================================
// STEP 3: 영상 열기
// ============================================================

/**
 * URL로 영상 열기
 * @param {string} url - YouTube URL
 */
function openVideo(url) {
    log("STEP 3: 영상 열기...");
    log("URL: " + url);

    // Intent로 URL 열기
    app.startActivity({
        action: "android.intent.action.VIEW",
        data: url,
        packageName: CONFIG.YOUTUBE_PACKAGE
    });

    // 영상 로드 대기
    sleep(randomInt(3000, 5000));

    log("영상 열기 완료");
}

// ============================================================
// STEP 4: 인간 동작 시뮬레이션
// ============================================================

/**
 * 인간처럼 랜덤한 동작 수행
 */
const HumanActions = {

    /**
     * 4.1 화면 랜덤 탭 (빈 공간)
     */
    randomTap: function() {
        log("  [Human] 화면 탭");

        const w = device.width;
        const h = device.height;

        // 영상 영역 내 랜덤 탭 (상단 절반)
        const x = randomInt(w * 0.1, w * 0.9);
        const y = randomInt(h * 0.2, h * 0.4);

        click(x, y);
        randomDelay(500, 1500);
    },

    /**
     * 4.2 위/아래 스크롤 (댓글 보기 시뮬레이션)
     */
    scrollGesture: function() {
        log("  [Human] 스크롤");

        const w = device.width;
        const h = device.height;

        const startX = w / 2;
        const startY = h * 0.7;
        const endY = h * 0.3;

        // 위로 스크롤
        swipe(startX, startY, startX, endY, randomInt(300, 600));
        randomDelay(1000, 3000);

        // 다시 아래로 (영상으로 복귀)
        if (Math.random() < 0.7) {
            swipe(startX, endY, startX, startY, randomInt(300, 600));
            randomDelay(500, 1500);
        }
    },

    /**
     * 4.3 영상 재생/일시정지 토글
     */
    togglePlayPause: function() {
        log("  [Human] 재생/일시정지 토글");

        const w = device.width;
        const h = device.height;

        // 영상 중앙 탭 (재생/일시정지)
        click(w / 2, h * 0.3);
        randomDelay(300, 800);

        // 다시 탭해서 재생
        if (Math.random() < 0.8) {
            sleep(randomInt(1000, 3000));
            click(w / 2, h * 0.3);
        }
    },

    /**
     * 4.4 볼륨 조절 제스처
     */
    volumeGesture: function() {
        log("  [Human] 볼륨 조절");

        const w = device.width;
        const h = device.height;

        // 영상 왼쪽 영역에서 위/아래 스와이프
        const x = w * 0.2;
        const startY = h * 0.35;
        const delta = randomInt(50, 150) * (Math.random() < 0.5 ? 1 : -1);

        swipe(x, startY, x, startY + delta, randomInt(200, 400));
        randomDelay(500, 1000);
    },

    /**
     * 4.5 밝기 조절 제스처
     */
    brightnessGesture: function() {
        log("  [Human] 밝기 조절");

        const w = device.width;
        const h = device.height;

        // 영상 오른쪽 영역에서 위/아래 스와이프
        const x = w * 0.8;
        const startY = h * 0.35;
        const delta = randomInt(50, 150) * (Math.random() < 0.5 ? 1 : -1);

        swipe(x, startY, x, startY + delta, randomInt(200, 400));
        randomDelay(500, 1000);
    },

    /**
     * 4.6 영상 탐색 (시크바 드래그)
     */
    seekGesture: function() {
        log("  [Human] 시크바 드래그");

        const w = device.width;
        const h = device.height;

        // 먼저 탭해서 컨트롤 표시
        click(w / 2, h * 0.3);
        sleep(500);

        // 시크바 위치 (하단)
        const y = h * 0.45;
        const startX = w * randomFloat(0.2, 0.4);
        const endX = w * randomFloat(0.5, 0.8);

        swipe(startX, y, endX, y, randomInt(300, 600));
        randomDelay(1000, 2000);
    },

    /**
     * 4.7 더블탭 (10초 앞/뒤로)
     */
    doubleTapSkip: function() {
        log("  [Human] 더블탭 스킵");

        const w = device.width;
        const h = device.height;

        // 왼쪽 또는 오른쪽 더블탭
        const side = Math.random() < 0.5 ? 0.25 : 0.75;
        const x = w * side;
        const y = h * 0.3;

        // 더블탭
        click(x, y);
        sleep(100);
        click(x, y);

        randomDelay(1000, 2000);
    },

    /**
     * 4.8 아무것도 안함 (시청 집중)
     */
    doNothing: function() {
        log("  [Human] 집중 시청 중...");
        randomDelay(3000, 8000);
    },

    /**
     * 4.9 전체화면 토글
     */
    toggleFullscreen: function() {
        log("  [Human] 전체화면 토글");

        const w = device.width;
        const h = device.height;

        // 탭해서 컨트롤 표시
        click(w / 2, h * 0.3);
        sleep(500);

        // 전체화면 버튼 (우측 하단)
        click(w * 0.95, h * 0.45);
        randomDelay(2000, 4000);

        // 다시 나가기
        if (Math.random() < 0.6) {
            back();
            randomDelay(1000, 2000);
        }
    },

    /**
     * 랜덤 인간 동작 실행
     */
    performRandomAction: function() {
        const actions = [
            { weight: 25, action: this.doNothing },        // 25% - 집중 시청
            { weight: 15, action: this.randomTap },        // 15% - 랜덤 탭
            { weight: 15, action: this.scrollGesture },    // 15% - 스크롤
            { weight: 10, action: this.togglePlayPause },  // 10% - 재생/일시정지
            { weight: 8,  action: this.volumeGesture },    // 8%  - 볼륨
            { weight: 8,  action: this.brightnessGesture },// 8%  - 밝기
            { weight: 8,  action: this.seekGesture },      // 8%  - 시크
            { weight: 6,  action: this.doubleTapSkip },    // 6%  - 더블탭 스킵
            { weight: 5,  action: this.toggleFullscreen }  // 5%  - 전체화면
        ];

        // 가중치 기반 랜덤 선택
        const totalWeight = actions.reduce((sum, a) => sum + a.weight, 0);
        let random = Math.random() * totalWeight;

        for (const item of actions) {
            random -= item.weight;
            if (random <= 0) {
                item.action.call(this);
                return;
            }
        }

        // 폴백
        this.doNothing();
    }
};

// ============================================================
// STEP 5: 영상 시청 (30~79%)
// ============================================================

/**
 * 영상 시청 (지정된 비율만큼)
 * @param {number} videoDurationSec - 영상 길이 (초), 0이면 추정
 */
function watchVideo(videoDurationSec) {
    log("STEP 5: 영상 시청 시작...");

    // 영상 길이 추정 (알 수 없으면 3분 가정)
    const estimatedDuration = videoDurationSec || 180;

    // 시청 비율 랜덤 결정 (30~79%)
    const watchPercent = randomInt(CONFIG.MIN_WATCH_PERCENT, CONFIG.MAX_WATCH_PERCENT);
    const watchDurationSec = Math.floor(estimatedDuration * watchPercent / 100);

    log("시청 비율: " + watchPercent + "% (" + watchDurationSec + "초)");

    const startTime = Date.now();
    const endTime = startTime + (watchDurationSec * 1000);

    // 시청 루프
    while (Date.now() < endTime) {
        const remaining = Math.floor((endTime - Date.now()) / 1000);

        if (remaining % 30 === 0) {
            log("남은 시청 시간: " + remaining + "초");
        }

        // 인간 동작 수행
        if (Math.random() < CONFIG.HUMAN_ACTION_PROBABILITY) {
            HumanActions.performRandomAction();
        } else {
            // 그냥 대기
            randomDelay(CONFIG.MIN_ACTION_INTERVAL, CONFIG.MAX_ACTION_INTERVAL);
        }

        // YouTube 앱 확인 (다른 앱으로 전환됐는지)
        if (currentPackage() !== CONFIG.YOUTUBE_PACKAGE) {
            log("WARNING: YouTube에서 벗어남. 복귀 중...");
            app.launch(CONFIG.YOUTUBE_PACKAGE);
            sleep(2000);
        }
    }

    const actualWatchTime = Math.floor((Date.now() - startTime) / 1000);
    log("시청 완료: " + actualWatchTime + "초");

    return {
        targetPercent: watchPercent,
        targetDuration: watchDurationSec,
        actualDuration: actualWatchTime
    };
}

// ============================================================
// STEP 6: 다음 영상으로 이동
// ============================================================

/**
 * 현재 영상 종료하고 다음 준비
 */
function finishCurrentVideo() {
    log("STEP 6: 영상 종료...");

    // 뒤로가기로 영상 닫기
    back();
    randomDelay(1000, 2000);

    // 홈으로 이동 확률
    if (Math.random() < 0.3) {
        back();
        randomDelay(1000, 2000);
    }

    log("영상 종료 완료");
}

// ============================================================
// MAIN: 전체 실행 흐름
// ============================================================

function main() {
    console.log("╔════════════════════════════════════════════════╗");
    console.log("║     DoAi.Me Local YouTube Watcher v1.0         ║");
    console.log("╚════════════════════════════════════════════════╝");

    // 권한 확인
    if (!requestScreenCapture()) {
        log("ERROR: 화면 캡처 권한이 필요합니다.");
        return;
    }

    // 접근성 서비스 확인
    auto.waitFor();

    // STEP 1: 영상 목록 로드
    const videos = loadVideoList();

    if (videos.length === 0) {
        log("ERROR: 시청할 영상이 없습니다.");
        log("videos.txt 파일을 /sdcard/DoAiMe/ 에 복사해주세요.");
        return;
    }

    log("총 " + videos.length + "개 영상 시청 예정");

    // STEP 2: YouTube 실행
    launchYouTube();

    // 각 영상 순차 시청
    for (let i = 0; i < videos.length; i++) {
        const video = videos[i];

        console.log("\n========================================");
        log("영상 " + (i + 1) + "/" + videos.length + ": " + video.title);
        console.log("========================================");

        // STEP 3: 영상 열기
        openVideo(video.url);

        // STEP 4 & 5: 시청 (인간 동작 포함)
        const result = watchVideo(0);  // 0 = 길이 모름 (추정)

        log("시청 결과: " + result.actualDuration + "초 (" + result.targetPercent + "%)");

        // STEP 6: 영상 종료
        finishCurrentVideo();

        // 다음 영상 전 휴식
        if (i < videos.length - 1) {
            const restTime = randomInt(5000, 15000);
            log("다음 영상까지 휴식: " + Math.floor(restTime/1000) + "초");
            sleep(restTime);
        }
    }

    console.log("\n╔════════════════════════════════════════════════╗");
    console.log("║          모든 영상 시청 완료!                    ║");
    console.log("╚════════════════════════════════════════════════╝");

    log("총 " + videos.length + "개 영상 시청 완료");
}

// 실행
main();
