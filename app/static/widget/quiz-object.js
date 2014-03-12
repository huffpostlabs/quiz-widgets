var HuffpostLabsSlidesCntl = function(container) {
    var container = container;
    var slides;
    var currSlideIndex;
    var currSlide;
    var nextSlide;

    var percentToNumber = function(percentString) {
        return percentString.split('%')[0];
    };

    var transitionPrev = function() {
        
        currSlide.style.top = "100%";
        slides[currSlideIndex - 1].style.top = "0%";
        currSlideIndex -= 1;

        currSlide = slides[currSlideIndex];
        nextSlide = slides[currSlideIndex + 1];
    };

    var transitionNext = function() {
        
        currSlide.style.top = "-100%";
        nextSlide.style.top = "0%";
        currSlideIndex += 1;

        currSlide = slides[currSlideIndex];
        nextSlide = slides[currSlideIndex + 1];
    };

    var init = function() {
        slides = container.getElementsByClassName('slide');
        for(var i=0; i<slides.length; i++) {
            slides[i].style.top = '100%';
        }

        currSlideIndex = 0;

        currSlide = slides[currSlideIndex];
        nextSlide = slides[currSlideIndex + 1];
        currSlide.style.top = '0%';
    }
    return { transitionNext: transitionNext, transitionPrev: transitionPrev, init: init };
}

var HuffpostLabsQuizObject = function(container, quizData, mobile, startedCallback, completedCallback) {
    console.log('quizData', quizData)

    var static_domain = "http://quiz.huffingtonpost.com"; // akamai cache


    var container = container;
    var outcomeContent;
    var quizData = quizData;
    var isMobile = mobile;
    var quizID = quizData._id;

    var slidesCntl;
    var btnMaster;

    var questionList;
    var currQuestionIndex;
    var outcomeMap; // {_outcomeID: outcomeObject}
    var leadingOutcome = null;
    var chosenAnswers = [];

    function startQuiz(element) {
        element.onclick = null;
        slidesCntl.transitionNext();
        startedCallback(quizData);
    }
    function previous() { /* inverse of answer */
        slidesCntl.transitionPrev();
        if (chosenAnswers.length) {
            currQuestionIndex -= 1; /* start button doesn't increment it */
            var previousAnswer = chosenAnswers.pop();
            decrementOutcome(previousAnswer._outcome); /* decrement after transition because it is expensive iteration and it doesn't matter if user sees previous slide first */
        }
    }
    function answer(huffpostLabsBtn) { /* the onclick handler is on the huffpostLabsBtn marked with the data-huffpostlabs-btn tag */
        // TODO element.onclick = null;
        var index = huffpostLabsBtn.element.getAttribute('data-quiz-answer');
        var a = questionList[currQuestionIndex].answerList[index];
        chooseAnswer(a);
    }
    function chooseAnswer(answer) {
        chosenAnswers.push(answer);
        incrementOutcome(answer._outcome); /* increment before transition because next slide might be outcome slide */
        currQuestionIndex += 1;
        slidesCntl.transitionNext();

        if (currQuestionIndex == questionList.length) {
            completedCallback(quizData, leadingOutcome, chosenAnswers);
        }
    }
    function incrementOutcome(outcomeID) {
        var o = outcomeMap[outcomeID];
        o.points += 1;
        if (!leadingOutcome || o.points > leadingOutcome.points) {
            leadingOutcome = o;
            updateOutcomeContent(o);
        }
        return leadingOutcome;
    }
    function decrementOutcome(outcomeID) {
        outcomeMap[outcomeID].points -= 1;
        for (var outcomeID in outcomeMap) {
            if (outcomeMap[outcomeID].points > leadingOutcome.points) {
                leadingOutcome = outcomeMap[outcomeID];
            }
        }
    }

    function setupSlides() {
        slidesCntl = new HuffpostLabsSlidesCntl(container);
        slidesCntl.init();
    }
    function createOutcomeMap(outcomeList) {
        map = {};
        for (var i=0; i<outcomeList.length; i++) {
            var o = outcomeList[i];
            o.points = 0;
            map[o._id] = o;
        }
        return map;
    }
    function init(){
        questionList = quizData.questionList;
        currQuestionIndex = 0;
        outcomeMap = createOutcomeMap(quizData.outcomeList);

        container.style.display = 'none';
        buildWidget();
        setupSlides();
        handleMobile();

        container.style.display = 'block';
    }
    function refresh() {
        console.log('refresh')
        leadingOutcome = null;
        chosenAnswers = [];  /* array of answer objects */
        currQuestionIndex = 0;
        outcomeMap = createOutcomeMap(quizData.outcomeList);
        slidesCntl.init();
    }

    function handleMobile() {
        /* turn all elements marked with the data-huffpostlabs-btn tag into HuffpostLabsBtns
            Collecting + converting these btns for given context handled by the HuffpostLabsBtnMaster */
        if (isMobile) {
            container.className += ' mobile';
        }
        btnMaster = new HuffpostLabsBtnMaster(container);
    }
    function buildWidget() {
        /* add background image */
        var newClassName = 'quiz-' + quizID;
        container.className += (' ' + newClassName);
        if (quizData.pic_url) {
            addStyle('.' + newClassName + '::after {background-image: url(' + quizData.pic_url + ');}');
        }

        var html = "";
            html+= "<div class='slides-container'>";
            html+= titleContainerHTML();

            for(var i=0; i<questionList.length; i++) {
                html += questionAnswersContainerHTML(questionList[i]);
            }
            html += outcomeContainerHTML();
            html+= "</div>";

        container.innerHTML = html;
        outcomeContent = container.getElementsByClassName('outcome-content')[0];
    }

    var stylesheet = document.createElement('style');
    document.body.appendChild(stylesheet);
    var addStyle = function(rule) {
        stylesheet.innerHTML += rule;
    }

    function shareQuizFB() {
        fbShareQuiz(quizData);
    }
    function shareOutcomeFB() {
        fbShareOutcome(quizData, leadingOutcome);
    }
    function shareQuizTwitter() {
        twitterShare(quizData);
    }
    function shareOutcomeTwitter() {
        var text = 'I got: ' + leadingOutcome.text + ' -- ' + quizData.title;
        twitterShare(quizData, text);
    }
    function titleContainerHTML() {
        var onclickStart = "quizWidgets['" + quizID + "'].startQuiz(this)";
        var onclickShareFB = "quizWidgets['" + quizID + "'].shareQuizFB()";
        var onclickShareTwitter = "quizWidgets['" + quizID + "'].shareQuizTwitter()";
        
        var html = "<div class='slide title-container'>";
            html+= "    <span class='photo-credit'>" + (quizData.pic_credit || "") + "</span>";
            html+= "    <div class='title-content'>";
            html+= "        <h1 class='title'>" + quizData.title + "</h1>";
            html+= "        <div class='share-container'>";
            html+= "            <div class='fb-share-container'>";
            html+= "                <img width='30px' height='30px' class='share fb-share-btn touchable' data-huffpostlabs-btn onclick=" + onclickShareFB + " src='" + static_domain + "/icon/fb-icon.png'></img>";
            html+= "                <img width='30px' height='30px' class='share fb-share-btn-blue touchable' data-huffpostlabs-btn onclick=" + onclickShareFB + " src='" + static_domain + "/icon/fb-icon-blue.png'></img>";
            html+= "            </div>";
            html+= "            <div class='twitter-share-container'>";
            html+= "                <img width='30px' height='30px' data-huffpostlabs-btn onclick=" + onclickShareTwitter + " class='twitter-share-btn share touchable' src='" + static_domain + "/icon/twitter-icon.png'></img>";
            html+= "                <img width='30px' height='30px' data-huffpostlabs-btn onclick=" + onclickShareTwitter + " class='twitter-share-btn-blue share touchable' src='" + static_domain + "/icon/twitter-icon-blue.png'></img>";
            html+= "            </div>";
            html+= "            <span class='embed-code'>";
            html+= "                <input value='" + static_domain + "' >";
            html+= "                <img src='" + static_domain + "/icon/embed.png'></img>";
            html+= "            </span>";
            html+= "        </div>";
            html+= "        <div class='start-container touchable' data-huffpostlabs-btn onclick=" + onclickStart + ">";
            html+= "            <h2 class='start-text'>START</h2>";
            html+= "        </div>";
            html+= "    </div>";
            html+= " </div>";
        return html;
    }
    /* TODO: TAKE OUT */
    function answerStyleString(answer) {
        var styleString = "";
        if (answer.pic_url) {
            styleString = "background-image: url(" + answer.pic_url + ")";
        }
        return styleString;
    }
    function answerAddImage(answer) {
        if (answer.pic_url) {
            return "style='background-image:url(" + answer.pic_url + ")'";
        } else {
            return "";
        }
    }
    function questionAnswersContainerHTML(question) {
        var onclickAnswer = "quizWidgets['" + quizID + "'].answer(this)"; // complemented by data-quiz-answer=ANSWER-INDEX

        var onclickStart = "quizWidgets['" + quizID + "'].startQuiz(this)";
        var onclickShareFB = "quizWidgets['" + quizID + "'].shareQuizFB()";
        var onclickShareTwitter = "quizWidgets['" + quizID + "'].shareQuizTwitter()";

        var onclickPrevBtn = "quizWidgets['" + quizID + "'].previous(this)";

        var html = "<div class='slide'>";
            html+= "    <div class='question-share-container'>";
            html+= "        <div class='previous-btn' data-huffpostlabs-btn onclick=" + onclickPrevBtn + "></div>";
            html+= "        <div class='fb-share-container'>";
            html+= "            <img width='30px' height='30px' class='share fb-share-btn touchable' data-huffpostlabs-btn onclick=" + onclickShareFB + " src='" + static_domain + "/icon/fb-icon.png'></img>";
            html+= "            <img width='30px' height='30px' class='share fb-share-btn-blue touchable' data-huffpostlabs-btn onclick=" + onclickShareFB + " src='" + static_domain + "/icon/fb-icon-blue.png'></img>";
            html+= "        </div>";
            html+= "        <div class='twitter-share-container'>";
            html+= "            <img width='30px' height='30px' data-huffpostlabs-btn onclick=" + onclickShareTwitter + " class='twitter-share-btn share touchable' src='" + static_domain + "/icon/twitter-icon.png'></img>";
            html+= "            <img width='30px' height='30px' data-huffpostlabs-btn onclick=" + onclickShareTwitter + " class='twitter-share-btn-blue share touchable' src='" + static_domain + "/icon/twitter-icon-blue.png'></img>";
            html+= "        </div>";
            html+= "    </div>";

            html+= "    <div class='question-answers-container'>";
            html+= "        <div class='question-container'>";
            html+= "            <h2 class='question-text'>" +  question.text + "</h2>";
            html+= "        </div>";
            html+= "        <div class='answers-container total-answers-" + ((question.answerList.length < 5) ? question.answerList.length : 'more') + "' >";

        for (var i=0; i<question.answerList.length; i++) {
            var a = question.answerList[i];
            html+= "            <div data-quiz-answer=" + i + " data-huffpostlabs-btn onclick=" + onclickAnswer + " " + answerAddImage(a) + " class='touchable answer-container " + a.pic_style + "'>";
            html+= "                <h3 class='answer-text'>" + (a.text || "") + "</h3>";
            html+= "                <span class='photo-credit'>" + (a.pic_credit || "") + "</span>";
            html+= "            </div>";
        }
            html+= "        </div>";
            html+= "    </div>";
            html+= "</div>";
        return html;
    }
    function outcomeContentHTML(outcome) {
        var html = "    <h1 class='outcome-text'>" + outcome.text + "</h1>";
            html+= "    <p class='outcome-description'>" + (outcome.description || "") + "</p>";
            html+= "    <span class='photo-credit'>" + (outcome.pic_credit || "") + "</span>";
        return html;
    }
    function updateOutcomeContent(outcome) {
        outcomeContent.innerHTML = outcomeContentHTML(outcome);
        outcomeContent.style.backgroundImage = "url(" + outcome.pic_url + ")";
    }
    function outcomeContainerHTML() {
        var onclickShareFB = "quizWidgets['" + quizID + "'].shareOutcomeFB()";
        var onclickShareTwitter = "quizWidgets['" + quizID + "'].shareOutcomeTwitter()";
        var onclickRefresh = "quizWidgets['" + quizID + "'].refresh()";

        var html = "<div class='slide outcome-container'>";
            html+= "    <div class='outcome-content'>";
                        /* ---- the outcome content will fill in here --- */
            html+= "    </div>";
            html+= "    <div class='share-container'>";
            html+= "        <div class='fb-share-container'>";
            html+= "            <img width='30px' height='30px' class='share fb-share-btn touchable' data-huffpostlabs-btn onclick=" + onclickShareFB + " src='" + static_domain + "/icon/fb-icon.png'></img>";
            html+= "            <img width='30px' height='30px' class='share fb-share-btn-blue touchable' data-huffpostlabs-btn onclick=" + onclickShareFB + " src='" + static_domain + "/icon/fb-icon-blue.png'></img>";
            html+= "        </div>";
            html+= "        <div class='twitter-share-container'>";
            html+= "            <img width='30px' height='30px' data-huffpostlabs-btn onclick=" + onclickShareTwitter + " class='twitter-share-btn share touchable' src='" + static_domain + "/icon/twitter-icon.png'></img>";
            html+= "            <img width='30px' height='30px' data-huffpostlabs-btn onclick=" + onclickShareTwitter + " class='twitter-share-btn-blue share touchable' src='" + static_domain + "/icon/twitter-icon-blue.png'></img>";
            html+= "        </div>";
            html+= "        <div class='share-text'><p>Share your results</p></div>";
            html+= "        <img width='30px' height='30px' class='refresh-btn touchable' data-huffpostlabs-btn onclick=" + onclickRefresh + " src='" + (quizData.refresh_icon_url || (static_domain + "/icon/refresh.png")) + "'></img>";
            html+= "    </div>";
            html+= "</div>";
        return html;
    }

    init();
    return{ startQuiz: startQuiz,
            previous: previous,
            answer:   answer,

            refresh:            refresh,
            shareQuizFB:        shareQuizFB,
            shareOutcomeFB:     shareOutcomeFB,
            shareQuizTwitter:   shareQuizTwitter,
            shareOutcomeTwitter:shareOutcomeTwitter,
            };
}