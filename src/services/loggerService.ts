/**
 * Frontend logging service for ToggleTail
 * Captures errors and logs for debugging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  stack?: string;
}

const LOG_BUFFER_SIZE = 100;
const logBuffer: LogEntry[] = [];

const isDev = __DEV__;

const formatTimestamp = (): string => new Date().toISOString();

const addToBuffer = (entry: LogEntry): void => {
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) {
    logBuffer.shift();
  }
};

const formatMessage = (level: LogLevel, message: string, context?: Record<string, unknown>): string => {
  const timestamp = formatTimestamp();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
};

export const logger = {
  debug: (message: string, context?: Record<string, unknown>): void => {
    if (isDev) {
      console.log(formatMessage('debug', message, context));
    }
    addToBuffer({ level: 'debug', message, timestamp: formatTimestamp(), context });
  },

  info: (message: string, context?: Record<string, unknown>): void => {
    if (isDev) {
      console.log(formatMessage('info', message, context));
    }
    addToBuffer({ level: 'info', message, timestamp: formatTimestamp(), context });
  },

  warn: (message: string, context?: Record<string, unknown>): void => {
    console.warn(formatMessage('warn', message, context));
    addToBuffer({ level: 'warn', message, timestamp: formatTimestamp(), context });
  },

  error: (message: string, error?: Error | unknown, context?: Record<string, unknown>): void => {
    const errorContext = {
      ...context,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
    const stack = error instanceof Error ? error.stack : undefined;
    
    console.error(formatMessage('error', message, errorContext));
    addToBuffer({
      level: 'error',
      message,
      timestamp: formatTimestamp(),
      context: errorContext,
      stack,
    });
  },

  // Get recent logs for debugging
  getRecentLogs: (count = 50): LogEntry[] => {
    return logBuffer.slice(-count);
  },

  // Get error logs only
  getErrorLogs: (): LogEntry[] => {
    return logBuffer.filter(entry => entry.level === 'error');
  },

  // Clear log buffer
  clearLogs: (): void => {
    logBuffer.length = 0;
  },

  // Export logs as string for sharing
  exportLogs: (): string => {
    return logBuffer
      .map(entry => {
        const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
        const stackStr = entry.stack ? `\n  Stack: ${entry.stack}` : '';
        return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}${stackStr}`;
      })
      .join('\n');
  },
};

// Global error handler for uncaught errors
export const setupGlobalErrorHandling = (): void => {
  const originalHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    logger.error(`Uncaught ${isFatal ? 'FATAL' : ''} error`, error, { isFatal });
    
    // Call original handler
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
};

export default logger;
