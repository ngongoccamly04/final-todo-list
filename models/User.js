const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String 
    // Không required để hỗ trợ Google Login
  },
  image: { 
    type: String, 
    default: "" 
  }
});

// MongoDB tự động tạo field _id (chính là id string bạn cần)
module.exports = mongoose.model('User', UserSchema);