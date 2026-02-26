Sycro

Sycro is a full-stack MERN web application built with modern authentication, file uploads, and third-party integrations. It uses secure JWT-based authentication, Google and GitHub OAuth login, cloud file storage, and a scalable deployment setup.

🧠 Tech Stack
Frontend

React (TypeScript)

Axios – API requests

JWT decode – Decode authentication tokens

Backend

Node.js

Express.js

Mongoose

MongoDB Atlas

Zod – Request validation

bcryptjs – Password hashing

jsonwebtoken – JWT authentication

Multer – File/photo uploads

Cloudinary – Cloud file storage

CORS

dotenv

Nodemon

Authentication

JWT (Access Tokens)

Google OAuth2 (Google Console setup required)

GitHub OAuth (GitHub API Sign-In)

Deployment

Frontend: Render

Backend: Render

Database: MongoDB Atlas

📦 Features

🔐 Secure authentication with JWT

🔑 Google & GitHub social login

🔒 Password hashing with bcrypt

📂 Image/file uploads with Multer

☁️ Cloudinary cloud storage integration

🗄 MongoDB Atlas cloud database

🛡 Input validation using Zod

🌍 Production deployment ( Render)

⚙️ Installation Guide (Local Development)
1️⃣ Clone the Repository
git clone https://github.com/your-username/sycro.git
cd sycro
2️⃣ Backend Setup

Navigate to backend folder:

cd backend
npm install
Install Required Packages
npm install express mongoose cors dotenv jsonwebtoken bcryptjs multer cloudinary axios zod jwt-decode
npm install --save-dev nodemon
3️⃣ Create .env File

Inside /backend:

PORT=5000
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secret_key

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_secret

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_secret
4️⃣ MongoDB Atlas Setup

Create account at MongoDB Atlas

Create a cluster

Create database user

Allow IP Access

For local testing: add your IP

For Render deployment: set IP access to 0.0.0.0/0

Copy connection string into .env

5️⃣ Google OAuth Setup

Go to Google Cloud Console

Create new project

Enable Google OAuth2 API

Configure OAuth Consent Screen

Create OAuth Client ID

Add redirect URI (your backend callback route)

Add Client ID & Secret to .env

6️⃣ GitHub OAuth Setup

Go to GitHub Developer Settings

Create new OAuth App

Add Homepage URL

Add Authorization Callback URL

Copy Client ID & Secret into .env

7️⃣ Run Backend
npm run dev

Server should run on:

http://localhost:5000
💻 Frontend Setup (React + TypeScript)

Navigate to frontend:

cd frontend
npm install

Install dependencies:

npm install axios jwt-decode

Create .env in frontend:

VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id

Start development server:

npm run dev

Frontend runs on:

http://localhost:5173
🔐 Authentication Flow
Regular Login

User registers

Password is hashed using bcryptjs

JWT token is generated using jsonwebtoken

Token is sent to frontend

Frontend stores token (localStorage or cookies)

Protected routes verify token middleware

Google / GitHub Login

User clicks OAuth login

Redirect to provider

Provider returns auth code

Backend exchanges code for access token

User info retrieved via provider API

JWT created and returned

📂 File Upload Flow

User selects file

Multer handles file upload

File sent to Cloudinary

Cloudinary returns secure URL

URL saved in MongoDB

🌍 Deployment Guide
Backend (Render)

Push backend to GitHub

Create new Web Service on Render

Add environment variables

Allow MongoDB Atlas IP access (0.0.0.0/0)

Deploy

Frontend (Render Static)

Push frontend to GitHub

Import project in Render

Add environment variables

Deploy

📁 .gitignore

Make sure to ignore:

node_modules
.env
dist
build
🗂 Project Structure (MERN Format)
sycro/
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── App.tsx
│
├── backend/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── controllers/
│   └── server.js
│
└── README.md
🛡 Security Practices

Password hashing (bcryptjs)

JWT token verification middleware

Zod input validation

Environment variables with dotenv

CORS configuration

MongoDB Atlas IP restriction

OAuth secure callback validation

🧩 APIs & Services Used

MongoDB Atlas

Cloudinary

Google OAuth2

GitHub OAuth API

📌 Future Improvements

Refresh token implementation

Role-based access control

Rate limiting

Email verification

Two-factor authentication

Admin dashboard

👨‍💻 Author

Developed by Mike
Built with MERN stack and deployed using modern cloud infrastructure.
