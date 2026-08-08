#!/bin/bash
# NexaStream Kubernetes Deployment Script
# Usage: ./k8s/deploy.sh [command]
# Commands: deploy, status, logs, delete, scale, restart

set -e

NAMESPACE="nexastream"
CONTEXT="${KUBECTL_CONTEXT:-kind-nexastream}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    command -v kubectl >/dev/null 2>&1 || { error "kubectl is required but not installed."; exit 1; }
    
    if ! kubectl get ns "$NAMESPACE" >/dev/null 2>&1; then
        warn "Namespace $NAMESPACE does not exist"
    fi
    
    log "Prerequisites check passed"
}

# Deploy all manifests
deploy() {
    log "Deploying NexaStream to Kubernetes..."
    
    # Apply namespace
    kubectl apply -f namespace.yaml
    log "Namespace created"
    
    # Apply storage classes
    kubectl apply -f namespace.yaml
    log "Storage configured"
    
    # Apply ConfigMaps and Secrets
    kubectl apply -f namespace.yaml
    log "Secrets and ConfigMaps created"
    
    # Apply network policies
    kubectl apply -f namespace.yaml --selector=kind=NetworkPolicy 2>/dev/null || true
    log "Network policies applied"
    
    # Apply StatefulSets (PostgreSQL, Redis)
    kubectl apply -f namespace.yaml --selector=kind=StatefulSet
    log "StatefulSets created"
    
    # Wait for PostgreSQL
    log "Waiting for PostgreSQL..."
    kubectl wait --for=condition=ready pod -l app=postgres -n "$NAMESPACE" --timeout=120s || true
    
    # Apply Deployments
    kubectl apply -f namespace.yaml --selector=kind=Deployment
    log "Deployments created"
    
    # Apply HPA
    kubectl apply -f namespace.yaml --selector=kind=HorizontalPodAutoscaler 2>/dev/null || true
    log "Horizontal Pod Autoscalers configured"
    
    # Apply Services
    kubectl apply -f namespace.yaml --selector=kind=Service
    log "Services created"
    
    # Apply Ingress
    kubectl apply -f ingress.yaml 2>/dev/null || warn "Ingress not configured (requires ingress controller)"
    
    # Verify deployment
    verify_deployment
    
    log "Deployment complete!"
}

# Deploy to specific environment
deploy_env() {
    local env=$1
    
    case $env in
        local)
            log "Deploying to LOCAL (kind)..."
            kubectl config use-context kind-nexastream
            # Use local-path storage class
            sed 's/nexastream-gp3/local-path/g' namespace.yaml | kubectl apply -f -
            ;;
        staging)
            log "Deploying to STAGING..."
            kubectl config use-context staging
            kubectl apply -f namespace.yaml
            ;;
        production)
            log "Deploying to PRODUCTION..."
            read -p "Are you sure you want to deploy to production? (yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                error "Deployment cancelled"
                exit 1
            fi
            kubectl config use-context production
            kubectl apply -f namespace.yaml
            ;;
        *)
            error "Unknown environment: $env"
            echo "Usage: $0 deploy-env [local|staging|production]"
            exit 1
            ;;
    esac
}

# Check deployment status
status() {
    log "Checking deployment status..."
    
    echo ""
    echo "=== NAMESPACES ==="
    kubectl get ns
    
    echo ""
    echo "=== PODS ==="
    kubectl get pods -n "$NAMESPACE"
    
    echo ""
    echo "=== DEPLOYMENTS ==="
    kubectl get deployments -n "$NAMESPACE"
    
    echo ""
    echo "=== SERVICES ==="
    kubectl get svc -n "$NAMESPACE"
    
    echo ""
    echo "=== PERSISTENT VOLUMES ==="
    kubectl get pvc -n "$NAMESPACE"
    
    echo ""
    echo "=== HORIZONTAL POD AUTOSCALERS ==="
    kubectl get hpa -n "$NAMESPACE" 2>/dev/null || echo "No HPA configured"
    
    echo ""
    echo "=== RECENT EVENTS ==="
    kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' | tail -10
}

# View logs
logs() {
    local component=${1:-backend}
    local lines=${2:-100}
    
    kubectl logs -n "$NAMESPACE" -l "app=nexastream,component=$component" --tail="$lines" -f 2>/dev/null || \
        kubectl logs -n "$NAMESPACE" deployment/nexastream-$component -f
}

# Scale deployment
scale() {
    local component=$1
    local replicas=$2
    
    if [ -z "$component" ] || [ -z "$replicas" ]; then
        echo "Usage: $0 scale <component> <replicas>"
        echo "Components: backend, frontend, blockchain"
        exit 1
    fi
    
    log "Scaling $component to $replicas replicas..."
    kubectl scale deployment/nexastream-$component -n "$NAMESPACE" --replicas="$replicas"
}

# Restart deployment
restart() {
    local component=${1:-backend}
    
    if [ -z "$component" ]; then
        log "Restarting all components..."
        kubectl rollout restart deployment -n "$NAMESPACE"
    else
        log "Restarting $component..."
        kubectl rollout restart deployment/nexastream-$component -n "$NAMESPACE"
    fi
    
    log "Waiting for rollout to complete..."
    kubectl rollout status deployment/nexastream-$component -n "$NAMESPACE" --timeout=300s
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check all pods are running
    local pending=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep -v Running | wc -l)
    
    if [ "$pending" -gt 0 ]; then
        warn "$pending pod(s) not running"
        kubectl get pods -n "$NAMESPACE" | grep -v Running
    else
        log "All pods are running"
    fi
    
    # Check services
    local svc_count=$(kubectl get svc -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    log "$svc_count services configured"
}

# Delete deployment
delete() {
    log "Deleting NexaStream deployment..."
    read -p "Are you sure? This will delete all resources. (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        error "Deletion cancelled"
        exit 1
    fi
    
    kubectl delete -f namespace.yaml --ignore-not-found
    kubectl delete -f ingress.yaml --ignore-not-found
    log "Deletion complete"
}

# Get pod info
pod_info() {
    local pod=$1
    
    if [ -z "$pod" ]; then
        echo "Available pods:"
        kubectl get pods -n "$NAMESPACE" -o wide
    else
        kubectl describe pod "$pod" -n "$NAMESPACE"
    fi
}

# Execute command in pod
exec_in_pod() {
    local pod=$1
    shift
    local cmd="$@"
    
    if [ -z "$pod" ] || [ -z "$cmd" ]; then
        echo "Usage: $0 exec <pod> <command>"
        exit 1
    fi
    
    kubectl exec -it "$pod" -n "$NAMESPACE" -- $cmd
}

# Port forward for local access
port_forward() {
    local component=${1:-backend}
    local local_port=${2:-3001}
    
    log "Port forwarding $component to localhost:$local_port..."
    log "Press Ctrl+C to stop"
    
    case $component in
        backend)
            kubectl port-forward svc/nexastream-backend $local_port:3001 -n "$NAMESPACE"
            ;;
        frontend)
            kubectl port-forward svc/nexastream-frontend $local_port:3000 -n "$NAMESPACE"
            ;;
        blockchain|rpc)
            kubectl port-forward svc/nexachain-node $local_port:8545 -n "$NAMESPACE"
            ;;
        postgres|db)
            kubectl port-forward svc/postgres $local_port:5432 -n "$NAMESPACE"
            ;;
        redis)
            kubectl port-forward svc/redis $local_port:6379 -n "$NAMESPACE"
            ;;
        *)
            error "Unknown component: $component"
            echo "Available: backend, frontend, blockchain, postgres, redis"
            exit 1
            ;;
    esac
}

# Show help
show_help() {
    echo "NexaStream Kubernetes Deployment Script"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  deploy              Deploy all resources"
    echo "  deploy-env <env>   Deploy to specific environment (local/staging/production)"
    echo "  status             Show deployment status"
    echo "  logs [comp] [n]   View logs (default: backend, 100 lines)"
    echo "  scale <comp> <n>  Scale component to n replicas"
    echo "  restart [comp]     Restart deployment/component"
    echo "  delete             Delete all resources"
    echo "  pod [name]         Show pod info"
    echo "  exec <pod> <cmd>   Execute command in pod"
    echo "  port-forward <svc> [port] Port forward service"
    echo "  help               Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 deploy"
    echo "  $0 logs backend 200"
    echo "  $0 scale backend 5"
    echo "  $0 port-forward blockchain 8545"
}

# Main
case "${1:-help}" in
    deploy)
        check_prerequisites
        deploy
        ;;
    deploy-env)
        deploy_env "$2"
        ;;
    status)
        status
        ;;
    logs)
        logs "$2" "$3"
        ;;
    scale)
        scale "$2" "$3"
        ;;
    restart)
        restart "$2"
        ;;
    delete)
        delete
        ;;
    pod)
        pod_info "$2"
        ;;
    exec)
        shift
        exec_in_pod "$@"
        ;;
    port-forward)
        port_forward "$2" "$3"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
