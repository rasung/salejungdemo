var express = require('express');
var request = require('request');
var querystring = require('querystring');
var pg = require('pg');
var bodyParser = require('body-parser');
var redis   = require("redis");
var session = require('express-session');
var redisStore = require('connect-redis')(session);
var client  = redis.createClient(process.env.REDIS_URL);
var app = express();

pg.defaults.ssl = true; // pg.defaults.ssl must be done before any connection to the database is created.
pg.connect(process.env.DATABASE_URL, function(err, client) {
  if (err) throw err;
  console.log('Connected to postgres! Getting schemas...');
  console.log(2222);
  client.query("INSERT INTO salejung.item(userID, shopname, title, pre_price, post_price, detail, latitude, longitude) VALUES ('fb_123', '세일중', '테스트입니다', 12345, 12345, '테스트', 23.2342334, -23.23523523);"
  , function (err, result) {
      if (err) {
        // pass the error to the express error handler
        console.log(err);
      }
      console.log(result);
  });
});
app.set('port', (process.env.PORT || 5000));
app.set('trust proxy', 1); // heroku has proxy. So, if cookie secure is true option, need this code.

app.use(express.static(__dirname + '/public'));
app.use(session({
  secret: 'keyboard cat',
  store: new redisStore({client : client, ttl : 30}),
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true } // if cookie secure is true, trust proxy needs.
}));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function (request, response) {
  response.render('pages/index');
});

app.get('/register', function (request, response) {
  if(request.session.key) {
    response.redirect('/location');
  }
  else {
    response.redirect('/login');
  }
});

app.get('/location', function (request, response) {
  if(request.session.key) {
    response.render('pages/location');
  }
  else {
    response.redirect('/login');
  }
});

app.get('/admin',function (request,response){
  if(request.session.key) {
    console.log(request.session.key);
    response.write('<h1>Hello '+ request.session.key.userID +'</h1>');
    response.end('<a href="+">Logout</a>');
  } else {
    response.write('<h1>Please login first.</h1>');
    response.end('<a href="+">Login</a>');
  }
});

app.post('/login',function (req,res){
  //페이스북일때
  if(req.body.apihost === "facebook") {
    request({
      method: 'get',
      json: true, // Use,If you are sending JSON data
      url: 'https://graph.facebook.com/' + req.body.userID + '?access_token=' + req.body.accessToken,
    }, function (error, response, body) {
      if (error) {
        console.log('Error :', error);
        return;
      }
      if (body.id === req.body.userID) {
        req.session.key = req.body;
        res.end('done');
      }
    });
  }

  //카카오일때
  else if(req.body.apihost === "kakao") {
    request({
      method: 'get',
      json: true, // Use,If you are sending JSON data
      url: 'https://kapi.kakao.com/v1/user/me',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        'Authorization' : 'Bearer ' + req.body.accessToken
      }
    }, function (error, response, body) {
      if (error) {
        console.log('Error :', error);
        return;
      }
      if (body.id === Number(req.body.userID)) {
        req.session.key = req.body;
        res.end('done');
      }
    });
  }
});

app.get('/login', function (request, response) {
  response.render('pages/login');
});

app.get('/logout', function (request, response) {
  request.session.destroy(function(err) {
    // cannot access session here
    if(err){
      console.log(err);
    } else {
      response.redirect('/');
    }
  });
});


app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


/*------------------- functions ---------------------*/
