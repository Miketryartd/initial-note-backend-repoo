const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const User_files = require('./models/User_files');
const jwt = require('jsonwebtoken');
const Quiz = require("./models/User_Quizes");
const QuizAttempt = require('./models/User_Quiz_Attempts');
const bcrypt = require('bcrypt');
const Notification = require('./models/Notification');
const cloudinary = require('cloudinary').v2;
const {CloudinaryStorage} = require("multer-storage-cloudinary");
const {OAuth2Client}  = require('google-auth-library');
const axios = require('axios');

//google auth//

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const app = express();
const port = 5000;
app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));


const STORAGE_MODE = process.env.STORAGE_MODE || 'local';
let upload;
//cloud storage

if (STORAGE_MODE === 'local'){

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, process.env.LOCAL_UPLOAD_PATH || "uploads"),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    },
  });
  upload = multer({ storage, limits: {fileSize: 50 * 1024 * 1024} });
} else if (STORAGE_MODE === 'cloud'){
  const cloudinary = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');


  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_CLOUD_API_KEY,
    api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET
  });
  
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'user_uploads',
      allowed_formats: ['jpg', 'png', 'pdf'],
    },
  });

  upload = multer({storage});
}




//mongodb connection
mongoose.connect(process.env.MONGO_URI_SIKRET_KEY)
.then(() => console.log("Mongodb connected"))
.catch(err => console.log(err));



//middleware
const local = process.env.FRONTEND_URL;
const prod = process.env.FRONTEND_URL_PROD;
const allowedOrigins = [
  prod,
  local
];
app.use(cors({
  origin: function(origin, callback){
    if(!origin) return callback(null, true); 
    if(allowedOrigins.indexOf(origin) !== -1){
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  credentials: true,
}));




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
  
      let user = await User.findById(req.user.id).select('-password');
      
    
      if (!user && req.user.authProvider === 'google') {
        
          return res.status(200).json({
              _id: req.user.id,
              username: req.user.name,
              email: req.user.email,
              avatar: req.user.picture,
              authProvider: 'google'
            
          });
      }
      
      if (!user) {
          return res.status(404).json({ error: "User not found" });
      }
      
      res.status(200).json(user);
  } catch (err) {
      console.error('Error in /auth/me:', err);
      res.status(500).json({ error: "Server error" });
  }
});



//test
app.get('/', (req, res) => {
    res.send('Backend is running!');
  });
  

//routes

app.post(
  '/files',
  authenticateToken,
  upload.fields([{ name: "files", maxCount: 12 }, { name: 'cover_photo', maxCount: 1 }]),
  async (req, res) => {
    try {
      const uploadedFiles = req.files?.['files'] || [];
      const cover = req.files?.['cover_photo']?.[0] || null;
      const { subject, description } = req.body;

      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      let fileUrls;
      if (STORAGE_MODE === 'local') {
        fileUrls = uploadedFiles.map(f => f.path?.replace(/\\/g, "/"));
      } else {
        fileUrls = uploadedFiles.map(f => f.path);
      }

      const coverUrl = cover
        ? STORAGE_MODE === 'local'
          ? cover.path.replace(/\\/g, "/")
          : cover.path
        : null;

      console.log(`Received ${uploadedFiles.length} files`);
      console.log("Files details:", uploadedFiles);
      console.log("Form data:", req.body);

      const newNote = new User_files({
        username: user.username,
        subject,
        description,
        filePaths: fileUrls,
        coverPhoto: coverUrl,
        userId: req.user.id
      });

      await newNote.save();

      res.status(201).json({
        message: "Notes saved to db and files saved to disk.",
        note: newNote
      });
    } catch (err) {
      console.error("Internal Server Error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);



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
// UPVOTE
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
  
    const userVote = post.voters.find(v => v.user.equals(userId))?.type || null;
  
    res.json({
      upVotes: post.upVotes,
      downVotes: post.downVotes,
      userVote: userVote 
    });
  });
  
  // DOWNVOTE
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
  
    const userVote = post.voters.find(v => v.user.equals(userId))?.type || null;
  
    res.json({
      upVotes: post.upVotes,
      downVotes: post.downVotes,
      userVote: userVote 
    });
  });
  

  //comments

  app.post('/post/:postId/comments', authenticateToken, async (req, res) =>{
    const { comment } = req.body;
     const userId = req.user.id;
     const user = await User.findById(userId).select("username");
     const postId = req.params.postId;
     const post = await User_files.findById(postId);


     if (!postId){
        return res.status(401).json({error: "Error no postId found!"});
     }
     if (!userId){
        return res.status(401).json({error: "Error no user found!"});
     }

     if (!user || !user.username){
       return res.status(400).json({ error: "User not found or missing username" });
     }


     if (!post){
        return res.status(401).json({error: "error: no post found!"});
     }

     const newComment = {
        comment: comment,
        user: userId,           
        username: user.username  
      };
      
      post.comments.push(newComment);
      await post.save();
      res.status(201).json(newComment);
      




  })

  app.get('/post/:postId/comments', authenticateToken, async (req, res) =>{

    try{
        const postId = req.params.postId;
        const post = await User_files.findById(postId);
        

        if (!post){
            return res.status(404).json({ error: "Post not found"});
        }

        res.status(200).json(post.comments);
    } catch (error){
        console.error('Error fetching comments', error);
        res.status(500).json({error: "Server error"});
    }
  });

  //Quizzes

  app.get('/quiz/quizzes', authenticateToken, async (req, res) =>{

    try{

        const quizzes = await Quiz.find().sort({createdAt: -1});

        if (!quizzes){
            return res.status(400).json({Error: "missing quizzes"});
        }
        res.status(200).json(quizzes);
    } catch (error){
        console.error('Error fetching quizzes:', error);
        res.status(500).json({error: "Server error"});
    }
  });


  app.post('/quiz/submit/:quizId', authenticateToken, async (req, res) =>{

    try{
        const {quizId} = req.params;
        const {answers, score, title} = req.body;
        const userId = req.user.id;
      
        const user = await User.findById(userId).select("username");
        const username = user.username; 

       
        

        if (!userId){
            res.status(404).json({error: "No user id exists"});
            return;
        }
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({error: "Quiz not found"});

        const quizOwnerId = quiz.creator; 
        const attemptUserId = req.user.id;

        await Notification.create({
          userId: quizOwnerId,
          senderId: attemptUserId,
          type: "quiz_answered",
          referenceId: quizId,
          message: `${username} answered your quiz "${quiz.title}"`,


        })
 

        const newAttempt = new QuizAttempt({
          title,
            quizId,
            userId,
            answers,
            score,
            username,
            submittedAt: new Date()
        });
        await newAttempt.save();
        res.status(201).json({ message: "Quiz submitted", score: newAttempt.score });
    } catch (error){
        console.error(error);
        res.status(500).json({error: "Server error submitting quiz"});
    }

  });

  //Notifications//

 
app.get("/api/notifications", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; 
   
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50); 

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});
app.patch("/api/notifications/read", authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ message: "Notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update notifications" });
  }
});


  app.get('/quiz/attempts/:quizId', authenticateToken, async (req, res) => {
    try {
      const { quizId } = req.params;
      const quiz = await Quiz.findById(quizId);
      
  
      if (!quiz) return res.status(404).json({ message: "Quiz not found" });
      if (quiz.creator.toString() !== req.user.id)
        return res.status(403).json({ message: "Not authorized" });
  
      const attempts = await QuizAttempt.find({ quizId }).populate('userId', 'username');
      res.status(200).json(attempts);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error fetching attempts" });
    }
  });
  

  app.post("/quiz/create", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { questions, title } = req.body;
      const user = await User.findById(userId);



      if (!userId){
        return res.status(400).json({error: "No user found"});
      }
  
      if (!questions || questions.length === 0) {
        return res.status(400).json({ error: "No questions provided" });
      }
  
      const newQuiz = new Quiz({
        title: title,
        creator: userId,
        username: user.username,
        questions,
      });
  
      await newQuiz.save();
  
      res.status(201).json(newQuiz);
    } catch (error) {
      console.error("Quiz creation error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get('/quiz/quizzes/:id', authenticateToken, async (req, res) =>{
       try{

        const quizId = req.params.id;

        const quiz = await Quiz.findById(quizId);

        if (!quiz){
            return res.status(404).json({error: "Quiz not found"});
        }
        res.status(200).json(quiz);
       } catch (error){
        console.error('Error fetching quizL', error);
        res.status(500).json({error: "Server error"});
       }
  });
  
  //Bookmark
  app.post("/api/bookmark/:postId", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { postId } = req.params;
  
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
  
      const exists = user.bookmarks.find(b => b.postId?.toString() === postId);
  
      if (exists) {
        user.bookmarks = user.bookmarks.filter(b => b.postId?.toString() !== postId);
        await user.save();
        return res.json({ bookmarked: false });
      }
  
      user.bookmarks.push({ postId, createdAt: new Date() });
      await user.save();
      return res.json({ bookmarked: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to bookmark post" });
    }
  });
  

  app.get("/api/bookmark/:userId/:postId", authenticateToken, async (req, res) =>{

    try{
      const userId = req.user.id;
      const post = await User.findById(userId);
      const postId = post.bookmarks.postId;

      if (!postId) return res.status(404).json({error: "post ref id not found!"});
      res.status(200).json(postId);

    } catch (error){
      console.error('Error fetching bookmark', error);
      res.status(500).json({error: "Failed to fetch bookmark:", error});
    }
    
  })

  app.post("/api/bookmark/:quizId", authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { quizId } = req.params;
  
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
  
      const exists = user.bookmarks.find(b => b.quizId?.toString() === quizId);
  
      if (exists) {
        user.bookmarks = user.bookmarks.filter(b => b.quizId?.toString() !== quizId);
        await user.save();
        return res.json({ bookmarked: false });
      }
  
      user.bookmarks.push({ quizId, createdAt: new Date() });
      await user.save();
      return res.json({ bookmarked: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to bookmark post" });
    }
  });

app.get("/api/bookmarks", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("bookmarks.postId");
    if (!user || !user.bookmarks) return res.json({ bookmarks: [] });

    res.json({ bookmarks: user.bookmarks }); 
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/bookmarks/ids", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.bookmarks) return res.json({ bookmarks: [] });

    const ids = user.bookmarks.map(b => b.postId.toString());
    res.json({ bookmarks: ids });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

//search
app.get('/api/search', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    if (!search) return res.status(400).json({ error: 'No search query provided' });

    const users = await User.find({
      username: { $regex: search, $options: 'i' }
    }).sort({ _id: -1 });

    res.status(200).json(users); 

  } catch (error) {
    console.error('Error posting search:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Server error' }); 
    }
  }
});



   //auth

   //github
   //google
   app.post('/api/auth/google', async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: "No credential provided!" });
  
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
  
      const payload = ticket.getPayload();
      const { sub, email, name, picture } = payload;
  
      let user = await User.findOneAndUpdate(
        { googleId: sub }, 
        {
          $set: {
            googleId: sub,
            email: email,
            username: name,
            avatar: picture,
            authProvider: 'google',
            lastLogin: new Date()
          },
          $setOnInsert: {
           
            bookmarks: [],
            createdAt: new Date()
          }
        },
        { 
          upsert: true,
          new: true, 
          setDefaultsOnInsert: true
        }
      );
  
     
      const jwtToken = jwt.sign(
        { 
          id: user._id, 
          email: user.email,
          name: user.username,
          authProvider: 'google'
        },
        process.env.JWT_SICKRET_KEY_LOL, 
        { expiresIn: '7d' } 
      );
  
      return res.status(200).json({ 
        user: {
          _id: user._id,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
          authProvider: 'google'
        }, 
        token: jwtToken 
      });
  
    } catch (error) {
      console.error('Error verifying Google token', error);
      res.status(500).json({ error: "Server error" });
    }
  });
   app.post('/registration', async (req, res) => {
    try {
        const { email_address, username, password } = req.body;
        const saltRounds = 10;

        bcrypt.genSalt(saltRounds, function(err, salt) {
            if (err) return res.status(500).json({ error: err });

            bcrypt.hash(password, salt, function(err, hash) {
                if (err) return res.status(500).json({ error: err });

                const newUser = new User({
                    email_address,
                    username,
                    password: hash
                });

                newUser.save()
                    .then(user => res.status(201).json({ message: "User created", user }))
                    .catch(err => res.status(500).json({ error: err }));
            });
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Registration failed." });
    }
});


app.post('/login', async (req, res) => {
  try {
      const { email_address, password } = req.body;

   
      const user = await User.findOne({ email_address });
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

    
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    
      const token = jwt.sign(
          { id: user._id },
          process.env.JWT_SICKRET_KEY_LOL,
          { expiresIn: '1d' }
      );

      res.status(200).json({
          message: "Login successful!",
          token: token,
          user: { username: user.username, email: user.email_address }
      });

  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
  }
});




//server connection
app.listen(port, () =>{
    console.log(`Server running at http://localhost:${port} `);
});