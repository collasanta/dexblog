import { ethers } from "ethers";
import BlogAbi from "./abis/Blog.json";
import { Post, BlogInfo, DexBlogConfig, PublishPostResult } from "./types";

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
/**
 * Helper function to check if a post struct is in array-like format (ethers Result)
 * ethers.js Result objects have numeric indices but aren't true arrays
 */
function isArrayLikePost(post: any): boolean {
  return Array.isArray(post) || (typeof post === 'object' && post !== null && '0' in post && '5' in post);
}

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
  ): Promise<PublishPostResult> {
    if (!this.contract.signer) {
      throw new Error("Signer required for write operations");
    }
    const tx = await this.contract.publish(title, body);
    const receipt = await tx.wait();
    
    // Extract postId from PostCreated event
    let postId: number | null = null;
    if (receipt.logs) {
      for (const log of receipt.logs) {
        try {
          const parsedLog = this.contract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (parsedLog && parsedLog.name === "PostCreated") {
            postId = Number(parsedLog.args.id);
            break;
          }
        } catch (e) {
          // Not a PostCreated event, continue
        }
      }
    }
    
    // Fallback: if event parsing failed, get postCount - 1
    if (postId === null) {
      const postCount = await this.getPostCount();
      postId = Math.max(0, postCount - 1);
    }
    
    return { receipt, postId };
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
   * Get posts from contract storage WITHOUT fetching transaction hashes
   * Fast - only reads from storage (~300ms)
   * @param options Pagination and filtering options
   * @returns Array of posts sorted by ID with empty transactionHash
   */
  async getPostsWithoutHashes(options?: {
    offset?: number;
    limit?: number;
    includeDeleted?: boolean;
  }): Promise<Post[]> {
    try {
      const count = await this.contract.postCount();
      const postCount = Number(count);
      
      if (postCount === 0) {
        console.log(`[SDK] No posts found for ${this.address}`);
        return [];
      }

      const offset = options?.offset ?? 0;
      const limit = options?.limit ?? postCount;
      const includeDeleted = options?.includeDeleted ?? false;
      const endIndex = Math.min(offset + limit, postCount);

      console.log(`[SDK] Fetching posts ${offset} to ${endIndex} from storage (without hashes)`);

      const posts = await this.contract.getPostsRange(offset, endIndex, includeDeleted);
      
      console.log(`[SDK] Retrieved ${posts.length} active posts from storage`);

      // Convert to Post format without fetching hashes
      return posts.map((post: any, index: number) => {
        let postId: number;
        let blockNumber: number;
        
        if (isArrayLikePost(post)) {
          postId = Number(post[0]);
          blockNumber = Number(post[5]);
        } else if (post && typeof post === 'object' && 'blockNumber' in post) {
          postId = Number(post.id);
          blockNumber = Number(post.blockNumber);
        } else {
          postId = Number(post.id || post[0] || index);
          blockNumber = Number(post.blockNumber || post[5] || 0);
        }

        return {
          id: postId,
          author: isArrayLikePost(post) ? post[1] : post.author,
          title: isArrayLikePost(post) ? post[2] : post.title,
          body: isArrayLikePost(post) ? post[3] : post.body,
          timestamp: Number(isArrayLikePost(post) ? post[4] : post.timestamp),
          blockNumber: blockNumber || undefined,
          transactionHash: "", // Empty - will be filled separately
          deleted: isArrayLikePost(post) ? post[6] : post.deleted,
        };
      });
    } catch (error) {
      console.error(`[SDK] Error fetching posts from storage:`, error);
      throw error;
    }
  }

  /**
   * Get transaction hash for a single post using its blockNumber
   * @param postId Post ID
   * @param blockNumber Block number when post was created
   * @returns Transaction hash or empty string if not found
   */
  async getPostHash(postId: number, blockNumber: number): Promise<string> {
    if (!blockNumber || blockNumber === 0) {
      console.warn(`[SDK] getPostHash(${postId}): No blockNumber provided`);
      return "";
    }

    try {
      const currentBlock = await this.provider.getBlockNumber();
      const currentBlockNum = Number(currentBlock);
      
      let fromBlock: number;
      let toBlock: number;
      
      if (blockNumber < currentBlockNum - 100000) {
        console.warn(`[SDK] Post ${postId}: blockNumber ${blockNumber} seems incorrect (current: ${currentBlockNum}). Trying recent blocks.`);
        fromBlock = Math.max(0, currentBlockNum - 10000);
        toBlock = currentBlockNum;
      } else {
        fromBlock = Math.max(0, blockNumber - 5);
        toBlock = blockNumber + 5;
      }

      // Strategy 1: Query all PostCreated events in range
      const filterAll = this.contract.filters.PostCreated();
      let events = await this.contract.queryFilter(filterAll, fromBlock, toBlock);
      
      // Filter by postId
      const matchingEvents = events.filter((event: any) => {
        if ('args' in event && event.args && 'id' in event.args) {
          return Number(event.args.id) === postId;
        }
        return false;
      });
      
      if (matchingEvents.length > 0) {
        const event = matchingEvents.reduce((closest: any, current: any) => {
          const closestDiff = Math.abs(closest.blockNumber - blockNumber);
          const currentDiff = Math.abs(current.blockNumber - blockNumber);
          return currentDiff < closestDiff ? current : closest;
        });
        
        const eventAny = event as any;
        if ('transactionHash' in event && event.transactionHash) {
          return event.transactionHash as string;
        } else if (eventAny.transactionHash) {
          return eventAny.transactionHash;
        }
      }

      // Strategy 2: Try with postId filter
      const filterById = this.contract.filters.PostCreated(postId);
      let searchFromBlock = fromBlock;
      let searchToBlock = toBlock;
      
      if (blockNumber < currentBlockNum - 100000) {
        searchFromBlock = Math.max(0, currentBlockNum - 50000);
        searchToBlock = currentBlockNum;
      }
      
      const chunkSize = 10000;
      for (let chunkStart = searchFromBlock; chunkStart <= searchToBlock; chunkStart += chunkSize) {
        const chunkEnd = Math.min(chunkStart + chunkSize - 1, searchToBlock);
        try {
          const eventsById = await this.contract.queryFilter(filterById, chunkStart, chunkEnd);
          if (eventsById.length > 0) {
            const event = eventsById[0] as any;
            return ('transactionHash' in event && event.transactionHash) || event.transactionHash || "";
          }
        } catch (error: any) {
          console.warn(`[SDK] Post ${postId}: Error querying chunk [${chunkStart}, ${chunkEnd}]:`, error?.message);
        }
      }

      return "";
    } catch (error: any) {
      console.error(`[SDK] Error fetching hash for post ${postId}:`, error?.message || error);
      return "";
    }
  }

  /**
   * Get transaction hashes for multiple posts sequentially
   * Each post is processed one at a time to avoid dRPC batch limits
   * @param posts Array of {postId, blockNumber}
   * @returns Map of postId -> transactionHash
   */
  async getPostHashesBatch(posts: Array<{postId: number, blockNumber: number}>): Promise<Map<number, string>> {
    const hashMap = new Map<number, string>();
    
    // Get current block once (shared for all posts)
    let currentBlockNum: number | null = null;
    try {
      const currentBlock = await this.provider.getBlockNumber();
      currentBlockNum = Number(currentBlock);
    } catch (error) {
      console.warn(`[SDK] Failed to get current block, will fetch per post`);
    }
    
    // Process posts sequentially to avoid batching
    for (let i = 0; i < posts.length; i++) {
      const { postId, blockNumber } = posts[i];
      
      try {
        // Small delay between posts to ensure no batching
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Use cached currentBlockNum if available, otherwise fetch
        let fromBlock: number;
        let toBlock: number;
        
        if (currentBlockNum !== null) {
          if (blockNumber < currentBlockNum - 100000) {
            fromBlock = Math.max(0, currentBlockNum - 10000);
            toBlock = currentBlockNum;
          } else {
            fromBlock = Math.max(0, blockNumber - 5);
            toBlock = blockNumber + 5;
          }
        } else {
          // Fallback: fetch current block for this post
          const currentBlock = await this.provider.getBlockNumber();
          const current = Number(currentBlock);
          if (blockNumber < current - 100000) {
            fromBlock = Math.max(0, current - 10000);
            toBlock = current;
          } else {
            fromBlock = Math.max(0, blockNumber - 5);
            toBlock = blockNumber + 5;
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Query events (single request)
        const filterAll = this.contract.filters.PostCreated();
        const events = await this.contract.queryFilter(filterAll, fromBlock, toBlock);
        
        // Small delay after query
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Filter by postId
        const matchingEvents = events.filter((event: any) => {
          if ('args' in event && event.args && 'id' in event.args) {
            return Number(event.args.id) === postId;
          }
          return false;
        });
        
        if (matchingEvents.length > 0) {
          const event = matchingEvents.reduce((closest: any, current: any) => {
            const closestDiff = Math.abs(closest.blockNumber - blockNumber);
            const currentDiff = Math.abs(current.blockNumber - blockNumber);
            return currentDiff < closestDiff ? current : closest;
          });
          
          const eventAny = event as any;
          const txHash = ('transactionHash' in event && event.transactionHash) || eventAny.transactionHash || "";
          if (txHash) {
            hashMap.set(postId, txHash);
            continue;
          }
        }
        
        // Strategy 2: Try with postId filter if not found
        const filterById = this.contract.filters.PostCreated(postId);
        let searchFromBlock = fromBlock;
        let searchToBlock = toBlock;
        
        if (currentBlockNum !== null && blockNumber < currentBlockNum - 100000) {
          searchFromBlock = Math.max(0, currentBlockNum - 50000);
          searchToBlock = currentBlockNum;
        }
        
        const chunkSize = 10000;
        for (let chunkStart = searchFromBlock; chunkStart <= searchToBlock; chunkStart += chunkSize) {
          const chunkEnd = Math.min(chunkStart + chunkSize - 1, searchToBlock);
          try {
            await new Promise(resolve => setTimeout(resolve, 200));
            const eventsById = await this.contract.queryFilter(filterById, chunkStart, chunkEnd);
            await new Promise(resolve => setTimeout(resolve, 200));
            
            if (eventsById.length > 0) {
              const event = eventsById[0] as any;
              const txHash = ('transactionHash' in event && event.transactionHash) || event.transactionHash || "";
              if (txHash) {
                hashMap.set(postId, txHash);
                break;
              }
            }
          } catch (error: any) {
            console.warn(`[SDK] Post ${postId}: Error querying chunk:`, error?.message);
          }
        }
      } catch (error: any) {
        console.error(`[SDK] Error fetching hash for post ${postId}:`, error?.message || error);
      }
    }
    
    return hashMap;
  }

  /**
   * Get posts from the blog by reading from contract storage
   * Much faster and more reliable than querying events
   * @param options Pagination and filtering options
   * @returns Array of posts sorted by ID
   */
  async getPosts(options?: {
    offset?: number;
    limit?: number;
    includeDeleted?: boolean;
    withHashes?: boolean; // Default true, set to false for faster loading
  }): Promise<Post[]> {
    try {
      // Get post count first
      const count = await this.contract.postCount();
      const postCount = Number(count);
      
      if (postCount === 0) {
        console.log(`[SDK] No posts found for ${this.address}`);
        return [];
      }

      const offset = options?.offset ?? 0;
      const limit = options?.limit ?? postCount;
      const includeDeleted = options?.includeDeleted ?? false;
      const withHashes = options?.withHashes ?? true;
      const endIndex = Math.min(offset + limit, postCount);

      console.log(`[SDK] Fetching posts ${offset} to ${endIndex} from storage`);

      // Fetch posts using getPostsRange with pagination
      const posts = await this.contract.getPostsRange(offset, endIndex, includeDeleted);
      
      console.log(`[SDK] Retrieved ${posts.length} active posts from storage`);

      // Log blockNumbers read from contract
      // Note: ethers.js may return structs as arrays or objects
      // Struct order: [id, author, title, body, timestamp, blockNumber, deleted]
      posts.forEach((post: any, index: number) => {
        let postId: number;
        let blockNumber: number;
        
        // Handle both array and object formats
        if (isArrayLikePost(post)) {
          // If it's an array-like object (ethers Result), access by index
          // [0]=id, [1]=author, [2]=title, [3]=body, [4]=timestamp, [5]=blockNumber, [6]=deleted
          postId = Number(post[0]);
          blockNumber = Number(post[5]);
          console.log(`[SDK] Post ${postId}: blockNumber from contract (array-like format, index 5) = ${blockNumber}`);
        } else if (post && typeof post === 'object' && 'blockNumber' in post) {
          // If it's an object with blockNumber property
          postId = Number(post.id);
          blockNumber = Number(post.blockNumber);
          console.log(`[SDK] Post ${postId}: blockNumber from contract (object format) = ${blockNumber}`);
        } else {
          console.error(`[SDK] Post ${index}: Unknown format:`, post);
          postId = Number(post.id || post[0] || 0);
          blockNumber = Number(post.blockNumber || post[5] || 0);
        }
      });

      // Use blockNumber to efficiently fetch transaction hashes
      // Query events at the specific block number for each post
      const eventMap = new Map<number, string>();
      
      // Skip hash fetching if withHashes is false
      if (posts.length > 0 && withHashes) {
        // Process posts ONE AT A TIME to avoid dRPC batch limits (max 3 requests per batch on free tier)
        // This ensures each request is completely isolated and not batched
        for (let i = 0; i < posts.length; i++) {
          const post = posts[i];
          
          // Handle both array and object formats
          let postId: number;
          let blockNumber: number;
          
          if (isArrayLikePost(post)) {
            postId = Number(post[0]);
            blockNumber = Number(post[5]);
          } else if (post && typeof post === 'object' && 'blockNumber' in post) {
            postId = Number(post.id);
            blockNumber = Number(post.blockNumber);
          } else {
            postId = Number(post.id || post[0] || 0);
            blockNumber = Number(post.blockNumber || post[5] || 0);
          }
          
          // Skip if no blockNumber
          if (!blockNumber || blockNumber === 0) {
            console.error(`[SDK] ❌ Post ${postId} has no blockNumber! Skipping.`);
            continue;
          }
          
          console.log(`[SDK] [${i + 1}/${posts.length}] Fetching tx hash for post ${postId} using blockNumber ${blockNumber}`);
          
          try {
            // Delay before each post to ensure no batching (500ms between posts)
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Get current block to detect if blockNumber seems incorrect
            const currentBlock = await this.provider.getBlockNumber();
            const currentBlockNum = Number(currentBlock);
            
            // Delay after getBlockNumber to ensure it's not batched
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // If blockNumber is way too old (more than 100k blocks ago), it's likely incorrect
            let fromBlock: number;
            let toBlock: number;
            
            if (blockNumber < currentBlockNum - 100000) {
              console.warn(`[SDK] Post ${postId}: blockNumber ${blockNumber} seems incorrect (current block: ${currentBlockNum}). Trying recent blocks instead.`);
              fromBlock = Math.max(0, currentBlockNum - 10000);
              toBlock = currentBlockNum;
            } else {
              // Small range around the blockNumber (±5 blocks)
              fromBlock = Math.max(0, blockNumber - 5);
              toBlock = blockNumber + 5;
            }
            
            console.log(`[SDK] Post ${postId}: Querying events from block ${fromBlock} to ${toBlock} (around ${blockNumber})`);
            
            // Delay before queryFilter to ensure no batching
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Strategy 1: Query all PostCreated events in the range
            const filterAll = this.contract.filters.PostCreated();
            let events = await this.contract.queryFilter(filterAll, fromBlock, toBlock);
            
            // Delay after queryFilter to ensure request completes
            await new Promise(resolve => setTimeout(resolve, 300));
            
            console.log(`[SDK] Post ${postId}: Found ${events.length} total events in range [${fromBlock}, ${toBlock}]`);
            
            // Filter manually by postId
            const matchingEvents = events.filter((event: any) => {
              if ('args' in event && event.args && 'id' in event.args) {
                return Number(event.args.id) === postId;
              }
              return false;
            });
            
            console.log(`[SDK] Post ${postId}: ${matchingEvents.length} matching events after filtering`);
            
            if (matchingEvents.length > 0) {
              // Take the event closest to the expected blockNumber
              const event = matchingEvents.reduce((closest: any, current: any) => {
                const closestDiff = Math.abs(closest.blockNumber - blockNumber);
                const currentDiff = Math.abs(current.blockNumber - blockNumber);
                return currentDiff < closestDiff ? current : closest;
              });
              
              // Try different ways to get transactionHash
              let txHash = "";
              const eventAny = event as any;
              if ('transactionHash' in event && event.transactionHash) {
                txHash = event.transactionHash as string;
              } else if (eventAny.transactionHash) {
                txHash = eventAny.transactionHash;
              } else if (eventAny.log && eventAny.log.transactionHash) {
                txHash = eventAny.log.transactionHash;
              } else if (eventAny.hash) {
                txHash = eventAny.hash;
              }
              
              if (txHash) {
                console.log(`[SDK] ✅ Post ${postId}: Found tx hash ${txHash} at block ${event.blockNumber}`);
                eventMap.set(postId, txHash);
                continue; // Move to next post
              }
            }
            
            // Strategy 2: If no events found, try with postId filter
            if (matchingEvents.length === 0) {
              console.log(`[SDK] Post ${postId}: Trying with postId filter...`);
              const filterById = this.contract.filters.PostCreated(postId);
              
              let searchFromBlock = fromBlock;
              let searchToBlock = toBlock;
              
              if (blockNumber < currentBlockNum - 100000) {
                searchFromBlock = Math.max(0, currentBlockNum - 50000);
                searchToBlock = currentBlockNum;
              }
              
              // Query in chunks with delays
              const chunkSize = 10000;
              let foundEvent: any = null;
              
              for (let chunkStart = searchFromBlock; chunkStart <= searchToBlock && !foundEvent; chunkStart += chunkSize) {
                const chunkEnd = Math.min(chunkStart + chunkSize - 1, searchToBlock);
                try {
                  // Delay before each chunk query
                  await new Promise(resolve => setTimeout(resolve, 300));
                  
                  console.log(`[SDK] Post ${postId}: Searching chunk [${chunkStart}, ${chunkEnd}]`);
                  const eventsById = await this.contract.queryFilter(filterById, chunkStart, chunkEnd);
                  
                  // Delay after query
                  await new Promise(resolve => setTimeout(resolve, 300));
                  
                  if (eventsById.length > 0) {
                    foundEvent = eventsById[0];
                    console.log(`[SDK] Post ${postId}: Found event in chunk [${chunkStart}, ${chunkEnd}]`);
                    break;
                  }
                } catch (error: any) {
                  console.warn(`[SDK] Post ${postId}: Error querying chunk [${chunkStart}, ${chunkEnd}]:`, error?.message);
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }
              
              if (foundEvent) {
                const event = foundEvent as any;
                const txHash = ('transactionHash' in event && event.transactionHash) || event.transactionHash || "";
                if (txHash) {
                  console.log(`[SDK] ✅ Post ${postId}: Found tx hash with ID filter: ${txHash} at block ${event.blockNumber}`);
                  eventMap.set(postId, txHash);
                }
              }
            }
          } catch (error: any) {
            console.error(`[SDK] ❌ Error fetching tx hash for post ${postId} at block ${blockNumber}:`, error?.message || error);
            // Wait before continuing to next post
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        console.log(`[SDK] Final: Mapped ${eventMap.size}/${posts.length} transaction hashes`);
      }

      // Convert to SDK Post format
      // Handle both array and object formats from ethers.js
      const postsWithHash = posts.map((post: any) => {
        let postId: number;
        let author: string;
        let title: string;
        let body: string;
        let timestamp: number;
        let blockNumber: number | undefined;
        let deleted: boolean;
        
        if (isArrayLikePost(post)) {
          // [0]=id, [1]=author, [2]=title, [3]=body, [4]=timestamp, [5]=blockNumber, [6]=deleted
          postId = Number(post[0]);
          author = post[1];
          title = post[2];
          body = post[3];
          timestamp = Number(post[4]);
          blockNumber = Number(post[5]) || undefined;
          deleted = post[6] || false;
        } else if (post && typeof post === 'object' && 'blockNumber' in post) {
          postId = Number(post.id);
          author = post.author;
          title = post.title;
          body = post.body;
          timestamp = Number(post.timestamp);
          blockNumber = Number(post.blockNumber) || undefined;
          deleted = post.deleted || false;
        } else {
          // Fallback: try both formats
          postId = Number(post.id || post[0] || 0);
          author = post.author || post[1] || '';
          title = post.title || post[2] || '';
          body = post.body || post[3] || '';
          timestamp = Number(post.timestamp || post[4] || 0);
          blockNumber = Number(post.blockNumber || post[5] || 0) || undefined;
          deleted = post.deleted || post[6] || false;
        }
        
        // Try to get hash from events, fallback to empty string
        const txHash = eventMap.get(postId) || "";
        
        return {
          id: postId,
          author,
          title,
          body,
          timestamp,
          blockNumber,
          transactionHash: txHash,
          deleted,
        };
      });

      return postsWithHash;
    } catch (error) {
      console.error(`[SDK] Error fetching posts from storage:`, error);
      throw error; // No fallback - require new contract with blockNumber
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

      // Get transaction hash using blockNumber
      let txHash = "";
      // Handle both array and object formats
      // ethers.js Result objects have numeric indices but aren't true arrays
      let blockNumber: number;
      let postId: number;
      
      const isArrayLike = Array.isArray(post) || (typeof post === 'object' && post !== null && '0' in post && '5' in post);
      
      if (isArrayLike) {
        // [0]=id, [1]=author, [2]=title, [3]=body, [4]=timestamp, [5]=blockNumber, [6]=deleted
        postId = Number(post[0]);
        blockNumber = Number(post[5]);
      } else if (post && typeof post === 'object' && 'blockNumber' in post) {
        postId = Number(post.id);
        blockNumber = Number(post.blockNumber);
      } else {
        console.error(`[SDK] getPost(${id}): Unknown format, trying both:`, post);
        postId = Number(post.id || post[0] || id);
        blockNumber = Number(post.blockNumber || post[5] || 0);
      }
      
      console.log(`[SDK] getPost(${id}): Reading blockNumber from contract storage = ${blockNumber}`);
      
      // New contract requires blockNumber - if missing, this is an old blog contract
      if (!blockNumber || blockNumber === 0) {
        console.error(`[SDK] ❌ getPost(${id}): No blockNumber! This blog was created with an old contract version. Please create a new blog with the updated factory.`);
        return null; // Return null instead of post without txHash
      } else {
        try {
          // Get current block to detect if blockNumber seems incorrect
          const currentBlock = await this.provider.getBlockNumber();
          const currentBlockNum = Number(currentBlock);
          
          // If blockNumber is way too old (more than 100k blocks ago), it's likely incorrect
          // Try a wider range around the current block instead
          let fromBlock: number;
          let toBlock: number;
          
          if (blockNumber < currentBlockNum - 100000) {
            console.warn(`[SDK] getPost(${id}): blockNumber ${blockNumber} seems incorrect (current block: ${currentBlockNum}). Trying recent blocks instead.`);
            // Try last 10k blocks as fallback
            fromBlock = Math.max(0, currentBlockNum - 10000);
            toBlock = currentBlockNum;
          } else {
            // Some RPCs don't return events when querying a single block
            // Try a small range around the blockNumber (±5 blocks should be safe)
            fromBlock = Math.max(0, blockNumber - 5);
            toBlock = blockNumber + 5;
          }
          
          console.log(`[SDK] getPost(${id}): Fetching events in range [${fromBlock}, ${toBlock}] around block ${blockNumber}`);
          
          // Strategy 1: Query all PostCreated events in the range
          const filterAll = this.contract.filters.PostCreated();
          const events = await this.contract.queryFilter(filterAll, fromBlock, toBlock);
          
          console.log(`[SDK] getPost(${id}): Found ${events.length} total events in range`);
          
          // Filter by postId manually
          const matchingEvents = events.filter((event: any) => {
            if ('args' in event && event.args && 'id' in event.args) {
              const eventPostId = Number(event.args.id);
              const matches = eventPostId === id;
              if (matches) {
                console.log(`[SDK] getPost(${id}): Found matching event at block ${event.blockNumber}, expected ${blockNumber}`);
              }
              return matches;
            }
            return false;
          });
          
          console.log(`[SDK] getPost(${id}): ${matchingEvents.length} matching events`);
          
          if (matchingEvents.length > 0) {
            // Take the event closest to the expected blockNumber
            const event = matchingEvents.reduce((closest: any, current: any) => {
              const closestDiff = Math.abs(closest.blockNumber - blockNumber);
              const currentDiff = Math.abs(current.blockNumber - blockNumber);
              return currentDiff < closestDiff ? current : closest;
            });
            
            console.log(`[SDK] getPost(${id}): Event at block ${event.blockNumber}:`, {
              hasTransactionHash: 'transactionHash' in event,
              transactionHash: event.transactionHash,
            });
            
            txHash = ('transactionHash' in event && event.transactionHash) || event.transactionHash || "";
            if (txHash) {
              console.log(`[SDK] ✅ getPost(${id}): Found tx hash ${txHash} at block ${event.blockNumber}`);
            }
          }
          
          // Strategy 2: If no events found, try with postId filter and wider search
          if (!txHash && blockNumber < currentBlockNum - 100000) {
            console.log(`[SDK] getPost(${id}): Trying with postId filter and wider search range...`);
            const filterById = this.contract.filters.PostCreated(id);
            
            // Search in chunks to respect RPC limits (10k blocks per chunk)
            const chunkSize = 10000;
            const searchFromBlock = Math.max(0, currentBlockNum - 50000); // Last 50k blocks
            const searchToBlock = currentBlockNum;
            let foundEvent: any = null;
            
            for (let chunkStart = searchFromBlock; chunkStart <= searchToBlock && !foundEvent; chunkStart += chunkSize) {
              const chunkEnd = Math.min(chunkStart + chunkSize - 1, searchToBlock);
              try {
                console.log(`[SDK] getPost(${id}): Searching chunk [${chunkStart}, ${chunkEnd}]`);
                const eventsById = await this.contract.queryFilter(filterById, chunkStart, chunkEnd);
                
                if (eventsById.length > 0) {
                  foundEvent = eventsById[0];
                  console.log(`[SDK] getPost(${id}): Found event in chunk [${chunkStart}, ${chunkEnd}]`);
                  break;
                }
                // Small delay between chunk queries to avoid dRPC batch limits
                await new Promise(resolve => setTimeout(resolve, 200));
              } catch (error: any) {
                console.warn(`[SDK] getPost(${id}): Error querying chunk [${chunkStart}, ${chunkEnd}]:`, error?.message);
                // Wait a bit before retrying next chunk to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 500));
                // Continue to next chunk
              }
            }
            
            if (foundEvent) {
              const event = foundEvent as any;
              txHash = ('transactionHash' in event && event.transactionHash) || event.transactionHash || "";
              if (txHash) {
                console.log(`[SDK] ✅ getPost(${id}): Found tx hash with ID filter: ${txHash} at block ${event.blockNumber}`);
              }
            }
          }
        } catch (error: any) {
          console.error(`[SDK] ❌ getPost(${id}): Error:`, error?.message || error);
        }
      }

      // Handle both array and object formats when returning
      if (isArrayLikePost(post)) {
        // [0]=id, [1]=author, [2]=title, [3]=body, [4]=timestamp, [5]=blockNumber, [6]=deleted
        return {
          id: Number(post[0]),
          author: post[1],
          title: post[2],
          body: post[3],
          timestamp: Number(post[4]),
          blockNumber: Number(post[5]) || undefined,
          transactionHash: txHash,
          deleted: post[6] || false,
        };
      } else if (post && typeof post === 'object' && 'blockNumber' in post) {
        return {
          id: Number(post.id),
          author: post.author,
          title: post.title,
          body: post.body,
          timestamp: Number(post.timestamp),
          blockNumber: Number(post.blockNumber) || undefined,
          transactionHash: txHash,
          deleted: post.deleted || false,
        };
      } else {
        // Fallback: try both formats
        return {
          id: Number(post.id || post[0] || 0),
          author: post.author || post[1] || '',
          title: post.title || post[2] || '',
          body: post.body || post[3] || '',
          timestamp: Number(post.timestamp || post[4] || 0),
          blockNumber: Number(post.blockNumber || post[5] || 0) || undefined,
          transactionHash: txHash,
          deleted: post.deleted || post[6] || false,
        };
      }
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

