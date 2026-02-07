require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth.routes');
const analysisRoutes = require('./routes/analysis.routes');
const chatRoutes = require('./routes/chat.routes');
const hcRoutes = require('./routes/hc.routes');
const adminRoutes = require('./routes/admin.routes');
const fileRoutes = require('./routes/files.routes');
const adminPanelRoutes = require('./routes/adminPanel.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Routes
app.use('/auth', authRoutes);
app.use('/analysis', analysisRoutes);
app.use('/chat', chatRoutes);
app.use('/hc', hcRoutes);              // HC application routes
app.use('/admin', adminRoutes);        // Admin dashboard routes
app.use('/files', fileRoutes);         // Secure file serving
app.use('/admin-panel', adminPanelRoutes); // Admin UI Panel

// Root route HTML response
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>HIA Backend</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: radial-gradient(circle at top, #1f2937, #000000);
      color: #e5e7eb;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: rgba(24, 24, 27, 0.85);
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 32px 36px;
      max-width: 520px;
      text-align: center;
      box-shadow: 0 30px 80px rgba(0,0,0,0.6);
    }
    .logo {
      width: 56px;
      height: 56px;
      margin: 0 auto 16px;
      border-radius: 14px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
    }
    h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 600;
    }
    .tagline {
      margin-top: 8px;
      color: #a1a1aa;
      font-size: 14px;
    }
    .status {
      margin-top: 20px;
      padding: 10px 14px;
      background: #052e16;
      color: #4ade80;
      border-radius: 999px;
      font-size: 13px;
      display: inline-block;
    }
    .admin-button {
      display: inline-block;
      margin-top: 16px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }
    .admin-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(59,130,246,0.3);
    }
    .info {
      margin-top: 24px;
      text-align: left;
      font-size: 13px;
      color: #d4d4d8;
    }
    .info code {
      background: #09090b;
      padding: 4px 8px;
      border-radius: 6px;
      color: #93c5fd;
    }
    .footer {
      margin-top: 24px;
      font-size: 12px;
      color: #71717a;
    }
    .endpoints {
      margin-top: 20px;
      text-align: left;
      font-size: 12px;
      color: #a1a1aa;
    }
    .endpoint {
      padding: 6px 10px;
      margin: 4px 0;
      background: rgba(59, 130, 246, 0.1);
      border-left: 2px solid #3b82f6;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">HIA</div>
    <h1>Health Insight Agent</h1>
    <div class="tagline">
      Turning complex health data into clear insights
    </div>

    <div class="status">🟢 Backend is running</div>



    <div class="footer">
        <a href="/admin-panel/login" class="admin-button">
      🔐 Admin Login
    </a>
    </div>

    <div class="footer">
      HIA Backend © ${new Date().getFullYear()}<br/>
      Built for clarity, safety, and intelligence
    </div>
  </div>
</body>
</html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Health Insight Agent API is running',
    timestamp: new Date().toISOString()
  });
});

// Test OpenRouter integration
app.get("/test-openrouter", async (req, res) => {
  const { hiaChat } = require("./services/openrouter.service");

  const reply = await hiaChat({
    systemPrompt: "You are a health assistant.",
    userMessage: "What is a healthy heart rate?"
  });

  res.json({ reply });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation error', 
      details: Object.values(err.errors).map(e => e.message) 
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({ 
      error: 'Duplicate entry', 
      field: Object.keys(err.keyPattern)[0] 
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  // Default error
  res.status(err.status || 500).json({ 
    error: err.message || 'Something went wrong!' 
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Health Insight Agent API Configured`);
  console.log(`✅ HC Application System: Active`);
  console.log(`✅ Admin Dashboard: Active`);
});

module.exports = app;