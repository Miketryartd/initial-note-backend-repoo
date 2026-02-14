const mongoose = require('mongoose');

const User_Files = new mongoose.Schema({
   username: {type: String, required: true},
   subject: {type: String, required: true},
   description: {type: String},
   userId: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
   filePaths: [{type: String}],
   coverPhoto: {type: String},
   upVotes: {type: Number, default: 0},
   downVotes: {type: Number, default: 0},
   voters: [
      {
         user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      type: { type: String, enum: ["upvote", "downvote"] },
      }
   ],
   comments: [
      {
         username: {type: String, required: true},
         user: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
         comment: {type: String, required: true},
         createdAt: { type: Date, default: Date.now }
      }
   ],
   uploadedAt: {type: Date, default: Date.now}
    
});

module.exports = mongoose.model('User_Files', User_Files);