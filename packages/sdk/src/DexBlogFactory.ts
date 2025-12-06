import { ethers } from "ethers";
import BlogFactoryAbi from "./abis/BlogFactory.json";
import { DexBlogFactoryConfig, CreateBlogResult } from "./types";
import { getRpcUrlList } from "./rpc";

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
 * // First, approve USDC spending (if fee > 0)
 * const setupFee = await factory.getSetupFee();
 * if (setupFee > 0n) {
 *   const usdcAddress = '0x...'; // USDC address for the chain
 *   const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
 *   await usdc.approve(factory.address, setupFee);
 * }
 *
 * // Then create the blog (no ETH value needed, USDC is transferred via ERC20)
 * const result = await factory.createBlog('My Blog');
 * console.log('Blog created at:', result.blogAddress);
 * ```
 */
export class DexBlogFactory {
  private contract: any;
  public readonly address: string;
  public readonly chainId: number;
  private signer?: ethers.Signer;
  private provider: ethers.Provider;

  constructor(config: DexBlogFactoryConfig) {
    this.address = config.address;
    this.chainId = config.chainId;

    const provider = config.provider || config.signer?.provider;
    if (!provider) {
      throw new Error("Provider or signer required");
    }

    this.provider = provider;
    this.signer = config.signer;
    this.contract = new ethers.Contract(
      config.address,
      BlogFactoryAbi.abi,
      provider
    );
  }

  private getWriteContract(): ethers.Contract {
    if (!this.signer) {
      throw new Error("Signer required for write operations");
    }
    return this.contract.connect(this.signer);
  }

  /**
   * Create a new blog (requires USDC payment via ERC20 transferFrom/approve)
   * 
   * **Important:** This method does NOT accept ETH value. USDC must be approved separately.
   * Before calling this method, ensure you have:
   * 1. Approved the factory contract to spend USDC (if setupFee > 0)
   * 2. Have sufficient USDC balance
   * 
   * @param name Name for the new blog
   * @param overrides Optional transaction overrides (gas settings only - do NOT include value)
   * @returns Object containing the new blog address and transaction receipt
   * 
   * @example
   * ```typescript
   * // First approve USDC (if fee > 0)
   * const setupFee = await factory.getSetupFee();
   * if (setupFee > 0n) {
   *   const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
   *   await usdc.approve(factory.address, setupFee);
   * }
   * 
   * // Then create blog (no ETH value)
   * const result = await factory.createBlog('My Blog');
   * ```
   */
  async createBlog(name: string, overrides?: ethers.Overrides): Promise<CreateBlogResult> {
    const writeContract = this.getWriteContract();
    const tx = await writeContract.createBlog(name, overrides ?? {});
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
   * @param overrides Optional transaction overrides (gas settings only)
   * @returns Object containing the new blog address and transaction receipt
   */
  async createBlogAsOwner(name: string, overrides?: ethers.Overrides): Promise<CreateBlogResult> {
    const writeContract = this.getWriteContract();
    const tx = await writeContract.createBlogAsOwner(name, overrides ?? {});
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
    const isEmptyBadData = (error: any) => {
      const msg = error?.message?.toLowerCase() || "";
      const code = error?.code;
      const infoVal = error?.info?.value;
      return (
        code === "BAD_DATA" &&
        (msg.includes('value="0x"') ||
          msg.includes('value="0x0"') ||
          msg.includes("value=0x") ||
          msg.includes("value=0x0") ||
          infoVal === "0x" ||
          infoVal === "0x0")
      );
    };

    // First attempt with the current provider (likely ResilientProvider)
    try {
      return await this.contract.getBlogsByOwner(owner);
    } catch (error: any) {
      if (!isEmptyBadData(error)) {
        if (typeof window !== "undefined") {
          console.log("[DexBlogFactory] getBlogsByOwner error (non-retryable):", {
            message: error?.message,
            code: error?.code,
            info: error?.info,
            error,
          });
        }
        throw error;
      }
      if (typeof window !== "undefined") {
        console.warn("[DexBlogFactory] Empty BAD_DATA from primary provider, retrying with alternate RPCs...");
      }
    }

    // Manual fallback rotation when RPC returns empty BAD_DATA
    const rpcCandidates = getRpcUrlList(this.chainId);
    for (let i = 0; i < rpcCandidates.length; i++) {
      const rpcUrl = rpcCandidates[i];
      try {
        const fallbackProvider = new ethers.JsonRpcProvider(rpcUrl, this.chainId);
        const fallbackContract = new ethers.Contract(this.address, BlogFactoryAbi.abi, fallbackProvider);
        const result = await fallbackContract.getBlogsByOwner(owner);
        if (typeof window !== "undefined") {
          console.log(`[DexBlogFactory] getBlogsByOwner succeeded via fallback RPC ${rpcUrl}`);
        }
        return result;
      } catch (error: any) {
        if (!isEmptyBadData(error)) {
          if (typeof window !== "undefined") {
            console.log(`[DexBlogFactory] getBlogsByOwner error on ${rpcUrl}:`, {
              message: error?.message,
              code: error?.code,
              info: error?.info,
              error,
            });
          }
          throw error;
        }
        if (typeof window !== "undefined") {
          console.warn(`[DexBlogFactory] Fallback RPC ${rpcUrl} returned empty BAD_DATA; trying next...`);
        }
      }
    }

    throw new Error("All RPCs returned empty BAD_DATA for getBlogsByOwner");
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

  /**
   * Set the setup fee (only factory owner)
   * @param fee New setup fee in payment token units (e.g., for USDC with 6 decimals: 0.1 * 10^6 = 100000)
   * @returns Transaction receipt
   */
  async setSetupFee(fee: bigint): Promise<ethers.TransactionReceipt> {
    const writeContract = this.getWriteContract();
    const tx = await writeContract.setSetupFee(fee);
    const receipt = await tx.wait();
    return receipt;
  }

  /**
   * Withdraw collected fees to factory owner (only factory owner)
   * @returns Transaction receipt
   */
  async withdraw(): Promise<ethers.TransactionReceipt> {
    const writeContract = this.getWriteContract();
    const tx = await writeContract.withdraw();
    const receipt = await tx.wait();
    return receipt;
  }
}

