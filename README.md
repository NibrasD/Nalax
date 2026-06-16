# Nalax ✨ — Interledger & Web Monetization Platform

**Nalax** is a next-generation decentralized content publishing platform built for the **Interledger Protocol (ILP)** and **Web Monetization**. It empowers creators to publish censorship-resistant content on IPFS and monetize their work natively on the web without relying on centralized payment gateways or ads.

This project was developed in alignment with the **Interledger Foundation (ILF) Fellowship** requirements, showcasing a complete integration of the Open Payments API and the W3C Web Monetization specification.

---

## 🌟 Key Features

1. **W3C Web Monetization Native**
   * Nalax automatically injects `<link rel="monetization">` payment pointers for authors into their articles.
   * Readers using Web Monetization extensions (like coil or browser-native support) automatically stream micropayments to the author while reading.

2. **Open Payments API Integration**
   * Fully functional Open Payments API backend handling `incoming-payment` and `outgoing-payment` flows.
   * Manual tipping mechanism allowing readers to send customized amounts via GNAP grants and HTTP Message Signatures (RFC 9421 with Ed25519 keys).

3. **Self-Hosted Rafiki Connector (Optional)**
   * Built to connect directly with the `rafiki.money` testnet or route through a self-hosted Rafiki ILP instance to act as a true peer on the Interledger network.

4. **IPFS Decentralized Storage**
   * Content is stored immutably on IPFS via the Pinata API.
   * No central database controls your content; you own your words.

5. **Cross-Chain Tipping (Stellar DEX)**
   * Support for tipping authors using Stellar path payments, automatically routing XLM or other assets to the author's preferred ILP or Stellar wallet.

---

## 🛠️ Technology Stack

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand
* **ILP Server**: Node.js, Express, Open Payments SDK
* **Storage**: IPFS (Pinata)
* **Signatures**: `@interledger/http-signature-utils` (Ed25519)
* **Blockchain**: `@stellar/stellar-sdk`

---

## 🚀 Local Development

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```
Fill in your Pinata JWT, Gemini API key, and your ILP Wallet / Auth Server configurations.

### 3. Generate Ed25519 Keys (For Open Payments)
If you are running the ILP backend, you need keys to sign requests:
```bash
npx tsx server/generate-keys.ts
```
Add the generated `PRIVATE_KEY_BASE64` to your `.env` file and upload the Public Key to your Rafiki Admin UI.

### 4. Run the Full Stack
Start both the Vite frontend and the Express ILP server concurrently:
```bash
npm run dev
```
* Frontend runs on `http://localhost:5173`
* ILP Backend runs on `http://localhost:3001`

---

## 🌐 Deployment Architecture

Nalax uses a split-stack deployment for optimal performance and compatibility:

1. **Frontend (Static SPA)**
   * Built via `npm run build`.
   * The `dist` folder is hosted on Namecheap shared hosting via standard FTP, configured with an `.htaccess` file for React Router SPA fallbacks.

2. **ILP Backend Server**
   * The Express backend (`server/ilp.ts`) handling Open Payments GNAP flows and HTTP signatures is deployed on Render as a persistent Node.js web service.

3. **Rafiki Instance (Optional)**
   * A full Docker Compose configuration for deploying a self-hosted Rafiki node (Backend, Auth, Admin UI) is available. (Not tracked in git for security reasons).

---

*Built for the Interledger Foundation (ILF) Fellowship.*
