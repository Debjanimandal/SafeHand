import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProoflyClient,
  ProviderNotFoundError,
  WrongChainError,
  PolicyDeniedError,
  UserRejectedError,
  parseProviderError,
} from '../dist/index.js';

test('SDK: createProoflyClient returns client instance', () => {
  const client = createProoflyClient();
  assert.ok(client);
  assert.strictEqual(typeof client.isInstalled, 'function');
  assert.strictEqual(typeof client.connect, 'function');
  assert.strictEqual(typeof client.sendTransaction, 'function');
});

test('SDK: Throws ProviderNotFoundError when provider is unavailable in Node context', async () => {
  const client = createProoflyClient();
  assert.strictEqual(client.isInstalled(), false);

  await assert.rejects(
    async () => {
      await client.connect();
    },
    (err) => {
      assert.ok(err instanceof ProviderNotFoundError);
      assert.strictEqual(err.code, 4902);
      return true;
    }
  );
});

test('SDK: Wraps mock provider and executes connect and getAccounts', async () => {
  const mockProvider = {
    isProofly: true,
    async request({ method }) {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
        return ['0x71C80918045eA775e14236752b56303261523cc6'];
      }
      if (method === 'eth_chainId') {
        return '0x14a34';
      }
      throw new Error(`Unhandled method: ${method}`);
    },
  };

  const client = createProoflyClient({ provider: mockProvider });
  assert.strictEqual(client.isInstalled(), true);

  const accounts = await client.connect();
  assert.deepStrictEqual(accounts, ['0x71C80918045eA775e14236752b56303261523cc6']);

  const chainId = await client.getChainId();
  assert.strictEqual(chainId, '0x14a34');

  await assert.doesNotReject(async () => {
    await client.assertExpectedChain();
  });
});

test('SDK: assertExpectedChain throws WrongChainError on chain mismatch', async () => {
  const mockProvider = {
    isProofly: true,
    async request({ method }) {
      if (method === 'eth_chainId') return '0x1'; // Ethereum Mainnet instead of Base Sepolia (0x14a34)
      return null;
    },
  };

  const client = createProoflyClient({ provider: mockProvider, expectedChainId: '0x14a34' });

  await assert.rejects(
    async () => {
      await client.assertExpectedChain();
    },
    (err) => {
      assert.ok(err instanceof WrongChainError);
      assert.strictEqual(err.code, 4901);
      assert.strictEqual(err.currentChainId, '0x1');
      assert.strictEqual(err.expectedChainId, '0x14a34');
      return true;
    }
  );
});

test('SDK: parseProviderError distinguishes PolicyDeniedError from UserRejectedError', () => {
  const policyErr = {
    code: 4001,
    message: 'Transaction value exceeds policy maxLimitUSD ($75 > $50).',
  };
  const parsedPolicy = parseProviderError(policyErr);
  assert.ok(parsedPolicy instanceof PolicyDeniedError);
  assert.strictEqual(parsedPolicy.reason, 'VALUE_LIMIT_EXCEEDED');

  const rejectErr = {
    code: 4001,
    message: 'User rejected request.',
  };
  const parsedReject = parseProviderError(rejectErr);
  assert.ok(parsedReject instanceof UserRejectedError);
  assert.strictEqual(parsedReject.code, 4001);
});
