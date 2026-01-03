/**
 * OpenAI Helper
 * OpenAI API 호출 헬퍼
 * 
 * @author Axon (Builder)
 */

class OpenAIHelper {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.apiKey = config.openai?.apiKey || '';
        this.model = config.openai?.model || 'gpt-4o-mini';
        this.maxTokens = config.openai?.maxTokens || 150;
    }

    /**
     * 댓글 생성
     * 
     * @param videoInfo - 영상 정보
     * @param persona - 페르소나 정보
     * @returns 생성된 댓글 텍스트
     */
    async generateComment(videoInfo, persona) {
        if (!this.apiKey) {
            this.logger.warn('⚠️  OpenAI API Key 없음, 기본 댓글 사용');
            return this.getDefaultComment();
        }

        try {
            const prompt = this.buildCommentPrompt(videoInfo, persona);
            
            this.logger.info('💬 OpenAI 댓글 생성 요청', {
                model: this.model,
                videoTitle: videoInfo.title
            });
            
            const response = await this.callOpenAI(prompt);
            
            this.logger.info('✅ 댓글 생성 완료', {
                length: response.length
            });
            
            return response;
            
        } catch (e) {
            this.logger.error('❌ 댓글 생성 실패', { error: e.message });
            return this.getDefaultComment();
        }
    }

    /**
     * 일일 메모 생성
     */
    async generateDailyMemo(activitySummary) {
        if (!this.apiKey) {
            return '오늘도 600개 존재 중 하나로 활동함';
        }

        const prompt = `다음 페르소나의 오늘 활동을 한 문장으로 요약하세요.

시청: ${activitySummary.videoCount}개
좋아요: ${activitySummary.likeCount}개
댓글: ${activitySummary.commentCount}개
주요 카테고리: ${activitySummary.categories.join(', ')}

한 문장으로 간결하게:`;

        try {
            const response = await this.callOpenAI(prompt);
            return response;
        } catch (e) {
            this.logger.error('메모 생성 실패', { error: e.message });
            return '오늘 활동 완료';
        }
    }

    /**
     * OpenAI API 호출
     */
    async callOpenAI(prompt) {
        const url = 'https://api.openai.com/v1/chat/completions';
        
        const payload = {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: '당신은 자연스러운 한국어 댓글을 작성하는 AI입니다. 짧고 진솔하게 작성하세요.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: this.maxTokens,
            temperature: 0.7
        };
        
        try {
            const response = http.postJson(url, payload, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            
            if (response.statusCode === 200) {
                const data = response.body.json();
                return data.choices[0].message.content.trim();
            } else {
                throw new Error(`OpenAI API 에러: ${response.statusCode}`);
            }
        } catch (e) {
            throw new Error(`API 호출 실패: ${e.message}`);
        }
    }

    /**
     * 댓글 프롬프트 생성
     */
    buildCommentPrompt(videoInfo, persona) {
        return `다음 영상에 대한 자연스러운 한국어 댓글을 작성하세요.

영상 제목: ${videoInfo.title}
채널: ${videoInfo.channel}

페르소나 특성:
- 선호 카테고리: ${persona.preferred_categories?.join(', ') || '일반'}
- 댓글 스타일: 자연스럽고 인간적인

요구사항:
- 20-50자 이내
- 진솔하고 공감 가는 내용
- 이모티콘 선택적 사용 (0-2개)

댓글:`;
    }

    /**
     * 기본 댓글 (OpenAI 실패 시)
     */
    getDefaultComment() {
        const comments = [
            '좋은 영상 감사합니다!',
            '재미있게 봤어요',
            '유익한 정보네요',
            '잘 보고 갑니다',
            '구독하고 갑니다!',
            '좋아요 누르고 갑니다',
        ];
        
        return comments[Math.floor(Math.random() * comments.length)];
    }
}

module.exports = OpenAIHelper;
