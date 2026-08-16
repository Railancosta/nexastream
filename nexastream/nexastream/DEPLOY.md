# 🚀 Deploy Guide - NexaStream

## Opção 1: Deploy via GitHub + Vercel (Recomendado)

### Passo 1: Faça upload para GitHub

1. Crie uma conta em [GitHub](https://github.com) se não tiver
2. Crie um novo repositório chamado `nexastream`
3. No terminal, execute:

```bash
cd /workspace/project/nexastream
git remote add origin https://github.com/SEU_USUARIO/nexastream.git
git push -u origin master
```

### Passo 2: Conecte ao Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Faça login (pode usar GitHub)
3. Clique em **"Add New..."** → **"Project"**
4. Selecione seu repositório `nexastream`
5. Clique **"Import"**

### Passo 3: Configure o Deploy

1. **Framework Preset**: Next.js (detectado automaticamente)
2. **Root Directory**: `./` (ou `nexastream` se o repo incluir a pasta)
3. **Build Command**: `npm run build` ou `next build`
4. **Output Directory**: `.next`

### Passo 4: Adicione Environment Variables

Clique em **"Environment Variables"** e adicione:

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=seu_project_id
NEXT_PUBLIC_PLATFORM_OWNER=0xa453B71A216a8A6608e79247B162df47B2770899
NEXT_PUBLIC_USDC_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
JWT_SECRET=uma_chave_secreta_grande_minimo_32_caracteres
```

### Passo 5: Deploy!

Clique em **"Deploy"** e aguarde ~2 minutos.

---

## Opção 2: Deploy via Vercel CLI

### Passo 1: Instale o Vercel CLI

```bash
npm install -g vercel
```

### Passo 2: Login

```bash
vercel login
```

### Passo 3: Deploy

```bash
cd /workspace/project/nexastream
vercel
```

Siga as instruções na tela:
- Configure o projeto: **Y**
- Escopo: Selecione sua conta
- Directory: `./`
- Override settings: **N**

### Passo 4: Deploy para Produção

```bash
vercel --prod
```

---

## 🌐 Após o Deploy

Você receberá uma URL como:
```
https://nexastream.vercel.app
```

Ou para produção:
```
https://nexastream-yourname.vercel.app
```

---

## 🔗 Domínio Personalizado

1. No Vercel Dashboard, vá em **Settings** → **Domains**
2. Adicione seu domínio: `nexastream.io` (ou outro)
3. Configure o DNS conforme instruído
4. Aguarde a verificação (~24h)

---

## ⚙️ Variáveis de Ambiente Necessárias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ID do projeto WalletConnect | `abc123...` |
| `NEXT_PUBLIC_PLATFORM_OWNER` | Endereço USDC | `0xa453B71A216a8A6608e79247B162df47B2770899` |
| `NEXT_PUBLIC_USDC_ADDRESS` | Contrato USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| `JWT_SECRET` | Chave JWT | `sua_chave_secreta_minimo_32_chars` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics | `G-XXXXXXXXXX` |

---

## ❓ Precisa de Ajuda?

1. **Vercel Docs**: https://vercel.com/docs
2. **Support**: support@nexastream.io
3. **GitHub Issues**: Crie um issue no seu repo
