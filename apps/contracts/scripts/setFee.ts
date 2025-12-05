import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

// Factory addresses per chain
const FACTORY_ADDRESSES: Record<string, string> = {
  arbitrum: "0x243924EEE57aa31832A957c11416AB34f5009a67",
  arbitrumSepolia: "0xccb9EFF798D12D78d179c81aEC83c9E9F974013B",
  base: "0x8Ccc0Bb6AF35F9067A7110Ac50666159e399A5F3",
  optimism: "0x96e8005727eCAd421B4cdded7B08d240f522D96E",
  bsc: "0x96e8005727eCAd421B4cdded7B08d240f522D96E",
};

// USDC decimals per chain
const USDC_DECIMALS: Record<string, number> = {
  arbitrum: 6,
  arbitrumSepolia: 6,
  base: 6,
  optimism: 6,
  bsc: 18,
};

async function main() {
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  const chainId = Number(network.chainId);
  
  // Get factory address for current network
  const factoryAddressRaw = FACTORY_ADDRESSES[networkName];
  if (!factoryAddressRaw) {
    throw new Error(`Factory not deployed on ${networkName} (chainId: ${chainId}). Available networks: ${Object.keys(FACTORY_ADDRESSES).join(", ")}`);
  }
  const FACTORY_ADDRESS = ethers.getAddress(factoryAddressRaw.toLowerCase());
  
  // Get USDC decimals for current network (default to 6)
  const usdcDecimals = USDC_DECIMALS[networkName] || 6;
  
  // Get new fee from environment variable or default to 0 (free)
  const newFeeAmount = process.env.NEW_FEE ? parseFloat(process.env.NEW_FEE) : 0;
  const newFee = ethers.parseUnits(newFeeAmount.toString(), usdcDecimals);
  
  console.log("Setting setup fee on BlogFactory...");
  console.log("Network:", networkName, `(chainId: ${chainId})`);
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
  console.log("Current setup fee:", ethers.formatUnits(currentFee, usdcDecimals), "USDC");
  
  // Verify we're the owner
  const factoryOwner = await factory.factoryOwner();
  if (factoryOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Not the factory owner! Owner is: ${factoryOwner}, but deployer is: ${deployer.address}`);
  }
  console.log("✅ Verified as factory owner");
  
  console.log("\nSetting new setup fee to:", ethers.formatUnits(newFee, usdcDecimals), "USDC");
  
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
  console.log("Old fee:", ethers.formatUnits(currentFee, usdcDecimals), "USDC");
  console.log("New fee:", ethers.formatUnits(newFee, usdcDecimals), "USDC");
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

