# NexaStream Observability Stack

## Overview

This directory contains the complete observability configuration for NexaStream, including:

- **Prometheus** - Metrics collection and alerting
- **Grafana** - Dashboards and visualization
- **Loki** - Log aggregation
- **Alertmanager** - Alert routing and notification

## Directory Structure

```
monitoring/
├── prometheus.yml      # Prometheus scrape configuration
├── alerts.yml         # Prometheus alerting rules
├── loki.yml           # Loki log aggregation config
├── grafana-dashboards.yml  # Grafana dashboard provisioning
├── slos.yml           # SLO/SLA definitions
├── monitoring.yaml    # Kubernetes manifests
└── README.md          # This file
```

## Components

### Prometheus

**Configuration Files:**
- `prometheus.yml` - Scrape configs for all services
- `alerts.yml` - Alerting rules for all components

**Scrape Targets:**
| Service | Port | Interval |
|---------|------|----------|
| Backend API | 3001 | 10s |
| Frontend | 3000 | 30s |
| Blockchain | 8545 | 5s |
| PostgreSQL | 9187 | 30s |
| Redis | 9121 | 15s |
| Ingress | 10254 | 15s |

**Alert Categories:**
- Infrastructure (CPU, Memory, Disk)
- Application (Errors, Latency, Availability)
- Database (Connections, Replication, Slow Queries)
- Blockchain (Block Production, Validators, Gas)
- Storage (Redis, Upload/Download)
- Streaming (Quality, Transcoding)
- SLO Alerts (Error Budget)
- Security (Failed Logins, Rate Limits)

### Grafana

**Dashboards:**
| Dashboard | UID | Purpose |
|-----------|-----|---------|
| Overview | nexastream-overview | Main dashboard |
| API | nexastream-api | API metrics |
| Blockchain | nexastream-blockchain | Blockchain health |
| Storage | nexastream-storage | Storage metrics |
| Streaming | nexastream-streaming | Live streaming |
| Infrastructure | nexastream-infra | K8s & nodes |
| SLO | nexastream-slo | Error budgets |
| Security | nexastream-security | Security events |

**Access:**
- URL: https://grafana.nexastream.org
- Default credentials: admin/CHANGEME

### Loki

**Log Sources:**
- Application logs (structured JSON)
- Nginx access logs
- Kubernetes system logs
- Error logs
- Audit logs

**Retention:** 30 days

### SLO/SLA Definitions

**Service Tiers:**

| Tier | Name | Services | Availability |
|------|------|----------|--------------|
| Platinum | NexaChain | 99.99% |
| Gold | API, Storage, Frontend | 99.95% |
| Silver | Streaming | 99.5% |

**Error Budget:**
- Burning rate alerts at 14.4x (1 day in 1 hour)
- Critical alerts at 6x normal consumption

## Deployment

### Prerequisites

1. Kubernetes cluster with monitoring namespace
2. Helm 3.x (optional)
3. kubectl configured

### Quick Start

```bash
# Apply all monitoring resources
kubectl apply -f monitoring.yaml

# Check pod status
kubectl get pods -n monitoring

# Access Grafana
kubectl port-forward svc/grafana -n monitoring 3000:3000
```

### Verify Deployment

```bash
# Check Prometheus targets
curl http://prometheus:9090/api/v1/targets | jq '.data.activeTargets'

# Check Prometheus rules
curl http://prometheus:9090/api/v1/rules | jq '.data.groups'

# Check Loki
curl http://loki:3100/ready
```

## Accessing Dashboards

### Local Access (Port Forward)

```bash
# Grafana
kubectl port-forward svc/grafana 3000:3000 -n monitoring

# Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n monitoring
```

### Production Access

| Service | URL |
|---------|-----|
| Grafana | https://grafana.nexastream.org |
| Prometheus | https://prometheus.nexastream.org |
| Alertmanager | https://alertmanager.nexastream.org |

## Alert Routing

### Notification Channels

1. **Slack** - #alerts channel
2. **PagerDuty** - Critical incidents
3. **Email** - Weekly reports

### Alert Severity Levels

| Level | Response Time | Examples |
|-------|---------------|----------|
| Critical | 15 min | Service down, data loss |
| Warning | 1 hour | High latency, errors |
| Info | 24 hours | Informational |

## SLO Monitoring

### Error Budget

Each SLO has an error budget calculated as:
- **Monthly**: (1 - SLO target) × 43,200 minutes

Example for 99.95% SLO:
- Error budget: 0.05% × 43,200 = 21.6 minutes/month

### Burn Rate Alerts

| Burn Rate | Alert | Action |
|-----------|-------|--------|
| > 14.4x | Critical | Immediate page |
| > 6x | Warning | On-call response |
| > 1x | Info | Engineering review |

## Metrics Reference

### Backend API Metrics

| Metric | Type | Description |
|--------|------|-------------|
| http_requests_total | Counter | Total HTTP requests |
| http_request_duration_seconds | Histogram | Request latency |
| http_errors_total | Counter | HTTP errors by code |
| db_query_duration_seconds | Histogram | Database latency |
| cache_hits_total | Counter | Cache hits |
| cache_misses_total | Counter | Cache misses |

### Blockchain Metrics

| Metric | Type | Description |
|--------|------|-------------|
| nexachain_blocks_produced_total | Counter | Total blocks produced |
| nexachain_transactions_total | Counter | Total transactions |
| nexachain_gas_used | Gauge | Current gas usage |
| nexachain_pending_transactions | Gauge | Pending transactions |
| nexachain_validator_up | Gauge | Validator status |
| nexachain_finalized_blocks_total | Counter | Finalized blocks |

### Storage Metrics

| Metric | Type | Description |
|--------|------|-------------|
| nexastream_uploads_total | Counter | Total uploads |
| nexastream_upload_errors_total | Counter | Upload failures |
| nexastream_downloads_total | Counter | Total downloads |
| nexastream_storage_used_bytes | Gauge | Storage used |
| nexastream_storage_free_bytes | Gauge | Storage available |

### Streaming Metrics

| Metric | Type | Description |
|--------|------|-------------|
| nexastream_live_streams | Gauge | Active streams |
| nexastream_concurrent_viewers | Gauge | Current viewers |
| nexastream_transcoding_queue_size | Gauge | Queue depth |
| nexastream_stream_errors_total | Counter | Stream errors |

## Troubleshooting

### Prometheus Not Scraping

```bash
# Check service monitor
kubectl get servicemonitor -n monitoring

# Check target status
curl http://prometheus:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health=="down")'
```

### Loki Not Receiving Logs

```bash
# Check Promtail pods
kubectl logs -l app=promtail -n monitoring

# Check Promtail positions
kubectl exec -it promtail-xxx -n monitoring -- cat /run/promtail/positions.yaml
```

### Alertmanager Not Sending

```bash
# Check alertmanager status
curl http://alertmanager:9093/api/v1/status | jq

# Check silenced alerts
curl http://alertmanager:9093/api/v1/silences | jq
```

## Maintenance

### Updating Rules

```bash
# Update ConfigMap
kubectl create configmap prometheus-rules \
  --from-file=alerts.yml \
  -n monitoring \
  -o yaml --dry-run=client | kubectl apply -f -

# Reload Prometheus
kubectl exec -it prometheus-xxx -n monitoring -- curl -X POST http://localhost:9090/-/reload
```

### Scaling

```bash
# Scale Prometheus
kubectl scale deployment prometheus --replicas=3 -n monitoring

# Scale Grafana
kubectl scale deployment grafana --replicas=3 -n monitoring
```

## Security

### RBAC

Only monitoring namespace has access to:
- Prometheus (read-only)
- Grafana (admin for admin users)
- Loki (read-only)

### Network Policies

All monitoring components are isolated:
- Ingress: Only from ingress controller
- Egress: Only to monitored namespaces

## Support

For issues with monitoring:
1. Check Grafana dashboard health panels
2. Review Prometheus target status
3. Check Loki log retention
4. Verify alert routing in Alertmanager

---

**Version**: 1.0.0
**Last Updated**: 2024
