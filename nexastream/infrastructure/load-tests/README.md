# Load Tests (rule 87)

## Pré-requisitos
```bash
# Install k6
# Linux: sudo apt install k6
# macOS: brew install k6
```

## Executar

```bash
# 100 users
k6 run --env BASE_URL=http://localhost:4000 load-test.js

# Custom duration
k6 run --env BASE_URL=http://localhost:4000 --duration 5m load-test.js
```

## Cenários
- 100 users (baseline)
- 1000 users (scale test)
- 10000 users (stress test, em progresso)

## Thresholds (rule 86)
- P95 latency < 500ms
- P99 latency < 1000ms
- Error rate < 5%
