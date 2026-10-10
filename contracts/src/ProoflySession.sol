// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ProoflySession {
    struct Session {
        bytes32 policyHash;
        uint256 expiry;
        bool active;
    }

    mapping(bytes32 => Session) public sessions;

    event SessionStarted(bytes32 indexed sessionId, bytes32 indexed policyHash, uint256 expiry);
    event SessionEnded(bytes32 indexed sessionId);

    function startSession(bytes32 sessionId, bytes32 policyHash, uint256 expiry) external {
        require(sessionId != bytes32(0), "invalid sessionId");
        require(expiry > block.timestamp, "expiry must be future");

        sessions[sessionId] = Session({
            policyHash: policyHash,
            expiry: expiry,
            active: true
        });

        emit SessionStarted(sessionId, policyHash, expiry);
    }

    function endSession(bytes32 sessionId) external {
        Session storage session = sessions[sessionId];
        require(session.active, "session not active");

        session.active = false;
        emit SessionEnded(sessionId);
    }

    function isSessionValid(bytes32 sessionId) external view returns (bool) {
        Session memory session = sessions[sessionId];
        return session.active && session.expiry >= block.timestamp;
    }
}
