#!/bin/bash

# Test script for local deployment and testing
set -e

RPC_URL="http://localhost:8545"
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
SETUP_FEE="20000000000000000" # 0.02 ETH

echo "🚀 Deploying BlogFactory to local Anvil..."

# Deploy factory
FACTORY_OUTPUT=$(forge create src/BlogFactory.sol:BlogFactory \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --constructor-args $SETUP_FEE \
  --broadcast \
  --json)

FACTORY_ADDRESS=$(echo $FACTORY_OUTPUT | jq -r '.deployedTo')

if [ "$FACTORY_ADDRESS" == "null" ] || [ -z "$FACTORY_ADDRESS" ]; then
  echo "❌ Deployment failed"
  echo "$FACTORY_OUTPUT"
  exit 1
fi

echo "✅ Factory deployed at: $FACTORY_ADDRESS"
echo ""

# Test 1: Check setup fee
echo "📋 Test 1: Check setup fee"
SETUP_FEE_RESULT=$(cast call $FACTORY_ADDRESS "setupFee()" --rpc-url $RPC_URL)
echo "   Setup fee: $SETUP_FEE_RESULT wei ($(cast --to-unit $SETUP_FEE_RESULT ether) ETH)"
echo ""

# Test 2: Check factory owner
echo "📋 Test 2: Check factory owner"
OWNER=$(cast call $FACTORY_ADDRESS "factoryOwner()" --rpc-url $RPC_URL)
echo "   Factory owner: $OWNER"
echo ""

# Test 3: Create a blog (user 1)
echo "📋 Test 3: Create blog 'My First Blog'"
USER1_KEY="0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
cast send $FACTORY_ADDRESS "createBlog(string)" "My First Blog" \
  --rpc-url $RPC_URL \
  --private-key $USER1_KEY \
  --value $SETUP_FEE > /dev/null
echo "   ✅ Blog created!"
echo ""

# Test 4: Check total blogs
echo "📋 Test 4: Check total blogs"
TOTAL=$(cast call $FACTORY_ADDRESS "totalBlogs()" --rpc-url $RPC_URL)
echo "   Total blogs: $TOTAL"
echo ""

# Test 5: Get recent blogs
echo "📋 Test 5: Get recent blogs"
RECENT=$(cast call $FACTORY_ADDRESS "getRecentBlogs(uint256)" 10 --rpc-url $RPC_URL)
echo "   Recent blogs: $RECENT"
echo ""

# Test 6: Create another blog (user 2)
echo "📋 Test 6: Create blog 'Tech Blog'"
USER2_KEY="0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
cast send $FACTORY_ADDRESS "createBlog(string)" "Tech Blog" \
  --rpc-url $RPC_URL \
  --private-key $USER2_KEY \
  --value $SETUP_FEE > /dev/null
echo "   ✅ Blog created!"
echo ""

# Test 7: Check total blogs again
echo "📋 Test 7: Check total blogs again"
TOTAL=$(cast call $FACTORY_ADDRESS "totalBlogs()" --rpc-url $RPC_URL)
echo "   Total blogs: $TOTAL"
echo ""

# Test 8: Change setup fee to FREE
echo "📋 Test 8: Change setup fee to FREE (owner only)"
cast send $FACTORY_ADDRESS "setSetupFee(uint256)" 0 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY > /dev/null
NEW_FEE=$(cast call $FACTORY_ADDRESS "setupFee()" --rpc-url $RPC_URL)
echo "   ✅ New setup fee: $NEW_FEE wei (FREE)"
echo ""

# Test 9: Create blog for FREE
echo "📋 Test 9: Create blog 'Free Blog' (no fee)"
cast send $FACTORY_ADDRESS "createBlog(string)" "Free Blog" \
  --rpc-url $RPC_URL \
  --private-key $USER1_KEY \
  --value 0 > /dev/null
echo "   ✅ Free blog created!"
echo ""

# Test 10: Get all blogs
echo "📋 Test 10: Get all blogs"
ALL_BLOGS=$(cast call $FACTORY_ADDRESS "getAllBlogs(uint256,uint256)" 0 10 --rpc-url $RPC_URL)
echo "   All blogs: $ALL_BLOGS"
echo ""

# Test 11: Check factory balance
echo "📋 Test 11: Check factory balance"
BALANCE=$(cast balance $FACTORY_ADDRESS --rpc-url $RPC_URL)
echo "   Factory balance: $(cast --to-unit $BALANCE ether) ETH"
echo ""

# Test 12: Withdraw fees (owner only)
echo "📋 Test 12: Withdraw fees"
OWNER_BALANCE_BEFORE=$(cast balance $OWNER --rpc-url $RPC_URL)
cast send $FACTORY_ADDRESS "withdraw()" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY > /dev/null
OWNER_BALANCE_AFTER=$(cast balance $OWNER --rpc-url $RPC_URL)
echo "   ✅ Fees withdrawn!"
echo "   Owner balance before: $(cast --to-unit $OWNER_BALANCE_BEFORE ether) ETH"
echo "   Owner balance after: $(cast --to-unit $OWNER_BALANCE_AFTER ether) ETH"
echo ""

echo "🎉 All tests completed!"
echo ""
echo "Factory Address: $FACTORY_ADDRESS"
echo "Save this address to update your frontend!"

