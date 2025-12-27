/**
 * Logger utility for production-safe logging.
 * In development, logs to console. In production, debug/log calls are stripped by build process.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class LoggerImpl {
  private level: LogLevel = LogLevel.DEBUG;
  private isDevelopment: boolean = import.meta.env.DEV;

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(...args: unknown[]): void {
    if (this.isDevelopment && this.level <= LogLevel.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log('[INFO]', ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args: unknown[]): void {
    console.error('[ERROR]', ...args);
  }

  /**
   * Log with context (e.g., class name or module).
   */
  withContext(context: string) {
    return {
      debug: (...args: unknown[]) => this.debug(`[${context}]`, ...args),
      info: (...args: unknown[]) => this.info(`[${context}]`, ...args),
      warn: (...args: unknown[]) => this.warn(`[${context}]`, ...args),
      error: (...args: unknown[]) => this.error(`[${context}]`, ...args),
    };
  }
}

export const Logger = new LoggerImpl();
