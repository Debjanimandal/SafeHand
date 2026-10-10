// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ProoflyPolicy {
    struct AgentPolicy {
        bytes32 policyHash;
        uint256 expiry;
        bool active;
    }

    mapping(address => mapping(address => AgentPolicy)) public policies;

    event PolicySet(address indexed owner, address indexed agent, bytes32 policyHash, uint256 expiry);
    event PolicyRevoked(address indexed owner, address indexed agent);

    function setPolicy(address agent, bytes32 policyHash, uint256 expiry) external {
        require(agent != address(0), "invalid agent");
        require(expiry > block.timestamp, "expiry must be future");

        policies[msg.sender][agent] = AgentPolicy({
            policyHash: policyHash,
            expiry: expiry,
            active: true
        });

        emit PolicySet(msg.sender, agent, policyHash, expiry);
    }

    function revokePolicy(address agent) external {
        AgentPolicy storage policy = policies[msg.sender][agent];
        require(policy.active, "policy not active");

        policy.active = false;
        emit PolicyRevoked(msg.sender, agent);
    }

    function isPolicyActive(address owner, address agent) external view returns (bool) {
        AgentPolicy memory policy = policies[owner][agent];
        return policy.active && policy.expiry >= block.timestamp;
    }
}
