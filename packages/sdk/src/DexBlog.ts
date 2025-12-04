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
   * @returns Transaction receipt with hash
   */
  async publish(
    title: string,
    body: string
  ): Promise<ethers.TransactionReceipt> {
    if (!this.contract.signer) {
      throw new Error("Signer required for write operations");
    }
    const tx = await this.contract.publish(title, body);
    const receipt = await tx.wait();
    return receipt;
  }

  /**
   * Edit an existing post
   * @param id Post ID to edit
   * @param newTitle New title (max 500 bytes)
   * @param newBody New body content (max 50000 bytes)
   * @returns Transaction receipt with hash
   */
  async editPost(
    id: number,
    newTitle: string,
    newBody: string
  ): Promise<ethers.TransactionReceipt> {
    if (!this.contract.signer) {
      throw new Error("Signer required for write operations");
    }
    const tx = await this.contract.editPost(id, newTitle, newBody);
    const receipt = await tx.wait();
    return receipt;
  }

  /**
   * Delete a post (soft delete)
   * @param id Post ID to delete
   * @returns Transaction receipt
   */
  async deletePost(id: number): Promise<ethers.TransactionReceipt> {
    if (!this.contract.signer) {
      throw new Error("Signer required for write operations");
    }
    const tx = await this.contract.deletePost(id);
    const receipt = await tx.wait();
    return receipt;
  }

  /**
   * Get all posts from the blog by reading PostCreated events
   * @returns Array of posts sorted by ID
   */
  /**
   * Get the block number when this blog contract was created
   * by searching for the BlogCreated event from the Factory
   */
  private async getCreationBlock(factoryAddress: string): Promise<number | null> {
    try {
      // Import factory ABI directly
      const BlogFactoryAbi = (await import("./abis/BlogFactory.json")).default;
      const factoryContract = new ethers.Contract(
        factoryAddress,
        BlogFactoryAbi.abi,
        this.provider
      );

      // Search for BlogCreated event with this blog's address
      const filter = factoryContract.filters.BlogCreated(null, this.address);
      const events = await factoryContract.queryFilter(filter);
      
      if (events.length > 0) {
        const creationBlock = events[0].blockNumber;
        console.log(`[SDK] Found blog creation at block ${creationBlock}`);
        return Number(creationBlock);
      }
      
      return null;
    } catch (error) {
      console.warn(`[SDK] Could not find creation block:`, error);
      return null;
    }
  }

  /**
   * Query events in chunks to respect RPC limits (10k blocks per chunk)
   */
  private async queryEventsInChunks(
    fromBlock: number,
    toBlock: number,
    chunkSize: number = 10000
  ): Promise<ethers.EventLog[]> {
    const allEvents: ethers.EventLog[] = [];
    const filter = this.contract.filters.PostCreated();
    let currentFrom = fromBlock;

    while (currentFrom <= toBlock) {
      const currentTo = Math.min(currentFrom + chunkSize - 1, toBlock);
      console.log(`[SDK] Querying chunk: blocks ${currentFrom} to ${currentTo}`);
      
      try {
        const chunkEvents = await this.contract.queryFilter(filter, currentFrom, currentTo);
        allEvents.push(...(chunkEvents as ethers.EventLog[]));
        console.log(`[SDK] Found ${chunkEvents.length} events in this chunk`);
      } catch (error) {
        console.warn(`[SDK] Error querying chunk ${currentFrom}-${currentTo}:`, error);
        // Continue with next chunk even if this one fails
      }
      
      currentFrom = currentTo + 1;
    }

    return allEvents;
  }

  /**
   * Get all posts from the blog by reading from contract storage
   * Much faster and more reliable than querying events
   * @returns Array of posts sorted by ID
   */
  async getPosts(): Promise<Post[]> {
    try {
      // Get post count first
      const count = await this.contract.postCount();
      const postCount = Number(count);
      
      if (postCount === 0) {
        console.log(`[SDK] No posts found for ${this.address}`);
        return [];
      }

      console.log(`[SDK] Fetching ${postCount} posts from storage`);

      // Fetch all active posts (exclude deleted) using getPostsRange
      const posts = await this.contract.getPostsRange(0, postCount, false);
      
      console.log(`[SDK] Retrieved ${posts.length} active posts from storage`);

      // Convert to SDK Post format
      // Note: transactionHash is not stored in contract, we'll try to get from events
      const postsWithHash = await Promise.all(
        posts.map(async (post: any) => {
          // Try to get transaction hash from events for this post ID
          let txHash = "";
          try {
            const filter = this.contract.filters.PostCreated(post.id);
            const events = await this.contract.queryFilter(filter);
            if (events.length > 0) {
              txHash = events[events.length - 1].transactionHash; // Get most recent (in case of edits)
            }
          } catch (error) {
            // If event query fails, leave txHash empty
            console.warn(`[SDK] Could not fetch tx hash for post ${post.id}`);
          }

          return {
            id: Number(post.id),
            author: post.author,
            title: post.title,
            body: post.body,
            timestamp: Number(post.timestamp),
            transactionHash: txHash,
            deleted: post.deleted || false,
          };
        })
      );

      return postsWithHash;
    } catch (error) {
      console.error(`[SDK] Error fetching posts from storage:`, error);
      // Fallback to events if storage read fails (for backwards compatibility)
      console.log(`[SDK] Falling back to event-based fetching...`);
      return this.getPostsFromEvents();
    }
  }

  /**
   * Fallback method: Get posts from events (for backwards compatibility)
   * @param factoryAddress Optional factory address to find creation block
   * @returns Array of posts sorted by ID
   */
  private async getPostsFromEvents(factoryAddress?: string): Promise<Post[]> {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const currentBlockNum = Number(currentBlock);
      
      // Try to get creation block if factory address is provided
      let fromBlock = 0;
      if (factoryAddress) {
        const creationBlock = await this.getCreationBlock(factoryAddress);
        if (creationBlock !== null) {
          fromBlock = creationBlock;
        }
      }
      
      // If we don't have creation block, fallback to recent blocks
      if (fromBlock === 0) {
        const maxRange = 10000;
        fromBlock = currentBlockNum > maxRange ? currentBlockNum - maxRange : 0;
      }

      // Query events in chunks to respect RPC limits
      const events = await this.queryEventsInChunks(fromBlock, currentBlockNum);
      
      return events.map((event) => {
        const log = event as ethers.EventLog;
        return {
          id: Number(log.args.id),
          author: log.args.author,
          title: log.args.title,
          body: log.args.body,
          timestamp: Number(log.args.timestamp),
          transactionHash: log.transactionHash,
          deleted: false, // Events don't track deletions, need to check storage
        };
      }).sort((a, b) => a.id - b.id);
    } catch (error) {
      console.error(`[SDK] Error fetching posts from events:`, error);
      throw error;
    }
  }

  /**
   * Get a single post by ID directly from storage
   * @param id Post ID (0-indexed)
   * @param includeDeleted Whether to include deleted posts (default false)
   * @returns Post or null if not found
   */
  async getPost(id: number, includeDeleted: boolean = false): Promise<Post | null> {
    try {
      const post = await this.contract.posts(id);
      
      // Check if post exists
      const postCount = await this.getPostCount();
      if (id >= postCount) {
        return null;
      }

      // Check if deleted
      if (post.deleted && !includeDeleted) {
        return null;
      }

      // Try to get transaction hash from events
      let txHash = "";
      try {
        const filter = this.contract.filters.PostCreated(id);
        const events = await this.contract.queryFilter(filter);
        if (events.length > 0) {
          txHash = events[events.length - 1].transactionHash;
        }
      } catch (error) {
        // If event query fails, leave txHash empty
      }

      return {
        id: Number(post.id),
        author: post.author,
        title: post.title,
        body: post.body,
        timestamp: Number(post.timestamp),
        transactionHash: txHash,
        deleted: post.deleted || false,
      };
    } catch (error) {
      console.error(`[SDK] Error fetching post ${id}:`, error);
      return null;
    }
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

