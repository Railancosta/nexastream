# DEPLOY FÁCIL - NexaStream Backend

## OPÇÃO 1: Render.com (GRÁTIS - 750h/mês)

1. Abra https://render.com
2. New → Web Service
3. Connect: Railancosta/nexastream
4. Root Directory: backend
5. Build: npm install
6. Start: npm start
7. Variables:
   - JWT_SECRET=nexastream2024
   - NODE_ENV=production
   - FRONTEND_URL=https://nexastream.org
8. Create → Deploy (~3 min)
9. URL: https://xxxx.onrender.com

## DEPOIS DO DEPLOY:

Edite: frontend/.env.local
```
NEXT_PUBLIC_API_URL=https://SUA-URL-AQUI
```

Push: git add . && git commit -m "Update API" && git push

## CUSTO: R$0 | TEMPO: 10 min
