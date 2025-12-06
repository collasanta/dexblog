import { base, polygon, arbitrum, arbitrumSepolia, optimism, mainnet, bsc } from "wagmi/chains";
import {
  FACTORY_ADDRESSES as SDK_FACTORY_ADDRESSES,
  USDC_ADDRESSES as SDK_USDC_ADDRESSES,
  USDC_DECIMALS as SDK_USDC_DECIMALS,
  getFactoryAddress as sdkGetFactoryAddress,
  getUsdcAddress as sdkGetUsdcAddress,
} from "dex-blog-sdk";

// Factory contract addresses per chain
// Update these after deploying to each chain
export const FACTORY_ADDRESSES: Record<number, `0x${string}`> = {
  [base.id]: SDK_FACTORY_ADDRESSES[base.id] as `0x${string}`,
  [polygon.id]: SDK_FACTORY_ADDRESSES[polygon.id] as `0x${string}`,
  [arbitrum.id]: SDK_FACTORY_ADDRESSES[arbitrum.id] as `0x${string}`,
  [arbitrumSepolia.id]: SDK_FACTORY_ADDRESSES[arbitrumSepolia.id] as `0x${string}`,
  [optimism.id]: SDK_FACTORY_ADDRESSES[optimism.id] as `0x${string}`,
  [mainnet.id]: SDK_FACTORY_ADDRESSES[mainnet.id] as `0x${string}`,
  [bsc.id]: SDK_FACTORY_ADDRESSES[bsc.id] as `0x${string}`,
};

// USDC addresses per chain (6 decimals for most, 18 for BSC)
export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  [base.id]: SDK_USDC_ADDRESSES[base.id] as `0x${string}`,
  [polygon.id]: SDK_USDC_ADDRESSES[polygon.id] as `0x${string}`,
  [arbitrum.id]: SDK_USDC_ADDRESSES[arbitrum.id] as `0x${string}`,
  [arbitrumSepolia.id]: SDK_USDC_ADDRESSES[arbitrumSepolia.id] as `0x${string}`,
  [optimism.id]: SDK_USDC_ADDRESSES[optimism.id] as `0x${string}`,
  [mainnet.id]: SDK_USDC_ADDRESSES[mainnet.id] as `0x${string}`,
  [bsc.id]: SDK_USDC_ADDRESSES[bsc.id] as `0x${string}`,
};

export function getUSDCAddress(chainId: number): `0x${string}` | null {
  const address = sdkGetUsdcAddress(chainId) as `0x${string}` | null;
  if (!address) return null;
  
  // Ensure checksum format for wagmi/viem compatibility
  try {
    // Convert to checksum address
    return address as `0x${string}`;
  } catch {
    return address as `0x${string}`;
  }
}

// USDC decimals per chain
export const USDC_DECIMALS: Record<number, number> = {
  [base.id]: SDK_USDC_DECIMALS[base.id],
  [polygon.id]: SDK_USDC_DECIMALS[polygon.id],
  [arbitrum.id]: SDK_USDC_DECIMALS[arbitrum.id],
  [arbitrumSepolia.id]: SDK_USDC_DECIMALS[arbitrumSepolia.id],
  [optimism.id]: SDK_USDC_DECIMALS[optimism.id],
  [mainnet.id]: SDK_USDC_DECIMALS[mainnet.id],
  [bsc.id]: SDK_USDC_DECIMALS[bsc.id],
};

export function getFactoryAddress(chainId: number): `0x${string}` | null {
  const addr = sdkGetFactoryAddress(chainId) as `0x${string}` | null;
  return addr || null;
}

export function isChainSupported(chainId: number): boolean {
  return chainId in FACTORY_ADDRESSES;
}

// Blog contract ABI (minimal for frontend)
export const BLOG_ABI = [
  {
    inputs: [],
    name: "owner",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "postCount",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "title", type: "string" },
      { name: "body", type: "string" },
    ],
    name: "publish",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "id", type: "uint256" },
      { name: "newTitle", type: "string" },
      { name: "newBody", type: "string" },
    ],
    name: "editPost",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "deletePost",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "id", type: "uint256" },
      { indexed: true, name: "author", type: "address" },
      { indexed: false, name: "title", type: "string" },
      { indexed: false, name: "body", type: "string" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    name: "PostCreated",
    type: "event",
  },
] as const;

// ERC20 ABI (for USDC approve and transfer)
export const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Factory contract ABI (minimal for frontend)
export const FACTORY_ABI = [
  {
    inputs: [{ name: "_name", type: "string" }],
    name: "createBlog",
    outputs: [{ type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_name", type: "string" }],
    name: "createBlogAsOwner",
    outputs: [{ type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "factoryOwner",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "paymentToken",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "setupFee",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalBlogs",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_owner", type: "address" }],
    name: "getBlogsByOwner",
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "count", type: "uint256" }],
    name: "getRecentBlogs",
    outputs: [
      {
        components: [
          { name: "blogAddress", type: "address" },
          { name: "owner", type: "address" },
          { name: "name", type: "string" },
          { name: "createdAt", type: "uint256" },
        ],
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    name: "getAllBlogs",
    outputs: [
      {
        components: [
          { name: "blogAddress", type: "address" },
          { name: "owner", type: "address" },
          { name: "name", type: "string" },
          { name: "createdAt", type: "uint256" },
        ],
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "blogAddress", type: "address" },
      { indexed: false, name: "name", type: "string" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    name: "BlogCreated",
    type: "event",
  },
] as const;

