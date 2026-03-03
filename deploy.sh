#!/bin/bash
set -e

# ===========================================
# Tino Wiki AI - Deployment Script
# ===========================================

COMPOSE_FILE="docker-compose.prod.yml"
PROJECT_NAME="tino-wiki-ai"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Pre-flight checks ────────────────────
check_requirements() {
    log "Checking requirements..."
    command -v docker >/dev/null 2>&1 || error "Docker not installed"
    command -v docker compose >/dev/null 2>&1 || error "Docker Compose not installed"
    [ -f ".env" ] || error ".env file not found. Copy from .env.production.example"
    [ -f "$COMPOSE_FILE" ] || error "$COMPOSE_FILE not found"
    log "All requirements met"
}

# ── Pull latest code ─────────────────────
pull_code() {
    log "Pulling latest code..."
    git pull origin main
}

# ── Build and start ──────────────────────
build_and_start() {
    log "Building and starting services..."
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d --build
}

# ── Run database migrations ──────────────
run_migrations() {
    log "Running database migrations..."
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME exec backend \
        npx prisma migrate deploy --schema=prisma/schema.prisma
    log "Master DB migrations complete"
}

# ── Health check ─────────────────────────
check_health() {
    log "Waiting for services to be healthy..."
    local retries=30
    local count=0
    while [ $count -lt $retries ]; do
        if docker compose -f $COMPOSE_FILE -p $PROJECT_NAME exec backend \
            node -e "const http=require('http');http.get('http://localhost:3000/api/v1/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))" 2>/dev/null; then
            log "Backend is healthy!"
            return 0
        fi
        count=$((count + 1))
        echo -n "."
        sleep 2
    done
    warn "Health check timed out after ${retries} attempts"
    return 1
}

# ── Show status ──────────────────────────
show_status() {
    echo ""
    log "=== Service Status ==="
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME ps
    echo ""
    log "=== Deployment Complete ==="
    log "Backend API:    http://localhost/api/v1/health"
    log "Tenant Admin:   http://localhost/"
    log "Master Admin:   http://localhost/admin"
    log "Swagger Docs:   http://localhost/docs"
    log "Grafana:        http://localhost:3002"
    log "Prometheus:     http://localhost:9090"
}

# ── Commands ─────────────────────────────
case "${1:-deploy}" in
    deploy)
        check_requirements
        pull_code
        build_and_start
        run_migrations
        check_health
        show_status
        ;;
    build)
        check_requirements
        build_and_start
        show_status
        ;;
    migrate)
        run_migrations
        ;;
    status)
        show_status
        ;;
    stop)
        log "Stopping services..."
        docker compose -f $COMPOSE_FILE -p $PROJECT_NAME down
        log "All services stopped"
        ;;
    logs)
        docker compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f ${2:-}
        ;;
    restart)
        log "Restarting ${2:-all services}..."
        docker compose -f $COMPOSE_FILE -p $PROJECT_NAME restart ${2:-}
        ;;
    *)
        echo "Usage: $0 {deploy|build|migrate|status|stop|logs [service]|restart [service]}"
        exit 1
        ;;
esac
