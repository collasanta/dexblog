// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Blog.sol";

/// @notice Minimal ERC20 interface for token transfers
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title BlogFactory - Factory contract for deploying individual blogs
/// @notice Users can deploy their own Blog contracts through this factory
/// @dev Collects an optional setup fee for blog creation
contract BlogFactory {
    /// @notice Blog metadata structure for easy querying
    struct BlogInfo {
        address blogAddress;
        address owner;
        string name;
        uint256 createdAt;
    }

    /// @notice Emitted when a new blog is created
    /// @param owner The owner of the new blog
    /// @param blogAddress The address of the deployed Blog contract
    /// @param name The name of the blog
    /// @param timestamp The block timestamp when created
    event BlogCreated(
        address indexed owner,
        address indexed blogAddress,
        string name,
        uint256 timestamp
    );

    /// @notice Emitted when the setup fee is changed
    /// @param oldFee The previous setup fee
    /// @param newFee The new setup fee
    event SetupFeeChanged(uint256 oldFee, uint256 newFee);

    /// @notice Emitted when factory ownership is transferred
    /// @param oldOwner The previous factory owner
    /// @param newOwner The new factory owner
    event FactoryOwnershipTransferred(
        address indexed oldOwner,
        address indexed newOwner
    );

    /// @notice The owner of this factory contract
    address public factoryOwner;

    /// @notice The payment token address (USDC) for payments
    IERC20 public paymentToken;

    /// @notice The fee required to create a new blog (in payment token units)
    /// @dev For USDC (6 decimals): 10 * 10^6 = 10000000
    uint256 public setupFee;

    /// @notice Array of all deployed blog addresses
    address[] public blogs;

    /// @notice Array of all blog metadata for easy listing
    BlogInfo[] public allBlogsInfo;

    /// @notice Mapping from owner address to their blog addresses
    mapping(address => address[]) public blogsByOwner;

    /// @notice Creates the factory with initial setup fee
    /// @param _paymentToken The address of the payment token (USDC)
    /// @param _setupFee The fee in payment token units (e.g., 10 * 10^6 for 10 USDC)
    constructor(address _paymentToken, uint256 _setupFee) {
        factoryOwner = msg.sender;
        paymentToken = IERC20(_paymentToken);
        setupFee = _setupFee;
    }

    /// @notice Creates a new blog for the caller using USDC payment
    /// @dev User must approve this contract to spend setupFee amount of paymentToken first
    /// @param _name The name for the new blog
    /// @return blogAddress The address of the newly deployed Blog contract
    function createBlog(string calldata _name) external returns (address blogAddress) {
        require(
            paymentToken.transferFrom(msg.sender, address(this), setupFee),
            "Payment failed"
        );
        return _createBlogInternal(msg.sender, _name);
    }

    /// @notice Internal function to create a blog (shared logic)
    /// @param _owner The owner of the blog
    /// @param _name The name for the new blog
    /// @return blogAddress The address of the newly deployed Blog contract
    function _createBlogInternal(address _owner, string calldata _name) internal returns (address blogAddress) {
        Blog blog = new Blog(_owner, _name);
        blogAddress = address(blog);

        blogs.push(blogAddress);
        blogsByOwner[_owner].push(blogAddress);
        
        // Store blog metadata for easy listing
        allBlogsInfo.push(BlogInfo({
            blogAddress: blogAddress,
            owner: _owner,
            name: _name,
            createdAt: block.timestamp
        }));

        emit BlogCreated(_owner, blogAddress, _name, block.timestamp);

        return blogAddress;
    }

    /// @notice Returns the total number of blogs created
    /// @return The count of all deployed blogs
    function totalBlogs() external view returns (uint256) {
        return blogs.length;
    }

    /// @notice Returns all blogs owned by a specific address
    /// @param _owner The owner address to query
    /// @return Array of blog addresses owned by the given address
    function getBlogsByOwner(address _owner) external view returns (address[] memory) {
        return blogsByOwner[_owner];
    }

    /// @notice Returns blog info at a specific index
    /// @param index The index in the allBlogsInfo array
    /// @return Blog metadata struct
    function getBlogInfo(uint256 index) external view returns (BlogInfo memory) {
        require(index < allBlogsInfo.length, "Index out of bounds");
        return allBlogsInfo[index];
    }

    /// @notice Returns paginated list of all blogs with metadata
    /// @param offset Starting index
    /// @param limit Maximum number of blogs to return
    /// @return Array of BlogInfo structs
    function getAllBlogs(uint256 offset, uint256 limit) external view returns (BlogInfo[] memory) {
        uint256 total = allBlogsInfo.length;
        if (offset >= total) return new BlogInfo[](0);
        
        uint256 end = offset + limit;
        if (end > total) end = total;
        
        BlogInfo[] memory result = new BlogInfo[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = allBlogsInfo[i];
        }
        return result;
    }

    /// @notice Returns the most recent blogs (for homepage display)
    /// @param count Number of recent blogs to return
    /// @return Array of BlogInfo structs (newest first)
    function getRecentBlogs(uint256 count) external view returns (BlogInfo[] memory) {
        uint256 total = allBlogsInfo.length;
        if (total == 0) return new BlogInfo[](0);
        
        uint256 resultCount = count > total ? total : count;
        BlogInfo[] memory result = new BlogInfo[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = allBlogsInfo[total - 1 - i];
        }
        return result;
    }

    /// @notice Withdraws all collected USDC fees to the factory owner
    function withdraw() external {
        require(msg.sender == factoryOwner, "Not owner");
        uint256 balance = paymentToken.balanceOf(address(this));
        require(balance > 0, "No balance");
        require(paymentToken.transfer(factoryOwner, balance), "Transfer failed");
    }

    /// @notice Updates the setup fee
    /// @param _fee The new fee in payment token units
    function setSetupFee(uint256 _fee) external {
        require(msg.sender == factoryOwner, "Not owner");
        uint256 oldFee = setupFee;
        setupFee = _fee;
        emit SetupFeeChanged(oldFee, _fee);
    }

    /// @notice Transfers factory ownership to a new address
    /// @param _newOwner The address of the new factory owner
    function transferFactoryOwnership(address _newOwner) external {
        require(msg.sender == factoryOwner, "Not owner");
        require(_newOwner != address(0), "Invalid address");
        address oldOwner = factoryOwner;
        factoryOwner = _newOwner;
        emit FactoryOwnershipTransferred(oldOwner, _newOwner);
    }
}

