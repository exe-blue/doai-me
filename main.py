"""AIFarm 메인 실행 파일"""

import argparse
import asyncio
import logging
import os
import random
import yaml

from src.controller.device_manager import DeviceManager
from src.modules import TaskRegistry, TaskConfig
from src.modules.execution_engine import ExecutionEngine

# 내장 태스크 로드
# 내장 태스크 로드 (임포트 시 자동 등록)
import src.modules.tasks  # noqa: F401

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def load_config():
    """설정 파일 로드"""
    try:
        with open('config/config.yaml', 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        logger.warning("설정 파일을 찾을 수 없습니다. 기본 설정을 사용합니다.")
        return {}


async def run_connect(args, config, manager):
    """디바이스 연결 모드"""
    logger.info("디바이스 연결 시작...")
    
    max_workers = args.max_workers or config.get('network', {}).get('max_workers', 50)
    manager.connect_all(max_workers=max_workers)
    
    connected = len(manager.get_connected_ips())
    logger.info(f"연결된 디바이스: {connected}대")
    
    return connected


async def run_youtube(args, config, manager):
    """YouTube 자동화 모드"""
    logger.info("YouTube 자동화 시작...")
    
    # 먼저 연결
    await run_connect(args, config, manager)
    
    connected_ips = manager.get_connected_ips()
    if len(connected_ips) == 0:
        logger.error("연결된 디바이스가 없습니다.")
        return
    
    # YouTube 설정
    youtube_config = config.get('youtube', {})
    
    from src.modules.tasks.youtube_task import YouTubeWatchTask, YouTubeTaskConfig
    
    task_config = YouTubeTaskConfig(
        name="youtube_main",
        keywords=youtube_config.get('keywords', ['AI 뉴스']),
        watch_time_range=tuple(youtube_config.get('watch_time_range', [30, 120])),
        like_probability=youtube_config.get('like_probability', 0.5),
        comment_probability=youtube_config.get('comment_probability', 0.2),
        comments=youtube_config.get('comments', ['좋은 영상 감사합니다!'])
    )
    
    if args.keyword:
        task_config.keywords = [args.keyword]
        logger.info(f"사용 키워드: {args.keyword}")
    else:
        logger.info(f"키워드 목록: {task_config.keywords}")
    
    # 실행
    task = YouTubeWatchTask(task_config)
    engine = ExecutionEngine(manager)
    
    batch_size = args.batch_size or config.get('execution', {}).get('batch_size', 50)
    await engine.run_task(task, batch_size=batch_size)
    
    # 결과 출력
    summary = engine.get_summary()
    logger.info(f"\n=== 결과 요약 ===")
    logger.info(f"총 디바이스: {summary['total']}")
    logger.info(f"성공: {summary['success']}")
    logger.info(f"실패: {summary['failure']}")
    logger.info(f"성공률: {summary['success_rate']:.1f}%")


async def run_task(args, config, manager):
    """일반 태스크 실행 모드"""
    logger.info(f"태스크 실행: {args.task}")
    
    # 연결
    await run_connect(args, config, manager)
    
    if len(manager.get_connected_ips()) == 0:
        logger.error("연결된 디바이스가 없습니다.")
        return
    
    # 태스크 확인
    task_class = TaskRegistry.get(args.task)
    if not task_class:
        logger.error(f"태스크를 찾을 수 없습니다: {args.task}")
        logger.info(f"사용 가능한 태스크: {TaskRegistry.list_tasks()}")
        return
    
    # 설정 생성
    task_config = TaskConfig(
        name=args.task,
        parameters={}
    )
    
    # 추가 파라미터
    if args.params:
        import json
        try:
            task_config.parameters = json.loads(args.params)
        except json.JSONDecodeError:
            logger.error("파라미터 JSON 파싱 실패")
            return
    
    # 실행
    task = task_class(task_config)
    engine = ExecutionEngine(manager)
    
    batch_size = args.batch_size or 50
    await engine.run_task(task, batch_size=batch_size)
    
    # 결과
    summary = engine.get_summary()
    logger.info("완료: %d/%d 성공", summary['success'], summary['total'])


async def run_test(args, config, manager):
    """테스트 모드 (단일 디바이스)"""
    logger.info("테스트 모드 - 단일 디바이스 연결...")
    
    test_ip = args.test_ip or "10.0.10.1"
    
    if manager.connect_device(test_ip):
        device = manager.get_device(test_ip)
        if device:
            logger.info(f"테스트 디바이스 연결 성공: {test_ip}")
            
            # 간단한 테스트
            device.screen_on()
            logger.info("화면 켜기 완료")
            
            # 디바이스 정보
            info = device.info
            logger.info(f"디바이스 정보: {info.get('productName', 'Unknown')}")
        else:
            logger.error("디바이스 객체를 가져올 수 없습니다.")
    else:
        logger.error("디바이스 연결 실패")


async def run_api(args, config):
    """API 서버 모드"""
    logger.info("API 서버 시작...")
    
    import uvicorn
    from src.api.server import app
    
    api_config = config.get('api', {})
    host = args.host or api_config.get('host', '0.0.0.0')
    port = args.port or api_config.get('port', 8000)
    
    uvicorn.run(app, host=host, port=port)


async def run_daemon(args, config, manager):
    """Supabase 데몬 모드"""
    from dotenv import load_dotenv
    load_dotenv()
    
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        logger.error("SUPABASE_URL과 SUPABASE_KEY 환경변수를 설정하세요.")
        return
    
    # 연결
    await run_connect(args, config, manager)
    
    if len(manager.get_connected_ips()) == 0:
        logger.error("연결된 디바이스가 없습니다.")
        return
    
    # 데몬 시작
    from src.data.supabase_executor import SupabaseExecutor
    
    executor = SupabaseExecutor(supabase_url, supabase_key, manager)
    interval = args.interval or config.get('supabase', {}).get('daemon_interval', 30)
    
    await executor.run_daemon(interval=interval)


def list_tasks():
    """등록된 태스크 목록 출력"""
    print("\n=== 등록된 태스크 ===")
    for name in TaskRegistry.list_tasks():
        metadata = TaskRegistry.get_metadata(name)
        print(f"  {name}")
        print(f"    설명: {metadata.get('description', '-')}")
        print(f"    버전: {metadata.get('version', '1.0.0')}")
    print()


async def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(description='AIFarm - 폰보드 자동화 시스템')
    parser.add_argument('--mode', choices=['connect', 'youtube', 'task', 'test', 'api', 'daemon', 'list'],
                        default='connect', help='실행 모드')
    parser.add_argument('--task', type=str, help='실행할 태스크 이름 (mode=task 시)')
    parser.add_argument('--params', type=str, help='태스크 파라미터 (JSON 문자열)')
    parser.add_argument('--keyword', type=str, help='YouTube 검색 키워드')
    parser.add_argument('--max-workers', type=int, help='최대 동시 작업 수')
    parser.add_argument('--batch-size', type=int, help='배치 크기')
    parser.add_argument('--test-ip', type=str, help='테스트 디바이스 IP')
    parser.add_argument('--host', type=str, help='API 서버 호스트')
    parser.add_argument('--port', type=int, help='API 서버 포트')
    parser.add_argument('--interval', type=int, help='데몬 모드 체크 간격 (초)')
    
    args = parser.parse_args()
    config = load_config()
    
    # 태스크 목록 모드
    if args.mode == 'list':
        list_tasks()
        return
    
    # API 서버 모드 (별도 처리)
    if args.mode == 'api':
        await run_api(args, config)
        return
    
    # 디바이스 매니저 생성
    port = config.get('network', {}).get('port', 5555)
    wait_timeout = config.get('automation', {}).get('default_wait_timeout', 5)
    manager = DeviceManager(port=port, wait_timeout=wait_timeout)
    
    try:
        if args.mode == 'connect':
            await run_connect(args, config, manager)
        elif args.mode == 'youtube':
            await run_youtube(args, config, manager)
        elif args.mode == 'task':
            if not args.task:
                logger.error("--task 옵션으로 태스크 이름을 지정하세요.")
                list_tasks()
                return
            await run_task(args, config, manager)
        elif args.mode == 'test':
            await run_test(args, config, manager)
        elif args.mode == 'daemon':
            await run_daemon(args, config, manager)
    finally:
        manager.disconnect_all()


if __name__ == "__main__":
    asyncio.run(main())
