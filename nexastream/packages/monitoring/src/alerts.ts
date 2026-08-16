export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
  resolved: boolean;
}

/**
 * Alert manager (rule 59).
 * Alerts for: validator offline, block production stopped, database unavailable,
 * storage critical, error rate elevated, latency elevated, disk full, backup failure.
 */
export class AlertManager {
  private readonly alerts = new Map<string, Alert>();
  private readonly rules: AlertRule[] = [];

  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  check(name: string, condition: boolean, severity: AlertSeverity, message: string): Alert | null {
    if (condition) {
      const alert: Alert = {
        id: `${name}-${Date.now()}`,
        name,
        severity,
        message,
        timestamp: Date.now(),
        resolved: false,
      };
      this.alerts.set(alert.id, alert);
      return alert;
    }
    return null;
  }

  resolve(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    alert.resolved = true;
    return true;
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((a) => !a.resolved);
  }

  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  getAlertCount(): number {
    return this.alerts.size;
  }
}

export interface AlertRule {
  name: string;
  check: () => boolean;
  severity: AlertSeverity;
  message: string;
}
