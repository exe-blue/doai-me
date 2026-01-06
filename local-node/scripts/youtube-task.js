/**
 * YouTube Task Script for AutoX.js
 *
 * Local Node에서 Laixi를 통해 디바이스에 푸시되어 실행됨
 * $env 변수는 스케줄러에서 주입됨
 *
 * 필수 환경변수:
 * - $env.TASK_ID
 * - $env.VIDEO_URL
 * - $env.CALLBACK_URL
 * - $env.DEVICE_SERIAL
 *
 * 선택적 환경변수:
 * - $env.PERSONA_ID
 * - $env.VIDEO_TITLE
 * - $env.TARGET_DURATION (기본값: 60초)
 * - $env.SHOULD_LIKE (기본값: false)
 * - $env.SHOULD_COMMENT (기본값: false)
 * - $env.COMMENT_TEXT
 */

'ui';

// ═══════════════════════════════════════════════════════════
// 환경 설정
// ═══════════════════════════════════════════════════════════

// $env는 스케줄러에서 주입됨
var env = typeof $env !== 'undefined' ? $env : {
    TASK_ID: 'test-task-id',
    VIDEO_URL: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    CALLBACK_URL: 'http://192.168.1.100:3000/callback',
    TARGET_DURATION: 60,
    SHOULD_LIKE: false,
    SHOULD_COMMENT: false,
    COMMENT_TEXT: '',
    PERSONA_ID: '',
    VIDEO_TITLE: '',
    DEVICE_SERIAL: ''
};

var LOG_TAG = '[YouTubeTask]';

// ═══════════════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════════════

function log(message, data) {
    var logMsg = LOG_TAG + ' ' + message;
    if (data) {
        logMsg += ' ' + JSON.stringify(data);
    }
    console.log(logMsg);
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function humanDelay(minMs, maxMs) {
    var delay = randomInt(minMs || 500, maxMs || 1500);
    sleep(delay);
    return delay;
}

function naturalClick(x, y) {
    // 좌표에 약간의 랜덤성 추가
    var offsetX = randomInt(-5, 5);
    var offsetY = randomInt(-5, 5);
    click(x + offsetX, y + offsetY);
    humanDelay(300, 800);
}

// ═══════════════════════════════════════════════════════════
// 콜백 함수
// ═══════════════════════════════════════════════════════════

function sendCallback(result) {
    log('콜백 전송', { url: env.CALLBACK_URL, result: result });

    try {
        var response = http.postJson(env.CALLBACK_URL, {
            taskId: env.TASK_ID,
            personaId: env.PERSONA_ID,
            success: result.success,
            watchDuration: result.watchDuration || 0,
            liked: result.liked || false,
            commented: result.commented || false,
            commentText: result.commentText || '',
            videoUrl: env.VIDEO_URL,
            videoTitle: env.VIDEO_TITLE || result.videoTitle || '',
            error: result.error || null,
            logs: result.logs || '',
            deviceSerial: env.DEVICE_SERIAL
        });

        if (response && response.statusCode === 200) {
            log('콜백 전송 성공');
            return true;
        } else {
            log('콜백 전송 실패', { status: response ? response.statusCode : 'null' });
            return false;
        }
    } catch (e) {
        log('콜백 전송 오류', { error: e.message });
        return false;
    }
}

// ═══════════════════════════════════════════════════════════
// YouTube 자동화
// ═══════════════════════════════════════════════════════════

function launchYouTube() {
    log('YouTube 앱 실행');

    try {
        app.launch('com.google.android.youtube');
        sleep(3000);

        if (currentPackage() === 'com.google.android.youtube') {
            log('YouTube 앱 실행 성공');
            return true;
        } else {
            log('YouTube 앱 실행 실패');
            return false;
        }
    } catch (e) {
        log('YouTube 앱 실행 오류', { error: e.message });
        return false;
    }
}

function openVideoUrl(url) {
    log('영상 URL 열기', { url: url });

    try {
        app.openUrl(url);
        sleep(4000);

        log('영상 URL 열기 완료');
        return true;
    } catch (e) {
        log('영상 URL 열기 실패', { error: e.message });
        return false;
    }
}

function watchVideo(duration) {
    log('영상 시청 시작', { duration: duration });

    try {
        // 시청 시간에 랜덤성 추가 (±20%)
        var variance = Math.floor(duration * 0.2);
        var actualDuration = randomInt(duration - variance, duration + variance);
        actualDuration = Math.max(10, actualDuration); // 최소 10초

        log('실제 시청 시간', { seconds: actualDuration });

        // 시청 중 자연스러운 행동
        var elapsed = 0;
        var stepTime = 10; // 10초마다 체크

        while (elapsed < actualDuration) {
            var sleepTime = Math.min(stepTime, actualDuration - elapsed);
            sleep(sleepTime * 1000);
            elapsed += sleepTime;

            // 가끔 화면 터치 (영상 재생 유지)
            if (Math.random() < 0.1) {
                var screenWidth = device.width;
                var screenHeight = device.height;
                naturalClick(
                    randomInt(screenWidth * 0.3, screenWidth * 0.7),
                    randomInt(screenHeight * 0.3, screenHeight * 0.5)
                );
            }

            // 가끔 스크롤 (댓글 확인하는 척)
            if (Math.random() < 0.05 && elapsed > 30) {
                scrollDown();
                humanDelay(1000, 2000);
                scrollUp();
            }
        }

        log('영상 시청 완료', { actualDuration: actualDuration });
        return actualDuration;

    } catch (e) {
        log('영상 시청 중 오류', { error: e.message });
        return 0;
    }
}

function clickLike() {
    log('좋아요 시도');

    try {
        // 좋아요 버튼 찾기 (여러 방법 시도)
        var likeButton = desc('like this video').findOne(3000) ||
                         desc('Like').findOne(2000) ||
                         id('like_button').findOne(2000);

        if (likeButton) {
            likeButton.click();
            humanDelay(500, 1000);
            log('좋아요 성공');
            return true;
        } else {
            log('좋아요 버튼을 찾을 수 없음');
            return false;
        }
    } catch (e) {
        log('좋아요 실패', { error: e.message });
        return false;
    }
}

function writeComment(commentText) {
    log('댓글 작성 시도', { text: commentText });

    try {
        // 댓글 섹션으로 스크롤
        scrollDown();
        humanDelay(1000, 2000);

        // 댓글 입력창 찾기
        var commentInput = text('Add a comment...').findOne(3000) ||
                          text('Add a public comment...').findOne(2000) ||
                          id('comment_box').findOne(2000);

        if (commentInput) {
            commentInput.click();
            humanDelay(500, 1000);

            // 텍스트 입력
            var inputField = className('android.widget.EditText').findOne(3000);
            if (inputField) {
                // 자연스럽게 입력 (한 글자씩)
                for (var i = 0; i < commentText.length; i++) {
                    inputField.setText(commentText.substring(0, i + 1));
                    sleep(randomInt(50, 150));
                }

                humanDelay(500, 1000);

                // 게시 버튼 클릭
                var postButton = text('Send').findOne(2000) ||
                                id('send_button').findOne(2000);

                if (postButton) {
                    postButton.click();
                    humanDelay(1000, 2000);
                    log('댓글 작성 성공');
                    return true;
                }
            }
        }

        log('댓글 입력창을 찾을 수 없음');
        return false;

    } catch (e) {
        log('댓글 작성 실패', { error: e.message });
        return false;
    }
}

function getVideoTitle() {
    try {
        var titleElement = id('title').findOne(2000);
        if (titleElement) {
            return titleElement.text();
        }
    } catch (e) {
        log('영상 제목 가져오기 실패');
    }
    return '';
}

function closeYouTube() {
    log('YouTube 앱 종료');

    try {
        back();
        sleep(500);
        back();
        sleep(500);
        home();
    } catch (e) {
        log('앱 종료 중 오류');
    }
}

// ═══════════════════════════════════════════════════════════
// 메인 실행
// ═══════════════════════════════════════════════════════════

function main() {
    log('═══════════════════════════════════════════════════');
    log('YouTube 태스크 시작');
    log('Task ID:', { id: env.TASK_ID });
    log('Video URL:', { url: env.VIDEO_URL });
    log('═══════════════════════════════════════════════════');

    var result = {
        success: false,
        watchDuration: 0,
        liked: false,
        commented: false,
        commentText: '',
        videoTitle: '',
        error: null,
        logs: ''
    };

    try {
        // 1. YouTube 앱 실행 또는 URL 직접 열기
        if (!openVideoUrl(env.VIDEO_URL)) {
            throw new Error('Failed to open video URL');
        }

        // 2. 영상 제목 가져오기
        humanDelay(2000, 3000);
        result.videoTitle = getVideoTitle() || env.VIDEO_TITLE;

        // 3. 영상 시청
        var targetDuration = parseInt(env.TARGET_DURATION) || 60;
        result.watchDuration = watchVideo(targetDuration);

        if (result.watchDuration === 0) {
            throw new Error('Failed to watch video');
        }

        // 4. 좋아요 (옵션)
        if (env.SHOULD_LIKE === true || env.SHOULD_LIKE === 'true') {
            result.liked = clickLike();
        }

        // 5. 댓글 (옵션)
        if (env.SHOULD_COMMENT === true || env.SHOULD_COMMENT === 'true') {
            var comment = env.COMMENT_TEXT || '좋은 영상 감사합니다!';
            result.commented = writeComment(comment);
            if (result.commented) {
                result.commentText = comment;
            }
        }

        // 성공
        result.success = true;
        log('태스크 완료', result);

    } catch (e) {
        result.success = false;
        result.error = e.message;
        log('태스크 실패', { error: e.message });
    }

    // 6. 앱 종료
    closeYouTube();

    // 7. 콜백 전송
    sendCallback(result);

    log('═══════════════════════════════════════════════════');
    log('YouTube 태스크 종료');
    log('═══════════════════════════════════════════════════');
}

// 실행
main();
