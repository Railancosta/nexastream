package wallet

import (
	"crypto/ecdsa"
	"fmt"
	"sync"

	"github.com/nexastream/nexachain/core"
	"github.com/nexastream/nexachain/crypto"
)

type Wallet struct {
	Address    core.Address
	PrivateKey *ecdsa.PrivateKey
	PublicKey  *ecdsa.PublicKey
}

type WalletManager struct {
	chain   *core.Blockchain
	wallets map[core.Address]*Wallet
	mu      sync.RWMutex
}

func NewWalletManager(chain *core.Blockchain) *WalletManager {
	return &WalletManager{
		chain:   chain,
		wallets: make(map[core.Address]*Wallet),
	}
}

func (wm *WalletManager) CreateWallet() (*Wallet, error) {
	pk, err := crypto.GenerateKeyPair()
	if err != nil {
		return nil, fmt.Errorf("failed to generate key pair: %v", err)
	}

	wallet := &Wallet{
		Address:    core.Address{},
		PrivateKey: pk,
		PublicKey:  &pk.PublicKey,
	}

	// Derive address from public key
	addr := crypto.PublicKeyToAddress(&pk.PublicKey)
	copy(wallet.Address[:], addr)

	wm.mu.Lock()
	wm.wallets[wallet.Address] = wallet
	wm.mu.Unlock()

	return wallet, nil
}

func (wm *WalletManager) GetWallet(addr core.Address) *Wallet {
	wm.mu.RLock()
	defer wm.mu.RUnlock()
	return wm.wallets[addr]
}

func (wm *WalletManager) ImportWallet(privateKeyHex string) (*Wallet, error) {
	privateKeyBytes, err := crypto.HexToAddress(privateKeyHex)
	if err != nil {
		return nil, fmt.Errorf("invalid private key hex: %v", err)
	}

	pk, err := crypto.BytesToPrivateKey(privateKeyBytes)
	if err != nil {
		return nil, fmt.Errorf("invalid private key: %v", err)
	}

	wallet := &Wallet{
		Address:    core.Address{},
		PrivateKey: pk,
		PublicKey:  &pk.PublicKey,
	}

	addr := crypto.PublicKeyToAddress(&pk.PublicKey)
	copy(wallet.Address[:], addr)

	wm.mu.Lock()
	wm.wallets[wallet.Address] = wallet
	wm.mu.Unlock()

	return wallet, nil
}

func (wm *WalletManager) CreateTransaction(to core.Address, value uint64) (*core.Transaction, error) {
	wm.mu.RLock()
	var wallet *Wallet
	for _, w := range wm.wallets {
		wallet = w
		break
	}
	wm.mu.RUnlock()

	if wallet == nil {
		return nil, fmt.Errorf("no wallet available")
	}

	return core.CreateTransaction(
		core.TxTypeTransfer,
		wallet.Address,
		to,
		value,
		nil,
	), nil
}

func (wm *WalletManager) SignTransaction(tx *core.Transaction) error {
	wm.mu.RLock()
	wallet := wm.wallets[tx.From]
	wm.mu.RUnlock()

	if wallet == nil {
		return fmt.Errorf("wallet not found for address: %x", tx.From)
	}

	// Sign the transaction hash
	sig, err := crypto.Sign(tx.Hash[:], wallet.PrivateKey)
	if err != nil {
		return fmt.Errorf("failed to sign transaction: %v", err)
	}

	tx.Signature = sig
	return nil
}

func (wm *WalletManager) GetBalance(addr core.Address) uint64 {
	return wm.chain.GetBalance(addr)
}

func (wm *WalletManager) GetAllWallets() []*Wallet {
	wm.mu.RLock()
	defer wm.mu.RUnlock()

	wallets := make([]*Wallet, 0, len(wm.wallets))
	for _, w := range wm.wallets {
		wallets = append(wallets, w)
	}
	return wallets
}

func (wm *WalletManager) GetWalletCount() int {
	wm.mu.RLock()
	defer wm.mu.RUnlock()
	return len(wm.wallets)
}
