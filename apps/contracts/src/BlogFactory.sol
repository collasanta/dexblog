// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Blog.sol";

/// @title BlogFactory - Factory contract for deploying individual blogs
/// @notice Users can deploy their own Blog contracts through this factory
/// @dev Collects an optional setup fee for blog creation
contract BlogFactory {
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

    /// @notice The owner of this factory contract
    address public factoryOwner;

    /// @notice The fee required to create a new blog (in wei)
    uint256 public setupFee;

    /// @notice Array of all deployed blog addresses
    address[] public blogs;

    /// @notice Mapping from owner address to their blog addresses
    mapping(address => address[]) public blogsByOwner;

    /// @notice Creates the factory with an initial setup fee
    /// @param _setupFee The fee in wei required to create a blog
    constructor(uint256 _setupFee) {
        factoryOwner = msg.sender;
        setupFee = _setupFee;
    }

    /// @notice Creates a new blog for the caller
    /// @param _name The name for the new blog
    /// @return blogAddress The address of the newly deployed Blog contract
    function createBlog(string calldata _name) external payable returns (address blogAddress) {
        require(msg.value >= setupFee, "Insufficient setup fee");

        Blog blog = new Blog(msg.sender, _name);
        blogAddress = address(blog);

        blogs.push(blogAddress);
        blogsByOwner[msg.sender].push(blogAddress);

        emit BlogCreated(msg.sender, blogAddress, _name, block.timestamp);

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

    /// @notice Withdraws all collected fees to the factory owner
    function withdraw() external {
        require(msg.sender == factoryOwner, "Not owner");
        payable(factoryOwner).transfer(address(this).balance);
    }

    /// @notice Updates the setup fee
    /// @param _fee The new fee in wei
    function setSetupFee(uint256 _fee) external {
        require(msg.sender == factoryOwner, "Not owner");
        setupFee = _fee;
    }

    /// @notice Transfers factory ownership to a new address
    /// @param _newOwner The address of the new factory owner
    function transferFactoryOwnership(address _newOwner) external {
        require(msg.sender == factoryOwner, "Not owner");
        require(_newOwner != address(0), "Invalid address");
        factoryOwner = _newOwner;
    }
}

