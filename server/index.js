const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:8081', // Adjust the origin to match your client
  },
});

const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const uri = 'mongodb://localhost:27017/test';
mongoose.connect(uri)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB...', err));

// Define Mongoose Schema and Model for Tasks
const taskSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
});

const Task = mongoose.model('Task', taskSchema);

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected');

  // Clean up on disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// API Routes

// Get all tasks
app.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Add a new task
app.post('/tasks', async (req, res) => {
  const { text } = req.body;
  try {
    const newTask = new Task({ text });
    await newTask.save();
    io.emit('taskAdded', newTask);  // Emit event
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Update a task
app.put('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;
  try {
    const updatedTask = await Task.findByIdAndUpdate(id, { completed }, { new: true });
    io.emit('taskUpdated', updatedTask);  // Emit event
    res.json(updatedTask);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Delete a task
app.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await Task.findByIdAndDelete(id);
    io.emit('taskDeleted', id);  // Emit event
    res.status(204).send();
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});