# FindIT Backend

This is the backend API for FindIT, a lost and found platform for VIT students. It provides RESTful endpoints for user authentication, posting and searching lost/found items, and secure item claiming using QR codes.

## Features
- User authentication via Google (Firebase)
- Post, search, and filter lost/found items
- Image upload support (Cloudinary)
- Secure item claiming with QR codes

## Tech Stack
- Node.js, Express.js
- MongoDB (Mongoose)
- Firebase (Google Auth)
- Cloudinary (image storage)

## API Endpoints (Summary)
- `POST /user/login` — Login/register user
- `GET /user` — Get user details
- `POST /item` — Post a new item (with image)
- `GET /item` — List/search items
- `GET /item/:id` — Get item by ID
- `GET /item/user/posts` — Get user's posted items
- `GET /item/user/claims` — Get user's claimed items
- `POST /claim/generate-qr/:itemId` — Generate QR for item
- `POST /claim/claim-item` — Claim item via QR
- `GET /claim/status/:itemId` — Check claim status
