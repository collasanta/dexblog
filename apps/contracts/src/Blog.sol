// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Arbitrum precompile interface for getting L2 block number
/// @dev Address 0x0000000000000000000000000000000000000064 (100 in decimal)
interface ArbSys {
    /// @notice Get the current L2 block number (distinct from L1 block number)
    /// @return The current L2 block number
    function arbBlockNumber() external view returns (uint256);
}

/// @title Blog - Individual decentralized blog contract
/// @notice Each user deploys their own Blog contract to publish posts on-chain
/// @dev Posts are stored in contract storage for fast access, events for audit trail
contract Blog {
    /// @notice Post structure stored in contract
    struct Post {
        uint256 id;
        address author;
        string title;
        string body;
        uint256 timestamp;
        uint256 blockNumber; // Block number when the post was published (used to fetch transaction hash from events)
        bool deleted; // Flag to mark deleted posts
    }

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

    /// @notice Mapping from post ID to Post struct
    mapping(uint256 => Post) public posts;

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
    /// @dev Post content is stored in contract storage AND emitted as event
    /// @param title The post title (max 500 bytes)
    /// @param body The post body content (max 50000 bytes, supports markdown)
    function publish(string calldata title, string calldata body) external onlyOwner {
        require(bytes(title).length <= MAX_TITLE_LENGTH, "Title too long");
        require(bytes(body).length <= MAX_BODY_LENGTH, "Body too long");
        require(bytes(body).length > 0, "Body empty");

        uint256 id = postCount;
        
        // Store post in contract storage
        // blockNumber is used by SDK to efficiently fetch transaction hash from events
        // On Arbitrum, use arbBlockNumber() to get the L2 block number (events are emitted on L2)
        // On other chains, block.number works correctly
        uint256 l2BlockNumber;
        if (block.chainid == 42161 || block.chainid == 421614) {
            // Arbitrum Mainnet or Arbitrum Sepolia - use ArbSys precompile
            // Address 0x0000000000000000000000000000000000000064 (100 in decimal) is ArbSys precompile
            ArbSys arbSys = ArbSys(address(0x0000000000000000000000000000000000000064));
            l2BlockNumber = arbSys.arbBlockNumber();
        } else {
            // Other chains - use standard block.number
            l2BlockNumber = block.number;
        }
        
        posts[id] = Post({
            id: id,
            author: msg.sender,
            title: title,
            body: body,
            timestamp: block.timestamp,
            blockNumber: l2BlockNumber, // Store L2 block number for efficient event lookup
            deleted: false
        });

        postCount++;

        // Emit event for audit trail and indexing
        emit PostCreated(id, msg.sender, title, body, block.timestamp);
    }

    /// @notice Edits an existing post
    /// @dev Only the blog owner can edit posts
    /// @param id The post ID to edit
    /// @param newTitle The new title (max 500 bytes)
    /// @param newBody The new body content (max 50000 bytes)
    function editPost(uint256 id, string calldata newTitle, string calldata newBody) external onlyOwner {
        require(id < postCount, "Post does not exist");
        require(!posts[id].deleted, "Post is deleted");
        require(bytes(newTitle).length <= MAX_TITLE_LENGTH, "Title too long");
        require(bytes(newBody).length <= MAX_BODY_LENGTH, "Body too long");
        require(bytes(newBody).length > 0, "Body empty");

        // Update post in storage
        posts[id].title = newTitle;
        posts[id].body = newBody;
        posts[id].timestamp = block.timestamp; // Update timestamp on edit
        // Note: blockNumber is not updated on edit - it refers to the original creation block

        // Emit event for edit (could create PostEdited event if needed)
        emit PostCreated(id, msg.sender, newTitle, newBody, block.timestamp);
    }

    /// @notice Deletes a post (soft delete - marks as deleted)
    /// @dev Only the blog owner can delete posts
    /// @param id The post ID to delete
    function deletePost(uint256 id) external onlyOwner {
        require(id < postCount, "Post does not exist");
        require(!posts[id].deleted, "Post already deleted");

        // Soft delete - mark as deleted but keep data
        posts[id].deleted = true;
        posts[id].timestamp = block.timestamp; // Update timestamp on delete
    }

    /// @notice Get a post by ID
    /// @param id The post ID
    /// @return Post struct
    function getPost(uint256 id) external view returns (Post memory) {
        require(id < postCount, "Post does not exist");
        return posts[id];
    }

    /// @notice Get multiple posts by IDs
    /// @param ids Array of post IDs
    /// @return Array of Post structs
    function getPosts(uint256[] calldata ids) external view returns (Post[] memory) {
        Post[] memory result = new Post[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            require(ids[i] < postCount, "Post does not exist");
            result[i] = posts[ids[i]];
        }
        return result;
    }

    /// @notice Get posts in a range (for pagination)
    /// @param start Starting post ID (inclusive)
    /// @param end Ending post ID (exclusive)
    /// @param includeDeleted Whether to include deleted posts
    /// @return Array of Post structs
    function getPostsRange(uint256 start, uint256 end, bool includeDeleted) public view returns (Post[] memory) {
        require(start <= end, "Invalid range");
        require(end <= postCount, "Range exceeds post count");
        
        uint256 length = end - start;
        Post[] memory tempResult = new Post[](length);
        uint256 count = 0;
        
        // First pass: collect posts
        for (uint256 i = 0; i < length; i++) {
            Post memory post = posts[start + i];
            if (includeDeleted || !post.deleted) {
                tempResult[count] = post;
                count++;
            }
        }
        
        // Second pass: create properly sized array
        Post[] memory result = new Post[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempResult[i];
        }
        
        return result;
    }

    /// @notice Get all active (non-deleted) posts
    /// @return Array of Post structs
    function getAllActivePosts() external view returns (Post[] memory) {
        return getPostsRange(0, postCount, false);
    }

    /// @notice Transfers ownership of the blog to a new address
    /// @param newOwner The address of the new owner
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}

