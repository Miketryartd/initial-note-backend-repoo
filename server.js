const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const User_files = require('./models/User_files');
const jwt = require('jsonwebtoken');





//multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads'); 
    },
    filename: function (req, file, cb){
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({storage: storage});

//mongodb connection
mongoose.connect(process.env.MONGO_URI_SIKRET_KEY)
.then(() => console.log("Mongodb connected"))
.catch(err => console.log(err));


const app = express();
const port = 5000;

//middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));



//auth checker//


const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) return res.status(401).json({ error: "No token provided" });

    jwt.verify(token, process.env.JWT_SICKRET_KEY_LOL, (err, user) => {
        if (err) return res.status(403).json({ error: "Token is invalid or expired" });
        req.user = user; 
        next();
    });
};


app.get('/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});




//routes



app.post('/files', authenticateToken, upload.array('files', 12), async (req, res) => {
    try {
        const uploadedFiles = req.files;
        const { subject, description, upVotes, downVotes } = req.body;

        if (!uploadedFiles || uploadedFiles.length === 0) {
            return res.status(400).json({ error: "No files uploaded" });
        }

        console.log(`Received ${uploadedFiles.length} files`);

        const paths = uploadedFiles.map(file => file.path);

        const newNote = new User_files({
            subject: subject,
            description: description,
            filePaths: paths,
            userId: req.user.id
        });

     
        await newNote.save();
        
        console.log("Files details:", uploadedFiles);
        console.log("Form data:", req.body);

        res.status(201).json({
            message: "Notes saved to db and files saved to disk.", 
            note: newNote
        });
        
    } catch (err) {
        console.error("Internal Server Error:", err);
        res.status(500).json({ error: "Upload failed" });
    }
});

app.get('/files-fetch', async (req, res) =>{

    try{

        const files = await User_files.find().populate('userId', 'username').sort({uploadedAt: -1});
        res.status(200).json(files);
    } catch (err){
        res.status(500).json({error: "Failed to fetch files"});
    }
});

app.get('/post/:id', async (req, res) =>{

    try{
        const {id} = req.params;
        const post = await User_files.findById(id).populate('userId', 'username');

        if (!post){
            return res.status(404).json({error: 'Post not found'});
        }
        res.status(200).json(post);
        
    } catch (err){
        console.error(err);
        res.status(500).json({error: "Invalid id format or server error"});
    }
});

//votes 

app.post('/post/:id/upvote', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id; 
  
    const post = await User_files.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });
  
  
    const existingVote = post.voters?.find(v => v.user.equals(userId));
  
    if (existingVote?.type === "upvote") {

      post.voters = post.voters.filter(v => !v.user.equals(userId));
    } else if (existingVote?.type === "downvote") {
 
      existingVote.type = "upvote";
    } else {
 
      post.voters = post.voters || [];
      post.voters.push({ user: userId, type: "upvote" });
    }
  
    
    post.upVotes = post.voters.filter(v => v.type === "upvote").length;
    post.downVotes = post.voters.filter(v => v.type === "downvote").length;
  
    await post.save();
  
    res.json({ upVotes: post.upVotes, downVotes: post.downVotes });
  });
  app.post('/post/:id/downvote', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
  
    const post = await User_files.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });
  
    const existingVote = post.voters?.find(v => v.user.equals(userId));
  
    if (existingVote?.type === "downvote") {
 
      post.voters = post.voters.filter(v => !v.user.equals(userId));
    } else if (existingVote?.type === "upvote") {
 
      existingVote.type = "downvote";
    } else {
  
      post.voters = post.voters || [];
      post.voters.push({ user: userId, type: "downvote" });
    }
  
 
    post.upVotes = post.voters.filter(v => v.type === "upvote").length;
    post.downVotes = post.voters.filter(v => v.type === "downvote").length;
  
    await post.save();
  
    res.json({ upVotes: post.upVotes, downVotes: post.downVotes });
  });
  
   //auth
app.post('/registration', async (req, res) => {

    try{

        const {email_address, username, password} = req.body;

        const newUser = new User({
            email_address,
            username,
            password

        });

        await newUser.save();
        res.status(201).json({message: "User registered successfully!"});


    } catch (err) {
        console.error(err);
        res.status(500).json({error: "Registration failed."});
    }

});




app.post('/login', async (req, res) => {
 

    try{

        const {email_address, password} = req.body;
        const user = await User.findOne({email_address});

        if (!user || user.password !== password){
            return res.status(401).json({error: "Invalid credentials"});
        }

        const token = jwt.sign(
            {id: user._id},
            process.env.JWT_SICKRET_KEY_LOL,
            {expiresIn: '1d'}
        );

        res.status(200).json({
            message: "Login succesful!",
            token: token,
            user: {username: user.username, email: user.email_addess}
        });
    } catch (err){
        res.status(500).json({error: "Server-error"});
    }

});



//server connection
app.listen(port, () =>{
    console.log(`Server running at http://localhost:${port} `);
});