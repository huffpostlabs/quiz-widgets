



var HuffpostLabsSlidesCntl = function(container) {
    var container = container;
    var slides;
    var currSlideIndex
    var currSlide;
    var nextSlide;

    var percentToNumber = function(percentString) {
        return percentString.split('%')[0];
    }

    var transitionNext = function() {
        animateUp(currSlide, -100, function() {
            currSlideIndex += 1;
            currSlide = slides[currSlideIndex];
            nextSlide = slides[currSlideIndex + 1];
        });
        animateUp(nextSlide, 0);
    };
    var updateLastSlide = function(content) {
        slides[slides.length - 1].innerHTML = content;
    }

    var AnimationStep = 4; // keep it a factor of 100
    var AnimationInterval = 15; //milliseconds
    function animateUp(element, targetTop, callback) {
        var currTop = percentToNumber(element.style.top);
        if (currTop <= targetTop){
            if (callback) { callback(); }
            return;
        }
        
        element.style.top = (currTop - AnimationStep) + "%";
        window.setTimeout(function() {
            animateUp(element, targetTop, callback);
        }, AnimationInterval);
    }

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
    init();
    return { transitionNext: transitionNext, updateLastSlide: updateLastSlide };
}

var HuffpostLabsQuizObject = function(container, quizData, mobile, startedCallback, completedCallback) {
    console.log('quizData', quizData)

    var static_domain = "http://quiz.huffingtonpost.com"; // akamai cache


    var container = container;
    var quizData = quizData;
    var isMobile = mobile;
    var quizID = quizData._id;

    var slidesCntl;

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
    function answer1(element) {
        element.onclick = null;
        a = questionList[currQuestionIndex].answer1;
        chooseAnswer(a);
    }
    function answer2(element) {
        element.onclick = null;
        a = questionList[currQuestionIndex].answer2;
        chooseAnswer(a);
    }
    function chooseAnswer(answer) {
        chosenAnswers.push(answer);
        incrementOutcome(answer._outcome);
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
            slidesCntl.updateLastSlide(outcomeContentHTML(o));
        }
        return leadingOutcome;
    }

    function setupSlides() {
        slidesCntl = new HuffpostLabsSlidesCntl(container);
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
        handleMobile(); /* just does styling changes */

        container.style.display = 'block';
    }

    function handleMobile() {
        if (isMobile) {
            container.className += ' mobile';
        }

        /* hide the onclick lag with highlighting on touchstart */
        var touchables = document.getElementsByClassName('touchable');
        for (var i=0; i<touchables.length; i++) {
            touchables[i].addEventListener('touchstart', function(e) {
                e.target.className += ' selected';
            });
        }
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
    }

    var stylesheet = document.createElement('style');
    document.body.appendChild(stylesheet);
    var addStyle = function(rule) {
        stylesheet.innerHTML += rule;
    }

    function refresh() {
        console.log('refresh')
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
            html+= "    <div class='filler-left'>";
            html+= "        <img src='" + static_domain + "/icon/white-square.png' class='filler-square'></img>";
            html+= "    </div>";
            html+= "    <div class='title-content'>";
            html+= "        <h1 class='title'>" + quizData.title + "</h1>";
            html+= "        <div class='share-container'>";
            html+= "            <div class='fb-share-container'>";
            html+= "                <img width='30px' height='30px' class='share fb-share-btn touchable' onclick=" + onclickShareFB + " src='" + static_domain + "/designs/images/facebook.png'></img>";
            html+= "                <img width='30px' height='30px' class='share fb-share-btn-blue touchable' onclick=" + onclickShareFB + " src='" + static_domain + "/icon/fb-icon-blue.png'></img>";
            html+= "            </div>";
            html+= "            <div class='twitter-share-container'>";
            html+= "                <img width='30px' height='30px' onclick=" + onclickShareTwitter + " class='twitter-share-btn share touchable' src='" + static_domain + "/designs/images/twitter.png'></img>";
            html+= "                <img width='30px' height='30px' onclick=" + onclickShareTwitter + " class='twitter-share-btn-blue share touchable' src='" + static_domain + "/icon/twitter-icon-blue.png'></img>";
            html+= "            </div>";
            // html+= "            <span class='embed-code'>";
            // html+= "                <input value='" + static_domain + .... + "' >";
            // html+= "                <img src='" + static_domain + "/designs/images/embed.png'></img>";
            // html+= "            </span>";
            html+= "        </div>";
            html+= "        <div class='start-container touchable' onclick=" + onclickStart + ">";
            html+= "            <h2 class='start-text'>START</h2>";
            html+= "        </div>";
            html+= "    </div>";
            html+= " </div>";
        return html;
    }
    function answerStyleString(answer) {
        var styleString = "";
        if (answer.pic_url) {
            styleString = "background-image: url(" + answer.pic_url + ")";
        }
        return styleString;
    }
    function questionAnswersContainerHTML(question) {
        var onclickString1 = "quizWidgets['" + quizID + "'].answer1(this)";
        var onclickString2 = "quizWidgets['" + quizID + "'].answer2(this)";

        var html = "<div class='slide question-answers-container'>";
            html+= "    <div class='question-container'>";
            html+= "        <h2 class='question-text'>" +  question.text + "</h2>";
            html+= "    </div>";
            html+= "    <div class='answers-container'>";
            html+= "        <div onclick=" + onclickString1 + " style='" + answerStyleString(question.answer1) + "' class='touchable answer-1-container answer-container'>";
            html+= "            <h3 class='answer-text'>" + (question.answer1.text || "") + "</h3>";
            html+= "        </div>";
            html+= "        <div onclick=" + onclickString2 + " style='" + answerStyleString(question.answer2) + "' class='touchable answer-2-container answer-container'>";
            html+= "            <h3 class='answer-text'>" + (question.answer2.text || "") + "</h3>";
            html+= "        </div>";
            html+= "    </div>";
            html+= "</div>";
        return html;
    }
    function outcomeContentHTML(outcome) {
        var onclickShareFB = "quizWidgets['" + quizID + "'].shareOutcomeFB()";
        var onclickShareTwitter = "quizWidgets['" + quizID + "'].shareOutcomeTwitter()";
        var onclickRefresh = "quizWidgets['" + quizID + "'].refresh()";

        var styleText = 'background-image: url(' + outcome.pic_url + ')';
        var html = "<div style='" + styleText + "' class='outcome-content'>";
            html+= "    <h1 class='outcome-text'>" + outcome.text + "</h1>";
            html+= "</div>";
            html+= "<div class='share-container'>";
            html+= "    <div class='fb-share-container'>";
            html+= "        <img width='30px' height='30px' class='share fb-share-btn touchable' onclick=" + onclickShareFB + " src='" + static_domain + "/designs/images/facebook.png'></img>";
            html+= "        <img width='30px' height='30px' class='share fb-share-btn-blue touchable' onclick=" + onclickShareFB + " src='" + static_domain + "/icon/fb-icon-blue.png'></img>";
            html+= "    </div>";
            html+= "    <div class='twitter-share-container'>";
            html+= "        <img width='30px' height='30px' onclick=" + onclickShareTwitter + " class='twitter-share-btn share touchable' src='" + static_domain + "/designs/images/twitter.png'></img>";
            html+= "        <img width='30px' height='30px' onclick=" + onclickShareTwitter + " class='twitter-share-btn-blue share touchable' src='" + static_domain + "/icon/twitter-icon-blue.png'></img>";
            html+= "    </div>";
            html+= "    <div class='share-text'><p>Share your results</p></div>";
            //html+= "    <img width='30px' height='30px' class='refresh-btn touchable' onclick=" + onclickRefresh + " src='" + static_domain + "/icon/refresh.png'></img>";
            html+= "</div>";
        return html;
    }
    function outcomeContainerHTML() {
        var html = "<div class='slide outcome-container'>";
            html+= "</div>";
        return html;
    }

    init();
    return{ startQuiz: startQuiz,
            answer1:   answer1,
            answer2:   answer2,

            refresh:            refresh,
            shareQuizFB:        shareQuizFB,
            shareOutcomeFB:     shareOutcomeFB,
            shareQuizTwitter:   shareQuizTwitter,
            shareOutcomeTwitter:shareOutcomeTwitter,
            };
}