window.addEventListener('load', function() {
    var gameWrapper = document.getElementById('game-wrapper');
    var scalableContainer = document.getElementById('scalable-container');
    var innerScreen = document.getElementById('inner-screen');
    var roadLayer = document.getElementById('road-layer');
    var car = document.getElementById('car');
    var livesUI = document.getElementById('lives-ui-container');
    var scoreDisplay = document.getElementById('score-display');
    var tryAgainImg = document.getElementById('try-again-img');
    var countdownImg = document.getElementById('countdown-img');
    var startMenu = document.getElementById('start-menu');
    var startButton = document.getElementById('start-button');
    var leaderboardContainer = document.getElementById('leaderboard-container');
    var leaderboardEntries = document.getElementById('leaderboard-entries');
    var screenSizeDebug = document.getElementById('screen-size-debug');
    var keyClickDebug = document.getElementById('key-click-debug');
    
    var arcadeOverlay = document.getElementById('arcade-input-overlay');
    var arcadeHeadline = document.getElementById('arcade-headline');
    var slots = [document.getElementById('slot-0'), document.getElementById('slot-1'), document.getElementById('slot-2')];
    var activeSlotIndex = 0;
    var initialsArray = [65, 65, 65]; 
    var arcadeInputActive = false;
    var saveCallback = null;

    var score = 0;
    var currentLaneIndex = 1;
    var playerLives = 3;
    var gameStartTime = 0;
    var isGameOver = false;
    var gameStarted = false;
    var runCountdownSequence = true; 
    var scoreInterval = null;

    var musicMenu = new Audio('assets/music/Menu.mp3');
    musicMenu.loop = true;
    
    var musicIntro = new Audio('assets/music/Mudroads.wav');
    var musicLoop = new Audio('assets/music/Mudroads_Loop.wav');
    musicLoop.loop = true; 

    var sfxRsg = new Audio('assets/sfx/rsg.mp3');
    var sfxTa = new Audio('assets/sfx/ta.mp3');

    function forceTVFocus() {
        if (!gameStarted && startButton) {
            startButton.classList.add('focused');
            startButton.focus();
        }
    }

    function tryAutoplayMusic() {
        if (!gameStarted && musicMenu.paused) {
            musicMenu.play().catch(function(e) { console.log(e); });
        }
    }

    musicIntro.addEventListener('ended', function() {
        if (!isGameOver) {
            musicLoop.play().catch(function(e) { console.log(e); });
        }
    });

    function calculateScreenAndScale() {
        var width = window.innerWidth;
        var height = window.innerHeight;
        screenSizeDebug.innerText = "Size: " + width + " x " + height;

        var scaleX = width / 1100; 
        var scaleY = height / 950;
        var bestScaleFactor = Math.min(scaleX, scaleY);

        scalableContainer.style.transform = "scale(" + bestScaleFactor + ")";
    }
    window.addEventListener('resize', calculateScreenAndScale);
    calculateScreenAndScale();

    function loadLeaderboard() {
        var data = JSON.parse(localStorage.getItem('mudroads_scores')) || [];
        leaderboardEntries.innerHTML = '';
        for (var i = 0; i < 10; i++) {
            var entry = document.createElement('div');
            entry.className = 'leaderboard-entry';
            if (data[i]) {
                entry.innerText = (i + 1) + '. [' + data[i].name + ']: ' + data[i].score;
            } else {
                entry.innerText = (i + 1) + '. [---]: 0';
            }
            leaderboardEntries.appendChild(entry);
        }
    }

    function checkAndSaveScore(finalScore, onComplete) {
        var data = JSON.parse(localStorage.getItem('mudroads_scores')) || [];
        var qualifiesForTop10 = data.length < 10 || finalScore > data[data.length - 1].score;
        
        if (qualifiesForTop10) {
            var isAbsoluteHighScore = data.length === 0 || finalScore > data[0].score;
            if (isAbsoluteHighScore) {
                arcadeHeadline.innerHTML = "NEW HIGH SCORE!";
            } else {
                arcadeHeadline.innerHTML = "GAME ENDED!";
            }

            arcadeInputActive = true;
            arcadeOverlay.style.display = 'flex';
            activeSlotIndex = 0;
            initialsArray = [65, 65, 65];
            updateSlotVisuals();

            saveCallback = function() {
                var finalInitials = String.fromCharCode(initialsArray[0], initialsArray[1], initialsArray[2]);
                data.push({ name: finalInitials, score: finalScore });
                data.sort(function(a, b) { return b.score - a.score; });
                data = data.slice(0, 10);
                localStorage.setItem('mudroads_scores', JSON.stringify(data));
                arcadeOverlay.style.display = 'none';
                arcadeInputActive = false;
                loadLeaderboard(); 
                onComplete();
            };
        } else {
            onComplete();
        }
    }

    function updateSlotVisuals() {
        for (var i = 0; i < slots.length; i++) {
            if (slots[i]) {
                slots[i].innerText = String.fromCharCode(initialsArray[i]);
                if (i === activeSlotIndex) {
                    slots[i].classList.add('active-slot');
                } else {
                    slots[i].classList.remove('active-slot');
                }
            }
        }
    }

    function startGameSequence() {
        gameStarted = true;
        musicMenu.pause();
        startMenu.style.display = 'none';
        
        leaderboardContainer.style.opacity = '0';
        setTimeout(function() {
            if(gameStarted) leaderboardContainer.style.display = 'none';
        }, 300);

        livesUI.style.display = 'flex';
        scoreDisplay.style.display = 'block';
        
        sfxRsg.play().catch(function(e) { console.log(e); });

        countdownImg.style.display = 'block';
        countdownImg.src = 'assets/misc/Ready.png';
        
        setTimeout(function() {
            countdownImg.src = 'assets/misc/Set.png';
        }, 1000);

        setTimeout(function() {
            countdownImg.src = 'assets/misc/Go.png';
            
            runCountdownSequence = false;
            gameStartTime = Date.now();
            musicIntro.play().catch(function(e) { console.log(e); });

            scoreInterval = setInterval(function() {
                if (!isGameOver) {
                    score += 1;
                    scoreDisplay.innerText = "Score: " + score;
                }
            }, 1000);

            setTimeout(function() {
                countdownImg.style.display = 'none';
            }, 600);
        }, 2000);

        requestAnimationFrame(updateGame);
    }

    function resetToMainMenu() {
        for (var i = activeObstacles.length - 1; i >= 0; i--) {
            activeObstacles[i].element.remove();
        }
        activeObstacles.length = 0;

        musicIntro.currentTime = 0;
        musicLoop.currentTime = 0;

        score = 0;
        currentLaneIndex = 1;
        playerLives = 3;
        isGameOver = false;
        gameStarted = false;
        runCountdownSequence = true;
        isBlinking = false;
        blinkTimer = 0;
        retroStepsCount = 0;
        masterFrameCount = 0;
        nextRandomizedThreshold = START_SPAWN_THRESHOLD;

        scoreDisplay.innerText = "Score: 0";
        scoreDisplay.style.display = 'none';
        tryAgainImg.style.display = 'none';
        livesUI.style.display = 'none';
        
        var hearts = livesUI.getElementsByClassName('life-heart');
        for (var i = 0; i < hearts.length; i++) {
            hearts[i].style.visibility = 'visible';
        }
        
        car.style.visibility = 'visible';
        updateCarPosition();

        startMenu.style.display = 'flex';
        leaderboardContainer.style.display = 'block';
        leaderboardContainer.style.opacity = '1';

        forceTVFocus();

        musicMenu.currentTime = 0;
        musicMenu.play().catch(function(e) { console.log(e); });
    }

    var START_SPAWN_THRESHOLD = 12; 
    var MAX_SPAWN_THRESHOLD = 7;     
    var SPAWN_RAMP_SPEED = 10;       
    var nextRandomizedThreshold = START_SPAWN_THRESHOLD;

    var screenWidth = 750;
    var middleLaneOrigin = screenWidth / 2;
    var carLaneSpacing = 200; 
    var carLanes = [middleLaneOrigin - carLaneSpacing, middleLaneOrigin, middleLaneOrigin + carLaneSpacing];
    var obstacleLaneSpacing = 235; 
    var obstacleLanes = [middleLaneOrigin - obstacleLaneSpacing, middleLaneOrigin, middleLaneOrigin + obstacleLaneSpacing];
    
    function updateCarPosition() { car.style.left = carLanes[currentLaneIndex] + "px"; }
    
    function updateLivesUI() {
        var hearts = livesUI.getElementsByClassName('life-heart');
        if (playerLives >= 0 && playerLives < hearts.length) hearts[playerLives].style.visibility = 'hidden';
    }

    window.addEventListener('keydown', function(event) {
        var keyCode = event.keyCode || event.which;
        var keyName = event.key || "Unknown";

        if (keyClickDebug) {
            keyClickDebug.innerText = "Key Clicked: " + keyName + " (" + keyCode + ")";
        }

        tryAutoplayMusic();

        if ([37, 38, 39, 40, 13, 29443].indexOf(keyCode) !== -1) {
            event.preventDefault();
            event.stopPropagation();
        }

        var isLeft = (keyName === 'ArrowLeft' || keyName === 'Left' || keyCode === 37);
        var isRight = (keyName === 'ArrowRight' || keyName === 'Right' || keyCode === 39);
        var isUp = (keyName === 'ArrowUp' || keyName === 'Up' || keyCode === 38);
        var isDown = (keyName === 'ArrowDown' || keyName === 'Down' || keyCode === 40);
        var isEnter = (keyName === 'Enter' || keyName === 'Return' || keyCode === 13 || keyCode === 29443);

        if (!gameStarted) {
            if (isEnter) {
                startGameSequence();
            }
            return;
        }

        if (arcadeInputActive) {
            if (isUp) {
                initialsArray[activeSlotIndex]++;
                if (initialsArray[activeSlotIndex] > 90) initialsArray[activeSlotIndex] = 65; 
                updateSlotVisuals();
            }
            else if (isDown) {
                initialsArray[activeSlotIndex]--;
                if (initialsArray[activeSlotIndex] < 65) initialsArray[activeSlotIndex] = 90; 
                updateSlotVisuals();
            }
            else if (isLeft) {
                if (activeSlotIndex > 0) activeSlotIndex--;
                updateSlotVisuals();
            }
            else if (isRight) {
                if (activeSlotIndex < 2) activeSlotIndex++;
                updateSlotVisuals();
            }
            else if (isEnter) {
                if (saveCallback) saveCallback();
            }
            return; 
        }

        if (isGameOver || runCountdownSequence) return;

        if (isLeft) { 
            if (currentLaneIndex > 0) { currentLaneIndex--; updateCarPosition(); } 
        }
        else if (isRight) { 
            if (currentLaneIndex < carLanes.length - 1) { currentLaneIndex++; updateCarPosition(); } 
        }
    });

    loadLeaderboard();
    updateCarPosition();
    forceTVFocus();

    var obstaclePool = ['assets/obstacles/Tree_1.png', 'assets/obstacles/Tree_2.png', 'assets/obstacles/Tree_3.png', 'assets/obstacles/Boulder_1.png', 'assets/obstacles/Boulder_2.png', 'assets/obstacles/Boulder_3.png'];
    var activeObstacles = [];
    var roadTopY = 140, roadBottomY = 650;
    var roadHeight = roadBottomY - roadTopY;
    var perspectiveCurve = 0.9; 
    var masterFrameCount = 0;
    var retroStepsCount = 0;
    var isBlinking = false;
    var blinkTimer = 0;

    function spawnObstacle() {
        var randomAsset = obstaclePool[Math.floor(Math.random() * obstaclePool.length)];
        var img = document.createElement('img');
        img.src = randomAsset; img.className = 'obstacle';
        var spawnLaneIndex = Math.floor(Math.random() * obstacleLanes.length);
        innerScreen.appendChild(img);
        activeObstacles.push({ element: img, step: -1, totalSteps: 12, baseWidth: 64, baseHeight: 64, laneIndex: spawnLaneIndex });
    }

    function triggerGameOver() {
        isGameOver = true;
        clearInterval(scoreInterval);
        
        musicIntro.pause();
        musicLoop.pause();

        sfxTa.play().catch(function(e) { console.log(e); });
        tryAgainImg.style.display = 'block';

        setTimeout(function() {
            checkAndSaveScore(score, function() {
                resetToMainMenu();
            });
        }, 3000); 
    }

    function updateGame() {
        if (isGameOver || !gameStarted) return; 
        if (runCountdownSequence) {
            requestAnimationFrame(updateGame);
            return;
        }

        masterFrameCount++;

        var elapsed = (Date.now() - gameStartTime) / 1000;
        var speedFactor = Math.max(3, 6 - (elapsed / 20)); 
        var retroFrameDelay = Math.floor(speedFactor);
        var baseSpawnFactor = Math.max(7, 12 - (elapsed / 10));

        if (isBlinking) {
            blinkTimer--;
            car.style.visibility = (Math.floor(blinkTimer / 15) % 2 === 0) ? 'hidden' : 'visible';
            if (blinkTimer <= 0) { isBlinking = false; car.style.visibility = 'visible'; }
        }

        if (masterFrameCount % retroFrameDelay === 0) {
            retroStepsCount++;
            
            if (retroStepsCount >= nextRandomizedThreshold) { 
                spawnObstacle(); 
                retroStepsCount = 0; 
                var drift = (Math.random() * 2) - 1; 
                nextRandomizedThreshold = baseSpawnFactor + drift;
            }

            for (var i = activeObstacles.length - 1; i >= 0; i--) {
                var obs = activeObstacles[i];
                obs.step++; 
                if (obs.step >= obs.totalSteps) { obs.element.remove(); activeObstacles.splice(i, 1); continue; }

                obs.element.style.visibility = 'visible';
                obs.element.style.zIndex = (obs.step > 10) ? "6" : (obs.step > 0 ? "4" : "2");

                var progress = obs.step / (obs.totalSteps - 1);
                var maxAllowedScale = 2.5; 
                var currentScale = Math.min(0.4 + (3 - 0.4) * progress, maxAllowedScale);
                obs.element.style.width = (obs.baseWidth * currentScale) + "px";
                obs.element.style.height = (obs.baseHeight * currentScale) + "px";
                obs.element.style.top = (roadTopY + (roadHeight * (progress * progress))) + "px";
                obs.element.style.left = ((middleLaneOrigin) + (obstacleLanes[obs.laneIndex] - middleLaneOrigin) * Math.pow(progress, perspectiveCurve)) + "px";

                if (obs.step === 10 && obs.laneIndex === currentLaneIndex && !isBlinking) {
                    obs.element.remove();
                    activeObstacles.splice(i, 1);
                    
                    if (playerLives > 0) { 
                        playerLives--; 
                        updateLivesUI(); 
                    }
                    
                    if (playerLives <= 0) {
                        triggerGameOver();
                        return; 
                    } else {
                        isBlinking = true; 
                        blinkTimer = 90;
                    }
                }
            }
        }
        requestAnimationFrame(updateGame);
    }
});
