package postquantum

import "testing"

func TestMainnetSuiteIdentity(t *testing.T) {
	if err := ValidateSuite(SuiteNX_PQC_1); err != nil {
		t.Fatalf("mainnet suite must validate: %v", err)
	}
	if MainnetSuite.Signature != "ML-DSA-87" {
		t.Fatalf("unexpected signature suite: %s", MainnetSuite.Signature)
	}
	if MainnetSuite.KeyEncapsulation != "ML-KEM-1024" {
		t.Fatalf("unexpected KEM suite: %s", MainnetSuite.KeyEncapsulation)
	}
}

func TestUnknownSuiteFailsClosed(t *testing.T) {
	if err := ValidateSuite(SuiteID("NX-UNKNOWN")); err != ErrUnsupportedSuite {
		t.Fatalf("unknown suites must fail closed, got %v", err)
	}
}
