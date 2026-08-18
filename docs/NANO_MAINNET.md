# Nano Mainnet — Camada de Ancoragem e Pagamentos
STATUS: INTEGRACAO (nao lancamos mainnet propria — Item 40 respeitado).

## Fatos verificaveis
- Nano mainnet: feeless por design do protocolo (taxa = 0, sempre).
- Conta criada localmente, gratis (ed25519-blake2b, Item 15).
- Ancoragem: hash de 32 bytes no campo link de change block (Item 10).
- Explorers publicos: nanolooker.com / nanexplorer.com.

## Restricao declarada (Item 61)
- Broadcast exige >= 1 raw de funding unico (faucet comunitario/doacao).
- Sem funding: modo sign-only (blocos assinados e verificaveis offline).
- PoW obtido gratis via RPC publico (work_generate) ou CPU local.

## NST
- NST permanece como contabilidade interna TESTNET.
- Nano = liquidacao/ancoragem publica; nenhuma promessa de ganho (Item 61).
