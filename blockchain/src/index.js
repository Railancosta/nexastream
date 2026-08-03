/**
 * NexaChain Main Entry Point
 * Hybrid PoW/PoS Blockchain for NexaStream
 */

const NexaChain = require('./blockchain');
const Wallet = require('./wallet');
const Transaction = require('./transaction');

// Initialize blockchain
const nexachain = new NexaChain();

// Platform wallets
const platformWallet = new Wallet();
const rewardsWallet = new Wallet();
const stakingWallet = new Wallet();

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗           ║
║   ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝           ║
║   ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗           ║
║   ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║           ║
║   ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║           ║
║   ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝           ║
║                                                           ║
║   Decentralized Video Platform - Blockchain Engine         ║
║   Powered by Hybrid PoW/PoS Consensus                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

console.log('🔗 Blockchain Configuration:');
console.log(`   PoW Ratio: ${nexachain.POW_RATIO * 100}%`);
console.log(`   PoS Ratio: ${nexachain.POS_RATIO * 100}%`);
console.log(`   PoW Reward: ${nexachain.POW_REWARD} NEXA`);
console.log(`   PoS Reward: ${nexachain.POS_REWARD} NEXA`);
console.log(`   Min Stake: ${nexachain.MIN_STAKE} NEXA`);

console.log('\n👛 Platform Wallets:');
console.log(`   Platform Owner: ${platformWallet.address}`);
console.log(`   Rewards Pool: ${rewardsWallet.address}`);
console.log(`   Staking Pool: ${stakingWallet.address}`);

// Create demo wallets
console.log('\n📱 Creating Demo Wallets...');
const alice = new Wallet();
const bob = new Wallet();
const creator = new Wallet();

console.log(`   Alice: ${alice.address}`);
console.log(`   Bob: ${bob.address}`);
console.log(`   Creator: ${creator.address}`);

// Register validators
console.log('\n🔐 Registering Validators...');
nexachain.registerValidator(alice.address, 5000);
nexachain.registerValidator(bob.address, 10000);
nexachain.registerValidator(creator.address, 20000);

// Mining demonstration
console.log('\n⛏️ Mining Blocks (PoW)...');
nexachain.mineBlock(alice.address, 4);

nexachain.addTransaction(platformWallet.createTransaction(
    rewardsWallet.address,
    1000,
    { type: 'REWARD_DEPOSIT' }
));

nexachain.addTransaction(rewardsWallet.createCreatorPayout(
    creator.address,
    500,
    'video_001',
    platformWallet.address
)[0]);

nexachain.mineBlock(bob.address, 4);

// PoS block
console.log('\n🏦 Creating PoS Block...');
const producer = nexachain.selectBlockProducer();
if (producer.type === 'POS' && producer.producer) {
    const posBlock = nexachain.createBlock(producer.producer);
    const signature = require('./crypto').sign(posBlock.getSigningData(), 
        producer.producer === alice.address ? alice.privateKey :
        producer.producer === bob.address ? bob.privateKey : creator.privateKey
    );
    
    try {
        nexachain.validateAndAddBlock(posBlock, producer.producer, signature);
        console.log('✅ PoS block validated and added!');
    } catch (e) {
        console.log('PoS validation:', e.message);
    }
}

// Create more blocks
console.log('\n⛏️ Mining more blocks...');
for (let i = 0; i < 3; i++) {
    nexachain.addTransaction(rewardsWallet.createTransaction(
        creator.address,
        100 + Math.random() * 50,
        { type: 'VIDEO_REWARD', videoId: `video_${i + 10}` }
    ));
    nexachain.mineBlock(creator.address, 4);
}

// Display results
console.log('\n📊 Blockchain Stats:');
const stats = nexachain.getStats();
console.log(`   Total Blocks: ${stats.totalBlocks}`);
console.log(`   PoW Blocks: ${stats.powBlocks}`);
console.log(`   PoS Blocks: ${stats.posBlocks}`);
console.log(`   Total Transactions: ${stats.totalTransactions}`);
console.log(`   Total Volume: ${stats.totalVolume.toFixed(2)} NEXA`);
console.log(`   Validators: ${stats.validatorCount}`);

console.log('\n💰 Balances:');
console.log(`   Alice: ${nexachain.getBalance(alice.address).toFixed(2)} NEXA`);
console.log(`   Bob: ${nexachain.getBalance(bob.address).toFixed(2)} NEXA`);
console.log(`   Creator: ${nexachain.getBalance(creator.address).toFixed(2)} NEXA`);
console.log(`   Platform: ${nexachain.getBalance(platformWallet.address).toFixed(2)} NEXA`);
console.log(`   Rewards Pool: ${nexachain.getBalance(rewardsWallet.address).toFixed(2)} NEXA`);

console.log('\n✅ Chain Valid:', nexachain.isChainValid());

console.log('\n📜 Recent Transactions (Creator):');
const creatorTxs = nexachain.getTransactions(creator.address).slice(-5);
creatorTxs.forEach((tx, i) => {
    console.log(`   ${i + 1}. ${tx.from.substring(0, 12)}... → ${tx.to.substring(0, 12)}... ${tx.amount.toFixed(2)} NEXA`);
});

console.log('\n' + '═'.repeat(60));
console.log('NexaChain is running! ⛓️');
console.log('═'.repeat(60) + '\n');

// Export for use in other modules
module.exports = {
    nexachain,
    Wallet,
    Transaction,
    platformWallet,
    rewardsWallet,
    stakingWallet
};
