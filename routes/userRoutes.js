const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Address = require('../models/address');
const router = express.Router();

// Middleware to check JWT
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).send('Access Denied');
  try {
    const verified = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).send('Invalid Token');
  }
};

// Register Route
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const user = new User({ name, email, password });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Error registering user' });
  }
});

// Login Route (Generate JWT)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        addresses: user.addresses,
      },
    });

  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Address Submission Route (Protected)
router.post('/address', authenticateJWT, async (req, res) => {
  const { address } = req.body;
  try {
    const newAddress = new Address({ address, userId: req.user.id });
    await newAddress.save();
    res.status(201).json({ message: 'Address added successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Error adding address' });
  }
});
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('addresses');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
// Update address
router.put('/:id/address', async (req, res) => {
  try {
    const { address } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.addresses.push(address);  
    await user.save();

    res.status(200).json({ message: 'Address added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
