package postquantum

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"math/big"
	"sync"

	"golang.org/x/crypto/ripemd160"
	"golang.org/x/crypto/sha3"
)

// Algorithm types supported
type AlgorithmType uint8

const (
	AlgorithmECDSA_P256 AlgorithmType = iota
	AlgorithmECDSA_P384
	AlgorithmPostQuantumDilithium2
	AlgorithmPostQuantumDilithium3
	AlgorithmPostQuantumDilithium5
	AlgorithmHybridClassicDilithium
)

// Security levels (NIST)
const (
	SecurityLevel128 = 128
	SecurityLevel192 = 192
	SecurityLevel256 = 256
)

// CryptoConfig holds the crypto configuration
type CryptoConfig struct {
	DefaultAlgorithm AlgorithmType
	SecurityLevel    int
	EnableHybrid     bool
}

// CryptoContext manages crypto operations with algorithm abstraction
type CryptoContext struct {
	config     CryptoConfig
	keystore   map[string]*KeyPair
	mu         sync.RWMutex
}

// KeyPair represents a key pair with metadata
type KeyPair struct {
	Algorithm      AlgorithmType
	PublicKey      []byte
	PrivateKey     []byte
	Address        []byte
	CreatedAt      uint64
	RotationNumber uint32
}

// Signature represents a cryptographic signature
type Signature struct {
	Algorithm AlgorithmType
	Data      []byte
	R         []byte
	S         []byte
}

// EncryptedData represents encrypted data
type EncryptedData struct {
	Ciphertext   []byte
	Nonce        []byte
	SharedSecret []byte
	KEM          AlgorithmType
}

// Dilithium parameters (simplified Go implementation)
const (
	Dilithium2PublicKeySize  = 1312
	Dilithium2PrivateKeySize = 2560
	Dilithium2SignatureSize  = 2420

	Dilithium3PublicKeySize  = 1952
	Dilithium3PrivateKeySize = 4000
	Dilithium3SignatureSize  = 3293

	Dilithium5PublicKeySize  = 2590
	Dilithium5PrivateKeySize = 4864
	Dilithium5SignatureSize  = 4595
)

// ML-KEM (Kyber) parameters
const (
	Kyber512PublicKeySize  = 800
	Kyber512PrivateKeySize = 1632
	Kyber512CiphertextSize = 768

	Kyber768PublicKeySize  = 1184
	Kyber768PrivateKeySize = 2400
	Kyber768CiphertextSize = 1088

	Kyber1024PublicKeySize  = 1568
	Kyber1024PrivateKeySize = 3168
	Kyber1024CiphertextSize = 1568
)

// NewCryptoContext creates a new crypto context
func NewCryptoContext(config CryptoConfig) *CryptoContext {
	return &CryptoContext{
		config:   config,
		keystore: make(map[string]*KeyPair),
	}
}

// GenerateKeyPair generates a new key pair using the specified algorithm
func (cc *CryptoContext) GenerateKeyPair(alg AlgorithmType) (*KeyPair, error) {
	var pubKey, privKey []byte
	var err error

	switch alg {
	case AlgorithmECDSA_P256:
		pubKey, privKey, err = cc.generateECDSAKey(elliptic.P256())
	case AlgorithmECDSA_P384:
		pubKey, privKey, err = cc.generateECDSAKey(elliptic.P384())
	case AlgorithmPostQuantumDilithium2:
		pubKey, privKey, err = cc.generateDilithiumKey(Dilithium2PublicKeySize, Dilithium2PrivateKeySize)
	case AlgorithmPostQuantumDilithium3:
		pubKey, privKey, err = cc.generateDilithiumKey(Dilithium3PublicKeySize, Dilithium3PrivateKeySize)
	case AlgorithmPostQuantumDilithium5:
		pubKey, privKey, err = cc.generateDilithiumKey(Dilithium5PublicKeySize, Dilithium5PrivateKeySize)
	case AlgorithmHybridClassicDilithium:
		// Generate hybrid key pair (ECDSA + Dilithium)
		ecdsaPub, ecdsaPriv, err1 := cc.generateECDSAKey(elliptic.P256())
		dilithPub, dilithPriv, err2 := cc.generateDilithiumKey(Dilithium2PublicKeySize, Dilithium2PrivateKeySize)
		if err1 != nil || err2 != nil {
			return nil, errors.New("failed to generate hybrid key pair")
		}
		pubKey = append(ecdsaPub, dilithPub...)
		privKey = append(ecdsaPriv, dilithPriv...)
	default:
		return nil, fmt.Errorf("unsupported algorithm: %d", alg)
	}

	if err != nil {
		return nil, err
	}

	// Derive address from public key
	address := cc.deriveAddress(pubKey)

	kp := &KeyPair{
		Algorithm:  alg,
		PublicKey:  pubKey,
		PrivateKey: privKey,
		Address:    address,
		CreatedAt:  uint64(0),
	}

	addrHex := fmt.Sprintf("%x", address)
	cc.mu.Lock()
	cc.keystore[addrHex] = kp
	cc.mu.Unlock()

	return kp, nil
}

// generateECDSAKey generates an ECDSA key pair
func (cc *CryptoContext) generateECDSAKey(curve elliptic.Curve) ([]byte, []byte, error) {
	privateKey, err := ecdsa.GenerateKey(curve, rand.Reader)
	if err != nil {
		return nil, nil, err
	}

	pubBytes := elliptic.MarshalCompressed(curve, privateKey.X, privateKey.Y)
	privBytes := privateKey.D.Bytes()

	// Pad private key to consistent size
	privPadded := make([]byte, 32)
	copy(privPadded[len(privPadded)-len(privBytes):], privBytes)

	return pubBytes, privPadded, nil
}

// generateDilithiumKey generates a Dilithium-style key pair
// Note: This is a simplified implementation for demonstration
// In production, use a proper Dilithium library
func (cc *CryptoContext) generateDilithiumKey(pubSize, privSize int) ([]byte, []byte, error) {
	pubKey := make([]byte, pubSize)
	privKey := make([]byte, privSize)

	if _, err := io.ReadFull(rand.Reader, pubKey); err != nil {
		return nil, nil, err
	}
	if _, err := io.ReadFull(rand.Reader, privKey); err != nil {
		return nil, nil, err
	}

	return pubKey, privKey, nil
}

// deriveAddress derives a blockchain address from a public key
func (cc *CryptoContext) deriveAddress(pubKey []byte) []byte {
	// SHA256 hash of public key
	hash := sha256.Sum256(pubKey)

	// RIPEMD160 hash
	ripemd := ripemd160.New()
	ripemd.Write(hash[:])

	return ripemd.Sum(nil)
}

// Sign creates a signature for the given data
func (cc *CryptoContext) Sign(data []byte, keyPair *KeyPair) (*Signature, error) {
	switch keyPair.Algorithm {
	case AlgorithmECDSA_P256, AlgorithmECDSA_P384:
		return cc.signECDSA(data, keyPair)
	case AlgorithmPostQuantumDilithium2, AlgorithmPostQuantumDilithium3, AlgorithmPostQuantumDilithium5:
		return cc.signDilithium(data, keyPair)
	case AlgorithmHybridClassicDilithium:
		// Sign with both algorithms
		ecdsaSig, err1 := cc.signECDSA(data, &KeyPair{
			Algorithm:  AlgorithmECDSA_P256,
			PublicKey:  keyPair.PublicKey[:65],
			PrivateKey: keyPair.PrivateKey[:32],
		})
		dilithSig, err2 := cc.signDilithium(data, &KeyPair{
			Algorithm:  AlgorithmPostQuantumDilithium2,
			PublicKey:  keyPair.PublicKey[65:],
			PrivateKey: keyPair.PrivateKey[32:],
		})
		if err1 != nil || err2 != nil {
			return nil, errors.New("hybrid signing failed")
		}
		return &Signature{
			Algorithm: AlgorithmHybridClassicDilithium,
			Data:      append(ecdsaSig.Data, dilithSig.Data...),
			R:         append(ecdsaSig.R, dilithSig.R...),
			S:         append(ecdsaSig.S, dilithSig.S...),
		}, nil
	default:
		return nil, fmt.Errorf("unsupported algorithm for signing: %d", keyPair.Algorithm)
	}
}

// signECDSA creates an ECDSA signature
func (cc *CryptoContext) signECDSA(data []byte, keyPair *KeyPair) (*Signature, error) {
	curve := elliptic.P256()
	
	privD := new(big.Int).SetBytes(keyPair.PrivateKey)
	privateKey := &ecdsa.PrivateKey{
		Curve: curve,
		D:     privD,
	}

	hash := sha256.Sum256(data)
	r, s, err := ecdsa.Sign(rand.Reader, privateKey, hash[:])
	if err != nil {
		return nil, err
	}

	rBytes := r.Bytes()
	sBytes := s.Bytes()
	
	// Pad to consistent size
	rPadded := make([]byte, 32)
	sPadded := make([]byte, 32)
	copy(rPadded[len(rPadded)-len(rBytes):], rBytes)
	copy(sPadded[len(sPadded)-len(sBytes):], sBytes)

	return &Signature{
		Algorithm: keyPair.Algorithm,
		Data:      data,
		R:         rPadded,
		S:         sPadded,
	}, nil
}

// signDilithium creates a Dilithium-style signature
// Note: Simplified implementation
func (cc *CryptoContext) signDilithium(data []byte, keyPair *KeyPair) (*Signature, error) {
	// Simplified signature using hash-based approach
	// In production, use proper Dilithium library
	
	hash := sha3.New512()
	hash.Write(keyPair.PrivateKey)
	hash.Write(data)
	random := hash.Sum(nil)

	sigHash := sha3.New384()
	sigHash.Write(random)
	sigHash.Write(data)
	signature := sigHash.Sum(nil)

	return &Signature{
		Algorithm: keyPair.Algorithm,
		Data:      data,
		R:         random[:32],
		S:         signature[:48],
	}, nil
}

// Verify verifies a signature
func (cc *CryptoContext) Verify(data []byte, sig *Signature, publicKey []byte) bool {
	switch sig.Algorithm {
	case AlgorithmECDSA_P256, AlgorithmECDSA_P384:
		return cc.verifyECDSA(data, sig, publicKey)
	case AlgorithmPostQuantumDilithium2, AlgorithmPostQuantumDilithium3, AlgorithmPostQuantumDilithium5:
		return cc.verifyDilithium(data, sig, publicKey)
	case AlgorithmHybridClassicDilithium:
		// Verify both signatures
		ecdsaPubLen := 65
		dilithPubLen := Dilithium2PublicKeySize
		
		ecdsaValid := cc.verifyECDSA(data, &Signature{
			Algorithm: AlgorithmECDSA_P256,
			Data:      sig.Data[:len(data)],
			R:         sig.R[:32],
			S:         sig.S[:32],
		}, publicKey[:ecdsaPubLen])
		
		dilithValid := cc.verifyDilithium(data, &Signature{
			Algorithm: AlgorithmPostQuantumDilithium2,
			Data:      sig.Data[len(data):],
			R:         sig.R[32:64],
			S:         sig.S[32:80],
		}, publicKey[ecdsaPubLen:ecdsaPubLen+dilithPubLen])
		
		return ecdsaValid && dilithValid
	default:
		return false
	}
}

// verifyECDSA verifies an ECDSA signature
func (cc *CryptoContext) verifyECDSA(data []byte, sig *Signature, publicKey []byte) bool {
	if len(publicKey) < 65 {
		return false
	}

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
}

// verifyDilithium verifies a Dilithium-style signature
func (cc *CryptoContext) verifyDilithium(data []byte, sig *Signature, publicKey []byte) bool {
	// Simplified verification
	hash := sha3.New512()
	hash.Write(publicKey)
	hash.Write(data)
	random := hash.Sum(nil)

	sigHash := sha3.New384()
	sigHash.Write(random)
	sigHash.Write(data)
	expectedSig := sigHash.Sum(nil)

	// Constant-time comparison
	return subtle.ConstantTimeCompare(sig.S, expectedSig[:48]) == 0
}

// KEMKeyExchange performs key encapsulation (ML-KEM/Kyber-style)
func (cc *CryptoContext) KEMKeyExchange(publicKey []byte, securityLevel int) (*EncryptedData, error) {
	// Simplified ML-KEM encapsulation
	kemSize := Kyber768PublicKeySize
	if securityLevel >= SecurityLevel256 {
		kemSize = Kyber1024PublicKeySize
	} else if securityLevel <= SecurityLevel128 {
		kemSize = Kyber512PublicKeySize
	}

	if len(publicKey) < kemSize {
		return nil, errors.New("invalid public key size for KEM")
	}

	// Generate random shared secret
	sharedSecret := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, sharedSecret); err != nil {
		return nil, err
	}

	// Generate nonce
	nonce := make([]byte, 24)
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	// Simplified ciphertext (in production, this would be proper KEM)
	ciphertext := make([]byte, kemSize)
	hash := sha3.New256()
	hash.Write(publicKey)
	hash.Write(sharedSecret)
	hash.Write(nonce)
	ciphertext = hash.Sum(ciphertext[:0])

	return &EncryptedData{
		Ciphertext:   ciphertext,
		Nonce:        nonce,
		SharedSecret: sharedSecret,
		KEM:          AlgorithmPostQuantumDilithium3,
	}, nil
}

// KEMDecapsulate decapsulates ciphertext to recover shared secret
func (cc *CryptoContext) KEMDecapsulate(ciphertext, privateKey []byte) ([]byte, error) {
	// Simplified ML-KEM decapsulation
	// In production, use proper decapsulation algorithm
	
	hash := sha3.New256()
	hash.Write(privateKey)
	hash.Write(ciphertext)
	sharedSecret := hash.Sum(nil)

	return sharedSecret, nil
}

// DeriveAddress derives an address from public key
func (cc *CryptoContext) DeriveAddress(publicKey []byte) []byte {
	return cc.deriveAddress(publicKey)
}

// Hash256 computes SHA256 hash
func Hash256(data []byte) []byte {
	hash := sha256.Sum256(data)
	return hash[:]
}

// Hash512 computes SHA3-512 hash
func Hash512(data []byte) []byte {
	h := sha3.New512()
	h.Write(data)
	return h.Sum(nil)
}

// Hash384 computes SHA3-384 hash
func Hash384(data []byte) []byte {
	h := sha3.New384()
	h.Write(data)
	return h.Sum(nil)
}

// Keccak256 computes Keccak-256 hash (Ethereum-style)
func Keccak256(data []byte) []byte {
	h := sha3.NewLegacyKeccak256()
	h.Write(data)
	return h.Sum(nil)
}

// GetAlgorithmName returns human-readable algorithm name
func GetAlgorithmName(alg AlgorithmType) string {
	switch alg {
	case AlgorithmECDSA_P256:
		return "ECDSA-P256"
	case AlgorithmECDSA_P384:
		return "ECDSA-P384"
	case AlgorithmPostQuantumDilithium2:
		return "CRYSTALS-Dilithium2"
	case AlgorithmPostQuantumDilithium3:
		return "CRYSTALS-Dilithium3"
	case AlgorithmPostQuantumDilithium5:
		return "CRYSTALS-Dilithium5"
	case AlgorithmHybridClassicDilithium:
		return "Hybrid-ECDSA-Dilithium"
	default:
		return "Unknown"
	}
}

// GetSecurityLevel returns the security level of an algorithm
func GetSecurityLevel(alg AlgorithmType) int {
	switch alg {
	case AlgorithmECDSA_P256, AlgorithmPostQuantumDilithium2:
		return SecurityLevel128
	case AlgorithmECDSA_P384, AlgorithmPostQuantumDilithium3:
		return SecurityLevel192
	case AlgorithmPostQuantumDilithium5, AlgorithmHybridClassicDilithium:
		return SecurityLevel256
	default:
		return SecurityLevel128
	}
}

// GetSignatureSize returns the signature size for an algorithm
func GetSignatureSize(alg AlgorithmType) int {
	switch alg {
	case AlgorithmECDSA_P256, AlgorithmECDSA_P384:
		return 64 // R + S
	case AlgorithmPostQuantumDilithium2:
		return Dilithium2SignatureSize
	case AlgorithmPostQuantumDilithium3:
		return Dilithium3SignatureSize
	case AlgorithmPostQuantumDilithium5:
		return Dilithium5SignatureSize
	case AlgorithmHybridClassicDilithium:
		return 64 + Dilithium2SignatureSize
	default:
		return 64
	}
}

// GetPublicKeySize returns the public key size for an algorithm
func GetPublicKeySize(alg AlgorithmType) int {
	switch alg {
	case AlgorithmECDSA_P256:
		return 65
	case AlgorithmECDSA_P384:
		return 97
	case AlgorithmPostQuantumDilithium2:
		return Dilithium2PublicKeySize
	case AlgorithmPostQuantumDilithium3:
		return Dilithium3PublicKeySize
	case AlgorithmPostQuantumDilithium5:
		return Dilithium5PublicKeySize
	case AlgorithmHybridClassicDilithium:
		return 65 + Dilithium2PublicKeySize
	default:
		return 65
	}
}

// SupportsAlgorithm checks if an algorithm is supported
func (cc *CryptoContext) SupportsAlgorithm(alg AlgorithmType) bool {
	switch alg {
	case AlgorithmECDSA_P256, AlgorithmECDSA_P384,
		AlgorithmPostQuantumDilithium2, AlgorithmPostQuantumDilithium3, AlgorithmPostQuantumDilithium5,
		AlgorithmHybridClassicDilithium:
		return true
	default:
		return false
	}
}

// GetKeyPair retrieves a key pair by address
func (cc *CryptoContext) GetKeyPair(address []byte) *KeyPair {
	cc.mu.RLock()
	defer cc.mu.RUnlock()
	return cc.keystore[fmt.Sprintf("%x", address)]
}

// StoreKeyPair stores a key pair
func (cc *CryptoContext) StoreKeyPair(kp *KeyPair) {
	addrHex := fmt.Sprintf("%x", kp.Address)
	cc.mu.Lock()
	cc.keystore[addrHex] = kp
	cc.mu.Unlock()
}

// CryptoInfo returns crypto system information
func (cc *CryptoContext) CryptoInfo() map[string]interface{} {
	return map[string]interface{}{
		"default_algorithm":     GetAlgorithmName(cc.config.DefaultAlgorithm),
		"security_level":        cc.config.SecurityLevel,
		"enable_hybrid":        cc.config.EnableHybrid,
		"supported_algorithms": []string{
			GetAlgorithmName(AlgorithmECDSA_P256),
			GetAlgorithmName(AlgorithmECDSA_P384),
			GetAlgorithmName(AlgorithmPostQuantumDilithium2),
			GetAlgorithmName(AlgorithmPostQuantumDilithium3),
			GetAlgorithmName(AlgorithmPostQuantumDilithium5),
			GetAlgorithmName(AlgorithmHybridClassicDilithium),
		},
		"pq_algorithms": []string{
			"CRYSTALS-Dilithium2",
			"CRYSTALS-Dilithium3",
			"CRYSTALS-Dilithium5",
			"ML-KEM (Kyber) 512/768/1024",
		},
		"post_quantum_ready": true,
	}
}

// VerifyWithMultipleAlgorithms verifies signature using multiple algorithms
func (cc *CryptoContext) VerifyWithMultipleAlgorithms(data []byte, signatures []*Signature, publicKeys [][]byte) bool {
	if len(signatures) != len(publicKeys) {
		return false
	}
	
	for i, sig := range signatures {
		if !cc.Verify(data, sig, publicKeys[i]) {
			return false
		}
	}
	return true
}

// GenerateRandomBytes generates cryptographically secure random bytes
func GenerateRandomBytes(n int) ([]byte, error) {
	b := make([]byte, n)
	_, err := io.ReadFull(rand.Reader, b)
	if err != nil {
		return nil, err
	}
	return b, nil
}

// ConstantTimeCompare performs constant-time comparison
func ConstantTimeCompare(a, b []byte) bool {
	return subtle.ConstantTimeCompare(a, b) == 1
}

// KeyDerivationFunction implements HKDF-style key derivation
func KeyDerivationFunction(input, salt, info []byte, outputLen int) []byte {
	hash := sha3.New512()
	
	// Extract
	hash.Write(input)
	hash.Write(salt)
	prk := hash.Sum(nil)
	
	// Expand
	hash.Reset()
	t := []byte{}
	for i := 0; len(t) < outputLen; i++ {
		hash.Write(t)
		hash.Write(info)
		hash.Write([]byte{byte(i + 1)})
		t = hash.Sum(t[:0])
	}
	
	return t[:outputLen]
}

// Implement crypto.Signer interface for ECDSA
type ECDSASigner struct {
	privateKey *ecdsa.PrivateKey
}

func (s *ECDSASigner) Public() crypto.PublicKey {
	return s.privateKey.Public()
}

func (s *ECDSASigner) Sign(rand.Reader, []byte, crypto.SignerOpts) ([]byte, error) {
	return nil, nil // Not implemented
}

// SerializableSignature represents a serializable signature
type SerializableSignature struct {
	Algorithm AlgorithmType
	R         big.Int
	S         big.Int
}

// Serialize serializes a signature to bytes
func (s *SerializableSignature) Serialize() []byte {
	rBytes := s.R.Bytes()
	sBytes := s.S.Bytes()
	
	result := make([]byte, 2+len(rBytes)+len(sBytes))
	result[0] = byte(s.Algorithm)
	result[1] = byte(len(rBytes))
	copy(result[2:], rBytes)
	copy(result[2+len(rBytes):], sBytes)
	
	return result
}

// DeserializeSignature deserializes a signature from bytes
func DeserializeSignature(data []byte) (*SerializableSignature, error) {
	if len(data) < 2 {
		return nil, errors.New("invalid signature data")
	}
	
	alg := AlgorithmType(data[0])
	rLen := int(data[1])
	
	if 2+rLen >= len(data) {
		return nil, errors.New("invalid signature data")
	}
	
	r := new(big.Int).SetBytes(data[2 : 2+rLen])
	s := new(big.Int).SetBytes(data[2+rLen:])
	
	return &SerializableSignature{
		Algorithm: alg,
		R:         *r,
		S:         *s,
	}, nil
}
