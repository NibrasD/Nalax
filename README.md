# StellarScribe ✨

**StellarScribe** is a premium, decentralized content publishing platform built on the **Stellar** utilizing **Soroban Smart Contracts**. It empowers creators to publish, tokenize, and monetize their long-form writing natively on Web3, ensuring they retain ownership of their content and revenue.

---

## 🌟 Key Features

1. **On-Chain Identity & Authorship**
   * Link your Freighter wallet to create a permanent, verifiable author profile stored directly on the Soroban smart contract.
   * Completely tamper-proof track record of publications, earnings, and engagement.

2. **Content NFTs & Hashing**
   * Write seamlessly in our distraction-free, split-pane Markdown editor.
   * On publish, the content is securely hashed using SHA-256. This hash is embedded into a newly minted **Content NFT** on the Stellar ledger, proving authenticity.

3. **Token-Gating & Monetization**
   * Set custom prices (in XLM) for premium articles. 
   * Content remains locked at the smart contract level until a reader purchases access, moving funds directly from reader to writer with zero platform fees.

4. **Direct Tipping Mechanism**
   * Readers can easily send direct tips in XLM to authors they love with a click of a button.

5. **Premium User Experience**
   * A meticulously crafted, responsive dark theme built with TailwindCSS v4.
   * Instant toast notifications, smooth micro-animations, and a flawless wallet integration flow using the newest `@stellar/freighter-api` (v6+).

---

## 🛠️ Technology Stack

* **Smart Contracts**: Rust (Soroban SDK v22)
* **Frontend Framework**: React 19, TypeScript, Vite
* **Styling**: Tailwind CSS v4, Lucide React (Icons)
* **State Management**: Zustand
* **Wallet Integration**: `@stellar/freighter-api`, `@stellar/stellar-sdk`

---

## 🚀 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Web App
```bash
npm run dev
```

### 3. Build the Soroban Contract
Ensure you have Rust and the `stellar-cli` installed.
```bash
cd contracts/stellarscribe
cargo test
cargo build --target wasm32-unknown-unknown --release
```

---

## 🌐 Deployment (Render)

This project includes a `render.yaml` file for instant, reproducible deployments on [Render.com](https://render.com) as a Static Web Site serving the `dist` folder natively.

---
*Built for the Stellar Ecosystem.*
