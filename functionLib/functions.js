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
      console.log(`Found ${names.length} repos for user ${user}:`);
      console.log(`${names}`);
      resolve({repoNames: names, user: user, github: github});
    });
  });
}


var filterRepos = function (data) {
  return new Promise((resolve, reject) => {
    console.log("Checking authorship of user per repo...")
    var repoNames = data.repoNames;
    var counter = 0;
    var originalNumRepos = repoNames.length;
    var removeIndices = [];
    // console.log(this.names);
    repoNames.forEach((repoName, index) => {
      data.github.repos.getContributors({
        user: data.user,
        per_page: 100,
        repo: repoName
      }, (err, res) => {
        var keepRepo = false;
        if (err) {
          console.log(`Error checking contributors: ${err}`);
        } else if (res) {
          for (var i=0; i<res.length; i++){
            if (res[i].login) {
              if (res[i].login == data.user) {
                keepRepo = true;
                break;
              }
            }
          }
          if (!keepRepo) {
            removeIndices.push(index)
          }
          if (++counter === originalNumRepos-1){
            for (var j=0; j<removeIndices.length; j++){
              repoNames.splice(removeIndices[j], 1);
            }
            console.log(`Disregarding ${originalNumRepos-(repoNames.length)} repos because ${data.user} is not a contributor.`);
            console.log(`Remaining repos: ${repoNames}`);
            resolve({repoNames:repoNames, user: data.user, github: data.github});
          }
        }
      })
    })
  })
}

var getCommitMessages = function (data){
  return new Promise((resolve, reject) => {
    console.log("Getting Commit Messages...")
    var callsDone = 0; // count calls done so we know when all calls have returned from github
    var nameMsgMap = {}; // object that will store the repo names as keys and the commit messages as values
    var repoNames = data.repoNames;
    repoNames.forEach((repoName, index) => {
      data.github.repos.getCommits({
        user: data.user,
        repo: repoName,
        per_page: 100
      }, (error, response) => {
        if (error) {
          console.log(`ERROR in GH CALL @${repoName}: ${error}`);
        } else if (response) {
          console.log(`Messages from @${repoName} retrieved! (${callsDone+1})`);
          var msgs = []; // array to hold every message on a given repo
          // make sure the user in question is the author of the commit
          for (var a = 0; a < response.length; a++){
            if (response[a]['committer'] && response[a]['committer']['login'] === data.user) {
              msgs.push(response[a]['commit']['message']) // add message onto the array
            }
          }
          nameMsgMap[repoNames[index].replace(/\./g,' ')] = msgs; // construct the object so the key is the repo and the value is the array of commit messages
        }
        if (++callsDone === repoNames.length){ // check to see if we've done the total number of calls.  if we have, the number of calls will equal the number of repos
          console.log("Got Commit Messages."); // success message
          resolve({repoNames:repoNames, user:data.user, github:data.github, nameMsgMap: nameMsgMap});
        }
      })
    })
  })
}

var getLangs = function(data){
  return new Promise(function(resolve, reject){
    console.log("Getting Languages...")
    var calls = 0;
    var nameLangMap = {};
    var repoNames = data.repoNames;
    repoNames.forEach((repoName, index) => {
      data.github.repos.getLanguages({
        user: data.user,
        repo: repoName,
        per_page: 100
      }, (error, response) => {
        if (error) {
          console.log(`ERROR in GH CALL @${repoName}: ${error}`);
        } else if (response) {
          console.log(`Languages from @${repoName} retrieved! (${calls+1})`); // success message
          nameLangMap[repoNames[index].replace(/\./g,' ')] = response; // constructing the object
        }
        if (++calls === repoNames.length){ // check to see if all calls have returned
          console.log("Got Languages.") // success message
          resolve({user:user, github:github, nameLangMap:nameLangMap, repoNames:repoNames})
        }
      })
    })
  })
}

var parseLangs = function (allLangs) {
  var langStats = {};
    for (var key1 in allLangs) {
      for (var key2 in allLangs[key1]) {
        if (key2 != 'meta') {
          if (langStats.hasOwnProperty(key2)) {
            langStats[key2]+=allLangs[key1][key2];
          } else {
            langStats[key2]=allLangs[key1][key2];
          }
        }
      }
    }
  return langStats;
}

var langAverages = function(langStats){
  var langAverages = {};
  var sum = 0
    for (var key1 in langStats){
      sum += langStats[key1]
    }
    for (var lang in langStats) {
      langAverages[lang]=langStats[lang]/sum
    }
  return langAverages;
}

var msgAverages = function (messages){
  var averageLength = 0;
  var numMessages = 0;
  var totalLength = 0;
  for (var key in messages){
    for (var i = 0; i < messages[key].length; i++){
      totalLength += messages[key][i].length
      numMessages++;
    }
  }
  averageLength = totalLength/numMessages;
  return averageLength;
}


var test = function(){
  var github = setUp();
  checkGHUser(github, "solowt");
  getRepoNames("solowt", github).then(filterRepos).then(getCommitMessages);
}

module.exports = {
  setUp: setUp,
  checkGHUser: checkGHUser,
  getRepoNames: getRepoNames,
  test: test,
  filterRepos: filterRepos,
  getCommitMessages: getCommitMessages
}
