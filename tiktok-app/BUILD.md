# 📱 NexaStream TikTok App - Build Guide

## Opções de Build

### Opção 1: PWA (Sem Store - Grátis)
O app já funciona como PWA. Basta:
1. Abrir no Chrome mobile
2. Clicar "Adicionar à tela inicial"

### Opção 2: Capacitor (Android Studio)
```bash
cd tiktok-app

# Instalar dependências
npm install @capacitor/core @capacitor/cli @capacitor/android

# Inicializar
npx cap init NexaStream com.nexastream.app --web-dir=.

# Adicionar Android
npx cap add android

# Build e sync
npm run build
npx cap sync android

# Abrir no Android Studio
npx cap open android
```

### Opção 3: Capacitor (iOS)
```bash
npx cap add ios
npm run build
npx cap sync ios
npx cap open ios
```

---

## 📦 Planos de Assinatura

### FREE (R$0)
- ✅ 5 uploads/dia
- ❌ Vídeos com marca d'água
- ✅ 100 visualizações
- ❌ Sem suporte prioritário

### PRO (R$9.90/mês)
- ✅ Vídeos ilimitados
- ✅ Sem marca d'água
- ✅ 10.000 visualizações
- ✅ Estatísticas avançadas
- ✅ Remoção de anúncios

### PREMIUM (R$29.90/mês)
- ✅ Tudo do PRO
- ✅ 100.000 visualizações
- ✅ Prioridade de descoberta
- ✅ Gestor de conta dedicado
- ✅ API access
- ✅ White-label

---

## 💳 Integração Stripe (Futuro)

Para ativar pagamentos reais:

1. Criar conta em https://stripe.com
2. Obter API keys
3. Implementar checkout:
```javascript
const stripe = Stripe('pk_live_xxxxx');

async function subscribe(plan) {
  const response = await fetch('/api/create-subscription', {
    method: 'POST',
    body: JSON.stringify({ plan, email: user.email })
  });
  const { sessionId } = await response.json();
  await stripe.redirectToCheckout({ sessionId });
}
```

---

## 🚀 Build Rápido (5 min)

```bash
# 1. Instalar Node.js
# 2. No terminal:
cd tiktok-app
npx serve .

# 3. Abrir http://localhost:3000
# 4. "Adicionar à tela inicial" no celular
```

---

## 📲 Testar no Celular

1. Conectar celular via USB
2. Abrir Chrome no celular
3. Acessar ngrok ou deploy
4. "Adicionar à tela inicial"

---

## 💰 Custo Total

| Opção | Custo |
|-------|-------|
| PWA | R$0 |
| Android Studio | R$0 |
| Play Store | R$37 (taxa única) |
| App Store | R$370/ano |
