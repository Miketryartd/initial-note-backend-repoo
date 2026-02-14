const mongoose = require('mongoose');

const QuizAttemptSchema = new mongoose.Schema({
  title: {type: String, required: true},
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true,
  },
  answers: {
    type: Map, 
    of: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  attemptDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('QuizAttempt', QuizAttemptSchema);
