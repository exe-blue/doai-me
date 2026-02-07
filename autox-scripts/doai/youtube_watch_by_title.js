/**
 * YouTube Watch By Title Script
 * Work 페이지에서 트리거되는 제목 검색 시청 스크립트
 *
 * 인간적인 시청 패턴:
 * 1. 랜덤 대기 (3-10초)
 * 2. YouTube 앱 실행
 * 3. 제목으로 검색
 * 4. 검색 결과에서 영상 선택
 * 5. 랜덤 시청 시간 (30-180초)
 * 6. 확률적 좋아요/댓글
 * 7. 앱 종료
 *
 * @author DoAi Gateway
 * @version 1.0.0
 */

'ui';

// Base64 디코딩된 args 파싱
let args = {};
try {
    const argsBase64 = engines.myEngine().execArgv.args_base64;
    if (argsBase64) {
        const decoded = $base64.decode(argsBase64);
        args = JSON.parse(decoded);
    }
} catch (e) {
    console.error('Args 파싱 실패:', e.message);
}

// 기본값 설정
const config = {
    videoId: args.videoId || '',
    title: args.title || '',
    searchMethod: args.searchMethod || 'title',
    minWatchSeconds: args.minWatchSeconds || 30,
    maxWatchSeconds: args.maxWatchSeconds || 180,
    likeProbability: args.likeProbability || 0.1,
    commentProbability: args.commentProbability || 0.02
};

console.log('=== YouTube Watch By Title 시작 ===');
console.log('설정:', JSON.stringify(config));

// ==================== 유틸리티 함수 ====================

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function humanDelay(minSec, maxSec) {
    const delay = randomBetween(minSec * 1000, maxSec * 1000);
    sleep(delay);
    return delay / 1000;
}

function naturalClick(x, y) {
    // 약간의 랜덤 오프셋 추가
    const offsetX = randomBetween(-5, 5);
    const offsetY = randomBetween(-5, 5);
    click(x + offsetX, y + offsetY);
}

function naturalSwipe(direction) {
    const width = device.width;
    const height = device.height;

    if (direction === 'down') {
        swipe(width / 2, height * 0.3, width / 2, height * 0.7, randomBetween(300, 500));
    } else if (direction === 'up') {
        swipe(width / 2, height * 0.7, width / 2, height * 0.3, randomBetween(300, 500));
    }
}

// ==================== YouTube 자동화 함수 ====================

function launchYouTube() {
    console.log('YouTube 앱 실행 중...');

    const methods = [
        () => app.launch('com.google.android.youtube'),
        () => {
            const intent = new Intent();
            intent.setPackage('com.google.android.youtube');
            intent.setAction('android.intent.action.MAIN');
            intent.addCategory('android.intent.category.LAUNCHER');
            app.startActivity(intent);
        },
        () => shell('am start -n com.google.android.youtube/.HomeActivity', true),
        () => app.openUrl('https://www.youtube.com')
    ];

    for (let i = 0; i < 3; i++) {
        for (const method of methods) {
            try {
                method();
                sleep(3000);

                if (currentPackage() === 'com.google.android.youtube') {
                    console.log('YouTube 앱 실행 성공');
                    return true;
                }
            } catch (e) {
                console.log('실행 방법 실패:', e.message);
            }
        }
    }

    console.error('YouTube 앱 실행 최종 실패');
    return false;
}

function searchByTitle(title) {
    console.log('제목으로 검색:', title);

    try {
        // 검색 버튼 클릭
        const searchBtn = id('search').findOne(5000);
        if (searchBtn) {
            searchBtn.click();
            humanDelay(1, 2);
        } else {
            console.warn('검색 버튼을 찾을 수 없음');
            return false;
        }

        // 검색어 입력
        const searchBox = className('android.widget.EditText').findOne(3000);
        if (searchBox) {
            searchBox.setText(title);
            humanDelay(0.5, 1);

            // 검색 실행
            const searchSubmit = text('Search').findOne(2000);
            if (searchSubmit) {
                searchSubmit.click();
            } else {
                KeyCode('KEYCODE_ENTER');
            }

            humanDelay(2, 4);
            console.log('검색 완료');
            return true;
        } else {
            console.warn('검색창을 찾을 수 없음');
            return false;
        }
    } catch (e) {
        console.error('검색 중 오류:', e.message);
        return false;
    }
}

function selectVideoFromResults(targetTitle) {
    console.log('검색 결과에서 영상 선택 중...');

    try {
        // 제목 매칭 시도
        const textViews = className('android.widget.TextView').find();

        for (let i = 0; i < Math.min(textViews.length, 15); i++) {
            const element = textViews[i];
            const text = element.text();

            if (text && targetTitle && text.includes(targetTitle.substring(0, 15))) {
                console.log('제목 매칭 영상 발견:', text.substring(0, 30));

                const bounds = element.bounds();
                naturalClick(bounds.centerX(), bounds.centerY());
                humanDelay(2, 3);
                return true;
            }
        }

        // 매칭 실패 시 상위 영상 선택
        console.log('정확한 매칭 실패, 상위 영상 선택');

        const videos = className('android.view.ViewGroup').find();
        if (videos.length >= 2) {
            // 첫 번째는 광고일 수 있으므로 2번째 선택
            const target = videos[1];
            const bounds = target.bounds();
            naturalClick(bounds.centerX(), bounds.centerY());
            humanDelay(2, 3);
            return true;
        }

        console.warn('영상을 선택할 수 없음');
        return false;

    } catch (e) {
        console.error('영상 선택 중 오류:', e.message);
        return false;
    }
}

function watchVideo(minSec, maxSec) {
    const watchTime = randomBetween(minSec, maxSec);
    console.log('영상 시청 시작:', watchTime, '초');

    const totalSteps = Math.floor(watchTime / 15);

    for (let i = 0; i < totalSteps; i++) {
        sleep(15000);

        // 가끔 화면 터치
        if (Math.random() < 0.1) {
            const x = randomBetween(100, device.width - 100);
            const y = randomBetween(device.height * 0.3, device.height * 0.7);
            naturalClick(x, y);
            sleep(500);
        }

        // 가끔 스크롤
        if (Math.random() < 0.05) {
            naturalSwipe('down');
            humanDelay(1, 2);
            naturalSwipe('up');
        }
    }

    // 나머지 시간
    const remaining = watchTime - (totalSteps * 15);
    if (remaining > 0) {
        sleep(remaining * 1000);
    }

    console.log('영상 시청 완료:', watchTime, '초');
    return watchTime;
}

function tryClickLike() {
    try {
        const likeBtn = desc('Like').findOne(3000);
        if (likeBtn) {
            likeBtn.click();
            humanDelay(0.5, 1);
            console.log('좋아요 클릭 완료');
            return true;
        }
    } catch (e) {
        console.warn('좋아요 실패:', e.message);
    }
    return false;
}

function tryWriteComment() {
    const comments = [
        '좋은 영상 감사합니다!',
        '유익한 정보네요',
        '잘 봤습니다',
        '좋아요!',
        '최고입니다'
    ];

    try {
        const commentBtn = text('Add a comment').findOne(3000);
        if (commentBtn) {
            commentBtn.click();
            humanDelay(1, 2);

            const comment = comments[randomBetween(0, comments.length - 1)];
            const input = className('android.widget.EditText').findOne(2000);

            if (input) {
                input.setText(comment);
                humanDelay(0.5, 1);

                const postBtn = text('Post').findOne(2000);
                if (postBtn) {
                    postBtn.click();
                    console.log('댓글 작성 완료:', comment);
                    return true;
                }
            }
        }
    } catch (e) {
        console.warn('댓글 실패:', e.message);
    }
    return false;
}

function closeYouTube() {
    try {
        back();
        sleep(500);
        back();
        sleep(500);
        home();
        console.log('YouTube 앱 종료 완료');
    } catch (e) {
        console.warn('앱 종료 중 오류:', e.message);
    }
}

// ==================== 메인 실행 ====================

function main() {
    const result = {
        success: false,
        watchDuration: 0,
        actions: [],
        error: null
    };

    try {
        // 1. 초기 랜덤 대기
        const initialDelay = humanDelay(3, 10);
        console.log('초기 대기:', initialDelay, '초');
        result.actions.push('initial_delay');

        // 2. YouTube 실행
        if (!launchYouTube()) {
            result.error = 'Failed to launch YouTube';
            return result;
        }
        result.actions.push('launch_youtube');

        // 3. 앱 로딩 대기
        humanDelay(2, 5);

        // 4. 제목으로 검색
        if (config.title && !searchByTitle(config.title)) {
            result.error = 'Failed to search by title';
            return result;
        }
        result.actions.push('search_by_title');

        // 5. 영상 선택
        if (!selectVideoFromResults(config.title)) {
            result.error = 'Failed to select video';
            return result;
        }
        result.actions.push('select_video');

        // 6. 영상 로딩 대기
        humanDelay(3, 6);

        // 7. 영상 시청
        result.watchDuration = watchVideo(config.minWatchSeconds, config.maxWatchSeconds);
        result.actions.push('watch_video');

        // 8. 좋아요 (확률)
        if (Math.random() < config.likeProbability) {
            if (tryClickLike()) {
                result.actions.push('like');
            }
        }

        // 9. 댓글 (확률)
        if (Math.random() < config.commentProbability) {
            if (tryWriteComment()) {
                result.actions.push('comment');
            }
        }

        // 10. 앱 종료
        humanDelay(1, 3);
        closeYouTube();
        result.actions.push('close_youtube');

        result.success = true;

    } catch (e) {
        result.error = e.message;
        console.error('실행 중 오류:', e.message);
    }

    console.log('=== 실행 결과 ===');
    console.log(JSON.stringify(result));

    return result;
}

// 실행
main();
