# Nalax Protocol

> **The First Confidential Sealed-Bid Auction Protocol on Horizen Base L3**

Nalax is a privacy-preserving sealed-bid auction protocol where no one—not bidders, not the seller, not observers—can see any bid amount, bidder identity until the auction timer expires. At reveal time, only the winning bid and final price are revealed.

## 🏗️ Architecture
┌─────────────────────┐
│ NalaxFactory │
│ (Singleton) │
└──────────┬──────────┘
│ creates
┌───────────────────────┼───────────────────────┐
▼ ▼ ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Auction #1 │ │ Auction #2 │ │ Auction #N │
│ (Nalax) │ │ (Nalax) │ │ (Nalax) │
└─────────────┘ └─────────────┘ └─────────────┘

## 🔒 Privacy Guarantees

| Phase | What's Hidden | What's Visible |
|-------|---------------|----------------|
| Commit | Bid amounts, bidder identities | Commitment hashes (non-correlating) |
| Reveal | Losing bid amounts, non-revealed bids | Validity of revealed bids |
| Settlement | Losing bid amounts | Winning bid, winner identity, final price |

## 🛠️ Tech Stack

- **Chain**: Horizen Base L3 (EVM-compatible OP Stack)
- **Language**: Solidity ^0.8.24
- **Framework**: Hardhat + TypeScript
- **Deployment**: Hardhat Ignition
- **Libraries**: OpenZeppelin v5
- **Privacy**: Cryptographic Commitments (keccak256)
- **Future**: ZK-SNARKs (Groth16) + Horizen HCCE/TEE

## 📦 Installation

```bash
# Clone repository
git clone https://github.com/NibrasD/nalax.git
cd Nalax

# Install dependencies
npm install --legacy-peer-deps

# Copy environment file
cp .env.example .env

# Edit .env with your private key and RPC
```

## 🚀 Quick Start
### 1. Local Testing
```bash
# Start local node
npx hardhat node

# Deploy to local
npx hardhat ignition deploy ignition/modules/VeilBid.ts --network localhost

# Run interaction demo
npx hardhat run scripts/interact.ts --network localhost
```

### 2. Run Tests
```bash
# Run all tests
npm test

# Run with gas reporting
REPORT_GAS=true npm test

# Run coverage
npm run test:coverage
```

### 3. Deploy to Horizen Testnet
```bash
# Update .env with:
# - DEPLOYER_PRIVATE_KEY (funded on Horizen testnet)
# - ZEN_TOKEN_TESTNET (testnet ZEN address)

# Deploy
npx hardhat ignition deploy ignition/modules/VeilBid.ts --network horizenTestnet

# Verify (if supported)
npx hardhat verify --network horizenTestnet <FACTORY_ADDRESS> <ZEN_ADDRESS> <OWNER> <FEE_RECIPIENT> <FEE_BPS>
```

## 📋 Contract Overview
### NalaxFactory.sol
- Creates and manages Nalax auctions
- Stores protocol configuration (fees, duration limits)
- Tracks seller auction history
- Deploys ZK verifier stub

### NalaxAuction.sol
- Single auction lifecycle management
- Commit phase: Accepts sealed commitments + ZEN
- Reveal phase: Verifies bid + salt against commitment
- Settlement: Distributes funds, determines winner
- Emergency: Pause, cancel, emergency withdrawal

### Groth16Verifier.sol
- Stub ZK-SNARK verifier for POC
- Accepts any proof in stub mode
- Ready for replacement with real Groth16 verifier

### MockZEN.sol
- Mock ERC-20 for local testing
- Matches ZEN token interface (18 decimals)

## 🔐 Privacy Implementation
### Commitment Scheme
```solidity
commitment = keccak256(abi.encode(bidAmount, salt))
```
- `bidAmount`: The actual bid (hidden by hash)
- `salt`: Random 256-bit value (prevents preimage attacks)

### Production ZK-SNARK Integration
The POC uses simple keccak256 commitments. For production, replace with ZK-SNARKs:

**Define Circuit (Circom):**
```circom
template VeilBidCommit() {
    signal input bidAmount;
    signal input salt;
    signal input minBid;
    signal input commitment;
    
    // Prove bid >= minBid
    signal diff = bidAmount - minBid;
    diff === 1; // Force positive via range check
    
    // Prove commitment is correct
    component hasher = Poseidon(2);
    hasher.inputs[0] <== bidAmount;
    hasher.inputs[1] <== salt;
    commitment === hasher.out;
}
```

**Generate Verifier:**
```bash
snarkjs zkey export solidityverifier circuit_0001.zkey verifier.sol
```

**Integrate with Horizen zkVerify:**
```solidity
// Use Horizen zkVerify precompile when available
address constant ZKVERIFY = 0x00000000000000000000000000000000000000FF;
(bool success,) = ZKVERIFY.staticcall(abi.encode(proof, publicInputs));
```

### TEE/HCCE Integration Points
For secure reveal phase execution:
```solidity
// PRODUCTION: Replace revealBid() with TEE-based reveal
function submitEncryptedReveal(bytes calldata encryptedData) external {
    // 1. Send encrypted data to HCCE off-chain
    // 2. HCCE decrypts and verifies in trusted environment
    // 3. HCCE returns signed attestation
    // 4. Contract verifies attestation signature
    // 5. Update state without exposing bid in mempool
}
```

## 💰 ZEN Token Integration
### Mainnet Address
```text
0xf43eB8De897Fbc7F2502483B2Bef7Bb9EA179229
```

### Testnet Address
Check Horizen documentation for current testnet ZEN address.

### Getting Testnet ZEN
- Bridge ZEN from Horizen EON to Horizen Base L3
- Or use faucet (if available)
- Check Horizen docs: https://docs.horizen.io

### Local Testing
MockZEN is automatically deployed with 100M supply for testing.

## 🧪 Test Coverage
```text
VeilBid Protocol
├── Factory Deployment (4 tests)
├── Auction Creation (4 tests)
├── Commit Phase (6 tests)
├── Reveal Phase (6 tests)
├── Settlement (7 tests)
├── Refunds (2 tests)
├── Edge Cases & Security (4 tests)
├── Emergency Functions (6 tests)
└── ZK Verifier Stub (3 tests)

Total: 42+ tests
```

## ⚙️ Configuration
### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| DEPLOYER_PRIVATE_KEY | Deployer wallet private key | Yes |
| ZEN_TOKEN_TESTNET | Testnet ZEN address | For testnet |
| ZEN_TOKEN_MAINNET | Mainnet ZEN address | For mainnet |

### Factory Parameters
| Parameter | Default | Description |
|-----------|---------|-------------|
| protocolFeeBps | 250 | Protocol fee (2.5%) |
| minAuctionDuration | 1 hour | Minimum commit phase |
| maxAuctionDuration | 30 days | Maximum commit phase |
| minRevealDuration | 15 min | Minimum reveal phase |

## 🔧 Production Checklist
- [ ] Replace Groth16Verifier stub with real verifier
- [ ] Integrate Horizen zkVerify precompile
- [ ] Implement HCCE/TEE reveal phase
- [ ] Add ERC-721/ERC-1155 item transfer
- [ ] Implement protocol fee collection
- [ ] Add auction metadata (IPFS)
- [ ] Security audit
- [ ] Gas optimization review
- [ ] Frontend integration
- [ ] Monitoring and alerts

## 📄 License
MIT License - see LICENSE file for details.
