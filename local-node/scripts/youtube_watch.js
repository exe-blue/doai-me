/**
 * YouTube Watch Script (AutoX.js)
 *
 * Laixi를 통해 디바이스에서 실행되는 자동화 스크립트
 * YouTube 영상 시청, 좋아요, 댓글 기능
 *
 * @param {Object} params - 실행 파라미터
 * @param {string} params.video_url - YouTube 영상 URL
 * @param {string} params.video_id - 영상 ID
 * @param {number} params.duration - 시청 시간 (초)
 * @param {boolean} params.should_like - 좋아요 여부
 * @param {boolean} params.should_comment - 댓글 작성 여부
 * @param {string} params.comment_text - 댓글 내용
 */

// ═══════════════════════════════════════════════════════════
// 전역 설정
// ═══════════════════════════════════════════════════════════

auto.waitFor();

const YOUTUBE_PACKAGE = 'com.google.android.youtube';
const TIMEOUT_SHORT = 3000;
const TIMEOUT_MEDIUM = 5000;
const TIMEOUT_LONG = 10000;

// 결과 객체
const result = {
    success: false,
    actual_duration: 0,
    liked: false,
    commented: false,
    comment_text: null,
    error: null
};

// ═══════════════════════════════════════════════════════════
// 메인 함수
// ═══════════════════════════════════════════════════════════

function main() {
    const params = engines.myEngine().execArgv || {};

    const videoUrl = params.video_url;
    const videoId = params.video_id;
    const duration = params.duration || 60;
    const shouldLike = params.should_like || false;
    const shouldComment = params.should_comment || false;
    const commentText = params.comment_text || '';

    log(`[YouTube Watch] 시작`);
    log(`  영상: ${videoId}`);
    log(`  시청 시간: ${duration}초`);
    log(`  좋아요: ${shouldLike}, 댓글: ${shouldComment}`);

    try {
        // 1. YouTube 앱 실행
        if (!launchYouTube()) {
            throw new Error('YouTube 앱 실행 실패');
        }

        // 2. 영상 열기
        if (!openVideo(videoUrl, videoId)) {
            throw new Error('영상 열기 실패');
        }

        // 3. 시청 시작 시간 기록
        const startTime = Date.now();

        // 4. 광고 스킵 처리
        handleAds();

        // 5. 영상 시청 (지정 시간)
        watchVideo(duration);

        // 6. 실제 시청 시간 계산
        result.actual_duration = Math.round((Date.now() - startTime) / 1000);

        // 7. 좋아요 처리
        if (shouldLike) {
            result.liked = clickLikeButton();
        }

        // 8. 댓글 처리
        if (shouldComment && commentText) {
            result.commented = postComment(commentText);
            if (result.commented) {
                result.comment_text = commentText;
            }
        }

        result.success = true;
        log(`[YouTube Watch] 완료: ${result.actual_duration}초 시청`);

    } catch (e) {
        result.error = e.message;
        log(`[YouTube Watch] 오류: ${e.message}`);
    }

    // 결과 반환
    return result;
}

// ═══════════════════════════════════════════════════════════
// YouTube 앱 실행
// ═══════════════════════════════════════════════════════════

function launchYouTube() {
    log('[Launch] YouTube 앱 실행');

    // 이미 YouTube가 실행 중이면 유지
    if (currentPackage() === YOUTUBE_PACKAGE) {
        log('[Launch] 이미 실행 중');
        return true;
    }

    // 앱 실행
    app.launchPackage(YOUTUBE_PACKAGE);
    sleep(2000);

    // 실행 확인
    return waitForPackage(YOUTUBE_PACKAGE, TIMEOUT_MEDIUM);
}

// ═══════════════════════════════════════════════════════════
// 영상 열기
// ═══════════════════════════════════════════════════════════

function openVideo(videoUrl, videoId) {
    log(`[OpenVideo] 영상 열기: ${videoId}`);

    // URL을 통해 직접 열기
    if (videoUrl) {
        app.startActivity({
            action: 'android.intent.action.VIEW',
            data: videoUrl
        });
        sleep(3000);
    }

    // 영상 재생 대기
    return waitForVideoPlayer(TIMEOUT_LONG);
}

// ═══════════════════════════════════════════════════════════
// 광고 처리
// ═══════════════════════════════════════════════════════════

function handleAds() {
    log('[Ads] 광고 확인');

    // 광고 스킵 버튼 찾기 (최대 3회 시도)
    for (let i = 0; i < 3; i++) {
        sleep(2000);

        // "광고 건너뛰기" 또는 "Skip Ad" 버튼
        const skipBtn = text('광고 건너뛰기').findOne(1000)
            || text('Skip Ad').findOne(500)
            || text('Skip Ads').findOne(500)
            || desc('광고 건너뛰기').findOne(500);

        if (skipBtn) {
            log('[Ads] 스킵 버튼 클릭');
            skipBtn.click();
            sleep(1000);
            continue;
        }

        // 광고 없음 또는 스킵 불가
        break;
    }
}

// ═══════════════════════════════════════════════════════════
// 영상 시청
// ═══════════════════════════════════════════════════════════

function watchVideo(durationSec) {
    log(`[Watch] ${durationSec}초 시청 시작`);

    const endTime = Date.now() + (durationSec * 1000);

    while (Date.now() < endTime) {
        // 1초마다 체크
        sleep(1000);

        // 광고 스킵 확인
        const skipBtn = text('광고 건너뛰기').findOne(100) || text('Skip Ad').findOne(100);
        if (skipBtn) {
            skipBtn.click();
            sleep(500);
        }

        // 화면 유지 (잠금 방지)
        if (Math.random() < 0.1) {
            // 가끔 화면 터치
            click(device.width / 2, device.height / 2);
            sleep(200);
        }
    }

    log('[Watch] 시청 완료');
}

// ═══════════════════════════════════════════════════════════
// 좋아요 클릭
// ═══════════════════════════════════════════════════════════

function clickLikeButton() {
    log('[Like] 좋아요 클릭 시도');

    // 영상 영역 터치하여 컨트롤 표시
    click(device.width / 2, device.height / 3);
    sleep(500);

    // 좋아요 버튼 찾기
    const likeBtn = desc('like this video').findOne(TIMEOUT_SHORT)
        || desc('좋아요').findOne(1000)
        || id('like_button').findOne(1000);

    if (likeBtn) {
        likeBtn.click();
        log('[Like] 좋아요 클릭 성공');
        sleep(500);
        return true;
    }

    log('[Like] 좋아요 버튼 찾기 실패');
    return false;
}

// ═══════════════════════════════════════════════════════════
// 댓글 작성
// ═══════════════════════════════════════════════════════════

function postComment(commentText) {
    log('[Comment] 댓글 작성 시도');

    // 스크롤하여 댓글 섹션 표시
    scrollDown();
    sleep(1000);

    // 댓글 입력창 찾기
    const commentBox = text('공개 댓글 추가...').findOne(TIMEOUT_SHORT)
        || text('Add a public comment...').findOne(1000)
        || id('comment_entry_point').findOne(1000);

    if (!commentBox) {
        log('[Comment] 댓글 입력창 찾기 실패');
        return false;
    }

    // 댓글 입력창 클릭
    commentBox.click();
    sleep(1000);

    // 텍스트 입력
    const inputField = className('android.widget.EditText').findOne(TIMEOUT_SHORT);
    if (!inputField) {
        log('[Comment] 입력 필드 찾기 실패');
        back();
        return false;
    }

    inputField.setText(commentText);
    sleep(500);

    // 전송 버튼 클릭
    const sendBtn = desc('Send').findOne(TIMEOUT_SHORT)
        || desc('보내기').findOne(1000)
        || id('send_button').findOne(1000);

    if (sendBtn) {
        sendBtn.click();
        log('[Comment] 댓글 전송 성공');
        sleep(1000);
        return true;
    }

    log('[Comment] 전송 버튼 찾기 실패');
    back();
    return false;
}

// ═══════════════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════════════

function waitForPackage(packageName, timeout) {
    const endTime = Date.now() + timeout;
    while (Date.now() < endTime) {
        if (currentPackage() === packageName) {
            return true;
        }
        sleep(200);
    }
    return false;
}

function waitForVideoPlayer(timeout) {
    const endTime = Date.now() + timeout;
    while (Date.now() < endTime) {
        // 영상 플레이어 확인
        if (id('player_view').findOne(100) ||
            id('watch_player').findOne(100) ||
            className('android.view.SurfaceView').findOne(100)) {
            return true;
        }
        sleep(200);
    }
    return false;
}

function scrollDown() {
    swipe(device.width / 2, device.height * 0.7,
          device.width / 2, device.height * 0.3,
          500);
}

function log(msg) {
    console.log(msg);
}

// ═══════════════════════════════════════════════════════════
// 실행
// ═══════════════════════════════════════════════════════════

main();
