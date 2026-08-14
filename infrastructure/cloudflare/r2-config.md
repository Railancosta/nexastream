# Cloudflare R2 — Storage Configuration

## O que é
Cloudflare R2 é storage S3-compatible com **zero egress fee** — você não paga
por downloads. Ideal para uma plataforma de vídeos descentralizada.

## Free tier
- 10 GB storage gratuito
- Operações Class A (writes): 1M/mês grátis
- Operações Class B (reads): 10M/mês grátis
- **Egress: ILIMITADO e gratuito** (diferente de AWS S3)

## Setup

### 1. Criar bucket R2
1. https://dash.cloudflare.com → R2 Object Storage → Create bucket
2. Nome: `nexastream-storage`
3. Região: Auto

### 2. Criar API token
1. R2 → Manage R2 API Tokens → Create API Token
2. Permissões: Object Read & Write
3. Bucket: `nexastream-storage`
4. Copie: Account ID, Access Key ID, Secret Access Key

### 3. Variáveis de ambiente
```bash
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=nexastream-storage
S3_ACCESS_KEY_ID=<access-key>
S3_SECRET_ACCESS_KEY=<secret-key>
S3_FORCE_PATH_STYLE=false
```

### 4. Usar na API
O S3ContentStorage já suporta R2 nativamente (virtual-hosted-style URLs):
```typescript
const storage = new S3ContentStorage({
  endpoint: process.env.S3_ENDPOINT,
  region: "auto",
  bucket: "nexastream-storage",
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  forcePathStyle: false,
});
```

### 5. CDN público
1. R2 → nexastream-storage → Settings → Public Access → Enable
2. URL: `https://pub-<hash>.r2.dev`
3. Ou domínio customizado: `cdn.nexastream.org`

## Vantagens
| Feature | R2 | AWS S3 |
|---------|-----|--------|
| Egress | GRATUITO | $0.09/GB |
| Storage 10GB | Gratuito | $0.23/mês |
| CDN integrado | Sim (Cloudflare) | Não (CloudFront $) |

## Custo: $0/mês para começar

## Análise de custo (simulação real)

### Catálogo de 200 GB, 50 mil plays/mês:
- Storage: 190 GB × $0.015 ≈ **$2.85/mês**
- Class A (uploads + multipart): **$0** (free — milhares de ops)
- Class B (150k GETs com ranges): **$0** (free — 10M limite)
- Egress (~10 TB entregues): **$0** ← economia real vs S3

### Comparação: R2 vs AWS S3 (mesmo cenário)
| Item | R2 | AWS S3 |
|------|-----|--------|
| Storage 200GB | $2.85 | $4.60 |
| Reads 150k | $0 | $0.06 |
| **Egress 10TB** | **$0** ✅ | **$900** ❌ |
| **Total** | **$2.85/mês** | **$904.66/mês** |

### Veredito: R2 vence por egress gratuito
- Storage é o único item que deve aparecer na fatura
- Class B (reads) vence em generosidade de free tier (10M/mês)
- Egress grátis é o motivo pelo qual R2 ganha de S3 para vídeos
- Class A (writes) dificilmente sai do free tier (1M/mês)
