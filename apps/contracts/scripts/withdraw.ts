import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { getFactoryAddress, getUsdcDecimals } from "dex-blog-sdk";

dotenv.config();

async function main() {
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  const chainId = Number(network.chainId);
  const FACTORY_ADDRESS = getFactoryAddress(chainId);
  const usdcDecimals = getUsdcDecimals(chainId) || 6;

  if (!FACTORY_ADDRESS) {
    throw new Error(`Factory not deployed on ${networkName} (chainId: ${chainId})`);
  }
  
  console.log("Withdrawing USDC fees from BlogFactory...");
  console.log("Network:", networkName);
  console.log("Factory address:", FACTORY_ADDRESS);

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers available. Please configure PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  console.log("Using account:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  // Get factory contract
  const BlogFactory = await ethers.getContractFactory("BlogFactory");
  const factory = BlogFactory.attach(FACTORY_ADDRESS);
  
  // Get USDC address from factory
  const usdcAddress = await factory.paymentToken();
  console.log("USDC address:", usdcAddress);
  
  // Get USDC contract
  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function transfer(address, uint256) returns (bool)",
  ];
  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, deployer);
  
  // Check factory USDC balance before withdrawal
  const factoryBalanceBefore = await usdc.balanceOf(FACTORY_ADDRESS);
  const decimals = usdcDecimals || (await usdc.decimals());
  console.log("Factory USDC balance before withdrawal:", ethers.formatUnits(factoryBalanceBefore, decimals), "USDC");
  
  if (factoryBalanceBefore === 0n) {
    console.log("⚠️  No USDC to withdraw. Factory balance is 0.");
    return;
  }
  
  // Verify we're the owner
  const factoryOwner = await factory.factoryOwner();
  if (factoryOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Not the factory owner! Owner is: ${factoryOwner}, but deployer is: ${deployer.address}`);
  }
  console.log("✅ Verified as factory owner");
  
  // Check deployer USDC balance before withdrawal
  const deployerBalanceBefore = await usdc.balanceOf(deployer.address);
  console.log("Deployer USDC balance before withdrawal:", ethers.formatUnits(deployerBalanceBefore, decimals), "USDC");
  
  // Estimate gas
  const gasEstimate = await factory.withdraw.estimateGas();
  const gasPrice = await ethers.provider.getFeeData();
  const estimatedCost = gasEstimate * (gasPrice.gasPrice || 0n);
  console.log("Estimated gas:", gasEstimate.toString());
  console.log("Estimated cost:", ethers.formatEther(estimatedCost), "ETH");
  
  if (balance < estimatedCost) {
    throw new Error(`Insufficient balance. Need ${ethers.formatEther(estimatedCost)} ETH but have ${ethers.formatEther(balance)} ETH`);
  }
  
  // Get current nonce to check
  const nonce = await deployer.provider.getTransactionCount(deployer.address, "pending");
  console.log("Current nonce (pending):", nonce);
  
  // Withdraw (let ethers.js handle nonce automatically)
  console.log("\nSending withdrawal transaction...");
  const tx = await factory.withdraw();
  console.log("Transaction hash:", tx.hash);
  
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();
  
  // Check balances after withdrawal
  const factoryBalanceAfter = await usdc.balanceOf(FACTORY_ADDRESS);
  const deployerBalanceAfter = await usdc.balanceOf(deployer.address);
  
  console.log("\n✅ Withdrawal successful!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Transaction hash:", receipt.hash);
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("\nBalances:");
  console.log("  Factory USDC before:", ethers.formatUnits(factoryBalanceBefore, decimals), "USDC");
  console.log("  Factory USDC after:", ethers.formatUnits(factoryBalanceAfter, decimals), "USDC");
  console.log("  Deployer USDC before:", ethers.formatUnits(deployerBalanceBefore, decimals), "USDC");
  console.log("  Deployer USDC after:", ethers.formatUnits(deployerBalanceAfter, decimals), "USDC");
  console.log("  Withdrawn:", ethers.formatUnits(factoryBalanceBefore - factoryBalanceAfter, decimals), "USDC");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  // Verify withdrawal
  if (factoryBalanceAfter !== 0n) {
    throw new Error(`Factory balance should be 0 after withdrawal, but got ${factoryBalanceAfter}`);
  }
  console.log("✅ Withdrawal verified - factory balance is now 0");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

