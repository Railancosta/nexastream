/**
 * NexaStream Tokenomics - Mainnet Deployment Script
 * Deploys NST Token to Zora or Base mainnet
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Configuration
const CONFIG = {
  // Network configuration
  networks: {
    zora: {
      name: "Zora Mainnet",
      chainId: 7777777,
      rpcUrl: process.env.ZORA_RPC_URL || "https://rpc.zora.energy",
      explorer: "https://explorer.zora.energy",
      explorerApi: "https://explorer.zora.energy/api"
    },
    base: {
      name: "Base Mainnet",
      chainId: 8453,
      rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      explorer: "https://basescan.org",
      explorerApi: "https://api.basescan.org"
    }
  }
};

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║                                                           ║");
  console.log("║   🚀 NexaStream Tokenomics - Mainnet Deployment          ║");
  console.log("║                                                           ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log();

  // Get network from CLI args
  const network = process.argv[2] || "zora";
  const networkConfig = CONFIG.networks[network];

  if (!networkConfig) {
    console.error(`❌ Network "${network}" not found. Available: ${Object.keys(CONFIG.networks).join(", ")}`);
    process.exit(1);
  }

  console.log(`📡 Network: ${networkConfig.name}`);
  console.log(`🔗 RPC: ${networkConfig.rpcUrl}`);
  console.log(`🔍 Explorer: ${networkConfig.explorer}`);
  console.log();

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  console.log();

  // Check network
  const networkDetails = await ethers.provider.getNetwork();
  console.log(`🔗 Connected to Chain ID: ${networkDetails.chainId}`);
  
  if (Number(networkDetails.chainId) !== networkConfig.chainId) {
    console.warn(`⚠️  Warning: Expected Chain ID ${networkConfig.chainId}, got ${networkDetails.chainId}`);
  }
  console.log();

  // ============================================
  // DEPLOY CONTRACTS
  // ============================================
  
  const deployments = {
    network: networkConfig.name,
    chainId: networkConfig.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  // Deployer addresses (configure these before deployment)
  const addresses = {
    ecosystemFund: deployer.address,     // Replace with multisig
    rewardsPool: deployer.address,      // Replace with rewards contract
    teamWallet: deployer.address,         // Replace with team multisig
    publicSaleWallet: deployer.address,  // Replace with sale contract
    liquidityPool: deployer.address,     // Replace with DEX
    treasury: deployer.address,           // Replace with treasury multisig
    daoGovernance: deployer.address      // Replace with DAO contract
  };

  // ============================================
  // 1. DEPLOY NST TOKEN
  // ============================================
  console.log("📌 Deploying NST Token (Complete Tokenomics)...");
  
  const NSTToken = await ethers.getContractFactory("NSTTokenComplete");
  const nstToken = await NSTToken.deploy(
    addresses.ecosystemFund,
    addresses.rewardsPool,
    addresses.teamWallet,
    addresses.publicSaleWallet,
    addresses.liquidityPool,
    addresses.treasury,
    addresses.daoGovernance
  );
  
  await nstToken.waitForDeployment();
  const nstTokenAddress = await nstToken.getAddress();
  console.log(`✅ NST Token deployed to: ${nstTokenAddress}`);
  deployments.contracts.NSTToken = nstTokenAddress;

  // ============================================
  // 2. DEPLOY STAKING & REWARDS
  // ============================================
  console.log("\n📌 Deploying NST Staking & Rewards...");
  
  const NSTStaking = await ethers.getContractFactory("NSTStakingRewards");
  const nstStaking = await NSTStaking.deploy(nstTokenAddress);
  
  await nstStaking.waitForDeployment();
  const stakingAddress = await nstStaking.getAddress();
  console.log(`✅ NST Staking deployed to: ${stakingAddress}`);
  deployments.contracts.NSTStaking = stakingAddress;

  // ============================================
  // 3. CONFIGURE CONTRACTS
  // ============================================
  console.log("\n📌 Configuring contracts...");
  
  // Set staking contract in token
  try {
    await nstToken.setStakingContract(stakingAddress);
    console.log("✅ Staking contract set in token");
  } catch (e) {
    console.log("⚠️  Could not set staking contract:", e.message);
  }

  // ============================================
  // 4. VERIFY CONTRACTS
  // ============================================
  console.log("\n📌 Contract verification...");

  const verifyContracts = async () => {
    try {
      // Verify on explorer
      if (network === "zora" || network === "base") {
        console.log(`⏳ Verifying contracts on ${networkConfig.explorer}...`);
        
        // Wait a bit for explorer to index
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // Try to verify
        try {
          await hre.run("verify:verify", {
            address: nstTokenAddress,
            constructorArguments: [
              addresses.ecosystemFund,
              addresses.rewardsPool,
              addresses.teamWallet,
              addresses.publicSaleWallet,
              addresses.liquidityPool,
              addresses.treasury,
              addresses.daoGovernance
            ],
            contract: "contracts/NSTTokenComplete.sol:NSTTokenComplete"
          });
          console.log("✅ NST Token verified!");
        } catch (e) {
          console.log("⚠️  Token verification pending (manual verify needed)");
        }

        try {
          await hre.run("verify:verify", {
            address: stakingAddress,
            constructorArguments: [nstTokenAddress],
            contract: "contracts/NSTStakingRewards.sol:NSTStakingRewards"
          });
          console.log("✅ Staking contract verified!");
        } catch (e) {
          console.log("⚠️  Staking verification pending (manual verify needed)");
        }
      }
    } catch (e) {
      console.log("⚠️  Verification skipped:", e.message);
    }
  };

  // ============================================
  // 5. SAVE DEPLOYMENT INFO
  // ============================================
  
  // Save to file
  const outputPath = path.join(__dirname, `deployment-${network}-${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(deployments, null, 2));
  console.log(`\n✅ Deployment info saved to: ${outputPath}`);

  // Save latest
  const latestPath = path.join(__dirname, `deployment-${network}-latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify(deployments, null, 2));
  console.log(`✅ Latest deployment saved to: ${latestPath}`);

  // ============================================
  // 6. PRINT SUMMARY
  // ============================================
  console.log("\n╔═══════════════════════════════════════════════════════════╗");
  console.log("║                    DEPLOYMENT SUMMARY                      ║");
  console.log("╠═══════════════════════════════════════════════════════════╣");
  console.log("║                                                           ║");
  console.log(`║   Network:          ${networkConfig.name.padEnd(28)}║`);
  console.log(`║   Chain ID:         ${networkConfig.chainId.toString().padEnd(28)}║`);
  console.log("║                                                           ║");
  console.log("╠═══════════════════════════════════════════════════════════╣");
  console.log("║                   CONTRACTS DEPLOYED                      ║");
  console.log("╠═══════════════════════════════════════════════════════════╣");
  console.log("║                                                           ║");
  console.log(`║   NST Token:       ${nstTokenAddress.padEnd(28)}║`);
  console.log(`║   NST Staking:     ${stakingAddress.padEnd(28)}║`);
  console.log("║                                                           ║");
  console.log("╠═══════════════════════════════════════════════════════════╣");
  console.log("║                    TOKENOMICS                             ║");
  console.log("╠═══════════════════════════════════════════════════════════╣");
  console.log("║                                                           ║");
  console.log("║   Max Supply:      55,000,000 NST                       ║");
  console.log("║   Staking APY:     12.5%                                ║");
  console.log("║   Burn Rate:       1%                                   ║");
  console.log("║   Reward Rate:     2%                                   ║");
  console.log("║   Cashback Rate:   1%                                   ║");
  console.log("║                                                           ║");
  console.log("╠═══════════════════════════════════════════════════════════╣");
  console.log("║                   DISTRIBUTION                           ║");
  console.log("╠═══════════════════════════════════════════════════════════╣");
  console.log("║                                                           ║");
  console.log("║   Ecosystem:       50% (27,500,000 NST)                ║");
  console.log("║   Rewards Pool:    30% (16,500,000 NST)                ║");
  console.log("║   Team (Vested):   10% (5,500,000 NST)                 ║");
  console.log("║   Public Sale:     5% (2,750,000 NST)                  ║");
  console.log("║   Liquidity:       5% (2,750,000 NST)                  ║");
  console.log("║                                                           ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");

  console.log("\n🌐 View on Explorer:");
  console.log(`   Token: ${networkConfig.explorer}/address/${nstTokenAddress}`);
  console.log(`   Staking: ${networkConfig.explorer}/address/${stakingAddress}`);
  console.log();

  // Return deployment addresses for further use
  return deployments;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed!");
    console.error(error);
    process.exit(1);
  });
