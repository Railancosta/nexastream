package crypto

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"

	"github.com/nexastream/nexachain/crypto/postquantum"
	"golang.org/x/crypto/ripemd160"
)

// CryptoContext is the global post-quantum crypto context
var CryptoContext *postquantum.CryptoContext

func init() {
	// Initialize post-quantum crypto context
	CryptoContext = postquantum.NewCryptoContext(postquantum.CryptoConfig{
		DefaultAlgorithm: postquantum.AlgorithmHybridClassicDilithium,
		SecurityLevel:    postquantum.SecurityLevel256,
		EnableHybrid:     true,
	})
}

// GenerateKeyPair generates a new ECDSA key pair
func GenerateKeyPair() (*ecdsa.PrivateKey, error) {
	return ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
}

// GeneratePostQuantumKeyPair generates a post-quantum key pair
func GeneratePostQuantumKeyPair() (*postquantum.KeyPair, error) {
	return CryptoContext.GenerateKeyPair(postquantum.AlgorithmHybridClassicDilithium)
}

// GenerateDilithium2KeyPair generates a Dilithium2 key pair
func GenerateDilithium2KeyPair() (*postquantum.KeyPair, error) {
	return CryptoContext.GenerateKeyPair(postquantum.AlgorithmPostQuantumDilithium2)
}

// GenerateDilithium3KeyPair generates a Dilithium3 key pair
func GenerateDilithium3KeyPair() (*postquantum.KeyPair, error) {
	return CryptoContext.GenerateKeyPair(postquantum.AlgorithmPostQuantumDilithium3)
}

// PrivateKeyToBytes converts a private key to bytes
func PrivateKeyToBytes(pk *ecdsa.PrivateKey) []byte {
	return pk.D.Bytes()
}

// BytesToPrivateKey converts bytes to a private key
func BytesToPrivateKey(data []byte) (*ecdsa.PrivateKey, error) {
	pk := new(ecdsa.PrivateKey)
	pk.Curve = elliptic.P256()
	pk.D = new(big.Int).SetBytes(data)
	pk.X, pk.Y = pk.Curve.ScalarBaseMult(data)
	return pk, nil
}

// PublicKeyToBytes converts a public key to bytes
func PublicKeyToBytes(pub *ecdsa.PublicKey) []byte {
	return elliptic.MarshalCompressed(pub.Curve, pub.X, pub.Y)
}

// PublicKeyToAddress converts a public key to an address
func PublicKeyToAddress(pub *ecdsa.PublicKey) []byte {
	pubBytes := PublicKeyToBytes(pub)
	
	// SHA256 hash
	hash := sha256.Sum256(pubBytes)
	
	// RIPEMD160 hash
	ripemd := ripemd160.New()
	ripemd.Write(hash[:])
	
	return ripemd.Sum(nil)
}

// PostQuantumPublicKeyToAddress converts a post-quantum public key to an address
func PostQuantumPublicKeyToAddress(pubKey []byte) []byte {
	return CryptoContext.DeriveAddress(pubKey)
}

// AddressToHex converts an address to hex string
func AddressToHex(addr []byte) string {
	return "0x" + hex.EncodeToString(addr)
}

// HexToAddress converts a hex string to an address
func HexToAddress(hexStr string) ([]byte, error) {
	if len(hexStr) > 2 {
		hexStr = hexStr[2:]
	}
	return hex.DecodeString(hexStr)
}

// Hash256 calculates SHA256 hash
func Hash256(data []byte) []byte {
	hash := sha256.Sum256(data)
	return hash[:]
}

// Hash512 calculates SHA3-512 hash
func Hash512(data []byte) []byte {
	return postquantum.Hash512(data)
}

// Sign signs data with a private key
func Sign(data []byte, pk *ecdsa.PrivateKey) ([]byte, error) {
	return ecdsa.SignASN1(rand.Reader, pk, data)
}

// Verify verifies a signature
func Verify(data []byte, signature []byte, pub *ecdsa.PublicKey) bool {
	return ecdsa.VerifyASN1(pub, data, signature)
}

// SignPostQuantum signs data using post-quantum cryptography
func SignPostQuantum(data []byte, keyPair *postquantum.KeyPair) (*postquantum.Signature, error) {
	return CryptoContext.Sign(data, keyPair)
}

// VerifyPostQuantum verifies a post-quantum signature
func VerifyPostQuantum(data []byte, sig *postquantum.Signature, publicKey []byte) bool {
	return CryptoContext.Verify(data, sig, publicKey)
}

// KEMKeyExchange performs key encapsulation (post-quantum key exchange)
func KEMKeyExchange(publicKey []byte) (*postquantum.EncryptedData, error) {
	return CryptoContext.KEMKeyExchange(publicKey, postquantum.SecurityLevel256)
}

// KEMDecapsulate decapsulates ciphertext to recover shared secret
func KEMDecapsulate(ciphertext, privateKey []byte) ([]byte, error) {
	return CryptoContext.KEMDecapsulate(ciphertext, privateKey)
}

// GetCryptoInfo returns crypto system information
func GetCryptoInfo() map[string]interface{} {
	return CryptoContext.CryptoInfo()
}

// PostQuantumKeyPair wraps a post-quantum key pair with ECDSA compatibility
type PostQuantumKeyPair struct {
	PQKeyPair *postquantum.KeyPair
	ECDSAKey  *ecdsa.PrivateKey
	Address   [20]byte
}

// GenerateHybridKeyPair generates a hybrid post-quantum key pair
func GenerateHybridKeyPair() (*PostQuantumKeyPair, error) {
	// Generate ECDSA key
	ecdsaKey, err := GenerateKeyPair()
	if err != nil {
		return nil, fmt.Errorf("failed to generate ECDSA key: %v", err)
	}

	// Generate post-quantum key
	pqKey, err := GeneratePostQuantumKeyPair()
	if err != nil {
		return nil, fmt.Errorf("failed to generate post-quantum key: %v", err)
	}

	// Combine addresses
	var address [20]byte
	ecdsaAddr := PublicKeyToAddress(&ecdsaKey.PublicKey)
	pqAddr := pqKey.Address
	
	// XOR the addresses for combined identity
	for i := 0; i < 20; i++ {
		address[i] = ecdsaAddr[i] ^ pqAddr[i]
	}

	return &PostQuantumKeyPair{
		PQKeyPair: pqKey,
		ECDSAKey:  ecdsaKey,
		Address:   address,
	}, nil
}

// SignHybrid signs data with both ECDSA and post-quantum algorithms
func (kp *PostQuantumKeyPair) SignHybrid(data []byte) (*postquantum.Signature, error) {
	// Sign with post-quantum
	return CryptoContext.Sign(data, kp.PQKeyPair)
}

// GetAddressHex returns the address as hex string
func (kp *PostQuantumKeyPair) GetAddressHex() string {
	return AddressToHex(kp.Address[:])
}

// GetCryptoInfo returns crypto system information
func GetPostQuantumCryptoInfo() map[string]interface{} {
	return map[string]interface{}{
		"default_algorithm":     "Hybrid-ECDSA-Dilithium",
		"security_level":        256,
		"pq_algorithms": []string{
			"CRYSTALS-Dilithium2 (128-bit)",
			"CRYSTALS-Dilithium3 (192-bit)",
			"CRYSTALS-Dilithium5 (256-bit)",
			"ML-KEM (Kyber) 512/768/1024",
		},
		"hybrid_signing": true,
		"post_quantum_ready": true,
		"quantum_resistant": true,
	}
}

// VerifyWithAlgorithm verifies a signature based on algorithm type
func VerifyWithAlgorithm(data []byte, sig *postquantum.Signature, publicKey []byte, alg postquantum.AlgorithmType) bool {
	switch alg {
	case postquantum.AlgorithmECDSA_P256, postquantum.AlgorithmECDSA_P384:
		// Handle ECDSA verification
		x := new(big.Int).SetBytes(publicKey[1:33])
		y := new(big.Int).SetBytes(publicKey[33:65])
		pub := &ecdsa.PublicKey{
			Curve: elliptic.P256(),
			X:     x,
			Y:     y,
		}
		hash := sha256.Sum256(data)
		r := new(big.Int).SetBytes(sig.R)
		s := new(big.Int).SetBytes(sig.S)
		return ecdsa.Verify(pub, hash[:], r, s)
	default:
		return CryptoContext.Verify(data, sig, publicKey)
	}
}
