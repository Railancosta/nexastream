package postquantum

import "errors"

// SuiteID identifies a protocol-level cryptographic suite. Keep this value
// versioned so future migrations cannot silently change consensus semantics.
type SuiteID string

const SuiteNX_PQC_1 SuiteID = "NX-PQC-1"

// Suite describes the algorithms required by the Mainnet security profile.
// Implementations must be backed by vetted, standards-compliant primitives.
type Suite struct {
	ID              SuiteID
	Signature       string
	KeyEncapsulation string
	Hash            string
	KDF             string
	AEAD            string
}

var MainnetSuite = Suite{
	ID:               SuiteNX_PQC_1,
	Signature:        "ML-DSA-87",
	KeyEncapsulation: "ML-KEM-1024",
	Hash:             "SHA3-512",
	KDF:              "SHAKE256",
	AEAD:             "ChaCha20-Poly1305",
}

var ErrUnsupportedSuite = errors.New("unsupported cryptographic suite")

func ValidateSuite(id SuiteID) error {
	if id != SuiteNX_PQC_1 {
		return ErrUnsupportedSuite
	}
	return nil
}
