#!/usr/bin/env python3
"""
DoAi.Me YouTube 자동 시청 데모

Orion의 지시: "Laixi 앱이 켜진 상태에서, 우리 코드가 보낸 명령에 따라 
폰이 스스로 유튜브를 보는 것을 1시간 내에 시연해라."

사용법:
    1. Laixi 앱(touping.exe) 실행
    2. Android 기기 USB 연결
    3. python demo_youtube_watch.py [옵션]

옵션:
    --video URL     시청할 YouTube 영상 URL
    --duration SEC  예상 영상 길이 (초, 기본: 180)
    --shorts N      Shorts 시청 모드 (N개 시청)
    --browse        홈 피드 탐색 모드
    --all           모든 연결된 기기에서 실행

예시:
    python demo_youtube_watch.py
    python demo_youtube_watch.py --video "https://youtu.be/abc123" --duration 300
    python demo_youtube_watch.py --shorts 10
    python demo_youtube_watch.py --browse --all
"""

import asyncio
import argparse
import logging
import sys
from pathlib import Path

# 프로젝트 경로 추가
sys.path.insert(0, str(Path(__file__).parent / "gateway" / "src"))

from adapters.laixi_driver import LaixiDriver
from adapters.behavior_engine import BehaviorEngine
from adapters.youtube_watcher import YouTubeWatcher


# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("DoAi.Me")


async def main():
    parser = argparse.ArgumentParser(
        description="DoAi.Me YouTube 자동 시청 데모",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    parser.add_argument(
        "--video", "-v",
        default="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        help="시청할 YouTube 영상 URL"
    )
    parser.add_argument(
        "--duration", "-d",
        type=int,
        default=180,
        help="예상 영상 길이 (초)"
    )
    parser.add_argument(
        "--shorts", "-s",
        type=int,
        metavar="COUNT",
        help="Shorts 시청 모드 (시청할 개수)"
    )
    parser.add_argument(
        "--browse", "-b",
        action="store_true",
        help="홈 피드 탐색 모드"
    )
    parser.add_argument(
        "--all", "-a",
        action="store_true",
        help="모든 연결된 기기에서 실행"
    )
    parser.add_argument(
        "--device",
        help="특정 디바이스 ID 지정"
    )
    parser.add_argument(
        "--no-interaction",
        action="store_true",
        help="좋아요/댓글 비활성화"
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="디버그 로그 활성화"
    )
    
    args = parser.parse_args()
    
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    print("""
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     ██████╗  ██████╗  █████╗ ██╗   ███╗   ███╗███████╗       ║
║     ██╔══██╗██╔═══██╗██╔══██╗██║   ████╗ ████║██╔════╝       ║
║     ██║  ██║██║   ██║███████║██║   ██╔████╔██║█████╗         ║
║     ██║  ██║██║   ██║██╔══██║██║   ██║╚██╔╝██║██╔══╝         ║
║     ██████╔╝╚██████╔╝██║  ██║██║██╗██║ ╚═╝ ██║███████╗       ║
║     ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝╚═╝     ╚═╝╚══════╝       ║
║                                                               ║
║              YouTube Auto Watch Demo v1.0                     ║
║              Powered by Laixi + Behavior Engine               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    """)
    
    # Laixi 드라이버 초기화
    driver = LaixiDriver()
    behavior = BehaviorEngine(driver)
    watcher = YouTubeWatcher(driver, behavior)
    
    logger.info("Laixi 연결 중...")
    
    if not await watcher.connect():
        logger.error("❌ Laixi 연결 실패!")
        logger.error("   touping.exe가 실행 중인지 확인하세요.")
        logger.error("   기본 포트: ws://127.0.0.1:22221/")
        return 1
    
    logger.info("✅ Laixi 연결 성공!")
    
    try:
        # 디바이스 목록 가져오기
        devices = await watcher.list_devices()
        
        if not devices:
            logger.error("❌ 연결된 디바이스가 없습니다!")
            logger.error("   Android 기기를 USB로 연결하세요.")
            return 1
        
        logger.info(f"📱 연결된 디바이스: {len(devices)}대")
        for i, device in enumerate(devices):
            logger.info(f"   [{i+1}] {device}")
        
        # 타겟 디바이스 결정
        if args.device:
            target_devices = [args.device]
        elif args.all:
            target_devices = devices
        else:
            target_devices = [devices[0]]
        
        logger.info(f"🎯 타겟 디바이스: {target_devices}")
        
        # 모드별 실행
        if args.shorts:
            logger.info(f"🎬 Shorts 시청 모드: {args.shorts}개")
            for device in target_devices:
                await watcher.watch_shorts(device, count=args.shorts)
        
        elif args.browse:
            logger.info("🏠 홈 피드 탐색 모드")
            for device in target_devices:
                await watcher.browse_home(device, scroll_count=5, video_count=2)
        
        else:
            logger.info(f"▶️ 영상 시청 모드")
            logger.info(f"   URL: {args.video}")
            logger.info(f"   예상 길이: {args.duration}초")
            
            # 동시 시청 (여러 기기)
            tasks = [
                watcher.watch_video(
                    device_id=device,
                    video_url=args.video,
                    estimated_duration=args.duration,
                    enable_interaction=not args.no_interaction
                )
                for device in target_devices
            ]
            
            sessions = await asyncio.gather(*tasks)
            
            # 결과 출력
            print("\n" + "=" * 60)
            print("📊 시청 결과")
            print("=" * 60)
            
            for session in sessions:
                status = "✅ 완료" if session.completed else "❌ 미완료"
                like = "👍" if session.liked else "  "
                comment = "💬" if session.commented else "  "
                
                print(f"  {session.device_id}: {status} {like} {comment}")
                print(f"    - 시청 시간: {session.elapsed_seconds}/{session.pattern.watch.watch_time}초")
                print(f"    - 시청률: {session.pattern.watch.watch_percent:.1f}%")
            
            print("=" * 60)
        
        logger.info("🎉 데모 완료!")
        return 0
        
    except KeyboardInterrupt:
        logger.info("\n⚠️ 사용자에 의해 중단됨")
        return 130
    except Exception as e:
        logger.exception(f"❌ 오류 발생: {e}")
        return 1
    finally:
        await watcher.disconnect()
        logger.info("연결 종료")


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n중단됨")
        sys.exit(130)

