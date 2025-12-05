import { expect } from "chai";
import { ethers } from "hardhat";
import { Blog, BlogFactory } from "../typechain-types";

describe("Deploy Blog Test", function () {
  let blogFactory: BlogFactory;
  let deployer: any;

  beforeEach(async function () {
    [deployer] = await ethers.getSigners();

    // Deploy BlogFactory
    const BlogFactory = await ethers.getContractFactory("BlogFactory");
    blogFactory = await BlogFactory.deploy(
      ethers.ZeroAddress, // paymentToken (zero address for testing)
      ethers.parseUnits("0", 6) // setupFeeStable = 0
    ) as BlogFactory;
    await blogFactory.waitForDeployment();
  });

  it("Should create a blog successfully", async function () {
    console.log("\n[TEST] Creating blog...");
    
    const tx = await blogFactory.connect(deployer).createBlogAsOwner("Test Blog");
    console.log("[TEST] Transaction sent, waiting for receipt...");
    
    const receipt = await tx.wait();
    console.log("[TEST] Transaction confirmed!");
    console.log("[TEST] Gas used:", receipt?.gasUsed.toString());
    
    // Get blog address from event
    const event = receipt?.logs.find((log: any) => {
      try {
        const parsed = blogFactory.interface.parseLog(log);
        return parsed?.name === "BlogCreated";
      } catch {
        return false;
      }
    });
    
    expect(event).to.not.be.undefined;
    
    if (event) {
      const parsed = blogFactory.interface.parseLog(event);
      const blogAddress = parsed?.args[1];
      console.log("[TEST] Blog created at:", blogAddress);
      
      // Verify blog exists
      const Blog = await ethers.getContractFactory("Blog");
      const blog = Blog.attach(blogAddress) as Blog;
      const name = await blog.name();
      const owner = await blog.owner();
      
      expect(name).to.equal("Test Blog");
      expect(owner).to.equal(deployer.address);
      
      console.log("[TEST] ✅ Blog verified successfully!");
    }
  });
});

