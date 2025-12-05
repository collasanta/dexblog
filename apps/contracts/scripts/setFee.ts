import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

// Factory address on Arbitrum Mainnet
const FACTORY_ADDRESS = "0x243924EEE57aa31832A957c11416AB34f5009a67";

async function main() {
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  
  console.log("Setting setup fee on BlogFactory...");
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
  
  // Check current fee
  const currentFee = await factory.setupFee();
  console.log("Current setup fee:", ethers.formatUnits(currentFee, 6), "USDC");
  
  // Verify we're the owner
  const factoryOwner = await factory.factoryOwner();
  if (factoryOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Not the factory owner! Owner is: ${factoryOwner}, but deployer is: ${deployer.address}`);
  }
  console.log("✅ Verified as factory owner");
  
  // Set new fee: 10 USDC (6 decimals)
  const newFee = ethers.parseUnits("10", 6); // 10 USDC
  console.log("\nSetting new setup fee to:", ethers.formatUnits(newFee, 6), "USDC");
  
  // Estimate gas
  const gasEstimate = await factory.setSetupFee.estimateGas(newFee);
  const gasPrice = await ethers.provider.getFeeData();
  const estimatedCost = gasEstimate * (gasPrice.gasPrice || 0n);
  console.log("Estimated gas:", gasEstimate.toString());
  console.log("Estimated cost:", ethers.formatEther(estimatedCost), "ETH");
  
  if (balance < estimatedCost) {
    throw new Error(`Insufficient balance. Need ${ethers.formatEther(estimatedCost)} ETH but have ${ethers.formatEther(balance)} ETH`);
  }
  
  // Set the fee
  console.log("\nSending transaction...");
  const tx = await factory.setSetupFee(newFee);
  console.log("Transaction hash:", tx.hash);
  
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();
  
  console.log("\n✅ Setup fee updated successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Transaction hash:", receipt.hash);
  console.log("Old fee:", ethers.formatUnits(currentFee, 6), "USDC");
  console.log("New fee:", ethers.formatUnits(newFee, 6), "USDC");
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  // Verify the fee was set
  const verifyFee = await factory.setupFee();
  if (verifyFee.toString() !== newFee.toString()) {
    throw new Error(`Fee verification failed! Expected ${newFee}, got ${verifyFee}`);
  }
  console.log("✅ Fee verified on-chain");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

