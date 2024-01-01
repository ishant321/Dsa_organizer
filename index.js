// ---------- INDEX ----------

// 1. ALL IMPORTS
// 2. MIDDLEWARES

//---------------------------

const importantTopics =[
    "array",
    "linked list",
    "stack",
    "queue",
    "tree",
    "graph",
    "recursion",
    "dynamic programming",
    "string",
    "bit manipulation",
    "sliding window",
    "greedy",
    "heap"
];

//-------------------- ALL IMPORTS ------------------------
var express = require("express");
var bodyParser = require("body-parser");
const mongoose = require("mongoose");
var _ = require("lodash");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findorcreate = require("mongoose-findorcreate");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const flash = require("connect-flash");
var path = require("path");
const e = require("connect-flash");
const { read } = require("fs");
const nodeMailer = require("nodemailer");
// const axios = require("axios");
const cheerio = require("cheerio");
require("dotenv").config();
require("colors");
//---------------------------------------------------------





//----------------- MIDDLEWARES ----------------------------
var app = express();
app.locals._ = _;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, "/public")));
app.use(flash());

app.use(session({
    secret: process.env.SESSION_SECRET,
    store: new MongoStore({
        mongoUrl: 'mongodb+srv://'+process.env.MONGO_USERNAME+':'+process.env.MONGO_PASSWORD+'@cluster0.qho5cx4.mongodb.net/dsauserDB',
        ttl: 14 * 24 * 60 * 60 // = 14 days. Default
    }),
    resave: false,
    saveUninitialized: false
}))


app.use(passport.initialize());
app.use(passport.session());
//-----------------------------------------------------------





//------------- DATABASE CONNECTIONS ------------------------
// mongoose.connect("mongodb+srv://"+process.env.MONGO_USERNAME+":"+process.env.MONGO_PASSWORD+"@cluster0.qho5cx4.mongodb.net/dsauserDB").then(() => console.log("Connected!"));
mongoose.connect("mongodb+srv://"+process.env.MONGO_USERNAME+":"+process.env.MONGO_PASSWORD+"@cluster0.qho5cx4.mongodb.net/dsauserDB").then(() => console.log("Connected to mongoDB atlas!"));

const topicSchema = new mongoose.Schema({
    topicname: String,
    content: [{ qname: String, link: String, docs: String, notes: Array } ]
});
const topicModel = mongoose.model("topicModel", topicSchema);

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    googleid: String,
    githubid: String,
    is_verified: Boolean,
    data: [topicSchema]
});

userSchema.plugin(passportLocalMongoose, {usernameField: "email"});
userSchema.plugin(findorcreate);

const userModel = new mongoose.model("userModel", userSchema);

passport.use(userModel.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.email,
        is_verified: user.is_verified
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });
//----------------------------------------------------------




//----------------- GOOGLE STRATEGY -----------------------

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://dsa-organizer-6wz8.vercel.app/auth/google/userhome"
  },
  function(accessToken, refreshToken, email, cb) {
    userModel.findOrCreate({ email : email._json.email, googleid: email.id, name: email.displayName}, {is_verified: true}, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/userhome", 
  passport.authenticate("google", { failureRedirect: "/commonhome" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/");
  });
//----------------------------------------------------------





//---------------- GITHUB STRATEGY ------------------------

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "https://dsa-organizer-6wz8.vercel.app/auth/github/userhome"
  },
  function(accessToken, refreshToken, profile, done) {
    userModel.findOrCreate({ name: profile.displayName, githubid: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

app.get("/auth/github",
  passport.authenticate("github", { scope: [ "user:email" ] }));

app.get("/auth/github/userhome", 
  passport.authenticate("github", { failureRedirect: "/commonhome" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/");
  });

//---------------------------------------------------------





//------------------ AUTHENTICATION ------------------------

app.get("/auth/local", (req, res) => {
    var k = " ";
    res.redirect("/login");
});

app.get("/register", (req, res) => {
    res.render("commonhome", {
        text: "", 
        message: req.flash("info")
    });
})

app.post("/register",  (req, res)=>{
    const name = _.lowerCase(req.body.name);
    userModel.register({ email: req.body.email, name: name, is_verified: 0}, req.body.password, async (err, user)=>{
      if(err){
        if(err){
            req.flash("info", "User already exist.");
        }
        res.redirect("/");
      } 
      else{
        passport.authenticate("local")(req, res, () => {
            if(!user.is_verified){
                return res.redirect("/verify-email");
            }
            res.redirect("/userhome");
        })
      }
    })
})

app.get("/login", (req, res) => {
    res.render("auth/login", { message: req.flash("info")});
});

app.post("/login", async (req, res) => {
    const user = new userModel({
        email: req.body.email,
        password: req.body.password
    })
    const checkUser = await userModel.find({email: user.email}).exec();
    if(checkUser.length == 0){
        req.flash("info", "Email not registered");
        res.render("auth/login", {message: req.flash("info")});
    }
    else{
        passport.authenticate("local", {failureFlash: req.flash("info", "Invalid username or password"), failureRedirect: "/login"})(req, res, ()=>{
            res.redirect("/userhome");
        });
    }
    // req.login(user, async function(err) {
    //     if (err) { 
    //         console.log(err);
    //         res.redirect("/login");
    //     }else{
    //         const curUser = await userModel.findOne({email: user.email});
    //         if(!curUser){
    //             req.flash("info", "Email not registered");
    //             res.render("auth/login", {message: req.flash("info")});
    //         }
    //         else{
    //             passport.authenticate("local", {failureFlash: req.flash("info", "Invalid username or password"), failureRedirect: "/login"})(req, res, ()=>{
    //                 res.redirect("/userhome");
    //             });
    //         }
    //     }
    // });
});

app.get("/resetpassword", (req, res) => {
    res.render("auth/resetpassword",{
        message: req.flash("info")
    });
});

app.post("/reset", async (req,res) => {
    const curUsername = req.body.username;
    const newpassword = req.body.newpassword;
    const cPass = req.body.confirmpassword;
    const curUser = await userModel.findOne({email: curUsername}).exec();
    if(curUser){
        if(cPass != newpassword){
            res.render("auth/resetpassword",{
                message: "password doesnot match"
            })
        }
        else{
            await userModel.findOne({ email: curUsername })
            .then((u) => {
                u.setPassword(newpassword,(err, u) => {
                    if (err) return next(err);
                    u.save();
                    req.flash("info", "Reset done.")
                    return res.redirect("/login");
                });

            })
        }
    }
    else{
        req.flash("info", "email not registered")
        res.render("auth/resetpassword", {message: req.flash("info")});
    }
});

app.post("/changepassword", async (req, res) => {
    if(req.isAuthenticated()){
        const curUser = await userModel.findById(req.user.id).exec();
        if(curUser.googleid || curUser.githubid){
            req.flash("info", "You are authenticated by google or github");
            res.redirect("/");
        }
        else{
            res.render("auth/changepassword", { message: req.flash("info") });
        }
    }
    else{
        res.redirect("/login");
    }
});

app.post("/change", async (req, res) => {
    if(req.isAuthenticated()){
        await userModel.findById(req.user.id)
        .then((u) => {
            const curEmail = req.body.username;
            if(u.email != curEmail){
                req.flash("info", "Enter correct email");
                res.render("auth/changepassword", {message: req.flash("info")})
            }else{
            u.setPassword(req.body.newpassword,(err, u) => {
                if (err){
                    console.log(err);
                }
                u.save();
                req.flash("info", "password changed successfully");
                res.redirect("/userhome");  
            });
            }
        })
    }
    else{
        res.redirect("/login");
    }
})

app.post("/logout", (req, res) => {
    req.logout(function(err) {
        if (err) { 
            console.log(err);
         }
        res.redirect("/");
    });
})

//---------------------------------------------------------





//----------------- HOME ROUTES ---------------------------
app.get("/", async (req, res)=>{
    if(req.isAuthenticated()){
        res.redirect("/userhome");
    }
    else{
        res.render("commonhome",{
            text: "",
            message: req.flash("info")
        });
    }
});

app.get("/userhome", async (req, res)=>{
    if(req.isAuthenticated() && req.user.is_verified){
        // if(!req.user.is_verified){
        //     console.log(req.user.is_verified);
        //     const ID = req.user.id;
        //     req.logout((err) => {
        //         if(err){
        //             console.log(err);
        //         }
        //     })
        //     await userModel.findByIdAndDelete(ID);
        //     req.flash("info", "please sign up again");
        //     return res.redirect("/");
        // }
        const curUser = await userModel.findById(req.user.id);
        let missingTopicsArray = [];
        var flag;
        const userTopicList = curUser.data;
        for(var i = 0; i < importantTopics.length; i++){
            flag = true;
            for(var j = 0; j < userTopicList.length; j++){
                if(importantTopics[i] === _.lowerCase(userTopicList[j].topicname)){
                    flag = false;
                    break;
                }
            }
            if(flag == true){
                missingTopicsArray.push(importantTopics[i]);
            }
        }
        res.render("userhome", {
            nameOfUser: curUser.name,
            topics: curUser.data,
            message: req.flash("info"),
            suggestedTopic: missingTopicsArray
        })
    }else{
        res.redirect("/register");
    }
})

//---------------------------------------------------------





//------------ TOPIC MANAGEMENT ROUTES --------------------
app.get("/addtopic",(req, res)=>{
    if(req.isAuthenticated()){
        res.render("addtopic");
    }else{
        res.redirect("/login");
    }
});

app.post("/addtopicbysuggestion", async (req, res) => {
    if(req.isAuthenticated()){
        const topicName = _.lowerCase(req.body.topicvalue);
        const newTopic = new topicModel({ topicname: topicName });
        newTopic.save();
        const curUser = await userModel.findById(req.user.id).exec();
        curUser.data.push({topicname: topicName});
        await curUser.save();
        res.redirect("/userhome");
    }
    else{
        res.redirect()
    }
})


app.post("/addnewtopic", async (req, res) => {
    if(req.isAuthenticated()){
        const topicName = _.lowerCase(req.body.topicname);
        const newTopic = new topicModel({ topicname: topicName });
        newTopic.save();
        const curUser = await userModel.findById(req.user.id).exec();
        var flag = true;
        for(var i = 0; i < curUser.data.length; i++){
            if(_.lowerCase(topicName) === curUser.data[i].topicname){
                flag = false;
                break;
            }
        }
        if(flag == true){
            curUser.data.push({topicname: topicName});
            curUser.save();
            res.redirect("/userhome");
        }
        else{
            req.flash("info", "Topic already exist");
            res.redirect("/userhome");
        }

    }else{
        res.redirect("/login");
    }
});

app.get("/removetopic", async (req, res)=>{
    if(req.isAuthenticated()){
        const curUser = await userModel.findById(req.user.id).exec();
        const userTopics = curUser.data;
        if(userTopics.length == 0){
            res.redirect("/");
        }
        res.render("removetopic",{
            t: userTopics
        });
    }
    else{
        res.redirect("/login");
    }        
});

app.post("/remove", async (req, res) => {
    if(req.isAuthenticated()){

        const curTopicName = req.body.rembtn;
        const curUser = await userModel.findById(req.user.id).exec();
        const topicArray = curUser.data;
        for(i = 0; i < topicArray.length; i++){
            if(topicArray[i].topicname === curTopicName){
                break;
            }
        }
        topicArray.splice(i, 1);
        curUser.save();
        res.redirect("/userhome");
    }
    else{
        res.redirect("/login");
    }
});

app.get("/topicwiselist/:list", async (req, res) => {
    if(req.isAuthenticated()){
        // console.log(list);
        var x = req.params.list;
        // x.trim();
        const curUser = await userModel.findById(req.user.id).exec();
        const topicArray = curUser.data;
        for(i = 0; i < topicArray.length; i++){
            if(topicArray[i].id === x){
                break;
            }
        }
        function compare( a, b ) {
            if ( a.qname > b.qname ){
              return 1;
            }
            if ( a.qname < b.qname ){
              return -1;
            }
            return 0;
        }
        // console.log(topicArray[i]);
        topicArray[i].content.sort(compare);
        res.render("topicwiselist",{
            topicname: x,
            topicData: topicArray[i],
            i: 1
        })
    }
    else{
        res.redirect("/login");
    }
    
});
//---------------------------------------------------------





//---------QUESTION MANAGEMENT ROUTES ---------------------

app.get("/addquestion", (req, res) => {
    if(req.isAuthenticated()){
        res.redirect("/newquestion");
    }else{
        res.redirect("/login");
    }
});

app.get("/addnote/:questionid", async (req, res) => {
    if(req.isAuthenticated() && req.user.is_verified){
    const curUser = await userModel.findById(req.user.id);
    var str = req.params.questionid;
    const len = (Number)(str.length);
    const questionNo = str[len-1];
    const itemId = str.slice(0, len-1);
    // const arr = await userModel.findById(req.user.id).data;
    // topicArray[i].content.push({qname: questionName, link: questionLink, docs: docLink});
    const userData = curUser.data;
    var userTopic = [];
    for(var i = 0; i < userData.length; i++){
        if(userData[i].id === itemId){
            userTopic = userData[i].content;
            break;
        }
    }
    const question = userTopic[questionNo];
    const notes = question.notes;
    res.render("addnote", {
        questionid: req.params.questionid,
        notes: notes
    });
    }
    else{
        res.redirect("/register");
    }
})

app.post("/addnote", async(req, res) => {
    if(req.isAuthenticated() && req.user.is_verified){
        const {newnote, questionid} = req.body;
        const curUser = await userModel.findById(req.user.id);
        var str = questionid;
        const len = (Number)(str.length);
        const questionNo = str[len-1];
        const itemId = str.slice(0, len-1);
        // const arr = await userModel.findById(req.user.id).data;
        // topicArray[i].content.push({qname: questionName, link: questionLink, docs: docLink});
        const userData = curUser.data;
        var userTopic = [];
        for(var i = 0; i < userData.length; i++){
            if(userData[i].id === itemId){
                userTopic = userData[i].content;
                break;
            }
        }
        const question = userTopic[questionNo];
        // console.log(question);
        const notes = question.notes.push(newnote);
        await curUser.save();
        res.render("addnote", {
            questionid: questionid,
            notes: question.notes
        });
    }
    else{
        res.redirect("/register");
    }
})

app.post("/removenote", async (req, res) => {
    if(req.isAuthenticated() && req.user.is_verified){
        const {newnote, no, questionid} = req.body;
        const curUser = await userModel.findById(req.user.id);
        var str = questionid;
        const len = (Number)(str.length);
        const questionNo = str[len-1];
        const itemId = str.slice(0, len-1);
        // const arr = await userModel.findById(req.user.id).data;
        // topicArray[i].content.push({qname: questionName, link: questionLink, docs: docLink});
        const userData = curUser.data;
        var userTopic = [];
        for(var i = 0; i < userData.length; i++){
            if(userData[i].id === itemId){
                userTopic = userData[i].content;
                break;
            }
        }
        const question = userTopic[questionNo];
        question.notes.splice(no, 1);
        await curUser.save();
        res.render("addnote", {
            questionid: questionid,
            notes: question.notes
        });
    }
    else{
        res.redirect("/register");
    }
})

app.post("/addquestion", (req, res) => {
    if(req.isAuthenticated()){
        res.render("addquestion", {
            topicname: req.body.addq
        })
    }else{
        res.redirect("/login");
    }
});

app.post("/newquestion", async (req, res) => {
    if(req.isAuthenticated()){
        const topicName = req.body.nqb;
        const questionName = req.body.questionName;
        var questionLink = req.body.questionLink;
        var docLink = req.body.docLink;
        var checkStirng = questionLink.substring(0, 4);
        if(checkStirng != "http"){
            questionLink = "http://"+questionLink;
        }

        const curUser = await userModel.findById(req.user.id).exec();
        const topicArray = curUser.data;
        for(i = 0; i < topicArray.length; i++){
            if(topicArray[i].topicname === topicName){
                break;
            }
        }
        topicArray[i].content.push({qname: questionName, link: questionLink, docs: docLink});
        curUser.save();
        res.redirect("/topicwiselist/"+topicArray[i].id);
    }
    else{
        res.redirect("/login");
    }
})

app.post("/removequestion", async (req, res) => {
    if(req.isAuthenticated()){
        const curUser = await userModel.findById(req.user.id).exec();
        const topicArray = curUser.data;
        for(i = 0; i < topicArray.length; i++){
            if(topicArray[i].topicname === req.body.rqb){
                break;
            }
        }
        function compare( a, b ) {
            if ( a.qname > b.qname ){
              return 1;
            }
            if ( a.qname < b.qname ){
              return -1;
            }
            return 0;
        }
        topicArray[i].content.sort(compare);
        res.render("removequestion",{
            topicData: topicArray[i], 
            i: 1
        });
    }
    else{
        res.redirect("/login");
    } 
})

app.post("/deletequestion", async (req, res) => {
    if(req.isAuthenticated()){
        const curUser = await userModel.findById(req.user.id).exec();
        const {topicId, questionId} = req.body;
        const userData = curUser.data;
        var curTopic;
        for(var i = 0; i < userData.length; i++){
            if(userData[i].id == topicId){
                curTopic = userData[i].content;
                break;
            }
        }
        var curQuestion;
        for(var i = 0; i < curTopic.length; i++){
            if(curTopic[i].id == questionId){
                curQuestion = i;
            }
        }
        curTopic.splice(curQuestion, 1);
        curUser.save();
        // const topicname = req.body.rqi;
        // const qname = req.body.qname;
        // const topicArray = curUser.data;
        // for(i = 0; i < topicArray.length; i++){
        //     if(topicArray[i].topicname === req.body.rqi){
        //         break;
        //     }
        // }
        // const questionArray = topicArray[i].content;
        // for(j = 0; j < questionArray.length; j++){
        //     if(questionArray[j].qname === qname){
        //         break;
        //     }
        // }
        // questionArray.splice(j, 1);
        // curUser.save();
        res.redirect("/topicwiselist/"+topicId);
    }
    else{
        res.redirect("/login");
    }
});

app.post("/practice", async (req, res) => {
    if(req.isAuthenticated()){
        var allQuestions = [];
        var curUser = await userModel.findById(req.user.id).populate({path: 'data', populate: {path: 'content', model: 'topicModel'}});
        // console.log(curUser.data.)

        for(var i = 0; i < curUser.data.length; i++){
            for(var j = 0; j < curUser.data[i].content.length; j++){
                var q = curUser.data[i].content[j];
                allQuestions.push(q);
            }
        }
            res.render("practicequestion", {
                allQuestions: allQuestions,
            });
    }
    else{
        res.redirect("/login");
    }
})

//-------- PROFILE -------

app.get("/profilestats", async (req, res) => {
    if(req.isAuthenticated()){
        const curUser = await userModel.findById(req.user.id).exec();
        var nul = 0, lessThanTen = 0, tenToTwenty = 0, aboveTwenty = 0;
        const missingTopicsArray = [];
        const lessThanTenArray = [];
        var flag = true;
        for(var i = 0; i < importantTopics.length; i++){
            flag = true;
            curUser.data.forEach(function(item){
                if(_.lowerCase(item.topicname) === importantTopics[i] || item.topicname === importantTopics[i]+'s'){
                    if(item.content.length <= 10){
                        lessThanTen += 1;
                        lessThanTenArray.push(item.topicname);
                    }
                    else if(item.content.length > 10 && item.content.length <=20){
                        tenToTwenty += 1;
                    }
                    else{
                        aboveTwenty += 1;
                    }
                    flag = false;
                }
            });
            if(flag === true){
                nul = nul+1;
                missingTopicsArray.push(importantTopics[i]);
            }
        }

        var profileStatus;
        var customMessage = "All the best";

        if(nul === importantTopics.length){
            profileStatus = "Empty";
        }
        else if(nul >= 5){
            profileStatus = "Very Weak";
        }
        else if(lessThanTen >= 5){
            profileStatus = "Weak";
        }
        else if(tenToTwenty >= 5){
            profileStatus = "Good";
        }
        else if(aboveTwenty >= 8){
            profileStatus = "Very good";
        }

        res.render("profile",{
            profileStatus: profileStatus,
            missingTopicsArray: missingTopicsArray,
            lessThanTenArray: lessThanTenArray,
            customMessage: customMessage,
            username: curUser.name
        });
    }
    else{
        res.redirect("/login");
    }
})


//----------- EMAIL VERIFICATION FEATURE --------------

app.get("/verify-email", async (req, res)=> {
    try{
        //To verify if the mail is valid or not
        let isValidMail = false;
        if(!req.user){
            req.flash("info", "please login or signup");
            return res.redirect("/");
        }
        const curUser = await userModel.findById(req.user.id);
        

        await axios.get('https://emailvalidation.abstractapi.com/v1/?api_key='+process.env.EMAIL_VERIFICATION_API+'&email='+curUser.email+'')
        .then(async result => {
            // console.log(result.data);
            if(!result.data.is_smtp_valid.value){
                req.logout(async function(err) {
                    if (err) {  
                        console.log(err);
                    }
                });
                await userModel.findByIdAndDelete(curUser.id).exec(); 
            }
            else{
                isValidMail = true;
            }
        })
        .catch(async error => {
            console.log(error);
            await userModel.findByIdAndDelete(curUser.id);
            req.flash("info", "Unusual error. Please try again.")
            return res.redirect("/");
        });
        
        if(isValidMail){
            var otp = Math.floor(100000 + Math.random() * 900000);
            if(!otp){ otp = 678568; }
            const transporter = nodeMailer.createTransport({
                // name: "example.com",
                host: "smtp.gmail.com",
                port: 587,
                secure: false,
                requireTLS: true,
                auth: {
                    user: process.env.SMTP_MAIL,
                    pass: process.env.SMTP_MAIL_PASSWORD
                }
            })

            const mailOptions = {
                name: "https://dsa-organizer-6wz8.vercel.app",
                from: "process.env.SMTP_MAIL",
                to: curUser.email,
                subject: "OTP for email verification: DSA Organizer",
                // html: 'Welcome '+_.capitalize(curUser.name)+'</h5><a href="https://dsa-organizer-6wz8.vercel.app/email-verify/'+curUser.id+'/?name=https://dsa-organizer-6wz8.vercel.app>Verify</a> to continue'
                html: '<h2>Welcome '+_.capitalize(curUser.name)+'</h2><h4>Your otp is <h2><h4>'+otp+'</b></h2>'
            }
            // '<p>Hii '+curUser.name+', please click here to <a href="https://dsa-organizer-6wz8.vercel.app/email-verify/'+curUser.id+'">verify</a> your mail.</p>'

            const MailSender = async (transporter, mailOptions) => {
                try{
                    await transporter.sendMail(mailOptions);
                    req.flash("user", [curUser.email, otp]);
                    return res.redirect("/otpsent");
                }
                catch(error){
                    res.send(error);
                    console.log(error);
                    req.logout(async function(err) {
                        if (err) {  
                            console.log(err);
                        }
                    });
                    await userModel.findByIdAndDelete(curUser.id); 
                    req.flash("info", "error");
                    return res.redirect("/");
                }
            }
            MailSender(transporter, mailOptions);
            // await transporter.sendMail(mailOptions, function(error, info){
            //     if(error){
            //         console.log(error);
            //         req.flash("info", "error");
            //         return res.redirect("/register");
            //     }
            //     else{
            //         req.logout(function(err) {
            //             if (err) { 
            //                 console.log(err);
            //             }
            //             console.log(curUser.email);
            //             req.flash("info","Email sent for verification");
            //             return res.redirect("/");
            //         });
            //     }
            // })
            
        }
        else{
            req.logout(function(err) {
                if (err) { 
                    console.log(err);
                }
            });
            await userModel.findByIdAndDelete(curUser.id);
            req.flash("info", "Invalid email");
            return res.redirect("/"); 
        }
    }
    catch(error){
        console.log(error);
    }
})

// app.get("/email-verify/:userId", async (req, res) => {
//     const curUser = await userModel.findByIdAndUpdate(req.params.userId, { $set: { is_verified: true }});
//     res.redirect("/mailverified");
// })


app.get("/otpsent", (req, res) => {
    if(req.isAuthenticated()){
        var user = req.flash("user");
        res.render("otpsent", {
            userEmail: user[0],
            otp: user[1]
        });
    }
    else{
        req.flash("info", "Please signup or login.")
        res.redirect("/register");
    }
})

app.post("/otpsent", async (req, res) => {
    if(req.isAuthenticated()){
        var {one, two, three, four, five, six, otp} = req.body;
        const userEnteredOtp = (one+two+three+four+five+six);
        const otpString = otp.toString();
        if(userEnteredOtp === otpString){
            const user = await userModel.findByIdAndUpdate(req.user.id, { $set: { is_verified: true }}).exec();

            return res.redirect("/otpverified");
        }
        else{
            const userid = req.user.id;
            req.logout((err) => {if(err){console.log(err)}})
            await userModel.findByIdAndDelete(userid);
            req.flash("info", "Invalid otp. please try again.")
            return res.redirect("/register");
        }
    }
    else{
        req.flash("info", "sign up or login first");
        res.redirect("/register");
    }
})

app.get("/otpverified", async (req, res) => {
    if(req.isAuthenticated()){
        req.logout((err) => {console.log(err)})
        res.render("otpverified");
    }
    else{
        req.flash("info", "from otpverified redirection");
        res.redirect("/register");
    }
})


// app.post("/otpverified", (req, res) => {
//     console.log(req.user);
//     if(req.isAuthenticated()){
//         return res.redirect("/userhome");
//     }
//     else{
//         req.flash("info", "error in otpverified post req")
//         res.redirect("/");
//     }
// })

//---------- ! EMAIL VERIFICATION FEATURE -------------


//-------------------------------------------------



app.listen(3001, ()=>{
    console.log("listening.......");
});