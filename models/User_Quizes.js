const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  question: String,
  options: {
    A: String,
    B: String,
    C: String,
    D: String,
  },
  correctAnswer: String,
  score: Number,
});

const QuizSchema = new mongoose.Schema({
  title : {type: String, required: true},
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  username: {type: String, required: true},
  questions: [QuestionSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  attemptData: {
    type: Date,
    default: Date.now,
  }
});



module.exports = mongoose.model("Quiz", QuizSchema);
