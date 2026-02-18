const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email_address: {type: String, required: true},
    username: {type: String, required: true},
    password: {type: String, required: true},
    bookmarks: [{
        postId: {type:mongoose.Schema.Types.ObjectId, ref: "User_Files"},
        quizId: {type:mongoose.Schema.Types.ObjectId, ref: "Quiz"},
        createdAt: {type: Date, default: Date.now},
 
    }],
    googleId: { type: String, unique: true, sparse: true },
    githubId: { type: String, unique: true, sparse: true },
    avatar: { type: String },
    
});

module.exports = mongoose.model('User', UserSchema);