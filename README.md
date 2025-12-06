# DexBlog

Decentralized blogging platform with on-chain storage via events. Deploy your own blog smart contract and publish posts that live forever on the blockchain.

## Architecture

```
dexblog/
├── apps/
│   ├── web/                    # Next.js 14 frontend
│   └── contracts/              # Foundry + Hardhat smart contracts
├── packages/
│   └── sdk/                    # TypeScript SDK (dex-blog-sdk)
├── package.json                # Workspace config
├── turbo.json                  # Turborepo pipeline
└── pnpm-workspace.yaml
```

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+
- Foundry (for Solidity development)

### Installation

```bash
# Install dependencies
pnpm install

# Install Foundry dependencies
cd apps/contracts
forge install
```

### Development

```bash
# Run all apps in development mode
pnpm dev

# Run specific app
pnpm --filter @dexblog/web dev
```

### Testing

#### Foundry Tests (Solidity)

```bash
cd apps/contracts

# Run tests
forge test

# Run tests with verbosity
forge test -vvv

# Run tests with gas report
forge test --gas-report
```

#### Hardhat Tests (TypeScript)

```bash
cd apps/contracts

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
```

### Building

```bash
# Build all packages
pnpm build

# Build SDK only
pnpm --filter dex-blog-sdk build
```

## Smart Contracts

### BlogFactory.sol

Factory contract for deploying individual blogs. Users pay a setup fee (configurable, default ~$50) to create their own Blog contract.

**Key Functions:**
- `createBlog(name)` - Deploy a new Blog contract
- `getBlogsByOwner(owner)` - Get all blogs owned by an address
- `setSetupFee(fee)` - Update the setup fee (owner only)
- `withdraw()` - Withdraw collected fees (owner only)

### Blog.sol

Individual blog contract owned by the deployer. Posts are stored as events for gas efficiency.

**Key Functions:**
- `publish(title, body)` - Publish a new post (owner only)
- `transferOwnership(newOwner)` - Transfer blog ownership

**Limits:**
- Max title length: 500 bytes
- Max body length: 50,000 bytes

## SDK Usage

```typescript
import { DexBlog, DexBlogFactory } from 'dex-blog-sdk';
import { ethers } from 'ethers';

// Connect to a blog
const provider = new ethers.JsonRpcProvider('https://...');
const blog = new DexBlog({
  address: '0x...',
  chainId: 8453,
  provider,
});

// Read posts
const posts = await blog.getPosts();
const info = await blog.getInfo();

// Publish a post (requires signer)
const signer = await provider.getSigner();
const blogWithSigner = new DexBlog({
  address: '0x...',
  chainId: 8453,
  signer,
});
await blogWithSigner.publish('My Title', 'My content in **markdown**');

// Create a new blog via factory
const factory = new DexBlogFactory({
  address: '0x...',
  chainId: 8453,
  signer,
});

// First, approve USDC spending (if fee > 0)
const setupFee = await factory.getSetupFee();
if (setupFee > 0n) {
  const usdcAddress = '0x...'; // USDC address for Base
  const usdcAbi = ['function approve(address spender, uint256 amount) external returns (bool)'];
  const usdc = new ethers.Contract(usdcAddress, usdcAbi, signer);
  await usdc.approve(factory.address, setupFee);
}

// Then create blog (no ETH value needed - USDC is transferred via ERC20)
const { blogAddress } = await factory.createBlog('My Blog');
```

## Deployment

### Deploy Contracts

#### Using Foundry

```bash
cd apps/contracts

# Deploy to Base
forge script script/Deploy.s.sol --broadcast --rpc-url $BASE_RPC_URL --verify

# Deploy to local node
anvil  # Start local node in another terminal
forge script script/Deploy.s.sol --broadcast --rpc-url http://localhost:8545
```

#### Using Hardhat

```bash
cd apps/contracts

# Deploy to Base
npx hardhat run scripts/deploy.ts --network base

# Deploy to local node
npx hardhat node  # Start local node in another terminal
npx hardhat run scripts/deploy.ts --network localhost
```

### Deploy Frontend

The frontend is designed to be deployed on Vercel:

1. Connect your GitHub repo to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`
   - `NEXT_PUBLIC_BASE_RPC_URL` (and other chain RPCs)
3. Deploy

## Supported Chains

- Ethereum Mainnet
- Base
- Polygon
- Arbitrum
- Optimism
- BNB Chain

## Environment Variables

### Contracts (.env)

```
PRIVATE_KEY=
BASE_RPC_URL=
BASESCAN_API_KEY=
# ... see apps/contracts/.env.example
```

### Frontend (.env.local)

```
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=
NEXT_PUBLIC_BASE_RPC_URL=
NEXT_PUBLIC_POLYGON_RPC_URL=
# ... etc
```

## License

MIT



