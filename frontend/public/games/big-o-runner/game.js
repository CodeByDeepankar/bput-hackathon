// TASK: Create the game logic for "The Big O Runner"
// GOAL: Set up the canvas, player, and simulate O(n), O(log n), and O(1).

// --- 1. Wait for the window to load ---
function initBigORunner() {
  // --- 2. Get all DOM elements ---
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return; // Exit if canvas isn't on the page
  const ctx = canvas.getContext('2d');
  const selectionScreen = document.getElementById('selectionScreen');
  const gameScreen = document.getElementById('gameScreen');
  const gameModeTitle = document.getElementById('gameModeTitle');
  const gameInfo = document.getElementById('gameInfo');

  const btnOn = document.getElementById('btn-o-n');
  const btnOLogN = document.getElementById('btn-o-log-n');
  const btnO1 = document.getElementById('btn-o-1');

  // --- 3. Define game objects ---
  const player = { x: 20, y: 200, width: 20, height: 20, color: 'blue', speed: 2 };
  const item = { x: 750, y: 200, width: 20, height: 20, color: 'gold' };
  let gameMode = '';

  // --- 4. Game Functions ---
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.fillStyle = item.color;
    ctx.fillRect(item.x, item.y, item.width, item.height);
  }

  function gameLoop() {
    let hasWon = false;
    if (player.x + player.width >= item.x) {
      hasWon = true;
    }
    if (!hasWon) {
      if (gameMode === 'O(n)') {
        player.x += player.speed;
      } else if (gameMode === 'O(log n)') {
        player.x += player.speed * 5;
      } else if (gameMode === 'O(1)') {
        player.x = item.x;
      }
    }
    draw();
    if (hasWon) {
      gameInfo.innerText = `You found the item! Algorithm ${gameMode} finished. Click an algorithm to play again.`;
      selectionScreen.classList.remove('hidden');
    } else {
      requestAnimationFrame(gameLoop);
    }
  }

  function startGame(mode) {
    selectionScreen.classList.add('hidden');
    gameScreen.style.display = 'block';
    gameMode = mode;
    gameModeTitle.innerText = `Mode: ${mode}`;
    if (mode === 'O(n)') gameInfo.innerText = "O(n) Linear Search: Checking every single spot... This is slow.";
    if (mode === 'O(log n)') gameInfo.innerText = "O(log n) Binary Search: Jumping through the sorted data... Much faster!";
    if (mode === 'O(1)') gameInfo.innerText = "O(1) Hash Map: Instantly accessing the item! The fastest.";
    player.x = 20;
    requestAnimationFrame(gameLoop);
  }

  btnOn.onclick = () => startGame('O(n)');
  btnOLogN.onclick = () => startGame('O(log n)');
  btnO1.onclick = () => startGame('O(1)');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBigORunner);
} else {
  initBigORunner();
}
