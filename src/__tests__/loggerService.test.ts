// Mock __DEV__ global
(global as any).__DEV__ = true;

// Mock ErrorUtils for React Native
(global as any).ErrorUtils = {
  getGlobalHandler: jest.fn(),
  setGlobalHandler: jest.fn(),
};

import { logger } from '@/src/services/loggerService';

describe('Logger Service', () => {
  beforeEach(() => {
    logger.clearLogs();
  });

  test('logger.info adds entry to buffer', () => {
    logger.info('test message');
    const logs = logger.getRecentLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].level).toBe('info');
    expect(logs[0].message).toBe('test message');
  });

  test('logger.error captures error details', () => {
    const error = new Error('test error');
    logger.error('Something failed', error, { context: 'test' });
    
    const errorLogs = logger.getErrorLogs();
    expect(errorLogs.length).toBe(1);
    expect(errorLogs[0].context?.errorMessage).toBe('test error');
  });

  test('logger.warn adds warning entry', () => {
    logger.warn('warning message', { key: 'value' });
    const logs = logger.getRecentLogs();
    expect(logs[0].level).toBe('warn');
  });

  test('logger.debug adds debug entry', () => {
    logger.debug('debug message');
    const logs = logger.getRecentLogs();
    expect(logs[0].level).toBe('debug');
  });

  test('getRecentLogs limits results', () => {
    for (let i = 0; i < 10; i++) {
      logger.info(`message ${i}`);
    }
    const logs = logger.getRecentLogs(5);
    expect(logs.length).toBe(5);
  });

  test('clearLogs empties buffer', () => {
    logger.info('test');
    logger.clearLogs();
    expect(logger.getRecentLogs().length).toBe(0);
  });

  test('exportLogs returns formatted string', () => {
    logger.info('test message');
    const exported = logger.exportLogs();
    expect(typeof exported).toBe('string');
    expect(exported).toContain('INFO');
    expect(exported).toContain('test message');
  });
});
