// Variáveis de estado do jogo
let gameState = "menu"; // Estados: 'menu', 'playing', 'win', 'lose', 'ranking'
let canvas, ctx;
let score = 0;
let lives = 3;
let timeRemaining = 180; // 3 minutos em segundos
let gameLoopId;
let lastTime = 0;
let isPaused = false;
let stars = [];

// Definição dos níveis de dificuldade
const levels = [
  { bricks: 21, speed: 4 }, // Nível 1: Fácil (3 linhas)
  { bricks: 35, speed: 5 }, // Nível 2: Médio (5 linhas)
  { bricks: 63, speed: 6 }, // Nível 3: Difícil (9 linhas)
];
let currentLevelIndex = 0;

// Propriedades da bola
const ball = {
  x: 0,
  y: 0,
  radius: 8,
  dx: 0,
  dy: 0,
  speed: 0,
  color: "#ffc857", // Amarelo
  isMoving: false,
};

// Propriedades da barra (paddle)
const paddle = {
  x: 0,
  y: 0,
  width: 100,
  height: 12,
  color: "#e53e3e", // Vermelho
};

// Propriedades dos blocos (bricks)
const brick = {
  rows: 0,
  cols: 7,
  width: 60,
  height: 20,
  padding: 10,
  offsetX: 60,
  offsetY: 30,
};
let bricks = [];
let totalBricksInLevel = 0;

// Variáveis de controle de entrada
let rightPressed = false;
let leftPressed = false;
let mouseX = 0;

// Referências aos elementos da interface
const mainMenu = document.getElementById("main-menu");
const difficultyScreen = document.getElementById("difficulty-screen");
const rankingScreen = document.getElementById("ranking-screen");
const gameScreen = document.getElementById("game-screen");
const endGameScreen = document.getElementById("end-game-screen");
const gameCanvas = document.getElementById("game-canvas");
const scoreDisplay = document.getElementById("score-display");
const livesDisplay = document.getElementById("lives-display");
const timerDisplay = document.getElementById("timer-display");
const endGameMessage = document.getElementById("end-game-message");
const finalScoreMessage = document.getElementById("final-score-message");
const nameInput = document.getElementById("name-input");
const rankingList = document.getElementById("ranking-list");

// --- Funções de Inicialização e Desenho ---

function init() {
  localStorage.removeItem("breakoutScores");

  canvas = document.getElementById("game-canvas");
  ctx = canvas.getContext("2d");

  for (let i = 0; i < 200; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.5,
    });
  }

  setupEventListeners();
  showScreen("menu");
}

function createBricks() {
  const currentLevel = levels[currentLevelIndex];
  const numBricks = currentLevel.bricks;
  const numRows = Math.ceil(numBricks / brick.cols);
  bricks = [];
  totalBricksInLevel = numRows * brick.cols;

  const colors = [
    "#f56565",
    "#ed8936",
    "#ecc94b",
    "#48bb78",
    "#4299e1",
    "#667eea",
    "#9f7aea",
  ];
  for (let c = 0; c < brick.cols; c++) {
    bricks[c] = [];
    for (let r = 0; r < numRows; r++) {
      bricks[c][r] = {
        x: 0,
        y: 0,
        status: 1,
        color: colors[r % colors.length],
      };
    }
  }
}

function resetGame() {
  score = 0;
  lives = 3;
  timeRemaining = 180;
  currentLevelIndex = 0;
  updateScoreDisplay();
  updateLivesDisplay();
  updateTimerDisplay();

  ball.x = canvas.width / 2;
  ball.y = canvas.height - 30;
  ball.dx = 0;
  ball.dy = 0;
  ball.speed = levels[currentLevelIndex].speed;
  ball.isMoving = false;

  paddle.width = 100;
  paddle.x = (canvas.width - paddle.width) / 2;
  paddle.y = canvas.height - paddle.height - 10;

  createBricks();
}

function startNextLevel() {
  currentLevelIndex++;
  timeRemaining = 180;
  ball.x = canvas.width / 2;
  ball.y = canvas.height - 30;
  ball.speed = levels[currentLevelIndex].speed;
  ball.dx = 0;
  ball.dy = 0;
  ball.isMoving = false;
  paddle.x = (canvas.width - paddle.width) / 2;

  createBricks();
}

function drawBackground() {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#FFFFFF";
  for (let i = 0; i < 200; i++) {
    const star = stars[i];
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.fill();
  ctx.closePath();
}

function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.fillStyle = paddle.color;
  ctx.fill();
  ctx.closePath();
}

function drawBricks() {
  for (let c = 0; c < bricks.length; c++) {
    for (let r = 0; r < bricks[c].length; r++) {
      if (bricks[c][r].status === 1) {
        const brickX = c * (brick.width + brick.padding) + brick.offsetX;
        const brickY = r * (brick.height + brick.padding) + brick.offsetY;
        bricks[c][r].x = brickX;
        bricks[c][r].y = brickY;
        ctx.beginPath();
        ctx.rect(brickX, brickY, brick.width, brick.height);
        ctx.fillStyle = bricks[c][r].color;
        ctx.fill();
        ctx.closePath();
      }
    }
  }
}

function updateScoreDisplay() {
  scoreDisplay.textContent = `Pontos: ${score}`;
}

function updateLivesDisplay() {
  livesDisplay.textContent = `Vidas: ${lives}`;
}

function updateTimerDisplay() {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  timerDisplay.textContent = `Tempo: ${formattedTime}`;
}

// --- Funções de Lógica do Jogo ---

function collisionDetection() {
  for (let c = 0; c < bricks.length; c++) {
    for (let r = 0; r < bricks[c].length; r++) {
      const currentBrick = bricks[c][r];
      if (currentBrick.status === 1) {
        if (
          ball.x + ball.radius > currentBrick.x &&
          ball.x - ball.radius < currentBrick.x + brick.width &&
          ball.y + ball.radius > currentBrick.y &&
          ball.y - ball.radius < currentBrick.y + brick.height
        ) {
          const prevBallX = ball.x - ball.dx;
          const prevBallY = ball.y - ball.dy;

          if (
            prevBallY + ball.radius <= currentBrick.y ||
            prevBallY - ball.radius >= currentBrick.y + brick.height
          ) {
            ball.dy = -ball.dy;
          } else {
            ball.dx = -ball.dx;
          }

          currentBrick.status = 0;
          score++;
          updateScoreDisplay();

          let brokenBricks = 0;
          for (let col of bricks) {
            for (let b of col) {
              if (b.status === 0) {
                brokenBricks++;
              }
            }
          }

          if (brokenBricks === totalBricksInLevel) {
            if (currentLevelIndex < levels.length - 1) {
              startNextLevel();
            } else {
              endGame("win");
            }
          }
        }
      }
    }
  }
}

function movePaddle() {
  if (rightPressed && paddle.x < canvas.width - paddle.width) {
    paddle.x += 7;
  } else if (leftPressed && paddle.x > 0) {
    paddle.x -= 7;
  } else if (mouseX !== 0) {
    const relativeX = mouseX - canvas.getBoundingClientRect().left;
    if (relativeX > 0 && relativeX < canvas.width) {
      paddle.x = relativeX - paddle.width / 2;
    }
  }
}

function updateGame() {
  if (gameState !== "playing" || isPaused) return;

  if (ball.isMoving) {
    ball.x += ball.dx;
    ball.y += ball.dy;
  } else {
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.radius;
  }

  if (
    ball.x + ball.dx > canvas.width - ball.radius ||
    ball.x + ball.dx < ball.radius
  ) {
    ball.dx = -ball.dx;
  }
  if (ball.y + ball.dy < ball.radius) {
    ball.dy = -ball.dy;
  } else if (
    ball.y + ball.radius >= paddle.y &&
    ball.y < paddle.y + paddle.height
  ) {
    if (ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
      const hitPoint = ball.x - (paddle.x + paddle.width / 2);
      const normalizedHit = hitPoint / (paddle.width / 2);
      const bounceAngle = normalizedHit * (Math.PI / 3);

      ball.dx = ball.speed * Math.sin(bounceAngle);
      ball.dy = -ball.speed * Math.cos(bounceAngle);
    }
  }

  if (ball.y - ball.radius > canvas.height) {
    lives--;
    updateLivesDisplay();
    if (lives <= 0) {
      endGame("lose");
    } else {
      ball.x = canvas.width / 2;
      ball.y = canvas.height - 30;
      ball.dx = 0;
      ball.dy = 0;
      ball.isMoving = false;
      paddle.x = (canvas.width - paddle.width) / 2;
    }
  }

  collisionDetection();
  movePaddle();
}

// --- Loop do Jogo e Cronômetro ---

function gameLoop() {
  if (gameState !== "playing" || isPaused) {
    gameLoopId = requestAnimationFrame(gameLoop);
    return;
  }

  let now = performance.now();
  let deltaTime = now - lastTime;

  if (deltaTime >= 1000) {
    timeRemaining--;
    updateTimerDisplay();
    if (timeRemaining <= 0) {
      endGame("lose");
      return;
    }
    lastTime = now;
  }

  drawBackground();
  drawBricks();
  drawBall();
  drawPaddle();
  updateGame();

  gameLoopId = requestAnimationFrame(gameLoop);
}

// --- Funções de Estado do Jogo (Telas) ---

function showScreen(screenName) {
  mainMenu.style.display = "none";
  difficultyScreen.style.display = "none";
  rankingScreen.style.display = "none";
  gameScreen.style.display = "none";
  endGameScreen.style.display = "none";

  if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
  }

  switch (screenName) {
    case "menu":
      mainMenu.style.display = "flex";
      gameState = "menu";
      break;
    case "ranking":
      loadAndDisplayRanking();
      rankingScreen.style.display = "flex";
      gameState = "ranking";
      break;
    case "playing":
      gameScreen.style.display = "flex";
      gameState = "playing";
      lastTime = performance.now();
      gameLoop();
      break;
    case "end-game":
      endGameScreen.style.display = "flex";
      gameState = "end-game";
      break;
  }
}

function startGame() {
  resetGame();
  showScreen("playing");
}

function restartGame() {
  resetGame();
  showScreen("playing");
}

function endGame(result) {
  cancelAnimationFrame(gameLoopId);
  showScreen("end-game");
  if (result === "win") {
    endGameMessage.textContent = "Parabéns, Você Venceu o Jogo!";
  } else {
    endGameMessage.textContent = "Fim de Jogo! Você Perdeu.";
  }
  finalScoreMessage.textContent = `Sua pontuação final: ${score}`;
}

// --- Funções de Ranking ---

function getRanking() {
  const scores = localStorage.getItem("breakoutScores");
  return scores ? JSON.parse(scores) : [];
}

function saveScore() {
  const playerName = nameInput.value.trim();
  if (!playerName) {
    finalScoreMessage.textContent = "Por favor, digite seu nome!";
    return;
  }

  const scores = getRanking();
  scores.push({ name: playerName, score: score });
  localStorage.setItem("breakoutScores", JSON.stringify(scores));

  nameInput.value = "";
  showScreen("ranking");
}

function loadAndDisplayRanking() {
  const scores = getRanking();
  scores.sort((a, b) => b.score - a.score);

  rankingList.innerHTML = "";
  if (scores.length === 0) {
    rankingList.innerHTML =
      '<p class="text-center">Nenhuma pontuação salva ainda.</p>';
    return;
  }

  scores.forEach((s, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${index + 1}. ${s.name}</span><span>${
      s.score
    } pontos</span>`;
    rankingList.appendChild(li);
  });
}

// --- Funções de Eventos ---

function setupEventListeners() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Right" || e.key === "ArrowRight") {
      rightPressed = true;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
      leftPressed = true;
    }
  });
  document.addEventListener("keyup", (e) => {
    if (e.key === "Right" || e.key === "ArrowRight") {
      rightPressed = false;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
      leftPressed = false;
    }
  });

  gameCanvas.addEventListener("mousemove", (e) => {
    if (gameState === "playing") {
      mouseX = e.clientX;
    }
  });

  gameCanvas.addEventListener("click", () => {
    if (gameState === "playing" && !ball.isMoving) {
      ball.isMoving = true;
      ball.dx = levels[currentLevelIndex].speed;
      ball.dy = -levels[currentLevelIndex].speed;
    }
  });

  document
    .getElementById("start-game-btn")
    .addEventListener("click", () => startGame());
  document
    .getElementById("view-ranking-btn")
    .addEventListener("click", () => showScreen("ranking"));
  document
    .getElementById("back-to-menu-btn")
    .addEventListener("click", () => showScreen("menu"));
  document.getElementById("restart-btn").addEventListener("click", restartGame);
  document
    .getElementById("save-score-btn")
    .addEventListener("click", saveScore);
  document
    .getElementById("back-from-end-btn")
    .addEventListener("click", () => showScreen("menu"));
}

window.onload = init;
