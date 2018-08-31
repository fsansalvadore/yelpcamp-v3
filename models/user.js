var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

// USER SCHEMA
var userSchema = new mongoose.Schema({
    username: String,
    password: String
});

// ACTIVATE PassportLocalMongoose METHODS
userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);