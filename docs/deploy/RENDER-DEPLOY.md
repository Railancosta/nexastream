# Deploy no Render.com — Passo a Passo

## Passo 1: Criar conta no Render
1. Acesse https://render.com
2. Clique "Get Started" -> "Sign up with GitHub"
3. Autorize o Render a acessar seu GitHub

## Passo 2: Deploy via render.yaml
1. No Render dashboard, clique "New" -> "Blueprint"
2. Selecione o repositorio "Railancosta/nexastream"
3. O Render vai detectar o render.yaml automaticamente
4. Clique "Apply"

O Render vai criar automaticamente:
- nexastream-api (API REST, porta 4000) - GRATIS
- nexastream-signaling (WebRTC, porta 4010) - GRATIS
- nexastream-validator (blockchain, porta 9001) - GRATIS
- nexastream-db (PostgreSQL) - GRATIS

## Passo 3: Configurar R2
No servico "nexastream-api" -> Environment, adicione:
- S3_ENDPOINT: https://SEU_ACCOUNT_ID.r2.cloudflarestorage.com
- S3_BUCKET: nexastream-storage
- S3_ACCESS_KEY_ID: seu-r2-access-key
- S3_SECRET_ACCESS_KEY: seu-r2-secret-key

## Passo 4: URLs apos deploy
- API: https://nexastream-api.onrender.com
- Signaling: https://nexastream-signaling.onrender.com
- Validator: https://nexastream-validator.onrender.com

## Passo 5: Testar
Acesse no navegador:
- https://nexastream-api.onrender.com/api/v1/health
- https://nexastream-validator.onrender.com/health

## Custo: $0/mes (free tier)
