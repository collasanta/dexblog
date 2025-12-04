import { base, polygon, arbitrum, optimism, mainnet, bsc } from "wagmi/chains";

// Factory contract addresses per chain
// Update these after deploying to each chain
export const FACTORY_ADDRESSES: Record<number, `0x${string}`> = {
  [base.id]: "0x0000000000000000000000000000000000000000", // Deploy and update
  [polygon.id]: "0x0000000000000000000000000000000000000000",
  [arbitrum.id]: "0xccb9EFF798D12D78d179c81aEC83c9E9F974013B", // ✅ Deployed on Arbitrum Mainnet (with CRUD support)
  [optimism.id]: "0x0000000000000000000000000000000000000000",
  [mainnet.id]: "0x0000000000000000000000000000000000000000",
  [bsc.id]: "0x0000000000000000000000000000000000000000",
};

// USDC addresses per chain (6 decimals for most, 18 for BSC)
export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  [polygon.id]: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  [arbitrum.id]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  [optimism.id]: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  [mainnet.id]: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  [bsc.id]: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC on BSC uses 18 decimals
};

export function getUSDCAddress(chainId: number): `0x${string}` | null {
  return USDC_ADDRESSES[chainId] || null;
}

// USDC decimals per chain
export const USDC_DECIMALS: Record<number, number> = {
  [base.id]: 6,
  [polygon.id]: 6,
  [arbitrum.id]: 6,
  [optimism.id]: 6,
  [mainnet.id]: 6,
  [bsc.id]: 18, // BSC USDC uses 18 decimals
};

export function getFactoryAddress(chainId: number): `0x${string}` | null {
  return FACTORY_ADDRESSES[chainId] || null;
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

