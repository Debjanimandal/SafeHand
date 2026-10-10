// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal interface for the World ID Router / IdentityManager on-chain verifier.
interface IWorldID {
    /// @dev Reverts if the supplied proof is invalid.
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external view;
}

/// @notice Utilities for hashing inputs into the BN254 scalar field used by Semaphore.
library ByteHasher {
    /// @dev Hashes `value` and shifts right 8 bits so the result fits in the field.
    function hashToField(bytes memory value) internal pure returns (uint256) {
        return uint256(keccak256(value)) >> 8;
    }
}

/// @title  ProoflyRegistry
/// @notice Records per-wallet World ID human proofs.
///         When a World ID router address is supplied at deploy time the
///         Semaphore proof is verified on-chain; otherwise registration is
///         relayer-trusted (useful for staging without live World ID contracts).
contract ProoflyRegistry {
    using ByteHasher for bytes;

    // ─── Types ────────────────────────────────────────────────────────────────

    struct HumanProof {
        bool verified;
        bytes32 nullifierHash;
        uint256 verifiedAt;
    }

    // ─── Immutables ───────────────────────────────────────────────────────────

    /// @notice World ID router.  address(0) → skip on-chain ZK check (trusted relay).
    IWorldID public immutable worldId;

    /// @notice hashToField(appId bytes) — stored so front-ends can read it.
    uint256 public immutable appIdHash;

    /// @notice hashToField(appIdHash_bytes32 || action bytes) — the Semaphore external nullifier.
    uint256 public immutable externalNullifierHash;

    /// @dev Orb = group 1.
    uint256 internal constant GROUP_ID = 1;

    // ─── State ────────────────────────────────────────────────────────────────

    mapping(address => HumanProof) public proofs;
    mapping(uint256 => bool) public nullifierUsed;

    // ─── Events ───────────────────────────────────────────────────────────────

    event HumanProofRegistered(
        address indexed wallet,
        bytes32 indexed nullifierHash,
        uint256 verifiedAt
    );

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @param _worldId World ID router address (address(0) = trusted-relay mode).
    /// @param _appId   World ID app ID string, e.g. "app_staging_xxx".
    /// @param _action  Action string, e.g. "proofly-human-verify".
    constructor(address _worldId, string memory _appId, string memory _action) {
        worldId = IWorldID(_worldId);

        uint256 _appIdHash = abi.encodePacked(_appId).hashToField();
        appIdHash = _appIdHash;
        // External nullifier mirrors the World ID JS SDK formula:
        //   keccak256(hashToField(appId_bytes32) || action_bytes) >> 8
        externalNullifierHash = bytes.concat(bytes32(_appIdHash), bytes(_action)).hashToField();
    }

    // ─── Write ────────────────────────────────────────────────────────────────

    /// @notice Register a verified World ID proof for `wallet`.
    /// @param wallet        The address that owns the identity.
    /// @param root          Semaphore Merkle root at proof-generation time.
    /// @param nullifierHash Semaphore nullifier (prevents double-spend).
    /// @param proof         Groth16 proof — 8 consecutive uint256 values.
    function registerHumanProof(
        address wallet,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external {
        require(wallet != address(0), "invalid wallet");
        require(!nullifierUsed[nullifierHash], "nullifier already used");

        if (address(worldId) != address(0)) {
            // Derive signal hash deterministically from the wallet address.
            uint256 signalHash = abi.encodePacked(wallet).hashToField();
            worldId.verifyProof(
                root,
                GROUP_ID,
                signalHash,
                nullifierHash,
                externalNullifierHash,
                proof
            );
        }

        nullifierUsed[nullifierHash] = true;

        bytes32 nullifierBytes32 = bytes32(nullifierHash);
        proofs[wallet] = HumanProof({
            verified: true,
            nullifierHash: nullifierBytes32,
            verifiedAt: block.timestamp
        });

        emit HumanProofRegistered(wallet, nullifierBytes32, block.timestamp);
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    function isVerified(address wallet) external view returns (bool) {
        return proofs[wallet].verified;
    }
}

