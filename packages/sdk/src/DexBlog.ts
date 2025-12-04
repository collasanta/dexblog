import { ethers } from "ethers";
import BlogAbi from "./abis/Blog.json";
import { Post, BlogInfo, DexBlogConfig } from "./types";

/**
 * SDK for interacting with individual DexBlog contracts
 *
 * @example
 * ```typescript
 * import { DexBlog } from 'dex-blog-sdk';
 * import { ethers } from 'ethers';
 *
 * const provider = new ethers.JsonRpcProvider('https://...');
 * const blog = new DexBlog({
 *   address: '0x...',
 *   chainId: 8453,
 *   provider,
 * });
 *
 * const posts = await blog.getPosts();
 * ```
 */
export class DexBlog {
  private contract: ethers.Contract;
  private provider: ethers.Provider;
  public readonly address: string;
  public readonly chainId: number;

  constructor(config: DexBlogConfig) {
    this.address = config.address;
    this.chainId = config.chainId;

    const providerOrSigner = config.signer || config.provider;
    if (!providerOrSigner) {
      throw new Error("Provider or signer required");
    }

    this.provider =
      config.signer?.provider || (config.provider as ethers.Provider);
    this.contract = new ethers.Contract(
      config.address,
      BlogAbi.abi,
      providerOrSigner
    );
  }

  /**
   * Get blog information including owner, name, and post count
   */
  async getInfo(): Promise<BlogInfo> {
    const [owner, name, postCount] = await Promise.all([
      this.contract.owner(),
      this.contract.name(),
      this.contract.postCount(),
    ]);

    return {
      address: this.address,
      owner,
      name,
      postCount: Number(postCount),
    };
  }

  /**
   * Publish a new post to the blog
   * @param title Post title (max 500 bytes)
   * @param body Post body content, supports markdown (max 50000 bytes)
   * @returns Transaction receipt
   */
  async publish(
    title: string,
    body: string
  ): Promise<ethers.TransactionReceipt> {
    const tx = await this.contract.publish(title, body);
    return tx.wait();
  }

  /**
   * Get all posts from the blog by reading PostCreated events
   * @returns Array of posts sorted by ID
   */
  async getPosts(): Promise<Post[]> {
    const filter = this.contract.filters.PostCreated();
    const events = await this.contract.queryFilter(filter);

    return events.map((event) => {
      const log = event as ethers.EventLog;
      return {
        id: Number(log.args.id),
        author: log.args.author,
        title: log.args.title,
        body: log.args.body,
        timestamp: Number(log.args.timestamp),
        transactionHash: log.transactionHash,
      };
    });
  }

  /**
   * Get a single post by ID
   * @param id Post ID (0-indexed)
   * @returns Post or null if not found
   */
  async getPost(id: number): Promise<Post | null> {
    const posts = await this.getPosts();
    return posts.find((p) => p.id === id) || null;
  }

  /**
   * Get posts with pagination, sorted by newest first
   * @param page Page number (0-indexed)
   * @param perPage Number of posts per page (default 10)
   * @returns Array of posts for the requested page
   */
  async getPostsByPage(page: number, perPage: number = 10): Promise<Post[]> {
    const posts = await this.getPosts();
    const sorted = posts.sort((a, b) => b.timestamp - a.timestamp);
    const start = page * perPage;
    return sorted.slice(start, start + perPage);
  }

  /**
   * Get total number of pages
   * @param perPage Number of posts per page (default 10)
   * @returns Total number of pages
   */
  async getTotalPages(perPage: number = 10): Promise<number> {
    const info = await this.getInfo();
    return Math.ceil(info.postCount / perPage);
  }

  /**
   * Transfer blog ownership to a new address
   * @param newOwner Address of the new owner
   * @returns Transaction receipt
   */
  async transferOwnership(
    newOwner: string
  ): Promise<ethers.TransactionReceipt> {
    const tx = await this.contract.transferOwnership(newOwner);
    return tx.wait();
  }

  /**
   * Check if an address is the owner of this blog
   * @param address Address to check
   * @returns True if the address is the owner
   */
  async isOwner(address: string): Promise<boolean> {
    const owner = await this.contract.owner();
    return owner.toLowerCase() === address.toLowerCase();
  }

  /**
   * Get the blog owner address
   * @returns Owner address
   */
  async getOwner(): Promise<string> {
    return this.contract.owner();
  }

  /**
   * Get the blog name
   * @returns Blog name
   */
  async getName(): Promise<string> {
    return this.contract.name();
  }

  /**
   * Get the total post count
   * @returns Number of posts
   */
  async getPostCount(): Promise<number> {
    const count = await this.contract.postCount();
    return Number(count);
  }
}

