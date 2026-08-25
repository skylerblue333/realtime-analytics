/**
 * Sky Analytics Engine
 * In-memory real-time analytics with bounded retention, windowed metrics,
 * deterministic timestamps, and source aggregation.
 */

export interface DataPoint {
  timestamp: number;
  value: number;
  source: string;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

export interface AnalyticsOptions {
  windowSizeMs?: number;
  maxPoints?: number;
  now?: () => number;
}

export class RealtimeAnalytics {
  private dataStream: DataPoint[] = [];
  private readonly metrics = new Map<string, Metric>();
  private readonly windowSizeMs: number;
  private readonly maxPoints: number;
  private readonly now: () => number;

  constructor(options: AnalyticsOptions = {}) {
    this.windowSizeMs = options.windowSizeMs ?? 60_000;
    this.maxPoints = options.maxPoints ?? 10_000;
    this.now = options.now ?? Date.now;

    if (!Number.isFinite(this.windowSizeMs) || this.windowSizeMs <= 0) {
      throw new RangeError('windowSizeMs must be a positive finite number');
    }
    if (!Number.isInteger(this.maxPoints) || this.maxPoints <= 0) {
      throw new RangeError('maxPoints must be a positive integer');
    }
  }

  addDataPoint(point: DataPoint): void {
    this.validatePoint(point);
    this.dataStream.push({ ...point, metadata: point.metadata ? { ...point.metadata } : undefined });
    this.trimRetention();
    this.updateMetrics();
  }

  private validatePoint(point: DataPoint): void {
    if (!Number.isFinite(point.timestamp) || point.timestamp < 0) {
      throw new RangeError('timestamp must be a non-negative finite number');
    }
    if (!Number.isFinite(point.value)) {
      throw new RangeError('value must be finite');
    }
    if (!point.source.trim()) {
      throw new TypeError('source must be non-empty');
    }
  }

  private trimRetention(): void {
    const overflow = this.dataStream.length - this.maxPoints;
    if (overflow > 0) this.dataStream.splice(0, overflow);
  }

  private updateMetrics(): void {
    const timestamp = this.now();
    const windowStart = timestamp - this.windowSizeMs;
    const recentData = this.dataStream.filter(
      (point) => point.timestamp >= windowStart && point.timestamp <= timestamp,
    );

    if (recentData.length === 0) {
      this.metrics.clear();
      return;
    }

    const values = recentData.map((point) => point.value);
    const total = values.reduce((sum, value) => sum + value, 0);

    this.metrics.set('average', { name: 'average', value: total / values.length, unit: 'units', timestamp });
    this.metrics.set('max', { name: 'max', value: Math.max(...values), unit: 'units', timestamp });
    this.metrics.set('min', { name: 'min', value: Math.min(...values), unit: 'units', timestamp });
    this.metrics.set('count', { name: 'count', value: values.length, unit: 'count', timestamp });
  }

  getMetrics(): Metric[] {
    return Array.from(this.metrics.values(), (metric) => ({ ...metric }));
  }

  getDataStream(): DataPoint[] {
    return this.dataStream.map((point) => ({
      ...point,
      metadata: point.metadata ? { ...point.metadata } : undefined,
    }));
  }

  aggregateBySource(): Record<string, Metric> {
    const timestamp = this.now();
    const aggregated: Record<string, Metric> = Object.create(null) as Record<string, Metric>;

    for (const point of this.dataStream) {
      const existing = aggregated[point.source];
      if (existing) {
        existing.value += point.value;
      } else {
        aggregated[point.source] = {
          name: point.source,
          value: point.value,
          unit: 'units',
          timestamp,
        };
      }
    }

    return aggregated;
  }

  reset(): void {
    this.dataStream = [];
    this.metrics.clear();
  }
}

export default RealtimeAnalytics;
