# HashiCorp Vault config for NexaStream (rule 106)
# Production: use a real Vault instance, not this file directly.

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 0  # MUST be 0 in production
}

storage "file" {
  path = "/vault/data"
}

# Secrets to store:
# secret/nexastream/jwt-secret        — JWT signing secret (min 32 chars)
# secret/nexastream/validator-key-1   — validator 1 private key
# secret/nexastream/validator-key-2   — validator 2 private key
# secret/nexastream/validator-key-3   — validator 3 private key
# secret/nexastream/database-url      — PostgreSQL connection string
# secret/nexastream/turn-credential   — TURN server credential
