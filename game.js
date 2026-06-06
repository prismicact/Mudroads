window.addEventListener('load', () => {
    const gameWrapper = document.getElementById('game-wrapper');
    const scalableContainer = document.getElementById('scalable-container');
    const innerScreen = document.getElementById('inner-screen');
    const roadLayer = document.getElementById('road-layer');
    const car = document.getElementById('car');
    const livesUI = document.getElementById('lives-ui-container');
    const scoreDisplay = document.getElementById('score-display');
    const tryAgainImg = document.getElementById('try-again-img');
    const countdownImg = document.getElementById('countdown-img');
    const startMenu = document.getElementById('start-menu');
    const startButton = document.getElementById('start-button');
    const leaderboardContainer = document.getElementById('leaderboard-container');
    const leaderboardEntries = document.getElementById('leaderboard-entries');
    const screenSizeDebug = document.getElementById('screen-size-debug');
    
    const arcadeOverlay = document.getElementById('arcade-input-overlay');
    const arcadeHeadline = document.getElementById('arcade-headline');
    const slots = [document.getElementById('slot-0'), document.getElementById('slot-1'), document.getElementById('slot-2')];
    let activeSlotIndex = 0;
    let initialsArray = [65, 65, 65]; 
    let arcadeInputActive = false;
    let saveCallback = null;

    let score = 0;
    let currentLaneIndex = 1;
    let playerLives = 3;
    let gameStartTime = 0;
    let isGameOver = false;
    let gameStarted = false;
    let runCountdownSequence = true; 
    let scoreInterval = null;

    const musicMenu = new Audio('assets/music/Menu.mp3');
    musicMenu.loop = true;
    
    const musicIntro = new Audio('assets/music/Mudroads.wav');
    const musicLoop = new Audio('assets/music/Mudroads_Loop.wav');
    musicLoop.loop = true; 

    const sfxRsg = new Audio('assets/sfx/rsg.mp3');
    const sfxTa = new Audio('assets/sfx/ta.mp3');

    function triggerMenuMusic() {
        if(!gameStarted && musicMenu.paused) {
            musicMenu.play().catch(e => console.log("Audio play blocked:", e));
        }
    }

    window.addEventListener('keydown', triggerMenuMusic);
    window.addEventListener('click', triggerMenuMusic);

    musicIntro.addEventListener('ended', () => {
        if (!isGameOver) {
            musicLoop.play().catch(e => console.log("Loop track engaged"));
        }
    });

    function calculateScreenAndScale() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        screenSizeDebug.innerText = `Size: ${width} x ${height}`;

        const scaleX = width / 1100; 
        const scaleY = height / 950;
        const bestScaleFactor = Math.min(scaleX, scaleY);

        scalableContainer.style.transform = `scale(${bestScaleFactor})`;
    }
    window.addEventListener('resize', calculateScreenAndScale);
    calculateScreenAndScale();

    function loadLeaderboard() {
        let data = JSON.parse(localStorage.getItem('mudroads_scores')) || [];
        leaderboardEntries.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const entry = document.createElement('div');
            entry.className = 'leaderboard-entry';
            if (data[i]) {
                entry.innerText = `${i + 1}. [${data[i].name}]: ${data[i].score}`;
            } else {
                entry.innerText = `${i + 1}. [---]: 0`;
            }
            leaderboardEntries.appendChild(entry);
        }
    }

    function checkAndSaveScore(finalScore, onComplete) {
        let data = JSON.parse(localStorage.getItem('mudroads_scores')) || [];
        const qualifiesForTop10 = data.length < 10 || finalScore > data[data.length - 1].score;
        
        if (qualifiesForTop10) {
            const isAbsoluteHighScore = data.length === 0 || finalScore > data[0].score;
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

            saveCallback = () => {
                let finalInitials = String.fromCharCode(initialsArray[0], initialsArray[1], initialsArray[2]);
                data.push({ name: finalInitials, score: finalScore });
                data.sort((a, b) => b.score - a.score);
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
        slots.forEach((slot, idx) => {
            slot.innerText = String.fromCharCode(initialsArray[idx]);
            if (idx === activeSlotIndex) {
                slot.classList.add('active-slot');
            } else {
                slot.classList.remove('active-slot');
            }
        });
    }
	
    loadLeaderboard();

    function startGameSequence() {
        musicMenu.pause();
        startMenu.style.display = 'none';
        
        leaderboardContainer.style.opacity = '0';
        setTimeout(() => {
            if(gameStarted) leaderboardContainer.style.display = 'none';
        }, 300);

        livesUI.style.display = 'flex';
        scoreDisplay.style.display = 'block';
        
        gameStarted = true;
        sfxRsg.play().catch(e => console.log("SFX Blocked"));

        countdownImg.style.display = 'block';
        countdownImg.src = 'assets/misc/Ready.png';
        
        setTimeout(() => {
            countdownImg.src = 'assets/misc/Set.png';
        }, 1000);

        setTimeout(() => {
            countdownImg.src = 'assets/misc/Go.png';
            
            runCountdownSequence = false;
            gameStartTime = Date.now();
            musicIntro.play().catch(e => console.log("Audio Blocked"));

            scoreInterval = setInterval(() => {
                if (!isGameOver) {
                    score += 1;
                    scoreDisplay.innerText = `Score: ${score}`;
                }
            }, 1000);

            setTimeout(() => {
                countdownImg.style.display = 'none';
            }, 600);
        }, 2000);

        requestAnimationFrame(updateGame);
    }

    startButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if(!gameStarted) startGameSequence();
    });

    function resetToMainMenu() {
        for (let i = activeObstacles.length - 1; i >= 0; i--) {
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
        
        const hearts = livesUI.getElementsByClassName('life-heart');
        for (let i = 0; i < hearts.length; i++) {
            hearts[i].style.visibility = 'visible';
        }
        
        car.style.visibility = 'visible';
        updateCarPosition();

        startMenu.style.display = 'flex';
        leaderboardContainer.style.display = 'block';
        leaderboardContainer.style.opacity = '1';

        musicMenu.currentTime = 0;
        musicMenu.play().catch(e => console.log("Menu error:", e));
    }

    const START_SPAWN_THRESHOLD = 12; 
    const MAX_SPAWN_THRESHOLD = 7;     
    const SPAWN_RAMP_SPEED = 10;       
    let nextRandomizedThreshold = START_SPAWN_THRESHOLD;

    const screenWidth = 750;
    const middleLaneOrigin = screenWidth / 2;
    const carLaneSpacing = 200; 
    const carLanes = [middleLaneOrigin - carLaneSpacing, middleLaneOrigin, middleLaneOrigin + carLaneSpacing];
    const obstacleLaneSpacing = 235; 
    const obstacleLanes = [middleLaneOrigin - obstacleLaneSpacing, middleLaneOrigin, middleLaneOrigin + obstacleLaneSpacing];
    
    function updateCarPosition() { car.style.left = `${carLanes[currentLaneIndex]}px`; }
    
    function updateLivesUI() {
        const hearts = livesUI.getElementsByClassName('life-heart');
        if (playerLives >= 0 && playerLives < hearts.length) hearts[playerLives].style.visibility = 'hidden';
    }

    window.addEventListener('keydown', (event) => {
        const keyCode = event.keyCode || event.which;

        if ([37, 38, 39, 40, 13].includes(keyCode)) {
            event.preventDefault();
        }

        if (!gameStarted) {
            if (event.key === 'Enter' || keyCode === 13) {
                startGameSequence();
            }
            return;
        }

        if (arcadeInputActive) {
            if (event.key === 'ArrowUp' || keyCode === 38) {
                initialsArray[activeSlotIndex]++;
                if (initialsArray[activeSlotIndex] > 90) initialsArray[activeSlotIndex] = 65; 
                updateSlotVisuals();
            }
            else if (event.key === 'ArrowDown' || keyCode === 40) {
                initialsArray[activeSlotIndex]--;
                if (initialsArray[activeSlotIndex] < 65) initialsArray[activeSlotIndex] = 90; 
                updateSlotVisuals();
            }
            else if (event.key === 'ArrowLeft' || keyCode === 37) {
                if (activeSlotIndex > 0) activeSlotIndex--;
                updateSlotVisuals();
            }
            else if (event.key === 'ArrowRight' || keyCode === 39) {
                if (activeSlotIndex < 2) activeSlotIndex++;
                updateSlotVisuals();
            }
            else if (event.key === 'Enter' || keyCode === 13) {
                if (saveCallback) saveCallback();
            }
            return; 
        }

        if (isGameOver || runCountdownSequence) return;

        if (event.key === 'ArrowLeft' || keyCode === 37) { 
            if (currentLaneIndex > 0) { currentLaneIndex--; updateCarPosition(); } 
        }
        else if (event.key === 'ArrowRight' || keyCode === 39) { 
            if (currentLaneIndex < carLanes.length - 1) { currentLaneIndex++; updateCarPosition(); } 
        }
    });

    updateCarPosition();

    const obstaclePool = ['assets/obstacles/Tree_1.png', 'assets/obstacles/Tree_2.png', 'assets/obstacles/Tree_3.png', 'assets/obstacles/Boulder_1.png', 'assets/obstacles/Boulder_2.png', 'assets/obstacles/Boulder_3.png'];
    const activeObstacles = [];
    const roadTopY = 140; roadBottomY = 650;
    const roadHeight = roadBottomY - roadTopY;
    const perspectiveCurve = 0.9; 
    let masterFrameCount = 0;
    let retroStepsCount = 0;
    let isBlinking = false;
    let blinkTimer = 0;

    function spawnObstacle() {
        const randomAsset = obstaclePool[Math.floor(Math.random() * obstaclePool.length)];
        const img = document.createElement('img');
        img.src = randomAsset; img.className = 'obstacle';
        const spawnLaneIndex = Math.floor(Math.random() * obstacleLanes.length);
        innerScreen.appendChild(img);
        activeObstacles.push({ element: img, step: -1, totalSteps: 12, baseWidth: 64, baseHeight: 64, laneIndex: spawnLaneIndex });
    }

    function triggerGameOver() {
        isGameOver = true;
        clearInterval(scoreInterval);
        
        musicIntro.pause();
        musicLoop.pause();

        sfxTa.play().catch(e => console.log("SFX Error"));
        tryAgainImg.style.display = 'block';

        setTimeout(() => {
            checkAndSaveScore(score, () => {
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

        const elapsed = (Date.now() - gameStartTime) / 1000;
        const speedFactor = Math.max(3, 6 - (elapsed / 20)); 
        const retroFrameDelay = Math.floor(speedFactor);
        const baseSpawnFactor = Math.max(MAX_SPAWN_THRESHOLD, START_SPAWN_THRESHOLD - (elapsed / SPAWN_RAMP_SPEED));

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
                const drift = (Math.random() * 2) - 1; 
                nextRandomizedThreshold = baseSpawnFactor + drift;
            }

            for (let i = activeObstacles.length - 1; i >= 0; i--) {
                const obs = activeObstacles[i];
                obs.step++; 
                if (obs.step >= obs.totalSteps) { obs.element.remove(); activeObstacles.splice(i, 1); continue; }

                obs.element.style.visibility = 'visible';
                obs.element.style.zIndex = (obs.step > 10) ? "6" : (obs.step > 0 ? "4" : "2");

                const progress = obs.step / (obs.totalSteps - 1);
                const maxAllowedScale = 2.5; 
                const currentScale = Math.min(0.4 + (3 - 0.4) * progress, maxAllowedScale);
                obs.element.style.width = `${obs.baseWidth * currentScale}px`;
                obs.element.style.height = `${obs.baseHeight * currentScale}px`;
                obs.element.style.top = `${roadTopY + (roadHeight * (progress * progress))}px`;
                obs.element.style.left = `${(middleLaneOrigin) + (obstacleLanes[obs.laneIndex] - middleLaneOrigin) * Math.pow(progress, perspectiveCurve)}px`;

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
