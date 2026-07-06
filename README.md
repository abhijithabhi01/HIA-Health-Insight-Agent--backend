# 🩺 HIA - Health Insight Agent (Backend)

> AI-powered backend for analyzing medical reports, generating health insights, and enabling conversational interactions using Large Language Models.

![Node.js](https://img.shields.io/badge/Node.js-22.x-green)
![Express](https://img.shields.io/badge/Express.js-Backend-black)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-success)
![License](https://img.shields.io/badge/License-MIT-blue)

---

# 📖 Overview

Health Insight Agent (HIA) is an AI-powered healthcare platform that helps users understand their medical reports through intelligent analysis and natural language conversations.

The backend provides secure REST APIs for authentication, report uploads, OCR processing, AI-powered analysis, chat interactions, health card approval workflows, and administrative operations.

> **Disclaimer:** This application provides informational insights only and is not intended to replace professional medical advice.

---

# ✨ Features

- 🔐 User Authentication (JWT)
- 📄 Upload Medical Reports (PDF)
- 🤖 AI-powered Report Analysis
- 💬 Interactive Health Chatbot
- 🧠 Google Gemini & OpenRouter Integration
- 🔍 OCR using Tesseract.js
- 📑 PDF Text Extraction
- 💾 MongoDB Data Storage
- 👨‍⚕️ Health Card Approval Workflow
- 🛡️ Admin Management APIs
- 🌐 RESTful API Architecture

---

# 🏗️ Architecture

```
                React Frontend
                      │
                      ▼
              Express REST API
                      │
      ┌───────────────┼───────────────┐
      │               │               │
      ▼               ▼               ▼

 Authentication   Report Upload    AI Services

      │               │               │
      ▼               ▼               ▼

 JWT Security   OCR & PDF Parser   Gemini/OpenRouter

              │
              ▼

         MongoDB Database

              │
              ▼

     Chat, Reports & HC Approval
```

---

# ⚙️ Tech Stack

## Backend

- Node.js
- Express.js

## Database

- MongoDB
- Mongoose

## AI

- Google Gemini API
- OpenRouter API
- OpenAI SDK

## OCR & Document Processing

- Tesseract.js
- pdf-parse
- pdf2json
- Multer

## Authentication

- JWT
- bcryptjs

## Utilities

- Axios
- dotenv
- CORS

---

# 📂 Project Structure

```
backend/
│
├── Controllers/
├── config/
├── middleware/
├── models/
├── routes/
├── services/
├── Scripts/
├── server.js
├── package.json
└── README.md
```

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/abhijithabhi01/HIA-Health-Insight-Agent--backend.git

cd HIA-Health-Insight-Agent--backend
```

## Install Dependencies

```bash
npm install
```

## Configure Environment Variables

Create a `.env` file.

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_secret_key

GOOGLE_API_KEY=your_google_gemini_key

OPENROUTER_API_KEY=your_openrouter_key
```

---

# ▶️ Run Development Server

```bash
npm run dev
```

Production

```bash
npm start
```

Server runs on

```
http://localhost:5000
```

---

# 📡 Main API Modules

- Authentication
- Medical Report Analysis
- AI Chat
- Health Card Applications
- Admin Management

---

# 🔄 Backend Workflow

1. User authenticates.
2. Medical report is uploaded.
3. PDF/OCR extracts report contents.
4. AI analyzes medical information.
5. Cleaned insights are generated.
6. Report is stored in MongoDB.
7. User can ask follow-up questions.
8. AI responds using report context.
9. Admin manages health card approval requests.

---

# 🔒 Security

- JWT Authentication
- Password Hashing (bcrypt)
- Protected Routes
- File Upload Validation
- Environment Variables
- Centralized Middleware

---

# 👨‍💻 Author

**Abhijith S**

AI Developer | Full Stack Developer

GitHub: https://github.com/abhijithabhi01

LinkedIn: https://www.linkedin.com/in/abhijith-s-5138a724b

---

⭐ If you found this project useful, consider giving it a Star.
