// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IProoflyRegistry {
    function isVerified(address wallet) external view returns (bool);
}

contract ProoflyTaskGate {
    IProoflyRegistry public immutable registry;

    mapping(bytes32 => bool) public taskUnlocked;

    event TaskUnlocked(bytes32 indexed taskId, address indexed wallet);

    constructor(address registryAddress) {
        require(registryAddress != address(0), "invalid registry");
        registry = IProoflyRegistry(registryAddress);
    }

    function unlockTask(bytes32 taskId) external {
        require(registry.isVerified(msg.sender), "human verification required");

        taskUnlocked[taskId] = true;
        emit TaskUnlocked(taskId, msg.sender);
    }
}
