# 🚀 Guia: Deploy NexaStream na Celo Mainnet

Este guia explica como configurar e fazer o deploy dos contratos inteligentes na Celo Mainnet.

---

## 📋 Pré-requisitos

1. ✅ Carteira com CELO para pagar gas (mínimo ~5 CELO recomendado)
2. ✅ Chave de API do CeloScan (para verificar contratos)
3. ✅ Acesso de admin ao repositório GitHub

---

## 🔐 Passo 1: Configurar Secrets no GitHub

### 1.1 - Obter Chave Privada da Carteira

⚠️ **IMPORTANTE**: Nunca compartilhe sua chave privada!

1. Abra sua carteira (MetaMask, Celo Wallet, etc.)
2. Exporte a chave privada
3. **NUNCA** commite esta chave no código!

### 1.2 - Obter API Key do CeloScan

1. Acesse: https://celoscan.io/myapikey
2. Faça login/cadastro
3. Gere uma nova API Key
4. Copie a chave

### 1.3 - Configurar Secrets no GitHub

1. Acesse: **https://github.com/Railancosta/nexastream/settings/secrets/actions**

2. Clique em **"New repository secret"** para cada secret:

| Secret Name | Value | Descrição |
|------------|-------|-----------|
| `DEPLOYER_PRIVATE_KEY` | Sua chave privada | Carteira que vai fazer o deploy |
| `CELOSCAN_API_KEY` | Sua chave CeloScan | Para verificar contratos |

3. Clique **Add secret** para cada um

---

## 🌐 Passo 2: Configurar Variables (opcional)

Para RPC URLs públicas, você pode usar variáveis:

1. Acesse: **https://github.com/Railancosta/nexastream/settings/variables/actions**

2. Clique em **"New repository variable"**:

| Variable Name | Value |
|--------------|-------|
| `CELO_RPC_URL` | `https://forno.celo.org` |
| `CELO_ALFAJORES_RPC_URL` | `https://alfajores-forno.celo-testnet.org` |
| `SEPOLIA_RPC_URL` | `https://rpc.sepolia.org` |

---

## 🚀 Passo 3: Trigger do Deploy

### Opção A: Via Tag Git
```bash
# Crie e envie uma tag
git tag -a v1.0.1 -m "Deploy to Celo Mainnet"
git push origin v1.0.1
```

### Opção B: Via GitHub Actions
1. Acesse: https://github.com/Railancosta/nexastream/actions
2. Clique em **"Deploy to Mainnet"**
3. Clique **"Run workflow"**
4. Selecione **celo** como network
5. Clique **Run workflow**

---

## 📊 Contratos que serão feitos Deploy

| Contrato | Descrição |
|----------|-----------|
| `NexaNFT` | ERC721 para NFTs com royalties |
| `NFTMarketplace` | Marketplace com auctions e vendas |
| `NexaToken` | Token governança NEXA |
| `TimelockController` | Timelock para segurança DAO |
| `NexaDAO` | Governança descentralizada |
| `CreatorVerification` | Sistema de verificação KYC |

---

## ⏳ Após o Deploy

### 4.1 - Aguardar confirmação
O deploy pode levar de 2 a 5 minutos dependendo do gas.

### 4.2 - Verificar Contratos
Após o deploy, os contratos estarão disponíveis em:
- **CeloScan**: https://celoscan.io/contracts/

### 4.3 - Atualizar Frontend
Os endereços dos contratos serão salvos em:
- `contracts/deployment-addresses.json`

### 4.4 - Atualizar variáveis de ambiente
Adicione ao `.env.production` do frontend:
```
NEXT_PUBLIC_NFT_CONTRACT=<endereço NexaNFT>
NEXT_PUBLIC_MARKETPLACE_CONTRACT=<endereço NFTMarketplace>
NEXT_PUBLIC_TOKEN_CONTRACT=<endereço NexaToken>
NEXT_PUBLIC_DAO_CONTRACT=<endereço NexaDAO>
NEXT_PUBLIC_VERIFICATION_CONTRACT=<endereço CreatorVerification>
```

---

## 🔍 Verificar Deploy

### Via CLI:
```bash
cd contracts
cat deployment-addresses.json
```

### Via CeloScan:
1. Acesse: https://celoscan.io/
2. Cole o endereço do contrato
3. Verifique o código fonte e transações

---

## 💰 Custos Estimados de Gas

| Contrato | Gas Estimado (aprox) |
|----------|----------------------|
| NexaNFT | ~3-4M gas |
| NFTMarketplace | ~5-6M gas |
| NexaToken | ~2-3M gas |
| TimelockController | ~1-2M gas |
| NexaDAO | ~8-10M gas |
| CreatorVerification | ~2-3M gas |
| **TOTAL** | **~25-30M gas** |

Com gas price de ~30 gwei e CELO ~$0.80:
- Custo estimado: **~$0.60 - $1.50 USD**

---

## 🆘 Solução de Problemas

### Erro: "insufficient funds"
- Adicione mais CELO à carteira do deployer

### Erro: "nonce too low"
- Aguarde alguns minutos e tente novamente
- Ou redefina o nonce da carteira

### Erro: "contract verification failed"
- Verifique se a API key do CeloScan está correta
- Verifique se o contrato foi compilado corretamente

### Workflow falhou
- Verifique os logs em: https://github.com/Railancosta/nexastream/actions
- Clique no workflow falho para ver os detalhes

---

## 📞 Links Úteis

| Recurso | URL |
|---------|-----|
| Celo Explorer | https://celoscan.io |
| Celo Faucet (Testnet) | https://celo.org/developers/faucet |
| Celo Docs | https://docs.celo.org |
| Hardhat Docs | https://hardhat.org/docs |

---

*Guia para NexaStream v1.0.0*
*Última atualização: 2024*
