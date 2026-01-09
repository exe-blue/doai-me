/**
 * DoAi.Me Persona-Based Autonomous Exploration
 * 페르소나 기반 자율 탐색 시스템
 * 
 * 프로세스:
 * 1. 페르소나 체크 (스냅샷 + 키워드)
 * 2. 페르소나 생성 OR 컨텐츠 탐색
 * 3. 확률 기반 댓글 + 좋아요 (OpenAI)
 * 4. 인격 형성 스코어
 * 5. 메모 생성
 * 6. 지시 체크 (링크 영상)
 * 7. 슬립 5~100초
 * 8. 반복
 *
 * @author Axon (Builder)
 * @version 1.0.0
 */

'nodejs';

// ==================== 모듈 임포트 ====================
const Logger = require('../modules/logger.js');
const API = require('../modules/api.js');
const YouTubeAutomation = require('../modules/youtube.js');
const HumanPattern = require('../modules/human.js');
const CommandFetcher = require('./modules/command-fetcher.js');
const PersonaChecker = require('./modules/persona-checker.js');
const PersonaManager = require('./modules/persona-manager.js');
const ContentExplorer = require('./modules/content-explorer.js');
const OpenAIHelper = require('./modules/openai-helper.js');
const InteractionEngine = require('./modules/interaction.js');
const Scheduler = require('./modules/scheduler.js');
const Validator = require('./modules/validation.js');
const ErrorHandler = require('./modules/error-handler.js');
const ResourceManager = require('./modules/resource-manager.js');

// ==================== 설정 로드 ====================
const ENV = 'dev';
let config;

try {
    // 기본 설정
    config = JSON.parse(files.read(`./config/persona.json`));
    
    // 변수 파일 로드 (덮어쓰기)
    let variables;
    try {
        variables = JSON.parse(files.read(`./config/variables.json`));
        
        // 입력 검증
        const validation = Validator.validateVariables(variables);
        if (!validation.valid) {
            console.warn('⚠️  설정 검증 경고:', validation.errors);
            variables = validation.correctedVariables;  // 수정된 값 사용
        }
        
        config.behavior = variables.behavior;
        config.timing = variables.timing;
        config.openai = { ...config.openai, ...variables.openai };
        config.persona = { ...config.persona, ...variables.persona };
        config.exploration = variables.exploration;
        
    } catch (varErr) {
        console.error('변수 파일 로드 실패, 기본값 사용:', varErr.message);
        // variables.json 없어도 계속 진행 (persona.json의 기본값 사용)
    }
    
} catch (e) {
    console.error('설정 파일 로드 실패:', e.message);
    config = {
        device: { id: device.serial || 'unknown' },
        server: { host: '127.0.0.1', port: 3100, protocol: 'http' },
        openai: { apiKey: '', model: 'gpt-4o-mini' },
        persona: {
            enableAutoCreation: true,
            enableOpenAI: true,
            commentProbability: 0.3,
            likeProbability: 0.5,
            minSleepMs: 5000,
            maxSleepMs: 100000,
        },
        schedule: {
            checkCommandsInterval: 600000,  // 10분
            exploreDuration: 1800000,       // 30분
        }
    };
}

// ==================== 모듈 초기화 ====================
const logger = new Logger(config);
const api = new API(config, logger);
const human = new HumanPattern(config, logger);
const youtube = new YouTubeAutomation(config, logger, human);
const commandFetcher = new CommandFetcher(config, logger, api);
const personaChecker = new PersonaChecker(config, logger, youtube);
const personaManager = new PersonaManager(config, logger, api);
const contentExplorer = new ContentExplorer(config, logger, youtube);
const openaiHelper = new OpenAIHelper(config, logger);
const interaction = new InteractionEngine(config, logger, youtube, openaiHelper);
new Scheduler(config, logger);
const errorHandler = new ErrorHandler(logger);
const resourceManager = new ResourceManager(logger);

// ==================== 전역 변수 ====================
let isRunning = true;
let currentPersona = null;
let startTime = Date.now();
const maxRuntime = 86400000;  // 24시간 최대 실행

// ==================== 메인 프로세스 ====================

async function mainLoop() {
    logger.info('╔════════════════════════════════════════════════════════╗');
    logger.info('║  DoAi.Me Persona Automation                           ║');
    logger.info('║  페르소나 기반 자율 탐색 시스템                        ║');
    logger.info('╚════════════════════════════════════════════════════════╝');
    
    // 1. 페르소나 체크 및 초기화
    currentPersona = await initializePersona();
    
    if (!currentPersona) {
        logger.error('❌ 페르소나 초기화 실패');
        return;
    }
    
    logger.info('✅ 페르소나 준비 완료', {
        id: currentPersona.id,
        name: currentPersona.name,
        aidentityVersion: currentPersona.aidentity_version
    });
    
    // 리소스 관리 시작
    const cleanupHandle = resourceManager.startPeriodicCleanup();
    
    // 주기적 지시 체크 시작 (60초마다)
    const checkHandle = commandFetcher.startPeriodicCheck(async (commands) => {
        // Lock 획득 (동시 실행 방지)
        if (!resourceManager.acquireCommandLock()) {
            logger.warn('⚠️  지시 실행 중, 새 지시 스킵');
            return;
        }
        
        try {
            // 한 번에 1개만 실행
            const command = commands[0];
            await executeCommand(command);
            commandFetcher.markExecuted(command.video_id);
        } finally {
            resourceManager.releaseCommandLock();
        }
    });
    
    // 메인 루프 시작 (평시 행동)
    while (isRunning) {
        try {
            // 최대 실행 시간 체크 (24시간)
            if (Date.now() - startTime > maxRuntime) {
                logger.info('⏰ 최대 실행 시간 도달 (24시간), 정상 종료');
                isRunning = false;
                break;
            }
            
            // 연속 에러 체크
            if (errorHandler.shouldTerminate()) {
                logger.error('🛑 연속 에러 초과, 비정상 종료');
                isRunning = false;
                break;
            }
            
            // Lock 획득 (자율 탐색)
            if (!resourceManager.acquireExplorationLock()) {
                logger.debug('⚠️  탐색 중, 대기');
                sleep(10000);
                continue;
            }
            
            try {
                // 자율 탐색 (Circuit Breaker로 보호)
                await errorHandler.withCircuitBreaker(
                    () => autonomousExploration(),
                    'autonomousExploration'
                );
            } finally {
                resourceManager.releaseExplorationLock();
            }
            
            // 슬립
            await randomSleep();
            
        } catch (e) {
            logger.error('❌ 메인 루프 에러', { 
                error: e.message,
                consecutiveErrors: errorHandler.consecutiveErrors
            });
            sleep(60000);  // 에러 시 1분 대기
        }
    }
    
    // Cleanup
    logger.info('🧹 정리 시작');
    checkHandle();
    cleanupHandle();
    logger.info('✅ 정상 종료');
}

// ==================== 핵심 함수 ====================

/**
 * 페르소나 초기화
 */
async function initializePersona() {
    logger.info('🔍 페르소나 체크 시작');
    
    // 1. 스냅샷 3장 + 키워드 추출
    const checkResult = await personaChecker.check();
    
    if (!checkResult.success) {
        logger.warn('⚠️  페르소나 체크 실패', { reason: checkResult.reason });
        return null;
    }
    
    logger.info('📸 스냅샷 캡처 완료', {
        screenshots: checkResult.screenshots.length,
        keywords: checkResult.keywords
    });
    
    // 2. 기존 페르소나 조회
    let persona = await personaManager.getPersona(config.device.id);
    
    if (!persona && config.persona.enableAutoCreation) {
        // 3. 신규 페르소나 생성
        logger.info('👶 신규 페르소나 생성');
        
        persona = await personaManager.createPersona({
            device_serial: config.device.id,
            initial_keywords: checkResult.keywords,
            screenshots: checkResult.screenshots
        });
        
        logger.info('✅ 페르소나 생성 완료', { id: persona.id });
    }
    
    return persona;
}

// checkPendingCommands 함수는 CommandFetcher로 대체됨

/**
 * 지시 실행
 */
async function executeCommand(video) {
    // Null 체크
    if (!video || !video.video_id || !video.url) {
        logger.error('❌ 잘못된 video 객체', { video });
        return;
    }
    
    logger.info('🎬 지시 실행', { 
        videoId: video.video_id,
        title: video.subject,
        url: video.url,
        scheduledTime: `${video.time}시`
    });
    
    const startTime = Date.now();
    
    try {
        // 1. YouTube 앱 실행 (재시도 3회)
        const launchSuccess = await errorHandler.withRetry(
            () => {
                if (!youtube.launchYouTube()) {
                    throw new Error('YouTube 앱 실행 실패');
                }
                return true;
            },
            3,
            2000
        );
        
        // 2. URL 열기
        if (!youtube.openByUrl(video.url)) {
            throw new Error('URL 열기 실패');
        }
        
        sleep(3000);
        
        // 3. 영상 정보 추출
        const videoInfo = {
            title: video.subject,
            url: video.url,
            keyword: video.keyword
        };
        
        // 4. 영상 시청 (변수 파일에서 가져오기)
        const variables = JSON.parse(files.read('./config/variables.json'));
        const watchDuration = Math.floor(
            Math.random() * (variables.behavior.maxWatchDuration - variables.behavior.minWatchDuration)
        ) + variables.behavior.minWatchDuration;
        
        logger.info('👀 영상 시청', { duration: watchDuration });
        sleep(watchDuration * 1000);
        
        // 5. OpenAI 기반 인터랙션 (변수 파일 활용)
        if (config.persona.enableOpenAI) {
            const variables = JSON.parse(files.read('./config/variables.json'));
            
            await interaction.performInteraction({
                videoInfo,
                persona: currentPersona,
                likeProbability: variables.behavior.likeProbability,
                commentProbability: variables.behavior.commentProbability
            });
        }
        
        // 6. 결과 보고 (Supabase)
        const duration = Math.floor((Date.now() - startTime) / 1000);
        
        await api.completeVideoTask({
            video_id: video.video_id,
            device_serial: config.device.id,
            watch_duration: duration,
            liked: interaction.lastLiked,
            commented: interaction.lastCommented,
            comment_text: interaction.lastCommentText
        });
        
        logger.info('✅ 지시 완료', { videoId: video.video_id, duration });
        
        // 7. Trace 기록
        await api.recordTrace({
            device_serial: config.device.id,
            action_type: 'YOUTUBE_WATCH',
            outcome_success: true,
            outcome_summary: {
                video_id: video.video_id,
                video_title: video.subject,
                video_url: video.url,
                duration_sec: duration,
                ai_generated: config.persona.enableOpenAI,
                scheduled_time: video.time
            }
        });
        
    } catch (e) {
        logger.error('❌ 지시 실행 실패', { error: e.message });
        
        await api.completeVideoTask({
            video_id: video.video_id,
            device_serial: config.device.id,
            watch_duration: 0,
            error_message: e.message
        });
    }
}

/**
 * 자율 탐색 (평시 행동)
 */
async function autonomousExploration() {
    logger.info('🌐 자율 탐색 시작');
    
    try {
        // 1. 페르소나 기반 키워드 선택
        const keyword = contentExplorer.selectKeyword(currentPersona);
        
        logger.info('🔍 키워드 선택', { keyword });
        
        // 2. YouTube 검색
        if (!youtube.launchYouTube()) {
            throw new Error('YouTube 앱 실행 실패');
        }
        
        if (!youtube.searchByKeyword(keyword)) {
            throw new Error('검색 실패');
        }
        
        // 3. 랜덤 비디오 선택
        const rank = Math.floor(Math.random() * 5) + 1;
        if (!youtube.selectVideoByRank(rank)) {
            throw new Error('비디오 선택 실패');
        }
        
        sleep(2000);
        
        // 4. 시청 시간 (확률 분포)
        const watchDuration = Math.floor(Math.random() * 120) + 30;  // 30-150초
        logger.info('👀 자율 시청', { keyword, rank, duration: watchDuration });
        sleep(watchDuration * 1000);
        
        // 5. OpenAI 기반 인터랙션
        if (config.persona.enableOpenAI) {
            const videoInfo = await youtube.extractVideoInfo();
            
            await interaction.performInteraction({
                videoInfo,
                persona: currentPersona,
                likeProbability: config.persona.likeProbability * 0.5,  // 자율 탐색 시 확률 낮춤
                commentProbability: config.persona.commentProbability * 0.3
            });
        }
        
        // 6. 페르소나 업데이트 (선호 카테고리)
        await personaManager.updatePreferences(currentPersona.id, keyword, videoInfo);
        
        logger.info('✅ 자율 탐색 완료');
        
    } catch (e) {
        logger.error('❌ 자율 탐색 실패', { error: e.message });
    }
}

/**
 * 랜덤 슬립
 */
async function randomSleep() {
    const sleepMs = Math.floor(Math.random() * (config.persona.maxSleepMs - config.persona.minSleepMs)) + config.persona.minSleepMs;
    const sleepSec = Math.floor(sleepMs / 1000);
    
    logger.info('😴 슬립', { duration: `${sleepSec}초` });
    sleep(sleepMs);
}

// ==================== 실행 ====================

try {
    mainLoop();
} catch (e) {
    logger.error('❌ 치명적 에러', { error: e.message, stack: e.stack });
}
