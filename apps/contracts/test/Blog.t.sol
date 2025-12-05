// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/Blog.sol";

contract BlogTest is Test {
    Blog public blog;
    address public owner;
    address public otherUser;

    event PostCreated(
        uint256 indexed id,
        address indexed author,
        string title,
        string body,
        uint256 timestamp
    );

    function setUp() public {
        owner = address(this);
        otherUser = address(0xdead);
        blog = new Blog(owner, "Test Blog");
    }

    // ============ Constructor Tests ============

    function test_Constructor() public view {
        assertEq(blog.owner(), owner);
        assertEq(blog.name(), "Test Blog");
        assertEq(blog.postCount(), 0);
    }

    // ============ Publish Tests ============

    function test_Publish() public {
        blog.publish("Hello World", "This is my first post!");
        assertEq(blog.postCount(), 1);
    }

    function test_PublishMultiplePosts() public {
        blog.publish("Post 1", "Content 1");
        blog.publish("Post 2", "Content 2");
        blog.publish("Post 3", "Content 3");
        assertEq(blog.postCount(), 3);
    }

    function test_PublishEmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit PostCreated(0, owner, "Test Title", "Test Body", block.timestamp);
        blog.publish("Test Title", "Test Body");
    }

    function test_RevertWhen_NotOwnerPublishes() public {
        vm.prank(otherUser);
        vm.expectRevert("Not owner");
        blog.publish("Hacked", "Content");
    }

    function test_RevertWhen_TitleTooLong() public {
        string memory longTitle = _generateString(501);
        vm.expectRevert("Title too long");
        blog.publish(longTitle, "Body");
    }

    function test_RevertWhen_BodyTooLong() public {
        string memory longBody = _generateString(50001);
        vm.expectRevert("Body too long");
        blog.publish("Title", longBody);
    }

    function test_RevertWhen_BodyEmpty() public {
        vm.expectRevert("Body empty");
        blog.publish("Title", "");
    }

    function test_PublishWithMaxTitleLength() public {
        string memory maxTitle = _generateString(500);
        blog.publish(maxTitle, "Body");
        assertEq(blog.postCount(), 1);
    }

    function test_PublishWithMaxBodyLength() public {
        string memory maxBody = _generateString(50000);
        blog.publish("Title", maxBody);
        assertEq(blog.postCount(), 1);
    }

    // ============ Transfer Ownership Tests ============

    function test_TransferOwnership() public {
        blog.transferOwnership(otherUser);
        assertEq(blog.owner(), otherUser);
    }

    function test_RevertWhen_NotOwnerTransfers() public {
        vm.prank(otherUser);
        vm.expectRevert("Not owner");
        blog.transferOwnership(otherUser);
    }

    function test_RevertWhen_TransferToZeroAddress() public {
        vm.expectRevert("Invalid address");
        blog.transferOwnership(address(0));
    }

    function test_NewOwnerCanPublish() public {
        blog.transferOwnership(otherUser);

        vm.prank(otherUser);
        blog.publish("New Owner Post", "Content from new owner");
        assertEq(blog.postCount(), 1);
    }

    function test_OldOwnerCannotPublishAfterTransfer() public {
        blog.transferOwnership(otherUser);

        vm.expectRevert("Not owner");
        blog.publish("Old Owner Post", "Should fail");
    }

    // ============ Fuzz Tests ============

    function testFuzz_PublishVariousTitles(string calldata title) public {
        vm.assume(bytes(title).length > 0 && bytes(title).length <= 500);
        blog.publish(title, "Some body content");
        assertEq(blog.postCount(), 1);
    }

    function testFuzz_PublishVariousBodies(string calldata body) public {
        vm.assume(bytes(body).length > 0 && bytes(body).length <= 50000);
        blog.publish("Title", body);
        assertEq(blog.postCount(), 1);
    }

    function testFuzz_TransferOwnership(address newOwner) public {
        vm.assume(newOwner != address(0));
        blog.transferOwnership(newOwner);
        assertEq(blog.owner(), newOwner);
    }

    // ============ Helper Functions ============

    function _generateString(uint256 length) internal pure returns (string memory) {
        bytes memory buffer = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            buffer[i] = "a";
        }
        return string(buffer);
    }
}


