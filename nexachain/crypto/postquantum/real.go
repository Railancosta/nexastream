package postquantum

import (
	"crypto/rand"
	"errors"

	"github.com/cloudflare/circl/kem/mlkem/mlkem1024"
	"github.com/cloudflare/circl/sign/mldsa/mldsa87"
)

// MLDSA87KeyPair contains packed ML-DSA-87 key material.
type MLDSA87KeyPair struct {
	PublicKey  []byte
	PrivateKey []byte
}

// GenerateMLDSA87 creates a real NIST FIPS 204 ML-DSA-87 key pair using CIRCL.
func GenerateMLDSA87() (*MLDSA87KeyPair, error) {
	pk, sk, err := mldsa87.GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}
	return &MLDSA87KeyPair{
		PublicKey:  append([]byte(nil), pk.Bytes()...),
		PrivateKey: append([]byte(nil), sk.Bytes()...),
	}, nil
}

// SignMLDSA87 signs msg using ML-DSA-87 and an explicit protocol context.
func SignMLDSA87(privateKey, msg, context []byte) ([]byte, error) {
	if len(privateKey) != mldsa87.PrivateKeySize {
		return nil, errors.New("invalid ML-DSA-87 private key length")
	}
	if len(context) > 255 {
		return nil, errors.New("ML-DSA context exceeds 255 bytes")
	}
	var sk mldsa87.PrivateKey
	sk.Unpack(privateKey)
	sig := make([]byte, mldsa87.SignatureSize)
	if err := mldsa87.SignTo(&sk, msg, context, true, sig); err != nil {
		return nil, err
	}
	return sig, nil
}

// VerifyMLDSA87 verifies an ML-DSA-87 signature under an explicit context.
func VerifyMLDSA87(publicKey, msg, context, signature []byte) bool {
	if len(publicKey) != mldsa87.PublicKeySize || len(signature) != mldsa87.SignatureSize || len(context) > 255 {
		return false
	}
	var pk mldsa87.PublicKey
	pk.Unpack(publicKey)
	return mldsa87.Verify(&pk, msg, context, signature)
}

// MLKEM1024KeyPair contains packed ML-KEM-1024 key material.
type MLKEM1024KeyPair struct {
	PublicKey  []byte
	PrivateKey []byte
}

// GenerateMLKEM1024 creates a real NIST FIPS 203 ML-KEM-1024 key pair.
func GenerateMLKEM1024() (*MLKEM1024KeyPair, error) {
	pk, sk, err := mlkem1024.GenerateKeyPair(rand.Reader)
	if err != nil {
		return nil, err
	}
	pub, err := pk.MarshalBinary()
	if err != nil {
		return nil, err
	}
	priv, err := sk.MarshalBinary()
	if err != nil {
		return nil, err
	}
	return &MLKEM1024KeyPair{PublicKey: pub, PrivateKey: priv}, nil
}

// EncapsulateMLKEM1024 establishes a shared secret for the recipient public key.
func EncapsulateMLKEM1024(publicKey []byte) (ciphertext, sharedSecret []byte, err error) {
	if len(publicKey) != mlkem1024.PublicKeySize {
		return nil, nil, errors.New("invalid ML-KEM-1024 public key length")
	}
	var pk mlkem1024.PublicKey
	if err := pk.UnmarshalBinary(publicKey); err != nil {
		return nil, nil, err
	}
	ct := make([]byte, mlkem1024.CiphertextSize)
	ss := make([]byte, mlkem1024.SharedKeySize)
	seed := make([]byte, mlkem1024.EncapsulationSeedSize)
	if _, err := rand.Read(seed); err != nil {
		return nil, nil, err
	}
	pk.EncapsulateTo(ct, ss, seed)
	return ct, ss, nil
}

// DecapsulateMLKEM1024 recovers the shared secret from a valid ciphertext.
func DecapsulateMLKEM1024(privateKey, ciphertext []byte) ([]byte, error) {
	if len(privateKey) != mlkem1024.PrivateKeySize || len(ciphertext) != mlkem1024.CiphertextSize {
		return nil, errors.New("invalid ML-KEM-1024 key or ciphertext length")
	}
	var sk mlkem1024.PrivateKey
	if err := sk.UnmarshalBinary(privateKey); err != nil {
		return nil, err
	}
	ss := make([]byte, mlkem1024.SharedKeySize)
	sk.DecapsulateTo(ss, ciphertext)
	return ss, nil
}
