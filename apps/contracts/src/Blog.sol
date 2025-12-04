// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Blog - Individual decentralized blog contract
/// @notice Each user deploys their own Blog contract to publish posts on-chain
/// @dev Posts are stored entirely in events for gas efficiency
contract Blog {
    /// @notice Emitted when a new post is published
    /// @param id The sequential post ID
    /// @param author The address of the post author
    /// @param title The post title
    /// @param body The post body content (supports markdown)
    /// @param timestamp The block timestamp when published
    event PostCreated(
        uint256 indexed id,
        address indexed author,
        string title,
        string body,
        uint256 timestamp
    );

    /// @notice The owner of this blog
    address public owner;

    /// @notice The name of this blog
    string public name;

    /// @notice Total number of posts published
    uint256 public postCount;

    /// @notice Maximum allowed title length in bytes
    uint256 public constant MAX_TITLE_LENGTH = 500;

    /// @notice Maximum allowed body length in bytes
    uint256 public constant MAX_BODY_LENGTH = 50000;

    /// @notice Restricts function access to the blog owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /// @notice Creates a new blog
    /// @param _owner The address that will own this blog
    /// @param _name The name of the blog
    constructor(address _owner, string memory _name) {
        owner = _owner;
        name = _name;
    }

    /// @notice Publishes a new post to the blog
    /// @dev Post content is stored in event logs, not contract storage
    /// @param title The post title (max 500 bytes)
    /// @param body The post body content (max 50000 bytes, supports markdown)
    function publish(string calldata title, string calldata body) external onlyOwner {
        require(bytes(title).length <= MAX_TITLE_LENGTH, "Title too long");
        require(bytes(body).length <= MAX_BODY_LENGTH, "Body too long");
        require(bytes(body).length > 0, "Body empty");

        emit PostCreated(postCount, msg.sender, title, body, block.timestamp);
        postCount++;
    }

    /// @notice Transfers ownership of the blog to a new address
    /// @param newOwner The address of the new owner
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}

