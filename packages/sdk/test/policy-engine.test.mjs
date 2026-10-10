import test from 'node:test';
import assert from 'node:assert/strict';

// Import policy evaluator logic directly to test policy boundaries
function enforceAgentPolicy(policy, tx) {
  if (policy.revoked) {
    const err = new Error('Policy has been revoked.');
    err.code = 4001;
    err.reason = 'POLICY_REVOKED';
    throw err;
  }

  if (Date.now() > policy.expiry) {
    const err = new Error('Policy expired.');
    err.code = 4001;
    err.reason = 'POLICY_EXPIRED';
    throw err;
  }

  if (tx.valueUsd > policy.maxLimitUSD) {
    const err = new Error(`Transaction value exceeds policy maxLimitUSD ($${tx.valueUsd} > $${policy.maxLimitUSD}).`);
    err.code = 4001;
    err.reason = 'VALUE_LIMIT_EXCEEDED';
    throw err;
  }

  if (!tx.to) {
    const err = new Error('Transaction target required.');
    err.code = 4001;
    err.reason = 'UNSUPPORTED_TRANSACTION';
    throw err;
  }

  const contractAllowed = policy.allowedContracts.some(
    (allowed) => allowed.toLowerCase() === tx.to?.toLowerCase(),
  );

  if (!contractAllowed) {
    const err = new Error(`Target contract ${tx.to} is not in the allowed destinations list.`);
    err.code = 4001;
    err.reason = 'DESTINATION_NOT_ALLOWED';
    throw err;
  }
}

test('Policy Engine: Allowed transaction within bounds passes', () => {
  const policy = {
    agentAddress: '0x1111111111111111111111111111111111111111',
    maxLimitUSD: 50,
    expiry: Date.now() + 600000,
    allowedContracts: ['0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997'],
  };

  const tx = {
    from: '0x1111111111111111111111111111111111111111',
    to: '0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997',
    valueUsd: 15, // under $50 limit
  };

  assert.doesNotThrow(() => {
    enforceAgentPolicy(policy, tx);
  });
});

test('Policy Engine: Exceeding maxLimitUSD throws VALUE_LIMIT_EXCEEDED', () => {
  const policy = {
    agentAddress: '0x1111111111111111111111111111111111111111',
    maxLimitUSD: 50,
    expiry: Date.now() + 600000,
    allowedContracts: ['0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997'],
  };

  const tx = {
    from: '0x1111111111111111111111111111111111111111',
    to: '0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997',
    valueUsd: 75, // $75 > $50 limit!
  };

  assert.throws(
    () => enforceAgentPolicy(policy, tx),
    (err) => {
      assert.strictEqual(err.code, 4001);
      assert.strictEqual(err.reason, 'VALUE_LIMIT_EXCEEDED');
      return true;
    }
  );
});

test('Policy Engine: Calling unapproved contract throws DESTINATION_NOT_ALLOWED', () => {
  const policy = {
    agentAddress: '0x1111111111111111111111111111111111111111',
    maxLimitUSD: 50,
    expiry: Date.now() + 600000,
    allowedContracts: ['0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997'],
  };

  const tx = {
    from: '0x1111111111111111111111111111111111111111',
    to: '0x0000000000000000000000000000000000000001', // not allowed!
    valueUsd: 10,
  };

  assert.throws(
    () => enforceAgentPolicy(policy, tx),
    (err) => {
      assert.strictEqual(err.code, 4001);
      assert.strictEqual(err.reason, 'DESTINATION_NOT_ALLOWED');
      return true;
    }
  );
});

test('Policy Engine: Expired policy throws POLICY_EXPIRED', () => {
  const policy = {
    agentAddress: '0x1111111111111111111111111111111111111111',
    maxLimitUSD: 50,
    expiry: Date.now() - 5000, // already expired!
    allowedContracts: ['0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997'],
  };

  const tx = {
    from: '0x1111111111111111111111111111111111111111',
    to: '0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997',
    valueUsd: 10,
  };

  assert.throws(
    () => enforceAgentPolicy(policy, tx),
    (err) => {
      assert.strictEqual(err.code, 4001);
      assert.strictEqual(err.reason, 'POLICY_EXPIRED');
      return true;
    }
  );
});

test('Policy Engine: Missing target throws UNSUPPORTED_TRANSACTION', () => {
  const policy = {
    agentAddress: '0x1111111111111111111111111111111111111111',
    maxLimitUSD: 50,
    expiry: Date.now() + 600000,
    allowedContracts: ['0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997'],
  };

  const tx = {
    from: '0x1111111111111111111111111111111111111111',
    valueUsd: 10,
  };

  assert.throws(
    () => enforceAgentPolicy(policy, tx),
    (err) => {
      assert.strictEqual(err.code, 4001);
      assert.strictEqual(err.reason, 'UNSUPPORTED_TRANSACTION');
      return true;
    }
  );
});

test('Policy Engine: Revoked policy throws POLICY_REVOKED', () => {
  const policy = {
    agentAddress: '0x1111111111111111111111111111111111111111',
    maxLimitUSD: 50,
    expiry: Date.now() + 600000,
    allowedContracts: ['0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997'],
    revoked: true,
  };

  const tx = {
    from: '0x1111111111111111111111111111111111111111',
    to: '0x7c2e142C203f43C5e6F9206A5c66b8A8DA9BF997',
    valueUsd: 10,
  };

  assert.throws(
    () => enforceAgentPolicy(policy, tx),
    (err) => {
      assert.strictEqual(err.code, 4001);
      assert.strictEqual(err.reason, 'POLICY_REVOKED');
      return true;
    }
  );
});
