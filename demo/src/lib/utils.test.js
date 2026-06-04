import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock window.matchMedia
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('formatRelativeTime', () => {
  it('should exist and be a function', async () => {
    const { formatRelativeTime } = await import('../lib/utils');
    expect(typeof formatRelativeTime).toBe('function');
  });
});

describe('cn (classname utility)', () => {
  it('should exist and be a function', async () => {
    const { cn } = await import('../lib/utils');
    expect(typeof cn).toBe('function');
  });

  it('should merge classNames correctly', async () => {
    const { cn } = await import('../lib/utils');
    expect(cn('foo', 'bar')).toBe('foo bar');
    expect(cn('foo', false, 'bar')).toBe('foo bar');
    expect(cn('foo', undefined, 'bar')).toBe('foo bar');
  });
});

describe('apiClient', () => {
  it('should have request, get, post, patch methods', async () => {
    const apiClient = (await import('../lib/api')).apiClient;
    expect(typeof apiClient.request).toBe('function');
    expect(typeof apiClient.get).toBe('function');
    expect(typeof apiClient.post).toBe('function');
    expect(typeof apiClient.patch).toBe('function');
  });
});

describe('useTodayAnalytics hook', () => {
  it('should be importable', async () => {
    const { useTodayAnalytics } = await import('../hooks/useAnalytics');
    expect(typeof useTodayAnalytics).toBe('function');
  });
});

describe('useTopLeads hook', () => {
  it('should be importable', async () => {
    const { useTopLeads } = await import('../hooks/useAnalytics');
    expect(typeof useTopLeads).toBe('function');
  });
});

describe('QueryKeys', () => {
  it('should have analytics keys', async () => {
    const { QueryKeys } = await import('../lib/queryClient');
    expect(typeof QueryKeys.todayAnalytics).toBe('function');
    expect(typeof QueryKeys.leadScoreHistory).toBe('function');
  });
});