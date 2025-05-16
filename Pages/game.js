let heaps = [];
let playerTurn = true;
let gameActive = true;

// Initialize game with fancy UI (unchanged)
function initGame(isPlayerFirst) {
    const params = new URLSearchParams(location.search);
    heaps = params.get('heaps').split(',').map(Number);
    
    playerTurn = isPlayerFirst;
    
    // Enhanced UI transition (unchanged)
    document.getElementById('turnSelection').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('turnSelection').style.display = 'none';
        document.getElementById('gameBoard').style.display = 'block';
        setTimeout(() => {
            document.getElementById('gameBoard').style.opacity = '1';
        }, 50);
    }, 300);
    
    renderHeaps();
    
    if (!isPlayerFirst) setTimeout(aiMove, 500); // No "AI's Turn" message
    
}

// Render heaps (only turn indicator simplified)
function renderHeaps() {
    const container = document.getElementById('heapsContainer');
    container.innerHTML = heaps.map((count, i) => `
        <div class="heap ${count === 0 ? 'heap-empty' : ''}">
            <div class="heap-header">
                <span class="heap-label">Pile ${i+1}</span>
                <div class="count ${count === 0 ? 'count-empty' : ''}">${count}</div>
            </div>
            ${count > 0 ? `
            <div class="heap-controls">
                <div class="input-wrapper">
                    <input type="number" id="take${i}" min="1" max="${count}" value="1">
                    <span class="input-label">Items to take</span>
                </div>
                <button class="take-btn" onclick="playerMove(${i})">
                    <span class="btn-icon">➖</span> Take
                </button>
            </div>
            ` : `
            <div class="empty-pile">
                <span class="empty-icon">⛔</span> Empty
            </div>
            `}
        </div>
    `).join('');
    
}

// Player move (unchanged)
function playerMove(heapIndex) {
    if (!gameActive || !playerTurn || heaps[heapIndex] === 0) return;

    const takeInput = document.getElementById(`take${heapIndex}`);
    const parsedValue = parseInt(takeInput.value.trim());
    
    if (isNaN(parsedValue) || parsedValue < 1 || parsedValue > heaps[heapIndex]) {
        takeInput.style.borderColor = '#e74c3c';
        takeInput.style.boxShadow = '0 0 0 3px rgba(231, 76, 60, 0.2)';
        setTimeout(() => {
            takeInput.style.borderColor = '';
            takeInput.style.boxShadow = '';
        }, 1000);
        return;
    }

    const heapElement = document.querySelectorAll('.heap')[heapIndex];
    heapElement.style.transform = 'scale(0.98)';
    setTimeout(() => {
        heapElement.style.transform = 'scale(1)';
    }, 200);

    const take = Math.min(heaps[heapIndex], parsedValue);
    heaps[heapIndex] -= take;
    
    if (heaps.every(h => h === 0)) {
        gameActive = false;
        showResult("Player Wins! 🎉");
        return;
    }
    
    playerTurn = false;
    renderHeaps();
    setTimeout(aiMove, 1000);
}



// AI move with flash AFTER heap updates
function aiMove() {
    if (!gameActive || playerTurn) return;
    
    setTimeout(() => {
        const initialHeaps = [...heaps];
        
        // 1. Make the AI's move
        const nimSum = heaps.reduce((a, b) => a ^ b, 0);
        let moveFound = false;
        
        heaps.some((heap, i) => {
            if (heap === 0) return false;
            const target = heap ^ nimSum;
            if (target < heap) {
                heaps[i] = target;
                moveFound = true;
                return true;
            }
        });
        
        if (!moveFound) {
            const validHeaps = heaps
                .map((h, i) => h > 0 ? i : -1)
                .filter(i => i !== -1);
            
            if (validHeaps.length > 0) {
                const heapIdx = validHeaps[Math.floor(Math.random() * validHeaps.length)];
                heaps[heapIdx] -= Math.min(1, heaps[heapIdx]);
            }
        }
        
        // 2. Show updated counts immediately
        renderHeaps();
        
        // 3. Flash red to highlight the change
        flashScreen(2);
        
        // 4. Check win condition
        if (heaps.every(h => h === 0)) {
            gameActive = false;
            showResult("AI Wins! 🤖");
        } else {
            playerTurn = true;
        }
    }, 1500);
}

// Flash screen function
function flashScreen(times) {
    const overlay = document.createElement('div');
    overlay.className = 'flash-overlay';
    document.body.appendChild(overlay);
    
    let flashes = 0;
    const maxFlashes = times * 2;
    
    const animate = () => {
        if (flashes >= maxFlashes) {
            document.body.removeChild(overlay);
            return;
        }
        
        overlay.style.opacity = flashes % 2 === 0 ? '0.3' : '0';
        flashes++;
        setTimeout(animate, 200);
    };
    
    animate();
}

// Enhanced result display
function showResult(message) {
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.style.opacity = '0';
    
    setTimeout(() => {
        gameBoard.style.display = 'none';
        const resultPanel = document.getElementById('resultPanel');
        resultPanel.innerHTML = `
            <div class="result-box ${message.includes('Player') ? 'win' : 'lose'}">
                <h2>${message}</h2>
                <p>Game Over</p>
                <button class="restart-btn" onclick="location.reload()">
                    <span class="restart-icon">🔄</span> Play Again
                </button>
            </div>
        `;
        resultPanel.style.display = 'block';
        setTimeout(() => {
            resultPanel.style.opacity = '1';
        }, 50);
    }, 300);
}

// Add these styles to your CSS file
const style = document.createElement('style');
style.textContent = `
.flash-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 0, 0, 0.3);
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
}
.heap {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
    transition: all 0.3s ease;
    border: 2px solid #eee;
}

.heap:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

.heap-empty {
    opacity: 0.7;
    background: #f8f9fa;
}

.heap-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
}

.heap-label {
    font-weight: 600;
    color: #2c3e50;
}

.count {
    font-size: 2rem;
    font-weight: 700;
    color: #3498db;
    transition: all 0.3s;
}

.count-empty {
    color: #95a5a6;
}

.heap-controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.input-wrapper {
    position: relative;
}

.input-label {
    position: absolute;
    top: -8px;
    left: 10px;
    background: white;
    padding: 0 5px;
    font-size: 0.8rem;
    color: #7f8c8d;
}

.take-btn {
    background: #e74c3c;
    color: white;
    border: none;
    padding: 10px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.take-btn:hover {
    background: #c0392b;
    transform: translateY(-2px);
}

.empty-pile {
    text-align: center;
    padding: 10px;
    color: #95a5a6;
    font-style: italic;
}

.empty-icon {
    display: block;
    font-size: 1.5rem;
    margin-bottom: 5px;
}

/* Turn Indicator */
#turnIndicator {
    text-align: center;
    margin: 20px 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #2c3e50;
    transition: all 0.3s;
}

/* Result Box */
.result-box {
    text-align: center;
    padding: 30px;
    border-radius: 12px;
    background: white;
    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
    max-width: 500px;
    margin: 0 auto;
    transition: all 0.5s;
}

.result-box.win {
    border-top: 5px solid #2ecc71;
}

.result-box.lose {
    border-top: 5px solid #e74c3c;
}

.result-box h2 {
    font-size: 2rem;
    margin-bottom: 10px;
}

.restart-btn {
    background: linear-gradient(90deg, #3498db, #2ecc71);
    color: white;
    border: none;
    padding: 12px 25px;
    border-radius: 30px;
    cursor: pointer;
    font-weight: 600;
    margin-top: 20px;
    transition: all 0.3s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.restart-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

/* Animation for heap changes */
@keyframes heapChange {
    0% { transform: scale(1); }
    50% { transform: scale(0.95); }
    100% { transform: scale(1); }
}

.heap-updating {
    animation: heapChange 0.5s ease;
}
`;
document.head.appendChild(style);