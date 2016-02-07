var env = require("../env.js");

var setUp = function() {
  var GitHubApi = require("github");
  var github = new GitHubApi({
    version: "3.0.0",
    protocol: "https",
    host: "api.github.com",
    pathPrefix: "",
    timeout: 5000, // responses will time out after this many milliseconds
    headers: {
    }
  });
  // change this to start with
  github.authenticate({
    type: "basic",
    username: env.username,
    password: env.password
});
  console.log(`Logged in to Github!`)
  return github;
}

var checkGHUser = function (github, user) {
  return new Promise((resolve, reject) => {
    github.repos.getFromUser({
      user:user,
      per_page:1
    }, (err,result) => {
      if (err) {
        console.log("User name not valid.");
        reject({exists: false});
      }else {
        console.log("User exists, found profile.")
        resolve({exists: true});
      }
    });
  });
}

var getRepoNames = function (user, github) {
  return new Promise((resolve, reject) => {
    console.log("Getting repo names...")
    var names = []; // array to store names of repos as strings
    github.repos.getFromUser({
      user: user, // user we want to search for
      sort: "updated", // order by most recently updated
      per_page: 100, // number of repos we want to see (100 max)
    }, (err, res) => {
      if (err){
        console.log(`ERROR @repo-name: ${err}`)
        reject(err);
      } else {
        for (var h=0; h < res.length; h++){
          names.push(res[h].name); // construct the array of repo names
        }
      }
      console.log(`Found ${names.length} repos for user ${user}:
        ${names}`);
      resolve(names);
    });
  });
}


var filterRepos = function (user, github, names) {
  return new Promise((resolve, reject) => {
    console.log("Checking authorship of user per repo...")
    var counter = 0;
    var originalNumRepos = names.length;
    var removeIndices = [];
    // console.log(this.names);
    names.forEach((repoName, index) => {
      github.repos.getContributors({
        user: user,
        per_page: 100,
        repo: repoName
      }, (err, res) => {
        var keepRepo = false;
        if (err) {
          console.log(`Error checking contributors: ${err}`);
          reject(err);
        } else if (res) {
          for (var i=0; i<res.length; i++){
            if (res[i].login) {
              if (res[i].login == user) {
                keepRepo = true;
                break;
              }
            }
          }
          if (!keepRepo) {
            removeIndices.push(index)
          }
          if (++counter == originalNumRepos-1){
            for (var j=0; j<removeIndices.length; j++){
              names.splice(removeIndices[j], 1);
            }
            console.log(`Disregarding ${originalNumRepos-(names.length)} repos because ${user} is not a contributor`)
            resolve(names);
          }
        }
      })
    })
  })
}

var test = function(){
  var github = setUp();
  checkGHUser(github, "solowt");
  getRepoNames("solowt", github).then(function(names){
    filterRepos("solowt", github, names);
  })
}

module.exports = {
  setUp: setUp,
  checkGHUser: checkGHUser,
  getRepoNames: getRepoNames,
  test: test,
  filterRepos: filterRepos
}
