// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/BlogFactory.sol";
import "../src/Blog.sol";

contract BlogFactoryTest is Test {
    BlogFactory public factory;
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

    function setUp() public {
        factoryOwner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);

        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);

        factory = new BlogFactory(SETUP_FEE);
    }

    // ============ Constructor Tests ============

    function test_Constructor() public view {
        assertEq(factory.factoryOwner(), factoryOwner);
        assertEq(factory.setupFee(), SETUP_FEE);
        assertEq(factory.totalBlogs(), 0);
    }

    // ============ Create Blog Tests ============

    function test_CreateBlog() public {
        vm.prank(user1);
        address blogAddress = factory.createBlog{value: SETUP_FEE}("My Blog");

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
        vm.prank(user1);
        vm.expectRevert("Insufficient setup fee");
        factory.createBlog{value: SETUP_FEE - 1}("My Blog");
    }

    function test_CreateBlogWithExcessFee() public {
        vm.prank(user1);
        address blogAddress = factory.createBlog{value: SETUP_FEE + 1 ether}("My Blog");

        assertEq(factory.totalBlogs(), 1);
        Blog blog = Blog(blogAddress);
        assertEq(blog.owner(), user1);
    }

    function test_CreateBlogWithZeroFee() public {
        BlogFactory freeFactory = new BlogFactory(0);

        vm.prank(user1);
        address blogAddress = freeFactory.createBlog{value: 0}("Free Blog");

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

        vm.prank(user1);
        factory.createBlog{value: 0}("Free Blog");
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
        vm.prank(user1);
        factory.createBlog{value: SETUP_FEE}("Blog");

        factory.transferFactoryOwnership(user2);

        uint256 balanceBefore = user2.balance;

        vm.prank(user2);
        factory.withdraw();

        assertEq(user2.balance, balanceBefore + SETUP_FEE);
    }

    // ============ Fuzz Tests ============

    function testFuzz_CreateBlogWithVariousFees(uint256 fee) public {
        vm.assume(fee <= 10 ether);

        BlogFactory testFactory = new BlogFactory(fee);
        vm.deal(user1, fee + 1 ether);

        vm.prank(user1);
        address blogAddress = testFactory.createBlog{value: fee}("Test Blog");

        Blog blog = Blog(blogAddress);
        assertEq(blog.owner(), user1);
    }

    function testFuzz_CreateBlogWithVariousNames(string calldata name) public {
        vm.prank(user1);
        address blogAddress = factory.createBlog{value: SETUP_FEE}(name);

        Blog blog = Blog(blogAddress);
        assertEq(blog.name(), name);
    }
}

