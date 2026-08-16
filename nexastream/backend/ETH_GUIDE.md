# 🟣 Ethereum Blockchain Integration Guide

## ⚠️ CUSTO REAL - LEIA ANTES DE CONTINUAR

Deploy na **Ethereum Mainnet** custa ETH real:
- Deploy de contratos: ~$50-200 (dependendo do gas)
- Transações: ~$1-50 cada

---

## 🚀 OPÇÃO GRÁTIS: Sepolia Testnet (para desenvolvimento)

### Passo 1: Obter ETH de Teste GRÁTIS

1. **Criar conta na Alchemy** (grátis):
   - Acesse: https://www.alchemy.com/
   - Cadastre-se com email
   - Crie novo projeto: "NexaStream Dev"

2. **Obter ETH Sepolia de Graça**:
   - https://www.alchemy.com/faucets/ethereum-sepolia
   - Ou: https://www.sepoliafaucet.com/
   - Cole seu endereço da Sepolia
   - Receba 0.5 ETH grátis (renovável)

3. **Configurar no .env**:
```bash
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY
DEPLOYER_PRIVATE_KEY=sua_chave_privada_da_conta_de_teste
```

---

## 💎 DEPLOY NA MAINNET (CUSTO REAL)

### O que você precisa:

1. **Carteira Ethereum** (MetaMask)
2. **ETH para gas** (~0.1 ETH para começar)
3. **RPC Provider** (Alchemy ou Infura)

### Onde Comprar ETH:
- Binance
- Coinbase  
- Mercado Bitcoin
- EXMO

### Custos Estimados:

| Ação | Custo em Gas |
|------|-------------|
| Deploy Token Contract | ~$50-100 |
| Deploy Rewards Contract | ~$30-80 |
| Cada Transação | ~$1-10 |

### Passo a Passo Mainnet:

1. **Configure MetaMask** com ETH real
2. **Crie app na Alchemy** para Mainnet:
   ```
   https://dashboard.alchemy.com/
   ```
3. **Edite .env**:
```bash
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
DEPLOYER_PRIVATE_KEY=sua_chave_privada_REAL
MAINNET_TOKEN_ADDRESS=0x... # após deploy
```

4. **Deploy o Token**:
```bash
cd backend
npm install ethers @openzeppelin/contracts
npx hardhat compile
npx hardhat run scripts/deploy-token.js --network mainnet
```

5. **Deploy o Rewards**:
```bash
npx hardhat run scripts/deploy-rewards.js --network mainnet
```

---

## 📁 Arquivos Criados

```
backend/src/blockchain/
├── contracts.js    # ABI e endereços dos contratos
├── ethereum.js     # Serviço para interagir com ETH
└── scripts.js      # Scripts de deploy
```

## 🔗 Contratos Inteligentes

### NEXA Token (ERC-20)
- Nome: NexaStream Token
- Símbolo: NEXA
- Supply máximo: 1 Bilhão

### Rewards Pool
- Staking de NEXA
- Recompensas automáticas
- Taxa configurável

---

## ⚡ Alternativa Mais Barata: Polygon zkEVM

Se o custo da Ethereum Mainnet for proibitivo, considere:

**Polygon zkEVM:**
- Taxas: ~$0.01-0.10 por transação
- Deploy contratos: ~$1-5
- 100x mais barato que Ethereum!

```bash
POLYGON_RPC_URL=https://zkevm-rpc.com
POLYGON_CHAIN_ID=1101
```

---

## 📊 Status da Blockchain

API de status: `GET /api/blockchain/status`

```json
{
  "network": "Ethereum Sepolia",
  "gasPrice": "25 Gwei",
  "ethPrice": "$3,200",
  "status": "connected"
}
```
