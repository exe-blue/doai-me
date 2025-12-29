"ui";

/**
 * YouTube 자동화 스크립트 v2.0
 * - 휴먼 패턴 시뮬레이션 적용
 * - Beta 분포 기반 시청 시간
 * - 자연스러운 터치/스와이프
 * - 마이크로서비스 아키텍처 연동
 */

auto.waitFor();

// 휴먼 패턴 모듈 로드
var HumanPatterns = require("./human_patterns.js");

// ==================== 설정 ====================
var CONFIG = {
    // 서버 설정 (마이크로서비스)
    API_GATEWAY_URL: "http://localhost:8000",
    PATTERN_SERVICE_URL: "http://localhost:8004",
    API_KEY: "",
    DEVICE_ID: device.serial || "unknown",
    
    // 화면 해상도
    SCREEN_WIDTH: 1080,
    SCREEN_HEIGHT: 2280,
    
    // YouTube 패키지
    YOUTUBE_PACKAGE: "com.google.android.youtube",
    
    // 검색 설정
    MAX_SCROLL_PAGES: {
        KEYWORD: 3,
        RECENT: 3,
        TITLE: 1
    },
    
    // 스크린샷 경로
    SCREENSHOT_PATH: "/storage/emulated/0/Pictures/YouTube_Automation/"
};

// 검색 경로 타입
var SEARCH_TYPE = {
    KEYWORD: 1,
    RECENT: 2,
    TITLE: 3,
    DIRECT_URL: 4
};

// ==================== 상태 변수 ====================
var videoQueue = [];
var completedVideos = [];
var currentVideo = null;
var isRunning = false;
var stats = {
    completed: 0,
    error: 0,
    pending: 0
};

// ==================== UI 레이아웃 ====================
setScreenMetrics(CONFIG.SCREEN_WIDTH, CONFIG.SCREEN_HEIGHT);

if (!floaty.checkPermission()) {
    toast("플로팅 윈도우 권한이 필요합니다.");
    floaty.requestPermission();
    exit();
}

var xml = <scroll id='scroll' fillViewport="true">
    <vertical id="mainUI" padding="16" bg="#1a1a2e">
        <text text="🎬 YouTube 자동화 v2.0" textSize="26dp" textColor="#e94560" gravity="center"/>
        <text text="휴먼 패턴 시뮬레이션 적용" textSize="14dp" textColor="#666" gravity="center" marginBottom="16"/>
        
        <card cardCornerRadius="12dp" cardElevation="4dp" margin="8" cardBackgroundColor="#16213e">
            <vertical padding="16">
                <text text="📡 서버 연결" textSize="18dp" textColor="#e94560"/>
                <horizontal marginTop="8">
                    <text text="API Gateway:" textColor="#aaa" w="100"/>
                    <input id="serverUrl" hint="http://localhost:8000" w="*" textColor="#fff" 
                           text="{{CONFIG.API_GATEWAY_URL}}"/>
                </horizontal>
                <horizontal marginTop="8">
                    <text text="API Key:" textColor="#aaa" w="100"/>
                    <input id="apiKey" hint="API Key" w="*" inputType="textPassword" textColor="#fff"/>
                </horizontal>
            </vertical>
        </card>
        
        <card cardCornerRadius="12dp" cardElevation="4dp" margin="8" cardBackgroundColor="#16213e">
            <vertical padding="16">
                <text text="🎯 수동 입력 (테스트)" textSize="18dp" textColor="#e94560"/>
                <input id="inputKeyword" hint="검색 키워드" marginTop="8" textColor="#fff"/>
                <input id="inputTitle" hint="영상 제목" marginTop="8" textColor="#fff"/>
                <input id="inputUrl" hint="영상 URL (선택)" marginTop="8" textColor="#fff"/>
                <button id="btnAddManual" text="➕ 수동 추가" marginTop="8" bg="#e94560" textColor="#fff"/>
            </vertical>
        </card>
        
        <card cardCornerRadius="12dp" cardElevation="4dp" margin="8" cardBackgroundColor="#16213e">
            <vertical padding="16">
                <text text="💬 댓글 템플릿" textSize="18dp" textColor="#e94560"/>
                <input id="commentTemplates" hint="댓글1|댓글2|댓글3" 
                       text="좋은 영상이네요!|정말 유익합니다|잘 봤습니다 👍|도움이 많이 됐어요" 
                       lines="2" marginTop="8" textColor="#fff"/>
            </vertical>
        </card>
        
        <card cardCornerRadius="12dp" cardElevation="4dp" margin="8" cardBackgroundColor="#16213e">
            <vertical padding="16">
                <text text="📊 실시간 상태" textSize="18dp" textColor="#e94560"/>
                <horizontal marginTop="12">
                    <vertical gravity="center" w="0" layout_weight="1">
                        <text id="statPending" text="0" textSize="28dp" textColor="#3498db" gravity="center"/>
                        <text text="대기" textColor="#888" textSize="12dp"/>
                    </vertical>
                    <vertical gravity="center" w="0" layout_weight="1">
                        <text id="statCompleted" text="0" textSize="28dp" textColor="#2ecc71" gravity="center"/>
                        <text text="완료" textColor="#888" textSize="12dp"/>
                    </vertical>
                    <vertical gravity="center" w="0" layout_weight="1">
                        <text id="statError" text="0" textSize="28dp" textColor="#e74c3c" gravity="center"/>
                        <text text="에러" textColor="#888" textSize="12dp"/>
                    </vertical>
                </horizontal>
                <text id="currentStatus" text="⏸ 대기 중..." textSize="14dp" textColor="#999" marginTop="12" gravity="center"/>
            </vertical>
        </card>
        
        <card cardCornerRadius="12dp" cardElevation="4dp" margin="8" cardBackgroundColor="#16213e">
            <vertical padding="16">
                <text text="🧠 휴먼 패턴 미리보기" textSize="18dp" textColor="#e94560"/>
                <text id="patternPreview" text="영상 길이를 입력하면 패턴을 미리볼 수 있습니다" 
                      textSize="12dp" textColor="#888" marginTop="8"/>
                <horizontal marginTop="8">
                    <input id="previewDuration" hint="영상 길이 (초)" inputType="number" w="0" layout_weight="1" textColor="#fff"/>
                    <button id="btnPreview" text="미리보기" w="wrap" bg="#3498db" textColor="#fff" marginLeft="8"/>
                </horizontal>
            </vertical>
        </card>
        
        <horizontal gravity="center" marginTop="16">
            <button id="btnFetch" text="🔄 서버에서 가져오기" w="*" margin="4" bg="#9b59b6" textColor="#fff"/>
        </horizontal>
        <horizontal gravity="center">
            <button id="btnStart" text="▶ 시작" w="0" layout_weight="1" margin="4" bg="#2ecc71" textColor="#fff"/>
            <button id="btnStop" text="■ 정지" w="0" layout_weight="1" margin="4" bg="#e74c3c" textColor="#fff"/>
        </horizontal>
    </vertical>
</scroll>;

// ==================== 유틸리티 함수 ====================

function logStatus(message) {
    log(message);
    ui.run(function() {
        ui.currentStatus.setText(message);
    });
}

function updateStats() {
    stats.pending = videoQueue.length;
    ui.run(function() {
        ui.statPending.setText(stats.pending + "");
        ui.statCompleted.setText(stats.completed + "");
        ui.statError.setText(stats.error + "");
    });
}

function takeScreenshot(videoId) {
    try {
        files.ensureDir(CONFIG.SCREENSHOT_PATH);
        var timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        var filename = videoId + "_" + timestamp + ".png";
        var filepath = CONFIG.SCREENSHOT_PATH + filename;
        
        if (!requestScreenCapture()) {
            logStatus("화면 캡처 권한 필요");
            return null;
        }
        
        var img = captureScreen();
        images.save(img, filepath);
        img.recycle();
        
        // 미디어 스캐너 등록
        app.sendBroadcast({
            action: "android.intent.action.MEDIA_SCANNER_SCAN_FILE",
            data: "file://" + filepath
        });
        
        return filepath;
    } catch (e) {
        log("스크린샷 오류: " + e);
        return null;
    }
}

// ==================== 서버 통신 ====================

function fetchVideoListFromServer() {
    try {
        logStatus("서버에서 영상 목록 가져오는 중...");
        
        var response = http.get(CONFIG.API_GATEWAY_URL + "/videos", {
            headers: {
                "Authorization": "Bearer " + CONFIG.API_KEY,
                "Content-Type": "application/json"
            }
        });
        
        if (response.statusCode === 200) {
            var data = response.body.json();
            videoQueue = data.videos.filter(function(v) {
                return completedVideos.indexOf(v.id) === -1;
            });
            updateStats();
            logStatus("영상 " + videoQueue.length + "개 로드됨");
            return true;
        } else {
            logStatus("서버 응답 오류: " + response.statusCode);
            return false;
        }
    } catch (e) {
        logStatus("서버 연결 실패: " + e.message);
        return false;
    }
}

function sendResultToServer(result) {
    try {
        var response = http.postJson(CONFIG.API_GATEWAY_URL + "/results", result, {
            headers: {
                "Authorization": "Bearer " + CONFIG.API_KEY
            }
        });
        return response.statusCode === 200;
    } catch (e) {
        log("결과 전송 실패: " + e);
        return false;
    }
}

// ==================== YouTube 조작 (휴먼 패턴 적용) ====================

function launchYouTube() {
    logStatus("YouTube 실행 중...");
    app.launchPackage(CONFIG.YOUTUBE_PACKAGE);
    sleep(3000);
    return true;
}

function openSearch() {
    var searchBtn = id("menu_item_1").findOne(3000) || 
                    desc("검색").findOne(3000) || 
                    desc("Search").findOne(3000);
    
    if (searchBtn) {
        // 자연스러운 클릭
        var bounds = searchBtn.bounds();
        HumanPatterns.naturalClick(bounds.centerX(), bounds.centerY(), bounds.width(), bounds.height());
        sleep(1500);
        return true;
    }
    return false;
}

function searchQuery(query, useRecentFilter) {
    logStatus("검색: " + query);
    
    var searchInput = className("android.widget.EditText").findOne(3000);
    if (!searchInput) return false;
    
    // 자연스러운 타이핑
    HumanPatterns.naturalTyping(searchInput, query);
    sleep(500);
    
    KeyCode("KEYCODE_ENTER");
    sleep(2000);
    
    if (useRecentFilter) {
        applyRecentFilter();
    }
    
    return true;
}

function applyRecentFilter() {
    logStatus("최근 1시간 필터 적용 중...");
    
    var filterBtn = text("필터").findOne(3000) || text("Filter").findOne(3000);
    if (filterBtn) {
        var bounds = filterBtn.bounds();
        HumanPatterns.naturalClick(bounds.centerX(), bounds.centerY(), bounds.width(), bounds.height());
        sleep(1500);
        
        var hourOption = text("지난 1시간").findOne(2000) || text("Last hour").findOne(2000);
        if (hourOption) {
            bounds = hourOption.bounds();
            HumanPatterns.naturalClick(bounds.centerX(), bounds.centerY(), bounds.width(), bounds.height());
            sleep(1500);
            
            var applyBtn = text("적용").findOne(2000) || text("Apply").findOne(2000);
            if (applyBtn) {
                bounds = applyBtn.bounds();
                HumanPatterns.naturalClick(bounds.centerX(), bounds.centerY(), bounds.width(), bounds.height());
                sleep(2000);
            }
            return true;
        }
    }
    return false;
}

function scrollAndFindVideo(targetTitle, maxPages) {
    logStatus("영상 탐색 중: " + targetTitle);
    var rank = 0;
    
    for (var page = 0; page < maxPages; page++) {
        var videos = className("android.view.ViewGroup").find();
        
        for (var i = 0; i < videos.length; i++) {
            rank++;
            var video = videos[i];
            
            var titleNode = video.findOne(className("android.widget.TextView"));
            if (titleNode) {
                var title = titleNode.text();
                
                if (title && targetTitle && title.indexOf(targetTitle) !== -1) {
                    logStatus("영상 발견! 순위: " + rank);
                    return { found: true, element: video, rank: rank };
                }
            }
            
            // 탐색 중 랜덤 시청 (5% 확률)
            if (Math.random() < 0.05) {
                watchRandomVideo(video);
            }
        }
        
        logStatus("페이지 " + (page + 1) + "/" + maxPages + " 스크롤");
        
        // 자연스러운 스크롤
        HumanPatterns.naturalScrollDown(CONFIG.SCREEN_WIDTH, CONFIG.SCREEN_HEIGHT);
        sleep(2000);
    }
    
    return { found: false, element: null, rank: 0 };
}

function watchRandomVideo(videoElement) {
    try {
        var bounds = videoElement.bounds();
        HumanPatterns.naturalClick(bounds.centerX(), bounds.centerY(), bounds.width(), bounds.height());
        sleep(2000);
        
        var watchTime = HumanPatterns.randomInt(5, 60);
        logStatus("랜덤 시청: " + watchTime + "초");
        sleep(watchTime * 1000);
        
        back();
        sleep(1500);
    } catch (e) {
        log("랜덤 시청 오류: " + e);
    }
}

function openVideoByUrl(url) {
    logStatus("URL로 이동: " + url);
    try {
        app.openUrl(url);
        sleep(3000);
        return true;
    } catch (e) {
        return false;
    }
}

function findVideo(video) {
    var result = { found: false, searchType: 0, rank: 0 };
    
    // 2-1. 키워드 검색
    if (video.keyword) {
        logStatus("[1/4] 키워드 검색");
        if (openSearch() && searchQuery(video.keyword, false)) {
            sleep(2000);
            var searchResult = scrollAndFindVideo(video.title, CONFIG.MAX_SCROLL_PAGES.KEYWORD);
            if (searchResult.found) {
                return { found: true, searchType: SEARCH_TYPE.KEYWORD, rank: searchResult.rank, element: searchResult.element };
            }
        }
        back();
        sleep(1000);
    }
    
    // 2-2. 최근 1시간 검색
    if (video.keyword) {
        logStatus("[2/4] 최근 1시간 검색");
        if (openSearch() && searchQuery(video.keyword, true)) {
            sleep(2000);
            var searchResult = scrollAndFindVideo(video.title, CONFIG.MAX_SCROLL_PAGES.RECENT);
            if (searchResult.found) {
                return { found: true, searchType: SEARCH_TYPE.RECENT, rank: searchResult.rank, element: searchResult.element };
            }
        }
        back();
        sleep(1000);
    }
    
    // 2-3. 제목 검색
    if (video.title) {
        logStatus("[3/4] 제목 검색");
        if (openSearch() && searchQuery(video.title, false)) {
            sleep(2000);
            var searchResult = scrollAndFindVideo(video.title, CONFIG.MAX_SCROLL_PAGES.TITLE);
            if (searchResult.found) {
                return { found: true, searchType: SEARCH_TYPE.TITLE, rank: searchResult.rank, element: searchResult.element };
            }
        }
        back();
        sleep(1000);
    }
    
    // 2-4. URL 직접 이동
    if (video.url) {
        logStatus("[4/4] URL 직접 이동");
        if (openVideoByUrl(video.url)) {
            return { found: true, searchType: SEARCH_TYPE.DIRECT_URL, rank: 0, element: null };
        }
    }
    
    return result;
}

// ==================== 시청 및 인터랙션 (휴먼 패턴 적용) ====================

function getVideoDuration() {
    try {
        var durationText = id("time").findOne(3000);
        if (durationText) {
            var text = durationText.text();
            var parts = text.split("/");
            if (parts.length >= 2) {
                return parseTimeToSeconds(parts[1].trim());
            }
        }
        return 300;  // 기본값 5분
    } catch (e) {
        return 300;
    }
}

function parseTimeToSeconds(timeStr) {
    var parts = timeStr.split(":").reverse();
    var seconds = 0;
    for (var i = 0; i < parts.length; i++) {
        seconds += parseInt(parts[i]) * Math.pow(60, i);
    }
    return seconds;
}

function watchVideoWithPattern(pattern) {
    var watchTime = pattern.watch.watchTime;
    var seekTimings = pattern.watch.seekTimings;
    var interaction = pattern.interaction;
    
    logStatus("시청 시간: " + watchTime + "초 (" + pattern.watch.watchPercent + "%)");
    logStatus("Seek 횟수: " + pattern.watch.seekCount);
    
    var elapsed = 0;
    var seekIndex = 0;
    var likedDone = false;
    
    while (elapsed < watchTime && isRunning) {
        // Seek 실행
        if (seekIndex < seekTimings.length && elapsed >= seekTimings[seekIndex]) {
            performSeek();
            seekIndex++;
        }
        
        // 좋아요 실행
        if (!likedDone && interaction.shouldLike && elapsed >= interaction.likeTiming) {
            performLike();
            likedDone = true;
        }
        
        sleep(1000);
        elapsed++;
        
        if (elapsed % 30 === 0) {
            logStatus("시청 중: " + elapsed + "/" + watchTime + "초");
        }
    }
    
    // 댓글 (시청 완료 후)
    if (interaction.shouldComment && isRunning) {
        sleep((interaction.commentTiming - watchTime) * 1000);
        performComment(interaction.commentText);
    }
    
    return watchTime;
}

function performSeek() {
    // 화면 오른쪽 더블 탭 (앞으로 10초)
    var x = Math.floor(CONFIG.SCREEN_WIDTH * 0.75);
    var y = Math.floor(CONFIG.SCREEN_HEIGHT * 0.4);
    
    HumanPatterns.naturalDoubleTap(x, y, 200, 400);
    sleep(500);
}

function performLike() {
    logStatus("좋아요 시도");
    
    // 화면 터치하여 컨트롤 표시
    HumanPatterns.naturalClick(CONFIG.SCREEN_WIDTH / 2, CONFIG.SCREEN_HEIGHT / 2, 200, 200);
    sleep(500);
    
    var likeBtn = desc("좋아요").findOne(3000) || 
                  desc("like").findOne(3000) ||
                  id("like_button").findOne(3000);
    
    if (likeBtn) {
        var bounds = likeBtn.bounds();
        HumanPatterns.naturalClick(bounds.centerX(), bounds.centerY(), bounds.width(), bounds.height());
        sleep(1000);
        logStatus("좋아요 완료");
        return true;
    }
    return false;
}

function performComment(commentText) {
    logStatus("댓글 시도: " + commentText);
    
    HumanPatterns.naturalScrollDown(CONFIG.SCREEN_WIDTH, CONFIG.SCREEN_HEIGHT);
    sleep(1500);
    
    var commentBox = text("공개 댓글 추가...").findOne(3000) || 
                     text("Add a public comment...").findOne(3000);
    
    if (commentBox) {
        var bounds = commentBox.bounds();
        HumanPatterns.naturalClick(bounds.centerX(), bounds.centerY(), bounds.width(), bounds.height());
        sleep(1000);
        
        var input = className("android.widget.EditText").findOne(3000);
        if (input) {
            HumanPatterns.naturalTyping(input, commentText);
            sleep(500);
            
            var postBtn = desc("댓글").findOne(2000) || id("send_button").findOne(2000);
            if (postBtn) {
                bounds = postBtn.bounds();
                HumanPatterns.naturalClick(bounds.centerX(), bounds.centerY(), bounds.width(), bounds.height());
                sleep(2000);
                logStatus("댓글 완료");
                return true;
            }
        }
    }
    return false;
}

// ==================== 메인 프로세스 ====================

function processVideo(video) {
    currentVideo = video;
    var result = {
        videoId: video.id,
        title: video.title,
        watchTime: 0,
        totalDuration: 0,
        commented: false,
        commentText: "",
        liked: false,
        searchType: 0,
        searchRank: 0,
        screenshotPath: null,
        status: "error"
    };
    
    try {
        logStatus("처리 시작: " + video.title);
        
        if (!launchYouTube()) {
            throw new Error("YouTube 실행 실패");
        }
        
        var findResult = findVideo(video);
        if (!findResult.found) {
            throw new Error("영상을 찾을 수 없음");
        }
        
        result.searchType = findResult.searchType;
        result.searchRank = findResult.rank;
        
        if (findResult.element) {
            var bounds = findResult.element.bounds();
            HumanPatterns.naturalClick(bounds.centerX(), bounds.centerY(), bounds.width(), bounds.height());
            sleep(3000);
        }
        
        // 영상 길이 확인
        var duration = getVideoDuration();
        result.totalDuration = duration;
        
        // 휴먼 패턴 생성
        var pattern = HumanPatterns.generateHumanPattern(duration);
        
        // 댓글 템플릿 업데이트
        var templates = ui.commentTemplates.getText().split("|");
        if (templates.length > 0) {
            HumanPatterns.InteractionConfig.commentTemplates = templates;
            pattern = HumanPatterns.generateHumanPattern(duration);
        }
        
        // 패턴 적용하여 시청
        result.watchTime = watchVideoWithPattern(pattern);
        result.liked = pattern.interaction.shouldLike;
        result.commented = pattern.interaction.shouldComment;
        result.commentText = pattern.interaction.commentText || "";
        
        // 스크린샷
        result.screenshotPath = takeScreenshot(video.id);
        
        // 완료
        result.status = "completed";
        completedVideos.push(video.id);
        stats.completed++;
        logStatus("✅ 완료: " + video.title);
        
    } catch (e) {
        log("처리 오류: " + e);
        result.status = "error";
        stats.error++;
        logStatus("❌ 오류: " + e.message);
    }
    
    sendResultToServer(result);
    updateStats();
    
    home();
    sleep(2000);
    
    return result;
}

function mainLoop() {
    logStatus("🚀 자동화 시작");
    
    while (isRunning) {
        var pendingVideos = videoQueue.filter(function(v) {
            return completedVideos.indexOf(v.id) === -1;
        });
        
        if (pendingVideos.length === 0) {
            logStatus("처리할 영상이 없습니다. 서버 확인...");
            
            if (!fetchVideoListFromServer()) {
                logStatus("60초 후 재시도...");
                sleep(60000);
                continue;
            }
            
            pendingVideos = videoQueue.filter(function(v) {
                return completedVideos.indexOf(v.id) === -1;
            });
            
            if (pendingVideos.length === 0) {
                sleep(60000);
                continue;
            }
        }
        
        // 완전 랜덤 선택
        var randomIndex = HumanPatterns.randomInt(0, pendingVideos.length - 1);
        var selectedVideo = pendingVideos[randomIndex];
        
        logStatus("🎬 선택: " + selectedVideo.title);
        processVideo(selectedVideo);
        
        var waitTime = HumanPatterns.randomInt(5, 15);
        logStatus("⏳ " + waitTime + "초 후 다음 영상...");
        sleep(waitTime * 1000);
    }
    
    logStatus("⏹ 자동화 종료");
}

// ==================== UI 이벤트 ====================

ui.layout(xml);

ui.btnFetch.click(function() {
    threads.start(function() {
        CONFIG.API_GATEWAY_URL = ui.serverUrl.getText() || CONFIG.API_GATEWAY_URL;
        CONFIG.API_KEY = ui.apiKey.getText() || CONFIG.API_KEY;
        fetchVideoListFromServer();
    });
});

ui.btnAddManual.click(function() {
    var keyword = ui.inputKeyword.getText();
    var title = ui.inputTitle.getText();
    var url = ui.inputUrl.getText();
    
    if (!keyword && !title && !url) {
        toast("최소 하나의 정보를 입력해주세요");
        return;
    }
    
    var video = {
        id: "manual_" + Date.now(),
        keyword: keyword || "",
        title: title || "",
        url: url || ""
    };
    
    videoQueue.push(video);
    updateStats();
    toast("영상 추가됨");
    
    ui.inputKeyword.setText("");
    ui.inputTitle.setText("");
    ui.inputUrl.setText("");
});

ui.btnPreview.click(function() {
    var duration = parseInt(ui.previewDuration.getText()) || 300;
    var pattern = HumanPatterns.generateHumanPattern(duration);
    
    var preview = "=== 휴먼 패턴 미리보기 ===\n";
    preview += "📺 시청: " + pattern.watch.watchTime + "초 (" + pattern.watch.watchPercent + "%)\n";
    preview += "⏩ Seek: " + pattern.watch.seekCount + "회\n";
    preview += "👍 좋아요: " + (pattern.interaction.shouldLike ? "Yes @ " + pattern.interaction.likeTiming + "초" : "No") + "\n";
    preview += "💬 댓글: " + (pattern.interaction.shouldComment ? "Yes @ " + pattern.interaction.commentTiming + "초" : "No");
    
    ui.patternPreview.setText(preview);
    
    log(preview);
});

ui.btnStart.click(function() {
    if (isRunning) {
        toast("이미 실행 중");
        return;
    }
    
    if (videoQueue.length === 0) {
        toast("처리할 영상이 없습니다");
        return;
    }
    
    isRunning = true;
    threads.start(mainLoop);
});

ui.btnStop.click(function() {
    isRunning = false;
    logStatus("⏸ 정지 요청됨...");
});

events.observeKey();
events.on("key_down", function(keyCode, event) {
    if (keyCode === 24) {
        isRunning = true;
        logStatus("▶ 재개됨");
    } else if (keyCode === 25) {
        isRunning = false;
        logStatus("⏸ 일시정지");
    }
});

events.on("exit", function() {
    logStatus("스크립트 종료");
});

setInterval(function() {}, 1000);

logStatus("✨ 준비 완료. 영상을 추가하고 시작하세요.");
updateStats();

