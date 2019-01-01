'use strict';

var express = require('express');
var bodyparser = require('body-parser');
var dns = require('dns');
var autoIncrement = require('mongoose-auto-increment');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var connection = mongoose.createConnection(process.env.MONGO_URI);

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

autoIncrement.initialize(connection);

var urlSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true
  },
  short_url: {
    type: Number,
    required: true
  }
});

urlSchema.plugin(autoIncrement.plugin, {model: 'URL', field: 'short_url'});
var URL = connection.model('URL', urlSchema);

app.use(cors());
/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyparser());
app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

//URL shortener microservice API endpoint...
app.get("/api/shorturl/:url", function(req, res, next) {
  var userUrl = req.params.url;
  URL.findOne({'short_url': userUrl}, function(err, data) {
    if(err) {
      return next(err);
    }
    if(data) {
      let urlString = 'https://' + data.original_url;
      res.redirect(urlString);
    }
    else {
      res.json({error: 'Short URL does not exist'});
    }
  });
});
app.post("/api/shorturl/new", function(req, res, next){
  let thisUrl = req.body.url;
  let trimmedUrl = thisUrl.replace(/(^\w+:|^)\/\//, '');
  
  dns.lookup(trimmedUrl, function(err, address) {
    //Check if the url entered exists on the web
    if(err === null) {
      //Check if url already exists in the database
      URL.findOne({'original_url': trimmedUrl}, function(err, data) {
        if(err) {
          return next(err);
        }
        //URL found in database so record is retrieved and rendered
        if(data) {
          res.json({original_url: data.original_url, short_url: data.short_url});
        }
        else {
          //URL doesn't exist in the database so it's saved and then rendered
          let validUrl = new URL({original_url: trimmedUrl});
          validUrl.save(function(err, data){
            if(err) {
              return next(err);
            }
            res.json({original_url: data.original_url, short_url: data.short_url});
          });
        }
      });
    }
  });
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});