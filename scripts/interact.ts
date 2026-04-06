/**
 * @file interact.ts
 * @notice Interaction script demonstrating full Nalax auction lifecycle.
 */

import { ethers } from "hardhat";

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

async function advanceTime(seconds: number): Promise<void> {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

async function getCurrentTime(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block!.timestamp;
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("        Nalax Protocol - Interaction Demo               ");
  console.log("═══════════════════════════════════════════════════════════");
  console.log();

  const [seller, bidder1, bidder2, bidder3] = await ethers.getSigners();
  console.log(`Seller:  ${seller.address}`);
  console.log(`Bidder1: ${bidder1.address}`);
  console.log(`Bidder2: ${bidder2.address}`);
  console.log(`Bidder3: ${bidder3.address}`);

  const MockZEN = await ethers.getContractFactory("MockZEN");
  const zenToken = await MockZEN.deploy(ethers.parseEther("1000000")) as any;
  await zenToken.waitForDeployment();
  const zenAddress = await zenToken.getAddress();
  console.log(`MockZEN deployed: ${zenAddress}`);

  const NalaxFactory = await ethers.getContractFactory("NalaxFactory");
  const factory = await NalaxFactory.deploy(
    zenAddress,
    seller.address,
    seller.address,
    250
  ) as any;
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`Factory deployed: ${factoryAddress}`);

  for (const bidder of [bidder1, bidder2, bidder3]) {
    await zenToken.connect(seller).transfer(bidder.address, ethers.parseEther("1000"));
  }

  const currentTime = await getCurrentTime();
  const startTime = currentTime + 60;
  const endTime = startTime + 300;
  const revealDuration = 120;
  const minBid = ethers.parseEther("10");
  const reservePrice = ethers.parseEther("50");

  const createTx = await factory
    .connect(seller)
    .createAuction(
      ethers.ZeroAddress,
      0,
      startTime,
      endTime,
      revealDuration,
      minBid,
      reservePrice,
      true
    );

  const createReceipt = await createTx.wait();
  const auctionCreatedEvent = createReceipt!.logs.find(
    (log: any) => log.fragment?.name === "AuctionCreated"
  );
  const auctionAddress = auctionCreatedEvent?.args?.auction;

  console.log(`Auction created! Address: ${auctionAddress}`);

  const NalaxAuction = await ethers.getContractFactory("NalaxAuction");
  const auction = NalaxAuction.attach(auctionAddress) as any;

  await advanceTime(61);

  const bid1Amount = ethers.parseEther("30");
  const salt1 = generateSalt();
  const commitment1 = generateCommitment(bid1Amount, salt1);
  await zenToken.connect(bidder1).approve(auctionAddress, bid1Amount);
  await auction.connect(bidder1).submitCommitment(commitment1, bid1Amount);

  const bid2Amount = ethers.parseEther("80");
  const salt2 = generateSalt();
  const commitment2 = generateCommitment(bid2Amount, salt2);
  await zenToken.connect(bidder2).approve(auctionAddress, bid2Amount);
  await auction.connect(bidder2).submitCommitment(commitment2, bid2Amount);

  const bid3Amount = ethers.parseEther("60");
  const salt3 = generateSalt();
  const commitment3 = generateCommitment(bid3Amount, salt3);
  await zenToken.connect(bidder3).approve(auctionAddress, bid3Amount);
  await auction.connect(bidder3).submitCommitment(commitment3, bid3Amount);

  await advanceTime(301);

  await auction.connect(bidder1).revealBid(bid1Amount, salt1);
  await auction.connect(bidder2).revealBid(bid2Amount, salt2);
  await auction.connect(bidder3).revealBid(bid3Amount, salt3);

  await advanceTime(121);

  const settleTx = await auction.settle();
  const settleReceipt = await settleTx.wait();
  const settledEvent = settleReceipt!.logs.find(
    (log: any) => log.fragment?.name === "AuctionSettled"
  );

  if (settledEvent) {
    const winningAmount = settledEvent.args?.winningAmount;
    console.log(`🏆 Auction settled! Winning bid: ${ethers.formatEther(winningAmount)} ZEN`);
  }

  return;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Interaction demo failed:");
    console.error(error);
    process.exit(1);
  });
