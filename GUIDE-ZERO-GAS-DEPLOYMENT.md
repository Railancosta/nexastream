# 🚀 Guia: Deploy NexaStream com Taxas ZERO de Gás

Este guia explica como fazer deploy dos contratos inteligentes em blockchains com taxas mínimas ou zero.

---

## 🌐 Redes com Taxas Zero/Mínimas

| Rede | Taxa Aproximada | Especialidade | Site |
|------|----------------|---------------|------|
| **Zora** | ~$0.001 | Criadores de conteúdo | zora.co |
| **Base** | ~$0.01 | Social/Descentralizado | base.org |
| **Celo** | ~$0.001 | Mobile/Finanças | celo.org |
| **Gnosis** | ~$0.001 | DAO/Social | gnosis.io |
| **Polygon zkEVM** | ~$0.01 | Escala/Ethereum | polygon.technology |

**Recomendado: Zora Network** - Desenvolvida especificamente para criadores de conteúdo!

---

## 🔧 Bash Script - Configurar GitHub Pages

```bash
#!/bin/bash
# setup-github-pages.sh
# Uso: GITHUB_TOKEN=xxx ./setup-github-pages.sh

set -e

REPO="Railancosta/nexastream"
API_URL="https://api.github.com"

echo "🚀 Configurando GitHub Pages..."

# Habilitar GitHub Pages
curl -X PUT \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "Content-Type: application/json" \
    "$API_URL/repos/$REPO/pages" \
    -d '{
        "build_type": "workflow",
        "source": {
            "branch": "main",
            "path": "/"
        }
    }'

echo "✅ GitHub Pages configurado!"
echo "📌 Site: https://Railancosta.github.io/nexastream"
```

---

## 🦀 Rust Script - Deploy Contratos

```rust
// deploy_zora.rs
// Compile: rustc deploy_zora.rs -o deploy_zora

use std::process::Command;

fn main() {
    println!("🚀 Deploy NexaStream para Zora Network\n");
    
    // Deploy contratos
    let output = Command::new("npx")
        .args(&["hardhat", "run", "deploy.js", "--network", "zora"])
        .current_dir("contracts")
        .output()
        .expect("Falha no deploy");
    
    if output.status.success() {
        println!("✅ Deploy realizado com sucesso!");
        println!("{}", String::from_utf8_lossy(&output.stdout));
    } else {
        println!("❌ Erro no deploy");
        println!("{}", String::from_utf8_lossy(&output.stderr));
    }
}
```

---

## 📋 Passo a Passo - Deploy Completo

### 1️⃣ Configurar Secrets no GitHub

Acesse: https://github.com/Railancosta/nexastream/settings/secrets/actions

| Secret | Value |
|--------|-------|
| `DEPLOYER_PRIVATE_KEY` | Sua chave privada |

### 2️⃣ Criar Tag para Deploy

```bash
# Deploy para Zora
git tag -a zora-v1.0.0 -m "Deploy to Zora Network"
git push origin zora-v1.0.0

# Deploy para Base
git tag -a base-v1.0.0 -m "Deploy to Base"
git push origin base-v1.0.0
```

### 3️⃣ Deploy via GitHub Actions

1. Acesse: https://github.com/Railancosta/nexastream/actions
2. Selecione "Deploy to Zora (Zero Gas Fees)"
3. Clique "Run workflow"
4. Selecione a rede: **zora**
5. Aguarde ~5 minutos

---

## 🔧 Scripts de Deploy Rápido

### Deploy via CLI (Local)

```bash
# Zora Network
cd contracts
PRIVATE_KEY=0xxxx npx hardhat run deploy.js --network zora

# Base
PRIVATE_KEY=0xxxx npx hardhat run deploy.js --network base

# Celo
PRIVATE_KEY=0xxxx npx hardhat run deploy.js --network celo
```

### Setup GitHub Pages via API

```bash
# Execute este script
curl -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/Railancosta/nexastream/pages \
  -d '{"build_type":"workflow","source":{"branch":"main","path":"/"}}'
```

---

## 📊 Custos de Gas por Rede

| Rede | Gas Total | Preço Gas | Custo USD |
|------|-----------|-----------|-----------|
| Zora | ~25M | ~0.00001 gwei | **~$0.001** |
| Base | ~25M | ~0.01 gwei | **~$0.01** |
| Celo | ~25M | ~0.01 gwei | **~$0.001** |
| Gnosis | ~25M | ~0.002 gwei | **~$0.001** |
| Polygon zkEVM | ~25M | ~0.02 gwei | **~$0.01** |

---

## 🌐 Configurar MetaMask para Zero Gas Networks

### Zora Network
| Campo | Valor |
|-------|-------|
| Network Name | Zora |
| RPC URL | https://rpc.zora.energy |
| Chain ID | 7777777 |
| Symbol | ETH |
| Block Explorer | https://explorer.zora.energy |

### Base
| Campo | Valor |
|-------|-------|
| Network Name | Base |
| RPC URL | https://mainnet.base.org |
| Chain ID | 8453 |
| Symbol | ETH |
| Block Explorer | https://basescan.org |

### Celo
| Campo | Valor |
|-------|-------|
| Network Name | Celo |
| RPC URL | https://forno.celo.org |
| Chain ID | 42220 |
| Symbol | CELO |
| Block Explorer | https://celoscan.io |

### Gnosis Chain
| Campo | Valor |
|-------|-------|
| Network Name | Gnosis |
| RPC URL | https://rpc.ankr.com/gnosis |
| Chain ID | 100 |
| Symbol | xDai |
| Block Explorer | https://gnosisscan.io |

---

## 💰 Obter Tokens de Teste (Faucets)

### Zora Testnet
- https://testnet.zora.energy/faucet

### Base Sepolia
- https://www.coinbase.com/faucets

### Celo Alfajores
- https://celo.org/developers/faucet

### Gnosis Chiado
- https://gnosis.github.io/chiado/faucet

---

## 🔄 Workflows Disponíveis

| Workflow | Rede | Trigger |
|----------|------|---------|
| `deploy-mainnet.yml` | Celo | Tag v*.*.* |
| `deploy-zora.yml` | Zora/Base | Tag zora-v*.*.* |
| `build-apk.yml` | Android | Push main |

---

## 📁 Arquivos de Configuração

```
nexastream/
├── contracts/
│   ├── hardhat.config.js  # Networks: zora, base, celo, gnosis
│   ├── deploy.js          # Script de deploy
│   └── contracts/         # Smart contracts
├── scripts/
│   ├── setup-github-pages.sh  # Bash script
│   └── setup_github_pages.rs  # Rust script
└── .github/workflows/
    ├── deploy-zora.yml       # Deploy Zora + GitHub Pages
    └── deploy-mainnet.yml    # Deploy Celo
```

---

## ⚡ Quick Deploy (Uma linha)

```bash
# 1. Setup GitHub Pages
curl -X PUT -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/repos/Railancosta/nexastream/pages \
  -d '{"build_type":"workflow","source":{"branch":"main","path":"/"}}'

# 2. Deploy para Zora
git tag -a zora-v1.0.0 -m "Deploy to Zora" && git push origin zora-v1.0.0
```

---

*Guia para NexaStream v1.0.0 - Zero Gas Fees*
