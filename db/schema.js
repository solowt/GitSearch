var mongoose = require('mongoose');

var Schema = mongoose.Schema;


var RepoSchema = new Schema({
  createdAt: Date,
  languages: Object,
  averageMsgLength: Number,
  commitMessages: Object,
  langTotals: Object,
  langAverages: Object,
  lastUpdated: Date
});

var ProfileSchema = new Schema({
  createdAt: Date,
  username: String,
  fullname: String,
  stars: Number,
  location: String,
  repos: [RepoSchema]
});

mongoose.model("Profile", ProfileSchema);
mongoose.model("Repo", RepoSchema);
