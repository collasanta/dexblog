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
  arbitrum: process.env.ARBITRUM_RPC_URL || "https://arbitrum.drpc.org",
  arbitrumSepolia: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
  base: process.env.BASE_RPC_URL || "https://mainnet.base.org",
  optimism: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
  bsc: process.env.BSC_RPC_URL || "https://bsc.drpc.org",
};

async function queryFactoryFee(network: string, factoryAddress: string, rpcUrl: string) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const BlogFactory = await ethers.getContractFactory("BlogFactory");
    const factory = BlogFactory.attach(factoryAddress).connect(provider);
    const [setupFee, owner, totalBlogs] = await Promise.all([
      factory.setupFee(),
      factory.factoryOwner(),
      factory.totalBlogs(),
    ]);
    const usdcDecimals = USDC_DECIMALS[network] || 6;
    const feeFormatted = ethers.formatUnits(setupFee, usdcDecimals);
    return { network, factoryAddress, setupFee: feeFormatted, owner, totalBlogs: totalBlogs.toString(), error: null };
  } catch (error: any) {
    return { network, factoryAddress, setupFee: "N/A", owner: "N/A", totalBlogs: "N/A", error: error.message || "Unknown error" };
  }
}

async function main() {
  console.log("Querying setup fees for all deployed factories...\n");
  const results = await Promise.all(
    Object.entries(FACTORY_ADDRESSES).map(([network, address]) =>
      queryFactoryFee(network, address, RPC_URLS[network])
    )
  );
  console.log("=".repeat(100));
  console.log(`${"Network".padEnd(20)} ${"Factory Address".padEnd(45)} ${"Setup Fee (USDC)".padEnd(20)} ${"Total Blogs".padEnd(15)} ${"Owner".padEnd(45)}`);
  console.log("=".repeat(100));
  results.forEach((r) => {
    if (r.error) {
      console.log(`${r.network.padEnd(20)} ${r.factoryAddress.padEnd(45)} ${"ERROR".padEnd(20)} ${"".padEnd(15)} ${r.error.substring(0, 44)}`);
    } else {
      console.log(`${r.network.padEnd(20)} ${r.factoryAddress.padEnd(45)} ${r.setupFee.padEnd(20)} ${r.totalBlogs.padEnd(15)} ${r.owner.substring(0, 44)}`);
    }
  });
  console.log("=".repeat(100));
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
