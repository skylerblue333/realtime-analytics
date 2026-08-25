import { describe, expect, test } from 'vitest';
import { RealtimeAnalytics } from '../src/index';

describe('RealtimeAnalytics', () => {
  test('records data and calculates deterministic window metrics', () => {
    const now = 1_000_000;
    const analytics = new RealtimeAnalytics({ now: () => now, windowSizeMs: 1_000 });

    analytics.addDataPoint({ timestamp: now - 100, value: 10, source: 'api' });
    analytics.addDataPoint({ timestamp: now, value: 20, source: 'api' });

    const metrics = Object.fromEntries(analytics.getMetrics().map((m) => [m.name, m.value]));
    expect(metrics.average).toBe(15);
    expect(metrics.min).toBe(10);
    expect(metrics.max).toBe(20);
    expect(metrics.count).toBe(2);
  });

  test('excludes expired and future points from window metrics', () => {
    const now = 5_000;
    const analytics = new RealtimeAnalytics({ now: () => now, windowSizeMs: 1_000 });

    analytics.addDataPoint({ timestamp: 3_999, value: 100, source: 'old' });
    analytics.addDataPoint({ timestamp: 4_500, value: 10, source: 'live' });
    analytics.addDataPoint({ timestamp: 5_001, value: 999, source: 'future' });

    const metrics = Object.fromEntries(analytics.getMetrics().map((m) => [m.name, m.value]));
    expect(metrics.average).toBe(10);
    expect(metrics.count).toBe(1);
  });

  test('enforces bounded retention', () => {
    const analytics = new RealtimeAnalytics({ now: () => 100, maxPoints: 2 });
    analytics.addDataPoint({ timestamp: 98, value: 1, source: 'a' });
    analytics.addDataPoint({ timestamp: 99, value: 2, source: 'a' });
    analytics.addDataPoint({ timestamp: 100, value: 3, source: 'a' });

    expect(analytics.getDataStream().map((point) => point.value)).toEqual([2, 3]);
  });

  test('aggregates values by source without prototype-key collisions', () => {
    const analytics = new RealtimeAnalytics({ now: () => 100 });
    analytics.addDataPoint({ timestamp: 100, value: 4, source: 'api' });
    analytics.addDataPoint({ timestamp: 100, value: 6, source: 'api' });
    analytics.addDataPoint({ timestamp: 100, value: 2, source: '__proto__' });

    const grouped = analytics.aggregateBySource();
    expect(grouped.api.value).toBe(10);
    expect(grouped.__proto__.value).toBe(2);
  });

  test('rejects invalid points and configuration', () => {
    expect(() => new RealtimeAnalytics({ windowSizeMs: 0 })).toThrow(RangeError);
    expect(() => new RealtimeAnalytics({ maxPoints: 0 })).toThrow(RangeError);

    const analytics = new RealtimeAnalytics();
    expect(() => analytics.addDataPoint({ timestamp: -1, value: 1, source: 'api' })).toThrow(RangeError);
    expect(() => analytics.addDataPoint({ timestamp: 1, value: Number.NaN, source: 'api' })).toThrow(RangeError);
    expect(() => analytics.addDataPoint({ timestamp: 1, value: 1, source: '   ' })).toThrow(TypeError);
  });

  test('returns defensive copies and supports reset', () => {
    const analytics = new RealtimeAnalytics({ now: () => 100 });
    analytics.addDataPoint({ timestamp: 100, value: 7, source: 'api', metadata: { region: 'us' } });

    const stream = analytics.getDataStream();
    stream[0].value = 999;
    expect(analytics.getDataStream()[0].value).toBe(7);

    analytics.reset();
    expect(analytics.getDataStream()).toEqual([]);
    expect(analytics.getMetrics()).toEqual([]);
  });
});
