import { expect } from "chai";
import { ethers } from "hardhat";
import { Blog } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Blog", function () {
  let blog: Blog;
  let owner: SignerWithAddress;
  let otherAccount: SignerWithAddress;

  beforeEach(async function () {
    [owner, otherAccount] = await ethers.getSigners();
    const Blog = await ethers.getContractFactory("Blog");
    blog = await Blog.deploy(owner.address, "Test Blog");
  });

  describe("Constructor", function () {
    it("should set the owner correctly", async function () {
      expect(await blog.owner()).to.equal(owner.address);
    });

    it("should set the name correctly", async function () {
      expect(await blog.name()).to.equal("Test Blog");
    });

    it("should start with zero posts", async function () {
      expect(await blog.postCount()).to.equal(0);
    });
  });

  describe("Publish", function () {
    it("should publish a post", async function () {
      await blog.publish("Hello World", "This is my first post!");
      expect(await blog.postCount()).to.equal(1);
    });

    it("should publish multiple posts", async function () {
      await blog.publish("Post 1", "Content 1");
      await blog.publish("Post 2", "Content 2");
      await blog.publish("Post 3", "Content 3");
      expect(await blog.postCount()).to.equal(3);
    });

    it("should emit PostCreated event", async function () {
      const tx = blog.publish("Test Title", "Test Body");
      await expect(tx)
        .to.emit(blog, "PostCreated")
        .withArgs(
          0,
          owner.address,
          "Test Title",
          "Test Body",
          await getBlockTimestamp(tx)
        );
    });

    it("should revert when not owner", async function () {
      await expect(
        blog.connect(otherAccount).publish("Hacked", "Content")
      ).to.be.revertedWith("Not owner");
    });

    it("should revert when title too long", async function () {
      const longTitle = "a".repeat(501);
      await expect(blog.publish(longTitle, "Body")).to.be.revertedWith(
        "Title too long"
      );
    });

    it("should revert when body too long", async function () {
      const longBody = "a".repeat(50001);
      await expect(blog.publish("Title", longBody)).to.be.revertedWith(
        "Body too long"
      );
    });

    it("should revert when body empty", async function () {
      await expect(blog.publish("Title", "")).to.be.revertedWith("Body empty");
    });

    it("should allow max title length", async function () {
      const maxTitle = "a".repeat(500);
      await blog.publish(maxTitle, "Body");
      expect(await blog.postCount()).to.equal(1);
    });

    it("should allow max body length", async function () {
      const maxBody = "a".repeat(50000);
      await blog.publish("Title", maxBody);
      expect(await blog.postCount()).to.equal(1);
    });
  });

  describe("Transfer Ownership", function () {
    it("should transfer ownership", async function () {
      await blog.transferOwnership(otherAccount.address);
      expect(await blog.owner()).to.equal(otherAccount.address);
    });

    it("should revert when not owner", async function () {
      await expect(
        blog.connect(otherAccount).transferOwnership(otherAccount.address)
      ).to.be.revertedWith("Not owner");
    });

    it("should revert when transferring to zero address", async function () {
      await expect(
        blog.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("should allow new owner to publish", async function () {
      await blog.transferOwnership(otherAccount.address);
      await blog
        .connect(otherAccount)
        .publish("New Owner Post", "Content from new owner");
      expect(await blog.postCount()).to.equal(1);
    });

    it("should prevent old owner from publishing after transfer", async function () {
      await blog.transferOwnership(otherAccount.address);
      await expect(
        blog.publish("Old Owner Post", "Should fail")
      ).to.be.revertedWith("Not owner");
    });
  });

  describe("Constants", function () {
    it("should have correct MAX_TITLE_LENGTH", async function () {
      expect(await blog.MAX_TITLE_LENGTH()).to.equal(500);
    });

    it("should have correct MAX_BODY_LENGTH", async function () {
      expect(await blog.MAX_BODY_LENGTH()).to.equal(50000);
    });
  });
});

// Helper function to get block timestamp from a transaction
async function getBlockTimestamp(txPromise: Promise<any>): Promise<number> {
  const tx = await txPromise;
  const receipt = await tx.wait();
  const block = await ethers.provider.getBlock(receipt.blockNumber);
  return block!.timestamp;
}




