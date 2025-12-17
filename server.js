const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// === QUAN TRỌNG: Phục vụ file tĩnh (Frontend) ===
// Dòng này giúp server Node.js gửi file html/css/js về cho người dùng
app.use(express.static(path.join(__dirname, 'public'))); 

// Kết nối MongoDB (Dùng biến môi trường)
const mongoURI = process.env.MONGO_URI; 
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Routes API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));

// === QUAN TRỌNG: Route mặc định ===
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Port động (Render sẽ tự điền PORT)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));