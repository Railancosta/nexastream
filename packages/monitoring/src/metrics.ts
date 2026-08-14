export type MetricType = "counter" | "gauge" | "histogram";

export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

/**
 * Metrics collector (rule 58).
 * Tracks: CPU, memory, latency, errors, node health, block production, peer count.
 */
export class MetricsCollector {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();
  private readonly events: Metric[] = [];

  incrementCounter(name: string, labels: Record<string, string> = {}): void {
    const key = `${name}:${JSON.stringify(labels)}`;
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
    this.events.push({ name, type: "counter", value: this.counters.get(key)!, labels, timestamp: Date.now() });
  }

  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = `${name}:${JSON.stringify(labels)}`;
    this.gauges.set(key, value);
    this.events.push({ name, type: "gauge", value, labels, timestamp: Date.now() });
  }

  recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = `${name}:${JSON.stringify(labels)}`;
    const arr = this.histograms.get(key) ?? [];
    arr.push(value);
    if (arr.length > 1000) arr.shift();
    this.histograms.set(key, arr);
    this.events.push({ name, type: "histogram", value, labels, timestamp: Date.now() });
  }

  getCounter(name: string, labels: Record<string, string> = {}): number {
    return this.counters.get(`${name}:${JSON.stringify(labels)}`) ?? 0;
  }

  getGauge(name: string, labels: Record<string, string> = {}): number {
    return this.gauges.get(`${name}:${JSON.stringify(labels)}`) ?? 0;
  }

  getHistogram(name: string, labels: Record<string, string> = {}): { p50: number; p95: number; p99: number; count: number } {
    const arr = this.histograms.get(`${name}:${JSON.stringify(labels)}`) ?? [];
    if (arr.length === 0) return { p50: 0, p95: 0, p99: 0, count: 0 };
    const sorted = [...arr].sort((a, b) => a - b);
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      count: sorted.length,
    };
  }

  /** Export metrics in Prometheus text format (rule 58). */
  exportPrometheus(): string {
    const lines: string[] = [];
    for (const [key, value] of this.counters) {
      const [name, labels] = this.parseKey(key);
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name}${labels} ${value}`);
    }
    for (const [key, value] of this.gauges) {
      const [name, labels] = this.parseKey(key);
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name}${labels} ${value}`);
    }
    return lines.join("\n");
  }

  private parseKey(key: string): [string, string] {
    const idx = key.indexOf(":");
    const name = key.slice(0, idx);
    const labelsRaw = key.slice(idx + 1);
    if (labelsRaw === "{}") return [name, ""];
    const labels = labelsRaw.replace(/"(\w+)":"(\w+)"/g, '$1="$2"').replace(/[{}]/g, "");
    return [name, `{${labels}}`];
  }

  get totalEvents(): number { return this.events.length; }
}
