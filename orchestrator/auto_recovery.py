"""
Auto Self-Healing Policy Engine
자동 자가복구 정책 엔진

오리온의 원칙:
\"자동 자가복구는 soft/service까지만. power는 경보만 생성한다.\"

@author Axon (Builder)
@version 1.0.0
"""

import asyncio
import time
from typing import Dict


class AutoRecoveryEngine:
    """
    자동 자가복구 엔진
    
    규칙:
    - Device drop -10% → soft
    - Device drop -30% 또는 soft 2회 실패 → service
    - Power는 경보만 (수동 승인 대기)
    
    제약:
    - 쿨다운 (재실행 제한)
    - 일일 실행 제한
    """
    
    def __init__(self, state, supabase, logger):
        self.state = state
        self.supabase = supabase
        self.logger = logger
        
        # Node별 이전 device_count 추적
        self.prev_device_counts: Dict[str, int] = {}
        
        # Soft 실패 카운트
        self.soft_failure_counts: Dict[str, int] = {}
    
    async def monitor_loop(self):
        """
        자동 복구 감시 루프 (30초마다)
        
        체크 항목:
        1. Device drop (디바이스 수 감소)
        2. Laixi 상태
        3. ADB 상태
        """
        self.logger.info("🤖 자동 복구 엔진 시작 (30초 간격)")
        
        while True:
            try:
                await asyncio.sleep(30)
                
                # 온라인 노드만 체크
                online_nodes = self.state.get_online_nodes()
                
                for node_id in online_nodes:
                    node = self.state.get_node(node_id)
                    
                    if not node:
                        continue
                    
                    # 1. Device drop 체크
                    await self.check_device_drop(node_id, node.device_count)
                    
                    # 2. Laixi 상태 체크
                    if node.laixi_status == 'not_running':
                        await self.trigger_recovery(
                            node_id,
                            'service',
                            'laixi_not_running',
                            {'laixi_status': node.laixi_status}
                        )
                    
                    # 3. ADB 상태 체크
                    if node.adb_status == 'error' and node.device_count == 0:
                        await self.trigger_recovery(
                            node_id,
                            'service',
                            'adb_error',
                            {'adb_status': node.adb_status, 'device_count': 0}
                        )
            
            except Exception as e:
                self.logger.error(f"자동 복구 루프 에러: {e}")
    
    async def check_device_drop(self, node_id: str, current_count: int):
        """
        디바이스 수 감소 체크
        
        규칙:
        - -10% → soft
        - -30% → service
        """
        # 이전 값이 없으면 현재 값으로 초기화
        if node_id not in self.prev_device_counts:
            self.prev_device_counts[node_id] = current_count
            return
        
        prev_count = self.prev_device_counts[node_id]
        
        # 감소 없으면 업데이트만
        if current_count >= prev_count:
            self.prev_device_counts[node_id] = current_count
            return
        
        # 감소율 계산
        if prev_count == 0:
            return
        
        drop_pct = ((prev_count - current_count) / prev_count) * 100
        
        self.logger.warn(f"📉 Device drop 감지: {node_id} ({prev_count} → {current_count}, -{drop_pct:.1f}%)")
        
        # 규칙 적용
        if drop_pct >= 30:
            # -30% 이상 → service
            await self.trigger_recovery(
                node_id,
                'service',
                'device_drop_30pct',
                {
                    'device_count_before': prev_count,
                    'device_count_after': current_count,
                    'drop_percentage': drop_pct
                }
            )
        elif drop_pct >= 10:
            # -10% 이상 → soft
            await self.trigger_recovery(
                node_id,
                'soft',
                'device_drop_10pct',
                {
                    'device_count_before': prev_count,
                    'device_count_after': current_count,
                    'drop_percentage': drop_pct
                }
            )
        
        # 현재 값으로 업데이트
        self.prev_device_counts[node_id] = current_count
    
    async def trigger_recovery(self, node_id: str, level: str, rule_name: str, condition: dict):
        """
        자동 복구 트리거
        
        1. 복구 규칙 조회
        2. 쿨다운/일일 제한 체크
        3. 복구 요청 생성
        4. 실행 (soft/service만)
        """
        self.logger.info(f"🔧 자동 복구 트리거: {node_id} (규칙: {rule_name}, 레벨: {level})")
        
        try:
            # 1. 규칙 조회
            rule = self.supabase.table('auto_recovery_rules')\
                .select('*')\
                .eq('rule_name', rule_name)\
                .single()\
                .execute()
            
            if not rule.data or not rule.data['enabled']:
                self.logger.info(f"  → 규칙 비활성화: {rule_name}")
                return
            
            rule_id = rule.data['rule_id']
            
            # 2. 쿨다운/일일 제한 체크
            allowed = self.supabase.rpc('is_auto_recovery_allowed', {
                'p_rule_id': rule_id,
                'p_node_id': node_id
            }).execute()
            
            if not allowed.data:
                self.logger.info(f"  → 복구 제한 (쿨다운 또는 일일 제한): {node_id}")
                
                # Log에 기록 (스킵)
                self.supabase.table('auto_recovery_log').insert({
                    'rule_id': rule_id,
                    'node_id': node_id,
                    'trigger_condition': condition,
                    'executed': False,
                    'skipped_reason': 'Cooldown or daily limit'
                }).execute()
                
                return
            
            # 3. power는 경보만
            if level == 'power':
                self.logger.error(f"🚨 POWER 복구 필요 (수동 승인 대기): {node_id}")
                
                # 경보 로그
                self.supabase.table('auto_recovery_log').insert({
                    'rule_id': rule_id,
                    'node_id': node_id,
                    'trigger_condition': condition,
                    'executed': False,
                    'skipped_reason': 'Power requires manual confirmation'
                }).execute()
                
                # TODO: SMS/이메일 알림
                return
            
            # 4. 복구 요청 생성
            event_id_result = self.supabase.rpc('request_emergency_recovery', {
                'p_node_id': node_id,
                'p_recovery_level': level,
                'p_reason': f'Auto recovery: {rule_name}',
                'p_trigger_type': f'auto_{level}',
                'p_requested_by': 'auto_recovery_engine'
            }).execute()
            
            event_id = event_id_result.data
            
            # 5. Log 기록
            self.supabase.table('auto_recovery_log').insert({
                'rule_id': rule_id,
                'node_id': node_id,
                'trigger_condition': condition,
                'ops_event_id': event_id,
                'executed': True
            }).execute()
            
            # 6. 실행 (import 순환 방지 위해 여기서 직접)
            from ops import execute_recovery as exec_recovery
            await exec_recovery(event_id, node_id, level, self.supabase, self.logger)
            
            self.logger.info(f"✅ 자동 복구 완료: {node_id}")
        
        except Exception as e:
            self.logger.error(f"❌ 자동 복구 실패: {e}")
