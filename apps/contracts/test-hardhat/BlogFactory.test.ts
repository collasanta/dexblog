import { expect } from "chai";
import { ethers } from "hardhat";
import { BlogFactory, Blog } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// Mock ERC20 for testing
async function deployMockERC20() {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mock = await MockERC20.deploy();
  return mock;
}

describe("BlogFactory", function () {
  let factory: BlogFactory;
  let mockUSDC: any;
  let factoryOwner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const SETUP_FEE = ethers.parseEther("0.02"); // ~$50 equivalent
  const SETUP_FEE_STABLE = ethers.parseUnits("50", 6); // 50 USDC

  beforeEach(async function () {
    [factoryOwner, user1, user2] = await ethers.getSigners();
    
    // Deploy mock USDC
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20Factory.deploy();
    
    // Mint USDC to users
    await mockUSDC.mint(user1.address, ethers.parseUnits("1000", 6));
    await mockUSDC.mint(user2.address, ethers.parseUnits("1000", 6));
    
    const BlogFactory = await ethers.getContractFactory("BlogFactory");
    factory = await BlogFactory.deploy(
      await mockUSDC.getAddress(),
      SETUP_FEE_STABLE
    );
  });

  describe("Constructor", function () {
    it("should set the factory owner correctly", async function () {
      expect(await factory.factoryOwner()).to.equal(factoryOwner.address);
    });

    it("should set the setup fee correctly", async function () {
      expect(await factory.setupFee()).to.equal(SETUP_FEE_STABLE);
    });

    it("should start with zero blogs", async function () {
      expect(await factory.totalBlogs()).to.equal(0);
    });
  });

  describe("Create Blog", function () {
    it("should create a blog with USDC payment", async function () {
      // Approve USDC first
      await mockUSDC.connect(user1).approve(await factory.getAddress(), SETUP_FEE_STABLE);
      
      const tx = await factory.connect(user1).createBlog("My Blog");
      const receipt = await tx.wait();

      expect(await factory.totalBlogs()).to.equal(1);
      
      // Verify USDC was transferred
      expect(await mockUSDC.balanceOf(await factory.getAddress())).to.equal(SETUP_FEE_STABLE);

      // Get blog address from event
      const event = receipt?.logs.find((log) => {
        try {
          return factory.interface.parseLog(log as any)?.name === "BlogCreated";
        } catch {
          return false;
        }
      });
      const parsedEvent = factory.interface.parseLog(event as any);
      const blogAddress = parsedEvent?.args.blogAddress;

      // Verify blog contract
      const Blog = await ethers.getContractFactory("Blog");
      const blog = Blog.attach(blogAddress) as Blog;
      expect(await blog.owner()).to.equal(user1.address);
      expect(await blog.name()).to.equal("My Blog");
    });

    it("should emit BlogCreated event", async function () {
      await mockUSDC.connect(user1).approve(await factory.getAddress(), SETUP_FEE_STABLE);
      await expect(
        factory.connect(user1).createBlog("My Blog")
      ).to.emit(factory, "BlogCreated");
    });

    it("should create multiple blogs", async function () {
      await mockUSDC.connect(user1).approve(await factory.getAddress(), SETUP_FEE_STABLE * 2n);
      await mockUSDC.connect(user2).approve(await factory.getAddress(), SETUP_FEE_STABLE);
      
      await factory.connect(user1).createBlog("Blog 1");
      await factory.connect(user2).createBlog("Blog 2");
      await factory.connect(user1).createBlog("Blog 3");

      expect(await factory.totalBlogs()).to.equal(3);
      expect(await mockUSDC.balanceOf(await factory.getAddress())).to.equal(SETUP_FEE_STABLE * 3n);
    });

    it("should revert when insufficient USDC approval", async function () {
      await mockUSDC.connect(user1).approve(await factory.getAddress(), SETUP_FEE_STABLE - 1n);
      
      await expect(
        factory.connect(user1).createBlog("My Blog")
      ).to.be.revertedWith("Payment failed");
    });

    it("should revert when no USDC approval", async function () {
      await expect(
        factory.connect(user1).createBlog("My Blog")
      ).to.be.revertedWith("Payment failed");
    });

    it("should work with zero fee factory", async function () {
      const BlogFactory = await ethers.getContractFactory("BlogFactory");
      const freeFactory = await BlogFactory.deploy(
        await mockUSDC.getAddress(),
        0
      );

      await freeFactory.connect(user1).createBlog("Free Blog");
      expect(await freeFactory.totalBlogs()).to.equal(1);
    });
  });

  describe("Get Blogs By Owner", function () {
    it("should return blogs by owner", async function () {
      await mockUSDC.connect(user1).approve(await factory.getAddress(), SETUP_FEE_STABLE * 2n);
      await mockUSDC.connect(user2).approve(await factory.getAddress(), SETUP_FEE_STABLE);
      
      await factory.connect(user1).createBlog("Blog 1");
      await factory.connect(user1).createBlog("Blog 2");
      await factory.connect(user2).createBlog("Blog 3");

      const user1Blogs = await factory.getBlogsByOwner(user1.address);
      const user2Blogs = await factory.getBlogsByOwner(user2.address);

      expect(user1Blogs.length).to.equal(2);
      expect(user2Blogs.length).to.equal(1);
    });

    it("should return empty array for user with no blogs", async function () {
      const blogs = await factory.getBlogsByOwner(user1.address);
      expect(blogs.length).to.equal(0);
    });
  });

  describe("Withdraw", function () {
    it("should withdraw collected USDC fees", async function () {
      await mockUSDC.connect(user1).approve(await factory.getAddress(), SETUP_FEE_STABLE);
      await mockUSDC.connect(user2).approve(await factory.getAddress(), SETUP_FEE_STABLE);
      
      await factory.connect(user1).createBlog("Blog 1");
      await factory.connect(user2).createBlog("Blog 2");

      const balanceBefore = await mockUSDC.balanceOf(factoryOwner.address);

      await factory.withdraw();

      const balanceAfter = await mockUSDC.balanceOf(factoryOwner.address);

      expect(balanceAfter).to.equal(balanceBefore + SETUP_FEE_STABLE * 2n);
      expect(await mockUSDC.balanceOf(await factory.getAddress())).to.equal(0);
    });

    it("should revert when non-owner withdraws", async function () {
      await mockUSDC.connect(user1).approve(await factory.getAddress(), SETUP_FEE_STABLE);
      await factory.connect(user1).createBlog("Blog 1");

      await expect(factory.connect(user1).withdraw()).to.be.revertedWith(
        "Not owner"
      );
    });
  });

  describe("Set Setup Fee", function () {
    it("should update setup fee", async function () {
      const newFee = ethers.parseUnits("20", 6); // 20 USDC
      await factory.setSetupFee(newFee);
      expect(await factory.setupFee()).to.equal(newFee);
    });

    it("should allow setting fee to zero", async function () {
      await factory.setSetupFee(0);
      expect(await factory.setupFee()).to.equal(0);

      await factory.connect(user1).createBlog("Free Blog");
      expect(await factory.totalBlogs()).to.equal(1);
    });

    it("should revert when non-owner sets fee", async function () {
      await expect(
        factory.connect(user1).setSetupFee(ethers.parseUnits("0.1", 6))
      ).to.be.revertedWith("Not owner");
    });
  });

  describe("Transfer Factory Ownership", function () {
    it("should transfer factory ownership", async function () {
      await factory.transferFactoryOwnership(user1.address);
      expect(await factory.factoryOwner()).to.equal(user1.address);
    });

    it("should revert when non-owner transfers", async function () {
      await expect(
        factory.connect(user1).transferFactoryOwnership(user1.address)
      ).to.be.revertedWith("Not owner");
    });

    it("should revert when transferring to zero address", async function () {
      await expect(
        factory.transferFactoryOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("should allow new owner to withdraw", async function () {
      await mockUSDC.connect(user1).approve(await factory.getAddress(), SETUP_FEE_STABLE);
      await factory.connect(user1).createBlog("Blog");
      await factory.transferFactoryOwnership(user2.address);

      const balanceBefore = await mockUSDC.balanceOf(user2.address);

      await factory.connect(user2).withdraw();

      const balanceAfter = await mockUSDC.balanceOf(user2.address);

      expect(balanceAfter).to.equal(balanceBefore + SETUP_FEE_STABLE);
    });
  });

  describe("Create Blog As Owner", function () {
    it("should allow factory owner to create blog for free", async function () {
      const tx = await factory.createBlogAsOwner("Owner Blog");
      const receipt = await tx.wait();
      
      expect(receipt).to.not.be.null;
      expect(await factory.totalBlogs()).to.equal(1);
      
      const blogs = await factory.getBlogsByOwner(factoryOwner.address);
      expect(blogs.length).to.equal(1);
    });

    it("should not require USDC payment for owner", async function () {
      // Owner creates blog without any USDC balance or approval
      const tx = await factory.createBlogAsOwner("Free Owner Blog");
      const receipt = await tx.wait();
      
      expect(receipt).to.not.be.null;
      expect(await factory.totalBlogs()).to.equal(1);
    });

    it("should revert when non-owner calls createBlogAsOwner", async function () {
      await expect(
        factory.connect(user1).createBlogAsOwner("Should Fail")
      ).to.be.revertedWith("Not owner");
    });
  });
});

