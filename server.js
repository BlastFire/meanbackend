var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var passport	= require('passport');
var config      = require('./config/database'); // get db config file
var User        = require('./app/models/user'); // get the mongoose model
var port        = process.env.PORT || 8080;
var jwt         = require('jwt-simple');
 
// get our request parameters
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
 
// log to console
app.use(morgan('dev'));
 
// Use the passport package in our application
app.use(passport.initialize());

// Add headers
app.use(function(req, res, next) {
  // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    next();
});
 
// demo Route (GET http://localhost:8080)
app.get('/', function(req, res) {
  res.send('Hello! The API is at http://localhost:' + port + '/api');
});

mongoose.Promise = global.Promise;

// connect to database
mongoose.connect(config.database);
 
// pass passport for configuration
require('./config/passport')(passport);
 
// bundle our routes
var apiRoutes = express.Router();
 
// create a new user account (POST http://localhost:8080/api/signup)
apiRoutes.post('/signup', function(req, res) {
  console.log(req.body.email + " " + req.body.password);
  if (!req.body.email || !req.body.password) {
    res.json({success: false, msg: 'Please pass email and password.'});
  } else {
    var newUser = new User({
      email: req.body.email,
      password: req.body.password
    });

    //check if user exists
    User.findOne({
      'email': req.body.email
    }, function(err, user) {
      if(err) throw err;
      if(!user) {
        // save the user
        newUser.save(function(err) {
          if (err) {
            return res.json({success: false, msg: 'Something went wrong, while saving the user.'});
          }
          res.json({success: true, msg: 'Successful created new user.'});
        });
      } else {
        //found user
        return res.json({success: false, msg: 'Email already exists.'});
      } 

    });
  }
});

// route to authenticate a user (POST http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', function(req, res) {
  User.findOne({
    email: req.body.email
  }, function(err, user) {
    if (err) throw err;
 
    if (!user) {
      res.send({success: false, msg: 'Authentication failed. User not found.'});
    } else {
      // check if password matches
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          // if user is found and password is right create a token
          var token = jwt.encode(user, config.secret);
          // return the information including token as JSON
          res.json({success: true, token: token});
        } else {
          res.send({success: false, msg: 'Authentication failed. Wrong password.'});
        }
      });
    }
  });
});

// route to a restricted info (GET http://localhost:8080/api/memberinfo)
// apiRoutes.get('/memberinfo', passport.authenticate('jwt', { session: false }), function(req, res) {
//   var token = getToken(req.headers);
//   if (token) {
//     var decoded = jwt.decode(token, config.secret);
//     User.findOne({
//       email: decoded.email
//     }, function(err, user) {
//         if (err) throw err;
 
//         if (!user) {
//           return res.status(403).send({success: false, msg: 'Authentication failed. User not found.'});
//         } else {
//           res.json({success: true, msg: 'Welcome in the member area ' + user.email + '!'});
//         }
//     });
//   } else {
//     return res.status(403).send({success: false, msg: 'No token provided.'});
//   }
// });
 
getToken = function (headers) {
  if (headers && headers.authorization) {
    var parted = headers.authorization.split(' ');
    if (parted.length === 2) {
      return parted[1];
    } else {
      return null;
    }
  } else {
    return null;
  }
};
 
// connect the api routes under /api/*
app.use('/api', apiRoutes);
 
// Start the server
app.listen(port);
console.log('There will be dragons: http://localhost:' + port);