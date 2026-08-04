const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account balance:', (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy NFT Contract
  console.log('\n📌 Deploying NexaNFT...');
  const NexaNFT = await ethers.getContractFactory('NexaNFT');
  const nft = await NexaNFT.deploy(deployer.address);
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log('NexaNFT deployed to:', nftAddress);

  // Deploy Marketplace
  console.log('\n📌 Deploying NFTMarketplace...');
  const NFTMarketplace = await ethers.getContractFactory('NFTMarketplace');
  const marketplace = await NFTMarketplace.deploy(deployer.address);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log('NFTMarketplace deployed to:', marketplaceAddress);

  // Set NFT contract in marketplace
  await marketplace.setNFTContract(nftAddress);
  await marketplace.setFeeRecipient(deployer.address);
  console.log('Marketplace configured with NFT contract');

  // Deploy NEXA Token
  console.log('\n📌 Deploying NexaToken...');
  const NexaToken = await ethers.getContractFactory('NexaToken');
  const token = await NexaToken.deploy(deployer.address);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log('NexaToken deployed to:', tokenAddress);

  // Deploy Timelock Controller for DAO
  console.log('\n📌 Deploying TimelockController...');
  const TimelockController = await ethers.getContractFactory('TimelockController');
  const minDelay = 2 * 24 * 60 * 60; // 2 days
  const proposers = [deployer.address];
  const executors = [deployer.address];
  const timelock = await TimelockController.deploy(minDelay, proposers, executors, deployer.address);
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log('TimelockController deployed to:', timelockAddress);

  // Deploy DAO
  console.log('\n📌 Deploying NexaDAO...');
  const NexaDAO = await ethers.getContractFactory('NexaDAO');
  const dao = await NexaDAO.deploy(tokenAddress, timelockAddress, deployer.address);
  await dao.waitForDeployment();
  const daoAddress = await dao.getAddress();
  console.log('NexaDAO deployed to:', daoAddress);

  // Deploy Creator Verification
  console.log('\n📌 Deploying CreatorVerification...');
  const CreatorVerification = await ethers.getContractFactory('CreatorVerification');
  const verification = await CreatorVerification.deploy(deployer.address);
  await verification.waitForDeployment();
  const verificationAddress = await verification.getAddress();
  console.log('CreatorVerification deployed to:', verificationAddress);

  // Verify contracts on Celo Explorer (if mainnet)
  const network = await ethers.provider.getNetwork();
  console.log('\n📋 Network:', network.name, 'Chain ID:', network.chainId.toString());

  // Save deployment addresses
  const deployments = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    contracts: {
      NexaNFT: nftAddress,
      NFTMarketplace: marketplaceAddress,
      NexaToken: tokenAddress,
      TimelockController: timelockAddress,
      NexaDAO: daoAddress,
      CreatorVerification: verificationAddress,
    },
    timestamp: new Date().toISOString(),
  };

  console.log('\n✅ Deployment Summary:');
  console.log(JSON.stringify(deployments, null, 2));

  return deployments;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
