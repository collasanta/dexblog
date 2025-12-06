# DexBlog Fee System Explained

## Overview

The BlogFactory uses a **flexible fee system** with **USDC payments** where:
- ✅ **Factory deployer pays ZERO fees** (only deployment gas)
- ✅ **Users pay setup fee in USDC** when creating blogs (via ERC20 approve + transferFrom)
- ✅ **Fees are collected in USDC** in the factory contract
- ✅ **Owner can withdraw** collected USDC fees anytime
- ✅ **Fee can be changed dynamically** by owner
- ✅ **Factory ownership can be transferred** by owner
- ⚠️ **Important:** `createBlog()` does NOT accept ETH value - USDC must be approved separately

---

## How It Works

### 1. Factory Deployment (One-Time Cost)

```solidity
// You deploy the factory ONCE
// Constructor takes payment token address and setup fee in payment token units
BlogFactory factory = new BlogFactory(usdcAddress, 10000000); // 10 USDC (6 decimals)

// Cost: ~2.5M gas (~$0.50 on Base)
// You pay: Only gas fees, NO setup fee
```

**The factory deployer never pays setup fees** - they only pay gas to deploy the contract.

### 2. Users Create Blogs (They Pay the Fee)

```solidity
// User must first approve USDC spending
usdc.approve(factoryAddress, setupFee);

// Then user calls createBlog() - no ETH value needed
// USDC is transferred via ERC20 transferFrom
factory.createBlog("My Blog");

// Fee goes to: factory contract USDC balance
// Factory owner can withdraw later
```

### 3. Fee Collection Flow

```
User → Approve USDC → createBlog() → USDC transferFrom → Factory Contract USDC Balance
                                                                    ↓
                                                      Owner withdraws via withdraw()
```

---

## Owner Functions (Owner-Only)

### Change Setup Fee

```solidity
// Set to FREE (no fee)
factory.setSetupFee(0);

// Set to 10 USDC (6 decimals)
factory.setSetupFee(10000000); // 10 * 10^6

// Set to any amount (in payment token units)
factory.setSetupFee(5000000); // 5 USDC
```

**Who can call:** Only `factoryOwner`

**Event emitted:** `SetupFeeChanged(oldFee, newFee)`

### Transfer Factory Ownership

```solidity
factory.transferFactoryOwnership(newOwnerAddress);
```

**Who can call:** Only current `factoryOwner`

**Event emitted:** `FactoryOwnershipTransferred(oldOwner, newOwner)`

**After transfer:**
- New owner can change fees
- New owner can withdraw funds
- New owner can transfer ownership again
- Old owner loses all permissions

### Withdraw Collected Fees

```solidity
factory.withdraw(); // Sends all USDC to factoryOwner
```

**Who can call:** Only `factoryOwner`

**What it does:** Transfers entire USDC balance to owner

---

## Fee Scenarios

### Scenario 1: Free Blog Creation

```solidity
// Deploy with 0 fee
BlogFactory factory = new BlogFactory(usdcAddress, 0);

// Users create blogs for FREE (no approval needed)
factory.createBlog("Free Blog"); // ✅ Works!
```

### Scenario 2: Start Free, Add Fee Later

```solidity
// Deploy free
BlogFactory factory = new BlogFactory(usdcAddress, 0);

// Later, owner adds fee (10 USDC)
factory.setSetupFee(10000000); // 10 * 10^6

// Now users must approve and pay
usdc.approve(factoryAddress, 10000000);
factory.createBlog("Paid Blog");
```

### Scenario 3: Start Paid, Make Free Later

```solidity
// Deploy with fee
BlogFactory factory = new BlogFactory(usdcAddress, 10000000); // 10 USDC

// Later, owner removes fee
factory.setSetupFee(0);

// Now free! (no approval needed)
factory.createBlog("Now Free Blog");
```

### Scenario 4: Change Fee Amount

```solidity
// Start at 10 USDC
factory.setSetupFee(10000000); // 10 * 10^6

// Change to 5 USDC
factory.setSetupFee(5000000); // 5 * 10^6

// Change to 20 USDC
factory.setSetupFee(20000000); // 20 * 10^6
```

---

## Security & Permissions

| Function | Who Can Call | What It Does |
|----------|--------------|--------------|
| `createBlog()` | Anyone | Creates blog, pays fee |
| `setSetupFee()` | Owner only | Changes setup fee |
| `transferFactoryOwnership()` | Owner only | Transfers ownership |
| `withdraw()` | Owner only | Withdraws collected fees |
| `getRecentBlogs()` | Anyone | Reads blog list |
| `totalBlogs()` | Anyone | Reads total count |

---

## Example: Complete Lifecycle

```solidity
// 1. You deploy factory (you pay ~$0.50 gas)
BlogFactory factory = new BlogFactory(usdcAddress, 10000000); // 10 USDC

// 2. Users create blogs (they pay 10 USDC each)
// User must approve first:
usdc.approve(factoryAddress, 10000000);
factory.createBlog("Blog 1");
usdc.approve(factoryAddress, 10000000);
factory.createBlog("Blog 2");
// Factory now has 20 USDC

// 3. You withdraw fees
factory.withdraw(); // You receive 20 USDC

// 4. You change fee to FREE
factory.setSetupFee(0);

// 5. More users create blogs for FREE (no approval needed)
factory.createBlog("Free Blog");

// 6. You transfer ownership to DAO
factory.transferFactoryOwnership(daoAddress);
// DAO now controls the factory
```

---

## Gas Costs

| Action | Gas Cost | Cost on Base (~$0.0002/gas) |
|--------|----------|----------------------------|
| Deploy Factory | ~2.5M | ~$0.50 |
| Create Blog | ~600K | ~$0.12 |
| Set Setup Fee | ~15K | ~$0.003 |
| Transfer Ownership | ~15K | ~$0.003 |
| Withdraw | ~21K | ~$0.004 |

---

## Best Practices

1. **Start with FREE** to build community, add fee later if needed
2. **Monitor factory balance** and withdraw periodically
3. **Use events** (`SetupFeeChanged`, `FactoryOwnershipTransferred`) for transparency
4. **Consider multi-sig** for factory ownership in production
5. **Document fee changes** on your website/frontend

---

## Frontend Integration

```typescript
import { ethers } from "ethers";

// Check current fee (in USDC units)
const fee = await factory.getSetupFee();
console.log(`Current fee: ${ethers.formatUnits(fee, 6)} USDC`); // USDC has 6 decimals

// Owner can change fee (requires signer)
await factory.setSetupFee(ethers.parseUnits("10", 6)); // 10 USDC

// Before creating blog, user must approve USDC
const usdcAddress = "0x..."; // USDC address for the chain
const usdcAbi = ["function approve(address spender, uint256 amount) external returns (bool)"];
const usdc = new ethers.Contract(usdcAddress, usdcAbi, signer);
await usdc.approve(factory.address, fee);

// Then create blog (no ETH value)
const result = await factory.createBlog("My Blog");

// Listen for fee changes
factory.on("SetupFeeChanged", (oldFee, newFee) => {
  console.log(`Fee changed: ${ethers.formatUnits(oldFee, 6)} → ${ethers.formatUnits(newFee, 6)} USDC`);
});
```



