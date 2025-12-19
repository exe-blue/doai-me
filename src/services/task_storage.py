"""태스크 저장소 서비스"""

import json
import os
import re
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from pathlib import Path

from src.models.youtube_task import YouTubeTaskModel, YouTubeTaskCreate, YouTubeTaskUpdate, TaskStatus


class TaskStorage:
    """로컬 JSON 파일 기반 태스크 저장소"""
    
    def __init__(self, storage_path: str = "data/tasks.json"):
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_file()
    
    def _ensure_file(self):
        """파일이 없으면 생성"""
        if not self.storage_path.exists():
            self._save_all([])
    
    def _load_all(self) -> List[dict]:
        """모든 태스크 로드"""
        try:
            with open(self.storage_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    
    def _save_all(self, tasks: List[dict]):
        """모든 태스크 저장"""
        with open(self.storage_path, 'w', encoding='utf-8') as f:
            json.dump(tasks, f, ensure_ascii=False, indent=2, default=str)
    
    def parse_relative_time(self, time_str: str) -> datetime:
        """
        상대 시간 문자열 파싱
        
        예: '30분뒤', '1시간뒤', '2일뒤', '즉시'
        """
        time_str = time_str.strip().lower()
        
        if time_str in ('즉시', '지금', 'now'):
            return datetime.now()
        
        # 패턴 매칭
        patterns = [
            (r'(\d+)\s*분\s*뒤?', 'minutes'),
            (r'(\d+)\s*시간\s*뒤?', 'hours'),
            (r'(\d+)\s*일\s*뒤?', 'days'),
            (r'(\d+)\s*min', 'minutes'),
            (r'(\d+)\s*hour', 'hours'),
            (r'(\d+)\s*day', 'days'),
        ]
        
        for pattern, unit in patterns:
            match = re.search(pattern, time_str)
            if match:
                value = int(match.group(1))
                if unit == 'minutes':
                    return datetime.now() + timedelta(minutes=value)
                elif unit == 'hours':
                    return datetime.now() + timedelta(hours=value)
                elif unit == 'days':
                    return datetime.now() + timedelta(days=value)
        
        # 절대 시간 시도
        try:
            return datetime.fromisoformat(time_str)
        except ValueError:
            pass
        
        # 기본값: 1시간 후
        return datetime.now() + timedelta(hours=1)
    
    def create(self, task_create: YouTubeTaskCreate) -> YouTubeTaskModel:
        """태스크 생성"""
        tasks = self._load_all()
        
        # 모델 생성
        task = YouTubeTaskModel(
            **task_create.model_dump(),
            scheduled_at=self.parse_relative_time(task_create.scheduled_time)
        )
        
        tasks.append(task.model_dump())
        self._save_all(tasks)
        
        return task
    
    def get(self, task_id: str) -> Optional[YouTubeTaskModel]:
        """태스크 조회"""
        tasks = self._load_all()
        
        for task_data in tasks:
            if task_data.get('id') == task_id:
                return YouTubeTaskModel(**task_data)
        
        return None
    
    def get_all(
        self, 
        status: Optional[TaskStatus] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[YouTubeTaskModel]:
        """태스크 목록 조회"""
        tasks = self._load_all()
        
        # 상태 필터
        if status:
            tasks = [t for t in tasks if t.get('status') == status]
        
        # 정렬 (생성일 내림차순)
        tasks.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        # 페이지네이션
        tasks = tasks[offset:offset + limit]
        
        return [YouTubeTaskModel(**t) for t in tasks]
    
    def update(self, task_id: str, task_update: YouTubeTaskUpdate) -> Optional[YouTubeTaskModel]:
        """태스크 수정"""
        tasks = self._load_all()
        
        for i, task_data in enumerate(tasks):
            if task_data.get('id') == task_id:
                # 업데이트할 필드만 적용
                update_data = task_update.model_dump(exclude_unset=True)
                
                for key, value in update_data.items():
                    if value is not None:
                        task_data[key] = value
                
                # 스케줄 시간 재계산
                if 'scheduled_time' in update_data:
                    task_data['scheduled_at'] = self.parse_relative_time(
                        update_data['scheduled_time']
                    ).isoformat()
                
                task_data['updated_at'] = datetime.now().isoformat()
                tasks[i] = task_data
                self._save_all(tasks)
                
                return YouTubeTaskModel(**task_data)
        
        return None
    
    def delete(self, task_id: str) -> bool:
        """태스크 삭제"""
        tasks = self._load_all()
        original_count = len(tasks)
        
        tasks = [t for t in tasks if t.get('id') != task_id]
        
        if len(tasks) < original_count:
            self._save_all(tasks)
            return True
        
        return False
    
    def get_pending_tasks(self) -> List[YouTubeTaskModel]:
        """실행 대기중인 태스크 조회 (스케줄 시간 도래)"""
        tasks = self._load_all()
        now = datetime.now()
        
        pending = []
        for task_data in tasks:
            if task_data.get('status') in (TaskStatus.PENDING, TaskStatus.SCHEDULED):
                scheduled_at = task_data.get('scheduled_at')
                if scheduled_at:
                    if isinstance(scheduled_at, str):
                        scheduled_at = datetime.fromisoformat(scheduled_at)
                    if scheduled_at <= now:
                        pending.append(YouTubeTaskModel(**task_data))
        
        return pending
    
    def update_status(
        self, 
        task_id: str, 
        status: TaskStatus, 
        result: Optional[dict] = None
    ) -> Optional[YouTubeTaskModel]:
        """태스크 상태 업데이트"""
        tasks = self._load_all()
        
        for i, task_data in enumerate(tasks):
            if task_data.get('id') == task_id:
                task_data['status'] = status
                task_data['updated_at'] = datetime.now().isoformat()
                
                if status == TaskStatus.RUNNING:
                    task_data['started_at'] = datetime.now().isoformat()
                elif status in (TaskStatus.COMPLETED, TaskStatus.FAILED):
                    task_data['completed_at'] = datetime.now().isoformat()
                    if result:
                        task_data['result'] = result
                
                tasks[i] = task_data
                self._save_all(tasks)
                
                return YouTubeTaskModel(**task_data)
        
        return None


# 싱글톤 인스턴스
_storage: Optional[TaskStorage] = None


def get_storage() -> TaskStorage:
    """저장소 인스턴스 가져오기"""
    global _storage
    if _storage is None:
        _storage = TaskStorage()
    return _storage

