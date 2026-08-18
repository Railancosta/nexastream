# Segurança da Ponte NST↔Nano
- Modelo: custodial com prova de reservas + quorum + timelock.
- Solvencia: nano_reserve >= nst_locked * taxa (verificavel por qualquer usuario).
- Saque: so com quorum de attestacao + timelock + solvencia.
- Endereco externo validado: ^nano_[13][0-9a-z]{59}$.
- Retirada em tempo real: Nano (~1s), sem taxa.
- Mainnet mode: requer fundo real na tesouraria + modo explicito; testnet por padrao.
