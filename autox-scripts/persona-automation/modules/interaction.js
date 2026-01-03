/**
 * Interaction Engine
 * 확률 기반 인터랙션 (좋아요, 댓글)
 * 
 * @author Axon (Builder)
 */

class InteractionEngine {
    constructor(config, logger, youtube, openaiHelper) {
        this.config = config;
        this.logger = logger;
        this.youtube = youtube;
        this.openai = openaiHelper;
        
        // 마지막 인터랙션 결과
        this.lastLiked = false;
        this.lastCommented = false;
        this.lastCommentText = null;
    }

    /**
     * 확률 기반 인터랙션 수행
     */
    async performInteraction({ videoInfo, persona, likeProbability, commentProbability }) {
        this.logger.info('🎭 인터랙션 시작', {
            likeProbability,
            commentProbability
        });
        
        // 초기화
        this.lastLiked = false;
        this.lastCommented = false;
        this.lastCommentText = null;
        
        // 1. 좋아요 (확률)
        if (Math.random() < likeProbability) {
            if (this.youtube.clickLike && this.youtube.clickLike()) {
                this.lastLiked = true;
                this.logger.info('👍 좋아요 클릭');
            }
        }
        
        // 2. 댓글 (확률)
        if (Math.random() < commentProbability) {
            // OpenAI로 댓글 생성
            const commentText = await this.openai.generateComment(videoInfo, persona);
            
            if (commentText) {
                // 댓글 작성
                if (this.youtube.writeComment && this.youtube.writeComment(commentText)) {
                    this.lastCommented = true;
                    this.lastCommentText = commentText;
                    this.logger.info('💬 댓글 작성', { 
                        text: commentText.substring(0, 30) + '...' 
                    });
                }
            }
        }
        
        this.logger.info('✅ 인터랙션 완료', {
            liked: this.lastLiked,
            commented: this.lastCommented
        });
    }
}

module.exports = InteractionEngine;
