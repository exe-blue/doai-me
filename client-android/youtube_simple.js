/**
 * YouTube 자동화 스크립트 (Simple Version)
 * 
 * 핵심: AutoX.js가 직접 서버와 HTTP 통신
 * - Laixi는 이 스크립트 실행만 담당
 * - PC Agent 불필요!
 * 
 * 실행: Laixi에서 ExecuteAutoJs로 실행
 */

"ui";
auto.waitFor();

// ==================== 설정 ====================
var CONFIG = {
    // 중앙 서버 URL (Vultr)
    SERVER_URL: "http://158.247.210.152:8000",
    
    // 기기 식별자 (ADB serial 사용)
    DEVICE_ID: device.serial || device.getIMEI() || "unknown_" + random(1000, 9999),
    
    // 화면 해상도
    SCREEN_WIDTH: device.width,
    SCREEN_HEIGHT: device.height,
    
    // 작업 간 대기 시간 (초)
    TASK_INTERVAL_MIN: 5,
    TASK_INTERVAL_MAX: 15,
    
    // 재시도 설정
    MAX_RETRIES: 3,
    RETRY_DELAY: 5000
};

// ==================== 상태 ====================
// 뮤텍스 락으로 race condition 방지
var runningLock = threads.lock();
var isRunning = false;
var currentTask = null;
var stats = {
    completed: 0,
    failed: 0,
    totalWatchTime: 0
};

// ==================== UI ====================
var floatyWindow = floaty.window(
    <vertical bg="#80000000" padding="10">
        <text id="status" text="⏸ 대기 중" textColor="#ffffff" textSize="14sp"/>
        <text id="stats" text="완료: 0 | 실패: 0" textColor="#aaaaaa" textSize="12sp"/>
    </vertical>
);
floatyWindow.setPosition(50, 200);

function updateUI(status, statsText) {
    ui.run(function() {
        floatyWindow.status.setText(status);
        if (statsText) floatyWindow.stats.setText(statsText);
    });
}

// ==================== HTTP 통신 ====================

/**
 * 서버에서 다음 작업 가져오기
 * GET /api/tasks/next?device_id=xxx
 */
function getNextTask() {
    try {
        var response = http.get(CONFIG.SERVER_URL + "/api/tasks/next", {
            device_id: CONFIG.DEVICE_ID
        });
        
        if (response.statusCode === 200) {
            var data = response.body.json();
            if (data.success && data.task) {
                return data.task;
            }
        }
        return null;
    } catch (e) {
        log("작업 요청 실패: " + e);
        return null;
    }
}

/**
 * 작업 완료 보고
 * POST /api/tasks/{id}/complete
 */
function reportComplete(taskId, success, watchDuration, details) {
    try {
        var response = http.postJson(
            CONFIG.SERVER_URL + "/api/tasks/" + taskId + "/complete",
            {
                device_id: CONFIG.DEVICE_ID,
                success: success,
                watch_duration: watchDuration || 0,
                search_type: details.searchType || 1,
                search_rank: details.searchRank || 0,
                liked: details.liked || false,
                commented: details.commented || false,
                error_message: details.error || null
            }
        );
        
        return response.statusCode === 200;
    } catch (e) {
        log("완료 보고 실패: " + e);
        return false;
    }
}

// ==================== YouTube 자동화 ====================

/**
 * YouTube 앱 실행
 */
function launchYouTube() {
    app.launchPackage("com.google.android.youtube");
    sleep(3000);
    return currentPackage() === "com.google.android.youtube";
}

/**
 * 4단계 검색 로직 (PRD 기준)
 * 1. 키워드 검색
 * 2. 키워드 + 1시간 필터
 * 3. 제목 직접 검색
 * 4. URL 직접 이동
 */
function findVideo(task) {
    var result = { found: false, searchType: 0, searchRank: 0 };
    
    // 1단계: 키워드 검색
    if (task.keyword) {
        updateUI("🔍 키워드 검색: " + task.keyword);
        if (searchAndFind(task.keyword, task.title, false)) {
            return { found: true, searchType: 1, searchRank: getSearchRank() };
        }
        back(); sleep(1000);
    }
    
    // 2단계: 키워드 + 1시간 필터
    if (task.keyword) {
        updateUI("🔍 키워드 + 최근 필터");
        if (searchAndFind(task.keyword, task.title, true)) {
            return { found: true, searchType: 2, searchRank: getSearchRank() };
        }
        back(); sleep(1000);
    }
    
    // 3단계: 제목 직접 검색
    if (task.title) {
        updateUI("🔍 제목 검색: " + task.title.substring(0, 20));
        if (searchAndFind(task.title, task.title, false)) {
            return { found: true, searchType: 3, searchRank: getSearchRank() };
        }
        back(); sleep(1000);
    }
    
    // 4단계: URL 직접 이동
    if (task.youtube_url) {
        updateUI("🔗 URL 직접 이동");
        if (openVideoByUrl(task.youtube_url)) {
            return { found: true, searchType: 4, searchRank: 0 };
        }
    }
    
    return result;
}

function searchAndFind(query, targetTitle, useTimeFilter) {
    // 검색 버튼 클릭
    var searchBtn = id("menu_item_1").findOne(3000) || desc("검색").findOne(3000);
    if (!searchBtn) return false;
    
    searchBtn.click();
    sleep(1500);
    
    // 검색어 입력
    var searchInput = className("EditText").findOne(3000);
    if (!searchInput) return false;
    
    searchInput.setText(query);
    sleep(500);
    KeyCode("KEYCODE_ENTER");
    sleep(2000);
    
    // 시간 필터 적용
    if (useTimeFilter) {
        applyTimeFilter();
    }
    
    // 결과에서 영상 찾기
    return scrollAndFindVideo(targetTitle, 3);
}

function applyTimeFilter() {
    var filterBtn = text("필터").findOne(2000) || text("Filter").findOne(2000);
    if (filterBtn) {
        filterBtn.click();
        sleep(1000);
        
        var hourOption = text("지난 1시간").findOne(1500) || text("Last hour").findOne(1500);
        if (hourOption) {
            hourOption.click();
            sleep(500);
            
            var applyBtn = text("적용").findOne(1500) || text("Apply").findOne(1500);
            if (applyBtn) applyBtn.click();
            sleep(2000);
        }
    }
}

function scrollAndFindVideo(targetTitle, maxScrolls) {
    for (var i = 0; i < maxScrolls; i++) {
        // 제목 매칭 검색
        var videos = className("android.view.ViewGroup").find();
        for (var j = 0; j < videos.length; j++) {
            var titleNode = videos[j].findOne(className("TextView"));
            if (titleNode && titleNode.text()) {
                if (titleNode.text().indexOf(targetTitle) !== -1) {
                    videos[j].click();
                    sleep(2000);
                    return true;
                }
            }
        }
        
        // 스크롤
        swipe(
            CONFIG.SCREEN_WIDTH / 2, 
            CONFIG.SCREEN_HEIGHT * 0.7,
            CONFIG.SCREEN_WIDTH / 2,
            CONFIG.SCREEN_HEIGHT * 0.3,
            500
        );
        sleep(1500);
    }
    return false;
}

function openVideoByUrl(url) {
    try {
        app.openUrl(url);
        sleep(3000);
        return currentPackage() === "com.google.android.youtube";
    } catch (e) {
        return false;
    }
}

function getSearchRank() {
    // TODO: 실제 검색 순위 추적 로직
    return random(1, 10);
}

/**
 * 영상 시청
 */
function watchVideo(task) {
    var watchTime = task.watch_duration || random(60, 180);
    updateUI("▶ 시청 중: " + watchTime + "초");
    
    var startTime = new Date().getTime();
    var elapsed = 0;
    
    while (elapsed < watchTime && isRunning) {
        sleep(1000);
        elapsed = Math.floor((new Date().getTime() - startTime) / 1000);
        
        if (elapsed % 30 === 0) {
            updateUI("▶ 시청 중: " + elapsed + "/" + watchTime + "초");
        }
    }
    
    return elapsed;
}

/**
 * 좋아요 클릭 (확률적)
 */
function tryLike(probability) {
    if (Math.random() > probability) return false;
    
    var likeBtn = desc("좋아요").findOne(2000) || desc("like").findOne(2000);
    if (likeBtn) {
        likeBtn.click();
        sleep(500);
        return true;
    }
    return false;
}

// ==================== 메인 루프 ====================

function processTask(task) {
    updateUI("📺 작업 시작: " + (task.title || "").substring(0, 15));
    
    var result = {
        success: false,
        watchDuration: 0,
        searchType: 0,
        searchRank: 0,
        liked: false,
        error: null
    };
    
    try {
        // 1. YouTube 실행
        if (!launchYouTube()) {
            result.error = "YouTube 실행 실패";
            return result;
        }
        
        // 2. 영상 찾기 (4단계)
        var findResult = findVideo(task);
        if (!findResult.found) {
            result.error = "영상 찾기 실패";
            return result;
        }
        
        result.searchType = findResult.searchType;
        result.searchRank = findResult.searchRank;
        
        // 3. 시청
        result.watchDuration = watchVideo(task);
        
        // 4. 좋아요 (30% 확률)
        result.liked = tryLike(0.3);
        
        // 5. 성공
        result.success = true;
        
    } catch (e) {
        result.error = String(e);
    }
    
    return result;
}

function mainLoop() {
    updateUI("🚀 시작됨");
    log("YouTube 자동화 시작 - Device: " + CONFIG.DEVICE_ID);
    
    while (isRunning) {
        // 1. 작업 요청
        updateUI("📡 작업 요청 중...");
        var task = getNextTask();
        
        if (!task) {
            updateUI("⏳ 작업 없음, 60초 대기");
            sleep(60000);
            continue;
        }
        
        // 2. 작업 실행
        currentTask = task;
        var result = processTask(task);
        currentTask = null;
        
        // 3. 결과 보고
        updateUI("📤 결과 보고 중...");
        reportComplete(task.task_id, result.success, result.watchDuration, result);
        
        // 4. 통계 업데이트
        if (result.success) {
            stats.completed++;
            stats.totalWatchTime += result.watchDuration;
        } else {
            stats.failed++;
        }
        
        updateUI(
            result.success ? "✅ 완료" : "❌ 실패: " + result.error,
            "완료: " + stats.completed + " | 실패: " + stats.failed
        );
        
        // 5. 홈으로 복귀
        home();
        sleep(2000);
        
        // 6. 다음 작업 전 대기
        var waitTime = random(CONFIG.TASK_INTERVAL_MIN, CONFIG.TASK_INTERVAL_MAX);
        updateUI("⏳ " + waitTime + "초 대기");
        sleep(waitTime * 1000);
    }
    
    updateUI("⏹ 종료됨");
}

// ==================== 제어 ====================

// 볼륨 키로 시작/정지
events.observeKey();
events.on("key_down", function(keyCode, event) {
    if (keyCode === 24) {  // Volume Up
        // lock으로 race condition 방지
        runningLock.lock();
        try {
            if (!isRunning) {
                isRunning = true;
                threads.start(mainLoop);
            }
        } finally {
            runningLock.unlock();
        }
    } else if (keyCode === 25) {  // Volume Down
        runningLock.lock();
        try {
            isRunning = false;
            updateUI("⏸ 정지 요청됨");
        } finally {
            runningLock.unlock();
        }
    }
});

// 플로팅 윈도우 터치로 시작/정지
floatyWindow.status.on("click", function() {
    // lock으로 race condition 방지 (여러 번 빠르게 클릭해도 한 번만 시작)
    runningLock.lock();
    try {
        if (!isRunning) {
            isRunning = true;
            threads.start(mainLoop);
        } else {
            isRunning = false;
        }
    } finally {
        runningLock.unlock();
    }
});

// 종료 이벤트
events.on("exit", function() {
    isRunning = false;
    floatyWindow.close();
});

// ==================== 자동 시작 ====================
// 스크립트 실행 시 자동으로 시작
isRunning = true;
threads.start(mainLoop);

// 유지
setInterval(function() {}, 1000);