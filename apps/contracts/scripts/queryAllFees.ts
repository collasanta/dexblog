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
  arbitrum: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc", // Official Arbitrum RPC
  arbitrumSepolia: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
  base: process.env.BASE_RPC_URL || "https://mainnet.base.org",
  optimism: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
  bsc: process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org", // Official BSC RPC
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function queryFactoryFee(network: string, factoryAddress: string, rpcUrl: string, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[${network}] Attempting to query (attempt ${attempt}/${retries})...`);
      
      // Create provider
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
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
      
      const usdcDecimals = USDC_DECIMALS[network] || 6;
      const feeFormatted = ethers.formatUnits(setupFee, usdcDecimals);
      console.log(`[${network}] ✅ Success!`);
      return { network, factoryAddress, setupFee: feeFormatted, owner, totalBlogs: totalBlogs.toString(), error: null };
    } catch (error: any) {
      const errorMsg = error.message || error.toString() || "Unknown error";
      console.log(`[${network}] ❌ Attempt ${attempt} failed: ${errorMsg.substring(0, 60)}`);
      
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.log(`[${network}] Retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        // Last attempt failed
        return { 
          network, 
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
  console.log(`Testing ${Object.keys(FACTORY_ADDRESSES).length} networks...\n`);
  
  // Process sequentially to avoid overwhelming RPC endpoints
  const results = [];
  const entries = Object.entries(FACTORY_ADDRESSES);
  
  for (let i = 0; i < entries.length; i++) {
    const [network, address] = entries[i];
    const result = await queryFactoryFee(network, address, RPC_URLS[network]);
    results.push(result);
    
    // Add a small delay between networks (except for the last one)
    if (i < entries.length - 1) {
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
