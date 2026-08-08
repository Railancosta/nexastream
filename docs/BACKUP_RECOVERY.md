# NexaStream Backup & Disaster Recovery Documentation

## Version: 1.0.0
## Last Updated: 2024

---

## Table of Contents

1. [Backup Strategy](#1-backup-strategy)
2. [Disaster Recovery Scenarios](#2-disaster-recovery-scenarios)
3. [Recovery Procedures](#3-recovery-procedures)
4. [Testing](#4-testing)
5. [Monitoring](#5-monitoring)

---

## 1. Backup Strategy

### 1.1 Backup Components

| Component | Backup Frequency | Retention | Method |
|-----------|----------------|-----------|--------|
| **Database** | Every 6 hours | 30 days | pg_dump |
| **Blockchain State** | Every block | Continuous | Snapshots |
| **Uploads/Videos** | Daily | 7 days | rsync |
| **Configuration** | On change | 30 days | Git |
| **Kubernetes** | Daily | 30 days | Velero |

### 1.2 Database Backup

```bash
#!/bin/bash
# Automated database backup script

# Configuration
BACKUP_DIR="/backups/postgres"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -U nexastream -d nexastream -Fc > $BACKUP_DIR/nexastream_$DATE.dump

# Compress
gzip $BACKUP_DIR/nexastream_$DATE.dump

# Verify backup
if [ $? -eq 0 ]; then
    echo "Backup completed: $DATE"
else
    echo "Backup failed!"
    exit 1
fi

# Remove old backups
find $BACKUP_DIR -name "*.dump.gz" -mtime +$RETENTION_DAYS -delete

# Upload to S3
aws s3 cp $BACKUP_DIR/nexastream_$DATE.dump.gz s3://nexastream-backups/
```

### 1.3 Blockchain State Backup

```bash
#!/bin/bash
# Blockchain state backup

BACKUP_DIR="/backups/blockchain"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup of blockchain data
tar -czf $BACKUP_DIR/blockchain_$DATE.tar.gz /data/nexachain

# Upload to S3
aws s3 cp $BACKUP_DIR/blockchain_$DATE.tar.gz s3://nexastream-backups/
```

### 1.4 Kubernetes Resources Backup

```bash
#!/bin/bash
# Backup all Kubernetes resources

NAMESPACE="nexastream"
BACKUP_DIR="/backups/k8s"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Export all resources
kubectl get all,configmap,secret,pvc -n $NAMESPACE -o yaml > $BACKUP_DIR/k8s_$DATE.yaml

# Upload to S3
aws s3 cp $BACKUP_DIR/k8s_$DATE.yaml s3://nexastream-backups/
```

---

## 2. Disaster Recovery Scenarios

### Scenario A: Database Failure

**Impact**: Complete data loss or corruption

**Detection**:
- Database health check fails
- Connection errors in application
- Backup verification fails

**Recovery Steps**:

1. **Stop application**:
```bash
kubectl scale deployment nexastream-backend --replicas=0 -n nexastream
```

2. **Restore from backup**:
```bash
# Download latest backup
aws s3 cp s3://nexastream-backups/nexastream_latest.dump.gz /tmp/

# Restore database
gunzip -c /tmp/nexastream_latest.dump.gz | pg_restore -U nexastream -d nexastream

# Verify restoration
psql -U nexastream -d nexastream -c "SELECT COUNT(*) FROM users;"
```

3. **Restart application**:
```bash
kubectl scale deployment nexastream-backend --replicas=3 -n nexastream
```

**RTO**: 15-30 minutes
**RPO**: 6 hours maximum

---

### Scenario B: Storage Node Failure

**Impact**: Video content temporarily unavailable

**Detection**:
- Storage health check fails
- High error rate in uploads
- Replica count below threshold

**Recovery Steps**:

1. **Identify failed node**:
```bash
kubectl get pods -n nexastream -o wide
```

2. **Check replication status**:
```bash
# Verify data replication
curl http://storage-service:9000/minio/health/l Readiness
```

3. **If node is recoverable**:
```bash
kubectl delete pod <pod-name> -n nexastream
# Kubernetes will restart with new pod
```

4. **If node is dead**:
```bash
# Scale down storage deployment
kubectl scale deployment nexastream-storage --replicas=2 -n nexastream

# Wait for new node to join cluster
# Data will be automatically re-replicated
```

**RTO**: 5-15 minutes (with replication)
**RPO**: Real-time (with multi-replica)

---

### Scenario C: Kubernetes Node Failure

**Impact**: Pods on failed node become unavailable

**Detection**:
- Node becomes NotReady
- Pod eviction events
- Monitoring alerts

**Recovery Steps**:

1. **Check node status**:
```bash
kubectl get nodes
kubectl describe node <node-name>
```

2. **If node is recoverable**:
```bash
# Restart kubelet on node
sudo systemctl restart kubelet
```

3. **If node is dead**:
```bash
# Cordon node to prevent new pods
kubectl cordon <node-name>

# Drain node
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Add new node to cluster (auto-scaling will handle this)
```

4. **Verify pod recovery**:
```bash
kubectl get pods -n nexastream -o wide
```

**RTO**: 3-5 minutes (with auto-scaling)
**RPO**: Zero (stateless pods)

---

### Scenario D: Blockchain Node Failure

**Impact**: Temporary network issues, potential chain reorganization

**Detection**:
- Node health check fails
- Block height lagging
- Consensus errors

**Recovery Steps**:

1. **Check node status**:
```bash
curl http://nexachain-node:8545/api/v1/health
```

2. **Check synchronization**:
```bash
# Compare local block height with network
curl http://nexachain-node:8545/api/v1/chain/stats | jq '.block_height'
```

3. **If behind**:
```bash
# Node will automatically sync
# Monitor sync progress
watch curl http://nexachain-node:8545/api/v1/chain/stats
```

4. **If corrupted**:
```bash
# Stop node
kubectl scale deployment nexachain-node --replicas=0 -n nexastream

# Restore from backup
aws s3 cp s3://nexastream-backups/blockchain_latest.tar.gz /tmp/
tar -xzf /tmp/blockchain_latest.tar.gz -C /data/nexachain

# Restart node
kubectl scale deployment nexachain-node --replicas=3 -n nexastream
```

**RTO**: 5-10 minutes (sync) / 15-30 minutes (restore)
**RPO**: Real-time (with multi-node)

---

### Scenario E: Region Failure

**Impact**: Complete availability zone failure

**Detection**:
- Multiple nodes down simultaneously
- Cloud provider status page
- Multi-region monitoring alerts

**Recovery Steps**:

1. **Activate disaster recovery site**:
```bash
# Update DNS to secondary region
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890 \
    --change-batch file://dns-failover.json

# Scale up in secondary region
kubectl config use-context secondary-cluster
kubectl scale deployment nexastream-backend --replicas=5 -n nexastream
```

2. **Verify failover**:
```bash
curl https://nexastream.org/api/health
```

3. **Notify team**:
```bash
# Send alert
curl -X POST $SLACK_WEBHOOK -d '{"text":"DR failover activated for NexaStream"}'
```

**RTO**: 15-30 minutes (with pre-configured DR)
**RPO**: Last backup (up to 6 hours)

---

### Scenario F: Corrupted Deployment

**Impact**: Application errors after deployment

**Detection**:
- High error rate in new deployment
- Health check failures
- User complaints

**Recovery Steps**:

1. **Immediate rollback**:
```bash
# Rollback to previous version
kubectl rollout undo deployment/nexastream-backend -n nexastream
kubectl rollout undo deployment/nexastream-frontend -n nexastream

# Verify rollback
kubectl rollout status deployment/nexastream-backend -n nexastream
```

2. **If automatic rollback fails**:
```bash
# Get revision history
kubectl rollout history deployment/nexastream-backend -n nexastream

# Rollback to specific revision
kubectl rollout undo deployment/nexastream-backend --to-revision=2 -n nexastream
```

3. **Investigate issue**:
```bash
# Check logs
kubectl logs -n nexastream deployment/nexastream-backend --previous

# Check events
kubectl get events -n nexastream --sort-by='.lastTimestamp' | tail -20
```

**RTO**: 2-5 minutes (automatic rollback)
**RPO**: Zero (pre-deployment state)

---

## 3. Recovery Procedures

### 3.1 Full System Recovery

```bash
#!/bin/bash
# Full system recovery script

set -e

echo "=== NexaStream Full System Recovery ==="

# 1. Restore Kubernetes resources
echo "Restoring Kubernetes resources..."
aws s3 cp s3://nexastream-backups/k8s_latest.yaml /tmp/k8s.yaml
kubectl apply -f /tmp/k8s.yaml

# 2. Wait for infrastructure
echo "Waiting for infrastructure..."
kubectl wait --for=condition=ready pods -l app=postgres -n nexastream --timeout=300s
kubectl wait --for=condition=ready pods -l app=redis -n nexastream --timeout=300s

# 3. Restore database
echo "Restoring database..."
aws s3 cp s3://nexastream-backups/nexastream_latest.dump.gz /tmp/nexastream.dump.gz
gunzip -c /tmp/nexastream.dump.gz | psql -U nexastream -d nexastream

# 4. Restore blockchain state
echo "Restoring blockchain state..."
aws s3 cp s3://nexastream-backups/blockchain_latest.tar.gz /tmp/blockchain.tar.gz
tar -xzf /tmp/blockchain.tar.gz -C /data/nexachain

# 5. Start application
echo "Starting application..."
kubectl scale deployment nexastream-backend --replicas=3 -n nexastream
kubectl scale deployment nexastream-frontend --replicas=3 -n nexastream

# 6. Verify
echo "Verifying recovery..."
sleep 30
curl -f https://nexastream.org/api/health || exit 1

echo "=== Recovery Complete ==="
```

### 3.2 Database Point-in-Time Recovery

```bash
#!/bin/bash
# Point-in-time recovery to specific timestamp

TIMESTAMP="2024-01-15 10:30:00"

# Stop application
kubectl scale deployment nexastream-backend --replicas=0 -n nexastream

# Create new database
dropdb -U nexastream nexastream_new
createdb -U nexastream nexastream_new

# Restore to point in time
pg_restore -U nexastream -d nexastream_new --time="$TIMESTAMP" s3://nexastream-backups/nexastream.dump

# Verify data
psql -U nexastream -d nexastream_new -c "SELECT COUNT(*) FROM users;"

# Rename databases
psql -U nexastream -c "ALTER DATABASE nexastream RENAME TO nexastream_old;"
psql -U nexastream -c "ALTER DATABASE nexastream_new RENAME TO nexastream;"

# Restart application
kubectl scale deployment nexastream-backend --replicas=3 -n nexastream
```

---

## 4. Testing

### 4.1 Backup Verification

```bash
#!/bin/bash
# Verify backup integrity

# Check backup exists
BACKUP=$(aws s3 ls s3://nexastream-backups/ | tail -1 | awk '{print $4}')
if [ -z "$BACKUP" ]; then
    echo "No backup found!"
    exit 1
fi

# Download backup
aws s3 cp s3://nexastream-backups/$BACKUP /tmp/verify.dump.gz

# Verify gzip
gzip -t /tmp/verify.dump.gz
if [ $? -ne 0 ]; then
    echo "Backup is corrupted!"
    exit 1
fi

# Verify PostgreSQL format
gunzip -c /tmp/verify.dump.gz | pg_restore --list | head -20

echo "Backup verification passed!"
```

### 4.2 Recovery Test Schedule

| Test | Frequency | Team | Status |
|------|-----------|------|--------|
| Backup Verification | Daily | DevOps | ⚠️ |
| Full DR Drill | Monthly | DevOps + SRE | ❌ |
| Database PITR | Quarterly | DevOps | ❌ |
| Chaos Engineering | Monthly | SRE | ❌ |

### 4.3 Chaos Engineering Tests

```yaml
# example: pod-kill-test.yaml
apiVersion: chaos-mesh.com/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill
spec:
  action: pod-kill
  mode: one
  duration: 10s
  selector:
    namespaces:
    - nexastream
    labelSelectors:
      app: nexastream-backend
```

---

## 5. Monitoring

### 5.1 Backup Metrics

```yaml
# Prometheus alerts for backups
groups:
- name: backup-alerts
  rules:
  - alert: BackupNotCompleted
    expr: backup_last_success_timestamp < time() - 86400
    for: 1h
    labels:
      severity: critical
    annotations:
      summary: "Database backup not completed in 24 hours"

  - alert: BackupSizeAbnormal
    expr: backup_size_bytes < 1000000
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Backup size suspiciously small"
```

### 5.2 Recovery Metrics

| Metric | Target | Alert |
|--------|--------|-------|
| Backup Success Rate | 100% | < 99% |
| Backup Duration | < 30 min | > 60 min |
| Recovery Time | < 15 min | > 30 min |
| Data Freshness | < 6 hours | > 12 hours |

---

## Appendix A: Contact Information

| Role | Name | Contact |
|------|------|---------|
| Primary On-Call | TBD | oncall@nexastream.org |
| Backup On-Call | TBD | backup-oncall@nexastream.org |
| DevOps Lead | TBD | devops@nexastream.org |

## Appendix B: Runbooks

Detailed runbooks available at: `/docs/runbooks/`

- `DB-FAILOVER.md` - Database failover procedure
- `STORAGE-RECOVERY.md` - Storage node recovery
- `K8S-NODE-RECOVERY.md` - Kubernetes node recovery
- `CHAIN-RECOVERY.md` - Blockchain recovery
- `REGION-FAILOVER.md` - Multi-region failover

---

**Document Owner**: DevOps Team
**Last Review**: 2024
**Next Review**: Quarterly
