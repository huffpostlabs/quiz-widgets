var express 		= require('express'),
	connect			= require('connect'),
	path 			= require('path'),
	http 			= require('http'),
    expressValidator= require('express-validator'),
	MongoStore 		= require('connect-mongo')(express),

    authMiddleware  = require('./middleware/authentication-middleware.js'),
	

	main_routes 	= require('./routes/index'), // this is just like doing: var routes = require('./routes/index.js')
	auth_routes 	= require('./routes/auth'),
	stats_routes 	= require('./routes/stats'),
	api_routes 		= require('./routes/api');






var app 	  			= express(),
	basicAuth 			= authMiddleware.basicAuth;
	verifyUser 			= authMiddleware.verifyUser;
	verifyQuizViewAccess = authMiddleware.verifyQuizViewAccess;

app.configure(function () {
    app.set('port', process.env.WWW_PORT || 8080); // dotcloud doesn't have automatically set env variable for port, but know its on 8080
    app.use(express.logger('dev'));  /* 'default', 'short', 'tiny', 'dev' */
    app.use(connect.urlencoded()),
	app.use(connect.json()),
  	app.use(express.cookieParser()), /* must come before session because sessions use cookies */

	app.use(express.session({
		secret: process.env.SESSION_SECRET,
	    store: new MongoStore({
	    	db: 'admin', // dotcloud having issue authenticating any other db... :-(
	    	url: ((process.env.DOTCLOUD_DB_MONGODB_URL || process.env.LOCAL_MONGODB_URL).split(',')[0])
	    })
	})),
        

    app.use(express.static(path.join(__dirname, '/static')));
    app.use(expressValidator());
});
var server = http.createServer(app);


/* **************  routing **************************** */
auth_routes.registerEndpoints(app); // login/logout/user etc
api_routes.registerEndpoints(app);
stats_routes.registerEndpoints(app);


/* protected with NO auth */
app.get('/forbidden',  			main_routes.serveBase);
app.get('/quiz/public/:quizID', main_routes.servePublicPreview);


/* protected with verifyUser */
app.get('/new', 				verifyUser, main_routes.serveBase);
app.get('/new/:type', 			verifyUser, main_routes.serveBase);


/* protected with verifyQuizViewAccess */
app.get('/edit/:quizID',		verifyQuizViewAccess, main_routes.serveBase);
app.get('/edit/:type/:quizID',	verifyQuizViewAccess, main_routes.serveBase);

app.get('/social/:quizID',  	verifyQuizViewAccess, main_routes.serveBase);


/* protected with basicAuth */
app.get('/', 					basicAuth, main_routes.serveBase);
app.get('/contact',  			basicAuth, main_routes.serveBase);
app.get('/all-quizzes',  		basicAuth, main_routes.serveBase);
app.get('/user/:search',    	basicAuth, main_routes.serveBase);
app.get('/stats/:quizID',		basicAuth, main_routes.serveBase);
app.get('/documentation',		basicAuth, main_routes.serveBase);
app.get('/documentation/:doc',	basicAuth, main_routes.serveBase);


app.get('/err', function(req, res) {
	res.send(500, {'err': "FAKE ERROR"})
});




app.get('/test', main_routes.test);





server.listen(app.get('port'), function () {
    console.log("Express server listening on port " + app.get('port'));
});
