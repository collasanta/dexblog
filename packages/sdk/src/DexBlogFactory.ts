import { ethers } from "ethers";
import BlogFactoryAbi from "./abis/BlogFactory.json";
import { DexBlogFactoryConfig, CreateBlogResult } from "./types";

/**
 * SDK for interacting with the DexBlog Factory contract
 *
 * @example
 * ```typescript
 * import { DexBlogFactory } from 'dex-blog-sdk';
 * import { ethers } from 'ethers';
 *
 * const signer = await provider.getSigner();
 * const factory = new DexBlogFactory({
 *   address: '0x...',
 *   chainId: 8453,
 *   signer,
 * });
 *
 * const setupFee = await factory.getSetupFee();
 * const blogAddress = await factory.createBlog('My Blog', setupFee);
 * ```
 */
export class DexBlogFactory {
  private contract: ethers.Contract;
  public readonly address: string;
  public readonly chainId: number;

  constructor(config: DexBlogFactoryConfig) {
    this.address = config.address;
    this.chainId = config.chainId;

    const providerOrSigner = config.signer || config.provider;
    if (!providerOrSigner) {
      throw new Error("Provider or signer required");
    }

    this.contract = new ethers.Contract(
      config.address,
      BlogFactoryAbi.abi,
      providerOrSigner
    );
  }

  /**
   * Create a new blog (requires USDC payment)
   * @param name Name for the new blog
   * @param setupFee Fee to pay for blog creation (get from getSetupFee())
   * @returns Object containing the new blog address and transaction receipt
   */
  async createBlog(name: string, setupFee: bigint): Promise<CreateBlogResult> {
    const tx = await this.contract.createBlog(name, { value: setupFee });
    const receipt = await tx.wait();

    // Find BlogCreated event in logs
    const event = receipt.logs.find((log: ethers.Log) => {
      try {
        const parsed = this.contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        return parsed?.name === "BlogCreated";
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error("BlogCreated event not found in transaction receipt");
    }

    const parsed = this.contract.interface.parseLog({
      topics: event.topics as string[],
      data: event.data,
    });

    return {
      blogAddress: parsed!.args.blogAddress,
      receipt,
    };
  }

  /**
   * Create a new blog as factory owner (free, no payment required)
   * @param name Name for the new blog
   * @returns Object containing the new blog address and transaction receipt
   */
  async createBlogAsOwner(name: string): Promise<CreateBlogResult> {
    const tx = await this.contract.createBlogAsOwner(name);
    const receipt = await tx.wait();

    // Find BlogCreated event in logs
    const event = receipt.logs.find((log: ethers.Log) => {
      try {
        const parsed = this.contract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        return parsed?.name === "BlogCreated";
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error("BlogCreated event not found in transaction receipt");
    }

    const parsed = this.contract.interface.parseLog({
      topics: event.topics as string[],
      data: event.data,
    });

    return {
      blogAddress: parsed!.args.blogAddress,
      receipt,
    };
  }

  /**
   * Get the current setup fee required to create a blog
   * @returns Setup fee in wei
   */
  async getSetupFee(): Promise<bigint> {
    return this.contract.setupFee();
  }

  /**
   * Get the total number of blogs created through this factory
   * @returns Total blog count
   */
  async totalBlogs(): Promise<number> {
    const count = await this.contract.totalBlogs();
    return Number(count);
  }

  /**
   * Get all blog addresses created by a specific owner
   * @param owner Owner address to query
   * @returns Array of blog contract addresses
   */
  async getBlogsByOwner(owner: string): Promise<string[]> {
    return this.contract.getBlogsByOwner(owner);
  }

  /**
   * Get blog address by index
   * @param index Index in the blogs array
   * @returns Blog contract address
   */
  async getBlogAtIndex(index: number): Promise<string> {
    return this.contract.blogs(index);
  }

  /**
   * Get the factory owner address
   * @returns Factory owner address
   */
  async getFactoryOwner(): Promise<string> {
    return this.contract.factoryOwner();
  }

  /**
   * Check if the setup fee is zero (free blog creation)
   * @returns True if blog creation is free
   */
  async isFree(): Promise<boolean> {
    const fee = await this.getSetupFee();
    return fee === 0n;
  }

  /**
   * Get all blogs created through this factory
   * @returns Array of all blog addresses
   */
  async getAllBlogs(): Promise<string[]> {
    const total = await this.totalBlogs();
    const blogs: string[] = [];

    for (let i = 0; i < total; i++) {
      const blogAddress = await this.getBlogAtIndex(i);
      blogs.push(blogAddress);
    }

    return blogs;
  }
}

