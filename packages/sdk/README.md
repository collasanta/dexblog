# DexBlog SDK

A TypeScript SDK for interacting with DexBlog decentralized blogging contracts on Ethereum and L2 networks.

## Features

- 📝 **Read & Write Posts**: Publish, edit, and delete blog posts on-chain
- 🏭 **Factory Support**: Create new blogs through the factory contract
- ⚡ **Fast Loading**: Optimized post fetching with pagination support
- 🔗 **Transaction Hashes**: Automatically fetch transaction hashes for all posts
- 🌐 **Multi-Chain**: Support for Arbitrum, Base, Optimism, BNB Chain, and more
- 💰 **USDC Payments**: Factory uses USDC for blog creation fees
- 📦 **TypeScript**: Full TypeScript support with type definitions

## Installation

```bash
npm install dex-blog-sdk ethers
# or
yarn add dex-blog-sdk ethers
# or
pnpm add dex-blog-sdk ethers
```

## Quick Start

### Reading Posts

```typescript
import { getBlog } from "dex-blog-sdk";
import { ethers } from "ethers";

// Get a blog instance
const blog = getBlog(
  "0x...", // Blog contract address
  42161,   // Chain ID (Arbitrum)
  {
    rpcUrl: "https://arbitrum.drpc.org" // Optional: uses default if not provided
  }
);

// Get all posts
const posts = await blog.getPosts();

// Get posts without transaction hashes (faster)
const postsFast = await blog.getPosts({ withHashes: false });

// Get posts with pagination
const paginatedPosts = await blog.getPosts({
  offset: 0,
  limit: 10,
  includeDeleted: false
});

// Get a single post
const post = await blog.getPost(0);

// Get blog info
const info = await blog.getInfo();
console.log(info.name, info.owner, info.postCount);
```

### Publishing Posts

```typescript
import { getBlog } from "dex-blog-sdk";
import { ethers } from "ethers";

// Connect with a signer (MetaMask, WalletConnect, etc.)
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const blog = getBlog(
  "0x...", // Blog contract address
  42161,   // Chain ID
  { signer }
);

// Publish a new post
const result = await blog.publish(
  "My First Post",
  "# Hello World\n\nThis is my first decentralized blog post!"
);

console.log("Post ID:", result.postId);
console.log("Transaction hash:", result.receipt.hash);

// Edit a post
await blog.editPost(0, "Updated Title", "Updated content");

// Delete a post
await blog.deletePost(0);
```

### Creating a New Blog

```typescript
import { getFactory } from "dex-blog-sdk";
import { ethers } from "ethers";

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Get factory instance
const factory = getFactory(42161, { signer }); // Arbitrum

// Check if blog creation is free
const isFree = await factory.isFree();

if (isFree) {
  // Create blog as factory owner (free)
  const result = await factory.createBlogAsOwner("My Blog Name");
  console.log("New blog address:", result.blogAddress);
} else {
  // Get setup fee (in USDC for most chains)
  const setupFee = await factory.getSetupFee();
  
  // IMPORTANT: Approve USDC spending BEFORE creating the blog
  // The factory contract uses USDC as payment token (not ETH)
  // You need the USDC contract address for your chain
  const usdcAddress = "0x..."; // USDC address for Arbitrum
  const usdcAbi = ["function approve(address spender, uint256 amount) external returns (bool)"];
  const usdc = new ethers.Contract(usdcAddress, usdcAbi, signer);
  
  // Approve the factory to spend USDC
  await usdc.approve(factory.address, setupFee);
  
  // Create blog (no ETH value needed - USDC is transferred via ERC20)
  const result = await factory.createBlog("My Blog Name");
  console.log("New blog address:", result.blogAddress);
}
```

## API Reference

### `DexBlog`

#### Constructor

```typescript
new DexBlog(config: DexBlogConfig)
```

**Config:**
- `address: string` - Blog contract address
- `chainId: number` - Chain ID
- `provider?: ethers.Provider` - Provider for read operations
- `signer?: ethers.Signer` - Signer for write operations

#### Methods

##### `getInfo(): Promise<BlogInfo>`

Get blog information including owner, name, and post count.

```typescript
const info = await blog.getInfo();
// { address, owner, name, postCount }
```

##### `getPosts(options?): Promise<Post[]>`

Get posts from the blog.

**Options:**
- `offset?: number` - Starting index (default: 0)
- `limit?: number` - Number of posts to fetch (default: all)
- `includeDeleted?: boolean` - Include deleted posts (default: false)
- `withHashes?: boolean` - Fetch transaction hashes (default: true)

```typescript
// Get all posts
const posts = await blog.getPosts();

// Get first 10 posts without hashes (faster)
const posts = await blog.getPosts({ 
  limit: 10, 
  withHashes: false 
});

// Get posts 10-20
const posts = await blog.getPosts({ 
  offset: 10, 
  limit: 10 
});
```

##### `getPostsWithoutHashes(options?): Promise<Post[]>`

Get posts without fetching transaction hashes (faster, ~300ms).

**Options:**
- `offset?: number` - Starting index (default: 0)
- `limit?: number` - Number of posts to fetch (default: all)
- `includeDeleted?: boolean` - Include deleted posts (default: false)

##### `getPost(id: number, includeDeleted?: boolean): Promise<Post | null>`

Get a single post by ID.

##### `publish(title: string, body: string): Promise<PublishPostResult>`

Publish a new post. Requires signer.

**Returns:**
- `receipt: TransactionReceipt` - Transaction receipt
- `postId: number` - ID of the newly created post

**Limits:**
- Title: max 500 bytes
- Body: max 50,000 bytes

```typescript
const result = await blog.publish("My Post", "Content");
console.log("Post ID:", result.postId);
console.log("Tx hash:", result.receipt.hash);
```

##### `editPost(id: number, newTitle: string, newBody: string): Promise<TransactionReceipt>`

Edit an existing post. Requires signer.

##### `deletePost(id: number): Promise<TransactionReceipt>`

Delete a post (soft delete). Requires signer.

**Note:** This is a soft delete - the post data remains on-chain but is marked as deleted. Deleted posts are excluded from `getPosts()` by default, but can be included by setting `includeDeleted: true`.

```typescript
// Delete a post
const receipt = await blog.deletePost(0);
console.log("Delete transaction hash:", receipt.hash);

// Get posts including deleted ones
const allPosts = await blog.getPosts({ includeDeleted: true });
```

##### `getPostCount(): Promise<number>`

Get the total number of posts.

### `DexBlogFactory`

#### Constructor

```typescript
new DexBlogFactory(config: DexBlogFactoryConfig)
```

**Config:**
- `address: string` - Factory contract address
- `chainId: number` - Chain ID
- `provider?: ethers.Provider` - Provider for read operations
- `signer?: ethers.Signer` - Signer for write operations (required for creating blogs)

#### Methods

##### `createBlog(name: string, overrides?: Overrides): Promise<CreateBlogResult>`

Create a new blog with USDC payment.

**Important:** This method does NOT accept ETH value. USDC must be approved separately before calling this method.

**Steps:**
1. Get the setup fee: `const setupFee = await factory.getSetupFee()`
2. If `setupFee > 0`, approve USDC spending: `await usdc.approve(factory.address, setupFee)`
3. Call `createBlog()` - no ETH value needed

**Parameters:**
- `name: string` - Name for the new blog
- `overrides?: Overrides` - Optional transaction overrides (gas settings only - do NOT include value)

**Returns:**
- `blogAddress: string` - Address of the new blog
- `receipt: TransactionReceipt` - Transaction receipt

**Example:**
```typescript
// First approve USDC (if fee > 0)
const setupFee = await factory.getSetupFee();
if (setupFee > 0n) {
  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, signer);
  await usdc.approve(factory.address, setupFee);
}

// Then create blog (no ETH value)
const result = await factory.createBlog("My Blog");
```

##### `createBlogAsOwner(name: string): Promise<CreateBlogResult>`

Create a new blog as factory owner (free). Requires signer to be factory owner.

##### `getSetupFee(): Promise<bigint>`

Get the current setup fee required to create a blog.

##### `isFree(): Promise<boolean>`

Check if blog creation is free (setup fee is 0).

##### `getAllBlogs(): Promise<string[]>`

Get all blog addresses created through this factory.

##### `getBlogsByOwner(owner: string): Promise<string[]>`

Get all blog addresses created by a specific owner.

##### `totalBlogs(): Promise<number>`

Get the total number of blogs created.

##### `setSetupFee(fee: bigint): Promise<TransactionReceipt>`

Set the setup fee for creating new blogs. Only callable by the factory owner.

**Note:** The fee is in payment token units. For USDC (6 decimals), use `ethers.parseUnits("10", 6)` for 10 USDC.

```typescript
// Set fee to 0.1 USDC (6 decimals)
const fee = ethers.parseUnits("0.1", 6);
const receipt = await factory.setSetupFee(fee);
```

##### `withdraw(): Promise<TransactionReceipt>`

Withdraw all collected payment token (USDC) fees to the factory owner. Only callable by the factory owner.

```typescript
const receipt = await factory.withdraw();
console.log("Withdrawal transaction hash:", receipt.hash);
```

### Helper Functions

#### `getBlog(blogAddress, chainId, options?)`

Get a DexBlog instance with automatic chain configuration.

```typescript
import { getBlog } from "dex-blog-sdk";

const blog = getBlog(
  "0x...", // Blog address
  42161,   // Chain ID
  {
    rpcUrl: "https://arbitrum.drpc.org", // Optional
    signer: signer, // Optional
    provider: provider // Optional
  }
);
```

#### `getFactory(chainId, options?)`

Get a DexBlogFactory instance with automatic chain configuration.

```typescript
import { getFactory } from "dex-blog-sdk";

const factory = getFactory(42161, { signer });
```

#### `getChainConfig(chainId): ChainConfig | null`

Get chain configuration including factory address and RPC URL.

```typescript
import { getChainConfig } from "dex-blog-sdk";

const config = getChainConfig(42161);
// { id, name, factoryAddress, rpcUrl, blockExplorer }
```

#### `isChainSupported(chainId): boolean`

Check if a chain is supported and has a deployed factory.

```typescript
import { isChainSupported } from "dex-blog-sdk";

if (isChainSupported(42161)) {
  // Chain is supported
}
```

## Supported Chains

| Chain | Chain ID | Status |
|-------|----------|--------|
| Arbitrum One | 42161 | ✅ Deployed |
| Arbitrum Sepolia | 421614 | ✅ Deployed (Free) |
| Base | 8453 | ✅ Deployed |
| Optimism | 10 | ✅ Deployed |
| BNB Smart Chain | 56 | ✅ Deployed |
| Ethereum Mainnet | 1 | ⏳ Coming soon |
| Polygon | 137 | ⏳ Coming soon |

## Examples

### React Example

```typescript
import { useEffect, useState } from "react";
import { getBlog } from "dex-blog-sdk";
import { useAccount, useChainId } from "wagmi";

function BlogPosts({ blogAddress }: { blogAddress: string }) {
  const { chainId } = useChainId();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const blog = getBlog(blogAddress, chainId);
        const posts = await blog.getPosts({ withHashes: false });
        setPosts(posts);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, [blogAddress, chainId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.body}</p>
          <small>By {post.author}</small>
        </article>
      ))}
    </div>
  );
}
```

### Next.js Example

```typescript
// app/blog/[address]/page.tsx
import { getBlog } from "dex-blog-sdk";

export default async function BlogPage({ 
  params 
}: { 
  params: { address: string } 
}) {
  const blog = getBlog(params.address, 42161);
  const [info, posts] = await Promise.all([
    blog.getInfo(),
    blog.getPosts({ withHashes: false })
  ]);

  return (
    <div>
      <h1>{info.name}</h1>
      <p>Owner: {info.owner}</p>
      <p>{info.postCount} posts</p>
      
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <div>{post.body}</div>
        </article>
      ))}
    </div>
  );
}
```

### Vanilla JavaScript Example

```javascript
import { getBlog } from "dex-blog-sdk";
import { ethers } from "ethers";

async function displayBlog(blogAddress) {
  // Get blog instance
  const blog = getBlog(blogAddress, 42161);
  
  // Get blog info
  const info = await blog.getInfo();
  console.log(`Blog: ${info.name}`);
  console.log(`Owner: ${info.owner}`);
  console.log(`Posts: ${info.postCount}`);
  
  // Get posts (without hashes for speed)
  const posts = await blog.getPosts({ withHashes: false });
  
  posts.forEach(post => {
    console.log(`\nPost #${post.id}: ${post.title}`);
    console.log(`Author: ${post.author}`);
    console.log(`Content: ${post.body.substring(0, 100)}...`);
  });
}

// Connect wallet and publish
async function publishPost(blogAddress) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  const blog = getBlog(blogAddress, 42161, { signer });
  
  const receipt = await blog.publish(
    "Hello World",
    "This is my first post!"
  );
  
  console.log("Published! Transaction:", receipt.hash);
}
```

## Type Definitions

### `Post`

```typescript
interface Post {
  id: number;
  author: string;
  title: string;
  body: string;
  timestamp: number;
  blockNumber?: number;
  transactionHash: string;
  deleted: boolean;
}
```

### `BlogInfo`

```typescript
interface BlogInfo {
  address: string;
  owner: string;
  name: string;
  postCount: number;
}
```

### `CreateBlogResult`

```typescript
interface CreateBlogResult {
  blogAddress: string;
  receipt: ethers.TransactionReceipt;
}
```

### `PublishPostResult`

```typescript
interface PublishPostResult {
  receipt: ethers.TransactionReceipt;
  postId: number;
}
```

## Performance Tips

1. **Use `getPostsWithoutHashes()`** when you don't need transaction hashes immediately (~300ms vs ~5-10s)
2. **Use pagination** for blogs with many posts
3. **Set `withHashes: false`** in `getPosts()` for faster initial load
4. **Fetch hashes in background** using `getPostHashesBatch()` if needed

## Error Handling

The SDK throws errors for common issues:

```typescript
try {
  const blog = getBlog("0x...", 42161);
  const posts = await blog.getPosts();
} catch (error) {
  if (error.message.includes("not supported")) {
    console.error("Chain not supported");
  } else if (error.message.includes("Signer required")) {
    console.error("Wallet connection required");
  } else {
    console.error("Error:", error);
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Links

- [GitHub Repository](https://github.com/collasanta/dexblog)
- [Documentation](https://github.com/collasanta/dexblog/tree/main/packages/sdk)
- [Example Web App](https://github.com/collasanta/dexblog/tree/main/apps/web)

