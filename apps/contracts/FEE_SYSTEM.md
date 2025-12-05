# DexBlog Fee System Explained

## Overview

The BlogFactory uses a **flexible fee system** where:
- ✅ **Factory deployer pays ZERO fees** (only deployment gas)
- ✅ **Users pay setup fee** when creating blogs
- ✅ **Fees are collected** in the factory contract
- ✅ **Owner can withdraw** collected fees anytime
- ✅ **Fee can be changed dynamically** by owner
- ✅ **Factory ownership can be transferred** by owner

---

## How It Works

### 1. Factory Deployment (One-Time Cost)

```solidity
// You deploy the factory ONCE
BlogFactory factory = new BlogFactory(0.02 ether); // ~$50 setup fee

// Cost: ~2.5M gas (~$0.50 on Base)
// You pay: Only gas fees, NO setup fee
```

**The factory deployer never pays setup fees** - they only pay gas to deploy the contract.

### 2. Users Create Blogs (They Pay the Fee)

```solidity
// User calls createBlog() and pays the setup fee
factory.createBlog{value: 0.02 ether}("My Blog");

// Fee goes to: factory contract balance
// Factory owner can withdraw later
```

### 3. Fee Collection Flow

```
User → createBlog() → Pays setupFee → Factory Contract Balance
                                              ↓
                                    Owner withdraws via withdraw()
```

---

## Owner Functions (Owner-Only)

### Change Setup Fee

```solidity
// Set to FREE (no fee)
factory.setSetupFee(0);

// Set to $50 equivalent
factory.setSetupFee(0.02 ether);

// Set to any amount
factory.setSetupFee(1000000000000000); // 0.001 ETH
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
factory.withdraw(); // Sends all ETH to factoryOwner
```

**Who can call:** Only `factoryOwner`

**What it does:** Transfers entire contract balance to owner

---

## Fee Scenarios

### Scenario 1: Free Blog Creation

```solidity
// Deploy with 0 fee
BlogFactory factory = new BlogFactory(0);

// Users create blogs for FREE
factory.createBlog{value: 0}("Free Blog"); // ✅ Works!
```

### Scenario 2: Start Free, Add Fee Later

```solidity
// Deploy free
BlogFactory factory = new BlogFactory(0);

// Later, owner adds fee
factory.setSetupFee(0.02 ether);

// Now users must pay
factory.createBlog{value: 0.02 ether}("Paid Blog");
```

### Scenario 3: Start Paid, Make Free Later

```solidity
// Deploy with fee
BlogFactory factory = new BlogFactory(0.02 ether);

// Later, owner removes fee
factory.setSetupFee(0);

// Now free!
factory.createBlog{value: 0}("Now Free Blog");
```

### Scenario 4: Change Fee Amount

```solidity
// Start at $50
factory.setSetupFee(0.02 ether);

// Change to $10
factory.setSetupFee(0.004 ether);

// Change to $100
factory.setSetupFee(0.04 ether);
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
BlogFactory factory = new BlogFactory(0.02 ether);

// 2. Users create blogs (they pay $50 each)
factory.createBlog{value: 0.02 ether}("Blog 1");
factory.createBlog{value: 0.02 ether}("Blog 2");
// Factory now has 0.04 ETH

// 3. You withdraw fees
factory.withdraw(); // You receive 0.04 ETH

// 4. You change fee to FREE
factory.setSetupFee(0);

// 5. More users create blogs for FREE
factory.createBlog{value: 0}("Free Blog");

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
// Check current fee
const fee = await factory.getSetupFee();
console.log(`Current fee: ${ethers.formatEther(fee)} ETH`);

// Owner can change fee (requires signer)
await factory.setSetupFee(ethers.parseEther("0.02"));

// Listen for fee changes
factory.on("SetupFeeChanged", (oldFee, newFee) => {
  console.log(`Fee changed: ${ethers.formatEther(oldFee)} → ${ethers.formatEther(newFee)}`);
});
```


