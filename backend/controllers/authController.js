const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    
    // Check if token exists
    if (!idToken) {
        return res.status(400).json({ error: 'idToken is required' });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.create({
        googleId,
        email,
        profile: { displayName: name, avatar: picture }
      });
    } else {
      user.lastLogin = Date.now();
      await user.save();
    }

    res.json(user);

  } catch (error) {
    console.error('Auth Controller Error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { uid } = req.params;
    // Search by googleId or gameId
    const user = await User.findOne({ $or: [{ googleId: uid }, { gameId: uid }] });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
