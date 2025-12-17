const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/auth'); // Import middleware bảo vệ

// Áp dụng middleware bảo vệ cho TẤT CẢ các routes bên dưới
// Nghĩa là: Phải đăng nhập mới được gọi các API này
router.use(authMiddleware);

// Định nghĩa các đường dẫn
router.get('/', taskController.getTasks);       // GET /api/tasks
router.post('/', taskController.createTask);    // POST /api/tasks
router.put('/:id', taskController.updateTask);  // PUT /api/tasks/:id
router.delete('/:id', taskController.deleteTask); // DELETE /api/tasks/:id

module.exports = router;