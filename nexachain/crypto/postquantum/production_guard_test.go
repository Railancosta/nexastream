package postquantum

import "testing"

// Mainnet must expose only the versioned standardized suite. Legacy algorithm
// identifiers remain available for migration tooling but are not acceptable as
// the production suite.
func TestMainnetDoesNotUseLegacyPQC(t *testing.T) {
	if MainnetSuite.ID != SuiteNX_PQC_1 {
		t.Fatalf("unexpected mainnet suite: %s", MainnetSuite.ID)
	}
	if MainnetSuite.Signature == "Dilithium2" || MainnetSuite.Signature == "Dilithium3" || MainnetSuite.Signature == "Dilithium5" {
		t.Fatal("legacy Dilithium profile selected for Mainnet")
	}
	if MainnetSuite.KeyEncapsulation == "Kyber512" || MainnetSuite.KeyEncapsulation == "Kyber768" || MainnetSuite.KeyEncapsulation == "Kyber1024" {
		t.Fatal("legacy Kyber profile selected for Mainnet")
	}
}
