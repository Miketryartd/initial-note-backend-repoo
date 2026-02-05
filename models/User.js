const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email_address: {type: String, required: true},
    username: {type: String, required: true},
    password: {type: String, required: true}
    
});

module.exports = mongoose.model('User', UserSchema);