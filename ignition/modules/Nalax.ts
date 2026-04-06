/**
 * @file Nalax.ts
 * @notice Hardhat Ignition deployment module for Nalax protocol.
 */

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

const PROTOCOL_FEE_BPS = 250;
const MOCK_ZEN_SUPPLY = ethers.parseEther("100000000");

function getFeeRecipient(deployer: string): string {
  const envRecipient = process.env.FEE_RECIPIENT;
  return envRecipient || deployer;
}

export default buildModule("Nalax", (m) => {
  const deployer = m.getAccount(0);
  const feeRecipient = getFeeRecipient(deployer);

  const isLocalNetwork =
    process.env.HARDHAT_NETWORK === "localhost" ||
    process.env.HARDHAT_NETWORK === undefined;

  let zenTokenAddress: string;

  if (isLocalNetwork) {
    const mockZen = m.contract("MockZEN", [MOCK_ZEN_SUPPLY], {
      id: "MockZEN",
    });
    zenTokenAddress = mockZen;
  } else {
    const envZenAddress =
      process.env.ZEN_TOKEN_TESTNET || process.env.ZEN_TOKEN_MAINNET;

    if (!envZenAddress) {
      throw new Error(
        "ZEN_TOKEN_TESTNET or ZEN_TOKEN_MAINNET must be set in .env for non-local deployments"
      );
    }

    zenTokenAddress = envZenAddress;
  }

  const nalaxFactory = m.contract(
    "NalaxFactory",
    [zenTokenAddress, deployer, feeRecipient, PROTOCOL_FEE_BPS],
    {
      id: "NalaxFactory",
      after: isLocalNetwork ? ["MockZEN"] : [],
    }
  );

  return {
    nalaxFactory,
    zenToken: zenTokenAddress,
    deployer,
    feeRecipient,
    protocolFeeBps: PROTOCOL_FEE_BPS,
  };
});

export const CreateTestAuction = buildModule(
  "CreateTestAuction",
  (m) => {
    const factory = m.contractAt(
      "NalaxFactory",
      m.getParameter("factoryAddress")
    );

    const startTime = Math.floor(Date.now() / 1000) + 300;
    const endTime = startTime + 3600;
    const revealDuration = 1800;
    const minBid = ethers.parseEther("1");
    const reservePrice = ethers.parseEther("10");

    const createTx = m.call(factory, "createAuction", [
      ethers.ZeroAddress,
      0,
      startTime,
      endTime,
      revealDuration,
      minBid,
      reservePrice,
      true,
    ]);

    return { createTx };
  }
);
