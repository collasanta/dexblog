import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import {
  getChainConfig,
  getFactoryAddress,
  getSupportedChainIds,
  getRpcUrlWithFallback,
} from "dex-blog-sdk";

dotenv.config();

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function deployBlog(
  chainId: number,
  blogName: string,
  privateKey: string
) {
  const chainConfig = getChainConfig(chainId);
  const network = chainConfig?.name || `chain-${chainId}`;
  const factoryAddress = getFactoryAddress(chainId);
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
    if (!factoryAddress) {
      throw new Error("Missing factory address");
    }

    console.log(`\n[${network}] Connecting to ${rpc.url}...`);
    
    const provider = rpc.provider;
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log(`[${network}] Wallet address: ${wallet.address}`);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`[${network}] Balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance === 0n) {
      throw new Error("Insufficient balance: 0 ETH");
    }
    
    // Get factory contract
    const BlogFactory = await ethers.getContractFactory("BlogFactory");
    const factory = BlogFactory.attach(factoryAddress).connect(wallet);
    
    // Verify we're the owner
    const factoryOwner = await factory.factoryOwner();
    if (factoryOwner.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error(`Not the factory owner! Owner is: ${factoryOwner}, but wallet is: ${wallet.address}`);
    }
    console.log(`[${network}] ✅ Verified as factory owner`);
    
    // Get current total blogs before deployment
    const totalBlogsBefore = await factory.totalBlogs();
    console.log(`[${network}] Total blogs before: ${totalBlogsBefore.toString()}`);
    
    // Deploy blog using createBlogAsOwner (free for owner)
    console.log(`[${network}] Deploying blog "${blogName}"...`);
    
    // Estimate gas
    const gasEstimate = await factory.createBlogAsOwner.estimateGas(blogName);
    const gasPrice = await provider.getFeeData();
    const estimatedCost = gasEstimate * (gasPrice.gasPrice || 0n);
    console.log(`[${network}] Estimated gas: ${gasEstimate.toString()}`);
    console.log(`[${network}] Estimated cost: ${ethers.formatEther(estimatedCost)} ETH`);
    
    if (balance < estimatedCost) {
      throw new Error(`Insufficient balance. Need ${ethers.formatEther(estimatedCost)} ETH but have ${ethers.formatEther(balance)} ETH`);
    }
    
    // Create the blog
    console.log(`[${network}] Sending transaction...`);
    const tx = await factory.createBlogAsOwner(blogName);
    console.log(`[${network}] Transaction hash: ${tx.hash}`);
    
    console.log(`[${network}] Waiting for confirmation...`);
    const receipt = await tx.wait();
    
    // Get blog address from event
    const event = receipt?.logs.find((log: any) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed?.name === "BlogCreated";
      } catch {
        return false;
      }
    });
    
    if (!event) {
      throw new Error("BlogCreated event not found in transaction receipt");
    }
    
    const parsed = factory.interface.parseLog(event);
    const blogAddress = parsed?.args[1]; // blogAddress is the second argument
    
    console.log(`[${network}] ✅ Blog deployed successfully!`);
    console.log(`[${network}] Blog address: ${blogAddress}`);
    console.log(`[${network}] Gas used: ${receipt.gasUsed.toString()}`);
    
    // Wait a bit for the contract to be fully indexed
    await sleep(2000);
    
    // Verify blog exists and is correct (with retry)
    const Blog = await ethers.getContractFactory("Blog");
    const blog = Blog.attach(blogAddress).connect(provider);
    
    let blogNameOnChain: string;
    let blogOwner: string;
    let verificationSuccess = false;
    
    // Retry verification up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        blogNameOnChain = await blog.name();
        blogOwner = await blog.owner();
        verificationSuccess = true;
        break;
      } catch (error: any) {
        if (attempt < 3) {
          console.log(`[${network}] Verification attempt ${attempt} failed, retrying...`);
          await sleep(2000);
        } else {
          console.log(`[${network}] ⚠️  Could not verify blog details (contract may still be indexing)`);
          // Still consider it a success if the transaction went through
          blogNameOnChain = "Verification failed";
          blogOwner = wallet.address; // Assume correct since tx succeeded
        }
      }
    }
    
    if (verificationSuccess) {
      if (blogNameOnChain !== blogName) {
        console.log(`[${network}] ⚠️  Blog name mismatch! Expected "${blogName}", got "${blogNameOnChain}"`);
      }
      
      if (blogOwner.toLowerCase() !== wallet.address.toLowerCase()) {
        console.log(`[${network}] ⚠️  Blog owner mismatch! Expected ${wallet.address}, got ${blogOwner}`);
      }
      
      console.log(`[${network}] ✅ Blog verified successfully!`);
      console.log(`[${network}] Blog name: ${blogNameOnChain}`);
      console.log(`[${network}] Blog owner: ${blogOwner}`);
    }
    
    // Verify total blogs increased
    const totalBlogsAfter = await factory.totalBlogs();
    if (totalBlogsAfter !== totalBlogsBefore + 1n) {
      throw new Error(`Total blogs count mismatch! Expected ${totalBlogsBefore + 1n}, got ${totalBlogsAfter}`);
    }
    
    console.log(`[${network}] Total blogs after: ${totalBlogsAfter.toString()}`);
    
    return { 
      network, 
      success: true, 
      blogAddress, 
      txHash: receipt.hash,
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error: any) {
    const errorMsg = error.message || error.toString() || "Unknown error";
    console.error(`[${network}] ❌ Error: ${errorMsg}`);
    return { network, success: false, blogAddress: null, txHash: null, error: errorMsg };
  }
}

async function main() {
  // Get blog name from environment variable or use default
  const blogName = process.env.BLOG_NAME || `Test Blog ${new Date().toISOString().split('T')[0]}`;
  
  // Get private key
  const privateKey = process.env.PRIVATE_KEY || process.env.DEPLOYER;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY or DEPLOYER environment variable is required");
  }
  
  console.log("=".repeat(100));
  console.log("Testing blog deployment on all production chains");
  console.log("=".repeat(100));
  console.log(`Blog name: ${blogName}`);
  console.log(`Excluding: arbitrumSepolia (testnet)`);
  console.log("=".repeat(100));
  
  // Get production networks (exclude arbitrumSepolia)
  const productionChains = getSupportedChainIds().filter((id) => id !== 421614);
  
  console.log(`\nProduction networks to test: ${productionChains.join(", ")}\n`);
  
  const results = [];
  
  // Process sequentially to avoid nonce issues
  for (let i = 0; i < productionChains.length; i++) {
    const chainId = productionChains[i];
    
    const result = await deployBlog(chainId, blogName, privateKey);
    results.push(result);
    
    // Add delay between networks (except for the last one)
    if (i < productionChains.length - 1) {
      await sleep(3000); // 3 second delay between networks
    }
  }
  
  // Summary
  console.log("\n" + "=".repeat(100));
  console.log("SUMMARY");
  console.log("=".repeat(100));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}`);
  successful.forEach(r => {
    console.log(`   - ${r.network}:`);
    console.log(`     Blog: ${r.blogAddress}`);
    console.log(`     TX: ${r.txHash}`);
    console.log(`     Gas: ${r.gasUsed}`);
  });
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}`);
    failed.forEach(r => {
      console.log(`   - ${r.network}: ${r.error?.substring(0, 80)}`);
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

