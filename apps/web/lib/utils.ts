// lib/utils.ts
// 공통 유틸리티 함수

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSS 클래스 병합 유틸리티
 * clsx로 조건부 클래스를 처리하고, tailwind-merge로 충돌 해결
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
