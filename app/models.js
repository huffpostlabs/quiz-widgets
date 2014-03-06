
var mongooseConfig = {
	url: process.env.DOTCLOUD_DB_MONGODB_URL || process.env.LOCAL_MONGODB_URL,
	login: process.env.DOTCLOUD_DB_MONGODB_LOGIN || null,
	pass: process.env.DOTCLOUD_DB_MONGODB_PASSWORD || null
};

var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	ObjectId = Schema.ObjectId;

mongoose.connect(mongooseConfig.url);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'mongoose database connection error:'));
db.once('open', function callback () {
  console.log('mongoose database open... YAY');
});





var userSchema = new Schema({
	twitter_id: 	String,
	twitter_name: 	String,
	date_created: 	{ type: Date, default: Date.now },
	quizList: 		[{ type: ObjectId, ref: 'Quiz' }] // need to push quiz on to user upon quiz creation)
});
var shareSchema = new Schema({
	/* The share model is either owned by a Quiz or an Outcome, since both are sharable */
	_quiz: 				{type: ObjectId, ref: 'Quiz', default: null},
	_outcome: 			{type: ObjectId, ref: 'Outcome', default: null}, 
	caption: 			{type: String, default: null},
	pic_url: 			{type: String, default: null},
	description:  		{type: String, default: null},
	link: 		 		{type: String, default: null},
	/* for stats */
	fbCount: 			{type: Number, default: 0},
	twitterCount: 		{type: Number, default: 0},
})
var quizSchema = new Schema({
	_user: 		  		{type: ObjectId, ref: 'User', default: null},
	title: 		  		{type: String, default: null},
	pic_url: 	  		{type: String, default: null},
	pic_credit: 		{type: String, default: null},
	date_created: 		{ type: Date, default: Date.now },
	questionList: 		[{ type: ObjectId, ref: 'Question' }],
	outcomeList:  		[{ type: ObjectId, ref: 'Outcome' }],
	share: 				{type: ObjectId, ref: 'Share', default: null},
	refresh_icon_url: 	{type: String, default: null},
	
	startedCount: 		{ type: Number, default: 0},
	completedCount: 	{ type: Number, default: 0},

});
var questionSchema = new Schema({
	_quiz: 		 {type: ObjectId, ref: 'Quiz'},
	index: 		 Number, // questions are ordered
	text:  		 String,
	/* list of answers -- keeping answer1 and answer2 fields for backwards compatibility */
	answer1: 	 { type: ObjectId, ref: 'Answer'},
	answer2: 	 { type: ObjectId, ref: 'Answer'},
	answerList:  [{type: ObjectId, ref: 'Answer'}],
});
var outcomeSchema = new Schema({
	_quiz:  	 {type: ObjectId, ref: 'Quiz'},
	share: 		 {type: ObjectId, ref: 'Share', default: null},
	index: 		 Number, // ordered
	text:   	 String,
	pic_url: 	 {type: String, default: null},
	pic_credit:  {type: String, default: null},
	count:  	 { type: Number, default: 0}, // number of times its been the outcome
});
var answerSchema = new Schema({
	_question:  	{type: ObjectId, ref: 'Question'},
	_outcome: 		{type: ObjectId, ref: 'Outcome'}, // the outcome it adds a point to if selected
	index: 		 	Number, // ordered
	text:   		String,
	pic_url: 		{type: String, default: null},
	pic_style: 		{type: String, default: "bottom-right"}, // options: 'bottom-right', 'cover'
	pic_credit: 	{type: String, default: null},
	count:  		{ type: Number, default: 0}, // number of times it's been picked
});

exports.User 	 = User  	= mongoose.model('User', userSchema);
exports.Quiz 	 = Quiz 	= mongoose.model('Quiz', quizSchema);
exports.Share 	 = Share 	= mongoose.model('Share', shareSchema);
exports.Answer   = Answer 	= mongoose.model('Answer', answerSchema);
exports.Question = Question = mongoose.model('Question', questionSchema);
exports.Outcome  = Outcome  = mongoose.model('Outcome', outcomeSchema);


var newAnswer = function(answerData, question, outcomeDict) {
	var answer = new Answer({
		_question:  question,
		_outcome: 	outcomeDict[answerData.outcome.index], // the outcome it adds a point to if selected
		index: 		(answerData.index),
		text:   	answerData.text,
		pic_url: 	(answerData.pic_url   || null),
		pic_credit: (answerData.pic_credit|| null),
		pic_style:  (answerData.pic_style || "bottom-right"),
	});
	return answer;
}
exports.newShare = function(quiz, outcome, shareData, callback) { // callback: function(err, data)
	/* a share is owned by either a quiz or an outcome.  so either quiz or outcome is null */
	var share = new Share({
		_quiz: 		quiz,
		_outcome: 	outcome,
		caption: 	(shareData.caption 		|| null),
		description:(shareData.description  || null),
		pic_url: 	(shareData.pic_url 		|| null),
		link:  		(shareData.link 		|| null),
	});
	share.save(function(err) {
		if (err) { return callback(err, null); }
		callback(null, share);
	});
}

exports.newQuiz = function(quizData, callback) { // callback: function(err, data)
	
	// TODO: better error checking
	if (!quizData.title.length) { callback('Invalid Quiz Title', null); }
	if (!quizData.questionList.length) { callback('Invalid Quiz Question List', null); }
	if (!quizData.outcomeList.length) { callback('Invalid Quiz Outcome List', null); }

	/* Create new quiz.  
		Then create Outcomes and push on outcomes.
		Then for each question: create question, create answers
					--> push answers on to questions
				push questions on to quiz
	*/
	var newQuiz = new Quiz({
		//_user: ?
		title: 				quizData.title,
		pic_url: 			(quizData.pic_url 	 		|| null),
		pic_credit: 		(quizData.pic_credit 		|| null),
		refresh_icon_url: 	(quizData.refresh_icon_url 	|| null),
	});
	var newShare = new Share({_quiz: newQuiz});
	newShare.save();
	newQuiz.share = newShare;

	var outcomeDict = {}; // maps {index: outcome} since answerData just has the index
	for (var i=0; i<quizData.outcomeList.length; i++) {
		var outcomeData = quizData.outcomeList[i];
		var newOutcome = new Outcome({
			_quiz:  	 newQuiz,
			index: 		 outcomeData.index, // ordered
			text:   	 outcomeData.text,
			pic_url: 	 (outcomeData.pic_url 	 || null),
			pic_credit:  (outcomeData.pic_credit || null),
		});
		outcomeDict[outcomeData.index] = newOutcome;
		newQuiz.outcomeList.push(newOutcome);

		var newOutcomeShare = new Share({_outcome: newOutcome});
		newOutcomeShare.save();
		newOutcome.share = newOutcomeShare;
		newOutcome.save();
	}
	for (var i=0; i<quizData.questionList.length; i++) {
		var questionData = quizData.questionList[i];
		var newQuestion = new Question({
			_quiz:  	 newQuiz,
			index: 		 questionData.index, // ordered
			text:   	 questionData.text,
		});
		console.log('questionData', i, questionData,'\n\nnewQuestion:\n', newQuestion)

		for (var j=0; j<questionData.answerList.length; j++) {
			console.log('\bquestionData.answerList', j, '\n', questionData.answerList[j])
			var answerData = questionData.answerList[j];
			var newA = newAnswer(answerData, newQuestion, outcomeDict);
			newA.save();
			newQuestion.answerList.push(newA);
		}

		newQuestion.save(function(err) {
			// for (var j=0; j<questionData.answerList.length; j++) {
			// 	console.log('\bquestionData.answerList', j, '\n', questionData.answerList[j])
			// 	var answerData = questionData.answerData[j];
			// 	var newA = newAnswer(answerData, newQuestion, outcomeDict);
			// 	newA.save();
			// 	newQuestion.answerList.push(newA);
			// }
		console.log('\nnewQuestion after saving with answers:\n', newQuestion)
		});


		newQuestion.save();
		newQuiz.questionList.push(newQuestion);
	}
	console.log('\n\n***************\nnewQuiz', newQuiz)
	newQuiz.save(function(err) {
		if (err) { return callback(err, null); }
		callback(null, newQuiz)
	});
}
exports.findQuizPartial = function(quizID, callback) {
	/* I don't care about populating -- return just quiz */
	Quiz.findById(quizID).exec(function (err, data) {
		if (err || !data) { return callback(new Error('Error in models.findQuizPartial'), null); }
		
		callback(null, data);
	});
}
exports.findQuiz = function(quizID, callback) {
	/* get FULLY POPULATED quiz 

		- Tricky situation: 
			a quiz has a questionList.  
			Each question in the questionList has an answerList
			Cannot populate both the questionList and each answerList all at once

		- Work around below:
			after populating the questionList, populate each answerList in a for loop
			only return the Quiz object once all populate calls have been executed
	*/
	var numCalled = 0; // tally up the number of mongo functions we're waiting on before can call callback
	var totalCalls = 0; // +1 for each question in questionList and quiz.outcomeList.share
	/* complete callback when all calls have executed OR when there is an error */
	var call = function(err, data) {
		numCalled += 1;
		if ((numCalled >= totalCalls) || err) {
			callback(err, data);
		}
	}

	Quiz.findById(quizID)
		.populate('questionList')
		.populate('outcomeList')
		.populate('share')
		.exec(function(err, quiz) {
			if (err || !quiz) { return callback(new Error('Error in models.findQuiz'), null); }
			
			totalCalls += 1;
			Quiz.populate(quiz, { path: 'outcomeList.share', model: 'Share' }, function(err, data) {
				call(err, quiz);
			});
			
			for (var i=0; i<quiz.questionList.length; i++) {
				 /* i set outside the scope of this iteration in loop 
				 	-- but I want the index for when I push on to questionList when populate fully executed 
					TODO: take out once data migration complete, right?
				 */
				var index = i;

				totalCalls += 1;
				var options = [{ /* support backwards compatibility with answer1 and answer2... */
					path: 'answer1', /* TODO: take out once data migration complete */
					model: 'Answer'
				},{
					path: 'answer2', /* TODO: take out once data migration complete */
					model: 'Answer'
				},{
					path: 'answerList',
					model: 'Answer'
				}];			
				Question.populate(quiz.questionList[index], options, function(err, question) {
					/* start the data migration 
						-- once this is called once for each I can get rid of handling answer1 and answer2 and take out of schema */
					if (question.answer1) {  /* TODO: take out once data migration complete */
						quiz.questionList[index].answerList.push(question.answer1);
						quiz.questionList[index].answer1 = null;
					}
					if (question.answer2) { /* TODO: take out once data migration complete */
						quiz.questionList[index].answerList.push(question.answer2);
						quiz.questionList[index].answer2 = null;
					}
					quiz.questionList[index].save(); /* TODO: take out once data migration complete */
					quiz.save(); /* TODO: take out once data migration complete */
					call(err, quiz); 
				});
			}
	});
}
exports.findQuestion = function(questionID, callback) {
	Question.findById(questionID)
		.populate('answerList')
		.exec(function(err, question) {
			if (err || !question) { return callback(new Error('Error in models.findQuestion'), null); }
			callback(null, question);
		});
}
exports.findOutcome = function(outcomeID, callback) {
	Outcome.findById(outcomeID)
		.populate('share')
		.exec(function(err, outcome) {
			if (err || !outcome) { return callback(new Error('Error in models.findOutcome'), null); }
			callback(null, outcome);
		});
}
exports.findAnswer = function(answerID, callback) {
	Answer.findById(answerID)
		.exec(function(err, answer) {
			if (err || !answer) { return callback(new Error('Error in models.findAnswer'), null); }
			callback(null, answer);
		});
}
exports.findShare = function(shareID, callback) {
	Share.findById(shareID)
		.exec(function(err, share) {
			if (err || !share) { return callback(new Error('Error in models.findShare'), null); }
			callback(null, share);
		});
}		


exports.allUsers = function(callback){
	User.find()
		.populate('quizList')
		.exec(callback);
};
exports.allQuizes = function(callback){
	Quiz.find()
		.populate('questionList')
		.populate('outcomeList')
		.exec(callback);
};
exports.allQuestions = function(callback){
	Question.find()
		.populate('answer1')
		.populate('answer2')
		.populate('answerList')
		.exec(callback);
};
exports.allOutcomes = function(callback){
	Outcome.find().exec(callback);
};
exports.allAnswers = function(callback){
	Answer.find().exec(callback);
};





