import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../utils/logger.js';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('info 应调用 console.log 并带 info 前缀', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('hello');
    expect(spy).toHaveBeenCalledTimes(1);
    const msg = spy.mock.calls[0]?.[0] as string;
    expect(msg).toContain('info');
    expect(msg).toContain('hello');
  });

  it('success 应调用 console.log 并带 done 前缀', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.success('done!');
    expect(spy).toHaveBeenCalledTimes(1);
    const msg = spy.mock.calls[0]?.[0] as string;
    expect(msg).toContain('done');
    expect(msg).toContain('done!');
  });

  it('warn 应调用 console.warn 并带 warn 前缀', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('be careful');
    expect(spy).toHaveBeenCalledTimes(1);
    const msg = spy.mock.calls[0]?.[0] as string;
    expect(msg).toContain('warn');
    expect(msg).toContain('be careful');
  });

  it('error 应调用 console.error 并带 error 前缀', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('something failed');
    expect(spy).toHaveBeenCalledTimes(1);
    const msg = spy.mock.calls[0]?.[0] as string;
    expect(msg).toContain('error');
    expect(msg).toContain('something failed');
  });

  it('step 应调用 console.log 并带箭头前缀', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.step('processing...');
    expect(spy).toHaveBeenCalledTimes(1);
    const msg = spy.mock.calls[0]?.[0] as string;
    expect(msg).toContain('processing...');
  });
});
