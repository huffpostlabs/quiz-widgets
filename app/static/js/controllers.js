
function MainCntl($scope, $location) {
	$scope.domain = window.location.origin;
	if ($scope.domain == 'http://quizwidget-petri.dotcloud.com'){
		$scope.domain = 'http://quiz.huffingtonpost.com';
	}

	$scope.user = null;


	$scope.newPage = function(){
		$location.path('/new');
	}
	$scope.goTo = function(url) {
		window.location.href=url;
	}
	$scope.login = function(){
		window.location.href=($scope.domain + '/auth/twitter');
	}
	$scope.logout = function(){
		window.location.href=($scope.domain + '/logout');
	}
}

function IndexCntl($scope, HTTPService, quizList) {
	$scope.quizList = quizList;


	var init = function() {
		console.log('IndexCntl', quizList)
	}
	init();
}
function QuizCntl($scope, $location, HTTPService, quiz) {
	$scope.quiz = quiz;
	$scope.totalSharesFB;
	$scope.totalSharesTwitter;
		console.log('QuizCntl', quiz)

	$scope.delete = function() {
		var confirmed = confirm('Are you sure you want to permenantly delete this quiz?  This quiz will no longer show up on any of the pages on which it is embedded.');
		if (!confirmed){ return false; }
		
		HTTPService.DELETE('/api/quiz/' + quiz._id, $scope.quiz).then(function(data) {
			console.log('delete returned: ', data);
			$location.path('/');
		});
	}
	var countTotalSharesFB = function(quiz) {
		var count = (quiz.share ? quiz.share.fbCount : 0);
		for (var i=0; i<quiz.outcomeList.length; i++) {
			var o = quiz.outcomeList[i];
			count += (o.share ? o.share.fbCount : 0);
		}
		return count;
	}
	var countTotalSharesTwitter = function(quiz) {
		var count = (quiz.share ? quiz.share.twitterCount : 0);
		for (var i=0; i<quiz.outcomeList.length; i++) {
			var o = quiz.outcomeList[i];
			count += (o.share ? o.share.twitterCount : 0);
		}
		return count;
	}

	var init = function() {
		console.log('QuizCntl', quiz)
		$scope.totalSharesFB = countTotalSharesFB(quiz);
		$scope.totalSharesTwitter = countTotalSharesTwitter(quiz);
	}
	init();
}
function ShareCntl($scope, UIService, FormService, HTTPService, quiz) {
	$scope.quiz = quiz;
	$scope.quiz.share = (quiz.share || {});
	$scope.shareLinkSaved = false;

	for (var i=0; i<quiz.outcomeList.length; i++) {
		console.log($scope.quiz.outcomeList[i])
		$scope.quiz.outcomeList[i].share = (quiz.outcomeList[i].share || {});
	}

	$scope.saveOutcomeShare = function(outcome) {
		HTTPService.PUT('/api/outcome/' + outcome._id + '/share', outcome.share).then(function(data) {
			console.log('data', data);
		});
	}
	var saveQuizShare = function(callback) {
		HTTPService.PUT('/api/quiz/' + $scope.quiz._id + '/share', $scope.quiz.share).then(function(data) {
			console.log('data', data);
			if (callback) { callback(data); }
		});
	}
	$scope.saveQuizShareLink = function(link) {
		$scope.quiz.share.link = link;
		saveQuizShare(function() {
			$scope.shareLinkSaved = true;
		});
	}
	$scope.saveQuizShare = function() { saveQuizShare(); }

	var init = function() {
		console.log('QuizCntl', quiz)
		UIService.setupPopovers();
	}
	init();
}
function NewQuizCntl($scope, $location, UIService, FormService, HTTPService) {
	$scope.showAddNewOutcome = false;


	$scope.quiz = { 'title': '',
					'outcomeList': [], // each outcome in outcomeList has an answerList []
					'questionList': [], // each question in questionList has an answerList []
					};


	$scope.updateQuizPic = function() {
		UIService.updateQuizPic($scope.quiz.pic_url);
	}
	$scope.addNewOutcome = function(new_outcome) {
		/* validate form */
		FormService.removeAllErrors();
		var err1 = FormService.checkInput(['new-outcome-text']);
		if (err1) {
			return false;
		}
		$scope.showAddNewOutcome = false;

		new_outcome['index'] = $scope.quiz.outcomeList.length + 1;
		new_outcome['answerList'] = []; // list of answers that point to it -- prevent removing outcomes on /new page with non-empty answers list
		$scope.quiz.outcomeList.push(new_outcome);

		$scope.new_outcome = {};
	}
	$scope.removeOutcome = function(outcome) {
		if (outcome.answerList.length > 0) { return false; } // an answer points to it!

		$scope.quiz.outcomeList.splice(outcome.index-1, 1); // outcome.index is not zero-indexed
		/* decrement the index of all the outcomes that followed */
		for (var i=outcome.index-1; i<$scope.quiz.outcomeList.length; i++) {
			$scope.quiz.outcomeList[i].index = i + 1;
		}
	}
	$scope.removeNewAnswer = function(index) {
		$scope.new_question.answerList.splice(index-1, 1);
		for (var i=index-1; i<$scope.new_question.answerList.length; i++) {
			$scope.new_question.answerList[i].index = i + 1;
		}
	}
	$scope.removeQuestion = function(question) {
		$scope.quiz.questionList.splice(question.index-1, 1); // question.index is not zero-indexed
		
		/* decrement the index of all the outcomes that followed */
		for (var i=question.index-1; i<$scope.quiz.questionList.length; i++) {
			$scope.quiz.questionList[i].index = i + 1;
		}
		/* take all that question's answers out of their respective outcome.answerList's */
		for (var i=0; i<question.answerList.length; i++) {
			var answer = question.answerList[i];
			var j = answer._outcome.answerList.indexOf(answer);
			$scope.quiz.outcomeList[answer._outcome.index-1].answerList.splice(j, 1);
		}
	}
	$scope.addNewQuestion = function(new_question) {
		FormService.removeAllErrors();
		var err = FormService.checkInput([ 'new-question-text' ]);

		for (var i=0; i<new_question.answerList.length; i++) {
			var model = ($scope.new_question.answerList[i]._outcome || null);
			if ($scope.quiz.outcomeList.indexOf(model) < 0) { /* checks edge case: outcome was deleted while selected -- answer points to an outcome no longer in outcomeList */ 
				model = null;
			}
			if (FormService.checkModel([ {'model':model,'elementID':'new-answer-' + (i+1) + '-outcome'}])) {
				err = true;
			}
		}
		if (err) { return false; }

		$scope.showAddNewQuestion = false;

		new_question['index'] = $scope.quiz.questionList.length + 1;
		$scope.quiz.questionList.push(new_question);

		/* add each of the questions to the answerList of the outcome they point to */
		for (var i=0; i<new_question.answerList.length; i++) {
			var answer = new_question.answerList[i];
			answer._outcome.answerList.push(answer);
		}
	}
	$scope.createQuiz = function() {
		console.log('createQuiz', $scope.quiz)
		/* get rid of the circular json -- take out outcome.answerList's */
		for (var i=0; i<$scope.quiz.outcomeList.length; i++) {
			$scope.quiz.outcomeList[i].answerList = null;
		}

		HTTPService.POST('/api/quiz', $scope.quiz).then(function(data) {
			console.log('data', data)
			$location.path('/quiz/' + data._id);
		});
	};


	var init = function() {
		UIService.setupPopovers();
		console.log('NewCntl')
	}
	init();
}
function EditCntl($scope, $location, FormService, HTTPService, UIService, WidgetService, quiz) {
	$scope.quiz = quiz;

	/* outcomeMap: {outcomeID: outcome} 
		-- outcomeList morphed into this object for easier use with answers
		each outcome has an answerList so that don't remove objects that answers point to
	
	*/
	$scope.outcomeMap;
	$scope.viewMobile = true;

	var setWatchers = function() {
		function changeFunction(object, callback) {
			return function(oldv, newv) {
				if (oldv != newv) { 
					object.saved = 'unsaved';
					if (callback) { callback(); }
				}
			}
		}
		var attributes = ['title', 'pic_url', 'pic_credit', 'refresh_icon_url'];
		for (var i=0; i<attributes.length; i++) {
			$scope.$watch(
				'quiz.' + attributes[i],
				changeFunction($scope.quiz)
			);
		}
		$scope.$watch(
			'quiz.pic_url',
			function() { UIService.updateQuizPic($scope.quiz.pic_url); }
		);
	}

	var reloadQuiz = function() {
		/* reloads widget, reloads $scope.quiz */
		HTTPService.GETquiz($scope.quiz._id).then(function(data) {
			reloadWidget(data);
			$scope.quiz = data;
			WidgetService.setupOutcomeAnswerLists($scope.quiz);
			setWatchers();
		});
	}
	$scope.reloadQuiz = reloadQuiz;
	/* sometimes want to reload just widget so that .saved properties dont change */
	var reloadWidget = function(data) {
		console.log('reloadWidget')
		quizWidgets[$scope.quiz._id].reloadData(data || $scope.quiz);
	}

	/* helper functions to remove, update, create for resolving promise */
	var APIsuccess = function(object, callback) {
		return function(successData) {
			object.editing = false;
			object.saved = 'saved';
			reloadWidget();
			if (callback) { callback(successData); }
		};
	}
	var APIerror = function(object) {
		/* yes its simple but make error handling always the same -- so call this helper to generate function */
		return function(err) { object.saved = 'error'; };
	}

	/* remove ------------------------------------------------- */

	$scope.removeOutcome = function(outcome) {
		if (outcome.answerList && outcome.answerList.length > 0) { return false; } // an answer points to it!
		
		/* remove from the outcomeList */
		var index = $scope.quiz.outcomeList.indexOf(outcome);

		if (!outcome._id) {
			$scope.quiz.outcomeList.splice(index, 1);
		} else {
			remove('outcome', outcome, function() {
				$scope.quiz.outcomeList.splice(index, 1);
			});
		}
	};
	$scope.removeAnswer = function(question, answer) {
		var index = question.answerList.indexOf(answer);
		if (index < 1) { return false; } // can't remove 1st 2 answers

		/* if answer doesnt have real mongo id then not saved server side */
		if (answer._id) {
			remove('answer', answer, function() {
				question.answerList.splice(index, 1);
				WidgetService.setupOutcomeAnswerLists($scope.quiz);
			});
		} else {
			question.answerList.splice(index, 1);
		}
	}
	$scope.removeQuestion = function(question) {
		var index = $scope.quiz.questionList.indexOf(question);
		if (index < 1) { return false; }

		if (!question._id) {
			$scope.quiz.questionList.splice(index, 1);
		} else {
			remove('question', question, function() {
				$scope.quiz.questionList.splice(index, 1);
				WidgetService.setupOutcomeAnswerLists($scope.quiz);
			});
		}
	}

	var remove = function(type, object, callback) {
		object.saved = 'deleting';
		HTTPService.DELETE('/api/' + type + '/' + object._id, object).then(
			APIsuccess(object, callback), // returns a function
			APIerror(object)
		);
	}

	/* remove above ------------------------------------------- */

	/* addNew == POST request --------------------------------- */
	var create = function(type, object, callback) {
		object.saved = 'saving';
		HTTPService.POST('/api/' + type, object).then(
			APIsuccess(object, callback), // returns a function
			APIerror(object)
		);
	}
	/* addNew == POST requests above ------------------------- */


	/* save == PUT request -----------------------------
		-- each object is given a saved field
			- set to 'saved' on successful PUT
			- set to 'unsaved' on change
			- set to 'saving' on transition
			- set to 'error' on error

		-- after saving: reload widget with new Quiz Data
	*/
	var update = function(type, object, callback) {
		object.saved = 'saving';
		HTTPService.PUT('/api/' + type + '/' + object._id, object).then(
			APIsuccess(object, callback),
			APIerror(object)
		);
	}
	$scope.saveQuiz = function() {
		update('quiz', $scope.quiz, false);
		reloadWidget();
	}

	$scope.saveQuestion = function(question) {
		if (FormService.checkQuestionError(question)) {
			return false;
		}

		var answersCalledback = 0;
		var answerCallback = function() {
			answersCalledback += 1;
			if (answersCalledback == question.answerList.length) {
				WidgetService.setupOutcomeAnswerLists($scope.quiz);
				question.editing = false;
				question.saved = 'saved';
				console.log($scope.quiz);
			}
		}
		var questionCallback = function(questionData) {
			question._id = questionData._id;
			question.editing = true;
			question.saved = 'saving';

			/* save all the answers with returned questionData._id */
			for (var i=0; i<question.answerList.length; i++) {
				var answer = question.answerList[i];
				answer._question = question._id;
				if (!answer._id) {
					var j = i; // i will continue iterating
					create('answer', answer, function(data) {
						question.answerList[j] = data;
						answerCallback();
					});
				} else {
					update('answer', answer, answerCallback);
				}
			}
		}

		if (question._id) {
			update('question', question, questionCallback);
		} else {
			question._quiz = $scope.quiz._id;
			create('question', question, questionCallback);
		}
	}
	$scope.saveOutcome = function(outcome) {
		if (FormService.checkOutcomeError(outcome)) { return false; }

		if (!outcome._id) { /* create new outcome */
			outcome['_quiz'] = $scope.quiz._id;
			create('outcome', outcome, function(data) {
				var index = $scope.quiz.outcomeList.indexOf(outcome);
				$scope.quiz.outcomeList[index] = data; // needs the _id
			});
		} else { /* update existing outcome */
			update('outcome', outcome);
		}
	};
	/* ------- save == PUT requests above ------------- */

	var init = function() {
		UIService.setupPopovers();
		UIService.updateQuizPic($scope.quiz.pic_url);
		WidgetService.setupOutcomeAnswerLists($scope.quiz);
		console.log($scope.quiz)
		setWatchers();
	}
	init();
}








