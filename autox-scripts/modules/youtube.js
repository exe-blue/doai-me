/**
 * YouTube Module
 * YouTube 앱 자동화 (시청, 좋아요, 댓글 등)
 */

class YouTubeAutomation {
    constructor(config, logger, humanPattern) {
        this.config = config.youtube;
        this.logger = logger;
        this.human = humanPattern;
    }

    /**
     * YouTube 앱 실행
     */
    launchYouTube() {
        this.logger.info('YouTube 앱 실행 중...');

        try {
            app.launch('com.google.android.youtube');
            sleep(3000);

            // 앱 실행 확인
            if (currentPackage() === 'com.google.android.youtube') {
                this.logger.info('YouTube 앱 실행 성공');
                return true;
            } else {
                this.logger.error('YouTube 앱 실행 실패');
                return false;
            }
        } catch (e) {
            this.logger.error('YouTube 앱 실행 예외', { error: e.message });
            return false;
        }
    }

    /**
     * 키워드로 검색
     */
    searchByKeyword(keyword) {
        this.logger.info('키워드 검색 시작', { keyword });

        try {
            // 검색 버튼 찾기 및 클릭
            const searchButton = id('search').findOne(5000);
            if (searchButton) {
                searchButton.click();
                this.human.clickDelay();
            } else {
                this.logger.warn('검색 버튼을 찾을 수 없음');
                return false;
            }

            // 검색어 입력
            const searchBox = className('android.widget.EditText').findOne(3000);
            if (searchBox) {
                searchBox.setText(keyword);
                sleep(1000);

                // 검색 실행 (엔터)
                const searchSubmit = text('Search').findOne(2000);
                if (searchSubmit) {
                    searchSubmit.click();
                } else {
                    // 키보드 엔터 입력
                    KeyCode('KEYCODE_ENTER');
                }

                this.human.scrollDelay();
                this.logger.info('검색 완료', { keyword });
                return true;
            } else {
                this.logger.warn('검색창을 찾을 수 없음');
                return false;
            }
        } catch (e) {
            this.logger.error('검색 중 예외', { error: e.message });
            return false;
        }
    }

    /**
     * 직접 URL 열기
     */
    openByUrl(youtubeUrl) {
        this.logger.info('URL 직접 열기', { url: youtubeUrl });

        try {
            app.openUrl(youtubeUrl);
            sleep(3000);

            this.logger.info('URL 열기 완료');
            return true;
        } catch (e) {
            this.logger.error('URL 열기 실패', { error: e.message });
            return false;
        }
    }

    /**
     * 검색 결과에서 특정 순위 영상 선택
     */
    selectVideoByRank(rank = 1) {
        this.logger.info('영상 선택 중...', { rank });

        try {
            // 검색 결과 스크롤 (첫 번째 영상은 광고일 수 있음)
            if (rank > 3) {
                this.human.naturalScroll('down');
            }

            // rank번째 영상 클릭
            const videos = className('android.view.ViewGroup').find();
            if (videos.length >= rank) {
                const targetVideo = videos[rank - 1];
                const bounds = targetVideo.bounds();

                this.human.naturalClick(
                    bounds.centerX(),
                    bounds.centerY()
                );

                sleep(2000);
                this.logger.info('영상 선택 완료', { rank });
                return rank;
            } else {
                this.logger.warn('충분한 영상 결과가 없음', {
                    available: videos.length,
                    requested: rank
                });
                return null;
            }
        } catch (e) {
            this.logger.error('영상 선택 실패', { error: e.message });
            return null;
        }
    }

    /**
     * 영상 시청
     */
    watchVideo(task) {
        this.logger.info('영상 시청 시작', { title: task.title });

        try {
            // 시청 시간 계산
            const watchTime = this.human.calculateWatchTime(
                this.config.min_watch_time,
                this.config.max_watch_time
            );

            this.logger.info('시청 시간', { seconds: watchTime });

            // 영상 재생 확인
            sleep(3000);

            // 시청 중 랜덤 행동
            const totalSteps = Math.floor(watchTime / 10);
            for (let i = 0; i < totalSteps; i++) {
                sleep(10000); // 10초마다

                // 가끔 화면 터치 (살아있는 것처럼)
                if (Math.random() < 0.1) {
                    this.human.randomTouch();
                }
            }

            // 나머지 시간
            const remainingTime = watchTime - (totalSteps * 10);
            if (remainingTime > 0) {
                sleep(remainingTime * 1000);
            }

            this.logger.info('영상 시청 완료', {
                title: task.title,
                duration: watchTime
            });

            return watchTime;
        } catch (e) {
            this.logger.error('시청 중 예외', { error: e.message });
            return 0;
        }
    }

    /**
     * 좋아요 클릭
     * @param {boolean|null} forceLike - true: 강제 좋아요, false: 스킵, null: 확률 기반
     * @returns {boolean} 좋아요 클릭 성공 여부
     */
    clickLike(forceLike = null) {
        // forceLike가 지정되면 해당 값 사용, 아니면 기존 확률 로직
        const shouldLike = forceLike !== null
            ? forceLike
            : Math.random() < (this.config?.like_probability || 0.5);

        if (shouldLike) {
            try {
                this.logger.info('좋아요 클릭 시도');

                // 좋아요 버튼 찾기 (여러 셀렉터 시도)
                const likeBtn = desc("좋아요").findOne(3000) ||
                               desc("like").findOne(3000) ||
                               desc("Like").findOne(3000) ||
                               id("like_button").findOne(3000);

                if (likeBtn) {
                    const bounds = likeBtn.bounds();
                    // human 모듈이 있으면 자연스러운 클릭, 없으면 일반 클릭
                    if (this.human && this.human.naturalClick) {
                        this.human.naturalClick(bounds.centerX(), bounds.centerY());
                    } else {
                        click(bounds.centerX(), bounds.centerY());
                    }
                    sleep(1000);
                    this.logger.info('좋아요 완료');
                    return true;
                }
            } catch (e) {
                this.logger.error('clickLike 실패', { error: e.message });
            }
        }
        return false;
    }

    /**
     * 댓글 작성
     * @param {string|null} commentText - 외부에서 전달된 댓글 텍스트, null이면 랜덤 템플릿 사용
     * @returns {boolean} 댓글 작성 성공 여부
     */
    writeComment(commentText = null) {
        const text = commentText || this.getRandomComment();

        if (!text) return false;

        try {
            this.logger.info('댓글 작성 시도', { text });

            // 댓글 영역으로 스크롤
            if (this.human && this.human.naturalScrollDown) {
                this.human.naturalScrollDown(this.config?.SCREEN_WIDTH || 1080, this.config?.SCREEN_HEIGHT || 1920);
            } else {
                swipe(540, 1500, 540, 800, 500);
            }
            sleep(1500);

            // 댓글 입력창 찾기 (여러 셀렉터 시도)
            const commentBox = text("공개 댓글 추가...").findOne(3000) ||
                              text("Add a public comment...").findOne(3000) ||
                              text("Add a comment").findOne(3000) ||
                              id("comment_simplebox").findOne(3000);

            if (commentBox) {
                const bounds = commentBox.bounds();
                click(bounds.centerX(), bounds.centerY());
                sleep(1000);

                // 텍스트 입력
                const input = className("android.widget.EditText").findOne(3000);
                if (input) {
                    if (this.human && this.human.naturalTyping) {
                        this.human.naturalTyping(input, text);
                    } else if (this.human && this.human.naturalInput) {
                        this.human.naturalInput(text);
                    } else {
                        input.setText(text);
                    }
                    sleep(500);

                    // 전송 버튼 (여러 셀렉터 시도)
                    const postBtn = desc("댓글").findOne(2000) ||
                                   id("send_button").findOne(2000) ||
                                   text("게시").findOne(2000) ||
                                   text("Post").findOne(2000);

                    if (postBtn) {
                        const btnBounds = postBtn.bounds();
                        click(btnBounds.centerX(), btnBounds.centerY());
                        sleep(2000);
                        this.logger.info('댓글 작성 완료', { text });
                        return true;
                    }
                }
            }
        } catch (e) {
            this.logger.error('writeComment 실패', { error: e.message });
        }
        return false;
    }

    /**
     * 랜덤 댓글 템플릿 반환
     * @returns {string} 랜덤 댓글 텍스트
     */
    getRandomComment() {
        const templates = this.config?.comment_templates || [
            "좋은 영상이네요!",
            "정말 유익합니다",
            "잘 봤습니다 👍",
            "도움이 됐어요",
            "감사합니다"
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }

    /**
     * 구독 클릭
     */
    clickSubscribe() {
        if (Math.random() < this.config.subscribe_probability) {
            try {
                this.logger.info('구독 시도');

                // 구독 버튼 찾기
                const subscribeButton = text('Subscribe').findOne(3000);
                if (subscribeButton) {
                    subscribeButton.click();
                    this.human.clickDelay();
                    this.logger.info('구독 완료');
                    return true;
                } else {
                    // 이미 구독된 상태일 수 있음
                    this.logger.debug('구독 버튼을 찾을 수 없음 (이미 구독됨?)');
                }
            } catch (e) {
                this.logger.warn('구독 실패', { error: e.message });
            }
        }
        return false;
    }

    /**
     * 알림 설정 (전체 알림)
     */
    setNotification() {
        try {
            this.logger.info('알림 설정 시도');

            // 알림 벨 아이콘 찾기
            const notificationButton = desc('Subscribe to').findOne(3000);
            if (notificationButton) {
                notificationButton.click();
                this.human.clickDelay();

                // "전체" 옵션 선택
                const allOption = text('All').findOne(2000);
                if (allOption) {
                    allOption.click();
                    this.logger.info('알림 설정 완료 (전체)');
                    return true;
                }
            }
        } catch (e) {
            this.logger.warn('알림 설정 실패', { error: e.message });
        }
        return false;
    }

    /**
     * 공유하기
     */
    shareVideo() {
        try {
            this.logger.info('공유 시도');

            // 공유 버튼 찾기
            const shareButton = desc('Share').findOne(3000);
            if (shareButton) {
                shareButton.click();
                this.human.clickDelay();

                // 공유 메뉴가 열리면 취소 (실제 공유는 하지 않음)
                back();
                this.logger.info('공유 메뉴 열기 완료');
                return true;
            }
        } catch (e) {
            this.logger.warn('공유 실패', { error: e.message });
        }
        return false;
    }

    /**
     * 재생목록에 추가
     */
    addToPlaylist() {
        try {
            this.logger.info('재생목록 추가 시도');

            // 저장 버튼 찾기
            const saveButton = desc('Save').findOne(3000);
            if (saveButton) {
                saveButton.click();
                this.human.clickDelay();

                // 나중에 볼 동영상 선택
                const watchLater = text('Watch later').findOne(2000);
                if (watchLater) {
                    watchLater.click();
                    this.logger.info('재생목록 추가 완료 (나중에 볼 동영상)');
                    return true;
                }
            }
        } catch (e) {
            this.logger.warn('재생목록 추가 실패', { error: e.message });
        }
        return false;
    }

    /**
     * YouTube 앱 종료
     */
    closeYouTube() {
        this.logger.info('YouTube 앱 종료');

        try {
            back();
            sleep(500);
            back();
            sleep(500);
            home();

            this.logger.info('YouTube 앱 종료 완료');
        } catch (e) {
            this.logger.warn('앱 종료 중 예외', { error: e.message });
        }
    }

    // ==================== Pop & Accident 전용 함수 ====================

    /**
     * URL로 영상 시청 (Pop/Accident용)
     * @param {string} url - YouTube URL
     * @param {Object} options - 시청 옵션
     * @returns {number} 시청 시간 (초)
     */
    watchVideoByUrl(url, options = {}) {
        const {
            minTime = 30,
            maxTime = 180,
            shouldLike = false,
            shouldComment = false,
            commentText = null
        } = options;

        this.logger.info('URL 영상 시청 시작', { url, options });

        try {
            // URL 열기
            if (!this.openByUrl(url)) {
                this.logger.error('URL 열기 실패');
                return 0;
            }

            // 영상 로딩 대기
            sleep(3000);

            // 시청 시간 계산 (휴먼 패턴 적용)
            const watchTime = this.human.calculateWatchTime(minTime, maxTime);
            this.logger.info('시청 시간 결정', { watchTime });

            // 시청 중 자연스러운 행동
            const totalSteps = Math.floor(watchTime / 15);
            for (let i = 0; i < totalSteps; i++) {
                sleep(15000);

                // 가끔 화면 터치
                if (Math.random() < 0.15) {
                    this.human.randomTouch();
                }

                // 가끔 스크롤 (댓글 확인하는 척)
                if (Math.random() < 0.1) {
                    this.human.naturalScroll('down');
                    sleep(2000);
                    this.human.naturalScroll('up');
                }
            }

            // 나머지 시간
            const remainingTime = watchTime - (totalSteps * 15);
            if (remainingTime > 0) {
                sleep(remainingTime * 1000);
            }

            // 좋아요
            if (shouldLike) {
                this.clickLike();
            }

            // 댓글
            if (shouldComment) {
                if (commentText) {
                    this.writeCustomComment(commentText);
                } else {
                    this.writeComment();
                }
            }

            this.logger.info('URL 영상 시청 완료', { url, watchTime });
            return watchTime;

        } catch (e) {
            this.logger.error('URL 영상 시청 중 오류', { error: e.message });
            return 0;
        }
    }

    /**
     * 커스텀 댓글 작성 (Accident 등에서 사용)
     * @param {string} commentText - 작성할 댓글 내용
     * @returns {boolean} 성공 여부
     */
    writeCustomComment(commentText) {
        if (!commentText) {
            this.logger.warn('댓글 내용이 없습니다');
            return false;
        }

        try {
            this.logger.info('커스텀 댓글 작성 시도', { text: commentText });

            // 댓글 입력창 찾기
            const commentButton = text('Add a comment').findOne(3000);
            if (commentButton) {
                commentButton.click();
                this.human.clickDelay();

                // 자연스러운 입력
                this.human.naturalInput(commentText);
                sleep(1000);

                // 게시 버튼 클릭
                const postButton = text('Post').findOne(2000);
                if (postButton) {
                    postButton.click();
                    this.human.clickDelay();
                    this.logger.info('커스텀 댓글 작성 완료', { text: commentText });
                    return true;
                }
            } else {
                this.logger.warn('댓글 입력창을 찾을 수 없음');
            }
        } catch (e) {
            this.logger.error('커스텀 댓글 작성 실패', { error: e.message });
        }
        return false;
    }

    /**
     * 현재 재생 중인 영상 정보 가져오기
     * @returns {Object|null} { title, channel, duration }
     */
    getCurrentVideoInfo() {
        try {
            const titleElement = id('title').findOne(2000);
            const channelElement = id('channel_name').findOne(1000);

            return {
                title: titleElement ? titleElement.text() : null,
                channel: channelElement ? channelElement.text() : null,
                timestamp: new Date().toISOString()
            };
        } catch (e) {
            this.logger.warn('영상 정보 가져오기 실패', { error: e.message });
            return null;
        }
    }

    /**
     * 영상 정보 추출 (다중 셀렉터 지원)
     * @returns {Object} { title, channel, timestamp }
     */
    extractVideoInfo() {
        try {
            // 제목 찾기 (여러 셀렉터 시도)
            const titleElement = id("title").findOne(3000) ||
                                className("android.widget.TextView")
                                    .textMatches(/^.{10,100}$/)  // 10-100자 텍스트
                                    .findOne(3000);

            // 채널명 찾기 (여러 셀렉터 시도)
            const channelElement = id("channel_name").findOne(2000) ||
                                  id("owner_text").findOne(2000) ||
                                  desc("채널").findOne(2000);

            const title = titleElement?.text() || null;
            const channel = channelElement?.text() || null;

            if (this.logger) {
                this.logger.debug('영상 정보 추출', {
                    title: title?.substring(0, 30),
                    channel
                });
            }

            return {
                title,
                channel,
                timestamp: new Date().toISOString()
            };
        } catch (e) {
            if (this.logger) {
                this.logger.error('영상 정보 추출 실패', { error: e.message });
            }
            return {
                title: null,
                channel: null,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = YouTubeAutomation;
