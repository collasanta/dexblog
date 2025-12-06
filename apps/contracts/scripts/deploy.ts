import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { getUsdcAddress, getUsdcDecimals } from "dex-blog-sdk";

dotenv.config();

async function main() {
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  const chainId = Number(network.chainId);
  
  // Get USDC decimals for current network (default to 6)
  const usdcDecimals = getUsdcDecimals(chainId) || 6;
  
  // Setup fee: 10 USDC (with correct decimals per chain)
  const SETUP_FEE = ethers.parseUnits("10", usdcDecimals);
  
  // Get USDC address for current network
  let usdcAddressRaw = getUsdcAddress(chainId) || "";
  if (!usdcAddressRaw) {
    throw new Error(`USDC address not configured for ${networkName} (chainId: ${chainId})`);
  }
  // Fix checksum for ethers.js (convert to lowercase first, then getAddress will fix checksum)
  const usdcAddress = ethers.getAddress(usdcAddressRaw.toLowerCase());

  console.log("Deploying BlogFactory...");
  console.log("Network:", networkName);
  console.log("Setup fee:", ethers.formatUnits(SETUP_FEE, usdcDecimals), "USDC");
  console.log("USDC decimals:", usdcDecimals);
  console.log("USDC address:", usdcAddress);

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers available. Please configure PRIVATE_KEY or DEPLOYER in .env");
  }
  const deployer = signers[0];
  console.log("Deploying with account:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  const BlogFactory = await ethers.getContractFactory("BlogFactory");
  
  // Get current nonce (pending) to check
  const nonce = await deployer.provider.getTransactionCount(deployer.address, "pending");
  console.log("Current nonce (pending):", nonce);
  
  // Estimate gas
  const deployTx = BlogFactory.getDeployTransaction(usdcAddress, SETUP_FEE);
  const gasEstimate = await ethers.provider.estimateGas(deployTx);
  const gasPrice = await ethers.provider.getFeeData();
  const estimatedCost = gasEstimate * (gasPrice.gasPrice || 0n);
  console.log("Estimated gas:", gasEstimate.toString());
  console.log("Estimated cost:", ethers.formatEther(estimatedCost), "ETH");
  
  if (balance < estimatedCost) {
    throw new Error(`Insufficient balance. Need ${ethers.formatEther(estimatedCost)} ETH but have ${ethers.formatEther(balance)} ETH`);
  }
  
  // Deploy without specifying nonce - let ethers.js handle it automatically
  console.log("\nSending deployment transaction...");
  const factory = await BlogFactory.deploy(usdcAddress, SETUP_FEE);
  console.log("Deployment transaction hash:", factory.deploymentTransaction()?.hash);

  console.log("Waiting for deployment confirmation...");
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("Contract deployed at:", factoryAddress);

  // Wait a bit for the contract to be fully indexed
  console.log("Waiting for contract to be fully indexed...");
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Try to read factoryOwner with retry logic
  let factoryOwner: string;
  try {
    factoryOwner = await factory.factoryOwner();
  } catch (error: any) {
    console.warn("Could not read factoryOwner directly, using deployer address as fallback");
    factoryOwner = deployer.address;
  }

  console.log("\n✅ BlogFactory deployed successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Contract address:", factoryAddress);
  console.log("Factory owner:", factoryOwner);
  console.log("Setup fee:", ethers.formatUnits(SETUP_FEE, usdcDecimals), "USDC");
  console.log("Payment token (USDC):", usdcAddress);
  console.log("USDC decimals:", usdcDecimals);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return {
    address: factoryAddress,
    setupFee: SETUP_FEE,
    paymentToken: usdcAddress,
    owner: factoryOwner,
  };
}

// Deploy with custom fee
async function deployWithCustomFee(setupFeeEth: string) {
  const setupFee = ethers.parseEther(setupFeeEth);

  console.log("Deploying BlogFactory with custom fee...");
  console.log("Setup fee:", setupFeeEth, "ETH");

  const BlogFactory = await ethers.getContractFactory("BlogFactory");
  const factory = await BlogFactory.deploy(setupFee);

  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();

  console.log("\n✅ BlogFactory deployed at:", factoryAddress);

  return factoryAddress;
}

// Deploy free factory (no setup fee)
async function deployFreeFactory() {
  console.log("Deploying free BlogFactory (no setup fee)...");

  const BlogFactory = await ethers.getContractFactory("BlogFactory");
  const factory = await BlogFactory.deploy(0);

  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();

  console.log("\n✅ Free BlogFactory deployed at:", factoryAddress);

  return factoryAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export { main, deployWithCustomFee, deployFreeFactory };

