const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register
router.post('/register', async (req, res, next) => {
  console.log("Register function running");
  
  try {
    const { name, email, password, age, gender } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const user = new User({ name, email, password, age, gender });
    await user.save();
    console.log("User registered successfully"); 
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    next(err); 
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Reject if extra fields are present
    const allowedFields = ['email', 'password'];
    const extraFields = Object.keys(req.body).filter(
      key => !allowedFields.includes(key)
    );
    if (extraFields.length > 0) {
      return res.status(400).json({ error: "Only email and password are allowed in login" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    next(err);
  }
});
// Get user profile
router.get('/profile', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (err) {
    next(err);
  }
});


module.exports = router;
