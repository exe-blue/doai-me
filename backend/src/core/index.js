/**
 * DoAi.Me Distributed Control System - Core Module
 * 
 * 분산 제어 시스템의 핵심 모듈을 내보냅니다.
 * 
 * @author Axon (Tech Lead)
 * @version 2.0.0
 */

const NodeConnectionManager = require('./NodeConnectionManager');
const TaskRouter = require('./TaskRouter');

module.exports = {
    NodeConnectionManager,
    TaskRouter,
    
    // 상수
    CONNECTION_STATE: NodeConnectionManager.CONNECTION_STATE,
    TASK_STATUS: TaskRouter.TASK_STATUS,
    TASK_TYPE: TaskRouter.TASK_TYPE
};

