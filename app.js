var express               = require("express"),
    app                   = express(),
    mongoose              = require("mongoose"),
    bodyParser            = require("body-parser"),
    Campground            = require("./models/campgrounds.js"),
    Comment               = require("./models/comments.js"),
    User                  = require("./models/user.js"),
    methodOverride        = require("method-override"),
    flash                 = require("connect-flash"),
    passport              = require("passport"),
    LocalStrategy         = require("passport-local"),
    passportLocalMongoose = require("passport-local-mongoose");
    
mongoose.connect("mongodb://localhost:27017/yelpcamp_v3", {useNewUrlParser:true});

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride("_method"));

// SET UP EXPRESS-SESSION
app.use(require("express-session")({
    secret: "Frase da decifrare",
    resave: false,
    saveUninitialized: false
}));

// SET UP FLASH MESSAGES
app.use(flash());

// SET UP PASSPORTS
app.use(passport.initialize());
app.use(passport.session());
app.locals.moment = require("moment");
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Middleware che agirà su tutte le routes e renderà sempre disponibile la variabile "currentUser"
app.use(function(req,res,next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});


// AUTHENTICATION
// ====================================
// REGISTER
app.get("/register", function(req, res) {
    res.render("register.ejs");
});

app.post("/register", function(req, res) {
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            req.flash("error", err.message);
            return res.redirect("/register");
        }
        passport.authenticate("local")(req, res, function(){
            res.redirect("/campgrounds");
        });
    });
});

// LOGIN
app.get("/login", function(req, res) {
    res.render("login.ejs");
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/campgrounds",
    successFlash: "Bentornato!",
    failureRedirect: "/login",
    failureFlash: true
}), function(req, res) {
});

// LOGOUT
app.get("/logout", function(req, res) {
    req.logout();
    req.flash("success", "See you next time!");
    res.redirect("/");
})

// ROUTES
app.get("/", function(req,res){
    res.render("index.ejs");
});

// INDEX - Display all campgrounds
app.get("/campgrounds", function(req,res){
    Campground.find({}, function(err, allCamps){
       if(err){
           console.log(err);
       } else {
           res.render("campgrounds/campgrounds.ejs", {campgrounds: allCamps});
       }
    });
});

// NEW CAMPGROUND - Display new camprgound form
app.get("/campgrounds/new",isLoggedIn, function(req,res){
    res.render("campgrounds/new.ejs");
});

// CREATE - Create and add new campground to DB
app.post("/campgrounds",isLoggedIn, function(req,res){
    var campName = req.body.name;
    var campImg = req.body.img;
    var campInfo = req.body.info;
    var newCamp = {name:campName,img:campImg,info:campInfo};
    
    // Create new camp and save it to DB
    Campground.create(newCamp, function(err, campCreated){
        if(err){
            console.log(err);
        } else {
            // Send back to campgrounds page
            res.redirect("/campgrounds");
        }
    });
});

// SHOW PAGE - Display more info about one campground
app.get("/campgrounds/:id", function(req, res) {
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCamp){
        if(err){
            console.log(err);
            res.redirect("/campgrounds");
        } else {
            res.render("campgrounds/show.ejs", {campground: foundCamp});
        }
    });
});

// EDIT - Display Edit form
app.get("/campgrounds/:id/edit",isLoggedIn, function(req, res) {
    Campground.findById(req.params.id, function(err, foundCamp){
        if(err){
            console.log(err);
        } else {
            res.render("campgrounds/edit.ejs", {camp: foundCamp});
        }
    });
});

// UPDATE - Retrieve camp and edit it, then redirect to index
app.put("/campgrounds/:id",isLoggedIn, function(req, res){
    Campground.findByIdAndUpdate(req.params.id, req.body.camp, function(err, updatedCamp){
        if(err){
            console.log(err);
            res.redirect("/campgrounds/" + req.params.id);
        } else {
            res.redirect("/campgrounds");
        }
    });
})

// DESTROY - Delete a campground from DB
app.delete("/campgrounds/:id",isLoggedIn, function(req,res){
    Campground.findByIdAndRemove(req.params.id, function(err){
        if(err){
            console.log(err);
        } else {
            res.redirect("/campgrounds");
        }
    });
});

// COMMENTS ROUTES
// ===============

// NEW COMMENT
app.get("/campgrounds/:id/comments/new",isLoggedIn, function(req, res) {
    Campground.findById(req.params.id, function(err, camp){
        if(err){
            console.log(err);
        } else {
            res.render("comments/new.ejs", {camp:camp});
        }
    });
});

// POST COMMENT
app.post("/campgrounds/:id/comments",isLoggedIn, function(req,res){
    Campground.findById(req.params.id, function(err, campground) {
        if(err){
            console.log(err);
            res.redirect("/campgrounds/" + campground._id);
        } else {
            Comment.create(req.body.comment, function(err, commentCreated){
                if(err){
                    console.log(err);
                } else {
                    // Add current user id and username to comment
                    commentCreated.author.id = req.user._id;
                    commentCreated.author.username = req.user.username;
                    commentCreated.save();
                    // Add comment to campground
                    campground.comments.push(commentCreated);
                    campground.save();
                    res.redirect("/campgrounds/" + campground._id);
                }
            });
        }
    })
});

// EDIT COMMENT PAGE
app.get("/campgrounds/:id/comments/:comment_id/edit", checkCommentOwnership,function(req, res) {
    Comment.findById(req.params.comment_id, function(err, comment){
        if(err){
            console.log(err);
        } else {
            res.render("comments/edit.ejs", {campground: req.params.id, comment: comment});
        }
    });
});

// UPDATE COMMENT
app.put("/campgrounds/:id/comments/:comment_id",checkCommentOwnership, function(req,res){
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, comment){
        if(err){
            console.log(err);
        } else {
            res.redirect("/campgrounds/" + req.params.id);
        }
    });
});

// // DELETE COMMENT
app.delete("/campgrounds/:id/comments/:comment_id", checkCommentOwnership, function(req, res){
    Comment.findByIdAndRemove(req.params.comment_id, function(err, camp){
        if(err){
            console.log(err);
        } else {
            res.redirect("/campgrounds/" + req.params.id);
        }
    });
});

// MIDDLEWARE TO CHECK IF A USER IS LOGGED IN
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "Devi effettuare l'accesso.");
    res.redirect("/login");
};

// MIDDLEWARE TO CHECK IF USER IS OWNER OF SOMETHING
function checkCommentOwnership(req,res,next){
    if(req.isAuthenticated()){
        Comment.findById(req.params.comment_id, function(err, foundComment){
            if(err){
                console.log(err);
                res.redirect("back");
            } else {
                if(foundComment.author.id.equals(req.user._id)){
                    next();
                } else {
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "Non puoi modificare il commento di qualcun altro! :(")
        res.redirect("back");
    }
};

app.listen(process.env.PORT, process.env.ID, function(){
    console.log("YelpCamp v3 server has started");
});