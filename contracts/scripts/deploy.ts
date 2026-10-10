import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import hre from 'hardhat';

interface DeploymentOutput {
  network: string;
  chainId: number;
  deployer: string;
  deployedAt: string;
  contracts: {
    ProoflyRegistry: string;
    ProoflyPolicy: string;
    ProoflySession: string;
    ProoflyTaskGate: string;
  };
}

async function main(): Promise<void> {
  const [deployer] = await hre.ethers.getSigners();

  if (!deployer) {
    throw new Error('No deployer account available. Set DEPLOYER_PRIVATE_KEY in .env.');
  }

  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  if (chainId !== 84532) {
    throw new Error(`Unexpected chain ID ${chainId}. Use Base Sepolia (84532).`);
  }

  // World ID constructor args — use address(0) to enable trusted-relay mode when no live router.
  const worldIdRouter = process.env.WORLD_ID_ROUTER ?? '0x0000000000000000000000000000000000000000';
  const worldAppId = process.env.WORLD_APP_ID ?? process.env.NEXT_PUBLIC_WORLD_APP_ID ?? 'app_staging';
  const worldAction = process.env.WORLD_ACTION ?? process.env.WORLD_ID_ACTION ?? 'proofly-human-verify';

  const registry = await hre.ethers.deployContract('ProoflyRegistry', [worldIdRouter, worldAppId, worldAction]);
  await registry.waitForDeployment();

  const policy = await hre.ethers.deployContract('ProoflyPolicy');
  await policy.waitForDeployment();

  const session = await hre.ethers.deployContract('ProoflySession');
  await session.waitForDeployment();

  const taskGate = await hre.ethers.deployContract('ProoflyTaskGate', [await registry.getAddress()]);
  await taskGate.waitForDeployment();

  const output: DeploymentOutput = {
    network: hre.network.name,
    chainId,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      ProoflyRegistry: await registry.getAddress(),
      ProoflyPolicy: await policy.getAddress(),
      ProoflySession: await session.getAddress(),
      ProoflyTaskGate: await taskGate.getAddress(),
    },
  };

  const deploymentsDir = join(hre.config.paths.root, 'deployments');
  await mkdir(deploymentsDir, { recursive: true });

  const deploymentFile = join(deploymentsDir, 'base-sepolia.json');
  await writeFile(deploymentFile, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  const envLines = [
    `NEXT_PUBLIC_PROOFLY_REGISTRY_ADDRESS=${output.contracts.ProoflyRegistry}`,
    `NEXT_PUBLIC_PROOFLY_POLICY_ADDRESS=${output.contracts.ProoflyPolicy}`,
    `NEXT_PUBLIC_PROOFLY_SESSION_ADDRESS=${output.contracts.ProoflySession}`,
    `NEXT_PUBLIC_PROOFLY_TASK_GATE_ADDRESS=${output.contracts.ProoflyTaskGate}`,
    `VITE_PROOFLY_REGISTRY_ADDRESS=${output.contracts.ProoflyRegistry}`,
    `VITE_PROOFLY_POLICY_ADDRESS=${output.contracts.ProoflyPolicy}`,
    `VITE_PROOFLY_SESSION_ADDRESS=${output.contracts.ProoflySession}`,
    `VITE_PROOFLY_TASK_GATE_ADDRESS=${output.contracts.ProoflyTaskGate}`,
  ];

  const envFile = join(deploymentsDir, 'base-sepolia.env');
  await writeFile(envFile, `${envLines.join('\n')}\n`, 'utf8');

  console.log('Proofly contracts deployed on Base Sepolia.');
  console.log(`Deployment artifact: ${deploymentFile}`);
  console.log(`Environment snippet: ${envFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
