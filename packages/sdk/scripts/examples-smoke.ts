#!/usr/bin/env tsx
import "dotenv/config";
import { ethers } from "ethers";
import {
  createFallbackProvider,
  getBlog,
  getFactory,
  getFactoryAddress,
  getUsdcAddress,
} from "../src";

type Result = { step: string; ok: boolean; detail?: string };

async function main() {
  const chainId = Number(process.env.EXAMPLE_CHAIN_ID || 42161); // default Arbitrum One
  const blogAddress = process.env.EXAMPLE_BLOG_ADDRESS;
  const ownerAddress = process.env.EXAMPLE_OWNER_ADDRESS;
  const envRpcUrl = process.env.EXAMPLE_RPC_URL;

  const results: Result[] = [];

  // Provider
  const { provider, url } = await createFallbackProvider(chainId, { envRpcUrl });
  results.push({ step: "provider", ok: true, detail: `using ${url}` });

  // Blog read-only flow
  if (blogAddress) {
    const blog = getBlog(blogAddress, chainId, { provider });
    const info = await blog.getInfo();
    const posts = await blog.getPosts({ withHashes: false, limit: 5 });
    results.push({
      step: "blog.read",
      ok: true,
      detail: `name=${info.name}, owner=${info.owner}, posts=${posts.length}`,
    });
  } else {
    results.push({ step: "blog.read", ok: false, detail: "EXAMPLE_BLOG_ADDRESS not set" });
  }

  // Factory read-only flow
  const factoryAddress = getFactoryAddress(chainId);
  if (factoryAddress && factoryAddress !== "0x0000000000000000000000000000000000000000") {
    const factory = getFactory(chainId, { provider });
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
    } else {
      results.push({
        step: "factory.getBlogsByOwner",
        ok: false,
        detail: "EXAMPLE_OWNER_ADDRESS not set",
      });
    }

    const usdcAddress = getUsdcAddress(chainId);
    results.push({
      step: "factory.usdcAddress",
      ok: Boolean(usdcAddress),
      detail: usdcAddress || "missing USDC address for chain",
    });
  } else {
    results.push({
      step: "factory.read",
      ok: false,
      detail: `No deployed factory for chain ${chainId}`,
    });
  }

  // Report
  const lines = results.map(
    (r) => `${r.ok ? "✅" : "⚠️"} ${r.step}${r.detail ? ` — ${r.detail}` : ""}`
  );
  console.log(lines.join("\n"));
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});

