const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // 1. Lấy token từ header (Frontend sẽ gửi dạng: "Bearer <token>")
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: "Không có quyền truy cập (Thiếu Token)" });
  }

  try {
    // 2. Giải mã token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Gắn ID user vào request để dùng ở Controller
    req.user = decoded.userId; 
    next(); // Cho phép đi tiếp
  } catch (error) {
    res.status(401).json({ message: "Token không hợp lệ" });
  }
};