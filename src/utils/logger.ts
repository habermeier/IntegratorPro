/**
 * Remote Logger Utility
 *
 * Sends debug logs to the server for centralized logging while maintaining
 * console output for local debugging.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
}

/**
 * Send a log message to the remote logging endpoint
 * @param message - The log message
 * @param level - Log level (default: 'debug')
 * @param context - Optional context identifier
 * @param data - Optional additional data to log
 */
export async function remoteLog(
  message: string,
  level: LogLevel = 'debug',
  context?: string,
  data?: any
): Promise<void> {
  // Always log to console first
  const consoleMethod = level === 'error' ? console.error :
                       level === 'warn' ? console.warn :
                       level === 'info' ? console.info : console.log;

  const prefix = context ? `[${context}]` : '';
  consoleMethod(`${prefix} ${message}`, data || '');

  // Send to remote endpoint
  try {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data
    };

    await fetch('/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logEntry),
    });
  } catch (error) {
    // Silently fail - don't spam console with remote logging failures
    // Only log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('[remoteLog] Failed to send log to server:', error);
    }
  }
}

/**
 * Convenience function for debug-level remote logging
 */
export function remoteDebug(message: string, context?: string, data?: any): void {
  remoteLog(message, 'debug', context, data);
}

/**
 * Convenience function for info-level remote logging
 */
export function remoteInfo(message: string, context?: string, data?: any): void {
  remoteLog(message, 'info', context, data);
}

/**
 * Convenience function for warning-level remote logging
 */
export function remoteWarn(message: string, context?: string, data?: any): void {
  remoteLog(message, 'warn', context, data);
}

/**
 * Convenience function for error-level remote logging
 */
export function remoteError(message: string, context?: string, data?: any): void {
  remoteLog(message, 'error', context, data);
}
