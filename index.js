var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var functions = require('./functionLib/functions.js');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(methodOverride('_method'));
app.use(express.static(__dirname + '/public'));


app.get('/', (req, res) => {
  res.send("<h1>Hi</h1>")
});

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
