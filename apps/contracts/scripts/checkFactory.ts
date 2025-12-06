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
  
  console.log("Checking BlogFactory status...");
  console.log("Network:", networkName);
  console.log("Factory address:", FACTORY_ADDRESS);

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers available. Please configure PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  console.log("Using account:", deployer.address);
  
  // Get factory contract
  const BlogFactory = await ethers.getContractFactory("BlogFactory");
  const factory = BlogFactory.attach(FACTORY_ADDRESS);
  
  // Get factory info
  const factoryOwner = await factory.factoryOwner();
  const setupFee = await factory.setupFee();
  const totalBlogs = await factory.totalBlogs();
  
  // Get USDC address
  const usdcAddress = await factory.paymentToken();
  console.log("\nFactory Info:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Factory Owner:", factoryOwner);
  console.log("Setup Fee:", ethers.formatUnits(setupFee, usdcDecimals), "USDC");
  console.log("Total Blogs:", totalBlogs.toString());
  console.log("USDC Address:", usdcAddress);
  
  // Get USDC contract
  const ERC20_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ];
  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, deployer);
  
  // Check factory USDC balance
  const factoryBalance = await usdc.balanceOf(FACTORY_ADDRESS);
  const decimals = await usdc.decimals();
  console.log("Factory USDC Balance:", ethers.formatUnits(factoryBalance, decimals), "USDC");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  // Get recent blogs
  if (totalBlogs > 0n) {
    console.log("\nRecent Blogs:");
    const recentCount = Number(totalBlogs) > 10 ? 10 : Number(totalBlogs);
    try {
      const recentBlogs = await factory.getRecentBlogs(recentCount);
      console.log(`Found ${recentBlogs.length} recent blogs:`);
      recentBlogs.forEach((blog: any, index: number) => {
        console.log(`  ${index + 1}. ${blog.name} - Owner: ${blog.owner} - Address: ${blog.blogAddress}`);
      });
    } catch (error) {
      console.log("Could not fetch recent blogs:", error);
    }
  } else {
    console.log("\nNo blogs created yet.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


