const mongoose = require('mongoose');

// models/User.js
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, unique: true, sparse: true }, // ← Thêm sparse: true
  password: { type: String },
  image: { type: String }
});

// MongoDB tự động tạo field _id (chính là id string bạn cần)
module.exports = mongoose.model('User', UserSchema);