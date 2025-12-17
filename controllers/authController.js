const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// --- ĐĂNG KÝ ---
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate cơ bản
    if (!name || !email || !password) {
        return res.status(400).json({ message: "Vui lòng điền đủ thông tin!" });
    }

    // Kiểm tra trùng email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: "Email này đã được sử dụng!" });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo user mới
    // THÊM: Tạo avatar mặc định từ tên (dùng dịch vụ ui-avatars)
    const defaultImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

    const newUser = new User({ 
        name, 
        email, 
        password: hashedPassword,
        image: defaultImage // Lưu avatar mặc định
    });

    await newUser.save();
    res.status(201).json({ message: "Đăng ký thành công! Hãy đăng nhập." });

  } catch (error) {
    // IN LỖI RA TERMINAL ĐỂ DEBUG
    console.error("❌ Lỗi Đăng Ký:", error); 
    res.status(500).json({ message: "Lỗi Server (Xem terminal)", error: error.message });
  }
};

// --- ĐĂNG NHẬP ---
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 1. Tìm user theo email
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: "Email chưa được đăng ký!" });
    }

    // 2. Logic kiểm tra nguồn gốc tài khoản
    // Nếu user tồn tại nhưng không có password -> Nghĩa là họ từng đăng nhập bằng Google
    if (!user.password) {
        return res.status(400).json({ message: "Email này đã liên kết Google. Vui lòng đăng nhập bằng Google!" });
    }

    // 3. Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ message: "Mật khẩu không đúng!" });
    }

    // 4. Thành công
    const token = generateToken(user._id);
    res.json({ 
        message: "Đăng nhập thành công!", 
        token, 
        user: { id: user._id, name: user.name, email: user.email, image: user.image } 
    });

  } catch (error) {
    console.error("❌ Lỗi Đăng Nhập:", error);
    res.status(500).json({ message: "Lỗi Server", error: error.message });
  }
};

// ... (Giữ nguyên phần Google Login và Logout cũ)
exports.googleLogin = async (req, res) => {
    // ... Code cũ của bạn ...
    // Nhớ copy lại đoạn Google Login cũ vào đây nhé
     try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({ idToken: token, audience: process.env.GOOGLE_CLIENT_ID });
    const { name, email, picture } = ticket.getPayload();

    let user = await User.findOne({ email });
    if (user) {
      // Nếu user đã tồn tại (dù tạo bằng tay hay Google), ta cập nhật ảnh
      user.image = picture;
      await user.save();
    } else {
      // Tạo user mới từ Google (không có password)
      user = new User({ name, email, password: null, image: picture });
      await user.save();
    }

    const jwtToken = generateToken(user._id);
    res.json({ message: "Google Login thành công!", token: jwtToken, user: { id: user._id, name: user.name, email: user.email, image: user.image } });
  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(400).json({ message: "Token Google lỗi!", details: error.message });
  }
};

exports.logout = (req, res) => {
  res.json({ message: "Đăng xuất thành công" });
};