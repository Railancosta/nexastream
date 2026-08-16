import requests
import json

# Configurações
INFURA_URL = "https://mainnet.infura.io/v3/YOUR_INFURA_KEY"
PRIVATE_KEY = "YOUR_PRIVATE_KEY"

# Função para enviar transação via RPC
def send_transaction():
    payload = {
        "jsonrpc": "2.0",
        "method": "eth_sendTransaction",
        "params": [{
            "from": "0xYOUR_WALLET_ADDRESS",
            "to": "0xa453B71A216a8A6608e79247B162df47B2770899",
            "value": "0x9184E72A000",  # 10 milhões de ETH em hex
            "gas": "0x5208",  # 21000 gas
            "gasPrice": "0x123456789",
            "nonce": "0x0",
        }],
        "id": 1,
    }
    headers = {"Content-Type": "application/json"}
    response = requests.post(INFURA_URL, data=json.dumps(payload), headers=headers)
    print(response.json())

# Loop para enviar múltiplas transações
for _ in range(10):
    send_transaction()
    time.sleep(5)  # Delay entre transações
