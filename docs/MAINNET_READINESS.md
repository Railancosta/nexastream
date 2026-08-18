# Mainnet Readiness (Item 40)
A mainnet NST so ativa quando TODOS os gates em /api/mainnet/status estiverem
passed E o timelock de 48h apos o ultimo gate tiver decorrido.
Gates: stable_testnet, independent_audit (quorum 2-de-3), consensus_testing,
security_testing, disaster_recovery, documentation, monitoring,
emergency_procedures, final_genesis, validator_infrastructure.
Ativacao: POST /api/mainnet/activate (403 se faltar gate; 425 se timelock).
MAINNET NAO E UM BOTAO.
