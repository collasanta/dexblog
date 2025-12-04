import { base, polygon, arbitrum, optimism, mainnet, bsc } from "wagmi/chains";

// Factory contract addresses per chain
// Update these after deploying to each chain
export const FACTORY_ADDRESSES: Record<number, `0x${string}`> = {
  [base.id]: "0x0000000000000000000000000000000000000000", // Deploy and update
  [polygon.id]: "0x0000000000000000000000000000000000000000",
  [arbitrum.id]: "0x0000000000000000000000000000000000000000",
  [optimism.id]: "0x0000000000000000000000000000000000000000",
  [mainnet.id]: "0x0000000000000000000000000000000000000000",
  [bsc.id]: "0x0000000000000000000000000000000000000000",
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

// Factory contract ABI (minimal for frontend)
export const FACTORY_ABI = [
  {
    inputs: [{ name: "_name", type: "string" }],
    name: "createBlog",
    outputs: [{ type: "address" }],
    stateMutability: "payable",
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

