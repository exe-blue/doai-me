// lib/auth/permissions.ts
// 권한 체크 로직

import type {
  MembershipTier,
  AdminRole,
  Action,
  Resource,
  UserPermissions,
  PermissionMatrix
} from './types';

// Re-export types for convenience
export type { Action, Resource } from './types';

// ============================================
// 권한 매트릭스 정의
// ============================================

/**
 * 리소스별 권한 매트릭스
 *
 * 권한 규칙:
 * - 비회원: 인증 필요한 모든 리소스 접근 불가
 * - 컨펌전 회원(pending): 승인 대기 중, 제한된 접근
 * - 회원(member): 조회 + 등록
 * - 관리자(admin): 모든 권한
 */
export const PERMISSION_MATRIX: PermissionMatrix = {
  // 철학 라이브러리 - 비회원도 조회 가능
  philosophy: {
    view: 'all',
    create: ['admin'],
    edit: ['admin'],
    delete: ['admin'],
  },

  // 대시보드 - 비회원도 조회 가능
  dashboard: {
    view: 'all',
    create: 'none',
    edit: ['admin'],
    delete: ['admin'],
  },

  // 모니터링 - 비회원도 조회 가능
  monitoring: {
    view: 'all',
    create: 'none',
    edit: ['admin'],
    delete: ['admin'],
  },

  // 히스토리 - 비회원도 조회 가능
  history: {
    view: 'all',
    create: 'none',
    edit: ['admin'],
    delete: ['admin'],
  },

  // 커맨드 - 비회원도 조회 가능, 생성은 회원 이상
  command: {
    view: 'all',
    create: ['member'],
    edit: ['admin'],
    delete: ['admin'],
  },

  // 폼 - 비회원도 조회 가능, 생성은 회원 이상
  forms: {
    view: 'all',
    create: ['member'],
    edit: ['admin'],
    delete: ['admin'],
  },

  // 웜홀 - 비회원도 조회 가능
  wormholes: {
    view: 'all',
    create: 'none',
    edit: ['admin'],
    delete: ['admin'],
  },

  // 디바이스 - 비회원도 조회 가능, 생성은 회원 이상
  devices: {
    view: 'all',
    create: ['member'],
    edit: ['admin'],
    delete: ['admin'],
  },

  // 콘텐츠 - 비회원도 조회 가능, 생성은 회원 이상
  content: {
    view: 'all',
    create: ['member'],
    edit: ['admin'],
    delete: ['admin'],
  },

  // 회원 관리 - 관리자만
  members: {
    view: ['admin'],
    create: ['admin'],
    edit: ['admin'],
    delete: ['admin'],
  },

  // 시스템 설정 - 관리자만
  system: {
    view: ['admin'],
    create: ['admin'],
    edit: ['admin'],
    delete: ['admin'],
  },

  // Work (영상 등록) - 비회원도 조회 가능, 생성은 회원 이상
  work: {
    view: 'all',
    create: ['member'],
    edit: ['admin'],
    delete: ['admin'],
  },

  // Channel (채널 관리) - 비회원도 조회 가능, 생성은 회원 이상
  channel: {
    view: 'all',
    create: ['member'],
    edit: ['admin'],
    delete: ['admin'],
  },
};

// ============================================
// 권한 체크 함수
// ============================================

/**
 * 권한 체크 메인 함수
 *
 * @param tier - 사용자 회원 등급 (일반 사용자)
 * @param adminRole - 관리자 역할
 * @param action - 수행하려는 액션 (view, create, edit, delete)
 * @param resource - 접근하려는 리소스
 * @returns 권한 유무
 */
export function checkPermission(
  tier: MembershipTier | null,
  adminRole: AdminRole | null,
  action: Action,
  resource: Resource
): boolean {
  // 관리자: 모든 권한
  if (adminRole === 'admin') {
    return true;
  }

  // 컨펌전 회원(pending): 권한 없음
  if (tier === 'pending') {
    return false;
  }

  // 일반 사용자 권한 체크
  const resourcePermission = PERMISSION_MATRIX[resource];
  if (!resourcePermission) {
    return false;
  }

  const allowedRoles = resourcePermission[action];

  // 'none'인 경우 일반 사용자 불가
  if (allowedRoles === 'none') {
    return false;
  }

  // 'all'인 경우 모든 인증된 사용자 허용
  if (allowedRoles === 'all') {
    return tier !== null || adminRole !== null;
  }

  // 배열인 경우 tier 또는 adminRole이 포함되어 있는지 확인
  if (tier && (allowedRoles as string[]).includes(tier)) {
    return true;
  }

  if (adminRole && (allowedRoles as string[]).includes(adminRole)) {
    return true;
  }

  return false;
}

/**
 * UserPermissions 객체로 권한 체크
 */
export function hasPermission(
  permissions: UserPermissions,
  action: Action,
  resource: Resource
): boolean {
  return checkPermission(
    permissions.tier,
    permissions.adminRole,
    action,
    resource
  );
}

/**
 * 여러 리소스에 대한 권한을 한 번에 체크
 */
export function checkMultiplePermissions(
  permissions: UserPermissions,
  checks: Array<{ action: Action; resource: Resource }>
): boolean[] {
  return checks.map(({ action, resource }) =>
    hasPermission(permissions, action, resource)
  );
}

/**
 * 특정 리소스에 대한 모든 권한 반환
 */
export function getResourcePermissions(
  permissions: UserPermissions,
  resource: Resource
): Record<Action, boolean> {
  return {
    view: hasPermission(permissions, 'view', resource),
    create: hasPermission(permissions, 'create', resource),
    edit: hasPermission(permissions, 'edit', resource),
    delete: hasPermission(permissions, 'delete', resource),
  };
}

// ============================================
// 메뉴 접근 권한 체크
// ============================================

/**
 * 어드민 메뉴 아이템 타입
 */
export interface AdminMenuItem {
  id: string;
  label: string;
  href: string;
  resource: Resource;
}

/**
 * 권한에 따라 접근 가능한 메뉴 필터링
 */
export function filterMenuByPermissions(
  menuItems: AdminMenuItem[],
  permissions: UserPermissions
): AdminMenuItem[] {
  return menuItems.filter(item =>
    hasPermission(permissions, 'view', item.resource)
  );
}

// ============================================
// 권한 등급 비교 유틸리티
// ============================================

const TIER_ORDER: Record<MembershipTier, number> = {
  pending: 0,
  member: 1,
};

const ROLE_ORDER: Record<AdminRole, number> = {
  admin: 1,
};

/**
 * 회원 등급 비교 (높은 등급이 큰 값)
 */
export function compareTiers(a: MembershipTier, b: MembershipTier): number {
  return TIER_ORDER[a] - TIER_ORDER[b];
}

/**
 * 관리자 역할 비교 (높은 역할이 큰 값)
 */
export function compareRoles(a: AdminRole, b: AdminRole): number {
  return ROLE_ORDER[a] - ROLE_ORDER[b];
}

/**
 * 최소 등급 이상인지 확인
 */
export function isAtLeastTier(
  currentTier: MembershipTier | null,
  requiredTier: MembershipTier
): boolean {
  if (!currentTier) return false;
  return TIER_ORDER[currentTier] >= TIER_ORDER[requiredTier];
}

/**
 * 최소 역할 이상인지 확인
 */
export function isAtLeastRole(
  currentRole: AdminRole | null,
  requiredRole: AdminRole
): boolean {
  if (!currentRole) return false;
  return ROLE_ORDER[currentRole] >= ROLE_ORDER[requiredRole];
}
