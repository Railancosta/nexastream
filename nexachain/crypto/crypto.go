package crypto

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"

	"golang.org/x/crypto/ripemd160"
)

// GenerateKeyPair generates a new ECDSA key pair
func GenerateKeyPair() (*ecdsa.PrivateKey, error) {
	return ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
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

// Sign signs data with a private key
func Sign(data []byte, pk *ecdsa.PrivateKey) ([]byte, error) {
	return ecdsa.SignASN1(rand.Reader, pk, data)
}

// Verify verifies a signature
func Verify(data []byte, signature []byte, pub *ecdsa.PublicKey) bool {
	return ecdsa.VerifyASN1(pub, data, signature)
}
