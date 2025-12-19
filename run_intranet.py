"""인트라넷 서버 실행 스크립트"""

import argparse
from src.web.server import run_server

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AIFarm 인트라넷 서버")
    parser.add_argument("--host", default="0.0.0.0", help="호스트 (기본: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8080, help="포트 (기본: 8080)")
    
    args = parser.parse_args()
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     🤖 AIFarm 인트라넷 서버                                   ║
║                                                              ║
║     URL: http://{args.host}:{args.port}                            ║
║     API Docs: http://{args.host}:{args.port}/api/docs              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    run_server(host=args.host, port=args.port)

