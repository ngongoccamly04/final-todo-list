const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: { // Đổi từ title -> text
    type: String,
    required: true
  },
  deadline: {
    type: Date
  },
  status: { // Đổi từ isCompleted (boolean) -> status (enum)
    type: String,
    enum: ['pending', 'done'],
    default: 'pending'
  },
  finishedTime: { // Trường mới
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Task', TaskSchema);