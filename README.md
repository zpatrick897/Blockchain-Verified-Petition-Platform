# 📜 Blockchain-Verified Petition Platform

Welcome to a transparent and tamper-proof platform for driving policy changes through blockchain-verified petitions! This project empowers citizens to create, sign, and verify petitions for policy reforms using the Stacks blockchain and Clarity smart contracts. It solves real-world problems like petition fraud, lack of transparency in signature collection, and manipulation by ensuring all actions are immutable, verifiable, and decentralized.

## ✨ Features

🔒 Create petitions with verifiable metadata (title, description, target signatures)  
✍️ Sign petitions with blockchain-based authentication to prevent duplicates or fakes  
✅ Verify signatures and petition status in real-time  
📊 Track progress toward signature thresholds immutably  
🚫 Prevent spam or invalid signatures through user verification  
🔔 Notify stakeholders when thresholds are met or petitions close  
📈 Archive completed petitions for historical accountability  
🌐 Integrate with off-chain policy trackers (via oracles if needed)  

## 🛠 How It Works

This platform uses 8 interconnected Clarity smart contracts to handle different aspects of the petition lifecycle, ensuring modularity, security, and scalability. All data is stored on-chain for transparency.

### Smart Contracts Overview
1. **UserRegistry.clar**: Registers and verifies users with unique IDs and KYC-like proofs (e.g., via STX addresses). Prevents sybil attacks by linking signatures to verified identities.  
2. **PetitionFactory.clar**: Deploys new petition instances by creating unique IDs and initializing petition data. Ensures only verified users can create petitions.  
3. **PetitionCore.clar**: Manages core petition details like title, description, target signatures, and deadlines. Uses maps to store multiple petitions.  
4. **SignatureManager.clar**: Handles signing logic, checks for duplicates, and records signatures with timestamps. Enforces one-signature-per-user rules.  
5. **VerificationEngine.clar**: Provides read-only functions to verify signatures, check ownership, and confirm petition authenticity against hashes.  
6. **ThresholdMonitor.clar**: Monitors signature counts in real-time and triggers events when thresholds are met (e.g., auto-closes petition or notifies admins).  
7. **NotificationHub.clar**: Sends on-chain notifications or events to subscribers (e.g., petition creators or signers) for updates like threshold achievements.  
8. **ArchiveVault.clar**: Moves completed or expired petitions to an immutable archive, allowing historical queries without cluttering active storage.  

**For Petition Creators**  
- Register as a user via UserRegistry.  
- Call PetitionFactory to create a new petition, providing title, description, target signatures, and deadline.  
- The PetitionCore contract stores the details immutably.  

**For Signers**  
- Verify your identity in UserRegistry.  
- Use SignatureManager to sign a petition by providing the petition ID.  
- ThresholdMonitor automatically updates counts and checks progress.  

**For Verifiers and Policymakers**  
- Query VerificationEngine to confirm signature validity and totals.  
- Use ArchiveVault for historical petitions.  
- NotificationHub keeps you updated on key milestones.  

That's it! Petitions become trustworthy tools for real policy impact, with blockchain ensuring no one can fake or alter signatures. Deploy these contracts on Stacks for a fully decentralized experience.