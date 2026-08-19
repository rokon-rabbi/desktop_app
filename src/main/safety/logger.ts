type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMetadata {
  operation?: string;
  module?: string;
  duration?: number;
  fileCount?: number;
  scanId?: string;
  operationId?: string;
  errorCode?: string;
  [key: string]: unknown;
}

const isDev = process.env['NODE_ENV'] !== 'production';

/**
 * Structured logger. In production we avoid printing full file paths
 * (context.md §22) — callers should pass short context strings, not raw
 * absolute paths, unless NODE_ENV is not production.
 */
class Logger {
  private write(level: LogLevel, module: string, message: string, meta?: LogMetadata): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      ...meta
    };

    const line = JSON.stringify(entry);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    // eslint-disable-next-line no-console -- intentional: debug/info logging, dev only
    else if (isDev) console.log(line);
  }

  debug(module: string, message: string, meta?: LogMetadata): void {
    this.write('debug', module, message, meta);
  }
  info(module: string, message: string, meta?: LogMetadata): void {
    this.write('info', module, message, meta);
  }
  warn(module: string, message: string, meta?: LogMetadata): void {
    this.write('warn', module, message, meta);
  }
  error(module: string, message: string, meta?: LogMetadata): void {
    this.write('error', module, message, meta);
  }
}

export const logger = new Logger();
