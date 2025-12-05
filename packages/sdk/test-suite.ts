/**
 * Test Suite for DexBlog SDK
 * 
 * This script tests all major SDK functionality to ensure everything works correctly.
 * Run this after installing the SDK from npm to validate the installation.
 * 
 * Usage:
 *   npx tsx test-suite.ts
 *   or
 *   npm run test:integration
 */

import { getBlog, getFactory, getChainConfig, isChainSupported } from "./src/index";
import { JsonRpcProvider } from "ethers";

// Test configuration
const TEST_CONFIG = {
  // Use Arbitrum Sepolia for testing
  chainId: 421614,
  // Use a known blog address for testing (update this with a real blog address)
  testBlogAddress: "0x60dC36E4C4948Ef73e215c4a80c7A792eeE19E7C",
  // Use public RPC
  rpcUrl: "https://arbitrum-sepolia.drpc.org",
};

let testsPassed = 0;
let testsFailed = 0;
const failures: string[] = [];

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    testsPassed++;
    console.log(`✅ ${name}`);
  } catch (error: any) {
    testsFailed++;
    failures.push(`${name}: ${error.message}`);
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
  }
}

async function runTests() {
  console.log("🧪 DexBlog SDK Test Suite\n");
  console.log(`Testing with chain: ${TEST_CONFIG.chainId}`);
  console.log(`Test blog address: ${TEST_CONFIG.testBlogAddress}\n`);

  // Test 1: Chain configuration
  await test("Chain configuration exists", async () => {
    const config = getChainConfig(TEST_CONFIG.chainId);
    if (!config) {
      throw new Error("Chain configuration not found");
    }
    if (!config.factoryAddress) {
      throw new Error("Factory address not configured");
    }
  });

  // Test 2: Chain support check
  await test("Chain is supported", () => {
    if (!isChainSupported(TEST_CONFIG.chainId)) {
      throw new Error("Chain should be supported");
    }
  });

  // Test 3: Get blog instance (read-only)
  await test("Get blog instance (read-only)", async () => {
    const provider = new JsonRpcProvider(TEST_CONFIG.rpcUrl, TEST_CONFIG.chainId);
    const blog = getBlog(TEST_CONFIG.testBlogAddress, TEST_CONFIG.chainId, {
      provider,
    });

    if (!blog) {
      throw new Error("Blog instance should be created");
    }
  });

  // Test 4: Get blog info
  await test("Get blog info", async () => {
    const provider = new JsonRpcProvider(TEST_CONFIG.rpcUrl, TEST_CONFIG.chainId);
    const blog = getBlog(TEST_CONFIG.testBlogAddress, TEST_CONFIG.chainId, {
      provider,
    });

    const info = await blog.getInfo();
    if (!info.address || !info.owner || !info.name) {
      throw new Error("Blog info should contain address, owner, and name");
    }
    console.log(`   Blog name: ${info.name}`);
    console.log(`   Owner: ${info.owner}`);
    console.log(`   Post count: ${info.postCount}`);
  });

  // Test 5: Get post count
  await test("Get post count", async () => {
    const provider = new JsonRpcProvider(TEST_CONFIG.rpcUrl, TEST_CONFIG.chainId);
    const blog = getBlog(TEST_CONFIG.testBlogAddress, TEST_CONFIG.chainId, {
      provider,
    });

    const count = await blog.getPostCount();
    if (typeof count !== "number" || count < 0) {
      throw new Error("Post count should be a non-negative number");
    }
    console.log(`   Post count: ${count}`);
  });

  // Test 6: Get posts without hashes (fast)
  await test("Get posts without hashes", async () => {
    const provider = new JsonRpcProvider(TEST_CONFIG.rpcUrl, TEST_CONFIG.chainId);
    const blog = getBlog(TEST_CONFIG.testBlogAddress, TEST_CONFIG.chainId, {
      provider,
    });

    const posts = await blog.getPostsWithoutHashes();
    if (!Array.isArray(posts)) {
      throw new Error("Posts should be an array");
    }
    console.log(`   Retrieved ${posts.length} posts`);
    
    if (posts.length > 0) {
      const firstPost = posts[0];
      if (!firstPost.id && firstPost.id !== 0) {
        throw new Error("Post should have an id");
      }
      if (!firstPost.title) {
        throw new Error("Post should have a title");
      }
      if (!firstPost.author) {
        throw new Error("Post should have an author");
      }
    }
  });

  // Test 7: Get posts with pagination
  await test("Get posts with pagination", async () => {
    const provider = new JsonRpcProvider(TEST_CONFIG.rpcUrl, TEST_CONFIG.chainId);
    const blog = getBlog(TEST_CONFIG.testBlogAddress, TEST_CONFIG.chainId, {
      provider,
    });

    const posts = await blog.getPosts({
      offset: 0,
      limit: 5,
      withHashes: false,
    });
    
    if (!Array.isArray(posts)) {
      throw new Error("Posts should be an array");
    }
    if (posts.length > 5) {
      throw new Error("Should respect limit");
    }
    console.log(`   Retrieved ${posts.length} posts with pagination`);
  });

  // Test 8: Get single post
  await test("Get single post", async () => {
    const provider = new JsonRpcProvider(TEST_CONFIG.rpcUrl, TEST_CONFIG.chainId);
    const blog = getBlog(TEST_CONFIG.testBlogAddress, TEST_CONFIG.chainId, {
      provider,
    });

    const post = await blog.getPost(0);
    if (post && (!post.id && post.id !== 0)) {
      throw new Error("Post should have an id");
    }
    if (post) {
      console.log(`   Post 0 title: ${post.title}`);
    } else {
      console.log(`   No post found at index 0 (blog might be empty)`);
    }
  });

  // Test 9: Get factory instance
  await test("Get factory instance", async () => {
    const provider = new JsonRpcProvider(TEST_CONFIG.rpcUrl, TEST_CONFIG.chainId);
    const factory = getFactory(TEST_CONFIG.chainId, {
      provider,
    });

    if (!factory) {
      throw new Error("Factory instance should be created");
    }
  });

  // Test 10: Factory - Get setup fee
  await test("Factory - Get setup fee", async () => {
    const provider = new JsonRpcProvider(TEST_CONFIG.rpcUrl, TEST_CONFIG.chainId);
    const factory = getFactory(TEST_CONFIG.chainId, {
      provider,
    });

    const fee = await factory.getSetupFee();
    if (typeof fee !== "bigint") {
      throw new Error("Setup fee should be a bigint");
    }
    console.log(`   Setup fee: ${fee.toString()}`);
  });

  // Test 11: Factory - Check if free
  await test("Factory - Check if free", async () => {
    const provider = new JsonRpcProvider(TEST_CONFIG.rpcUrl, TEST_CONFIG.chainId);
    const factory = getFactory(TEST_CONFIG.chainId, {
      provider,
    });

    const isFree = await factory.isFree();
    if (typeof isFree !== "boolean") {
      throw new Error("isFree should return a boolean");
    }
    console.log(`   Is free: ${isFree}`);
  });

  // Test 12: Factory - Get total blogs
  await test("Factory - Get total blogs", async () => {
    const provider = new JsonRpcProvider(TEST_CONFIG.rpcUrl, TEST_CONFIG.chainId);
    const factory = getFactory(TEST_CONFIG.chainId, {
      provider,
    });

    const total = await factory.totalBlogs();
    if (typeof total !== "number" || total < 0) {
      throw new Error("Total blogs should be a non-negative number");
    }
    console.log(`   Total blogs: ${total}`);
  });

  console.log("\n" + "=".repeat(50));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);

  if (failures.length > 0) {
    console.log(`\n❌ Failures:`);
    failures.forEach((failure) => {
      console.log(`   - ${failure}`);
    });
    process.exit(1);
  } else {
    console.log(`\n🎉 All tests passed!`);
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

