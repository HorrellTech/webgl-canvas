window.Examples = {
    basicShapes: {
        name: "Basic Shapes",
        code: `// Basic shapes example - works with both WebGL and Canvas 2D
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );
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
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );
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

const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );
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
    let attempts = 0;
    const maxAttempts = 1000; // Prevent infinite loop if snake fills the board
    
    do {
        food = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
        attempts++;
        
        // If we've tried too many times, force a position (e.g., top-left corner)
        if (attempts >= maxAttempts) {
            food = { x: 0, y: 0 }; // Fallback: place in corner
            console.warn("Could not find free spot for food; placing in corner.");
            break;
        }
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

    particleSystem: {
        name: "Particle System",
        code: `// Particle System
if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );
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

const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );
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

const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );
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

const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );
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

const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );
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

const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );
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

const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );
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

const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );
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

const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );
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
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

// Custom wave shader
const waveVertexShader = \`
precision mediump float;
attribute vec2 a_position;
attribute vec4 a_color;
uniform vec2 u_resolution;
uniform float u_time;
varying vec4 v_color;
varying vec2 v_position;
varying vec2 v_uv;

void main() {
    vec2 uv = a_position / u_resolution;
    vec2 normalized = (a_position / u_resolution) * 2.0 - 1.0;
    normalized.y = -normalized.y;
    
    gl_Position = vec4(normalized, 0.0, 1.0);
    v_color = a_color;
    v_position = normalized;
    v_uv = uv;
}
\`;

const waveFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_position;
varying vec2 v_uv;

void main() {
    vec2 uv = v_uv;
    
    // Create multiple wave layers
    float wave1 = sin(uv.x * 15.0 + u_time * 2.0) * 0.5;
    float wave2 = sin(uv.x * 8.0 + u_time * 1.5) * 0.3;
    float wave3 = sin(uv.x * 25.0 + u_time * 3.0) * 0.2;
    
    // Combine waves
    float totalWave = wave1 + wave2 + wave3;
    
    // Apply wave distortion to UV coordinates
    vec2 distortedUV = uv;
    distortedUV.y += totalWave * 0.1;
    
    // Create wave-based colors
    float r = 0.5 + 0.5 * sin(u_time + distortedUV.x * 8.0 + totalWave * 5.0);
    float g = 0.5 + 0.5 * sin(u_time + distortedUV.y * 6.0 + totalWave * 3.0 + 2.0);
    float b = 0.5 + 0.5 * sin(u_time + (distortedUV.x + distortedUV.y) * 4.0 + totalWave * 7.0 + 4.0);
    
    // Add wave intensity based on distance from wave peak
    float waveIntensity = 1.0 + totalWave * 0.5;
    
    // Create visible wave bands
    float bands = sin((distortedUV.y + totalWave * 0.2) * 20.0) * 0.2 + 0.8;
    
    vec3 color = vec3(r, g, b) * waveIntensity * bands;
    
    gl_FragColor = vec4(color, v_color.a);
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
            u_time: time,
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed, using fallback:', error);
    
    // Fallback animation with visible waves
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        time += 0.02;
        
        // Draw waving rectangles as fallback
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 8; j++) {
                const baseX = i * (canvas.width / 10);
                const baseY = j * (canvas.height / 8);
                
                // Apply wave displacement
                const wave = Math.sin(time + i * 0.5) * 20;
                const x = baseX;
                const y = baseY + wave;
                
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
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

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
    
    gl_Position = vec4(normalized, 0.0, 1.0);
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
    plasma += sin(distance(uv, vec2(0.5)) * 12.0 + u_time * 2.0);
    
    // Normalize plasma
    plasma = plasma * 0.25;
    
    // Create colors with better phase offsets
    vec3 color;
    color.r = 0.5 + 0.5 * sin(plasma + u_time);
    color.g = 0.5 + 0.5 * sin(plasma + u_time + 2.094);
    color.b = 0.5 + 0.5 * sin(plasma + u_time + 4.188);
    
    gl_FragColor = vec4(color, v_color.a);
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
            u_time: time,
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
    // Fallback to regular canvas animation if shader fails
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        time += 0.02;
        
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
}`
},

    shaderDistortion: {
        name: "Shader Distortion",
        code: `// Distortion Shader Effect
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

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
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

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
    float segment = PI * 4.0 / segments;
    angle = mod(angle, segment);
    if (mod(floor(atan(pos.y, pos.x) / segment), 2.0) == 1.0) {
        angle = segment - angle;
    }
    
    return vec2(cos(angle), sin(angle)) * radius + center;
}

void main() {
    vec2 uv = v_uv;
    
    // Apply kaleidoscope transformation
    vec2 kUv = kaleidoscope(uv, 30.0);
    
    // Create animated pattern
    float pattern = 0.0;
    pattern += sin(kUv.x * 40.0 + u_time);
    pattern += cos(kUv.y * 25.0 + u_time * 1.3);
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
        time += 0.1;
        
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
    },
    shaderTunnel: {
    name: "Shader Tunnel",
    code: `// Tunnel Shader Effect
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

const tunnelVertexShader = \`
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

const tunnelFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_uv;

#define PI 3.14159265359

void main() {
    vec2 center = vec2(0.5, 0.5);
    vec2 pos = v_uv - center;
    
    float radius = length(pos);
    float angle = atan(pos.y, pos.x);
    
    // Create tunnel effect
    float tunnel = 1.0 / radius;
    tunnel += u_time * 2.0;
    
    // Create rotating spiral pattern
    float spiral = sin(angle * 8.0 + tunnel * 4.0);
    
    // Add pulsing rings
    float rings = sin(tunnel * 15.0 - u_time * 5.0);
    
    // Combine effects
    float pattern = spiral * rings;
    
    // Create colors that shift through the tunnel
    vec3 color;
    color.r = 0.5 + 0.5 * sin(pattern + u_time);
    color.g = 0.5 + 0.5 * sin(pattern + u_time + 2.094);
    color.b = 0.5 + 0.5 * sin(pattern + u_time + 4.188);
    
    // Fade edges to black for tunnel effect
    float vignette = 1.0 - smoothstep(0.3, 0.7, radius);
    color *= vignette;
    
    gl_FragColor = vec4(color, v_color.a);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

try {
    ctx.addShader('tunnel', tunnelVertexShader, tunnelFragmentShader);

    let time = 0;
    let animationId;

    function animate() {
        ctx.clear();
        time += 0.03;
        
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('tunnel', quad.vertices, quad.indices, {
            u_time: time,
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
    // Fallback tunnel effect
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        time += 0.03;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        for (let ring = 1; ring < 20; ring++) {
            const radius = ring * 15 + (time * 50) % 300;
            const alpha = 1 - (radius / 300);
            
            if (alpha > 0) {
                ctx.strokeStyle = \`hsla(\${(ring * 30 + time * 100) % 360}, 70%, 60%, \${alpha})\`;
                ctx.lineWidth = 3;
                
                if (ctx.strokeCircle) {
                    ctx.strokeCircle(centerX, centerY, radius);
                } else {
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
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
},

shaderMatrix: {
    name: "Shader Matrix Rain",
    code: `// Matrix Rain Shader Effect
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

const matrixVertexShader = \`
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

const matrixFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_uv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = v_uv;
    
    // Create grid
    vec2 grid = floor(uv * vec2(30.0, 60.0));
    
    // Create falling effect
    float fall = mod(grid.y + u_time * 5.0 + random(vec2(grid.x, 0.0)) * 10.0, 60.0);
    
    // Create character-like pattern
    float char = step(0.5, random(grid + floor(u_time * 20.0)));
    
    // Create trail effect
    float trail = 1.0 - (fall / 60.0);
    trail = pow(trail, 3.0);
    
    // Matrix green color
    vec3 color = vec3(0.0, 1.0, 0.2) * char * trail;
    
    // Add bright head of each column
    if (fall < 3.0) {
        color = vec3(1.0, 1.0, 1.0) * char;
    }
    
    // Random flicker
    color *= 0.7 + 0.3 * random(grid + u_time);
    
    gl_FragColor = vec4(color, 1.0);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

try {
    ctx.addShader('matrix', matrixVertexShader, matrixFragmentShader);

    let time = 0;
    let animationId;

    function animate() {
        ctx.clear();
        time += 0.016;
        
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('matrix', quad.vertices, quad.indices, {
            u_time: time,
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
    // Fallback matrix effect
    let time = 0;
    let animationId;
    const columns = Math.floor(canvas.width / 20);
    const drops = Array(columns).fill(0);
    
    function animate() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#0F0';
        ctx.font = '15px monospace';
        
        for (let i = 0; i < drops.length; i++) {
            const text = String.fromCharCode(Math.random() * 128);
            const x = i * 20;
            const y = drops[i] * 20;
            
            if (ctx.fillText) {
                ctx.fillText(text, x, y);
            }
            
            if (y > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
        
        if (ctx.flush) ctx.flush();
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
},

shaderFractal: {
    name: "Shader Fractal",
    code: `// Fractal Shader Effect
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

const fractalVertexShader = \`
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

const fractalFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_uv;

vec2 complexMul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

void main() {
    vec2 uv = (v_uv - 0.5) * 4.0;
    
    // Animated Julia set parameters
    vec2 c = vec2(
        0.7885 * cos(u_time * 0.5),
        0.7885 * sin(u_time * 0.3)
    );
    
    vec2 z = uv;
    float iterations = 0.0;
    
    // Julia set iteration
    for (int i = 0; i < 64; i++) {
        if (length(z) > 2.0) break;
        z = complexMul(z, z) + c;
        iterations += 1.0;
    }
    
    // Color based on iteration count
    float t = iterations / 64.0;
    
    vec3 color1 = vec3(0.0, 0.0, 0.5);
    vec3 color2 = vec3(0.0, 0.5, 1.0);
    vec3 color3 = vec3(1.0, 1.0, 0.0);
    vec3 color4 = vec3(1.0, 0.0, 0.0);
    
    vec3 color;
    if (t < 0.33) {
        color = mix(color1, color2, t * 3.0);
    } else if (t < 0.66) {
        color = mix(color2, color3, (t - 0.33) * 3.0);
    } else {
        color = mix(color3, color4, (t - 0.66) * 3.0);
    }
    
    // Add some glow
    color *= 1.0 + 0.5 * sin(u_time + t * 10.0);
    
    gl_FragColor = vec4(color, 1.0);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

try {
    ctx.addShader('fractal', fractalVertexShader, fractalFragmentShader);

    let time = 0;
    let animationId;

    function animate() {
        ctx.clear();
        time += 0.02;
        
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('fractal', quad.vertices, quad.indices, {
            u_time: time,
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
    // Fallback fractal-like pattern
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        time += 0.02;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        for (let i = 0; i < 100; i++) {
            const angle = i * 0.1 + time;
            const radius = i * 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            const hue = (i * 10 + time * 100) % 360;
            ctx.fillStyle = \`hsl(\${hue}, 70%, 60%)\`;
            
            if (ctx.fillCircle) {
                ctx.fillCircle(x, y, 3);
            } else {
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        if (ctx.flush) ctx.flush();
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
},

shaderNoise: {
    name: "Shader Noise Field",
    code: `// Noise Field Shader Effect
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

const noiseVertexShader = \`
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

const noiseFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_uv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) +
           (c - a) * u.y * (1.0 - u.x) +
           (d - b) * u.x * u.y;
}

float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    
    for (int i = 0; i < 6; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

void main() {
    vec2 uv = v_uv * 8.0;
    
    // Moving noise
    vec2 q = vec2(
        fbm(uv + u_time * 0.1),
        fbm(uv + vec2(1.0))
    );
    
    vec2 r = vec2(
        fbm(uv + 1.0 * q + vec2(1.7, 9.2) + 0.15 * u_time),
        fbm(uv + 1.0 * q + vec2(8.3, 2.8) + 0.126 * u_time)
    );
    
    float f = fbm(uv + r);
    
    // Create flowing colors
    vec3 color = mix(
        vec3(0.101961, 0.619608, 0.666667),
        vec3(0.666667, 0.666667, 0.498039),
        clamp((f * f) * 4.0, 0.0, 1.0)
    );
    
    color = mix(
        color,
        vec3(0.0, 0.0, 0.164706),
        clamp(length(q), 0.0, 1.0)
    );
    
    color = mix(
        color,
        vec3(0.666667, 1.0, 1.0),
        clamp(length(r.x), 0.0, 1.0)
    );
    
    gl_FragColor = vec4((f * f * f + 0.6 * f * f + 0.5 * f) * color, 1.0);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

try {
    ctx.addShader('noise', noiseVertexShader, noiseFragmentShader);

    let time = 0;
    let animationId;

    function animate() {
        ctx.clear();
        time += 0.016;
        
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('noise', quad.vertices, quad.indices, {
            u_time: time,
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
    // Fallback noise-like pattern
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        time += 0.016;
        
        const gridSize = 10;
        
        for (let x = 0; x < canvas.width; x += gridSize) {
            for (let y = 0; y < canvas.height; y += gridSize) {
                const noise = Math.sin(x * 0.01 + time) * Math.cos(y * 0.01 + time);
                const brightness = (noise + 1) * 0.5;
                const color = Math.floor(brightness * 255);
                
                ctx.fillStyle = \`rgb(\${color}, \${color * 0.8}, \${color * 1.2})\`;
                ctx.fillRect(x, y, gridSize, gridSize);
            }
        }
        
        if (ctx.flush) ctx.flush();
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
},

shaderLightning: {
    name: "Shader Lightning",
    code: `// Lightning Shader Effect
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

const lightningVertexShader = \`
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

const lightningFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_uv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float lightning(vec2 uv, float time) {
    float x = uv.x;
    float y = uv.y;
    
    // Create jagged lightning path
    float path = 0.5;
    path += 0.1 * sin(x * 10.0 + time * 3.0);
    path += 0.05 * sin(x * 25.0 + time * 7.0);
    path += 0.02 * sin(x * 50.0 + time * 13.0);
    
    // Distance from lightning path
    float dist = abs(y - path);
    
    // Create lightning bolt
    float bolt = 1.0 / (dist * 100.0 + 1.0);
    
    // Add flickering
    bolt *= 0.8 + 0.2 * random(vec2(time * 10.0, x * 50.0));
    
    return bolt;
}

void main() {
    vec2 uv = v_uv;
    
    // Create multiple lightning bolts
    float bolt1 = lightning(uv, u_time);
    float bolt2 = lightning(uv + vec2(0.0, 0.3), u_time + 1.0);
    float bolt3 = lightning(uv + vec2(0.0, -0.2), u_time + 2.0);
    
    float totalBolt = max(max(bolt1, bolt2), bolt3);
    
    // Lightning color (blue-white)
    vec3 color = vec3(0.5, 0.8, 1.0) * totalBolt;
    color += vec3(1.0, 1.0, 1.0) * totalBolt * totalBolt;
    
    // Add atmospheric glow
    float glow = 0.1 / (abs(uv.y - 0.5) * 5.0 + 1.0);
    color += vec3(0.2, 0.3, 0.8) * glow;
    
    // Dark stormy background
    vec3 background = vec3(0.1, 0.1, 0.2);
    background += 0.05 * random(uv + u_time);
    
    color = mix(background, color, clamp(totalBolt + glow, 0.0, 1.0));
    
    gl_FragColor = vec4(color, 1.0);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

try {
    ctx.addShader('lightning', lightningVertexShader, lightningFragmentShader);

    let time = 0;
    let animationId;

    function animate() {
        ctx.clear();
        time += 0.03;
        
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('lightning', quad.vertices, quad.indices, {
            u_time: time,
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
    // Fallback lightning effect
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        time += 0.03;
        
        // Dark background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw lightning-like lines
        ctx.strokeStyle = '#87ceeb';
        ctx.lineWidth = 3;
        
        const points = [];
        const startY = canvas.height * 0.3;
        
        for (let x = 0; x <= canvas.width; x += 20) {
            const y = startY + Math.sin(x * 0.01 + time * 3) * 50 + 
                     Math.random() * 30 - 15;
            points.push({x, y});
        }
        
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
        
        if (ctx.flush) ctx.flush();
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
},
shaderWaterSplash: {
    name: "Interactive Water Splash",
    code: `// Interactive Water Splash Shader
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

const waterVertexShader = \`
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

const waterFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_splash;
varying vec4 v_color;
varying vec2 v_uv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    vec2 uv = v_uv;
    vec2 mouseUV = u_mouse / u_resolution;
    
    // Base water flow
    vec2 flowUV = uv;
    flowUV += vec2(noise(uv * 3.0 + u_time * 0.1), noise(uv * 3.0 + u_time * 0.15)) * 0.1;
    
    // Distance from mouse for splash effect
    float mouseDist = distance(uv, mouseUV);
    
    // Create ripples from mouse position
    float ripple = sin(mouseDist * 30.0 - u_time * 10.0) * exp(-mouseDist * 8.0) * u_splash;
    
    // Water surface distortion
    vec2 distortion = vec2(
        sin(flowUV.x * 20.0 + u_time) * 0.01,
        cos(flowUV.y * 15.0 + u_time * 1.2) * 0.01
    ) + ripple * 0.05;
    
    vec2 finalUV = uv + distortion;
    
    // Base water color
    vec3 waterColor = vec3(0.1, 0.4, 0.8);
    
    // Add flow patterns
    float flow = noise(finalUV * 8.0 + u_time * 0.2);
    waterColor = mix(waterColor, vec3(0.2, 0.6, 1.0), flow);
    
    // Add mouse splash color
    float splashIntensity = 1.0 - smoothstep(0.0, 0.3, mouseDist);
    vec3 splashColor = vec3(
        0.5 + 0.5 * sin(u_time * 3.0),
        0.5 + 0.5 * sin(u_time * 3.0 + 2.0),
        0.5 + 0.5 * sin(u_time * 3.0 + 4.0)
    );
    
    waterColor = mix(waterColor, splashColor, splashIntensity * u_splash);
    
    // Add foam and bubbles
    float foam = step(0.7, noise(finalUV * 20.0 + u_time));
    waterColor = mix(waterColor, vec3(1.0), foam * 0.3);
    
    // Add shimmer
    float shimmer = sin(finalUV.x * 50.0 + u_time * 5.0) * sin(finalUV.y * 40.0 + u_time * 4.0);
    waterColor += shimmer * 0.1;
    
    gl_FragColor = vec4(waterColor, 1.0);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
let splashStrength = 0.0;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    splashStrength = Math.min(splashStrength + 0.3, 1.0);
});

canvas.addEventListener('click', () => {
    splashStrength = 1.0;
});

try {
    ctx.addShader('waterSplash', waterVertexShader, waterFragmentShader);

    let time = 0;
    let animationId;

    function animate() {
        ctx.clear();
        time += 0.016;
        splashStrength *= 0.95; // Fade splash effect
        
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('waterSplash', quad.vertices, quad.indices, {
            u_time: time,
            u_mouse: [mouseX, mouseY],
            u_splash: splashStrength,
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
    // Water fallback effect
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear();
        time += 0.016;
        
        // Draw wavy water pattern
        for (let y = 0; y < canvas.height; y += 10) {
            ctx.strokeStyle = \`hsl(\${200 + Math.sin(time + y * 0.01) * 20}, 70%, 50%)\`;
            ctx.lineWidth = 8;
            
            const points = [];
            for (let x = 0; x <= canvas.width; x += 20) {
                const wave = Math.sin(x * 0.01 + time + y * 0.005) * 5;
                points.push({x, y: y + wave});
            }
            
            if (points.length > 1) {
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.stroke();
            }
        }
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
},

shaderFireEffect: {
    name: "Shader Fire Effect",
    code: `// Fire Effect Shader
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

const fireVertexShader = \`
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

const fireFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_uv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 6; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main() {
    vec2 uv = v_uv;
    
    // Create upward flowing motion
    vec2 fireUV = uv;
    fireUV.y -= u_time * 0.5;
    
    // Add turbulence
    float turbulence = fbm(fireUV * 3.0);
    fireUV.x += turbulence * 0.1;
    
    // Create fire shape (stronger at bottom, fading at top)
    float fireShape = (1.0 - uv.y) * (1.0 - uv.y);
    fireShape *= (0.5 + 0.5 * sin(uv.x * 20.0)) * 0.3 + 0.7;
    
    // Fire noise pattern
    float fireNoise = fbm(fireUV * 8.0 + u_time);
    fireNoise *= fireShape;
    
    // Create fire colors
    vec3 color = vec3(0.0);
    
    if (fireNoise > 0.1) {
        // Hot core (white/yellow)
        if (fireNoise > 0.6) {
            color = mix(vec3(1.0, 1.0, 0.8), vec3(1.0, 1.0, 1.0), (fireNoise - 0.6) * 2.5);
        }
        // Middle fire (orange/yellow)
        else if (fireNoise > 0.3) {
            color = mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 1.0, 0.0), (fireNoise - 0.3) * 3.33);
        }
        // Outer fire (red/orange)
        else {
            color = mix(vec3(0.0), vec3(1.0, 0.0, 0.0), fireNoise * 3.33);
        }
    }
    
    // Add sparks
    float sparks = step(0.95, random(uv * 100.0 + u_time * 10.0)) * fireShape;
    color += sparks * vec3(1.0, 0.8, 0.3);
    
    // Add glow at base
    float baseGlow = exp(-(uv.y * uv.y) * 2.0) * 0.3;
    color += baseGlow * vec3(1.0, 0.2, 0.0);
    
    gl_FragColor = vec4(color, 1.0);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

try {
    ctx.addShader('fire', fireVertexShader, fireFragmentShader);

    let time = 0;
    let animationId;

    function animate() {
        ctx.clear();
        time += 0.03;
        
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('fire', quad.vertices, quad.indices, {
            u_time: time,
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
    // Fire fallback
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear();
        time += 0.03;
        
        for (let i = 0; i < 50; i++) {
            const x = canvas.width / 2 + (Math.random() - 0.5) * 200;
            const y = canvas.height - (Math.random() * canvas.height * 0.8);
            const size = Math.random() * 10 + 5;
            
            const heat = 1 - (y / canvas.height);
            const r = Math.floor(255 * Math.min(1, heat * 2));
            const g = Math.floor(255 * Math.max(0, heat * 2 - 1));
            const b = 0;
            
            ctx.fillStyle = \`rgb(\${r}, \${g}, \${b})\`;
            if (ctx.fillCircle) {
                ctx.fillCircle(x, y - time * 50 % canvas.height, size);
            } else {
                ctx.beginPath();
                ctx.arc(x, y - time * 50 % canvas.height, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
},

shaderCrystalCave: {
    name: "Shader Crystal Cave",
    code: `// Crystal Cave Shader Effect
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

const crystalVertexShader = \`
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

const crystalFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_uv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float voronoi(vec2 st) {
    vec2 i_st = floor(st);
    vec2 f_st = fract(st);
    
    float min_dist = 1.0;
    
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = random(i_st + neighbor) * vec2(1.0);
            point = 0.5 + 0.5 * sin(u_time + 6.2831 * point);
            vec2 diff = neighbor + point - f_st;
            float dist = length(diff);
            min_dist = min(min_dist, dist);
        }
    }
    
    return min_dist;
}

void main() {
    vec2 uv = v_uv * 8.0;
    
    // Create crystal structure
    float crystal = voronoi(uv);
    float crystal2 = voronoi(uv * 2.0 + 100.0);
    
    // Combine different scales
    float pattern = crystal * 0.7 + crystal2 * 0.3;
    
    // Create crystal edges
    float edges = step(pattern, 0.1);
    
    // Base cave color (dark purple/blue)
    vec3 baseColor = vec3(0.1, 0.05, 0.2);
    
    // Crystal colors (cyan/purple/pink)
    vec3 crystalColor1 = vec3(0.2, 0.8, 1.0);
    vec3 crystalColor2 = vec3(0.8, 0.2, 1.0);
    vec3 crystalColor3 = vec3(1.0, 0.4, 0.8);
    
    // Animated color mixing
    float colorMix1 = 0.5 + 0.5 * sin(u_time + pattern * 10.0);
    float colorMix2 = 0.5 + 0.5 * sin(u_time * 0.7 + pattern * 8.0 + 2.0);
    
    vec3 mixedCrystalColor = mix(crystalColor1, crystalColor2, colorMix1);
    mixedCrystalColor = mix(mixedCrystalColor, crystalColor3, colorMix2);
    
    // Apply crystal pattern
    vec3 color = mix(baseColor, mixedCrystalColor, edges);
    
    // Add inner glow
    float innerGlow = smoothstep(0.1, 0.3, pattern);
    color = mix(color, mixedCrystalColor * 0.5, innerGlow * 0.3);
    
    // Add sparkles
    float sparkle = step(0.98, random(floor(uv * 20.0) + u_time * 2.0));
    color += sparkle * vec3(1.0);
    
    // Add depth shading
    float depth = 1.0 - length(v_uv - 0.5) * 1.5;
    color *= 0.3 + 0.7 * depth;
    
    gl_FragColor = vec4(color, 1.0);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

try {
    ctx.addShader('crystal', crystalVertexShader, crystalFragmentShader);

    let time = 0;
    let animationId;

    function animate() {
        ctx.clear();
        time += 0.02;
        
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('crystal', quad.vertices, quad.indices, {
            u_time: time,
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
    // Crystal fallback
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear();
        time += 0.02;
        
        // Dark background
        ctx.fillStyle = '#1a0a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw crystal-like shapes
        for (let i = 0; i < 20; i++) {
            const x = (i % 5) * (canvas.width / 5) + canvas.width / 10;
            const y = Math.floor(i / 5) * (canvas.height / 4) + canvas.height / 8;
            const size = 30 + Math.sin(time + i) * 10;
            
            const hue = (i * 36 + time * 50) % 360;
            ctx.fillStyle = \`hsl(\${hue + 240}, 80%, 60%)\`;
            
            // Draw diamond shape
            ctx.beginPath();
            ctx.moveTo(x, y - size);
            ctx.lineTo(x + size, y);
            ctx.lineTo(x, y + size);
            ctx.lineTo(x - size, y);
            ctx.closePath();
            ctx.fill();
            
            // Add glow
            ctx.fillStyle = \`hsla(\${hue + 240}, 80%, 80%, 0.3)\`;
            if (ctx.fillCircle) {
                ctx.fillCircle(x, y, size * 1.5);
            } else {
                ctx.beginPath();
                ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
},

shaderGalaxy: {
    name: "Shader Galaxy Spiral",
    code: `// Galaxy Spiral Shader Effect
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

const galaxyVertexShader = \`
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

const galaxyFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_uv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    vec2 center = vec2(0.5, 0.5);
    vec2 pos = v_uv - center;
    
    float radius = length(pos);
    float angle = atan(pos.y, pos.x);
    
    // Create spiral arms
    float spiralArms = 3.0;
    float spiralTightness = 2.0;
    float spiralAngle = angle + radius * spiralTightness - u_time * 0.5;
    
    float spiral = sin(spiralAngle * spiralArms) * 0.5 + 0.5;
    
    // Galaxy disk falloff
    float disk = exp(-radius * 3.0);
    
    // Create star field
    float stars = step(0.99, random(floor(v_uv * 100.0) + floor(u_time * 2.0)));
    
    // Nebula clouds
    float nebula = noise(v_uv * 4.0 + u_time * 0.1) * noise(v_uv * 2.0 - u_time * 0.05);
    
    // Combine effects
    float brightness = spiral * disk + stars * 0.8 + nebula * 0.3;
    
    // Color based on radius (blue core to red edge)
    vec3 coreColor = vec3(0.8, 0.9, 1.0);    // Blue-white core
    vec3 diskColor = vec3(1.0, 0.7, 0.3);    // Orange disk
    vec3 edgeColor = vec3(1.0, 0.3, 0.4);    // Red edge
    vec3 nebulaColor = vec3(0.6, 0.2, 1.0);  // Purple nebula
    
    vec3 color = mix(coreColor, diskColor, smoothstep(0.0, 0.3, radius));
    color = mix(color, edgeColor, smoothstep(0.3, 0.6, radius));
    color = mix(color, nebulaColor, nebula * 0.5);
    
    // Apply brightness
    color *= brightness;
    
    // Add central bright core
    float core = exp(-radius * 15.0);
    color += core * vec3(1.0, 1.0, 0.8) * 2.0;
    
    // Space background
    vec3 background = vec3(0.01, 0.01, 0.03);
    color = max(color, background);
    
    gl_FragColor = vec4(color, 1.0);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

try {
    ctx.addShader('galaxy', galaxyVertexShader, galaxyFragmentShader);

    let time = 0;
    let animationId;

    function animate() {
        ctx.clear();
        time += 0.01;
        
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('galaxy', quad.vertices, quad.indices, {
            u_time: time,
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
    // Galaxy fallback
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear();
        time += 0.01;
        
        // Space background
        ctx.fillStyle = '#000511';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Draw spiral arms
        for (let arm = 0; arm < 3; arm++) {
            ctx.strokeStyle = \`hsla(\${arm * 60 + 200}, 70%, 60%, 0.7)\`;
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            for (let r = 0; r < 150; r += 2) {
                const angle = r * 0.1 + arm * (Math.PI * 2 / 3) + time;
                const x = centerX + Math.cos(angle) * r;
                const y = centerY + Math.sin(angle) * r;
                
                if (r === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        
        // Draw stars
        for (let i = 0; i < 100; i++) {
            const angle = (i / 100) * Math.PI * 2 + time * 0.1;
            const radius = Math.random() * 200;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            ctx.fillStyle = \`hsl(\${Math.random() * 60 + 200}, 80%, 90%)\`;
            if (ctx.fillCircle) {
                ctx.fillCircle(x, y, 1 + Math.random());
            } else {
                ctx.beginPath();
                ctx.arc(x, y, 1 + Math.random(), 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
},

shaderElectric: {
    name: "Interactive Electric Field",
    code: `// Interactive Electric Field Shader - Fixed Version
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

const electricVertexShader = \`
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

const electricFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec4 v_color;
varying vec2 v_uv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 uv = v_uv;
    vec2 mouseUV = u_mouse / u_resolution;
    
    // Multiple electric charges
    vec2 charge1 = mouseUV;
    vec2 charge2 = vec2(0.2, 0.3);
    vec2 charge3 = vec2(0.8, 0.7);
    vec2 charge4 = vec2(0.5 + 0.2 * sin(u_time), 0.5 + 0.2 * cos(u_time * 1.3));
    
    // Calculate distances to charges
    float dist1 = distance(uv, charge1);
    float dist2 = distance(uv, charge2);
    float dist3 = distance(uv, charge3);
    float dist4 = distance(uv, charge4);
    
    // Create electric field effect
    float field = 0.0;
    field += 0.02 / (dist1 + 0.01);
    field += 0.015 / (dist2 + 0.01);
    field += 0.015 / (dist3 + 0.01);
    field += 0.018 / (dist4 + 0.01);
    
    // Create lightning arcs
    float lightning = 0.0;
    
    // Arc from mouse to charge2
    vec2 midpoint1 = (mouseUV + charge2) * 0.5;
    float arcDist1 = distance(uv, midpoint1);
    vec2 arcDir1 = normalize(charge2 - mouseUV);
    vec2 uvDir1 = normalize(uv - mouseUV);
    float alignment1 = max(0.0, dot(arcDir1, uvDir1));
    lightning += alignment1 * (0.1 / (arcDist1 * 10.0 + 1.0));
    
    // Arc from charge2 to charge3
    vec2 midpoint2 = (charge2 + charge3) * 0.5;
    midpoint2 += vec2(0.1 * sin(u_time * 5.0), 0.05 * cos(u_time * 7.0));
    float arcDist2 = distance(uv, midpoint2);
    lightning += 0.2 / (arcDist2 * 15.0 + 1.0);
    
    // Add crackling noise
    float noise = random(floor(uv * 30.0) + floor(u_time * 20.0));
    
    // Combine effects
    float electric = field + lightning;
    electric *= (0.7 + 0.3 * noise);
    
    // Create electric colors
    vec3 color = vec3(0.0);
    
    // Blue electric field
    color += vec3(0.2, 0.5, 1.0) * field * 3.0;
    
    // Bright white lightning
    color += vec3(1.0, 1.0, 1.0) * lightning * 5.0;
    
    // Charge point glows
    color += vec3(0.5, 0.8, 1.0) * (0.5 / (dist1 * 15.0 + 1.0));
    color += vec3(0.3, 0.6, 1.0) * (0.3 / (dist2 * 15.0 + 1.0));
    color += vec3(0.3, 0.6, 1.0) * (0.3 / (dist3 * 15.0 + 1.0));
    color += vec3(0.4, 0.7, 1.0) * (0.4 / (dist4 * 15.0 + 1.0));
    
    // Dark background
    vec3 background = vec3(0.03, 0.03, 0.1);
    color = max(color, background);
    
    gl_FragColor = vec4(color, 1.0);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

try {
    ctx.addShader('electric', electricVertexShader, electricFragmentShader);

    let time = 0;
    let animationId;

    function animate() {
        ctx.clear();
        time += 0.05;
        
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('electric', quad.vertices, quad.indices, {
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
    // Enhanced electric fallback
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        time += 0.05;
        
        // Dark electric background
        ctx.fillStyle = '#0a0a20';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Electric charges positions
        const charges = [
            {x: mouseX, y: mouseY, power: 1.0, color: '#8cf'},
            {x: canvas.width * 0.2, y: canvas.height * 0.3, power: 0.8, color: '#6af'},
            {x: canvas.width * 0.8, y: canvas.height * 0.7, power: 0.8, color: '#6af'},
            {
                x: canvas.width * 0.5 + Math.sin(time) * 100,
                y: canvas.height * 0.5 + Math.cos(time * 1.3) * 80,
                power: 0.9,
                color: '#acf'
            }
        ];
        
        // Draw electric field lines
        for (let i = 0; i < charges.length; i++) {
            for (let j = i + 1; j < charges.length; j++) {
                if (Math.random() > 0.6) {
                    const start = charges[i];
                    const end = charges[j];
                    
                    ctx.strokeStyle = \`rgba(100, 150, 255, \${0.3 + Math.random() * 0.4})\`;
                    ctx.lineWidth = 1 + Math.random() * 2;
                    
                    // Create jagged electric arc
                    ctx.beginPath();
                    ctx.moveTo(start.x, start.y);
                    
                    const steps = 8;
                    for (let k = 1; k <= steps; k++) {
                        const t = k / steps;
                        const baseX = start.x + (end.x - start.x) * t;
                        const baseY = start.y + (end.y - start.y) * t;
                        
                        const jitter = 20 * (1 - Math.abs(t - 0.5) * 2); // More jitter in middle
                        const x = baseX + (Math.random() - 0.5) * jitter;
                        const y = baseY + (Math.random() - 0.5) * jitter;
                        
                        ctx.lineTo(x, y);
                    }
                    
                    ctx.stroke();
                }
            }
        }
        
        // Draw charge points with glow
        charges.forEach((charge, index) => {
            // Outer glow
            ctx.fillStyle = \`rgba(100, 200, 255, 0.1)\`;
            if (ctx.fillCircle) {
                ctx.fillCircle(charge.x, charge.y, 25 * charge.power);
            } else {
                ctx.beginPath();
                ctx.arc(charge.x, charge.y, 25 * charge.power, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Inner glow
            ctx.fillStyle = \`rgba(150, 220, 255, 0.3)\`;
            if (ctx.fillCircle) {
                ctx.fillCircle(charge.x, charge.y, 12 * charge.power);
            } else {
                ctx.beginPath();
                ctx.arc(charge.x, charge.y, 12 * charge.power, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Core
            ctx.fillStyle = charge.color;
            if (ctx.fillCircle) {
                ctx.fillCircle(charge.x, charge.y, 6 * charge.power);
            } else {
                ctx.beginPath();
                ctx.arc(charge.x, charge.y, 6 * charge.power, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // Add some electric sparkles
        for (let i = 0; i < 10; i++) {
            if (Math.random() > 0.7) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                
                ctx.fillStyle = \`rgba(200, 230, 255, \${Math.random()})\`;
                if (ctx.fillCircle) {
                    ctx.fillCircle(x, y, 1 + Math.random() * 2);
                } else {
                    ctx.beginPath();
                    ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        if (ctx.flush) ctx.flush();
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
},
shaderLighting: {
    name: "Dynamic Lighting System",
    code: `// Dynamic Lighting System with Shadows and Colored Lights
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

const lightingVertexShader = \`
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

const lightingFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec4 v_color;
varying vec2 v_uv;

// Random function for procedural generation
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// Smooth noise function
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Distance function for circular objects (shadow casters)
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

// Distance function for rectangular objects
float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// Shadow calculation using ray marching
float calculateShadow(vec2 pos, vec2 lightPos, vec2 obstacles[4], float obstacleRadii[4]) {
    vec2 direction = normalize(lightPos - pos);
    float distToLight = distance(pos, lightPos);
    
    // Start ray marching from the current position toward the light
    vec2 rayPos = pos + direction * 0.01; // Small offset to avoid self-intersection
    float rayDistance = 0.01;
    
    // March the ray towards the light
    for (int i = 0; i < 32; i++) {
        if (rayDistance >= distToLight) break;
        
        // Find distance to nearest obstacle
        float minDist = 999.0;
        
        // Check distance to each circular obstacle
        for (int j = 0; j < 4; j++) {
            float dist = sdCircle(rayPos - obstacles[j], obstacleRadii[j]);
            minDist = min(minDist, dist);
        }
        
        // If we're inside an obstacle, we're in shadow
        if (minDist < 0.001) {
            return 0.0; // Full shadow
        }
        
        // March forward
        rayDistance += minDist;
        rayPos = pos + direction * rayDistance;
    }
    
    return 1.0; // No shadow
}

// Calculate lighting contribution from a single light source
vec3 calculateLighting(vec2 pos, vec2 lightPos, vec3 lightColor, float lightIntensity, 
                      vec2 obstacles[4], float obstacleRadii[4]) {
    // Calculate distance and direction to light
    vec2 lightDir = lightPos - pos;
    float lightDistance = length(lightDir);
    lightDir = normalize(lightDir);
    
    // Calculate attenuation (how light fades with distance)
    // Using inverse square law with some artistic adjustments
    float attenuation = lightIntensity / (1.0 + lightDistance * lightDistance * 0.002);
    
    // Calculate shadow factor
    float shadowFactor = calculateShadow(pos, lightPos, obstacles, obstacleRadii);
    
    // Soft shadow edges using smoothstep
    shadowFactor = smoothstep(0.0, 1.0, shadowFactor);
    
    // Combine everything
    return lightColor * attenuation * shadowFactor;
}

void main() {
    vec2 uv = v_uv;
    vec2 mouseUV = u_mouse / u_resolution;
    
    // Define shadow-casting obstacles (circles)
    vec2 obstacles[4];
    float obstacleRadii[4];
    
    // Static obstacles with different sizes
    obstacles[0] = vec2(0.3, 0.4);
    obstacleRadii[0] = 0.08;
    
    obstacles[1] = vec2(0.7, 0.6);
    obstacleRadii[1] = 0.06;
    
    obstacles[2] = vec2(0.2, 0.7);
    obstacleRadii[2] = 0.05;
    
    // Animated obstacle that moves in a circle
    obstacles[3] = vec2(0.5 + 0.15 * cos(u_time * 0.8), 0.5 + 0.15 * sin(u_time * 0.8));
    obstacleRadii[3] = 0.04;
    
    // Define multiple light sources with different colors and properties
    vec2 light1Pos = mouseUV; // Mouse-controlled light
    vec3 light1Color = vec3(1.0, 0.9, 0.7); // Warm white light
    float light1Intensity = 0.8;
    
    // Animated red light that pulses
    vec2 light2Pos = vec2(0.8, 0.2);
    vec3 light2Color = vec3(1.0, 0.2, 0.2); // Red light
    float light2Intensity = 0.4 + 0.3 * sin(u_time * 2.0); // Pulsing intensity
    
    // Animated blue light that moves in a figure-8 pattern
    vec2 light3Pos = vec2(0.2 + 0.1 * sin(u_time), 0.3 + 0.05 * sin(u_time * 2.0));
    vec3 light3Color = vec3(0.2, 0.4, 1.0); // Blue light
    float light3Intensity = 0.5;
    
    // Flickering green light (like a candle or fire)
    vec2 light4Pos = vec2(0.6, 0.8);
    vec3 light4Color = vec3(0.2, 1.0, 0.3); // Green light
    float light4Intensity = 0.3 + 0.2 * noise(uv * 10.0 + u_time * 5.0); // Flickering
    
    // Calculate lighting contribution from each light source
    vec3 totalLighting = vec3(0.0);
    
    totalLighting += calculateLighting(uv, light1Pos, light1Color, light1Intensity, obstacles, obstacleRadii);
    totalLighting += calculateLighting(uv, light2Pos, light2Color, light2Intensity, obstacles, obstacleRadii);
    totalLighting += calculateLighting(uv, light3Pos, light3Color, light3Intensity, obstacles, obstacleRadii);
    totalLighting += calculateLighting(uv, light4Pos, light4Color, light4Intensity, obstacles, obstacleRadii);
    
    // Ambient lighting (prevents completely black areas)
    vec3 ambientLight = vec3(0.05, 0.05, 0.08); // Very dim blue ambient
    
    // Base surface color (what we're lighting)
    vec3 baseColor = vec3(0.6, 0.6, 0.7); // Neutral gray surface
    
    // Add some texture variation to the surface
    float surfaceNoise = noise(uv * 20.0) * 0.2;
    baseColor += surfaceNoise;
    
    // Combine ambient and direct lighting
    vec3 finalColor = baseColor * (ambientLight + totalLighting);
    
    // Draw the obstacles as darker areas (they block some light but aren't completely black)
    for (int i = 0; i < 4; i++) {
        float obstacleDistance = sdCircle(uv - obstacles[i], obstacleRadii[i]);
        if (obstacleDistance < 0.0) {
            // Inside obstacle - darken but don't make completely black
            finalColor *= 0.3;
            // Add a slight color tint to make obstacles more visible
            finalColor += vec3(0.1, 0.1, 0.15);
        }
    }
    
    // Visualize light sources as bright spots
    float lightVis1 = 1.0 - smoothstep(0.0, 0.02, distance(uv, light1Pos));
    float lightVis2 = 1.0 - smoothstep(0.0, 0.015, distance(uv, light2Pos));
    float lightVis3 = 1.0 - smoothstep(0.0, 0.015, distance(uv, light3Pos));
    float lightVis4 = 1.0 - smoothstep(0.0, 0.015, distance(uv, light4Pos));
    
    finalColor += light1Color * lightVis1 * 2.0;
    finalColor += light2Color * lightVis2 * 2.0;
    finalColor += light3Color * lightVis3 * 2.0;
    finalColor += light4Color * lightVis4 * 2.0;
    
    // Tone mapping to prevent over-bright areas
    finalColor = finalColor / (1.0 + finalColor);
    
    // Gamma correction for more realistic lighting
    finalColor = pow(finalColor, vec3(1.0/2.2));
    
    gl_FragColor = vec4(finalColor, 1.0);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

// Track mouse movement for interactive lighting
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

try {
    ctx.addShader('lighting', lightingVertexShader, lightingFragmentShader);

    let time = 0;
    let animationId;

    function animate() {
        ctx.clear();
        time += 0.016; // 60 FPS timing
        
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('lighting', quad.vertices, quad.indices, {
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
    
    // Sophisticated fallback lighting system using Canvas 2D
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear ? ctx.clear() : ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        time += 0.016;
        
        // Create base dark environment
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Define light sources with colors and positions
        const lights = [
            {
                x: mouseX,
                y: mouseY,
                color: 'rgba(255, 230, 180,', // Warm white
                intensity: 0.8,
                radius: 150
            },
            {
                x: canvas.width * 0.8,
                y: canvas.height * 0.2,
                color: 'rgba(255, 50, 50,', // Red
                intensity: 0.4 + 0.3 * Math.sin(time * 2),
                radius: 100
            },
            {
                x: canvas.width * (0.2 + 0.1 * Math.sin(time)),
                y: canvas.height * (0.3 + 0.05 * Math.sin(time * 2)),
                color: 'rgba(50, 100, 255,', // Blue
                intensity: 0.5,
                radius: 120
            },
            {
                x: canvas.width * 0.6,
                y: canvas.height * 0.8,
                color: 'rgba(50, 255, 80,', // Green
                intensity: 0.3 + 0.2 * Math.random(), // Flickering
                radius: 80
            }
        ];
        
        // Define obstacles (shadow casters)
        const obstacles = [
            { x: canvas.width * 0.3, y: canvas.height * 0.4, radius: 40 },
            { x: canvas.width * 0.7, y: canvas.height * 0.6, radius: 30 },
            { x: canvas.width * 0.2, y: canvas.height * 0.7, radius: 25 },
            { 
                x: canvas.width * (0.5 + 0.15 * Math.cos(time * 0.8)), 
                y: canvas.height * (0.5 + 0.15 * Math.sin(time * 0.8)), 
                radius: 20 
            }
        ];
        
        // Draw lighting effects
        lights.forEach(light => {
            // Create radial gradient for each light
            const gradient = ctx.createRadialGradient(
                light.x, light.y, 0,
                light.x, light.y, light.radius
            );
            
            const alpha = light.intensity;
            gradient.addColorStop(0, light.color + alpha + ')');
            gradient.addColorStop(0.5, light.color + (alpha * 0.3) + ')');
            gradient.addColorStop(1, light.color + '0)');
            
            // Set blend mode for additive lighting
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = gradient;
            ctx.fillRect(
                light.x - light.radius,
                light.y - light.radius,
                light.radius * 2,
                light.radius * 2
            );
        });
        
        // Reset blend mode
        ctx.globalCompositeOperation = 'source-over';
        
        // Draw obstacles with shadows
        obstacles.forEach(obstacle => {
            // Draw obstacle
            ctx.fillStyle = '#2a2a4e';
            if (ctx.fillCircle) {
                ctx.fillCircle(obstacle.x, obstacle.y, obstacle.radius);
            } else {
                ctx.beginPath();
                ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Draw simple shadows behind obstacles
            lights.forEach(light => {
                const dx = obstacle.x - light.x;
                const dy = obstacle.y - light.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > obstacle.radius) {
                    const shadowLength = 50;
                    const shadowX = obstacle.x + (dx / distance) * shadowLength;
                    const shadowY = obstacle.y + (dy / distance) * shadowLength;
                    
                    // Create shadow gradient
                    const shadowGradient = ctx.createLinearGradient(
                        obstacle.x, obstacle.y,
                        shadowX, shadowY
                    );
                    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
                    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    
                    ctx.fillStyle = shadowGradient;
                    ctx.beginPath();
                    ctx.ellipse(
                        shadowX, shadowY,
                        obstacle.radius * 0.8, obstacle.radius * 0.3,
                        Math.atan2(dy, dx), 0, Math.PI * 2
                    );
                    ctx.fill();
                }
            });
        });
        
        // Draw light source indicators
        lights.forEach(light => {
            ctx.fillStyle = light.color + '1)';
            if (ctx.fillCircle) {
                ctx.fillCircle(light.x, light.y, 8);
            } else {
                ctx.beginPath();
                ctx.arc(light.x, light.y, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // Add instructions
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '16px Arial';
        if (ctx.fillText) {
            ctx.fillText('Move mouse to control the white light!', 10, 30);
            ctx.fillText('Watch the colored lights and moving shadows', 10, 50);
        }
        
        if (ctx.flush) ctx.flush();
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
},
shaderDNA: {
    name: "DNA Double Helix",
    code: `// DNA Double Helix Shader
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

const dnaVertexShader = \`
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

const dnaFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_uv;

float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

void main() {
    vec2 uv = (v_uv - 0.5) * 4.0;
    
    // DNA helix parameters
    float helixRadius = 0.8;
    float helixSpeed = u_time * 2.0;
    float baseSpacing = 0.3;
    
    float dna = 999.0;
    vec3 color = vec3(0.0);
    
    // Create double helix structure
    for (float i = -10.0; i <= 10.0; i += 0.5) {
        float t = i * baseSpacing + helixSpeed;
        
        // First strand
        vec2 strand1 = vec2(
            sin(t) * helixRadius,
            i * 0.2
        );
        
        // Second strand (180 degrees out of phase)
        vec2 strand2 = vec2(
            sin(t + 3.14159) * helixRadius,
            i * 0.2
        );
        
        // Distance to strands
        float d1 = length(uv - strand1) - 0.05;
        float d2 = length(uv - strand2) - 0.05;
        
        dna = min(dna, d1);
        dna = min(dna, d2);
        
        // Base pairs (connecting lines)
        if (mod(i, 1.0) < 0.1) {
            float basePair = sdCapsule(uv, strand1, strand2, 0.02);
            dna = min(dna, basePair);
        }
        
        // Color contribution
        if (d1 < 0.1) {
            color += vec3(0.2, 0.8, 1.0) * (0.1 - d1) * 10.0;
        }
        if (d2 < 0.1) {
            color += vec3(1.0, 0.3, 0.8) * (0.1 - d2) * 10.0;
        }
    }
    
    // Glow effect
    color += vec3(0.1, 0.4, 0.8) * exp(-abs(dna) * 20.0);
    
    gl_FragColor = vec4(color, 1.0);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

try {
    ctx.addShader('dna', dnaVertexShader, dnaFragmentShader);
    
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear();
        time += 0.02;
        
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('dna', quad.vertices, quad.indices, {
            u_time: time,
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
    // Fallback DNA pattern
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear();
        time += 0.02;
        
        ctx.fillStyle = '#001122';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const helixRadius = 60;
        
        for (let i = 0; i < 50; i++) {
            const y = i * 15 - time * 100;
            const t = i * 0.3 + time * 2;
            
            if (y > -50 && y < canvas.height + 50) {
                const x1 = centerX + Math.sin(t) * helixRadius;
                const x2 = centerX + Math.sin(t + Math.PI) * helixRadius;
                
                ctx.fillStyle = '#2af';
                if (ctx.fillCircle) {
                    ctx.fillCircle(x1, y, 4);
                } else {
                    ctx.beginPath();
                    ctx.arc(x1, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                ctx.fillStyle = '#f2a';
                if (ctx.fillCircle) {
                    ctx.fillCircle(x2, y, 4);
                } else {
                    ctx.beginPath();
                    ctx.arc(x2, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                if (i % 3 === 0) {
                    ctx.strokeStyle = '#666';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x1, y);
                    ctx.lineTo(x2, y);
                    ctx.stroke();
                }
            }
        }
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
},

shaderPortal: {
    name: "Interdimensional Portal",
    code: `// Interdimensional Portal Shader
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

const portalVertexShader = \`
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

const portalFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_uv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    vec2 center = vec2(0.5, 0.5);
    vec2 pos = v_uv - center;
    
    float radius = length(pos);
    float angle = atan(pos.y, pos.x);
    
    // Portal distortion effect
    vec2 portalUV = v_uv;
    if (radius < 0.4) {
        float distortion = sin(radius * 20.0 - u_time * 3.0) * 0.02;
        float spiralDistortion = sin(angle * 8.0 + u_time * 2.0 + radius * 10.0) * 0.03;
        portalUV += normalize(pos) * (distortion + spiralDistortion);
    }
    
    // Portal ring
    float ring = abs(radius - 0.35);
    float portalRing = 1.0 - smoothstep(0.0, 0.05, ring);
    
    // Inner portal energy
    float energy = 0.0;
    if (radius < 0.35) {
        energy = noise(portalUV * 5.0 + u_time) * 
                 noise(portalUV * 3.0 - u_time * 0.5) * 
                 (1.0 - radius / 0.35);
    }
    
    // Swirling vortex
    float vortex = sin(angle * 6.0 + radius * 15.0 - u_time * 4.0) * 
                   exp(-radius * 3.0);
    
    // Portal colors
    vec3 ringColor = vec3(0.8, 0.3, 1.0); // Purple ring
    vec3 energyColor1 = vec3(0.2, 0.8, 1.0); // Cyan energy
    vec3 energyColor2 = vec3(1.0, 0.4, 0.8); // Pink energy
    vec3 vortexColor = vec3(0.9, 0.9, 0.3); // Yellow vortex
    
    // Combine effects
    vec3 color = vec3(0.0);
    
    // Ring glow
    color += ringColor * portalRing * 2.0;
    
    // Inner energy
    color += mix(energyColor1, energyColor2, sin(u_time + radius * 10.0) * 0.5 + 0.5) * energy;
    
    // Vortex effect
    color += vortexColor * max(0.0, vortex) * 0.5;
    
    // Outer glow
    float outerGlow = exp(-pow(radius - 0.35, 2.0) * 100.0);
    color += ringColor * outerGlow * 0.3;
    
    // Starfield background
    if (radius > 0.4) {
        float stars = step(0.98, random(floor(v_uv * 50.0) + floor(u_time)));
        color += stars * vec3(1.0);
    }
    
    gl_FragColor = vec4(color, 1.0);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

try {
    ctx.addShader('portal', portalVertexShader, portalFragmentShader);
    
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear();
        time += 0.03;
        
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('portal', quad.vertices, quad.indices, {
            u_time: time,
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
    // Portal fallback
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear();
        time += 0.03;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Portal rings
        for (let i = 1; i <= 10; i++) {
            const radius = i * 20 + Math.sin(time * 3 + i) * 5;
            const alpha = (11 - i) / 10;
            
            ctx.strokeStyle = \`hsla(\${280 + i * 10}, 80%, 60%, \${alpha})\`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Energy swirls
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + time * 2;
            const x = centerX + Math.cos(angle) * 100;
            const y = centerY + Math.sin(angle) * 100;
            
            ctx.fillStyle = \`hsl(\${200 + i * 20}, 70%, 60%)\`;
            if (ctx.fillCircle) {
                ctx.fillCircle(x, y, 8);
            } else {
                ctx.beginPath();
                ctx.arc(x, y, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
},

shaderNeuralNetwork: {
    name: "Neural Network Visualization",
    code: `// Neural Network Shader
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

const neuralVertexShader = \`
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

const neuralFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_uv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float pulse(float t, float phase) {
    return 0.5 + 0.5 * sin(t + phase);
}

void main() {
    vec2 uv = v_uv;
    vec3 color = vec3(0.02, 0.02, 0.1); // Dark blue background
    
    // Define neural network layers
    float layerSpacing = 0.25;
    int numLayers = 4;
    
    for (int layer = 0; layer < 4; layer++) {
        float x = float(layer) * layerSpacing + 0.125;
        int neuronsInLayer = 6 - layer;
        
        for (int neuron = 0; neuron < 6; neuron++) {
            if (neuron >= neuronsInLayer) break;
            
            float y = (float(neuron) + 0.5) / float(neuronsInLayer);
            vec2 neuronPos = vec2(x, y);
            
            float dist = distance(uv, neuronPos);
            
            // Neuron activation (pulsing)
            float activation = pulse(u_time * 3.0, 
                random(neuronPos) * 6.28 + float(layer) * 1.57);
            
            // Draw neuron
            float neuronGlow = activation * exp(-dist * 30.0);
            color += vec3(0.3, 0.8, 1.0) * neuronGlow;
            
            // Neuron core
            if (dist < 0.02) {
                color += vec3(1.0, 1.0, 0.8) * activation;
            }
            
            // Draw connections to next layer
            if (layer < 3) {
                float nextX = (float(layer) + 1.0) * layerSpacing + 0.125;
                int nextNeurons = 6 - (layer + 1);
                
                for (int nextNeuron = 0; nextNeuron < 6; nextNeuron++) {
                    if (nextNeuron >= nextNeurons) break;
                    
                    float nextY = (float(nextNeuron) + 0.5) / float(nextNeurons);
                    vec2 nextPos = vec2(nextX, nextY);
                    
                    // Line between neurons
                    vec2 lineDir = normalize(nextPos - neuronPos);
                    vec2 toPoint = uv - neuronPos;
                    float projLength = dot(toPoint, lineDir);
                    
                    if (projLength > 0.0 && projLength < distance(neuronPos, nextPos)) {
                        vec2 closestPoint = neuronPos + lineDir * projLength;
                        float lineDist = distance(uv, closestPoint);
                        
                        // Signal traveling along connection
                        float signal = pulse(u_time * 5.0 - projLength * 20.0, 
                            random(neuronPos + nextPos) * 6.28);
                        
                        if (lineDist < 0.003) {
                            color += vec3(0.8, 0.4, 1.0) * 0.5;
                            
                            // Traveling signal
                            float signalPos = mod(u_time * 0.5 + 
                                random(neuronPos + nextPos), 1.0);
                            float signalDist = abs(projLength / distance(neuronPos, nextPos) - signalPos);
                            
                            if (signalDist < 0.05) {
                                color += vec3(1.0, 1.0, 0.3) * signal * 2.0;
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Add some data flow particles
    for (int i = 0; i < 10; i++) {
        float t = u_time * 0.3 + float(i) * 0.1;
        float x = mod(t, 1.0);
        float y = 0.2 + 0.6 * random(vec2(float(i), 0.0));
        
        vec2 particlePos = vec2(x, y);
        float particleDist = distance(uv, particlePos);
        
        if (particleDist < 0.01) {
            color += vec3(1.0, 0.8, 0.3) * 2.0;
        }
    }
    
    gl_FragColor = vec4(color, 1.0);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

try {
    ctx.addShader('neural', neuralVertexShader, neuralFragmentShader);
    
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear();
        time += 0.02;
        
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('neural', quad.vertices, quad.indices, {
            u_time: time,
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
    // Neural network fallback
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear();
        time += 0.02;
        
        ctx.fillStyle = '#051020';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const layers = [5, 4, 3, 2];
        const layerSpacing = canvas.width / (layers.length + 1);
        
        // Draw connections first
        ctx.strokeStyle = 'rgba(128, 100, 255, 0.3)';
        ctx.lineWidth = 1;
        
        for (let l = 0; l < layers.length - 1; l++) {
            const currentNeurons = layers[l];
            const nextNeurons = layers[l + 1];
            
            for (let i = 0; i < currentNeurons; i++) {
                for (let j = 0; j < nextNeurons; j++) {
                    const x1 = (l + 1) * layerSpacing;
                    const y1 = (i + 1) * (canvas.height / (currentNeurons + 1));
                    const x2 = (l + 2) * layerSpacing;
                    const y2 = (j + 1) * (canvas.height / (nextNeurons + 1));
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
            }
        }
        
        // Draw neurons
        layers.forEach((neuronCount, layerIndex) => {
            const x = (layerIndex + 1) * layerSpacing;
            
            for (let i = 0; i < neuronCount; i++) {
                const y = (i + 1) * (canvas.height / (neuronCount + 1));
                const activation = 0.5 + 0.5 * Math.sin(time * 3 + layerIndex + i);
                
                // Glow
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
                gradient.addColorStop(0, \`rgba(50, 150, 255, \${activation})\`);
                gradient.addColorStop(1, 'rgba(50, 150, 255, 0)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(x - 20, y - 20, 40, 40);
                
                // Neuron core
                ctx.fillStyle = \`hsl(200, 80%, \${50 + activation * 30}%)\`;
                if (ctx.fillCircle) {
                    ctx.fillCircle(x, y, 8);
                } else {
                    ctx.beginPath();
                    ctx.arc(x, y, 8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        });
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
},

shaderHexGrid: {
    name: "Animated Hex Grid",
    code: `// Animated Hexagonal Grid Shader
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

const hexVertexShader = \`
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

const hexFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_uv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

vec2 hexCoords(vec2 uv) {
    uv.x *= 1.15470054; // 2/sqrt(3)
    uv.y += mod(floor(uv.x), 2.0) * 0.5;
    return vec2(floor(uv.x), floor(uv.y));
}

float hexDistance(vec2 p) {
    p = abs(p);
    return max(dot(p, normalize(vec2(1.0, 1.73))), p.x);
}

void main() {
    vec2 uv = v_uv * 20.0;
    
    // Get hexagonal coordinates
    vec2 hexID = hexCoords(uv);
    
    // Get position within hex cell
    vec2 cellUV = uv;
    cellUV.x *= 1.15470054;
    cellUV.y += mod(floor(cellUV.x), 2.0) * 0.5;
    cellUV = fract(cellUV) - 0.5;
    
    // Calculate distance to hex edge
    float hexDist = hexDistance(cellUV * 2.0);
    
    // Create hex outline
    float hexEdge = 1.0 - smoothstep(0.8, 0.9, hexDist);
    
    // Animate hex fill based on time and position
    float noise = random(hexID) * 6.28;
    float wave = sin(u_time * 2.0 + noise + length(hexID) * 0.5);
    float fill = smoothstep(-0.5, 0.5, wave) * (1.0 - smoothstep(0.7, 0.8, hexDist));
    
    // Color scheme
    vec3 edgeColor = vec3(0.2, 0.8, 1.0);
    vec3 fillColor = vec3(1.0, 0.4, 0.8);
    
    // Combine colors
    vec3 color = edgeColor * hexEdge + fillColor * fill;
    
    // Add some sparkle
    float sparkle = step(0.98, random(hexID + floor(u_time * 3.0))) * fill;
    color += sparkle * vec3(1.0);
    
    gl_FragColor = vec4(color, 1.0);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

try {
    ctx.addShader('hexGrid', hexVertexShader, hexFragmentShader);
    
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear();
        time += 0.02;
        
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('hexGrid', quad.vertices, quad.indices, {
            u_time: time,
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
    // Hex grid fallback
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear();
        time += 0.02;
        
        ctx.fillStyle = '#001122';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const hexSize = 30;
        const hexWidth = hexSize * 2;
        const hexHeight = Math.sqrt(3) * hexSize;
        
        for (let row = 0; row < Math.ceil(canvas.height / hexHeight) + 1; row++) {
            for (let col = 0; col < Math.ceil(canvas.width / (hexWidth * 0.75)) + 1; col++) {
                const x = col * hexWidth * 0.75;
                const y = row * hexHeight + (col % 2) * hexHeight * 0.5;
                
                if (x < canvas.width + hexSize && y < canvas.height + hexSize) {
                    // Animation based on position and time
                    const wave = Math.sin(time * 2 + (row + col) * 0.5);
                    const brightness = (wave + 1) * 0.5;
                    
                    ctx.strokeStyle = \`hsl(200, 80%, \${30 + brightness * 40}%)\`;
                    ctx.lineWidth = 2;
                    
                    // Draw hexagon
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const angle = (i * Math.PI) / 3;
                        const px = x + Math.cos(angle) * hexSize;
                        const py = y + Math.sin(angle) * hexSize;
                        
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.stroke();
                    
                    // Fill based on animation
                    if (brightness > 0.7) {
                        ctx.fillStyle = \`hsla(300, 70%, 60%, \${(brightness - 0.7) * 3})\`;
                        ctx.fill();
                    }
                }
            }
        }
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
},

shaderBlackHole: {
    name: "Black Hole with Accretion Disk",
    code: `// Black Hole Shader with Gravitational Lensing
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true } );

const blackHoleVertexShader = \`
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

const blackHoleFragmentShader = \`
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec4 v_color;
varying vec2 v_uv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    vec2 center = vec2(0.5, 0.5);
    vec2 pos = v_uv - center;
    
    float radius = length(pos);
    float angle = atan(pos.y, pos.x);
    
    // Black hole event horizon
    float eventHorizon = 0.08;
    
    // Gravitational lensing effect
    vec2 lensedUV = v_uv;
    if (radius > eventHorizon && radius < 0.3) {
        float lensStrength = 0.1 / (radius * radius);
        lensedUV += normalize(pos) * lensStrength;
    }
    
    // Accretion disk
    float diskInner = eventHorizon + 0.02;
    float diskOuter = 0.25;
    float diskThickness = 0.03;
    
    vec3 color = vec3(0.0);
    
    // Starfield background (with lensing)
    float stars = step(0.995, random(floor(lensedUV * 200.0)));
    color += stars * vec3(1.0);
    
    // Accretion disk
    if (radius > diskInner && radius < diskOuter) {
        float diskMask = 1.0 - smoothstep(0.0, diskThickness, 
            abs(pos.y - sin(angle * 3.0 + u_time * 2.0) * 0.01));
        
        if (diskMask > 0.0) {
            // Disk rotation and temperature
            float diskRotation = angle + u_time * (2.0 / radius);
            float temperature = 1.0 / (radius * radius * 10.0);
            
            // Hot material closer to black hole
            vec3 diskColor;
            if (temperature > 0.8) {
                diskColor = vec3(1.0, 1.0, 0.8); // White hot
            } else if (temperature > 0.4) {
                diskColor = vec3(1.0, 0.8, 0.4); // Yellow-orange
            } else {
                diskColor = vec3(1.0, 0.3, 0.1); // Red
            }
            
            // Add turbulence
            float turbulence = noise(vec2(diskRotation * 5.0, radius * 20.0) + u_time);
            diskColor *= 0.7 + 0.3 * turbulence;
            
            color += diskColor * diskMask * temperature * 2.0;
        }
    }
    
    // Photon sphere and light bending
    float photonSphere = 0.12;
    if (radius > photonSphere && radius < photonSphere + 0.02) {
        float photonRing = 1.0 - smoothstep(0.0, 0.02, abs(radius - photonSphere));
        color += vec3(0.8, 0.9, 1.0) * photonRing * 0.5;
    }
    
    // Event horizon (pure black)
    if (radius < eventHorizon) {
        color = vec3(0.0);
    }
    
    // Gravitational redshift effect near the black hole
    if (radius < 0.2 && radius > eventHorizon) {
        float redshift = 1.0 - radius / 0.2;
        color.r += redshift * 0.2;
        color.gb *= 1.0 - redshift * 0.3;
    }
    
    // Jets from the poles (simplified)
    float jetAngle = abs(mod(angle + 1.5708, 3.14159) - 1.5708);
    if (jetAngle < 0.2 && radius > diskOuter && radius < 0.6) {
        float jetIntensity = (1.0 - jetAngle / 0.2) * (1.0 - (radius - diskOuter) / (0.6 - diskOuter));
        color += vec3(0.3, 0.6, 1.0) * jetIntensity * 0.5;
    }
    
    gl_FragColor = vec4(color, 1.0);
}
\`;

if (window.currentAnimationId) {
    cancelAnimationFrame(window.currentAnimationId);
}

try {
    ctx.addShader('blackHole', blackHoleVertexShader, blackHoleFragmentShader);
    
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear();
        time += 0.02;
        
        const quad = ctx.createQuad(0, 0, canvas.width, canvas.height);
        ctx.drawWithShader('blackHole', quad.vertices, quad.indices, {
            u_time: time,
            u_resolution: [canvas.width, canvas.height]
        });
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
    
} catch (error) {
    console.error('Shader failed:', error);
    // Black hole fallback
    let time = 0;
    let animationId;
    
    function animate() {
        ctx.clear();
        time += 0.02;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Accretion disk
        for (let i = 0; i < 200; i++) {
            const angle = (i / 200) * Math.PI * 2 + time * 2;
            const radius = 80 + Math.sin(i * 0.1 + time * 3) * 20;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius * 0.3;
            
            const temperature = 1 / (radius * 0.01);
            const hue = Math.max(0, 60 - temperature * 30);
            
            ctx.fillStyle = \`hsl(\${hue}, 80%, \${50 + temperature * 20}%)\`;
            if (ctx.fillCircle) {
                ctx.fillCircle(x, y, 2 + Math.random() * 2);
            } else {
                ctx.beginPath();
                ctx.arc(x, y, 2 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Event horizon
        ctx.fillStyle = '#000';
        if (ctx.fillCircle) {
            ctx.fillCircle(centerX, centerY, 40);
        } else {
            ctx.beginPath();
            ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Photon sphere
        ctx.strokeStyle = 'rgba(200, 220, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
        ctx.stroke();
        
        animationId = requestAnimationFrame(animate);
    }
    
    animationId = requestAnimationFrame(animate);
    window.currentAnimationId = animationId;
}`
}
};