import { describe, it, expect } from "vitest";
import { MetricsCollector, AlertManager } from "../src/index.js";

describe("MetricsCollector", () => {
  it("tracks counters", () => {
    const m = new MetricsCollector();
    m.incrementCounter("requests");
    m.incrementCounter("requests");
    m.incrementCounter("errors", { type: "500" });
    expect(m.getCounter("requests")).toBe(2);
    expect(m.getCounter("errors", { type: "500" })).toBe(1);
  });

  it("tracks gauges", () => {
    const m = new MetricsCollector();
    m.setGauge("memory_mb", 512);
    m.setGauge("memory_mb", 1024);
    expect(m.getGauge("memory_mb")).toBe(1024);
  });

  it("records histograms with percentiles (rule 86)", () => {
    const m = new MetricsCollector();
    for (let i = 1; i <= 100; i++) m.recordHistogram("latency_ms", i);
    const h = m.getHistogram("latency_ms");
    expect(h.count).toBe(100);
    expect(h.p50).toBeGreaterThanOrEqual(49);
    expect(h.p95).toBeGreaterThanOrEqual(94);
    expect(h.p99).toBeGreaterThanOrEqual(98);
  });

  it("exports Prometheus format (rule 58)", () => {
    const m = new MetricsCollector();
    m.incrementCounter("http_requests_total");
    m.setGauge("node_memory_bytes", 1024);
    const prom = m.exportPrometheus();
    expect(prom).toContain("# TYPE http_requests_total counter");
    expect(prom).toContain("http_requests_total");
    expect(prom).toContain("# TYPE node_memory_bytes gauge");
  });
});

describe("AlertManager (rule 59)", () => {
  it("fires alerts on condition", () => {
    const am = new AlertManager();
    const alert = am.check("validator_offline", true, "critical", "validator-1 is down");
    expect(alert).not.toBeNull();
    expect(alert!.severity).toBe("critical");
    expect(am.getActiveAlerts().length).toBe(1);
  });

  it("does not fire when condition is false", () => {
    const am = new AlertManager();
    am.check("disk_full", false, "warning", "disk 95% full");
    expect(am.getActiveAlerts().length).toBe(0);
  });

  it("resolves alerts", () => {
    const am = new AlertManager();
    const alert = am.check("block_production_stopped", true, "critical", "no blocks for 60s");
    expect(am.resolve(alert!.id)).toBe(true);
    expect(am.getActiveAlerts().length).toBe(0);
  });

  it("tracks multiple alert types (rule 59)", () => {
    const am = new AlertManager();
    am.check("db_unavailable", true, "critical", "database unreachable");
    am.check("error_rate_high", true, "warning", "error rate > 5%");
    am.check("latency_high", true, "warning", "P99 > 500ms");
    am.check("backup_failed", true, "critical", "backup job failed");
    expect(am.getActiveAlerts().length).toBe(4);
    expect(am.getAlertCount()).toBe(4);
  });
});
