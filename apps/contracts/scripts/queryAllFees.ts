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

async function queryFactoryFee(chainId: number, retries = 3) {
  const factoryAddress = getFactoryAddress(chainId);
  const usdcDecimals = getUsdcDecimals(chainId) || 6;
  const chainConfig = getChainConfig(chainId);
  const networkLabel = chainConfig?.name || `chain-${chainId}`;

  if (!factoryAddress) {
    return {
      network: networkLabel,
      factoryAddress: factoryAddress || "N/A",
      setupFee: "N/A",
      owner: "N/A",
      totalBlogs: "N/A",
      error: "Missing factory address",
    };
  }

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

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[${networkLabel}] Attempting to query (attempt ${attempt}/${retries})...`);
      
      const provider = rpc.provider;
      
      const BlogFactory = await ethers.getContractFactory("BlogFactory");
      const factory = BlogFactory.attach(factoryAddress).connect(provider);
      
      // Create a timeout wrapper
      const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error("Request timeout after 15s")), timeoutMs)
          )
        ]);
      };
      
      // Query with timeout
      const [setupFee, owner, totalBlogs] = await withTimeout(
        Promise.all([
          factory.setupFee(),
          factory.factoryOwner(),
          factory.totalBlogs(),
        ]),
        15000
      );
      
      const feeFormatted = ethers.formatUnits(setupFee, usdcDecimals);
      console.log(`[${networkLabel}] ✅ Success!`);
      return { network: networkLabel, factoryAddress, setupFee: feeFormatted, owner, totalBlogs: totalBlogs.toString(), error: null };
    } catch (error: any) {
      const errorMsg = error.message || error.toString() || "Unknown error";
      console.log(`[${networkLabel}] ❌ Attempt ${attempt} failed: ${errorMsg.substring(0, 60)}`);
      
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.log(`[${networkLabel}] Retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        // Last attempt failed
        return { 
          network: networkLabel, 
          factoryAddress, 
          setupFee: "N/A", 
          owner: "N/A", 
          totalBlogs: "N/A", 
          error: errorMsg.substring(0, 80) 
        };
      }
    }
  }
  
  // Should never reach here, but TypeScript needs it
  return { network, factoryAddress, setupFee: "N/A", owner: "N/A", totalBlogs: "N/A", error: "Max retries exceeded" };
}

async function main() {
  console.log("Querying setup fees for all deployed factories...\n");
  const chainIds = getSupportedChainIds();
  console.log(`Testing ${chainIds.length} networks...\n`);
  
  // Process sequentially to avoid overwhelming RPC endpoints
  const results = [];
  
  for (let i = 0; i < chainIds.length; i++) {
    const chainId = chainIds[i];
    const result = await queryFactoryFee(chainId);
    results.push(result);
    
    // Add a small delay between networks (except for the last one)
    if (i < chainIds.length - 1) {
      await sleep(500);
    }
  }
  
  console.log("\n" + "=".repeat(100));
  console.log(`${"Network".padEnd(20)} ${"Factory Address".padEnd(45)} ${"Setup Fee (USDC)".padEnd(20)} ${"Total Blogs".padEnd(15)} ${"Owner".padEnd(45)}`);
  console.log("=".repeat(100));
  
  let successCount = 0;
  let errorCount = 0;
  
  results.forEach((r) => {
    if (r.error) {
      errorCount++;
      console.log(`${r.network.padEnd(20)} ${r.factoryAddress.padEnd(45)} ${"ERROR".padEnd(20)} ${"".padEnd(15)} ${r.error.substring(0, 44)}`);
    } else {
      successCount++;
      console.log(`${r.network.padEnd(20)} ${r.factoryAddress.padEnd(45)} ${r.setupFee.padEnd(20)} ${r.totalBlogs.padEnd(15)} ${r.owner.substring(0, 44)}`);
    }
  });
  
  console.log("=".repeat(100));
  console.log(`\nSummary: ${successCount} successful, ${errorCount} failed`);
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
