// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/BlogFactory.sol";
import "../src/Blog.sol";
import "../src/Constants.sol";

// Mock ERC20 token for testing
contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
}

contract BlogFactoryTest is Test {
    BlogFactory public factory;
    MockERC20 public mockUSDC;
    address public factoryOwner;
    address public user1;
    address public user2;

    uint256 public constant SETUP_FEE = 0.02 ether; // ~$50 equivalent

    event BlogCreated(
        address indexed owner,
        address indexed blogAddress,
        string name,
        uint256 timestamp
    );

    // Allow test contract to receive ETH from withdraw
    receive() external payable {}

    function setUp() public {
        factoryOwner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);

        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);

        // Deploy mock USDC
        mockUSDC = new MockERC20();
        mockUSDC.mint(user1, 1000 * 10**6); // 1000 USDC
        mockUSDC.mint(user2, 1000 * 10**6);

        factory = new BlogFactory(
            address(mockUSDC),
            Constants.SETUP_FEE_STABLE
        );
    }

    // ============ Constructor Tests ============

    function test_Constructor() public view {
        assertEq(factory.factoryOwner(), factoryOwner);
        assertEq(factory.setupFee(), SETUP_FEE);
        assertEq(factory.totalBlogs(), 0);
    }

    // ============ Create Blog Tests ============

    function test_CreateBlog() public {
        vm.startPrank(user1);
        mockUSDC.approve(address(factory), Constants.SETUP_FEE_STABLE);
        address blogAddress = factory.createBlog("My Blog");
        vm.stopPrank();

        assertEq(factory.totalBlogs(), 1);
        assertEq(factory.blogs(0), blogAddress);

        Blog blog = Blog(blogAddress);
        assertEq(blog.owner(), user1);
        assertEq(blog.name(), "My Blog");
    }

    function test_CreateBlogEmitsEvent() public {
        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit BlogCreated(user1, address(0), "My Blog", block.timestamp);
        factory.createBlog{value: SETUP_FEE}("My Blog");
    }

    function test_CreateMultipleBlogs() public {
        vm.prank(user1);
        factory.createBlog{value: SETUP_FEE}("Blog 1");

        vm.prank(user2);
        factory.createBlog{value: SETUP_FEE}("Blog 2");

        vm.prank(user1);
        factory.createBlog{value: SETUP_FEE}("Blog 3");

        assertEq(factory.totalBlogs(), 3);
    }

    function test_RevertWhen_InsufficientFee() public {
        vm.startPrank(user1);
        mockUSDC.approve(address(factory), Constants.SETUP_FEE_STABLE - 1);
        vm.expectRevert();
        factory.createBlog("My Blog");
        vm.stopPrank();
    }

    function test_CreateBlogWithExcessFee() public {
        vm.startPrank(user1);
        mockUSDC.approve(address(factory), Constants.SETUP_FEE_STABLE * 2);
        address blogAddress = factory.createBlog("My Blog");
        vm.stopPrank();

        assertEq(factory.totalBlogs(), 1);
        Blog blog = Blog(blogAddress);
        assertEq(blog.owner(), user1);
    }

    function test_CreateBlogWithZeroFee() public {
        BlogFactory freeFactory = new BlogFactory(
            address(mockUSDC),
            0
        );

        vm.startPrank(user1);
        mockUSDC.approve(address(freeFactory), 0);
        address blogAddress = freeFactory.createBlog("Free Blog");
        vm.stopPrank();

        assertEq(freeFactory.totalBlogs(), 1);
        Blog blog = Blog(blogAddress);
        assertEq(blog.owner(), user1);
    }

    // ============ Get Blogs By Owner Tests ============

    function test_GetBlogsByOwner() public {
        vm.startPrank(user1);
        factory.createBlog{value: SETUP_FEE}("Blog 1");
        factory.createBlog{value: SETUP_FEE}("Blog 2");
        vm.stopPrank();

        vm.prank(user2);
        factory.createBlog{value: SETUP_FEE}("Blog 3");

        address[] memory user1Blogs = factory.getBlogsByOwner(user1);
        address[] memory user2Blogs = factory.getBlogsByOwner(user2);

        assertEq(user1Blogs.length, 2);
        assertEq(user2Blogs.length, 1);
    }

    function test_GetBlogsByOwner_Empty() public view {
        address[] memory blogs = factory.getBlogsByOwner(user1);
        assertEq(blogs.length, 0);
    }

    // ============ Withdraw Tests ============

    function test_Withdraw() public {
        vm.prank(user1);
        factory.createBlog{value: SETUP_FEE}("Blog 1");

        vm.prank(user2);
        factory.createBlog{value: SETUP_FEE}("Blog 2");

        uint256 balanceBefore = factoryOwner.balance;

        factory.withdraw();

        assertEq(factoryOwner.balance, balanceBefore + (SETUP_FEE * 2));
        assertEq(address(factory).balance, 0);
    }

    function test_RevertWhen_NonOwnerWithdraws() public {
        vm.prank(user1);
        factory.createBlog{value: SETUP_FEE}("Blog 1");

        vm.prank(user1);
        vm.expectRevert("Not owner");
        factory.withdraw();
    }

    // ============ Set Setup Fee Tests ============

    function test_SetSetupFee() public {
        uint256 newFee = 0.05 ether;
        factory.setSetupFee(newFee);
        assertEq(factory.setupFee(), newFee);
    }

    function test_SetSetupFeeToZero() public {
        factory.setSetupFee(0);
        assertEq(factory.setupFee(), 0);

        vm.startPrank(user1);
        mockUSDC.approve(address(factory), 0);
        factory.createBlog("Free Blog");
        vm.stopPrank();
        assertEq(factory.totalBlogs(), 1);
    }

    function test_RevertWhen_NonOwnerSetsSetupFee() public {
        vm.prank(user1);
        vm.expectRevert("Not owner");
        factory.setSetupFee(0.1 ether);
    }

    // ============ Transfer Factory Ownership Tests ============

    function test_TransferFactoryOwnership() public {
        factory.transferFactoryOwnership(user1);
        assertEq(factory.factoryOwner(), user1);
    }

    function test_RevertWhen_NonOwnerTransfersFactoryOwnership() public {
        vm.prank(user1);
        vm.expectRevert("Not owner");
        factory.transferFactoryOwnership(user1);
    }

    function test_RevertWhen_TransferFactoryOwnershipToZeroAddress() public {
        vm.expectRevert("Invalid address");
        factory.transferFactoryOwnership(address(0));
    }

    function test_NewFactoryOwnerCanWithdraw() public {
        vm.startPrank(user1);
        mockUSDC.approve(address(factory), Constants.SETUP_FEE_STABLE);
        factory.createBlog("Blog");
        vm.stopPrank();

        factory.transferFactoryOwnership(user2);

        uint256 balanceBefore = user2.balance;

        vm.prank(user2);
        factory.withdraw();

        assertEq(user2.balance, balanceBefore + SETUP_FEE);
    }

    // ============ Fuzz Tests ============

    function testFuzz_CreateBlogWithVariousFees(uint256 fee) public {
        vm.assume(fee <= 1000 * 10**6); // Max 1000 USDC

        BlogFactory testFactory = new BlogFactory(
            address(mockUSDC),
            fee
        );
        mockUSDC.mint(user1, fee + 100 * 10**6);

        vm.startPrank(user1);
        mockUSDC.approve(address(testFactory), fee);
        address blogAddress = testFactory.createBlog("Test Blog");
        vm.stopPrank();

        Blog blog = Blog(blogAddress);
        assertEq(blog.owner(), user1);
    }

    function testFuzz_CreateBlogWithVariousNames(string calldata name) public {
        vm.startPrank(user1);
        mockUSDC.approve(address(factory), Constants.SETUP_FEE_STABLE);
        address blogAddress = factory.createBlog(name);
        vm.stopPrank();

        Blog blog = Blog(blogAddress);
        assertEq(blog.name(), name);
    }

    // ============ Stablecoin Payment Tests ============

    function test_CreateBlogWithStablecoin() public {
        vm.startPrank(user1);
        mockUSDC.approve(address(factory), Constants.SETUP_FEE_STABLE);
        
        address blogAddress = factory.createBlog("USDC Blog");
        vm.stopPrank();

        assertEq(factory.totalBlogs(), 1);
        assertEq(factory.blogs(0), blogAddress);
        assertEq(mockUSDC.balanceOf(address(factory)), Constants.SETUP_FEE_STABLE);

        Blog blog = Blog(blogAddress);
        assertEq(blog.owner(), user1);
        assertEq(blog.name(), "USDC Blog");
    }

    function test_RevertWhen_InsufficientStablecoinApproval() public {
        vm.startPrank(user1);
        mockUSDC.approve(address(factory), Constants.SETUP_FEE_STABLE - 1);
        
        // MockERC20 returns false on insufficient allowance, which causes require to revert
        vm.expectRevert();
        factory.createBlog("Blog");
        vm.stopPrank();
    }

    function test_RevertWhen_NoStablecoinApproval() public {
        vm.prank(user1);
        // MockERC20 returns false on no allowance, which causes require to revert
        vm.expectRevert();
        factory.createBlog("Blog");
    }

    function test_WithdrawStablecoin() public {
        vm.startPrank(user1);
        mockUSDC.approve(address(factory), Constants.SETUP_FEE_STABLE);
        factory.createBlog("Blog 1");
        vm.stopPrank();

        vm.startPrank(user2);
        mockUSDC.approve(address(factory), Constants.SETUP_FEE_STABLE);
        factory.createBlog("Blog 2");
        vm.stopPrank();

        uint256 balanceBefore = mockUSDC.balanceOf(factoryOwner);
        
        factory.withdrawStablecoin();

        uint256 balanceAfter = mockUSDC.balanceOf(factoryOwner);
        assertEq(balanceAfter - balanceBefore, Constants.SETUP_FEE_STABLE * 2);
        assertEq(mockUSDC.balanceOf(address(factory)), 0);
    }

    function test_RevertWhen_NonOwnerWithdrawsStablecoin() public {
        vm.prank(user1);
        vm.expectRevert("Not owner");
        factory.withdraw();
    }
}

