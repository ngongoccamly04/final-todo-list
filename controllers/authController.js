const User = require("../models/User")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { OAuth2Client } = require("google-auth-library")

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET, // ← THÊM CLIENT SECRET
)

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" })
}

// --- ĐĂNG KÝ ---
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Validate cơ bản
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Vui lòng điền đủ thông tin!" })
    }

    // Kiểm tra trùng email
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: "Email này đã được sử dụng!" })
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Tạo user mới với avatar mặc định
    const defaultImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      image: defaultImage,
    })

    await newUser.save()
    res.status(201).json({ message: "Đăng ký thành công! Hãy đăng nhập." })
  } catch (error) {
    console.error("❌ Lỗi Đăng Ký:", error)
    res.status(500).json({ message: "Lỗi Server (Xem terminal)", error: error.message })
  }
}

// --- ĐĂNG NHẬP ---
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    // 1. Tìm user theo email
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: "Email chưa được đăng ký!" })
    }

    // 2. Kiểm tra nếu tài khoản liên kết Google
    if (!user.password) {
      return res.status(400).json({ message: "Email này đã liên kết Google. Vui lòng đăng nhập bằng Google!" })
    }

    // 3. Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu không đúng!" })
    }

    // 4. Thành công
    const token = generateToken(user._id)
    res.json({
      message: "Đăng nhập thành công!",
      token,
      user: { id: user._id, name: user.name, email: user.email, image: user.image },
    })
  } catch (error) {
    console.error("❌ Lỗi Đăng Nhập:", error)
    res.status(500).json({ message: "Lỗi Server", error: error.message })
  }
}

// --- GOOGLE LOGIN ---
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    
    const ticket = await client.verifyIdToken({ 
      idToken: token, 
      audience: process.env.GOOGLE_CLIENT_ID 
    });
    
    const payload = ticket.getPayload();
    console.log('[v0] Full Google payload:', payload); // ← Xem tất cả data
    
    const { name, email, picture } = payload;
    console.log('[v0] Picture URL:', picture); // ← Kiểm tra URL ảnh
    
    let user = await User.findOne({ email });
    if (user) {
      user.image = picture;
      await user.save();
      console.log('[v0] Updated user image:', user.image); // ← Xem đã lưu chưa
    } else {
      const username = email.split('@')[0];
      user = new User({ 
        name, 
        email, 
        username,
        password: null, 
        image: picture 
      });
      await user.save();
      console.log('[v0] New user created with image:', user.image);
    }

    const jwtToken = generateToken(user._id);
    res.json({ 
      message: "Google Login thành công!", 
      token: jwtToken, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        image: user.image  // ← Đảm bảo trả về image
      } 
    });
    
  } catch (error) {
    console.error('[v0] Google login error:', error);
    res.status(400).json({ 
      message: "Đăng nhập Google thất bại!", 
      details: error.message 
    });
  }
};

// --- ĐĂNG XUẤT ---
exports.logout = (req, res) => {
  res.json({ message: "Đăng xuất thành công" })
}
