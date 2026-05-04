# SOLPIM

### "A digital archive for recording, protecting, and connecting graduation artworks"

Solpim is an archive platform for graduation artworks created by university art students.  
Students can upload and manage their work, administrators can review submissions, and visitors can explore publicly approved artworks.  
The platform also connects image hashing, IPFS pinning, and blockchain registration so that each artwork can keep a verifiable digital protection history.

## Table of Contents
- [1. Features](#1-features)
- [2. Project Overview](#2-project-overview)
  - [Development Period](#development-period)
  - [Project Summary](#project-summary)
- [3. Project Structure](#3-project-structure)
  - [Tech Stack](#tech-stack)
  - [Architecture](#architecture)
  - [On-chain and Off-chain Design](#on-chain-and-off-chain-design)
- [4. Getting Started](#4-getting-started)

# 1. Features

1. **Authentication and Role-based Access**
   - Students can sign up with email and password and complete email verification.
   - Visitors can enter the platform quickly through Google sign-in.
   - The application separates student, visitor, and admin experiences by role.

2. **Graduation Artwork Submission**
   - Students can submit artworks with title, category, description, creation process, production period, and sale availability.
   - Multiple artwork images can be uploaded, reordered, and assigned a representative thumbnail.
   - Image type and file size are validated before upload.

3. **Artwork Protection Pipeline**
   - Uploaded image files are stored in AWS S3.
   - Firebase Functions verifies the upload and generates an image hash.
   - After admin approval, the artwork file is pinned to IPFS through Pinata.
   - The image hash and IPFS CID are then registered on Polygon.

4. **Artwork Detail View**
   - Visitors can view approved artwork images, descriptions, production period, related video links, and artist information.
   - The detail page can also display the artwork protection status recorded by the backend.

5. **Gallery Browsing**
   - Only approved artworks are exposed in the gallery.
   - Users can browse by search query, category, and sorting conditions.
   - The UI also supports artist-focused exploration.

6. **Artist Profile**
   - Each artist has a profile page with public information and approved artworks.
   - Users can update their profile name and profile image.

7. **Likes and Contact Requests**
   - Visitors can leave likes on artworks.
   - Visitors can send contact intents from an artwork page or profile page.
   - Artists can review incoming notifications and contact-related messages from the message page.

8. **Artwork Management and Admin Review**
   - Students can track submitted artworks by `pending`, `approved`, and `rejected` states.
   - Admins can review submissions, approve them, or reject them with a reason.
   - Approval triggers the protection registration pipeline and sends a status notification to the owner.

# 2. Project Overview

## Development Period

- 2026.02.26 - 2026.05.04

## Project Summary

- Solpim is a web platform that combines graduation artwork exhibition, archival management, and digital originality protection.
- Students can systematically submit and manage their work, administrators can operate a review workflow, and visitors can discover public artworks and artists.
- The system is designed to connect Firebase services, AWS S3, IPFS, and the Polygon network into one end-to-end pipeline covering upload, hashing, storage, CID issuance, and on-chain registration.

# 3. Project Structure

## Tech Stack
<img width="926" height="312" alt="image" src="https://github.com/user-attachments/assets/441acae2-2e37-4900-8580-a837a4811f6e" />



### Frontend

| Category | Technology | Version |
| :--- | :--- | :--- |
| Framework | React | 19.2.4 |
| Language | TypeScript | 5.9.3 |
| Build Tool | Vite | 7.3.1 |
| Routing | React Router DOM | 7.13.1 |
| UI Library | MUI Material | 7.3.9 |
| UI Icons | MUI Icons | 7.3.10 |
| UI Labs | MUI Lab | 7.0.1-beta.23 |
| Styling | Emotion React | 11.14.0 |
| Styling | Emotion Styled | 11.14.1 |
| Backend SDK | Firebase | 12.10.0 |
| Linting | ESLint | 9.39.4 |
| Formatting | Prettier | 3.8.1 |
| Optional Styling Tooling | Tailwind CSS | 4.2.1 |

### Backend / BaaS

| Category | Technology | Version |
| :--- | :--- | :--- |
| Runtime | Node.js | 24 |
| Serverless Backend | Firebase Cloud Functions | 7.0.0 |
| Admin SDK | Firebase Admin | 13.6.0 |
| Database | Firestore | via Firebase |
| Authentication | Firebase Authentication | via Firebase |
| Object Storage | AWS SDK S3 Client | 3.876.0 |
| Presigned URL Support | AWS S3 Request Presigner | 3.876.0 |
| IPFS Pinning | Pinata SDK | 2.1.0 |
| Blockchain Client | Ethers | 6.16.0 |
| Functions Testing | firebase-functions-test | 3.4.1 |

## Architecture
<img width="1672" height="941" alt="Solpim Overall System Architecture" src="https://github.com/user-attachments/assets/04dbc3d6-51b8-4b84-a20e-a2c9d542220c" />



### Client Layer
- The React application provides the main user interface for students, visitors, and admins.
- It uses Firebase Authentication on the client to manage session state and route-level permissions.
- It reads artwork, profile, notification, and like data from Firestore.
- It calls HTTP-based Firebase Functions endpoints for upload finalization, approval, protection status lookup, and signed file access.

### Firebase Application Layer
- Firebase Authentication manages sign-up, login, verification, and role-based access checks.
- Firestore stores the application-facing metadata:
  - user profiles
  - artwork documents
  - notifications
  - likes
  - protection workflow state
- Firebase Functions acts as the orchestration layer between the web client and external services such as AWS S3, Pinata, and Polygon RPC.

### Storage Layer
- Artwork image binaries are stored off-chain in AWS S3.
- Signed access flows are used to protect file upload and download operations.
- Approved files are pinned to IPFS through Pinata so the system can obtain a persistent content identifier.

### Blockchain Layer
- Firebase Functions sends transactions to Polygon through an Alchemy RPC endpoint.
- The blockchain step stores a compact proof record rather than the full artwork file itself.
- The registered payload includes the artwork identifier, image hash, IPFS CID, and registration timestamp context.

## On-chain and Off-chain Design
<img width="2172" height="1206" alt="image" src="https://github.com/user-attachments/assets/3026e568-c335-47f9-938d-984a0a3dadb7" />


### Why the architecture is split
- Full artwork files are too large and too expensive to store directly on-chain.
- The platform therefore separates **media storage and application metadata** from **proof of authenticity and registration history**.
- This design keeps the system practical for real-world uploads while still preserving a verifiable integrity trail.

### Off-chain responsibilities
- The **original image files** are stored in AWS S3.
- The **application metadata** is stored in Firestore:
  - title
  - category
  - description
  - artist information
  - submission timestamps
  - review status
  - notification data
- The **protection workflow state** is also managed off-chain during processing:
  - `upload_requested`
  - `uploaded`
  - `hashing`
  - `hashed`
  - `pinned`
  - `chain_pending`
  - `registered`
  - `failed`
- The **IPFS artifact** is also part of the off-chain layer in the sense that the file content is distributed outside the blockchain, while its CID is later referenced on-chain.

### On-chain responsibilities
- The blockchain layer stores a minimal proof package for verification.
- Instead of pushing the raw media file to Polygon, the backend submits a transaction containing a serialized payload with:
  - `artworkId`
  - `imageHash`
  - `ipfsCid`
  - application markers such as `app`, `type`, and `version`
- This allows Solpim to prove that a specific artwork hash and CID were registered at a particular point in time through a blockchain transaction hash.

### Detailed processing flow
1. A student submits artwork metadata and image files from the client.
2. The file is uploaded to S3 through the backend-managed upload flow.
3. Firebase Functions validates the uploaded object and computes an image hash from the stored binary.
4. The hash and storage metadata are written to Firestore as the off-chain protection record.
5. An admin approves the artwork.
6. Firebase Functions downloads the stored object, pins it to IPFS through Pinata, and receives an IPFS CID.
7. Firebase Functions builds a blockchain registration payload that includes the artwork ID, image hash, and CID.
8. The backend sends a Polygon transaction through Alchemy RPC using the configured wallet.
9. The transaction hash, chain name, CID, and registration timestamp are stored back in Firestore for later display and verification.

### Verification model
- **Off-chain** data is optimized for product functionality, UX, search, moderation, and file delivery.
- **On-chain** data is optimized for integrity, provenance, and timestamped registration evidence.
- If needed, the system can compare:
  - the stored image file
  - its recalculated hash
  - the Firestore protection record
  - the IPFS CID
  - the blockchain transaction record
- This layered design gives Solpim a practical archive workflow without losing traceability of digital ownership evidence.

# 4. Getting Started

## 1. Clone the repository

```bash
git clone <repository-url> solpim
cd solpim
```

## 2. Install dependencies

Both the root project and the `functions` directory need dependencies installed.

```bash
npm install
npm --prefix functions install
```

## 3. Configure environment variables

### Root `.env.local`

Set the Firebase configuration and frontend API endpoints.

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

VITE_PRESIGNED_UPLOAD_ENDPOINT=
VITE_UPLOAD_FILE_ENDPOINT=
VITE_FINALIZE_UPLOAD_ENDPOINT=
VITE_APPROVE_ARTWORK_ENDPOINT=
VITE_PROTECTION_STATUS_ENDPOINT=
VITE_PENDING_ARTWORKS_ENDPOINT=
VITE_PRESIGNED_DOWNLOAD_ENDPOINT=
```

### Functions environment variables

Set the storage, IPFS, and blockchain-related values used by Firebase Functions.

```env
AWS_REGION=
S3_BUCKET_NAME=
PINATA_JWT=
PINATA_API_BASE_URL=
CHAIN_RPC_URL=
CHAIN_PRIVATE_KEY=
CHAIN_NAME=polygon-amoy
CHAIN_REGISTRY_ADDRESS=
```

## 4. Prepare Firebase CLI

Firebase CLI is required to run the Functions emulator locally.

```bash
npm install -g firebase-tools
firebase login
```

## 5. Run the frontend

```bash
npm run dev
```

Default Vite development server:

```bash
http://localhost:5173
```

## 6. Run the Functions emulator

Run this in a separate terminal:

```bash
npm run serve:clean
```

Or run it directly inside the `functions` directory:

```bash
cd functions
npm run serve
```

## 7. Test and validation commands

### Frontend

```bash
npm run lint
npm run build
```

### Functions

```bash
cd functions
npm test
```

## 8. Local run summary

1. Install dependencies in the root and `functions` directories.
2. Fill in `.env.local` and the Functions environment variables.
3. Start the frontend with `npm run dev`.
4. Start the Functions emulator in another terminal with `npm run serve:clean`.
5. The full protection pipeline requires working Firebase, S3, Pinata, and Polygon RPC configuration.
