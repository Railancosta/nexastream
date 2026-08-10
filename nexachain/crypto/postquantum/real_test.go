package postquantum

import (
	"bytes"
	"testing"
)

func TestMLDSA87RoundTrip(t *testing.T) {
	kp, err := GenerateMLDSA87()
	if err != nil {
		t.Fatal(err)
	}
	msg := []byte("nexastream-mainnet-transaction")
	ctx := []byte("NX-PQC-1/transaction")
	sig, err := SignMLDSA87(kp.PrivateKey, msg, ctx)
	if err != nil {
		t.Fatal(err)
	}
	if !VerifyMLDSA87(kp.PublicKey, msg, ctx, sig) {
		t.Fatal("valid ML-DSA-87 signature did not verify")
	}
	if VerifyMLDSA87(kp.PublicKey, []byte("tampered"), ctx, sig) {
		t.Fatal("tampered message unexpectedly verified")
	}
	if VerifyMLDSA87(kp.PublicKey, msg, []byte("wrong-context"), sig) {
		t.Fatal("wrong signing context unexpectedly verified")
	}
}

func TestMLKEM1024RoundTrip(t *testing.T) {
	kp, err := GenerateMLKEM1024()
	if err != nil {
		t.Fatal(err)
	}
	ct, senderSecret, err := EncapsulateMLKEM1024(kp.PublicKey)
	if err != nil {
		t.Fatal(err)
	}
	receiverSecret, err := DecapsulateMLKEM1024(kp.PrivateKey, ct)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(senderSecret, receiverSecret) {
		t.Fatal("ML-KEM-1024 shared secrets differ")
	}
	ct[0] ^= 1
	tamperedSecret, err := DecapsulateMLKEM1024(kp.PrivateKey, ct)
	if err != nil {
		return
	}
	if bytes.Equal(senderSecret, tamperedSecret) {
		t.Fatal("tampered ML-KEM-1024 ciphertext produced the original shared secret")
	}
}
