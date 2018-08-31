var mongoose = require("mongoose");

// SCHEMA
var campSchema = new mongoose.Schema({
    name: String,
    img: String,
    info: String,
    comments: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Comment"
            }
        ]
});

// MODEL
module.exports = mongoose.model("Campground", campSchema);