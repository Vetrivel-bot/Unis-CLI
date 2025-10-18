<p align="center">
  <img src="./src/assets/logo.png" alt="UniS Logo" width="120" height="120" />
</p>

<h1 align="center">🛡️ UniS — Secure Communication Ecosystem</h1>

Smart India Hackathon (SIH) 2025 Project — ID: SIH25184

UniS (Unified Secure Communication System) is a defense-grade, end-to-end encrypted communication ecosystem built for the Smart India Hackathon 2025.
It provides secure text, voice, and video communication, encrypted file sharing, and multi-level access control — designed to serve defense, government, and institutional use cases.

🚀 Features

🔒 End-to-End Encryption (E2EE) — full data confidentiality for messages and files

🧠 Post-Quantum Encryption (Future Ready) — resists quantum attacks

💬 Real-Time Chat — instant, private, and seamless

📁 Secure File Sharing — AES-encrypted file exchange

📞 Voice & Video Calls — real-time communication with low latency

🧩 Multi-Level Admin Control — departmental isolation

☁️ Cloud / Self Hosting — flexible deployment for security compliance

🇮🇳 Made in India, for Secure India

🧰 Tech Stack

Frontend (Mobile App)

React Native

Context API

Keystore

Secure Storage

Backend (Server)

Node.js + Express

Socket.IO

MongoDB

Redis

Postgres

JWT, AES, RSA Encryption

⚙️ Installation & Setup
📱 Frontend (React Native)
git clone https://github.com/V/Unis-CLI.git
cd Unis-CLI
npm install
npx expo start

💾 Backend (Node.js)
git clone https://github.com/<your-username>/Unis-server.git
cd Unis-server
npm install
npm run dev

Create a .env file in the backend root:
PORT=3000
MONGO_URI=<your_mongodb_connection>
FIREBASE_PROJECT_ID=<firebase_project_id>
FIREBASE_PRIVATE_KEY=<firebase_private_key>
FIREBASE_CLIENT_EMAIL=<firebase_client_email>
JWT_SECRET=<your_secret>

🧱 Project Structure
    Unis-CLI/              # React Native App
    ├── android/
    ├── ios/
    └── src/
    Unis-server/           # Node.js Backend
    ├── routes/
    ├── controllers/
    ├── models/
    └── utils/

🔄 System Architecture

Client (UniS App) encrypts all messages before sending.

Server acts as a secure relay using Socket.IO (no message access).

Receiver App decrypts the message locally.

Files stored temporarily using encrypted file storage.

💡 This ensures true end-to-end encryption — even the server can’t read user data.

🧪 Future Roadmap

🧠 Post-Quantum Cryptography Layer

🕹️ Mobile Admin Dashboard

🧩 Department-wise Encrypted Networks

🚀 Cloud Auto-Scaling & Load Balancing

🇮🇳 Fully Indian Defense Cloud Deployment

🏆 Smart India Hackathon (SIH) 2025

Track: Cybersecurity / Communication Systems
Team: SRM Group of Institutions
Project ID: SIH2025-UNIS-0943
Status: Prototype Development Phase
Focus: National-Grade Secure Communication System



