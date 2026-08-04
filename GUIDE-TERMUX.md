# 📱 Guia Completo: Rodar NexaStream no Termux (Android)

Este guia passo a passo explica como configurar e executar o NexaStream diretamente no seu celular Android usando o Termux.

---

## 📋 Pré-requisitos

- ✅ Android 7.0 ou superior
- ✅ App Termux instalado (baixar da F-Droid, NÃO da Play Store)
- ✅ Conexão com internet
- ✅ ~500MB de armazenamento livre

---

## 🚀 Passo 1: Instalar o Termux

### Onde baixar (IMPORTANTE):
> ⚠️ **NÃO baixe da Google Play Store!** A versão da Play Store está desatualizada e não funciona.

1. Acesse: **https://f-droid.org/en/packages/com.termux/**
2. Baixe o APK mais recente
3. Instale允许安装来自未知来源的应用
4. Abra o Termux

---

## 📦 Passo 2: Atualizar Pacotes

```bash
pkg update && pkg upgrade -y
```

Aguarde a atualização terminar (~2-5 minutos)

---

## 🛠️ Passo 3: Instalar Dependências

```bash
# Node.js 20 (requerido)
pkg install nodejs-lts -y

# Git
pkg install git -y

# Python (para alguns scripts)
pkg install python -y

# Ferramentas essenciais
pkg install openssh nano -y
```

---

## 🔑 Passo 4: Configurar Git

```bash
# Configure seu nome
git config --global user.name "Seu Nome"

# Configure seu email
git config --global user.email "seu@email.com"
```

---

## 📂 Passo 5: Clonar o Repositório

```bash
# Clone o repositório NexaStream
git clone https://github.com/Railancosta/nexastream.git

# Entre na pasta
cd nexastream
```

---

## 🌐 Passo 6: Configurar a Carteira Web3 (Opcional)

Se você quiser usar funcionalidades blockchain:

### 6.1 - Instalar o Node.js packages necessários:
```bash
cd frontend
npm install
```

### 6.2 - Para conectar com carteiras:
O NexaStream suporte:
- **MetaMask** (recomendado)
- **WalletConnect**
- **Celo Wallet**

Configure a variável de ambiente:
```bash
export NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="seu_project_id"
```

---

## 🚀 Passo 7: Rodar o Site

### Opção A: Rodar o Frontend (Site)
```bash
cd nexastream/frontend

# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev
```

O site estará acessível em `http://localhost:3000`

### Para acessar de outros dispositivos na mesma rede:
```bash
# Descubra seu IP
ifconfig

# Rode com host暴露
npm run dev -- -H 0.0.0.0
```

Acesse: `http://SEU_IP:3000`

---

## ⛓️ Passo 8: Rodar o Blockchain Local

### 8.1 - Instalar dependências do blockchain:
```bash
cd ../blockchain
npm install
```

### 8.2 - Rodar a rede local:
```bash
npm run dev
```

Isso inicia um nó blockchain local para testes.

---

## 📱 Passo 9: Configurar Compartilhamento de Rede

Para acessar o site de outros dispositivos:

```bash
# Verifique seu IP
ip addr show wlan0

# Exemplo de saída: inet 192.168.1.100

# No navegador do outro dispositivo, acesse:
# http://192.168.1.100:3000
```

---

## 🔐 Passo 10: Conectar Carteira (MetaMask)

### 10.1 - Instale o MetaMask no celular:
- Android: https://metamask.io/download/

### 10.2 - Configure para Celo Testnet:
1. Abra MetaMask
2. Vá em Settings → Networks → Add Network
3. Preencha:

| Campo | Valor |
|-------|-------|
| Network Name | Celo Alfajores |
| New RPC URL | https://alfajores-forno.celo-testnet.org |
| Chain ID | 44787 |
| Symbol | CELO |
| Block Explorer | https://alfajores.celoscan.io |

### 10.3 - Obtenha CELO de teste:
- Acesse: https://celo.org/developers/faucet
- Ou use o faucet: https://celo.org/developers/faucet

---

## 🛠️ Comandos Úteis do Termux

| Comando | Função |
|---------|--------|
| `pkg update` | Atualizar pacotes |
| `pkg install [nome]` | Instalar pacote |
| `ls` | Listar arquivos |
| `cd [pasta]` | Entrar na pasta |
| `cd ..` | Voltar pasta |
| `rm -rf [arquivo]` | Deletar arquivo |
| `nano [arquivo]` | Editar arquivo |
| `cat [arquivo]` | Ver conteúdo |
| `htop` | Ver processos |
| `exit` | Sair do Termux |

---

## 🔧 Solução de Problemas

### Erro: "command not found"
```bash
pkg update && pkg upgrade -y
```

### Erro: "EACCES permission denied"
```bash
termux-setup-storage
```
Allow storage permission when prompted.

### Node.js não funciona
```bash
pkg install nodejs-lts -y
```

### Git pedindo senha
Use um Access Token ao invés de senha:
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Marque "repo" full access
4. Use o token como senha

### Conexão lenta
```bash
# Usar npm mirror do Brasil
npm config set registry https://registry.npmmirror.com
```

---

## 📊 Scripts Disponíveis

No diretório `frontend/`:

```bash
npm run dev          # Rodar desenvolvimento
npm run build        # Build produção
npm run start        # Rodar produção
npm run lint         # Verificar código
```

No diretório `blockchain/`:

```bash
npm run dev          # Iniciar blockchain local
npm run test         # Rodar testes
npm run deploy       # Deploy contratos
```

---

## 🎯 Fluxo Completo para Rodar

```bash
# 1. Atualizar sistema
pkg update && pkg upgrade -y

# 2. Instalar dependências
pkg install nodejs-lts git -y

# 3. Clonar projeto
git clone https://github.com/Railancosta/nexastream.git
cd nexastream

# 4. Entrar no frontend
cd frontend
npm install

# 5. Rodar!
npm run dev
```

---

## 📞 Suporte

- **Issues do GitHub**: https://github.com/Railancosta/nexastream/issues
- **Documentação**: https://docs.nexastream.org
- **Discord**: https://discord.gg/nexastream

---

## ⚡ Quick Start (Versão Resumida)

```bash
pkg update && pkg install nodejs-lts git -y
git clone https://github.com/Railancosta/nexastream.git
cd nexastream/frontend && npm install && npm run dev
```

---

*Guia criado para NexaStream v1.0.0*
*Última atualização: 2024*
