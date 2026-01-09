"""
Commission Service

작업 위임 비즈니스 로직
- Commission 생성, 조회, 업데이트
- 배치 Commission 처리
- 디바이스 할당 로직
- 결과 처리 및 통계

@author Axon (DoAi.Me Tech Lead)
@created 2026-01-09
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import logging
import uuid

from shared.schemas.commission import (
    CommissionCreate,
    CommissionUpdate,
    CommissionInDB,
    CommissionResponse,
    CommissionBatchCreate,
    CommissionBatchResponse,
    CommissionResult,
    CommissionStats,
    CommissionListResponse,
    CommissionQueueStatus,
    ActiveCommissionsResponse,
    CommissionStatus,
    JobType,
    PlatformType,
)

from .supabase_rpc import get_supabase_client

logger = logging.getLogger("commission_service")


class CommissionService:
    """Commission 서비스"""

    def __init__(self):
        self.supabase = get_supabase_client()

    # =========================================
    # Commission CRUD
    # =========================================

    async def create_commission(self, data: CommissionCreate) -> CommissionResponse:
        """
        단일 Commission 생성
        """
        commission_id = str(uuid.uuid4())

        insert_data = {
            "id": commission_id,
            "job_type": data.job.type.value,
            "platform": data.job.platform.value,
            "url": data.job.url,
            "video_id": data.job.video_id,
            "channel_id": data.job.channel_id,
            "device_id": data.device_id,
            "status": CommissionStatus.PENDING.value,
            "priority": data.priority,
            "target_config": data.target.model_dump() if data.target else None,
            "content_config": data.content.model_dump() if data.content else None,
            "timing_config": data.timing.model_dump() if data.timing else None,
            "reward_config": data.reward.model_dump() if data.reward else None,
            "compliance_config": data.compliance.model_dump() if data.compliance else None,
            "scheduled_at": data.scheduled_at.isoformat() if data.scheduled_at else None,
            "tags": data.tags or [],
            "metadata": data.metadata or {},
        }

        result = self.supabase.table("commissions").insert(insert_data).execute()

        if not result.data:
            raise Exception("Commission 생성 실패")

        logger.info(f"Commission 생성: {commission_id}, job_type={data.job.type.value}")

        return await self.get_commission(commission_id)

    async def get_commission(self, commission_id: str) -> Optional[CommissionResponse]:
        """
        Commission 단건 조회
        """
        result = self.supabase.table("commissions")\
            .select("*")\
            .eq("id", commission_id)\
            .execute()

        if not result.data:
            return None

        return self._to_response(result.data[0])

    async def list_commissions(
        self,
        status: Optional[CommissionStatus] = None,
        job_type: Optional[JobType] = None,
        device_id: Optional[str] = None,
        workstation_id: Optional[str] = None,
        video_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> CommissionListResponse:
        """
        Commission 목록 조회
        """
        query = self.supabase.table("commissions").select("*", count="exact")

        if status:
            query = query.eq("status", status.value)
        if job_type:
            query = query.eq("job_type", job_type.value)
        if device_id:
            query = query.eq("device_id", device_id)
        if workstation_id:
            query = query.eq("workstation_id", workstation_id)
        if video_id:
            query = query.eq("video_id", video_id)

        query = query.order("priority", desc=True)\
                     .order("created_at", desc=True)\
                     .range(offset, offset + limit - 1)

        result = query.execute()

        commissions = [self._to_response(c) for c in result.data]
        stats = await self.get_stats()

        total = result.count or len(result.data)

        return CommissionListResponse(
            total=total,
            stats=stats,
            commissions=commissions,
            page=(offset // limit) + 1,
            page_size=limit,
            total_pages=(total + limit - 1) // limit,
        )

    async def update_commission(
        self,
        commission_id: str,
        data: CommissionUpdate
    ) -> Optional[CommissionResponse]:
        """
        Commission 업데이트
        """
        update_data = {}

        if data.status:
            update_data["status"] = data.status.value
            if data.status == CommissionStatus.SUCCESS:
                update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
            elif data.status == CommissionStatus.ASSIGNED:
                update_data["assigned_at"] = datetime.now(timezone.utc).isoformat()
            elif data.status == CommissionStatus.IN_PROGRESS:
                update_data["started_at"] = datetime.now(timezone.utc).isoformat()

        if data.priority is not None:
            update_data["priority"] = data.priority
        if data.scheduled_at is not None:
            update_data["scheduled_at"] = data.scheduled_at.isoformat()
        if data.tags is not None:
            update_data["tags"] = data.tags
        if data.metadata is not None:
            update_data["metadata"] = data.metadata

        if not update_data:
            return await self.get_commission(commission_id)

        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

        result = self.supabase.table("commissions")\
            .update(update_data)\
            .eq("id", commission_id)\
            .execute()

        if not result.data:
            return None

        return await self.get_commission(commission_id)

    async def delete_commission(self, commission_id: str) -> bool:
        """
        Commission 삭제
        """
        result = self.supabase.table("commissions")\
            .delete()\
            .eq("id", commission_id)\
            .execute()

        return bool(result.data)

    # =========================================
    # 배치 Commission
    # =========================================

    async def create_batch(self, data: CommissionBatchCreate) -> CommissionBatchResponse:
        """
        배치 Commission 생성

        여러 디바이스에 동일한 작업 배포
        """
        batch_id = str(uuid.uuid4())

        # 대상 디바이스 목록 결정
        device_ids = data.device_ids

        if not device_ids and data.target_workstations:
            # 워크스테이션에서 디바이스 조회
            device_ids = await self._get_devices_by_workstations(
                data.target_workstations,
                data.device_percent
            )

        if not device_ids:
            raise ValueError("대상 디바이스가 없습니다")

        # 배치 레코드 생성
        batch_data = {
            "id": batch_id,
            "job_type": data.job.type.value,
            "platform": data.job.platform.value,
            "url": data.job.url,
            "video_id": data.job.video_id,
            "target_workstations": data.target_workstations,
            "device_percent": data.device_percent,
            "total_commissions": len(device_ids),
            "status": CommissionStatus.PENDING.value,
            "scheduled_at": data.scheduled_at.isoformat() if data.scheduled_at else None,
            "tags": data.tags or [],
        }

        self.supabase.table("commission_batches").insert(batch_data).execute()

        # 각 디바이스에 Commission 생성
        commission_ids = []
        for device_id in device_ids:
            commission_data = {
                "id": str(uuid.uuid4()),
                "batch_id": batch_id,
                "job_type": data.job.type.value,
                "platform": data.job.platform.value,
                "url": data.job.url,
                "video_id": data.job.video_id,
                "device_id": device_id,
                "status": CommissionStatus.PENDING.value,
                "priority": data.priority,
                "content_config": data.content.model_dump() if data.content else None,
                "timing_config": data.timing.model_dump() if data.timing else None,
                "reward_config": data.reward.model_dump() if data.reward else None,
                "compliance_config": data.compliance.model_dump() if data.compliance else None,
                "scheduled_at": data.scheduled_at.isoformat() if data.scheduled_at else None,
                "tags": data.tags or [],
            }
            commission_ids.append(commission_data["id"])

        # 벌크 삽입
        if commission_ids:
            commissions_to_insert = []
            for i, device_id in enumerate(device_ids):
                commissions_to_insert.append({
                    "id": commission_ids[i],
                    "batch_id": batch_id,
                    "job_type": data.job.type.value,
                    "platform": data.job.platform.value,
                    "url": data.job.url,
                    "video_id": data.job.video_id,
                    "device_id": device_id,
                    "status": CommissionStatus.PENDING.value,
                    "priority": data.priority,
                    "content_config": data.content.model_dump() if data.content else None,
                    "timing_config": data.timing.model_dump() if data.timing else None,
                    "reward_config": data.reward.model_dump() if data.reward else None,
                    "compliance_config": data.compliance.model_dump() if data.compliance else None,
                    "scheduled_at": data.scheduled_at.isoformat() if data.scheduled_at else None,
                    "tags": data.tags or [],
                })

            self.supabase.table("commissions").insert(commissions_to_insert).execute()

        logger.info(f"배치 Commission 생성: batch_id={batch_id}, count={len(commission_ids)}")

        return CommissionBatchResponse(
            batch_id=batch_id,
            total_created=len(commission_ids),
            total_devices=len(device_ids),
            commissions=commission_ids,
            created_at=datetime.now(timezone.utc),
        )

    async def _get_devices_by_workstations(
        self,
        workstation_ids: List[str],
        device_percent: float
    ) -> List[str]:
        """
        워크스테이션에서 디바이스 목록 조회
        """
        query = self.supabase.table("devices")\
            .select("id")\
            .eq("status", "online")

        if workstation_ids:
            query = query.in_("workstation_id", workstation_ids)

        result = query.execute()

        if not result.data:
            return []

        device_ids = [d["id"] for d in result.data]

        # 비율 적용
        if device_percent < 1.0:
            import random
            count = max(1, int(len(device_ids) * device_percent))
            device_ids = random.sample(device_ids, count)

        return device_ids

    # =========================================
    # 디바이스 할당
    # =========================================

    async def get_next_commission(
        self,
        device_id: str,
        workstation_id: Optional[str] = None
    ) -> Optional[CommissionResponse]:
        """
        디바이스에 할당할 다음 Commission 가져오기

        RPC 함수 사용하여 원자적으로 처리
        """
        try:
            result = self.supabase.rpc(
                "get_next_commission",
                {"p_device_id": device_id, "p_workstation_id": workstation_id}
            ).execute()

            if not result.data:
                return None

            commission_data = result.data[0]
            return await self.get_commission(commission_data["id"])

        except Exception as e:
            logger.error(f"다음 Commission 가져오기 실패: {e}")
            return None

    async def assign_commission(
        self,
        commission_id: str,
        device_id: str
    ) -> Optional[CommissionResponse]:
        """
        Commission을 특정 디바이스에 수동 할당
        """
        update_data = {
            "device_id": device_id,
            "status": CommissionStatus.ASSIGNED.value,
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        result = self.supabase.table("commissions")\
            .update(update_data)\
            .eq("id", commission_id)\
            .eq("status", CommissionStatus.PENDING.value)\
            .execute()

        if not result.data:
            return None

        return await self.get_commission(commission_id)

    # =========================================
    # 결과 처리
    # =========================================

    async def submit_result(self, result: CommissionResult) -> CommissionResponse:
        """
        Commission 결과 제출
        """
        # 결과 저장
        result_data = {
            "commission_id": result.commission_id,
            "device_id": result.device_id,
            "status": result.status.value,
            "execution_time_ms": result.execution_time_ms,
            "credits_earned": result.credits_earned,
            "action_details": result.action_details,
            "error_code": result.error_code,
            "error_message": result.error_message,
            "persona_alignment": result.persona_alignment,
            "refused_reason": result.refused_reason,
        }

        self.supabase.table("commission_results").insert(result_data).execute()

        # Commission 업데이트
        update_data = {
            "status": result.status.value,
            "result_status": result.status.value,
            "result_data": result.action_details,
            "credits_earned": result.credits_earned,
            "error_code": result.error_code,
            "error_message": result.error_message,
            "execution_time_ms": result.execution_time_ms,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        if result.persona_alignment is not None:
            update_data["persona_alignment"] = result.persona_alignment

        self.supabase.table("commissions")\
            .update(update_data)\
            .eq("id", result.commission_id)\
            .execute()

        # 배치 통계 업데이트 (배치인 경우)
        commission = await self.get_commission(result.commission_id)
        if commission and commission.metadata.get("batch_id"):
            try:
                self.supabase.rpc(
                    "update_batch_stats",
                    {"p_batch_id": commission.metadata["batch_id"]}
                ).execute()
            except Exception as e:
                logger.warning(f"배치 통계 업데이트 실패: {e}")

        logger.info(
            f"Commission 결과 제출: {result.commission_id}, "
            f"status={result.status.value}, credits={result.credits_earned}"
        )

        return commission

    # =========================================
    # 통계
    # =========================================

    async def get_stats(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> CommissionStats:
        """
        Commission 통계 조회
        """
        try:
            result = self.supabase.rpc(
                "get_commission_stats",
                {
                    "p_start_date": start_date.isoformat() if start_date else None,
                    "p_end_date": end_date.isoformat() if end_date else None,
                }
            ).execute()

            if result.data:
                data = result.data[0]
                return CommissionStats(
                    total=data.get("total", 0),
                    pending=data.get("pending", 0),
                    assigned=data.get("assigned", 0),
                    in_progress=data.get("in_progress", 0),
                    success=data.get("success", 0),
                    failed=data.get("failed", 0),
                    refused=data.get("refused", 0),
                    timeout=data.get("timeout", 0),
                    cancelled=data.get("cancelled", 0),
                    total_credits_earned=data.get("total_credits_earned", 0),
                    avg_execution_time_ms=float(data.get("avg_execution_time_ms", 0)),
                    success_rate=float(data.get("success_rate", 0)),
                )
        except Exception as e:
            logger.error(f"통계 조회 실패: {e}")

        return CommissionStats()

    async def get_queue_status(self) -> CommissionQueueStatus:
        """
        Commission 대기열 상태 조회
        """
        # 대기열 길이
        pending_result = self.supabase.table("commissions")\
            .select("count", count="exact")\
            .eq("status", CommissionStatus.PENDING.value)\
            .execute()

        # 처리 중
        processing_result = self.supabase.table("commissions")\
            .select("count", count="exact")\
            .in_("status", [
                CommissionStatus.ASSIGNED.value,
                CommissionStatus.SENT.value,
                CommissionStatus.IN_PROGRESS.value,
            ])\
            .execute()

        return CommissionQueueStatus(
            queue_length=pending_result.count or 0,
            processing_count=processing_result.count or 0,
        )

    async def get_active_commissions(self) -> ActiveCommissionsResponse:
        """
        활성 Commission 목록 조회 (실시간 모니터링)
        """
        result = self.supabase.table("commissions")\
            .select("*")\
            .in_("status", [
                CommissionStatus.ASSIGNED.value,
                CommissionStatus.SENT.value,
                CommissionStatus.IN_PROGRESS.value,
            ])\
            .order("priority", desc=True)\
            .limit(100)\
            .execute()

        commissions = [self._to_response(c) for c in result.data]
        queue_status = await self.get_queue_status()

        return ActiveCommissionsResponse(
            active_count=len(commissions),
            queue_status=queue_status,
            active_commissions=commissions,
        )

    # =========================================
    # Helper
    # =========================================

    def _to_response(self, data: dict) -> CommissionResponse:
        """
        DB 레코드를 응답 스키마로 변환
        """
        return CommissionResponse(
            id=data["id"],
            job_type=JobType(data["job_type"]),
            platform=PlatformType(data.get("platform", "youtube")),
            url=data.get("url"),
            video_id=data.get("video_id"),
            channel_id=data.get("channel_id"),
            device_id=data.get("device_id"),
            device_serial=data.get("device_serial"),
            workstation_id=data.get("workstation_id"),
            status=CommissionStatus(data["status"]),
            priority=data.get("priority", 5),
            target_config=data.get("target_config"),
            content_config=data.get("content_config"),
            timing_config=data.get("timing_config"),
            reward_config=data.get("reward_config"),
            compliance_config=data.get("compliance_config"),
            result_status=data.get("result_status"),
            result_data=data.get("result_data"),
            credits_earned=data.get("credits_earned", 0),
            error_code=data.get("error_code"),
            error_message=data.get("error_message"),
            retry_count=data.get("retry_count", 0),
            execution_time_ms=data.get("execution_time_ms"),
            scheduled_at=data.get("scheduled_at"),
            assigned_at=data.get("assigned_at"),
            sent_at=data.get("sent_at"),
            started_at=data.get("started_at"),
            completed_at=data.get("completed_at"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
            tags=data.get("tags", []),
            metadata=data.get("metadata", {}),
        )


# 싱글톤 인스턴스
_commission_service: Optional[CommissionService] = None


def get_commission_service() -> CommissionService:
    """Commission 서비스 싱글톤 반환"""
    global _commission_service
    if _commission_service is None:
        _commission_service = CommissionService()
    return _commission_service
