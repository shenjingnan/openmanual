import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../utils/logger.js';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('info should call console.log with info prefix', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('hello');
    expect(spy).toHaveBeenCalledTimes(1);
    const msg = spy.mock.calls[0]?.[0] as string;
    expect(msg).toContain('info');
    expect(msg).toContain('hello');
  });

  it('success should call console.log with done prefix', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.success('done!');
    expect(spy).toHaveBeenCalledTimes(1);
    const msg = spy.mock.calls[0]?.[0] as string;
    expect(msg).toContain('done');
    expect(msg).toContain('done!');
  });

  it('warn should call console.warn with warn prefix', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('be careful');
    expect(spy).toHaveBeenCalledTimes(1);
    const msg = spy.mock.calls[0]?.[0] as string;
    expect(msg).toContain('warn');
    expect(msg).toContain('be careful');
  });

  it('error should call console.error with error prefix', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('something failed');
    expect(spy).toHaveBeenCalledTimes(1);
    const msg = spy.mock.calls[0]?.[0] as string;
    expect(msg).toContain('error');
    expect(msg).toContain('something failed');
  });

  it('step should call console.log with arrow prefix', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.step('processing...');
    expect(spy).toHaveBeenCalledTimes(1);
    const msg = spy.mock.calls[0]?.[0] as string;
    expect(msg).toContain('processing...');
  });
});
