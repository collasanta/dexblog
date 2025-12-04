import { ethers } from "ethers";

/**
 * Represents a blog post stored on-chain
 */
export interface Post {
  /** Sequential post ID starting from 0 */
  id: number;
  /** Address of the post author */
  author: string;
  /** Post title (max 500 bytes) */
  title: string;
  /** Post body content, supports markdown (max 50000 bytes) */
  body: string;
  /** Unix timestamp when the post was published/edited */
  timestamp: number;
  /** Transaction hash of the publish/edit transaction (from receipt) */
  transactionHash: string;
  /** Whether this post has been deleted (soft delete) */
  deleted: boolean;
}

/**
 * Information about a blog contract
 */
export interface BlogInfo {
  /** Contract address of the blog */
  address: string;
  /** Address of the blog owner */
  owner: string;
  /** Name of the blog */
  name: string;
  /** Total number of posts published */
  postCount: number;
}

/**
 * Configuration for DexBlog SDK instance
 */
export interface DexBlogConfig {
  /** Address of the Blog contract */
  address: string;
  /** Chain ID where the contract is deployed */
  chainId: number;
  /** Signer for write operations (optional if only reading) */
  signer?: ethers.Signer;
  /** Provider for read operations */
  provider?: ethers.Provider;
}

/**
 * Configuration for DexBlogFactory SDK instance
 */
export interface DexBlogFactoryConfig {
  /** Address of the BlogFactory contract */
  address: string;
  /** Chain ID where the contract is deployed */
  chainId: number;
  /** Signer for write operations (required for creating blogs) */
  signer?: ethers.Signer;
  /** Provider for read operations */
  provider?: ethers.Provider;
}

/**
 * Result of creating a new blog
 */
export interface CreateBlogResult {
  /** Address of the newly deployed Blog contract */
  blogAddress: string;
  /** Transaction receipt */
  receipt: ethers.TransactionReceipt;
}

/**
 * Supported chains for DexBlog
 */
export enum SupportedChain {
  Ethereum = 1,
  Polygon = 137,
  Arbitrum = 42161,
  Optimism = 10,
  Base = 8453,
  BSC = 56,
}

/**
 * Chain configuration
 */
export interface ChainConfig {
  id: number;
  name: string;
  factoryAddress: string;
  rpcUrl: string;
  blockExplorer: string;
}

