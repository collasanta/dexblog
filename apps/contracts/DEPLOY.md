# DexBlog Deployment Guide

## Prerequisites

1. **Foundry installed** (already done)
2. **Private key** with ETH on the target chain for gas

## Quick Deploy to Base

### 1. Set your private key

```bash
export PRIVATE_KEY=your_private_key_here_without_0x
```

### 2. Deploy the BlogFactory

```bash
cd apps/contracts

# Deploy with default $50 setup fee (10 USDC with 6 decimals = 10000000)
forge script script/Deploy.s.sol:DeployScript --rpc-url base --broadcast

# Or deploy with FREE blog creation
forge script script/Deploy.s.sol:DeployFreeFactoryScript --rpc-url base --broadcast

# Or deploy with custom fee (in USDC units, e.g., 5 USDC = 5000000)
SETUP_FEE=5000000 forge script script/Deploy.s.sol:DeployWithCustomFeeScript --rpc-url base --broadcast
```

### 3. Verify on BaseScan (optional but recommended)

```bash
forge verify-contract <DEPLOYED_ADDRESS> src/BlogFactory.sol:BlogFactory \
  --chain base \
  --constructor-args $(cast abi-encode "constructor(address,uint256)" <USDC_ADDRESS> 10000000) \
  --etherscan-api-key $BASESCAN_API_KEY
```

## Deploy to Other Chains

Just change the `--rpc-url` parameter:

| Chain | RPC URL |
|-------|---------|
| Base | `base` |
| Polygon | `polygon` |
| Arbitrum | `arbitrum` |
| Optimism | `optimism` |
| Ethereum | `mainnet` |
| BSC | `bsc` |

## After Deployment

1. **Copy the deployed address** from the console output
2. **Update the frontend** in `apps/web/src/lib/contracts.ts`:

```typescript
export const FACTORY_ADDRESSES: Record<number, `0x${string}`> = {
  [base.id]: "0xYOUR_DEPLOYED_ADDRESS_HERE",
  // ... other chains
};
```

3. **Test the deployment**:
```bash
# Check setup fee
cast call <FACTORY_ADDRESS> "setupFee()" --rpc-url base

# Check total blogs
cast call <FACTORY_ADDRESS> "totalBlogs()" --rpc-url base
```

## Setup Fee Options

| Fee | USDC | USD (approx) | Use Case |
|-----|------|---------------|----------|
| Free | 0 | $0 | Testing, community building |
| Low | 5 | ~$5 | Spam prevention |
| Standard | 10 | ~$10 | Monetization |

**Note:** Fees are in USDC (6 decimals). The factory contract uses USDC as the payment token, not ETH. Users must approve USDC spending before creating blogs.

## Gas Costs

Approximate deployment costs:
- **BlogFactory deployment**: ~2.5M gas (~$0.50 on Base)
- **Creating a blog**: ~600K gas (~$0.10 on Base)
- **Publishing a post**: ~50K gas (~$0.01 on Base)



