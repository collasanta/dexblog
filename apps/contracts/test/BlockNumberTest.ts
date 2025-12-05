import { expect } from "chai";
import { ethers } from "hardhat";
import { Blog, BlogFactory } from "../typechain-types";

describe("BlockNumber Test", function () {
  let blogFactory: BlogFactory;
  let blog: Blog;
  let owner: any;
  let deployer: any;

  beforeEach(async function () {
    [deployer, owner] = await ethers.getSigners();

    // Deploy BlogFactory
    // Constructor: (address _paymentToken, uint256 _setupFeeStable)
    const BlogFactory = await ethers.getContractFactory("BlogFactory");
    blogFactory = await BlogFactory.deploy(
      ethers.ZeroAddress, // paymentToken (zero address for testing)
      ethers.parseUnits("0", 6) // setupFeeStable = 0 (USDC has 6 decimals)
    ) as BlogFactory;
    await blogFactory.waitForDeployment();

    // Create a blog using createBlogAsOwner (free) - only factoryOwner can call this
    // The blog will be owned by the caller (deployer in this case)
    const tx = await blogFactory.connect(deployer).createBlogAsOwner("Test Blog");
    const receipt = await tx.wait();
    
    // Get blog address from event
    const event = receipt?.logs.find((log: any) => {
      try {
        const parsed = blogFactory.interface.parseLog(log);
        return parsed?.name === "BlogCreated";
      } catch {
        return false;
      }
    });
    
    if (!event) {
      throw new Error("BlogCreated event not found");
    }
    
    const parsed = blogFactory.interface.parseLog(event);
    const blogAddress = parsed?.args[1];
    
    // Get blog contract instance
    const Blog = await ethers.getContractFactory("Blog");
    blog = Blog.attach(blogAddress) as Blog;
    
    // Verify owner
    const blogOwner = await blog.owner();
    console.log(`[TEST] Blog owner: ${blogOwner}`);
    console.log(`[TEST] Deployer address: ${deployer.address}`);
    console.log(`[TEST] Owner address: ${owner.address}`);
  });

  it("Should store correct blockNumber when publishing a post", async function () {
    // Get current block number before publishing
    const blockBefore = await ethers.provider.getBlockNumber();
    console.log(`\n[TEST] Block number before publish: ${blockBefore}`);

    // Publish a post - use deployer since blog is owned by deployer
    const publishTx = await blog.connect(deployer).publish("Test Post", "Test body content");
    const publishReceipt = await publishTx.wait();
    
    // Get block number from transaction receipt
    const txBlockNumber = publishReceipt?.blockNumber;
    console.log(`[TEST] Transaction block number: ${txBlockNumber}`);

    // Get current block number after publishing
    const blockAfter = await ethers.provider.getBlockNumber();
    console.log(`[TEST] Block number after publish: ${blockAfter}`);

    // Read post from contract storage
    const post = await blog.posts(0);
    console.log(`\n[TEST] Post struct from contract:`);
    console.log(`  - id: ${post.id}`);
    console.log(`  - author: ${post.author}`);
    console.log(`  - title: ${post.title}`);
    console.log(`  - body: ${post.body}`);
    console.log(`  - timestamp: ${post.timestamp}`);
    console.log(`  - blockNumber: ${post.blockNumber}`);
    console.log(`  - deleted: ${post.deleted}`);

    // Also try getPost function
    const postFromFunction = await blog.getPost(0);
    console.log(`\n[TEST] Post from getPost(0) function:`);
    console.log(`  - id: ${postFromFunction.id}`);
    console.log(`  - author: ${postFromFunction.author}`);
    console.log(`  - title: ${postFromFunction.title}`);
    console.log(`  - body: ${postFromFunction.body}`);
    console.log(`  - timestamp: ${postFromFunction.timestamp}`);
    console.log(`  - blockNumber: ${postFromFunction.blockNumber}`);
    console.log(`  - deleted: ${postFromFunction.deleted}`);

    // Also try getPostsRange
    const postsFromRange = await blog.getPostsRange(0, 1, false);
    console.log(`\n[TEST] Post from getPostsRange(0, 1, false):`);
    if (postsFromRange.length > 0) {
      const postFromRange = postsFromRange[0];
      console.log(`  - Array length: ${postsFromRange.length}`);
      console.log(`  - Is array: ${Array.isArray(postFromRange)}`);
      console.log(`  - Type: ${typeof postFromRange}`);
      console.log(`  - Keys: ${Object.keys(postFromRange)}`);
      console.log(`  - Raw:`, postFromRange);
      
      // Try accessing as object
      if ('blockNumber' in postFromRange) {
        console.log(`  - blockNumber (object): ${postFromRange.blockNumber}`);
      }
      // Try accessing as array
      if (Array.isArray(postFromRange)) {
        console.log(`  - blockNumber (array[5]): ${postFromRange[5]}`);
      }
    }

    // Verify blockNumber matches transaction block number
    expect(post.blockNumber).to.equal(txBlockNumber);
    expect(postFromFunction.blockNumber).to.equal(txBlockNumber);
    
    // Verify blockNumber is within reasonable range
    expect(post.blockNumber).to.be.gte(blockBefore);
    expect(post.blockNumber).to.be.lte(blockAfter);
    
    console.log(`\n[TEST] ✅ All checks passed!`);
  });
});

