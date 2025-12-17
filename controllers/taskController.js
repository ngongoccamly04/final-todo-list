const Task = require('../models/Task');

// GET: Lấy danh sách
exports.getTasks = async (req, res) => {
  try {
    const { search, status, sort } = req.query;
    let query = { userId: req.user };

    // Tìm kiếm theo text
    if (search) {
      query.text = { $regex: search, $options: 'i' };
    }

    // Lọc theo status (pending / done)
    if (status && status !== 'all') {
      query.status = status;
    }

    // Sắp xếp
    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'deadline') sortOption = { deadline: 1 };

    const tasks = await Task.find(query).sort(sortOption);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST: Tạo mới
exports.createTask = async (req, res) => {
  try {
    const { text, deadline } = req.body; // Nhận text thay vì title
    
    const newTask = new Task({
      userId: req.user,
      text,
      deadline,
      status: 'pending',
      finishedTime: null
    });

    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT: Cập nhật
exports.updateTask = async (req, res) => {
  try {
    const { text, status, deadline } = req.body;
    let updateData = { text, deadline };

    // Logic xử lý finishedTime
    if (status) {
        updateData.status = status;
        if (status === 'done') {
            updateData.finishedTime = new Date(); // Ghi nhận giờ hoàn thành
        } else {
            updateData.finishedTime = null; // Reset nếu mở lại task
        }
    }

    const updatedTask = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user }, 
      updateData,
      { new: true }
    );

    if (!updatedTask) return res.status(404).json({ message: "Không tìm thấy task" });
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE: Xóa (Giữ nguyên)
exports.deleteTask = async (req, res) => {
  try {
    const deletedTask = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user });
    if (!deletedTask) return res.status(404).json({ message: "Không tìm thấy task" });
    res.json({ message: "Đã xóa thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};