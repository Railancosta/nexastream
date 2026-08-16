/**
 * NexaStream Web3 Service Tests
 */

const {
  Web3Service,
  Wallet,
  Transaction,
  NFT,
  Proposal,
  TX_TYPE,
  TX_STATUS,
  MAX_SUPPLY
} = require('../src/services/web3');

describe('Web3Service', () => {
  let service;

  beforeEach(() => {
    service = new Web3Service({
      chainId: 1337,
      enableStaking: true,
      enableNFT: true,
      enableDAO: true
    });
  });

  describe('Wallet', () => {
    test('should create a new wallet', () => {
      const wallet = service.createWallet('user123');

      expect(wallet).toBeInstanceOf(Wallet);
      expect(wallet.address).toBeDefined();
      expect(wallet.address).toMatch(/^0x/);
      expect(wallet.type).toBe('local');
    });

    test('should get wallet by address', () => {
      const created = service.createWallet('user123');
      const retrieved = service.getWallet(created.address);

      expect(retrieved).toBeDefined();
      expect(retrieved.address).toBe(created.address);
    });

    test('should import wallet from private key', () => {
      const privateKey = '0x' + 'a'.repeat(64);
      const wallet = service.importWallet(privateKey);

      expect(wallet).toBeInstanceOf(Wallet);
      expect(wallet.address).toBeDefined();
      expect(wallet.type).toBe('imported');
    });
  });

  describe('Balance & Transfer', () => {
    test('should get balance', () => {
      const wallet = service.createWallet('user123');
      const balance = service.getBalance(wallet.address);

      expect(balance).toBeDefined();
      expect(balance.symbol).toBe('NST');
      expect(balance.decimals).toBe(18);
      expect(balance.balance).toBeDefined();
    });

    test('should transfer NST', async () => {
      const from = service.createWallet('user1');
      const to = service.createWallet('user2');

      const initialBalance = service.getBalance(from.address);
      const transferAmount = '1000000000000000000'; // 1 NST

      const tx = await service.transfer(from.address, to.address, transferAmount);

      expect(tx).toBeDefined();
      expect(tx.hash).toBeDefined();
      expect(tx.type).toBe(TX_TYPE.TRANSFER);
      expect(tx.status).toBe(TX_STATUS.CONFIRMED);

      const newBalance = service.getBalance(from.address);
      expect(BigInt(newBalance.balance)).toBeLessThan(BigInt(initialBalance.balance));
    });

    test('should reject transfer with insufficient balance', async () => {
      const from = service.createWallet('user1');
      const to = service.createWallet('user2');

      const balance = service.getBalance(from.address);
      const excessiveAmount = BigInt(balance.balance) + BigInt('1000000000000000000');

      await expect(
        service.transfer(from.address, to.address, excessiveAmount.toString())
      ).rejects.toThrow('Insufficient balance');
    });

    test('should format units correctly', () => {
      const amount = 1234567890000000000n;
      const formatted = service.formatUnits(amount, 18);

      expect(formatted).toBe('1.23456789');
    });

    test('should parse units correctly', () => {
      const parsed = service.parseUnits('1.5', 18);

      expect(parsed).toBe(1500000000000000000n);
    });
  });

  describe('Staking', () => {
    test('should stake NST', async () => {
      const wallet = service.createWallet('user123');
      const stakeAmount = '1000000000000000000'; // 1 NST

      const result = await service.stake(wallet.address, stakeAmount, 30);

      expect(result).toBeDefined();
      expect(result.stakeInfo).toBeDefined();
      expect(result.stakeInfo.amount).toBe(stakeAmount);
      expect(result.stakeInfo.duration).toBe(30 * 24 * 60 * 60 * 1000);
    });

    test('should reject stake with insufficient balance', async () => {
      const wallet = service.createWallet('user123');
      const balance = service.getBalance(wallet.address);

      await expect(
        service.stake(wallet.address, (BigInt(balance.balance) + 1000n).toString())
      ).rejects.toThrow('Insufficient balance');
    });

    test('should get stake info', async () => {
      const wallet = service.createWallet('user123');
      await service.stake(wallet.address, '1000000000000000000', 30);

      const stakeInfo = service.getStakeInfo(wallet.address);

      expect(stakeInfo).toBeDefined();
      expect(stakeInfo.totalStaked).toBeDefined();
      expect(stakeInfo.activeStakes).toBe(1);
    });

    test('should unstake NST', async () => {
      const wallet = service.createWallet('user123');
      const stakeAmount = '1000000000000000000';
      
      await service.stake(wallet.address, stakeAmount, 0); // 0 duration for immediate unstake
      
      const tx = await service.unstake(wallet.address, stakeAmount);

      expect(tx).toBeDefined();
      expect(tx.type).toBe(TX_TYPE.UNSTAKE);
    });
  });

  describe('NFT', () => {
    test('should mint NFT', async () => {
      const wallet = service.createWallet('creator');
      
      const nft = await service.mintNFT(wallet.address, {
        name: 'Test NFT',
        description: 'A test NFT',
        image: 'https://example.com/image.jpg',
        royalty: 2.5
      });

      expect(nft).toBeDefined();
      expect(nft.tokenId).toBeDefined();
      expect(nft.name).toBe('Test NFT');
      expect(nft.owner).toBe(wallet.address);
      expect(nft.royalty).toBe(2.5);
    });

    test('should get NFT by token ID', async () => {
      const wallet = service.createWallet('creator');
      const minted = await service.mintNFT(wallet.address, {
        name: 'Test NFT',
        image: 'https://example.com/image.jpg'
      });

      const retrieved = service.getNFT(minted.tokenId);

      expect(retrieved).toBeDefined();
      expect(retrieved.tokenId).toBe(minted.tokenId);
    });

    test('should get NFTs by owner', async () => {
      const wallet = service.createWallet('creator');
      
      await service.mintNFT(wallet.address, { name: 'NFT 1', image: 'img1.jpg' });
      await service.mintNFT(wallet.address, { name: 'NFT 2', image: 'img2.jpg' });

      const nfts = service.getNFTsByOwner(wallet.address);

      expect(nfts.nfts.length).toBe(2);
    });

    test('should transfer NFT', async () => {
      const creator = service.createWallet('creator');
      const buyer = service.createWallet('buyer');
      
      const nft = await service.mintNFT(creator.address, {
        name: 'Test NFT',
        image: 'https://example.com/image.jpg'
      });

      const tx = await service.transferNFT(creator.address, buyer.address, nft.tokenId);

      expect(tx).toBeDefined();
      expect(tx.type).toBe(TX_TYPE.NFT_TRANSFER);

      const updatedNFT = service.getNFT(nft.tokenId);
      expect(updatedNFT.owner).toBe(buyer.address);
    });

    test('should list NFT for sale', async () => {
      const wallet = service.createWallet('seller');
      const nft = await service.mintNFT(wallet.address, {
        name: 'Test NFT',
        image: 'https://example.com/image.jpg'
      });

      const listed = await service.listNFTForSale(
        nft.tokenId,
        '1000000000000000000',
        wallet.address
      );

      expect(listed.auction).toBeDefined();
      expect(listed.auction.active).toBe(true);
      expect(listed.auction.price).toBe('1000000000000000000');
    });

    test('should buy NFT', async () => {
      const seller = service.createWallet('seller');
      const buyer = service.createWallet('buyer');
      const price = '1000000000000000000';
      
      const nft = await service.mintNFT(seller.address, {
        name: 'Test NFT',
        image: 'https://example.com/image.jpg'
      });
      
      await service.listNFTForSale(nft.tokenId, price, seller.address);

      const result = await service.buyNFT(nft.tokenId, buyer.address, price);

      expect(result).toBeDefined();
      expect(result.owner).toBe(buyer.address);
      expect(result.lastSale).toBeDefined();
      expect(result.lastSale.price).toBe(price);
    });
  });

  describe('DAO Governance', () => {
    test('should create proposal', async () => {
      const wallet = service.createWallet('proposer');
      
      const proposal = await service.createProposal(wallet.address, {
        title: 'Test Proposal',
        description: 'A test proposal description',
        type: 'text'
      });

      expect(proposal).toBeDefined();
      expect(proposal.id).toBeDefined();
      expect(proposal.title).toBe('Test Proposal');
      expect(proposal.status).toBe('active');
      expect(proposal.author).toBe(wallet.address);
    });

    test('should reject proposal with insufficient deposit', async () => {
      const wallet = service.createWallet('poor_user');
      // Set very low balance
      service.balances.set(wallet.address.toLowerCase(), 100n);

      await expect(
        service.createProposal(wallet.address, {
          title: 'Test',
          description: 'Test'
        })
      ).rejects.toThrow('Insufficient deposit');
    });

    test('should get proposals', async () => {
      const wallet = service.createWallet('proposer');
      
      await service.createProposal(wallet.address, {
        title: 'Proposal 1',
        description: 'Description 1',
        type: 'text'
      });
      await service.createProposal(wallet.address, {
        title: 'Proposal 2',
        description: 'Description 2',
        type: 'treasury'
      });

      const result = service.getProposals({ limit: 10 });

      expect(result.proposals.length).toBe(2);
    });

    test('should cast vote', async () => {
      const proposer = service.createWallet('proposer');
      const voter = service.createWallet('voter');
      
      const proposal = await service.createProposal(proposer.address, {
        title: 'Test Proposal',
        description: 'Test',
        type: 'text'
      });

      const result = await service.castVote(voter.address, proposal.id, 'for', '1000000000000000000');

      expect(result).toBeDefined();
      expect(result.votes.for).toBeDefined();
    });

    test('should check proposal passed status', () => {
      const proposal = new Proposal({
        title: 'Test',
        description: 'Test',
        author: '0x123',
        votesFor: BigInt('1000000000000000000'),
        votesAgainst: BigInt('500000000000000000')
      });

      // Manually set endTime to past
      proposal.endTime = new Date(Date.now() - 1000);

      expect(proposal.isPassed()).toBe(true);
    });
  });

  describe('Network Info', () => {
    test('should get network info', () => {
      const info = service.getNetworkInfo();

      expect(info).toBeDefined();
      expect(info.chainId).toBe(1337);
      expect(info.nativeCurrency.symbol).toBe('NST');
      expect(info.maxSupply).toBe(MAX_SUPPLY.toString());
    });

    test('should calculate locked supply', () => {
      const wallet = service.createWallet('user');
      service.stake(wallet.address, '1000000000000000000', 30);

      const locked = service.getLockedSupply();

      expect(locked).toBeGreaterThan(0n);
    });
  });

  describe('Transaction History', () => {
    test('should get transaction history', async () => {
      const from = service.createWallet('user1');
      const to = service.createWallet('user2');

      await service.transfer(from.address, to.address, '100000000000000000');

      const history = service.getTransactionHistory(from.address);

      expect(history.transactions.length).toBeGreaterThan(0);
    });

    test('should get transaction by hash', async () => {
      const from = service.createWallet('user1');
      const to = service.createWallet('user2');

      const tx = await service.transfer(from.address, to.address, '100000000000000000');

      const retrieved = service.getTransaction(tx.hash);

      expect(retrieved).toBeDefined();
      expect(retrieved.hash).toBe(tx.hash);
    });
  });

  describe('Health Check', () => {
    test('should return healthy status', () => {
      const health = service.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.chainId).toBe(1337);
      expect(health.connected).toBe(true);
    });
  });
});

describe('Transaction Class', () => {
  test('should generate hash', () => {
    const tx = new Transaction({
      from: '0x123',
      to: '0x456',
      value: '1000'
    });

    expect(tx.hash).toBeDefined();
    expect(tx.hash).toMatch(/^0x/);
  });

  test('should serialize to JSON', () => {
    const tx = new Transaction({
      from: '0x123',
      to: '0x456',
      value: '1000'
    });

    const json = tx.toJSON();

    expect(json.hash).toBe(tx.hash);
    expect(json.from).toBe('0x123');
    expect(json.to).toBe('0x456');
  });
});

describe('NFT Class', () => {
  test('should create NFT', () => {
    const nft = new NFT({
      owner: '0x123',
      name: 'Test NFT',
      image: 'https://example.com/image.jpg'
    });

    expect(nft.tokenId).toBeDefined();
    expect(nft.name).toBe('Test NFT');
    expect(nft.owner).toBe('0x123');
  });
});

describe('Proposal Class', () => {
  test('should create proposal', () => {
    const proposal = new Proposal({
      title: 'Test Proposal',
      description: 'Description',
      author: '0x123'
    });

    expect(proposal.id).toBeDefined();
    expect(proposal.title).toBe('Test Proposal');
    expect(proposal.status).toBe('active');
  });

  test('should check if proposal can execute', () => {
    const proposal = new Proposal({
      title: 'Test',
      description: 'Test',
      author: '0x123',
      votesFor: BigInt('100000000000000000000'),
      votesAgainst: BigInt('10000000000000000000')
    });

    // Set end time and execution delay to past
    proposal.endTime = new Date(Date.now() - 200000);
    
    expect(proposal.canExecute()).toBe(true);
  });
});
