require("../schema.js");
var mongoose = require("mongoose");

var RepoModel = mongoose.model("Repo");
module.exports = RepoModel;
