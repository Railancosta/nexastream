import requests
import json
from decimal import Decimal

# Custo de ataque 51% em BTC
btc_cost_per_hour = 0.111  # BTC/TH/hour

# Taxas de câmbio
btc_to_usd = 60000  # Exemplo
usd_to_btc = 1 / btc_to_usd

# Converter BTC para ZEC
def convert_btc_to_zec(btc_amount):
    zec_price = 100  # Exemplo de preço do ZEC em USD
    return btc_amount * btc_to_usd / zec_price

# Calcular custo total do ataque
def calculate_attack_cost(hours=1):
    btc_cost = btc_cost_per_hour * hours
    zec_cost = convert_btc_to_zec(btc_cost)
    return {
        'btc': btc_cost,
        'zec': zec_cost,
        'usd': btc_cost * btc_to_usd
    }

# Converter para Zcash Shielded Address
def send_to_zcash(zec_amount, zcash_addr):
    url = f"https://zcash.blockchair.com/api/v1/address/{zcash_addr}/transactions"
    data = {
        'amount': zec_amount,
        'recipient': zcash_addr
    }
    response = requests.post(url, json=data)
    return response.json()

# Executar conversão
result = calculate_attack_cost()
print(f"Custo de ataque 51%: {result}")

# Enviar para Zcash Shielded Address
zcash_addr = u1e0mgjaa2uulqc2x7sx3fncmq0awfdgp3htuyk9wu2dk45llumnx646sxpvympzqkdhxwhujqfujyd9398n84lfg4pl5gmph388e4k085htn25erupdkg9dcf9h58vjnx5mw95rgjrr4jtgtc4972qlr5f8ya0xw0gluwpwmgryuxcanlS"
send_to_zcash(result['zec'], zcash_addr)
