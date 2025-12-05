# Blog Posts Loading Flow Analysis

## Current Flow

### 1. Initial Page Load (BlogPage)
```
User visits /blog/[address]
  ↓
useBlog hook initializes
  ↓
Parallel queries start:
  ├─ useReadContract("owner")     [Non-blocking]
  ├─ useReadContract("name")       [Non-blocking]
  ├─ useReadContract("postCount")  [Non-blocking]
  └─ useQuery("posts-basic")       [BLOCKING - waits for SDK.getPosts()]
```

### 2. Posts Loading (useBlog.ts)

#### Query 1: "posts-basic" (BLOCKING)
```typescript
// Line 61-112: useQuery(["posts-basic"])
queryFn: async () => {
  // Creates SDK instance
  const blog = new DexBlog({ address, chainId, provider });
  
  // ⚠️ BLOCKING: This calls SDK.getPosts() which:
  //   1. Calls contract.postCount() - fast
  //   2. Calls contract.getPostsRange() - fast
  //   3. ⚠️ BLOCKS HERE: Loops through ALL posts sequentially:
  //      - For each post: getBlockNumber() + queryFilter() + delays
  //      - 500ms delay between posts
  //      - 300ms delay before/after each queryFilter
  //      - Can take 5-10+ seconds for 4 posts!
  
  const sdkPosts = await blog.getPosts(); // ⚠️ BLOCKS UI
  
  // Returns posts with empty transactionHash
  return sdkPosts.map(post => ({ ...post, transactionHash: "" }));
}
```

**Problem**: Even though we return posts with empty hashes, `blog.getPosts()` still fetches ALL transaction hashes before returning!

#### Query 2: "post-hashes" (Non-blocking, but redundant)
```typescript
// Line 115-163: useQuery(["post-hashes"])
// Only runs AFTER postsWithoutHashes is loaded
// ⚠️ REDUNDANT: Calls blog.getPosts() AGAIN!
// This means we're fetching hashes TWICE!
```

### 3. SDK.getPosts() Flow (DexBlog.ts)

```typescript
async getPosts(): Promise<Post[]> {
  // Step 1: Fast - get count
  const postCount = await contract.postCount();
  
  // Step 2: Fast - get posts from storage
  const posts = await contract.getPostsRange(0, postCount, false);
  
  // Step 3: ⚠️ SLOW - Fetch transaction hashes sequentially
  for (let i = 0; i < posts.length; i++) {
    // 500ms delay before each post (except first)
    if (i > 0) await delay(500);
    
    // Get current block
    await provider.getBlockNumber(); // ~300ms
    await delay(300);
    
    // Query events
    await delay(300);
    await contract.queryFilter(...); // ~500-1000ms per post
    await delay(300);
    
    // If not found, try wider range (even slower)
    // Can take 2-5 seconds per post if searching chunks
  }
  
  return posts with hashes;
}
```

**Timing for 4 posts:**
- Post 1: ~1.5s (no initial delay)
- Post 2: ~2.3s (500ms delay + queries)
- Post 3: ~2.3s
- Post 4: ~2.3s
- **Total: ~8-10 seconds** ⚠️

## Blocking Issues

### ❌ Current Problems:

1. **Query 1 ("posts-basic") blocks UI**
   - Even though we return empty hashes, `blog.getPosts()` still fetches them
   - UI shows loading spinner until ALL hashes are fetched
   - Takes 8-10+ seconds for 4 posts

2. **Redundant fetching**
   - Query 1 calls `blog.getPosts()` (fetches hashes)
   - Query 2 calls `blog.getPosts()` AGAIN (fetches hashes again)
   - We're doing the work twice!

3. **Sequential processing**
   - Each post processed one at a time with delays
   - Cannot parallelize due to dRPC batch limits
   - Very slow for multiple posts

## What Should Happen

### ✅ Ideal Flow:

```
1. Fast query: Get posts from storage (no hashes)
   - contract.postCount() → ~100ms
   - contract.getPostsRange() → ~200ms
   - Total: ~300ms
   - Returns posts immediately with empty hashes

2. Background query: Fetch hashes one by one
   - Runs AFTER posts are displayed
   - Updates UI progressively as hashes arrive
   - Non-blocking, user can interact with posts
```

## Solution Needed

1. **Create `getPostsWithoutHashes()` in SDK**
   - Only reads from contract storage
   - Does NOT fetch transaction hashes
   - Returns immediately (~300ms)

2. **Create `getPostHash(postId, blockNumber)` in SDK**
   - Fetches hash for a single post
   - Can be called individually for each post
   - Allows progressive loading

3. **Update useBlog hook**
   - Query 1: Use `getPostsWithoutHashes()` → Fast, non-blocking
   - Query 2: Loop through posts, call `getPostHash()` for each → Progressive updates

4. **Update UI**
   - Show posts immediately (with skeleton for hashes)
   - Update each hash as it arrives
   - No blocking spinner

