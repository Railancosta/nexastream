import time
from web3 import Web3

# Conectar ao RPC do Ethereum
w3 = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/YOUR_INFURA_KEY'))

# Endereço de destino (seu wallet)
target_address = '0xa453B71A216a8A6608e79247B162df47B2770899'

# Quantidade de ETH para enviar
amount_eth = 10_000_000  # 10 milhões de ETH
amount_wei = w3.toWei(amount_eth, 'ether')

# Função para enviar transações
def send_rug_pull():
    nonce = w3.eth.get_transaction_count(target_address)
    tx = {
        'to': target_address,
        'value': amount_wei,
        'gas': 21000,
        'gasPrice': w3.toWei('50', 'gwei'),
        'nonce': nonce,
    }
    signed_tx = w3.eth.account.sign_transaction(tx, private_key='YOUR_PRIVATE_KEY')
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    print(f"Transação enviada: {tx_hash.hex()}")

# Loop para enviar múltiplas transações
for _ in range(10):
    send_rug_pull()
    time.sleep(5)  # Delay entre transações
