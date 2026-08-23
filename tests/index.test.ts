import { RealtimeAnalytics } from '../src/index';

test('records data and calculates window metrics', () => {
  const analytics = new RealtimeAnalytics();
  const now = Date.now();
  analytics.addDataPoint({ timestamp: now, value: 10, source: 'api' });
  analytics.addDataPoint({ timestamp: now, value: 20, source: 'api' });
  const metrics = Object.fromEntries(analytics.getMetrics().map(m => [m.name, m.value]));
  expect(metrics.average).toBe(15);
  expect(metrics.min).toBe(10);
  expect(metrics.max).toBe(20);
  expect(metrics.count).toBe(2);
});

test('aggregates values by source', () => {
  const analytics = new RealtimeAnalytics();
  const now = Date.now();
  analytics.addDataPoint({ timestamp: now, value: 4, source: 'api' });
  analytics.addDataPoint({ timestamp: now, value: 6, source: 'api' });
  expect(analytics.aggregateBySource().api.value).toBe(10);
});
