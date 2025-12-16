/**
 * Logger utility with environment-aware log levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  debug(message: string, ...args: unknown[]) {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]) {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]) {
    console.warn(`[WARN] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]) {
    console.error(`[ERROR] ${message}`, ...args);
  }

  // Log only in development
  dev(...args: unknown[]) {
    if (this.isDevelopment) {
      console.log(...args);
    }
  }

  // Always log (for production-critical logs)
  prod(...args: unknown[]) {
    console.log(...args);
  }
}

export const logger = new Logger();
