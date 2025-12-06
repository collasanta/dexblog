import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import {
  getChainConfig,
  getFactoryAddress,
  getSupportedChainIds,
  getUsdcDecimals,
  getRpcUrlWithFallback,
} from "dex-blog-sdk";

dotenv.config();

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setFactoryFee(
  chainId: number,
  feeAmount: number,
  privateKey: string
) {
  const chainConfig = getChainConfig(chainId);
  const network = chainConfig?.name || `chain-${chainId}`;
  const factoryAddress = getFactoryAddress(chainId);
  const usdcDecimals = getUsdcDecimals(chainId) || 6;
  const envUrls: Record<number, string | undefined> = {
    42161: process.env.ARBITRUM_RPC_URL,
    421614: process.env.ARBITRUM_SEPOLIA_RPC_URL,
    8453: process.env.BASE_RPC_URL,
    10: process.env.OPTIMISM_RPC_URL,
    56: process.env.BSC_RPC_URL,
    137: process.env.POLYGON_RPC_URL,
    1: process.env.MAINNET_RPC_URL,
  };
  const rpc = await getRpcUrlWithFallback(chainId, {
    envRpcUrl: envUrls[chainId],
    timeoutMs: 8000,
  });

  try {
    if (!factoryAddress || !rpcUrl) {
      throw new Error("Missing factory address or RPC URL");
    }

    console.log(`\n[${network}] Connecting to ${rpc.url}...`);
    
    const provider = rpc.provider;
    const wallet = new ethers.Wallet(privateKey, provider);
    
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
  const chainIds = getSupportedChainIds().filter((id) => id !== 421614); // exclude Arbitrum Sepolia
  
  console.log(`\nNetworks to update: ${chainIds.join(", ")}\n`);
  
  const results = [];
  
  // Process sequentially to avoid nonce issues
  for (let i = 0; i < chainIds.length; i++) {
    const chainId = chainIds[i];
    const result = await setFactoryFee(chainId, feeAmount, privateKey);
    results.push(result);
    
    // Add delay between networks (except for the last one)
    if (i < chainIds.length - 1) {
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

