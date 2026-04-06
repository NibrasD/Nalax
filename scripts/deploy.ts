/**
 * @file deploy.ts
 * @notice Manual deployment script for Nalax protocol.
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("           Nalax Protocol - Deployment Script           ");
  console.log("═══════════════════════════════════════════════════════════");
  console.log();

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`Network:     ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Deployer:    ${deployer.address}`);
  console.log(`Balance:     ${ethers.formatEther(balance)} ETH`);
  console.log();

  if (balance === 0n) {
    console.error("ERROR: Deployer has no balance.");
    process.exit(1);
  }

  const PROTOCOL_FEE_BPS = 250;
  const FEE_RECIPIENT = deployer.address;

  const isLocalNetwork = network.chainId === 31337n;
  let zenTokenAddress: string;

  if (isLocalNetwork) {
    console.log("📦 Deploying MockZEN for local testing...");
    const MockZEN = await ethers.getContractFactory("MockZEN");
    const mockZen = await MockZEN.deploy(ethers.parseEther("100000000"));
    await mockZen.waitForDeployment();
    zenTokenAddress = await mockZen.getAddress();
    console.log(`   MockZEN deployed to: ${zenTokenAddress}`);
  } else {
    zenTokenAddress =
      process.env.ZEN_TOKEN_TESTNET ||
      process.env.ZEN_TOKEN_MAINNET ||
      "0xf43eB8De897Fbc7F2502483B2Bef7Bb9EA179229";
    console.log(`   Using existing ZEN: ${zenTokenAddress}`);
  }
  console.log();

  console.log("📦 Deploying NalaxFactory...");
  const NalaxFactory = await ethers.getContractFactory("NalaxFactory");
  const factory = await NalaxFactory.deploy(
    zenTokenAddress,
    deployer.address,
    FEE_RECIPIENT,
    PROTOCOL_FEE_BPS
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`   NalaxFactory deployed to: ${factoryAddress}`);
  console.log();

  const zkVerifierAddress = await factory.zkVerifier();
  console.log(`   ZK Verifier (stub): ${zkVerifierAddress}`);
  console.log();

  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      NalaxFactory: factoryAddress,
      ZKVerifier: zkVerifierAddress,
      ZENToken: zenTokenAddress,
    },
    config: {
      protocolFeeBps: PROTOCOL_FEE_BPS,
      feeRecipient: FEE_RECIPIENT,
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(
    deploymentsDir,
    `${network.name}-${Number(network.chainId)}.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment saved to: ${deploymentFile}`);

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
