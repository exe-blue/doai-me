/**
 * Simple YouTube Automation
 * 단일 파일 - 제목 검색 후 30-70% 시청
 * 
 * @author Axon (Builder)
 * @version 1.0.0
 */

'nodejs';

// ==================== 영상 정보 (10개) ====================

const videos = [
    {
        title: "비트코인 급등 소식",
        keyword: "비트코인",
        url: "https://youtube.com/watch?v=example1"
    },
    {
        title: "이더리움 분석",
        keyword: "이더리움",
        url: "https://youtube.com/watch?v=example2"
    },
    {
        title: "리플 전망",
        keyword: "리플",
        url: "https://youtube.com/watch?v=example3"
    },
    {
        title: "일상 브이로그",
        keyword: "일상",
        url: "https://youtube.com/watch?v=example4"
    },
    {
        title: "요리 레시피",
        keyword: "요리",
        url: "https://youtube.com/watch?v=example5"
    },
    {
        title: "여행 영상",
        keyword: "여행",
        url: "https://youtube.com/watch?v=example6"
    },
    {
        title: "게임 플레이",
        keyword: "게임",
        url: "https://youtube.com/watch?v=example7"
    },
    {
        title: "음악 추천",
        keyword: "음악",
        url: "https://youtube.com/watch?v=example8"
    },
    {
        title: "운동 루틴",
        keyword: "운동",
        url: "https://youtube.com/watch?v=example9"
    },
    {
        title: "영화 리뷰",
        keyword: "영화",
        url: "https://youtube.com/watch?v=example10"
    }
];

// ==================== 로그 함수 ====================

function log(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
}

// ==================== YouTube 자동화 함수 ====================

/**
 * YouTube 앱 실행
 */
function launchYouTube() {
    log('📱 YouTube 앱 실행...');
    
    try {
        app.launch('com.google.android.youtube');
        sleep(3000);
        
        if (currentPackage() === 'com.google.android.youtube') {
            log('✅ YouTube 앱 실행 성공');
            return true;
        }
        
        log('❌ YouTube 앱 실행 실패');
        return false;
    } catch (e) {
        log('❌ YouTube 앱 실행 예외: ' + e.message);
        return false;
    }
}

/**
 * 제목으로 검색
 */
function searchByTitle(title) {
    log('🔍 제목 검색: ' + title);
    
    try {
        // 검색 버튼 클릭
        const searchButton = id("search").findOne(5000);
        if (!searchButton) {
            log('❌ 검색 버튼 없음');
            return false;
        }
        
        searchButton.click();
        sleep(1000);
        
        // 검색창에 제목 입력
        const searchBox = className("android.widget.EditText").findOne(3000);
        if (!searchBox) {
            log('❌ 검색창 없음');
            return false;
        }
        
        searchBox.setText(title);
        sleep(1000);
        
        // 검색 실행 (엔터)
        KeyCode("KEYCODE_ENTER");
        sleep(3000);
        
        log('✅ 검색 완료');
        return true;
        
    } catch (e) {
        log('❌ 검색 실패: ' + e.message);
        return false;
    }
}

/**
 * 첫 번째 영상 선택
 */
function selectFirstVideo() {
    log('🎯 첫 번째 영상 선택');
    
    try {
        // 검색 결과 첫 번째 썸네일 클릭
        const thumbnail = id("thumbnail").findOne(5000);
        if (!thumbnail) {
            log('❌ 썸네일 없음');
            return false;
        }
        
        thumbnail.click();
        sleep(3000);
        
        log('✅ 영상 선택 완료');
        return true;
        
    } catch (e) {
        log('❌ 영상 선택 실패: ' + e.message);
        return false;
    }
}

/**
 * 영상 시청 (30-70%)
 */
function watchVideo(title) {
    log('👀 영상 시청 시작: ' + title);
    
    try {
        // 재생 확인 (player 존재)
        const player = id("player_view").findOne(3000);
        if (!player) {
            log('⚠️  플레이어 없음, 그래도 시청 시도');
        }
        
        // 30-70% 랜덤 시청 (예: 100초 영상 → 30-70초)
        const watchPercentage = Math.random() * 0.4 + 0.3;  // 0.3 ~ 0.7
        const baseDuration = 60;  // 기본 60초 가정
        const watchDuration = Math.floor(baseDuration * watchPercentage);
        
        log(`⏱️  ${watchPercentage.toFixed(0) * 100}% 시청 (${watchDuration}초)`);
        sleep(watchDuration * 1000);
        
        log('✅ 시청 완료');
        return true;
        
    } catch (e) {
        log('❌ 시청 실패: ' + e.message);
        return false;
    }
}

/**
 * YouTube 앱 닫기
 */
function closeYouTube() {
    log('🔚 YouTube 앱 닫기');
    
    try {
        // 뒤로가기 버튼 (홈으로)
        back();
        sleep(1000);
        back();
        sleep(1000);
        
        // 앱 종료
        home();
        sleep(500);
        
        log('✅ 앱 닫기 완료');
        return true;
        
    } catch (e) {
        log('❌ 앱 닫기 실패: ' + e.message);
        return false;
    }
}

// ==================== 메인 실행 ====================

function main() {
    log('╔════════════════════════════════════════════════════════╗');
    log('║  Simple YouTube Automation                           ║');
    log('║  제목 검색 → 30-70% 시청                              ║');
    log('╚════════════════════════════════════════════════════════╝');
    
    log(`📋 총 ${videos.length}개 영상 처리 예정`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        
        log('');
        log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        log(`📹 영상 ${i + 1}/${videos.length}: ${video.title}`);
        log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        try {
            // 1. YouTube 앱 실행
            if (!launchYouTube()) {
                log('❌ 영상 처리 실패: YouTube 앱 실행 불가');
                failCount++;
                continue;
            }
            
            // 2. 제목으로 검색
            if (!searchByTitle(video.title)) {
                log('❌ 영상 처리 실패: 검색 불가');
                failCount++;
                closeYouTube();
                continue;
            }
            
            // 3. 첫 번째 영상 선택
            if (!selectFirstVideo()) {
                log('❌ 영상 처리 실패: 선택 불가');
                failCount++;
                closeYouTube();
                continue;
            }
            
            // 4. 30-70% 시청
            if (!watchVideo(video.title)) {
                log('❌ 영상 처리 실패: 시청 불가');
                failCount++;
                closeYouTube();
                continue;
            }
            
            // 5. 앱 닫기
            closeYouTube();
            
            successCount++;
            log(`✅ 영상 ${i + 1} 처리 완료`);
            
            // 6. 영상 간 간격 (5-10초)
            const intervalSec = Math.floor(Math.random() * 5) + 5;
            log(`⏰ ${intervalSec}초 대기...`);
            sleep(intervalSec * 1000);
            
        } catch (e) {
            log(`❌ 예상치 못한 에러: ${e.message}`);
            failCount++;
            
            // 앱 강제 종료
            try {
                home();
                sleep(1000);
            } catch (cleanupError) {
                // 무시
            }
        }
    }
    
    // 최종 결과
    log('');
    log('╔════════════════════════════════════════════════════════╗');
    log('║  처리 완료                                            ║');
    log('╚════════════════════════════════════════════════════════╝');
    log(`✅ 성공: ${successCount}개`);
    log(`❌ 실패: ${failCount}개`);
    log(`📊 성공률: ${(successCount / videos.length * 100).toFixed(1)}%`);
}

// 실행
try {
    main();
} catch (e) {
    log('❌ 치명적 에러: ' + e.message);
}
