import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const FACTORY_ADDRESSES: Record<string, string> = {
  arbitrum: "0x243924EEE57aa31832A957c11416AB34f5009a67",
  arbitrumSepolia: "0xccb9EFF798D12D78d179c81aEC83c9E9F974013B",
  base: "0x8Ccc0Bb6AF35F9067A7110Ac50666159e399A5F3",
  optimism: "0x96e8005727eCAd421B4cdded7B08d240f522D96E",
  bsc: "0x96e8005727eCAd421B4cdded7B08d240f522D96E",
};

const USDC_DECIMALS: Record<string, number> = {
  arbitrum: 6,
  arbitrumSepolia: 6,
  base: 6,
  optimism: 6,
  bsc: 18,
};

const RPC_URLS: Record<string, string> = {
  arbitrum: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
  arbitrumSepolia: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
  base: process.env.BASE_RPC_URL || "https://mainnet.base.org",
  optimism: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
  bsc: process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org",
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setFactoryFee(
  network: string,
  factoryAddress: string,
  rpcUrl: string,
  feeAmount: number,
  privateKey: string
) {
  try {
    console.log(`\n[${network}] Connecting to ${rpcUrl}...`);
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const usdcDecimals = USDC_DECIMALS[network] || 6;
    const newFee = ethers.parseUnits(feeAmount.toString(), usdcDecimals);
    
    console.log(`[${network}] Wallet address: ${wallet.address}`);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`[${network}] Balance: ${ethers.formatEther(balance)} ETH`);
    
    // Get factory contract
    const BlogFactory = await ethers.getContractFactory("BlogFactory");
    const factory = BlogFactory.attach(factoryAddress).connect(wallet);
    
    // Check current fee
    const currentFee = await factory.setupFee();
    console.log(`[${network}] Current fee: ${ethers.formatUnits(currentFee, usdcDecimals)} USDC`);
    
    // Verify we're the owner
    const factoryOwner = await factory.factoryOwner();
    if (factoryOwner.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error(`Not the factory owner! Owner is: ${factoryOwner}, but wallet is: ${wallet.address}`);
    }
    console.log(`[${network}] ✅ Verified as factory owner`);
    
    // Check if fee is already set correctly
    if (currentFee.toString() === newFee.toString()) {
      console.log(`[${network}] ⏭️  Fee already set to ${feeAmount} USDC, skipping...`);
      return { network, success: true, skipped: true, txHash: null };
    }
    
    console.log(`[${network}] Setting fee to ${feeAmount} USDC...`);
    
    // Estimate gas
    const gasEstimate = await factory.setSetupFee.estimateGas(newFee);
    const gasPrice = await provider.getFeeData();
    const estimatedCost = gasEstimate * (gasPrice.gasPrice || 0n);
    console.log(`[${network}] Estimated gas: ${gasEstimate.toString()}`);
    console.log(`[${network}] Estimated cost: ${ethers.formatEther(estimatedCost)} ETH`);
    
    if (balance < estimatedCost) {
      throw new Error(`Insufficient balance. Need ${ethers.formatEther(estimatedCost)} ETH but have ${ethers.formatEther(balance)} ETH`);
    }
    
    // Set the fee
    console.log(`[${network}] Sending transaction...`);
    const tx = await factory.setSetupFee(newFee);
    console.log(`[${network}] Transaction hash: ${tx.hash}`);
    
    console.log(`[${network}] Waiting for confirmation...`);
    const receipt = await tx.wait();
    
    // Verify the fee was set
    const verifyFee = await factory.setupFee();
    if (verifyFee.toString() !== newFee.toString()) {
      throw new Error(`Fee verification failed! Expected ${newFee}, got ${verifyFee}`);
    }
    
    console.log(`[${network}] ✅ Fee updated successfully!`);
    console.log(`[${network}] Old fee: ${ethers.formatUnits(currentFee, usdcDecimals)} USDC`);
    console.log(`[${network}] New fee: ${ethers.formatUnits(newFee, usdcDecimals)} USDC`);
    console.log(`[${network}] Gas used: ${receipt.gasUsed.toString()}`);
    
    return { network, success: true, skipped: false, txHash: receipt.hash };
  } catch (error: any) {
    const errorMsg = error.message || error.toString() || "Unknown error";
    console.error(`[${network}] ❌ Error: ${errorMsg}`);
    return { network, success: false, skipped: false, txHash: null, error: errorMsg };
  }
}

async function main() {
  // Get fee amount from environment variable, default to 0.1
  const feeAmount = process.env.NEW_FEE ? parseFloat(process.env.NEW_FEE) : 0.1;
  
  // Get private key
  const privateKey = process.env.PRIVATE_KEY || process.env.DEPLOYER;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY or DEPLOYER environment variable is required");
  }
  
  console.log("=".repeat(100));
  console.log("Setting fees for all factories");
  console.log("=".repeat(100));
  console.log(`Target fee: ${feeAmount} USDC`);
  console.log(`Excluding: arbitrumSepolia (will remain 0)`);
  console.log("=".repeat(100));
  
  // Get networks to update (exclude arbitrumSepolia)
  const networksToUpdate = Object.keys(FACTORY_ADDRESSES).filter(
    network => network !== "arbitrumSepolia"
  );
  
  console.log(`\nNetworks to update: ${networksToUpdate.join(", ")}\n`);
  
  const results = [];
  
  // Process sequentially to avoid nonce issues
  for (let i = 0; i < networksToUpdate.length; i++) {
    const network = networksToUpdate[i];
    const factoryAddress = FACTORY_ADDRESSES[network];
    const rpcUrl = RPC_URLS[network];
    
    const result = await setFactoryFee(network, factoryAddress, rpcUrl, feeAmount, privateKey);
    results.push(result);
    
    // Add delay between networks (except for the last one)
    if (i < networksToUpdate.length - 1) {
      await sleep(2000); // 2 second delay between networks
    }
  }
  
  // Summary
  console.log("\n" + "=".repeat(100));
  console.log("SUMMARY");
  console.log("=".repeat(100));
  
  const successful = results.filter(r => r.success && !r.skipped);
  const skipped = results.filter(r => r.success && r.skipped);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}`);
  successful.forEach(r => {
    console.log(`   - ${r.network}: ${r.txHash}`);
  });
  
  if (skipped.length > 0) {
    console.log(`\n⏭️  Skipped (already set): ${skipped.length}`);
    skipped.forEach(r => {
      console.log(`   - ${r.network}`);
    });
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}`);
    failed.forEach(r => {
      console.log(`   - ${r.network}: ${r.error?.substring(0, 60)}`);
    });
  }
  
  console.log("=".repeat(100));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

