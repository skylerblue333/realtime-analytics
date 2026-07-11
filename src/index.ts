/**
 * Real-time Analytics Platform
 * Stream processing, aggregation, and visualization
 */

export interface DataPoint {
  timestamp: number;
  value: number;
  source: string;
  metadata?: Record<string, any>;
}

export interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

export class RealtimeAnalytics {
  private dataStream: DataPoint[] = [];
  private metrics: Map<string, Metric> = new Map();
  private windowSize: number = 60000; // 1 minute

  addDataPoint(point: DataPoint): void {
    this.dataStream.push(point);
    this.updateMetrics();
  }

  private updateMetrics(): void {
    const now = Date.now();
    const windowStart = now - this.windowSize;

    const recentData = this.dataStream.filter((p) => p.timestamp >= windowStart);

    if (recentData.length > 0) {
      const avg = recentData.reduce((sum, p) => sum + p.value, 0) / recentData.length;
      const max = Math.max(...recentData.map((p) => p.value));
      const min = Math.min(...recentData.map((p) => p.value));

      this.metrics.set('average', { name: 'average', value: avg, unit: 'units', timestamp: now });
      this.metrics.set('max', { name: 'max', value: max, unit: 'units', timestamp: now });
      this.metrics.set('min', { name: 'min', value: min, unit: 'units', timestamp: now });
      this.metrics.set('count', { name: 'count', value: recentData.length, unit: 'count', timestamp: now });
    }
  }

  getMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  getDataStream(): DataPoint[] {
    return this.dataStream;
  }

  aggregateBySource(): Record<string, Metric> {
    const aggregated: Record<string, Metric> = {};

    for (const point of this.dataStream) {
      if (!aggregated[point.source]) {
        aggregated[point.source] = {
          name: point.source,
          value: 0,
          unit: 'units',
          timestamp: Date.now(),
        };
      }
      aggregated[point.source].value += point.value;
    }

    return aggregated;
  }
}

export default RealtimeAnalytics;
