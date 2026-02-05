const mongoose = require('mongoose');

const User_Files = new mongoose.Schema({
   subject: {type: String, required: true},
   description: {type: String},
   userId: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
   filePaths: [{type: String}],
   upVotes: {type: Number, default: 0},
   downVotes: {type: Number, default: 0},
   voters: [
      {
         user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      type: { type: String, enum: ["upvote", "downvote"] },
      }
   ],
   uploadedAt: {type: Date, default: Date.now}
    
});

module.exports = mongoose.model('User_Files', User_Files);