/**
 * 로깅 유틸리티
 *
 * console.log 대신 이 모듈을 사용하세요.
 * 프로덕션 환경에서는 로그 레벨에 따라 필터링됩니다.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// 프로덕션에서는 warn 이상만 출력
const MIN_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatMessage(prefix: string, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] ${prefix} ${message}`;
}

export const logger = {
  debug(prefix: string, message: string, ...args: unknown[]): void {
    if (shouldLog('debug')) {
      // eslint-disable-next-line no-console
      console.debug(formatMessage(prefix, message), ...args);
    }
  },

  info(prefix: string, message: string, ...args: unknown[]): void {
    if (shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.info(formatMessage(prefix, message), ...args);
    }
  },

  warn(prefix: string, message: string, ...args: unknown[]): void {
    if (shouldLog('warn')) {
      // eslint-disable-next-line no-console
      console.warn(formatMessage(prefix, message), ...args);
    }
  },

  error(prefix: string, message: string, ...args: unknown[]): void {
    if (shouldLog('error')) {
      // eslint-disable-next-line no-console
      console.error(formatMessage(prefix, message), ...args);
    }
  },
};

export default logger;
