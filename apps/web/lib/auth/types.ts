// lib/auth/types.ts
// 회원 등급 및 권한 타입 정의

import { z } from 'zod';

// ============================================
// 회원 등급 타입
// ============================================

/**
 * 일반 사용자 회원 등급
 * - pending: 컨펌전 회원 (가입 후 승인 대기)
 * - member: 회원 (승인된 일반 회원)
 */
export const MembershipTierSchema = z.enum(['pending', 'member']);
export type MembershipTier = z.infer<typeof MembershipTierSchema>;

/**
 * 관리자 역할
 * - admin: 관리자 (모든 권한)
 */
export const AdminRoleSchema = z.enum(['admin']);
export type AdminRole = z.infer<typeof AdminRoleSchema>;

/**
 * 통합 사용자 권한 타입
 */
export interface UserPermissions {
  userId: string | null;
  email: string | null;
  tier: MembershipTier | null;
  adminRole: AdminRole | null;
  isAdmin: boolean;
  isOwner: boolean;
  displayName: string | null;
}

/**
 * 인증 결과 타입
 */
export interface AuthResult {
  authorized: boolean;
  permissions: UserPermissions;
  error?: string;
}

// ============================================
// 리소스 및 액션 타입
// ============================================

/**
 * 보호되는 리소스 목록
 */
export const ResourceSchema = z.enum([
  'philosophy',    // 철학 라이브러리
  'dashboard',     // 대시보드
  'monitoring',    // 모니터링
  'history',       // 히스토리
  'command',       // 커맨드
  'forms',         // 폼
  'wormholes',     // 웜홀
  'devices',       // 디바이스
  'content',       // 콘텐츠 (채널, 위협, 경제)
  'members',       // 회원 관리
  'system',        // 시스템 설정
  'work',          // Work (영상 등록)
  'channel',       // Channel (채널 관리)
]);
export type Resource = z.infer<typeof ResourceSchema>;

/**
 * 가능한 액션 목록
 */
export const ActionSchema = z.enum(['view', 'create', 'edit', 'delete']);
export type Action = z.infer<typeof ActionSchema>;

// ============================================
// 권한 매트릭스 타입
// ============================================

/**
 * 리소스별 허용 등급 설정
 */
export interface ResourcePermission {
  view: MembershipTier[] | AdminRole[] | 'all';
  create: MembershipTier[] | AdminRole[] | 'none';
  edit: AdminRole[] | 'none';
  delete: AdminRole[] | 'none';
}

export type PermissionMatrix = Record<Resource, ResourcePermission>;

// ============================================
// Zod 스키마 기반 검증
// ============================================

export const UserMembershipSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  tier: MembershipTierSchema,
  display_name: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type UserMembership = z.infer<typeof UserMembershipSchema>;

export const AdminUserSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  role: AdminRoleSchema,
  email: z.string().email().optional(),
  created_at: z.string().datetime().optional(),
});

export type AdminUser = z.infer<typeof AdminUserSchema>;

// ============================================
// 기본 권한 객체 (비인증 사용자)
// ============================================

export const DEFAULT_PERMISSIONS: UserPermissions = {
  userId: null,
  email: null,
  tier: null,
  adminRole: null,
  isAdmin: false,
  isOwner: false,
  displayName: null,
};

// ============================================
// 등급 표시 이름 (한글)
// ============================================

export const TIER_DISPLAY_NAMES: Record<MembershipTier, string> = {
  pending: '컨펌전 회원',
  member: '회원',
};

export const ROLE_DISPLAY_NAMES: Record<AdminRole, string> = {
  admin: '관리자',
};

/**
 * 사용자의 표시 등급 반환
 */
export function getDisplayRole(permissions: UserPermissions): string {
  if (permissions.adminRole) {
    return ROLE_DISPLAY_NAMES[permissions.adminRole];
  }
  if (permissions.tier) {
    return TIER_DISPLAY_NAMES[permissions.tier];
  }
  return '비회원';
}
