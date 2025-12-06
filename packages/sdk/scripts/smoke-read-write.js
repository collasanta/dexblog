/* eslint-disable no-console */
const {
  createFallbackProvider,
  getBlog,
  getFactory,
  getFactoryAddress,
  getUsdcAddress,
  getUsdcDecimals,
} = require("../dist/index.js");
const { ethers } = require("ethers");

/**
 * Env vars:
 * - CHAIN_ID (default 42161 Arbitrum One)
 * - RPC_URL (optional override)
 * - PRIVATE_KEY (optional, required for writes)
 * - BLOG_ADDRESS (optional for read; if missing and writes enabled, a new blog will be created)
 * - OWNER_ADDRESS (optional; used for getBlogsByOwner)
 *
 * Run:
 *   pnpm --filter dex-blog-sdk smoke:rw
 *   CHAIN_ID=8453 PRIVATE_KEY=0x... BLOG_ADDRESS=0x... pnpm --filter dex-blog-sdk smoke:rw
 */

async function main() {
  const chainId = Number(process.env.CHAIN_ID || process.env.EXAMPLE_CHAIN_ID || 42161);
  const rpcUrl = process.env.RPC_URL || process.env.EXAMPLE_RPC_URL;
  const pk = process.env.PRIVATE_KEY;
  const blogAddressEnv = process.env.BLOG_ADDRESS || process.env.EXAMPLE_BLOG_ADDRESS;
  const ownerAddress = process.env.OWNER_ADDRESS || process.env.EXAMPLE_OWNER_ADDRESS;

  const results = [];

  // Provider
  const { provider, url } = await createFallbackProvider(chainId, { envRpcUrl: rpcUrl });
  results.push({ step: "provider", ok: true, detail: `using ${url}` });

  // Signer (optional)
  const signer = pk ? new ethers.Wallet(pk, provider) : null;
  if (signer) {
    results.push({ step: "wallet", ok: true, detail: await signer.getAddress() });
  } else {
    results.push({ step: "wallet", ok: false, detail: "PRIVATE_KEY not set (read-only mode)" });
  }

  // Factory read
  const factoryAddress = getFactoryAddress(chainId);
  if (factoryAddress && factoryAddress !== "0x0000000000000000000000000000000000000000") {
    const factory = signer
      ? getFactory(chainId, { signer })
      : getFactory(chainId, { provider });
    const setupFee = await factory.getSetupFee();
    const totalBlogs = await factory.totalBlogs();
    results.push({
      step: "factory.read",
      ok: true,
      detail: `setupFee=${setupFee.toString()}, totalBlogs=${totalBlogs}`,
    });
    if (ownerAddress) {
      const blogsByOwner = await factory.getBlogsByOwner(ownerAddress);
      results.push({
        step: "factory.getBlogsByOwner",
        ok: true,
        detail: `ownerBlogs=${blogsByOwner.length}`,
      });
    }
  } else {
    results.push({ step: "factory.read", ok: false, detail: `No factory deployed for ${chainId}` });
  }

  // Blog read (if provided)
  if (blogAddressEnv) {
    const blog = getBlog(blogAddressEnv, chainId, signer ? { signer } : { provider });
    const info = await blog.getInfo();
    const posts = await blog.getPosts({ withHashes: false, limit: 5 });
    results.push({
      step: "blog.read",
      ok: true,
      detail: `name=${info.name}, owner=${info.owner}, posts=${posts.length}`,
    });
  }

  // Write flow (only if signer)
  if (signer && factoryAddress && factoryAddress !== "0x0000000000000000000000000000000000000000") {
    const factory = getFactory(chainId, { signer });
    const setupFee = await factory.getSetupFee();

    // Approve USDC if needed
    if (setupFee > 0n) {
      const usdcAddress = getUsdcAddress(chainId);
      const usdcDecimals = getUsdcDecimals(chainId) ?? 6;
      if (!usdcAddress) {
        throw new Error("No USDC address for this chain");
      }
      const erc20Abi = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function balanceOf(address owner) view returns (uint256)",
      ];
      const usdc = new ethers.Contract(usdcAddress, erc20Abi, signer);
      const bal = await usdc.balanceOf(signer.address);
      const allowance = await usdc.allowance(signer.address, factoryAddress);
      results.push({
        step: "usdc.balance",
        ok: true,
        detail: `${ethers.formatUnits(bal, usdcDecimals)} USDC`,
      });
      if (bal < setupFee) {
        throw new Error(
          `Insufficient USDC for setup fee. Need ${ethers.formatUnits(
            setupFee,
            usdcDecimals
          )}, have ${ethers.formatUnits(bal, usdcDecimals)}`
        );
      }
      if (allowance < setupFee) {
        const tx = await usdc.approve(factoryAddress, setupFee);
        const rcpt = await tx.wait();
        results.push({ step: "usdc.approve", ok: true, detail: rcpt.hash });
      } else {
        results.push({ step: "usdc.approve", ok: true, detail: "Allowance sufficient" });
      }
    }

    // Create blog (or use existing)
    const targetBlogAddress = blogAddressEnv;
    let createdBlog = null;

    if (targetBlogAddress) {
      results.push({ step: "blog.create", ok: true, detail: `using existing ${targetBlogAddress}` });
    } else {
      const name = `Smoke ${Date.now()}`;
      const createRes = await factory.createBlog(name);
      createdBlog = createRes.blogAddress;
      results.push({
        step: "blog.create",
        ok: true,
        detail: `${createRes.blogAddress} (tx ${createRes.receipt.hash})`,
      });
    }

    const blogAddr = targetBlogAddress || createdBlog;
    const blog = getBlog(blogAddr, chainId, { signer });

    // Publish
    const pub = await blog.publish("Smoke Post", "Hello from smoke test");
    results.push({ step: "post.publish", ok: true, detail: `id=${pub.postId} tx=${pub.receipt.hash}` });

    // Edit
    const edit = await blog.editPost(pub.postId, "Smoke Post (edited)", "Hello updated");
    results.push({ step: "post.edit", ok: true, detail: edit.hash });

    // Delete
    const del = await blog.deletePost(pub.postId);
    results.push({ step: "post.delete", ok: true, detail: del.hash });

    // Read back (include deleted)
    const posts = await blog.getPosts({ includeDeleted: true });
    results.push({ step: "post.readback", ok: true, detail: `count=${posts.length}` });
  }

  // Report
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "⚠️"} ${r.step}${r.detail ? ` — ${r.detail}` : ""}`);
  }
}

main().catch((err) => {
  console.error("Smoke read/write failed:", err);
  process.exit(1);
});


