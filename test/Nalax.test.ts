/**
 * @file Nalax.test.ts
 * @notice Comprehensive test suite for Nalax protocol.
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

interface AuctionFixture {
  mockZen: any;
  factory: any;
  zkVerifier: any;
  seller: SignerWithAddress;
  bidder1: SignerWithAddress;
  bidder2: SignerWithAddress;
  bidder3: SignerWithAddress;
  owner: SignerWithAddress;
  other: SignerWithAddress;
  createAuction: (overrides?: Partial<AuctionParams>) => Promise<any>;
  generateCommitment: (bidAmount: bigint, salt: bigint) => string;
  generateSalt: () => bigint;
}

interface AuctionParams {
  itemToken: string;
  itemId: bigint;
  startTime: number;
  endTime: number;
  revealDuration: number;
  minBid: bigint;
  reservePrice: bigint;
  antiSnipingEnabled: boolean;
}

function generateSalt(): bigint {
  return BigInt(ethers.hexlify(ethers.randomBytes(32)));
}

function generateCommitment(bidAmount: bigint, salt: bigint): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256"],
      [bidAmount, salt]
    )
  );
}

const TEN_ZEN = ethers.parseEther("10");
const FIFTY_ZEN = ethers.parseEther("50");
const HUNDRED_ZEN = ethers.parseEther("100");

async function deployFixture(): Promise<AuctionFixture> {
  const [owner, seller, bidder1, bidder2, bidder3, other] = await ethers.getSigners();

  const MockZEN = await ethers.getContractFactory("MockZEN");
  const mockZen = await MockZEN.deploy(ethers.parseEther("100000000"));
  await mockZen.waitForDeployment();
  const zenAddress = await mockZen.getAddress();

  const NalaxFactory = await ethers.getContractFactory("NalaxFactory");
  const factory = await NalaxFactory.deploy(
    zenAddress,
    owner.address,
    owner.address,
    250
  ) as any;
  await factory.waitForDeployment();

  const zkVerifierAddress = await factory.zkVerifier();
  const ZKVerifier = await ethers.getContractFactory("Groth16Verifier");
  const zkVerifier = ZKVerifier.attach(zkVerifierAddress);

  for (const bidder of [seller, bidder1, bidder2, bidder3]) {
    await mockZen.transfer(bidder.address, ethers.parseEther("10000"));
  }

  const createAuction = async (overrides: Partial<AuctionParams> = {}) => {
    const latestTime = await time.latest();
    const defaults: AuctionParams = {
      itemToken: ethers.ZeroAddress,
      itemId: 0n,
      startTime: latestTime + 100,
      endTime: latestTime + 700,
      revealDuration: 300,
      minBid: TEN_ZEN,
      reservePrice: FIFTY_ZEN,
      antiSnipingEnabled: false,
    };

    const params = { ...defaults, ...overrides };

    const tx = await factory
      .connect(seller)
      .createAuction(
        params.itemToken,
        params.itemId,
        params.startTime,
        params.endTime,
        params.revealDuration,
        params.minBid,
        params.reservePrice,
        params.antiSnipingEnabled
      );

    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (log: any) => log.fragment?.name === "AuctionCreated"
    );
    const auctionAddress = event.args.auction;

    const NalaxAuction = await ethers.getContractFactory("NalaxAuction");
    return NalaxAuction.attach(auctionAddress);
  };

  return {
    mockZen,
    factory,
    zkVerifier,
    seller,
    bidder1,
    bidder2,
    bidder3,
    owner,
    other,
    createAuction,
    generateCommitment,
    generateSalt,
  };
}

describe("Nalax Protocol", function () {
  describe("Factory Deployment", function () {
    it("Should deploy factory with correct configuration", async function () {
      const { factory, mockZen, owner } = await loadFixture(deployFixture);
      expect(await factory.zenToken()).to.equal(await mockZen.getAddress());
      expect(await factory.owner()).to.equal(owner.address);
    });
  });

  describe("Auction Creation", function () {
    it("Should create auction with correct parameters", async function () {
      const { createAuction, seller } = await loadFixture(deployFixture);
      const auction = await createAuction({ minBid: HUNDRED_ZEN });
      const config = await auction.config();
      // In ethers v6, returned structs are array-like but have named properties
      expect(config[0]).to.equal(seller.address); // config.seller is index 0
    });
  });

  describe("Commit & Reveal Phase", function () {
    it("Should handle full auction flow correctly", async function () {
      const { mockZen, bidder1, createAuction } = await loadFixture(deployFixture);
      const auction = await createAuction({ reservePrice: 0n });
      const auctionAddress = await auction.getAddress();

      const config = await auction.config();
      await time.increaseTo(Number(config[3]) - 1); // config.startTime is index 3

      const bidAmount = HUNDRED_ZEN;
      const salt = generateSalt();
      const commitment = generateCommitment(bidAmount, salt);

      await mockZen.connect(bidder1).approve(auctionAddress, bidAmount);
      await auction.connect(bidder1).submitCommitment(commitment, bidAmount);

      await time.increaseTo(Number(config[4]) + 1); // config.endTime is index 4
      await auction.connect(bidder1).revealBid(bidAmount, salt);

      await time.increaseTo(Number(await auction.getRevealEndTime()) + 1);
      await auction.settle();

      expect(await auction.phase()).to.equal(3n); // Settled
    });
  });
});
