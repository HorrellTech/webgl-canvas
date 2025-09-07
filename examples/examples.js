window.Examples = {
    basicShapes: {
        name: "Basic Shapes",
        code: `// Basic shapes example - works with both WebGL and Canvas 2D
const ctx = new WebGLCanvas(canvas);
// const ctx = canvas.getContext('2d'); // Uncomment for regular canvas

ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);

// Rectangles
ctx.fillStyle = '#ff6b6b';
ctx.fillRect(50, 50, 100, 80);

ctx.fillStyle = '#4ecdc4';
ctx.fillRect(200, 50, 100, 80);

// Circles
if (ctx.fillCircle) {
    ctx.fillStyle = '#45b7d1';
    ctx.fillCircle(125, 200, 50);
    
    ctx.fillStyle = '#f39c12';
    ctx.fillCircle(275, 200, 50);
} else {
    ctx.fillStyle = '#45b7d1';
    ctx.beginPath();
    ctx.arc(125, 200, 50, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(275, 200, 50, 0, Math.PI * 2);
    ctx.fill();
}

// Lines
ctx.strokeStyle = '#e74c3c';
ctx.lineWidth = 4;
if (ctx.drawLine) {
    ctx.drawLine(50, 300, 350, 300);
    ctx.drawLine(200, 250, 200, 350);
} else {
    ctx.beginPath();
    ctx.moveTo(50, 300);
    ctx.lineTo(350, 300);
    ctx.moveTo(200, 250);
    ctx.lineTo(200, 350);
    ctx.stroke();
}

if (ctx.flush) ctx.flush();`
    },

    rainbowAnimation: {
        name: "Rainbow Animation",
        code: `// Rainbow animation example
const ctx = new WebGLCanvas(canvas);
// const ctx = canvas.getContext('2d'); // Uncomment for regular canvas

let time = 0;
let animationId;

function animate() {
    ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    time += 0.02;
    
    // Create rainbow effect
    for (let i = 0; i < 20; i++) {
        const hue = (i * 18 + time * 50) % 360;
        const x = canvas.width / 2 + Math.cos(time + i * 0.5) * 150;
        const y = canvas.height / 2 + Math.sin(time + i * 0.3) * 100;
        const radius = 20 + Math.sin(time * 2 + i) * 10;
        
        ctx.fillStyle = \`hsl(\${hue}, 70%, 60%)\`;
        
        if (ctx.fillCircle) {
            ctx.fillCircle(x, y, radius);
        } else {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    if (ctx.flush) ctx.flush();
    animationId = requestAnimationFrame(animate);
}

// Clean up any existing animation
if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

animationId = requestAnimationFrame(animate);
window.currentAnimationId = animationId;`
    },

    simpleSnake: {
        name: "Simple Snake Game",
        code: `// Simple Snake Game - Clean up previous instances first
if (window.snakeGameCleanup) {
    window.snakeGameCleanup();
}

const ctx = new WebGLCanvas(canvas);
// const ctx = canvas.getContext('2d'); // Uncomment for regular canvas

const gridSize = 20;
const tileCount = Math.floor(canvas.width / gridSize);

let snake = [{x: 10, y: 10}];
let food = {
    x: Math.floor(Math.random() * tileCount),
    y: Math.floor(Math.random() * tileCount)
};
let dx = 0;
let dy = 0;
let score = 0;
let gameRunning = false;
let gameInterval;

// Keyboard controls
function handleKeyDown(e) {
    if (!gameRunning) return;
    
    switch(e.key) {
        case 'ArrowUp':
            if (dy === 0) { dx = 0; dy = -1; }
            break;
        case 'ArrowDown':
            if (dy === 0) { dx = 0; dy = 1; }
            break;
        case 'ArrowLeft':
            if (dx === 0) { dx = -1; dy = 0; }
            break;
        case 'ArrowRight':
            if (dx === 0) { dx = 1; dy = 0; }
            break;
    }
    e.preventDefault();
}

document.addEventListener('keydown', handleKeyDown);

function gameLoop() {
    if (!gameRunning) return;
    
    // Move snake
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    
    // Check wall collision
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
        return;
    }
    
    // Check self collision
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            gameOver();
            return;
        }
    }
    
    snake.unshift(head);
    
    // Check food collision
    if (head.x === food.x && head.y === food.y) {
        score++;
        generateFood();
    } else {
        snake.pop();
    }
    
    draw();
}

function generateFood() {
    do {
        food = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
}

function draw() {
    ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw snake
    ctx.fillStyle = '#4CAF50';
    snake.forEach((segment, index) => {
        // Make head slightly different
        if (index === 0) ctx.fillStyle = '#2E7D32';
        else ctx.fillStyle = '#4CAF50';
        
        ctx.fillRect(
            segment.x * gridSize + 1, 
            segment.y * gridSize + 1, 
            gridSize - 2, 
            gridSize - 2
        );
    });
    
    // Draw food
    ctx.fillStyle = '#F44336';
    if (ctx.fillCircle) {
        ctx.fillCircle(
            food.x * gridSize + gridSize/2, 
            food.y * gridSize + gridSize/2, 
            gridSize/2 - 2
        );
    } else {
        ctx.beginPath();
        ctx.arc(
            food.x * gridSize + gridSize/2, 
            food.y * gridSize + gridSize/2, 
            gridSize/2 - 2, 
            0, Math.PI * 2
        );
        ctx.fill();
    }
    
    // Draw score
    ctx.fillStyle = '#000';
    ctx.font = '16px Arial';
    if (ctx.fillText) {
        ctx.fillText('Score: ' + score, 10, 25);
    }
    
    if (ctx.flush) ctx.flush();
}

function startGame() {
    if (gameInterval) clearInterval(gameInterval);
    gameRunning = true;
    dx = 1;
    dy = 0;
    gameInterval = setInterval(gameLoop, 150);
}

function gameOver() {
    gameRunning = false;
    if (gameInterval) clearInterval(gameInterval);
    
    // Draw game over screen
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    if (ctx.fillText) {
        ctx.fillText('Game Over!', canvas.width/2, canvas.height/2 - 20);
        ctx.fillText('Score: ' + score, canvas.width/2, canvas.height/2 + 10);
        ctx.fillText('Click to restart', canvas.width/2, canvas.height/2 + 40);
    }
    ctx.textAlign = 'left';
    
    if (ctx.flush) ctx.flush();
}

function resetGame() {
    if (gameInterval) clearInterval(gameInterval);
    snake = [{x: 10, y: 10}];
    dx = 0;
    dy = 0;
    score = 0;
    gameRunning = false;
    generateFood();
    draw();
}

// Canvas click handler
function handleCanvasClick() {
    if (!gameRunning) {
        resetGame();
        startGame();
    }
}

canvas.addEventListener('click', handleCanvasClick);

// Initialize
resetGame();

// Store cleanup function globally
window.snakeGameCleanup = function() {
    if (gameInterval) clearInterval(gameInterval);
    document.removeEventListener('keydown', handleKeyDown);
    canvas.removeEventListener('click', handleCanvasClick);
    gameRunning = false;
};`
    },

    drawingApp: {
        name: "Drawing App",
        code: `// Simple Drawing App - Clean up previous instances first
if (window.drawingAppCleanup) {
    window.drawingAppCleanup();
}

const ctx = new WebGLCanvas(canvas);
// const ctx = canvas.getContext('2d'); // Uncomment for regular canvas

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let brushSize = 5;
let currentColor = '#000000';

// Color palette
const colors = ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];

function getEventPos(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
        return {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top
        };
    }
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function startDrawing(e) {
    const pos = getEventPos(e);
    
    // Check if clicking on color palette
    if (pos.y >= 10 && pos.y <= 35) {
        const colorIndex = Math.floor((pos.x - 10) / 30);
        if (colorIndex >= 0 && colorIndex < colors.length) {
            currentColor = colors[colorIndex];
            return;
        }
    }
    
    isDrawing = true;
    lastX = pos.x;
    lastY = pos.y;
    
    if (e.preventDefault) e.preventDefault();
}

function draw(e) {
    if (!isDrawing) return;
    
    const pos = getEventPos(e);
    
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (ctx.drawLine) {
        ctx.drawLine(lastX, lastY, pos.x, pos.y);
    } else {
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }
    
    lastX = pos.x;
    lastY = pos.y;
    
    if (ctx.flush) ctx.flush();
    if (e.preventDefault) e.preventDefault();
}

function stopDrawing(e) {
    isDrawing = false;
    if (e.preventDefault) e.preventDefault();
}

// Keyboard shortcuts
function handleKeyDown(e) {
    if (e.key === 'c' || e.key === 'C') {
        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Redraw palette
        colors.forEach((color, index) => {
            ctx.fillStyle = color;
            ctx.fillRect(10 + index * 30, 10, 25, 25);
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 1;
            ctx.strokeRect(10 + index * 30, 10, 25, 25);
        });
        
        // Redraw instructions
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        if (ctx.fillText) {
            ctx.fillText('Press C to clear, +/- to change brush size', 10, canvas.height - 10);
        }
        
        if (ctx.flush) ctx.flush();
    } else if (e.key === '+' || e.key === '=') {
        brushSize = Math.min(20, brushSize + 1);
    } else if (e.key === '-') {
        brushSize = Math.max(1, brushSize - 1);
    }
}

// Mouse events
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// Touch events
canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDrawing);

// Keyboard events
document.addEventListener('keydown', handleKeyDown);

// Initialize with white background
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Draw color palette
colors.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(10 + index * 30, 10, 25, 25);
    // Add border for visibility
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(10 + index * 30, 10, 25, 25);
});

// Draw brush size indicator
ctx.fillStyle = '#333333';
if (ctx.fillCircle) {
    ctx.fillCircle(50, 50, brushSize);
} else {
    ctx.beginPath();
    ctx.arc(50, 50, brushSize, 0, Math.PI * 2);
    ctx.fill();
}

// Instructions
ctx.fillStyle = '#333';
ctx.font = '12px Arial';
if (ctx.fillText) {
    ctx.fillText('Press C to clear, +/- to change brush size', 10, canvas.height - 10);
}

if (ctx.flush) ctx.flush();

// Store cleanup function globally
window.drawingAppCleanup = function() {
    canvas.removeEventListener('mousedown', startDrawing);
    canvas.removeEventListener('mousemove', draw);
    canvas.removeEventListener('mouseup', stopDrawing);
    canvas.removeEventListener('mouseout', stopDrawing);
    canvas.removeEventListener('touchstart', startDrawing);
    canvas.removeEventListener('touchmove', draw);
    canvas.removeEventListener('touchend', stopDrawing);
    document.removeEventListener('keydown', handleKeyDown);
    isDrawing = false;
};`
    },

    particleSystem: {
        name: "Particle System",
        code: `// Particle System
if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

const ctx = new WebGLCanvas(canvas);
// const ctx = canvas.getContext('2d'); // Uncomment for regular canvas

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.005;
        this.size = Math.random() * 8 + 2;
        this.color = \`hsl(\${Math.random() * 360}, 70%, 60%)\`;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // gravity
        this.life -= this.decay;
        this.vx *= 0.99; // friction
        this.vy *= 0.99;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        
        if (ctx.fillCircle) {
            ctx.fillCircle(this.x, this.y, this.size);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    isDead() {
        return this.life <= 0;
    }
}

let particles = [];
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
let animationId;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

function animate() {
    ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Add new particles at mouse position
    for (let i = 0; i < 3; i++) {
        particles.push(new Particle(mouseX, mouseY));
    }
    
    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        
        if (particles[i].isDead()) {
            particles.splice(i, 1);
        }
    }
    
    ctx.globalAlpha = 1.0;
    if (ctx.flush) ctx.flush();
    
    animationId = requestAnimationFrame(animate);
}

animationId = requestAnimationFrame(animate);
window.currentAnimationId = animationId;`
    },

    bouncingBalls: {
        name: "Bouncing Balls",
        code: `// Bouncing Balls Animation
if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

const ctx = new WebGLCanvas(canvas);
// const ctx = canvas.getContext('2d'); // Uncomment for regular canvas

class Ball {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.radius = Math.random() * 30 + 10;
        this.color = \`hsl(\${Math.random() * 360}, 70%, 60%)\`;
        this.trail = [];
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // Bounce off walls
        if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
            this.vx *= -0.8;
            this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        }
        if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
            this.vy *= -0.8;
            this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
        }
        
        // Add gravity
        this.vy += 0.3;
        
        // Add to trail
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > 20) {
            this.trail.shift();
        }
    }
    
    draw() {
        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = i / this.trail.length;
            ctx.globalAlpha = alpha * 0.3;
            ctx.fillStyle = this.color;
            
            if (ctx.fillCircle) {
                ctx.fillCircle(this.trail[i].x, this.trail[i].y, this.radius * alpha);
            } else {
                ctx.beginPath();
                ctx.arc(this.trail[i].x, this.trail[i].y, this.radius * alpha, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw ball
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = this.color;
        if (ctx.fillCircle) {
            ctx.fillCircle(this.x, this.y, this.radius);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

const balls = [];
for (let i = 0; i < 8; i++) {
    balls.push(new Ball());
}

let animationId;

function animate() {
    ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    balls.forEach(ball => {
        ball.update();
        ball.draw();
    });
    
    if (ctx.flush) ctx.flush();
    animationId = requestAnimationFrame(animate);
}

animationId = requestAnimationFrame(animate);
window.currentAnimationId = animationId;`
    },

    fractalTree: {
        name: "Fractal Tree",
        code: `// Fractal Tree - Clean up previous instances first
if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

const ctx = new WebGLCanvas(canvas);
// const ctx = canvas.getContext('2d'); // Uncomment for regular canvas

ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);

function drawBranch(startX, startY, length, angle, depth) {
    if (depth === 0) return;
    
    const endX = startX + Math.cos(angle) * length;
    const endY = startY + Math.sin(angle) * length;
    
    // Color based on depth
    const hue = (depth * 30) % 360;
    ctx.strokeStyle = \`hsl(\${hue}, 70%, \${40 + depth * 8}%)\`;
    ctx.lineWidth = Math.max(1, depth * 0.8);
    
    // Draw the branch
    if (ctx.drawLine) {
        ctx.drawLine(startX, startY, endX, endY);
    } else {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
    
    // Draw sub-branches
    const newLength = length * 0.75;
    const angleOffset = Math.PI / 5; // Adjusted angle
    
    drawBranch(endX, endY, newLength, angle - angleOffset, depth - 1);
    drawBranch(endX, endY, newLength, angle + angleOffset, depth - 1);
    
    // Add some randomness for more natural look
    if (depth > 2) {
        const randomAngle = angle + (Math.random() - 0.5) * 0.5;
        drawBranch(endX, endY, newLength * 0.8, randomAngle, depth - 2);
    }
}

// Draw the tree
const startX = canvas.width / 2;
const startY = canvas.height - 50;
const initialLength = 100;
const initialAngle = -Math.PI / 2; // Point upward
const maxDepth = 8;

drawBranch(startX, startY, initialLength, initialAngle, maxDepth);

if (ctx.flush) ctx.flush();`
    },

    rippleEffect: {
        name: "Ripple Effect",
        code: `// Interactive Ripple Effect
if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}
if (window.rippleInterval) {
    clearInterval(window.rippleInterval);
}

const ctx = new WebGLCanvas(canvas);
// const ctx = canvas.getContext('2d'); // Uncomment for regular canvas

class Ripple {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 150;
        this.speed = 3;
        this.alpha = 1;
    }
    
    update() {
        this.radius += this.speed;
        this.alpha = 1 - (this.radius / this.maxRadius);
        return this.radius < this.maxRadius;
    }
    
    draw() {
        ctx.globalAlpha = this.alpha;
        ctx.strokeStyle = \`hsl(\${(this.radius * 2) % 360}, 70%, 60%)\`;
        ctx.lineWidth = 3;
        
        if (ctx.strokeCircle) {
            ctx.strokeCircle(this.x, this.y, this.radius);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Inner ripple
        ctx.lineWidth = 1;
        ctx.strokeStyle = \`hsl(\${(this.radius * 3) % 360}, 50%, 80%)\`;
        if (ctx.strokeCircle) {
            ctx.strokeCircle(this.x, this.y, this.radius * 0.7);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

let ripples = [];
let animationId;

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ripples.push(new Ripple(x, y));
});

// Auto-generate ripples
window.rippleInterval = setInterval(() => {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ripples.push(new Ripple(x, y));
}, 1000);

function animate() {
    ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw ripples
    ripples = ripples.filter(ripple => {
        const alive = ripple.update();
        if (alive) {
            ripple.draw();
        }
        return alive;
    });
    
    ctx.globalAlpha = 1.0;
    
    // Draw instructions
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '16px Arial';
    if (ctx.fillText) {
        ctx.fillText('Click to create ripples!', 10, 30);
    }
    
    if (ctx.flush) ctx.flush();
    animationId = requestAnimationFrame(animate);
}

animationId = requestAnimationFrame(animate);
window.currentAnimationId = animationId;`
    },

    clockAnimation: {
        name: "Analog Clock",
        code: `// Analog Clock
if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}
if (window.clockInterval) {
    clearInterval(window.clockInterval);
}

const ctx = new WebGLCanvas(canvas);
// const ctx = canvas.getContext('2d'); // Uncomment for regular canvas

function drawClock() {
    ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    
    const now = new Date();
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    // Draw clock face
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    if (ctx.strokeCircle) {
        ctx.strokeCircle(centerX, centerY, radius);
    } else {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Draw hour markers
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6 - Math.PI / 2;
        const x1 = centerX + Math.cos(angle) * (radius - 20);
        const y1 = centerY + Math.sin(angle) * (radius - 20);
        const x2 = centerX + Math.cos(angle) * (radius - 10);
        const y2 = centerY + Math.sin(angle) * (radius - 10);
        
        if (ctx.drawLine) {
            ctx.drawLine(x1, y1, x2, y2);
        } else {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }
    
    // Hour hand
    const hourAngle = ((hours + minutes / 60) * Math.PI) / 6 - Math.PI / 2;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    const hourX = centerX + Math.cos(hourAngle) * (radius * 0.5);
    const hourY = centerY + Math.sin(hourAngle) * (radius * 0.5);
    if (ctx.drawLine) {
        ctx.drawLine(centerX, centerY, hourX, hourY);
    } else {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(hourX, hourY);
        ctx.stroke();
    }
    
    // Minute hand
    const minuteAngle = (minutes * Math.PI) / 30 - Math.PI / 2;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    const minuteX = centerX + Math.cos(minuteAngle) * (radius * 0.75);
    const minuteY = centerY + Math.sin(minuteAngle) * (radius * 0.75);
    if (ctx.drawLine) {
        ctx.drawLine(centerX, centerY, minuteX, minuteY);
    } else {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(minuteX, minuteY);
        ctx.stroke();
    }
    
    // Second hand
    const secondAngle = (seconds * Math.PI) / 30 - Math.PI / 2;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    const secondX = centerX + Math.cos(secondAngle) * (radius * 0.9);
    const secondY = centerY + Math.sin(secondAngle) * (radius * 0.9);
    if (ctx.drawLine) {
        ctx.drawLine(centerX, centerY, secondX, secondY);
    } else {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(secondX, secondY);
        ctx.stroke();
    }
    
    // Center dot
    ctx.fillStyle = '#000';
    if (ctx.fillCircle) {
        ctx.fillCircle(centerX, centerY, 5);
    } else {
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    if (ctx.flush) ctx.flush();
}

// Update clock every second
drawClock();
window.clockInterval = setInterval(drawClock, 1000);`
    },

    fireworks: {
        name: "Fireworks",
        code: `// Fireworks Display
if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}
if (window.fireworksInterval) {
    clearInterval(window.fireworksInterval);
}

const ctx = new WebGLCanvas(canvas);
// const ctx = canvas.getContext('2d'); // Uncomment for regular canvas

class Firework {
    constructor(x, y, targetY) {
        this.x = x;
        this.y = y;
        this.targetY = targetY;
        this.speed = 8;
        this.exploded = false;
        this.particles = [];
        this.color = \`hsl(\${Math.random() * 360}, 70%, 60%)\`;
    }
    
    update() {
        if (!this.exploded) {
            this.y -= this.speed;
            if (this.y <= this.targetY) {
                this.explode();
            }
        } else {
            this.particles.forEach(particle => particle.update());
            this.particles = this.particles.filter(particle => particle.life > 0);
        }
    }
    
    explode() {
        this.exploded = true;
        const particleCount = 30 + Math.random() * 20;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 2 + Math.random() * 6;
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.015 + Math.random() * 0.01,
                size: 2 + Math.random() * 3,
                color: this.color
            });
        }
    }
    
    draw() {
        if (!this.exploded) {
            ctx.fillStyle = this.color;
            if (ctx.fillCircle) {
                ctx.fillCircle(this.x, this.y, 3);
            } else {
                ctx.beginPath();
                ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            this.particles.forEach(particle => {
                ctx.globalAlpha = particle.life;
                ctx.fillStyle = particle.color;
                if (ctx.fillCircle) {
                    ctx.fillCircle(particle.x, particle.y, particle.size);
                } else {
                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.1; // gravity
                particle.life -= particle.decay;
            });
        }
    }
    
    isDead() {
        return this.exploded && this.particles.length === 0;
    }
}

let fireworks = [];
let animationId;

function launchFirework() {
    const x = Math.random() * canvas.width;
    const y = canvas.height;
    const targetY = 50 + Math.random() * 200;
    fireworks.push(new Firework(x, y, targetY));
}

function animate() {
    // Fade out background for trail effect
    ctx.fillStyle = 'rgba(0, 0, 10, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    fireworks.forEach(firework => {
        firework.update();
        firework.draw();
    });
    
    fireworks = fireworks.filter(firework => !firework.isDead());
    
    ctx.globalAlpha = 1.0;
    if (ctx.flush) ctx.flush();
    animationId = requestAnimationFrame(animate);
}

// Launch fireworks automatically
window.fireworksInterval = setInterval(launchFirework, 1000);

// Launch fireworks on click
canvas.addEventListener('click', launchFirework);

animationId = requestAnimationFrame(animate);
window.currentAnimationId = animationId;`
    },

    mandalaPattern: {
        name: "Mandala Pattern",
        code: `// Animated Mandala Pattern
if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

const ctx = new WebGLCanvas(canvas);
// const ctx = canvas.getContext('2d'); // Uncomment for regular canvas

let time = 0;
let animationId;

function drawMandala() {
    ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 50;
    
    time += 0.02;
    
    // Draw concentric circles with patterns
    for (let layer = 0; layer < 8; layer++) {
        const radius = (maxRadius / 8) * (layer + 1);
        const points = 6 + layer * 2;
        const rotation = time + layer * 0.1;
        
        ctx.strokeStyle = \`hsl(\${(layer * 45 + time * 50) % 360}, 70%, 60%)\`;
        ctx.lineWidth = 2;
        
        // Draw petal-like shapes
        for (let i = 0; i < points; i++) {
            const angle1 = (i / points) * Math.PI * 2 + rotation;
            const angle2 = ((i + 1) / points) * Math.PI * 2 + rotation;
            
            const x1 = centerX + Math.cos(angle1) * radius;
            const y1 = centerY + Math.sin(angle1) * radius;
            const x2 = centerX + Math.cos(angle2) * radius;
            const y2 = centerY + Math.sin(angle2) * radius;
            
            // Control points for curves
            const controlRadius = radius * 0.7;
            const controlAngle = (angle1 + angle2) / 2;
            const cx = centerX + Math.cos(controlAngle) * controlRadius;
            const cy = centerY + Math.sin(controlAngle) * controlRadius;
            
            if (ctx.drawLine) {
                ctx.drawLine(x1, y1, cx, cy);
                ctx.drawLine(cx, cy, x2, y2);
                ctx.drawLine(x2, y2, centerX, centerY);
            } else {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.quadraticCurveTo(cx, cy, x2, y2);
                ctx.lineTo(centerX, centerY);
                ctx.lineTo(x1, y1);
                ctx.stroke();
            }
        }
        
        // Draw connecting lines
        ctx.strokeStyle = \`hsl(\${(layer * 45 + time * 30 + 180) % 360}, 50%, 40%)\`;
        ctx.lineWidth = 1;
        
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2 + rotation;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (ctx.drawLine) {
                ctx.drawLine(centerX, centerY, x, y);
            } else {
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        }
    }
    
    // Center decoration
    ctx.fillStyle = \`hsl(\${time * 100 % 360}, 80%, 50%)\`;
    if (ctx.fillCircle) {
        ctx.fillCircle(centerX, centerY, 8);
    } else {
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    if (ctx.flush) ctx.flush();
    animationId = requestAnimationFrame(drawMandala);
}

animationId = requestAnimationFrame(drawMandala);
window.currentAnimationId = animationId;`
    },

    waveVisualizer: {
        name: "Wave Visualizer",
        code: `// Wave Visualizer
if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

const ctx = new WebGLCanvas(canvas);
// const ctx = canvas.getContext('2d'); // Uncomment for regular canvas

let time = 0;
const waves = [];
let animationId;

// Create multiple wave layers
for (let i = 0; i < 5; i++) {
    waves.push({
        amplitude: 50 + i * 20,
        frequency: 0.01 + i * 0.003,
        phase: i * Math.PI / 3,
        speed: 0.02 + i * 0.01,
        color: \`hsl(\${i * 60}, 70%, 60%)\`,
        alpha: 0.8 - i * 0.1
    });
}

function drawWaves() {
    ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    time += 0.02;
    
    waves.forEach(wave => {
        ctx.strokeStyle = wave.color;
        ctx.globalAlpha = wave.alpha;
        ctx.lineWidth = 3;
        
        const points = [];
        const centerY = canvas.height / 2;
        
        // Calculate wave points
        for (let x = 0; x <= canvas.width; x += 5) {
            const y = centerY + Math.sin(x * wave.frequency + time * wave.speed + wave.phase) * wave.amplitude;
            points.push({x, y});
        }
        
        // Draw the wave
        if (points.length > 1) {
            if (ctx.drawLine) {
                for (let i = 1; i < points.length; i++) {
                    ctx.drawLine(points[i-1].x, points[i-1].y, points[i].x, points[i].y);
                }
            } else {
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.stroke();
            }
        }
        
        // Add some sparkle effects
        for (let x = 0; x < canvas.width; x += 30) {
            const y = centerY + Math.sin(x * wave.frequency + time * wave.speed + wave.phase) * wave.amplitude;
            const sparkleSize = 2 + Math.sin(time * 3 + x * 0.1) * 1;
            
            ctx.fillStyle = wave.color;
            if (ctx.fillCircle) {
                ctx.fillCircle(x, y, sparkleSize);
            } else {
                ctx.beginPath();
                ctx.arc(x, y, sparkleSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });
    
    ctx.globalAlpha = 1.0;
    if (ctx.flush) ctx.flush();
    animationId = requestAnimationFrame(drawWaves);
}

animationId = requestAnimationFrame(drawWaves);
window.currentAnimationId = animationId;`
    },

    bouncingImages: {
        name: "Bouncing Images",
        code: `// Bouncing Images with WebGL Canvas
if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

const ctx = new WebGLCanvas(canvas);
// const ctx = canvas.getContext('2d'); // Uncomment for regular canvas

class BouncingImage {
    constructor(image) {
        this.image = image;
        this.x = Math.random() * (canvas.width - 64);
        this.y = Math.random() * (canvas.height - 64);
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.width = 64;
        this.height = 64;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.scale = 0.8 + Math.random() * 0.4;
        this.alpha = 0.8 + Math.random() * 0.2;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        
        // Bounce off walls
        if (this.x <= 0 || this.x >= canvas.width - this.width) {
            this.vx *= -1;
            this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
        }
        if (this.y <= 0 || this.y >= canvas.height - this.height) {
            this.vy *= -1;
            this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));
        }
    }
    
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        
        if (this.image) {
            ctx.drawImage(
                this.image, 
                -this.width/2, 
                -this.height/2, 
                this.width, 
                this.height
            );
        } else {
            // Fallback colored rectangle
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        }
        
        ctx.restore();
    }
}

let bouncingImages = [];
let logoImage = null;
let animationId;

// Load the image
logoImage = new Image();
logoImage.onload = () => {
    // Create multiple bouncing instances
    for (let i = 0; i < 8; i++) {
        bouncingImages.push(new BouncingImage(logoImage));
    }
    animate();
};
logoImage.onerror = () => {
    console.error('Could not load logo.png - using colored rectangles instead');
    // Fallback: create colored rectangles instead of images
    for (let i = 0; i < 8; i++) {
        const fallback = new BouncingImage(null);
        fallback.color = \`hsl(\${i * 45}, 70%, 60%)\`;
        bouncingImages.push(fallback);
    }
    animate();
};
logoImage.src = 'Images/logo.png';

function animate() {
    ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    bouncingImages.forEach(bouncer => {
        bouncer.update();
        bouncer.draw();
    });
    
    if (ctx.flush) ctx.flush();
    animationId = requestAnimationFrame(animate);
}

// Add more images on click
canvas.addEventListener('click', () => {
    if (logoImage && logoImage.complete) {
        bouncingImages.push(new BouncingImage(logoImage));
    } else {
        const fallback = new BouncingImage(null);
        fallback.color = \`hsl(\${Math.random() * 360}, 70%, 60%)\`;
        bouncingImages.push(fallback);
    }
});

window.currentAnimationId = animationId;`
    },

    shaderWaves: {
        name: "Shader Waves",
        code: `// Custom Shader Example - Wave Effect
const ctx = new WebGLCanvas(canvas);

// Check if WebGL is available and shaders are supported
if (!ctx.gl || !ctx.addShader) {
    console.log('WebGL not available, using fallback animation');
    
    // Fallback to regular canvas animation
    if (window.currentAnimationId) {
        cancelAnimationFrame(window.currentAnimationId);
    }
    
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        time += 0.02;
        
        // Draw animated waves without shaders
        for (let layer = 0; layer < 3; layer++) {
            ctx.strokeStyle = \`hsl(\${layer * 120 + time * 50}, 70%, 60%)\`;
            ctx.lineWidth = 3;
            
            if (ctx.drawLine) {
                const points = [];
                for (let x = 0; x <= canvas.width; x += 5) {
                    const y = canvas.height/2 + Math.sin(x * 0.02 + time + layer) * (30 + layer * 10);
                    points.push({x, y});
                }
                for (let i = 1; i < points.length; i++) {
                    ctx.drawLine(points[i-1].x, points[i-1].y, points[i].x, points[i].y);
                }
            } else {
                ctx.beginPath();
                for (let x = 0; x <= canvas.width; x += 2) {
                    const y = canvas.height/2 + Math.sin(x * 0.02 + time + layer) * (30 + layer * 10);
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        }
        
        if (ctx.flush) ctx.flush();
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    return;
}

// Custom wave shader
const waveVertexShader = \`
precision mediump float;
attribute vec2 a_position;
attribute vec4 a_color;
uniform vec2 u_resolution;
uniform float u_time;
varying vec4 v_color;
varying vec2 v_position;

void main() {
    vec2 normalized = (a_position / u_resolution) * 2.0 - 1.0;
    normalized.y = -normalized.y;
    
    // Add wave displacement
    float wave = sin(normalized.x * 10.0 + u_time) * 0.1;
    normalized.y += wave;
    
    gl_Position = vec4(normalized, 0, 1);
    v_color = a_color;
    v_position = normalized;
}
\`;

const waveFragmentShader = \`
precision mediump float;
uniform float u_time;
varying vec4 v_color;
varying vec2 v_position;

void main() {
    float r = 0.5 + 0.5 * sin(u_time + v_position.x * 5.0);
    float g = 0.5 + 0.5 * sin(u_time + v_position.y * 5.0 + 2.0);
    float b = 0.5 + 0.5 * sin(u_time + v_position.x * 3.0 + v_position.y * 3.0 + 4.0);
    
    gl_FragColor = vec4(r, g, b, v_color.a);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

try {
    ctx.addShader('waves', waveVertexShader, waveFragmentShader);
    
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear();
        time += 0.02;
        
        // Use the shader
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('waves', quad.vertices, quad.indices, {
            u_time: time
        });
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed, using fallback:', error);
    
    // Fallback animation
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        time += 0.02;
        
        // Draw colorful rectangles as fallback
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 8; j++) {
                const x = i * (canvas.width / 10);
                const y = j * (canvas.height / 8);
                const width = canvas.width / 10 - 2;
                const height = canvas.height / 8 - 2;
                
                const hue = (i * 36 + j * 45 + time * 50) % 360;
                ctx.fillStyle = \`hsl(\${hue}, 70%, 60%)\`;
                ctx.fillRect(x, y, width, height);
            }
        }
        
        if (ctx.flush) ctx.flush();
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
    },

    shaderPlasma: {
        name: "Shader Plasma Effect",
        code: `// Plasma Effect Shader
const ctx = new WebGLCanvas(canvas);

// Check if WebGL is available and shaders are supported
if (!ctx.gl || !ctx.addShader) {
    console.log('WebGL not available, using fallback animation');
    
    if (window.currentAnimationId) {
        cancelAnimationFrame(window.currentAnimationId);
    }
    
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        time += 0.02;
        
        // Fallback plasma effect using regular drawing
        const cols = 40;
        const rows = 30;
        const cellWidth = canvas.width / cols;
        const cellHeight = canvas.height / rows;
        
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const uv_x = i / cols;
                const uv_y = j / rows;
                
                let plasma = 0;
                plasma += Math.sin(uv_x * 10 + time);
                plasma += Math.sin(uv_y * 8 + time * 1.2);
                plasma += Math.sin((uv_x + uv_y) * 6 + time * 1.5);
                plasma += Math.sin(Math.sqrt((uv_x - 0.5) * (uv_x - 0.5) + (uv_y - 0.5) * (uv_y - 0.5)) * 12 + time * 2);
                plasma = plasma / 4;
                
                const r = Math.floor((0.5 + 0.5 * Math.sin(plasma + time)) * 255);
                const g = Math.floor((0.5 + 0.5 * Math.sin(plasma + time + 2)) * 255);
                const b = Math.floor((0.5 + 0.5 * Math.sin(plasma + time + 4)) * 255);
                
                ctx.fillStyle = \`rgb(\${r}, \${g}, \${b})\`;
                ctx.fillRect(i * cellWidth, j * cellHeight, cellWidth, cellHeight);
            }
        }
        
        if (ctx.flush) ctx.flush();
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    return;
}

const plasmaVertexShader = \`
precision mediump float;
attribute vec2 a_position;
attribute vec4 a_color;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_uv;

void main() {
    vec2 normalized = (a_position / u_resolution) * 2.0 - 1.0;
    normalized.y = -normalized.y;
    
    gl_Position = vec4(normalized, 0, 1);
    v_color = a_color;
    v_uv = a_position / u_resolution;
}
\`;

const plasmaFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_uv;

void main() {
    vec2 uv = v_uv;
    
    // Create plasma effect
    float plasma = 0.0;
    plasma += sin(uv.x * 10.0 + u_time);
    plasma += sin(uv.y * 8.0 + u_time * 1.2);
    plasma += sin((uv.x + uv.y) * 6.0 + u_time * 1.5);
    plasma += sin(length(uv - 0.5) * 12.0 + u_time * 2.0);
    
    // Normalize and create colors
    plasma = plasma / 4.0;
    
    vec3 color;
    color.r = 0.5 + 0.5 * sin(plasma + u_time);
    color.g = 0.5 + 0.5 * sin(plasma + u_time + 2.0);
    color.b = 0.5 + 0.5 * sin(plasma + u_time + 4.0);
    
    gl_FragColor = vec4(color * v_color.rgb, v_color.a);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

try {
    ctx.addShader('plasma', plasmaVertexShader, plasmaFragmentShader);

    let time = 0;
    let animationId;

    function animate() {
        ctx.clear();
        time += 0.02;
        
        // Fill the entire canvas with one big rectangle using the shader
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('plasma', quad.vertices, quad.indices, {
            u_time: time
        });
        
        animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
}`
    },

    shaderDistortion: {
        name: "Shader Distortion",
        code: `// Distortion Shader Effect
const ctx = new WebGLCanvas(canvas);

// Check if WebGL is available and shaders are supported
if (!ctx.gl || !ctx.addShader) {
    console.log('WebGL not available, using fallback animation');
    
    if (window.currentAnimationId) {
        cancelAnimationFrame(window.currentAnimationId);
    }
    
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        time += 0.02;
        
        // Fallback distortion effect using regular drawing
        const cols = 20;
        const rows = 15;
        const cellWidth = canvas.width / cols;
        const cellHeight = canvas.height / rows;
        
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const x = i * cellWidth;
                const y = j * cellHeight;
                const hue = (i + j) * 20 + time * 50;
                
                ctx.fillStyle = \`hsl(\${hue % 360}, 70%, 60%)\`;
                ctx.fillRect(x, y, cellWidth - 1, cellHeight - 1);
            }
        }
        
        if (ctx.flush) ctx.flush();
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    return;
}

const distortionVertexShader = \`
precision mediump float;
attribute vec2 a_position;
attribute vec4 a_color;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
varying vec4 v_color;
varying vec2 v_position;
varying vec2 v_uv;

void main() {
    vec2 uv = a_position / u_resolution;
    
    // Apply mouse-based distortion
    vec2 mouseUV = u_mouse / u_resolution;
    float dist = distance(uv, mouseUV);
    float strength = 1.0 / (1.0 + dist * 10.0);
    
    // Distort based on mouse position and time
    vec2 distortion = vec2(
        sin(u_time + dist * 20.0) * strength * 0.05,
        cos(u_time + dist * 15.0) * strength * 0.05
    );
    
    vec2 distortedPos = a_position + distortion * 50.0;
    vec2 normalized = (distortedPos / u_resolution) * 2.0 - 1.0;
    normalized.y = -normalized.y;
    
    gl_Position = vec4(normalized, 0, 1);
    v_color = a_color;
    v_position = normalized;
    v_uv = uv;
}
\`;

const distortionFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_position;
varying vec2 v_uv;

void main() {
    vec2 mouseUV = u_mouse / u_resolution;
    float dist = distance(v_uv, mouseUV);
    
    // Create ripple effect around mouse
    float ripple = sin(dist * 30.0 - u_time * 5.0) * exp(-dist * 5.0);
    
    // Color based on ripple and base color
    vec3 color = v_color.rgb;
    color += ripple * 0.3;
    color *= (1.0 + ripple * 0.5);
    
    gl_FragColor = vec4(color, v_color.a);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

try {
    ctx.addShader('distortion', distortionVertexShader, distortionFragmentShader);

    let time = 0;
    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;
    let animationId;

    // Mouse tracking
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    function animate() {
        ctx.clear();
        time += 0.02;
        
        // Fill the entire canvas with one big rectangle using the shader
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('distortion', quad.vertices, quad.indices, {
            u_time: time,
            u_mouse: [mouseX, mouseY],
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
    
    // Fallback animation
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        time += 0.02;
        
        // Draw colorful rectangles as fallback
        for (let i = 0; i < 20; i++) {
            for (let j = 0; j < 15; j++) {
                const x = i * (canvas.width / 20);
                const y = j * (canvas.height / 15);
                const width = canvas.width / 20 - 2;
                const height = canvas.height / 15 - 2;
                
                const hue = (i * 36 + j * 24 + time * 50) % 360;
                ctx.fillStyle = \`hsl(\${hue}, 70%, 60%)\`;
                ctx.fillRect(x, y, width, height);
            }
        }
        
        if (ctx.flush) ctx.flush();
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
    },

    shaderKaleidoscope: {
        name: "Shader Kaleidoscope",
        code: `// Kaleidoscope Shader Effect
const ctx = new WebGLCanvas(canvas);

// Check if WebGL is available and shaders are supported
if (!ctx.gl || !ctx.addShader) {
    console.log('WebGL not available, using fallback animation');
    
    if (window.currentAnimationId) {
        cancelAnimationFrame(window.currentAnimationId);
    }
    
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        time += 0.01;
        
        // Fallback kaleidoscope effect using regular drawing
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const segments = 8;
        
        for (let segment = 0; segment < segments; segment++) {
            const angle = (segment / segments) * Math.PI * 2;
            const radius = 100;
            
            ctx.strokeStyle = \`hsl(\${(segment * 45 + time * 100) % 360}, 70%, 60%)\`;
            ctx.lineWidth = 3;
            
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle + Math.PI) * radius;
            const y2 = centerY + Math.sin(angle + Math.PI) * radius;
            
            if (ctx.drawLine) {
                ctx.drawLine(x1, y1, x2, y2);
            } else {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
        
        if (ctx.flush) ctx.flush();
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    return;
}

const kaleidoscopeVertexShader = \`
precision mediump float;
attribute vec2 a_position;
attribute vec4 a_color;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_uv;

void main() {
    vec2 normalized = (a_position / u_resolution) * 2.0 - 1.0;
    normalized.y = -normalized.y;
    
    gl_Position = vec4(normalized, 0, 1);
    v_color = a_color;
    v_uv = a_position / u_resolution;
}
\`;

const kaleidoscopeFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_uv;

#define PI 3.14159265359

vec2 kaleidoscope(vec2 uv, float segments) {
    vec2 center = vec2(0.5, 0.5);
    vec2 pos = uv - center;
    
    float radius = length(pos);
    float angle = atan(pos.y, pos.x);
    
    // Create kaleidoscope effect
    float segment = PI * 2.0 / segments;
    angle = mod(angle, segment);
    if (mod(floor(atan(pos.y, pos.x) / segment), 2.0) == 1.0) {
        angle = segment - angle;
    }
    
    return vec2(cos(angle), sin(angle)) * radius + center;
}

void main() {
    vec2 uv = v_uv;
    
    // Apply kaleidoscope transformation
    vec2 kUv = kaleidoscope(uv, 8.0);
    
    // Create animated pattern
    float pattern = 0.0;
    pattern += sin(kUv.x * 20.0 + u_time);
    pattern += cos(kUv.y * 15.0 + u_time * 1.3);
    pattern += sin((kUv.x + kUv.y) * 10.0 + u_time * 0.8);
    
    // Add radial component
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(kUv, center);
    pattern += sin(dist * 25.0 - u_time * 2.0);
    
    pattern = pattern / 4.0;
    
    // Create rainbow colors
    vec3 color;
    color.r = 0.5 + 0.5 * sin(pattern + u_time);
    color.g = 0.5 + 0.5 * sin(pattern + u_time + 2.094);
    color.b = 0.5 + 0.5 * sin(pattern + u_time + 4.188);
    
    // Add some brightness variation
    float brightness = 0.8 + 0.2 * sin(pattern * 3.0);
    color *= brightness;
    
    gl_FragColor = vec4(color, v_color.a);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

try {
    ctx.addShader('kaleidoscope', kaleidoscopeVertexShader, kaleidoscopeFragmentShader);

    let time = 0;
    let animationId;

    function animate() {
        ctx.clear();
        time += 0.01;
        
        // Fill the entire canvas with one big rectangle using the shader
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('kaleidoscope', quad.vertices, quad.indices, {
            u_time: time,
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
    
    // Fallback animation
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        time += 0.01;
        
        // Draw kaleidoscope pattern as fallback
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        for (let layer = 0; layer < 8; layer++) {
            const radius = (layer + 1) * 20;
            const points = 6 + layer;
            
            ctx.strokeStyle = \`hsl(\${(layer * 45 + time * 100) % 360}, 70%, 60%)\`;
            ctx.lineWidth = 2;
            
            for (let i = 0; i < points; i++) {
                const angle1 = (i / points) * Math.PI * 2 + time;
                const angle2 = ((i + 1) / points) * Math.PI * 2 + time;
                
                const x1 = centerX + Math.cos(angle1) * radius;
                const y1 = centerY + Math.sin(angle1) * radius;
                const x2 = centerX + Math.cos(angle2) * radius;
                const y2 = centerY + Math.sin(angle2) * radius;
                
                if (ctx.drawLine) {
                    ctx.drawLine(x1, y1, x2, y2);
                } else {
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
            }
        }
        
        if (ctx.flush) ctx.flush();
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
    }
};