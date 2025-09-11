![alt text](Banner.png)
# 🚀 WebGL Canvas

https://horrelltech.github.io/webgl-canvas/

A comprehensive WebGL-powered 2D graphics library that provides a familiar HTML5 Canvas API with GPU acceleration and advanced features. Perfect for games, visualizations, and interactive graphics that need high performance.

## ✨ Current Features

### Core Canvas API
- **Rectangle Drawing** - `fillRect()`, `strokeRect()` with GPU-accelerated batching
- **Circle & Ellipse Drawing** - `fillCircle()`, `strokeCircle()`, `fillEllipse()`, `strokeEllipse()`
- **Line Drawing** - `drawLine()` with customizable width and style
- **Path System** - `beginPath()`, `moveTo()`, `lineTo()`, `arc()`, `bezierCurveTo()`, `quadraticCurveTo()`, `fill()`, `stroke()`
- **Image Rendering** - `drawImage()` with source and destination rectangles
- **Text Rendering** - `fillText()`, `strokeText()`, `measureText()` with font support
- **Color & Style System** - Support for hex, RGB, RGBA, HSL, named colors, gradients, and patterns

### Transform System
- **Matrix Transformations** - `translate()`, `rotate()`, `scale()`, `transform()`, `setTransform()`
- **State Management** - `save()` and `restore()` state stack
- **Reset Transforms** - `resetTransform()` for identity matrix

### Advanced Graphics
- **Linear Gradients** - `createLinearGradient()` with multiple color stops
- **Radial Gradients** - `createRadialGradient()` for circular gradients
- **Pattern Support** - `createPattern()` for repeating image patterns
- **Global Alpha** - Transparency control for all drawing operations
- **Composite Operations** - Blending modes like source-over, multiply, screen, etc.
- **Shadow Effects** - `shadowColor`, `shadowBlur`, `shadowOffsetX`, `shadowOffsetY`

### Image Color Manipulation
- **HSL Adjustments** - `imageHue`, `imageSaturation`, `imageLightness` for color shifting
- **Brightness/Contrast** - `imageBrightness`, `imageContrast` for exposure control
- **Color Effects** - `imageColorMode` for grayscale, sepia, invert, black & white filters
- **Advanced Color** - `imageColorTint`, `imageColorMultiply`, `imageColorAdd` for complex blending
- **Gamma/Exposure** - `imageGamma`, `imageExposure` for professional color grading
- **Filter Presets** - `applyImageFilter()` with built-in effects like 'vintage', 'cold', 'warm'
- **Batch Operations** - `setImageColors()` and `getImageColors()` for efficient property management

### Post-Processing Effects
- **Blur Effects** - Gaussian blur with configurable radius
- **Bloom/Glow Effects** - HDR bloom with threshold and intensity controls
- **Chromatic Aberration** - RGB color channel separation for retro/glitch effects
- **Vignette** - Darkened edges with customizable strength and radius
- **Color Grading** - Brightness, contrast, saturation, and hue adjustments
- **FXAA Anti-aliasing** - Fast approximate anti-aliasing for smooth edges
- **Pixelate** - Retro pixel art effect with configurable pixel size
- **Effect Chaining** - Combine multiple effects with automatic framebuffer management

### Performance Features
- **Optimized Batching** - Groups similar shapes into single GPU draw calls
- **Custom Batch Size** - Configurable batch sizes up to 8,000 objects (with safety limits)
- **Texture Caching** - Automatic image texture management and reuse
- **Memory Efficient** - Smart buffer management and resource cleanup
- **Context Loss Protection** - Robust handling of WebGL context loss/restore

### Display Features
- **Pixel-Perfect Scaling** - Perfect for retro games and pixel art
- **Fullscreen Mode** - Smart fullscreen with aspect ratio preservation
- **Image Smoothing Control** - Toggle between smooth and pixelated rendering
- **High DPI Support** - Automatic pixel density handling

### Developer Tools
- **Custom Shaders** - Easy integration of GLSL vertex and fragment shaders with `addShader()`
- **Debug Mode** - Performance monitoring and batch visualization
- **Event System** - Fullscreen enter/exit events
- **Clean Resource Management** - Proper cleanup of WebGL resources with `dispose()`

### Image Data Operations
- **Get Image Data** - `getImageData()` reads pixels from WebGL framebuffer
- **Put Image Data** - `putImageData()` draws pixel data to canvas
- **Create Image Data** - `createImageData()` for creating blank ImageData
- **Export Functions** - `toDataURL()` and `toBlob()` for saving canvas content

## 🎮 Use Cases & Examples

### 1. Retro-Style Pixel Art Games

Perfect for creating crisp, pixel-perfect games with modern performance:

```javascript
const ctx = new WebGLCanvas(canvas, {
    pixelWidth: 320,      // NES-style resolution
    pixelHeight: 240,
    pixelScale: 3,        // 960x720 display size
    enableFullscreen: true
});

// Simple player object
function createPlayer() {
    return {
        x: 160,
        y: 120,
        size: 16,
        speed: 2,
        color: '#ff4444',
        
        update() {
            // Simple movement with arrow keys
            if (keys.ArrowLeft) this.x -= this.speed;
            if (keys.ArrowRight) this.x += this.speed;
            if (keys.ArrowUp) this.y -= this.speed;
            if (keys.ArrowDown) this.y += this.speed;
            
            // Keep player on screen
            this.x = Math.max(8, Math.min(312, this.x));
            this.y = Math.max(8, Math.min(232, this.y));
        },
        
        render() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - 8, this.y - 8, 16, 16);
        }
    };
}

// Simple bullet system
function createBullet(x, y, vx, vy) {
    return {
        x, y, vx, vy,
        size: 3,
        life: 120, // frames
        
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life--;
            return this.life > 0;
        },
        
        render() {
            ctx.fillStyle = '#ffff00';
            ctx.fillCircle(this.x, this.y, this.size);
        }
    };
}

// Game state
const player = createPlayer();
const bullets = [];
const keys = {};

// Input handling
window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

// Shoot bullets
let shootCooldown = 0;
function handleShooting() {
    if (shootCooldown > 0) shootCooldown--;
    
    if (keys[' '] && shootCooldown === 0) { // Spacebar
        bullets.push(createBullet(player.x, player.y - 8, 0, -4));
        shootCooldown = 10;
    }
}

// Main game loop
function gameLoop() {
    // Clear screen
    ctx.fillStyle = '#001122';
    ctx.fillCanvas();
    
    // Update
    player.update();
    handleShooting();
    
    // Update bullets (remove dead ones)
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (!bullets[i].update()) {
            bullets.splice(i, 1);
        }
    }
    
    // Render
    player.render();
    bullets.forEach(bullet => bullet.render());
    
    // UI
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText(`Bullets: ${bullets.length}`, 10, 20);
    
    ctx.flush(); // IMPORTANT: Render all batched drawing
    
    requestAnimationFrame(gameLoop);
}

gameLoop();
```

### 2. Data Visualizations & Charts

Hardware-accelerated charts and graphs:

```javascript
const ctx = new WebGLCanvas(canvas, {
    enableFullscreen: true
});

// Generate sample stock data
function generateStockData(days = 200) {
    const data = [];
    let price = 100;
    let volume = 1000000;
    
    for (let i = 0; i < days; i++) {
        const change = (Math.random() - 0.5) * 10;
        price = Math.max(10, price + change);
        volume = Math.max(500000, volume + (Math.random() - 0.5) * 200000);
        
        data.push({
            date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000),
            price: price,
            volume: volume,
            change: change
        });
    }
    
    return data;
}

const stockData = generateStockData();
const maxPrice = Math.max(...stockData.map(d => d.price));
const maxVolume = Math.max(...stockData.map(d => d.volume));

function drawStockChart(data) {
    // Clear background
    ctx.fillStyle = '#1e1e1e';
    ctx.fillCanvas();
    
    const chartWidth = 800;
    const chartHeight = 400;
    const padding = 50;
    
    // Draw grid lines
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines (price levels)
    for (let i = 0; i <= 10; i++) {
        const y = padding + (chartHeight - padding * 2) * (i / 10);
        ctx.drawLine(padding, y, chartWidth - padding, y);
        
        // Price labels
        const price = maxPrice * (1 - i / 10);
        ctx.fillStyle = '#888888';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(price.toFixed(0), padding - 5, y + 4);
    }
    
    // Vertical grid lines (time)
    for (let i = 0; i <= 5; i++) {
        const x = padding + (chartWidth - padding * 2) * (i / 5);
        ctx.drawLine(x, padding, x, chartHeight - padding);
    }
    
    // Draw price line
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    
    for (let i = 1; i < data.length; i++) {
        const x1 = padding + ((i - 1) / (data.length - 1)) * (chartWidth - padding * 2);
        const y1 = padding + (1 - data[i - 1].price / maxPrice) * (chartHeight - padding * 2);
        const x2 = padding + (i / (data.length - 1)) * (chartWidth - padding * 2);
        const y2 = padding + (1 - data[i].price / maxPrice) * (chartHeight - padding * 2);
        
        ctx.drawLine(x1, y1, x2, y2);
    }
    
    // Draw volume bars at bottom
    const volumeHeight = 80;
    const volumeY = chartHeight - padding - volumeHeight;
    
    data.forEach((point, i) => {
        const x = padding + (i / (data.length - 1)) * (chartWidth - padding * 2);
        const height = (point.volume / maxVolume) * volumeHeight;
        const barWidth = Math.max(1, (chartWidth - padding * 2) / data.length);
        
        ctx.fillStyle = point.change > 0 ? '#00ff8844' : '#ff444444';
        ctx.fillRect(x - barWidth / 2, volumeY + volumeHeight - height, barWidth, height);
    });
    
    // Chart title
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Stock Price Chart', chartWidth / 2, 30);
    
    // Current price display
    const currentPrice = data[data.length - 1].price;
    const priceChange = data[data.length - 1].change;
    ctx.font = '18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Current: $${currentPrice.toFixed(2)}`, padding, chartHeight - 10);
    
    ctx.fillStyle = priceChange > 0 ? '#00ff88' : '#ff4444';
    ctx.fillText(`Change: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}`, padding + 200, chartHeight - 10);
}

// Animate the chart
let dataIndex = 50;
function animateChart() {
    if (dataIndex < stockData.length) {
        drawStockChart(stockData.slice(0, dataIndex));
        dataIndex++;
    } else {
        drawStockChart(stockData);
    }
    
    ctx.flush(); // IMPORTANT: Render all batched drawing
    
    setTimeout(() => requestAnimationFrame(animateChart), 50);
}

animateChart();
```

### 3. Particle Systems & Effects

Complex particle effects with thousands of particles:

```javascript
const ctx = new WebGLCanvas(canvas);

function createParticle(x, y) {
    return {
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        decay: Math.random() * 0.02 + 0.01,
        size: Math.random() * 3 + 1,
        hue: Math.random() * 360
    };
}

function updateParticle(particle) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.98; // Air resistance
    particle.vy *= 0.98;
    particle.vy += 0.1; // Gravity
    particle.life -= particle.decay;
    
    return particle.life > 0;
}

function renderParticle(particle, ctx) {
    ctx.globalAlpha = particle.life;
    ctx.fillStyle = `hsl(${particle.hue + particle.life * 60}, 100%, 50%)`;
    ctx.fillCircle(particle.x, particle.y, particle.size * particle.life);
}

// Particle system
let particles = [];

function emitParticles(x, y, count = 50) {
    for (let i = 0; i < count; i++) {
        particles.push(createParticle(x, y));
    }
}

function updateParticles() {
    particles = particles.filter(particle => updateParticle(particle));
}

function renderParticles(ctx) {
    particles.forEach(particle => renderParticle(particle, ctx));
    ctx.globalAlpha = 1; // Reset global alpha
}

// Mouse interaction
let mouseX = 400, mouseY = 300;
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', (e) => {
    emitParticles(mouseX, mouseY, 200);
});

// Main loop
function particleLoop() {
    // Clear with fade effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillCanvas();
    
    // Continuously emit particles at mouse position
    if (Math.random() < 0.3) {
        emitParticles(mouseX, mouseY, 5);
    }
    
    updateParticles();
    renderParticles(ctx);
    
    // Display stats
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText(`Particles: ${particles.length}`, 10, 20);
    ctx.fillText('Click to emit burst, move mouse to emit trail', 10, 40);
    
    ctx.flush(); // IMPORTANT: Render all batched drawing
    
    requestAnimationFrame(particleLoop);
}

particleLoop();
```

### 4. Interactive Art & Animations

Creative coding with smooth animations:

```javascript
const ctx = new WebGLCanvas(canvas);

function drawFlowField(ctx) {
    const time = Date.now() * 0.001;
    
    // Clear with gradient background
    const gradient = ctx.createRadialGradient(400, 300, 0, 400, 300, 400);
    gradient.colorStops = [
        { offset: 0, color: [0.1, 0.1, 0.3, 1] },
        { offset: 1, color: [0.05, 0.05, 0.15, 1] }
    ];
    
    ctx.fillStyle = gradient;
    ctx.fillCanvas();
    
    // Flow field visualization
    const gridSize = 20;
    const lineLength = 15;
    
    for (let x = 0; x < 800; x += gridSize) {
        for (let y = 0; y < 600; y += gridSize) {
            // Calculate flow direction using noise-like function
            const angle = Math.sin(x * 0.01 + time) * Math.cos(y * 0.01 + time) * Math.PI * 2;
            const intensity = (Math.sin(x * 0.005 + time * 0.5) + 1) * 0.5;
            
            // Calculate line endpoints
            const endX = x + Math.cos(angle) * lineLength * intensity;
            const endY = y + Math.sin(angle) * lineLength * intensity;
            
            // Set color based on angle and position
            const hue = (angle * 180 / Math.PI + 180) % 360;
            const alpha = 0.3 + intensity * 0.7;
            
            ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${alpha})`;
            ctx.lineWidth = 1 + intensity * 2;
            ctx.drawLine(x, y, endX, endY);
        }
    }
    
    // Add floating orbs
    for (let i = 0; i < 5; i++) {
        const orbX = 400 + Math.sin(time * 0.5 + i * 2) * 200;
        const orbY = 300 + Math.cos(time * 0.3 + i * 1.5) * 150;
        const orbSize = 10 + Math.sin(time * 2 + i) * 5;
        
        const orbGradient = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbSize * 2);
        orbGradient.colorStops = [
            { offset: 0, color: [1, 1, 1, 0.8] },
            { offset: 1, color: [0.3, 0.6, 1, 0] }
        ];
        
        ctx.fillStyle = orbGradient;
        ctx.fillCircle(orbX, orbY, orbSize * 2);
    }
    
    // Center attraction point
    const centerPulse = 5 + Math.sin(time * 4) * 3;
    ctx.fillStyle = `hsla(${time * 60}, 100%, 90%, 0.9)`;
    ctx.fillCircle(400, 300, centerPulse);
}

function flowFieldAnimation() {
    drawFlowField(ctx);
    ctx.flush(); // IMPORTANT: Render all batched drawing
    requestAnimationFrame(flowFieldAnimation);
}

flowFieldAnimation();
```

### 5. Custom Shader Effects

Advanced GPU effects with custom shaders:

```javascript
const ctx = new WebGLCanvas(canvas, { enableFullscreen: true });

// Simple ripple effect shader
const rippleVertexShader = `
    precision mediump float;
    attribute vec2 a_position;
    uniform vec2 u_resolution;
    varying vec2 v_uv;
    
    void main() {
        vec2 normalized = (a_position / u_resolution) * 2.0 - 1.0;
        normalized.y = -normalized.y;
        gl_Position = vec4(normalized, 0, 1);
        v_uv = a_position / u_resolution;
    }
`;

const rippleFragmentShader = `
    precision mediump float;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    varying vec2 v_uv;
    
    void main() {
        vec2 center = u_mouse / u_resolution;
        float dist = distance(v_uv, center);
        
        // Create ripple waves
        float ripple = sin(dist * 30.0 - u_time * 6.0) * exp(-dist * 2.0);
        
        // Create water-like colors
        vec3 waterColor = mix(vec3(0.1, 0.3, 0.9), vec3(0.0, 0.7, 1.0), ripple);
        
        // Add brightness based on ripple intensity
        waterColor += abs(ripple) * 0.5;
        
        gl_FragColor = vec4(waterColor, 1.0);
    }
`;

try {
    // Add the shader
    ctx.addShader('ripple', rippleVertexShader, rippleFragmentShader);

    // Mouse position tracking
    let mouseX = canvas.width * 0.5;
    let mouseY = canvas.height * 0.5;

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        mouseX = (e.clientX - rect.left) * scaleX;
        mouseY = (e.clientY - rect.top) * scaleY;
    });

    function drawRippleEffect() {
        // Create fullscreen quad
        const { vertices, indices } = ctx.createQuad(0, 0, canvas.width, canvas.height);
        
        // Draw with ripple shader
        const time = Date.now() * 0.005;
        ctx.drawWithShader('ripple', vertices, indices, {
            u_time: time,
            u_resolution: [canvas.width, canvas.height],
            u_mouse: [mouseX, mouseY]
        });
        
        ctx.flush(); // IMPORTANT: Render all batched drawing
        requestAnimationFrame(drawRippleEffect);
    }

    drawRippleEffect();
} catch (error) {
    console.error('Shader failed:', error);
}
```

### 6. Scientific Visualizations

Complex data representation with real-time updates:

```javascript
const ctx = new WebGLCanvas(canvas);

function generateHeatmapData(width, height) {
    const data = new Array(width * height);
    const time = Date.now() * 0.001;
    
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const index = y * width + x;
            
            // Generate interesting pattern
            const nx = x / width - 0.5;
            const ny = y / height - 0.5;
            const dist = Math.sqrt(nx * nx + ny * ny);
            
            const value = Math.sin(dist * 20 + time) * 
                         Math.cos(nx * 10 + time * 0.5) * 
                         Math.cos(ny * 10 + time * 0.3);
            
            data[index] = (value + 1) * 0.5; // Normalize to 0-1
        }
    }
    
    return data;
}

function drawHeatmap(data, width, height) {
    const cellWidth = 800 / width;
    const cellHeight = 600 / height;
    
    // Create color gradient for heatmap
    const colors = [
        [0, 0, 0.5, 1],      // Dark blue (cold)
        [0, 0.5, 1, 1],      // Blue
        [0, 1, 0.5, 1],      // Green
        [1, 1, 0, 1],        // Yellow
        [1, 0.5, 0, 1],      // Orange
        [1, 0, 0, 1]         // Red (hot)
    ];
    
    function getHeatmapColor(value) {
        const scaledValue = value * (colors.length - 1);
        const index = Math.floor(scaledValue);
        const t = scaledValue - index;
        
        if (index >= colors.length - 1) return colors[colors.length - 1];
        if (index < 0) return colors[0];
        
        const color1 = colors[index];
        const color2 = colors[index + 1];
        
        return [
            color1[0] + (color2[0] - color1[0]) * t,
            color1[1] + (color2[1] - color1[1]) * t,
            color1[2] + (color2[2] - color1[2]) * t,
            1
        ];
    }
    
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const value = data[y * width + x];
            const color = getHeatmapColor(value);
            
            ctx.fillStyle = `rgba(${Math.floor(color[0] * 255)}, ${Math.floor(color[1] * 255)}, ${Math.floor(color[2] * 255)}, ${color[3]})`;
            ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
        }
    }
    
    // Draw color legend
    const legendWidth = 20;
    const legendHeight = 200;
    const legendX = 750;
    const legendY = 50;
    
    for (let i = 0; i < legendHeight; i++) {
        const value = 1 - (i / legendHeight);
        const color = getHeatmapColor(value);
        
        ctx.fillStyle = `rgba(${Math.floor(color[0] * 255)}, ${Math.floor(color[1] * 255)}, ${Math.floor(color[2] * 255)}, ${color[3]})`;
        ctx.fillRect(legendX, legendY + i, legendWidth, 1);
    }
    
    // Legend labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Hot', legendX + 25, legendY + 10);
    ctx.fillText('Cold', legendX + 25, legendY + legendHeight - 5);
    
    // Title
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Real-time Heat Map Visualization', 400, 30);
}

// Animation loop
const heatmapWidth = 80;
const heatmapHeight = 60;

function heatmapAnimation() {
    ctx.fillStyle = '#000000';
    ctx.fillCanvas();
    
    const data = generateHeatmapData(heatmapWidth, heatmapHeight);
    drawHeatmap(data, heatmapWidth, heatmapHeight);
    
    ctx.flush(); // IMPORTANT: Render all batched drawing
    
    requestAnimationFrame(heatmapAnimation);
}

heatmapAnimation();
```

### 7. Post-Processing Effects & Filters

Advanced GPU-based post-processing for cinematic visuals:

```javascript
const ctx = new WebGLCanvas(canvas, {
    enableFullscreen: true
});

// Scene rendering function
function drawGameScene() {
    // Clear background
    ctx.fillStyle = '#001122';
    ctx.fillCanvas();
    
    // Draw some game objects
    // Bright sun/light source for bloom
    ctx.fillStyle = '#ffff88';
    ctx.fillCircle(600, 100, 40);
    ctx.fillStyle = '#ffffff';
    ctx.fillCircle(600, 100, 25);
    
    // Player character
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(350, 250, 100, 100);
    ctx.fillStyle = '#ffffff';
    ctx.fillCircle(375, 275, 8); // Eye
    ctx.fillCircle(425, 275, 8); // Eye
    
    // Environment elements
    ctx.fillStyle = '#228844';
    for (let i = 0; i < 5; i++) {
        const x = i * 150 + 50;
        ctx.fillRect(x, 300, 20, 150); // Tree trunk
        ctx.fillCircle(x + 10, 280, 30); // Tree top
    }
    
    // Foreground elements
    ctx.fillStyle = '#666666';
    ctx.fillRect(0, 450, 800, 150); // Ground
    
    // UI elements (bright for bloom effect)
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(50, 50, 200, 30);
    ctx.fillStyle = '#000000';
    ctx.font = '20px Arial';
    ctx.fillText('HEALTH: 100%', 60, 72);
}

// Post-processing effect examples
function demonstratePostEffects() {
    let currentDemo = 0;
    const demos = [
        {
            name: 'No Effects',
            setup: () => ctx.clearPostEffects()
        },
        {
            name: 'Gaussian Blur',
            setup: () => {
                ctx.clearPostEffects();
                ctx.addBlur(4.0); // radius
            }
        },
        {
            name: 'Bloom Effect',
            setup: () => {
                ctx.clearPostEffects();
                ctx.addBloom(0.7, 1.2); // threshold, strength
            }
        },
        {
            name: 'Chromatic Aberration',
            setup: () => {
                ctx.clearPostEffects();
                ctx.addChromaticAberration(0.008); // strength
            }
        },
        {
            name: 'Vignette',
            setup: () => {
                ctx.clearPostEffects();
                ctx.addVignette(0.8, 0.7); // strength, radius
            }
        },
        {
            name: 'Color Grading - Warm',
            setup: () => {
                ctx.clearPostEffects();
                ctx.addColorGrading({
                    brightness: 0.1,
                    contrast: 1.2,
                    saturation: 1.3,
                    hue: 0.0
                });
            }
        },
        {
            name: 'Color Grading - Cool',
            setup: () => {
                ctx.clearPostEffects();
                ctx.addColorGrading({
                    brightness: -0.1,
                    contrast: 1.1,
                    saturation: 0.8,
                    hue: 0.0
                });
            }
        },
        {
            name: 'FXAA Anti-aliasing',
            setup: () => {
                ctx.clearPostEffects();
                ctx.addFXAA();
            }
        },
        {
            name: 'Pixelate Effect',
            setup: () => {
                ctx.clearPostEffects();
                ctx.addPixelate(8.0); // pixel size
            }
        },
        {
            name: 'Combined Effects',
            setup: () => {
                ctx.clearPostEffects();
                // Chain multiple effects
                ctx.addBloom(0.6, 0.8);        // Subtle bloom
                ctx.addVignette(0.4, 0.9);     // Light vignette
                ctx.addColorGrading({          // Cinematic grading
                    brightness: 0.05,
                    contrast: 1.15,
                    saturation: 1.1,
                    hue: 0.0
                });
                ctx.addFXAA();                 // Final anti-aliasing
            }
        }
    ];
    
    // Set up first demo
    demos[currentDemo].setup();
    
    // Cycle through demos every 3 seconds
    setInterval(() => {
        currentDemo = (currentDemo + 1) % demos.length;
        demos[currentDemo].setup();
        console.log(`Now showing: ${demos[currentDemo].name}`);
    }, 3000);
    
    // Animation loop
    function animate() {
        drawGameScene();
        
        // Display current effect name
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(250, 500, 300, 50);
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(demos[currentDemo].name, 400, 530);
        ctx.textAlign = 'left'; // Reset alignment
        
        ctx.flush(); // Apply all effects and render
        
        requestAnimationFrame(animate);
    }
    
    animate();
    
    // Manual controls
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ') {
            currentDemo = (currentDemo + 1) % demos.length;
            demos[currentDemo].setup();
            console.log(`Switched to: ${demos[currentDemo].name}`);
        }
    });
    
    console.log('Post-processing demo started! Press SPACE to cycle effects manually.');
}

// Interactive effect controls
function createEffectControls() {
    const controlsDiv = document.createElement('div');
    controlsDiv.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        max-width: 250px;
    `;
    
    controlsDiv.innerHTML = `
        <h3>Post-Processing Controls</h3>
        <div>
            <label>Blur Radius: <span id="blurValue">2.0</span></label><br>
            <input type="range" id="blurSlider" min="0" max="10" step="0.1" value="2.0">
        </div>
        <div>
            <label>Bloom Threshold: <span id="bloomThresholdValue">0.7</span></label><br>
            <input type="range" id="bloomThresholdSlider" min="0" max="1" step="0.01" value="0.7">
        </div>
        <div>
            <label>Bloom Strength: <span id="bloomStrengthValue">1.0</span></label><br>
            <input type="range" id="bloomStrengthSlider" min="0" max="3" step="0.1" value="1.0">
        </div>
        <div>
            <label>Vignette Strength: <span id="vignetteValue">0.5</span></label><br>
            <input type="range" id="vignetteSlider" min="0" max="1" step="0.01" value="0.5">
        </div>
        <div>
            <label>Aberration: <span id="aberrationValue">0.005</span></label><br>
            <input type="range" id="aberrationSlider" min="0" max="0.02" step="0.001" value="0.005">
        </div>
        <div>
            <label>Brightness: <span id="brightnessValue">0.0</span></label><br>
            <input type="range" id="brightnessSlider" min="-0.5" max="0.5" step="0.01" value="0.0">
        </div>
        <div>
            <label>Contrast: <span id="contrastValue">1.0</span></label><br>
            <input type="range" id="contrastSlider" min="0.5" max="2.0" step="0.01" value="1.0">
        </div>
        <div>
            <label>Saturation: <span id="saturationValue">1.0</span></label><br>
            <input type="range" id="saturationSlider" min="0" max="2" step="0.01" value="1.0">
        </div>
        <br>
        <button id="resetEffects">Reset All Effects</button>
        <button id="presetFilm">Film Look</button>
        <button id="presetDream">Dream Sequence</button>
        <button id="presetGlitch">Glitch Effect</button>
    `;
    
    document.body.appendChild(controlsDiv);
    
    // Control event handlers
    function updateEffects() {
        ctx.clearPostEffects();
        
        const blur = parseFloat(document.getElementById('blurSlider').value);
        const bloomThreshold = parseFloat(document.getElementById('bloomThresholdSlider').value);
        const bloomStrength = parseFloat(document.getElementById('bloomStrengthSlider').value);
        const vignette = parseFloat(document.getElementById('vignetteSlider').value);
        const aberration = parseFloat(document.getElementById('aberrationSlider').value);
        const brightness = parseFloat(document.getElementById('brightnessSlider').value);
        const contrast = parseFloat(document.getElementById('contrastSlider').value);
        const saturation = parseFloat(document.getElementById('saturationSlider').value);
        
        // Add effects in optimal order
        if (blur > 0) ctx.addBlur(blur);
        if (bloomStrength > 0 && bloomThreshold < 1) ctx.addBloom(bloomThreshold, bloomStrength);
        if (aberration > 0) ctx.addChromaticAberration(aberration);
        if (vignette > 0) ctx.addVignette(vignette, 0.8);
        if (brightness !== 0 || contrast !== 1 || saturation !== 1) {
            ctx.addColorGrading({
                brightness,
                contrast,
                saturation,
                hue: 0
            });
        }
        ctx.addFXAA(); // Always add FXAA for smooth final result
    }
    
    // Update value displays and effects
    ['blur', 'bloomThreshold', 'bloomStrength', 'vignette', 'aberration', 'brightness', 'contrast', 'saturation'].forEach(name => {
        const slider = document.getElementById(name + 'Slider');
        const display = document.getElementById(name + 'Value');
        
        slider.addEventListener('input', () => {
            display.textContent = slider.value;
            updateEffects();
        });
    });
    
    // Preset buttons
    document.getElementById('resetEffects').addEventListener('click', () => {
        ctx.clearPostEffects();
        // Reset all sliders
        document.getElementById('blurSlider').value = 0;
        document.getElementById('bloomThresholdSlider').value = 1;
        document.getElementById('bloomStrengthSlider').value = 0;
        document.getElementById('vignetteSlider').value = 0;
        document.getElementById('aberrationSlider').value = 0;
        document.getElementById('brightnessSlider').value = 0;
        document.getElementById('contrastSlider').value = 1;
        document.getElementById('saturationSlider').value = 1;
        updateEffects();
    });
    
    document.getElementById('presetFilm').addEventListener('click', () => {
        ctx.clearPostEffects();
        ctx.addBloom(0.8, 0.4);
        ctx.addVignette(0.3, 0.9);
        ctx.addColorGrading({
            brightness: 0.02,
            contrast: 1.1,
            saturation: 0.9,
            hue: 0
        });
        ctx.addFXAA();
    });
    
    document.getElementById('presetDream').addEventListener('click', () => {
        ctx.clearPostEffects();
        ctx.addBlur(1.5);
        ctx.addBloom(0.5, 1.2);
        ctx.addVignette(0.2, 0.95);
        ctx.addColorGrading({
            brightness: 0.08,
            contrast: 0.9,
            saturation: 1.2,
            hue: 0
        });
    });
    
    document.getElementById('presetGlitch').addEventListener('click', () => {
        ctx.clearPostEffects();
        ctx.addChromaticAberration(0.012);
        ctx.addPixelate(3);
        ctx.addColorGrading({
            brightness: 0.05,
            contrast: 1.3,
            saturation: 1.4,
            hue: 0
        });
    });
}

// Start the post-processing demonstration
demonstratePostEffects();
createEffectControls();
```

### 8. Professional Image Color Manipulation

Advanced GPU-accelerated image color processing with real-time adjustments:

```javascript
const ctx = new WebGLCanvas(canvas, {
    enableFullscreen: true
});

// Use a free online image for demonstration
const imageUrl = 'https://picsum.photos/400/300?random=1';

// Create image manipulation demo
async function createImageColorDemo() {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Enable CORS for external images
    
    return new Promise((resolve) => {
        img.onload = () => {
            const originalWidth = img.width;
            const originalHeight = img.height;
            const scale = Math.min(200 / originalWidth, 150 / originalHeight);
            const displayWidth = originalWidth * scale;
            const displayHeight = originalHeight * scale;
            
            resolve({ img, displayWidth, displayHeight });
        };
        img.src = imageUrl;
    });
}

// Image filter gallery
async function imageManipulationGallery() {
    const { img, displayWidth, displayHeight } = await createImageColorDemo();
    
    // Define filter configurations
    const filterExamples = [
        {
            name: 'Original',
            settings: {},
            description: 'No filters applied'
        },
        {
            name: 'Vintage',
            settings: {
                hue: 30,
                saturation: 0.7,
                contrast: 1.2,
                brightness: 0.05,
                tint: [0.9, 0.8, 0.6, 0.15]
            },
            description: 'Warm vintage film look'
        },
        {
            name: 'Cold Blue',
            settings: {
                hue: -20,
                saturation: 0.8,
                brightness: -0.1,
                tint: [0.6, 0.8, 1.0, 0.2]
            },
            description: 'Cool blue cinematic tone'
        },
        {
            name: 'High Contrast',
            settings: {
                contrast: 1.8,
                saturation: 1.4,
                brightness: 0.1,
                gamma: 0.8
            },
            description: 'Dramatic high contrast'
        },
        {
            name: 'Sepia Tone',
            settings: {
                mode: 2,
                brightness: 0.1,
                contrast: 1.1
            },
            description: 'Classic sepia photograph'
        },
        {
            name: 'Grayscale',
            settings: {
                mode: 1,
                contrast: 1.2
            },
            description: 'Black and white'
        },
        {
            name: 'Neon Glow',
            settings: {
                hue: 180,
                saturation: 2.0,
                brightness: 0.2,
                contrast: 1.5,
                gamma: 0.7
            },
            description: 'Cyberpunk neon effect'
        },
        {
            name: 'Faded Film',
            settings: {
                opacity: 0.8,
                contrast: 0.7,
                saturation: 0.6,
                brightness: 0.15,
                tint: [1, 0.95, 0.85, 0.1]
            },
            description: 'Faded old film look'
        },
        {
            name: 'Matrix',
            settings: {
                hue: 120,
                saturation: 0.3,
                brightness: -0.2,
                contrast: 1.3,
                tint: [0, 1, 0, 0.1]
            },
            description: 'Green matrix digital rain'
        },
        {
            name: 'Inverted',
            settings: {
                mode: 3,
                hue: 180
            },
            description: 'Color negative effect'
        },
        {
            name: 'Overexposed',
            settings: {
                exposure: 1.5,
                brightness: 0.3,
                saturation: 0.8,
                contrast: 0.8
            },
            description: 'Bright overexposed look'
        },
        {
            name: 'Underexposed',
            settings: {
                exposure: -1.2,
                brightness: -0.2,
                contrast: 1.4,
                saturation: 1.2
            },
            description: 'Dark moody shadows'
        }
    ];
    
    // Layout configuration
    const cols = 4;
    const rows = Math.ceil(filterExamples.length / cols);
    const padding = 20;
    const labelHeight = 40;
    const totalWidth = cols * displayWidth + (cols - 1) * padding;
    const totalHeight = rows * (displayHeight + labelHeight) + (rows - 1) * padding;
    
    // Resize canvas to fit gallery
    ctx.canvas.width = Math.max(800, totalWidth + 40);
    ctx.canvas.height = Math.max(600, totalHeight + 80);
    ctx.resize(ctx.canvas.width, ctx.canvas.height);
    
    function drawImageGallery() {
        // Clear background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillCanvas();
        
        // Gallery title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GPU-Accelerated Image Color Manipulation Gallery', ctx.canvas.width / 2, 40);
        
        // Draw each filtered image
        filterExamples.forEach((filter, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = 20 + col * (displayWidth + padding);
            const y = 60 + row * (displayHeight + labelHeight + padding);
            
            // Reset all image properties
            ctx.resetImageColors();
            
            // Apply current filter settings
            if (filter.settings.hue !== undefined) ctx.imageHue = filter.settings.hue;
            if (filter.settings.saturation !== undefined) ctx.imageSaturation = filter.settings.saturation;
            if (filter.settings.lightness !== undefined) ctx.imageLightness = filter.settings.lightness;
            if (filter.settings.brightness !== undefined) ctx.imageBrightness = filter.settings.brightness;
            if (filter.settings.contrast !== undefined) ctx.imageContrast = filter.settings.contrast;
            if (filter.settings.opacity !== undefined) ctx.imageOpacity = filter.settings.opacity;
            if (filter.settings.tint !== undefined) ctx.imageColorTint = filter.settings.tint;
            if (filter.settings.mode !== undefined) ctx.imageColorMode = filter.settings.mode;
            if (filter.settings.multiply !== undefined) ctx.imageColorMultiply = filter.settings.multiply;
            if (filter.settings.add !== undefined) ctx.imageColorAdd = filter.settings.add;
            if (filter.settings.gamma !== undefined) ctx.imageGamma = filter.settings.gamma;
            if (filter.settings.exposure !== undefined) ctx.imageExposure = filter.settings.exposure;
            
            // Draw the filtered image
            ctx.drawImage(img, 0, 0, img.width, img.height, x, y, displayWidth, displayHeight);
            
            // Draw border
            ctx.strokeStyle = '#444444';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 1, y - 1, displayWidth + 2, displayHeight + 2);
            
            // Draw labels
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(filter.name, x + displayWidth / 2, y + displayHeight + 20);
            
            ctx.fillStyle = '#cccccc';
            ctx.font = '12px Arial';
            ctx.fillText(filter.description, x + displayWidth / 2, y + displayHeight + 35);
        });
        
        // Instructions
        ctx.fillStyle = '#888888';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('All effects are rendered in real-time using GPU shaders', ctx.canvas.width / 2, ctx.canvas.height - 10);
    }
    
    drawImageGallery();
    ctx.flush();
}

// Interactive color adjustment demo
async function interactiveColorDemo() {
    const { img, displayWidth, displayHeight } = await createImageColorDemo();
    
    // Create control panel
    const controls = {
        hue: 0,
        saturation: 1,
        lightness: 0,
        brightness: 0,
        contrast: 1,
        gamma: 1,
        exposure: 0
    };
    
    // Mouse position for live preview
    let mouseX = 0, mouseY = 0;
    let isMouseDown = false;
    
    ctx.canvas.addEventListener('mousemove', (e) => {
        const rect = ctx.canvas.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) * (ctx.canvas.width / rect.width);
        mouseY = (e.clientY - rect.top) * (ctx.canvas.height / rect.height);
        
        if (isMouseDown) {
            // Adjust parameters based on mouse position
            controls.hue = ((mouseX / ctx.canvas.width) - 0.5) * 360;
            controls.saturation = Math.max(0, (mouseY / ctx.canvas.height) * 2);
            updateDisplay();
        }
    });
    
    ctx.canvas.addEventListener('mousedown', () => isMouseDown = true);
    ctx.canvas.addEventListener('mouseup', () => isMouseDown = false);
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        const step = e.shiftKey ? 0.1 : 0.05;
        
        switch(e.key.toLowerCase()) {
            case 'h': controls.hue = (controls.hue + 10) % 360; break;
            case 'g': controls.hue = (controls.hue - 10 + 360) % 360; break;
            case 's': controls.saturation = Math.max(0, controls.saturation + step); break;
            case 'a': controls.saturation = Math.max(0, controls.saturation - step); break;
            case 'w': controls.brightness = Math.min(1, controls.brightness + step); break;
            case 'q': controls.brightness = Math.max(-1, controls.brightness - step); break;
            case 'd': controls.contrast = Math.max(0, controls.contrast + step); break;
            case 'f': controls.contrast = Math.max(0, controls.contrast - step); break;
            case 'r': // Reset all
                Object.keys(controls).forEach(key => {
                    controls[key] = key === 'saturation' || key === 'contrast' || key === 'gamma' ? 1 : 0;
                });
                break;
        }
        updateDisplay();
    });
    
    function updateDisplay() {
        // Clear background
        ctx.fillStyle = '#2a2a2a';
        ctx.fillCanvas();
        
        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Interactive Image Color Adjustment', ctx.canvas.width / 2, 30);
        
        // Draw original image
        ctx.resetImageColors();
        const originalX = 50;
        const originalY = 60;
        ctx.drawImage(img, originalX, originalY, displayWidth * 1.5, displayHeight * 1.5);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Original', originalX + displayWidth * 0.75, originalY + displayHeight * 1.5 + 20);
        
        // Draw adjusted image
        ctx.imageHue = controls.hue;
        ctx.imageSaturation = controls.saturation;
        ctx.imageLightness = controls.lightness;
        ctx.imageBrightness = controls.brightness;
        ctx.imageContrast = controls.contrast;
        ctx.imageGamma = controls.gamma;
        ctx.imageExposure = controls.exposure;
        
        const adjustedX = originalX + displayWidth * 1.5 + 50;
        const adjustedY = originalY;
        ctx.drawImage(img, adjustedX, adjustedY, displayWidth * 1.5, displayHeight * 1.5);
        
        ctx.fillText('Adjusted', adjustedX + displayWidth * 0.75, adjustedY + displayHeight * 1.5 + 20);
        
        // Display current values
        const valuesY = adjustedY + displayHeight * 1.5 + 60;
        ctx.fillStyle = '#cccccc';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        
        const values = [
            `Hue: ${controls.hue.toFixed(1)}°`,
            `Saturation: ${controls.saturation.toFixed(2)}`,
            `Lightness: ${controls.lightness.toFixed(2)}`,
            `Brightness: ${controls.brightness.toFixed(2)}`,
            `Contrast: ${controls.contrast.toFixed(2)}`,
            `Gamma: ${controls.gamma.toFixed(2)}`,
            `Exposure: ${controls.exposure.toFixed(2)}`
        ];
        
        values.forEach((value, i) => {
            ctx.fillText(value, 50, valuesY + i * 20);
        });
        
        // Instructions
        ctx.fillStyle = '#888888';
        ctx.font = '12px Arial';
        const instructions = [
            'Drag mouse to adjust Hue (X-axis) and Saturation (Y-axis)',
            'Keyboard: H/G=Hue, S/A=Saturation, W/Q=Brightness, D/F=Contrast, R=Reset'
        ];
        
        instructions.forEach((instruction, i) => {
            ctx.fillText(instruction, 50, ctx.canvas.height - 30 + i * 15);
        });
    }
    
    // Auto-animate demonstration
    let autoDemo = true;
    let time = 0;
    
    function animate() {
        if (autoDemo && !isMouseDown) {
            time += 0.02;
            controls.hue = Math.sin(time) * 60;
            controls.saturation = 0.8 + Math.sin(time * 0.7) * 0.4;
            controls.brightness = Math.sin(time * 0.5) * 0.2;
            controls.contrast = 1 + Math.sin(time * 0.3) * 0.3;
            updateDisplay();
        }
        
        ctx.flush();
        requestAnimationFrame(animate);
    }
    
    // Disable auto demo on user interaction
    ctx.canvas.addEventListener('click', () => autoDemo = false);
    
    updateDisplay();
    animate();
}

// Batch processing demonstration
async function batchProcessingDemo() {
    // Create multiple images with different effects
    const images = await Promise.all([
        createImageColorDemo(),
        createImageColorDemo(),
        createImageColorDemo()
    ]);
    
    const effects = [
        { name: 'Warm Sunset', filter: 'warm' },
        { name: 'Cold Winter', filter: 'cold' },
        { name: 'Dramatic B&W', filter: 'dramatic' }
    ];
    
    function processBatch() {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillCanvas();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Batch Image Processing with Preset Filters', 400, 30);
        
        images.forEach(({ img, displayWidth, displayHeight }, index) => {
            const x = 50 + index * 250;
            const y = 60;
            
            // Apply preset filter
            ctx.applyImageFilter(effects[index].filter, 1.0);
            
            // Draw processed image
            ctx.drawImage(img, x, y, displayWidth, displayHeight);
            
            // Label
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Arial';
            ctx.fillText(effects[index].name, x + displayWidth / 2, y + displayHeight + 25);
            
            // Show settings used
            const settings = ctx.getImageColors();
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '10px monospace';
            ctx.textAlign = 'left';
            
            const settingsText = [
                `H: ${settings.hue}`,
                `S: ${settings.saturation.toFixed(1)}`,
                `B: ${settings.brightness.toFixed(1)}`,
                `C: ${settings.contrast.toFixed(1)}`
            ];
            
            settingsText.forEach((text, i) => {
                ctx.fillText(text, x, y + displayHeight + 45 + i * 12);
            });
        });
        
        ctx.textAlign = 'center'; // Reset alignment
    }
    
    processBatch();
    ctx.flush();
}

// Run demonstrations
console.log('Loading image color manipulation demos...');

// Run gallery demo by default
imageManipulationGallery().catch(console.error);

// Uncomment to run interactive demo instead:
// interactiveColorDemo().catch(console.error);

// Uncomment to run batch processing demo:
// batchProcessingDemo().catch(console.error);
```

### Real-Time Color Grading Pipeline

Professional color grading workflow for video-like effects:

```javascript
const ctx = new WebGLCanvas(canvas);

// Professional color grading class
class ColorGrader {
    constructor(webglCanvas) {
        this.ctx = webglCanvas;
        this.presets = {
            cinematic: {
                name: 'Cinematic',
                brightness: -0.05,
                contrast: 1.15,
                saturation: 0.9,
                hue: 0,
                gamma: 0.9,
                tint: [1, 0.95, 0.85, 0.08]
            },
            documentary: {
                name: 'Documentary',
                brightness: 0.02,
                contrast: 1.08,
                saturation: 0.85,
                hue: 0,
                gamma: 1.1
            },
            scifi: {
                name: 'Sci-Fi Blue',
                brightness: -0.1,
                contrast: 1.25,
                saturation: 0.7,
                hue: -15,
                tint: [0.7, 0.85, 1.0, 0.15]
            },
            horror: {
                name: 'Horror Green',
                brightness: -0.2,
                contrast: 1.4,
                saturation: 0.6,
                hue: 30,
                gamma: 0.8,
                tint: [0.8, 1.0, 0.7, 0.1]
            },
            romance: {
                name: 'Romantic Warm',
                brightness: 0.1,
                contrast: 0.95,
                saturation: 1.1,
                hue: 10,
                tint: [1.0, 0.9, 0.8, 0.12]
            }
        };
    }
    
    applyGrade(presetName, intensity = 1.0) {
        const preset = this.presets[presetName];
        if (!preset) return;
        
        this.ctx.setImageColors({
            brightness: preset.brightness * intensity,
            contrast: 1 + (preset.contrast - 1) * intensity,
            saturation: 1 + (preset.saturation - 1) * intensity,
            hue: preset.hue * intensity,
            gamma: 1 + (preset.gamma - 1) * intensity,
            tint: preset.tint ? [
                preset.tint[0],
                preset.tint[1], 
                preset.tint[2],
                preset.tint[3] * intensity
            ] : [0, 0, 0, 0]
        });
    }
    
    createCustomGrade(params) {
        return {
            name: params.name || 'Custom',
            brightness: params.brightness || 0,
            contrast: params.contrast || 1,
            saturation: params.saturation || 1,
            hue: params.hue || 0,
            gamma: params.gamma || 1,
            tint: params.tint || [0, 0, 0, 0]
        };
    }
}

// Usage example
const grader = new ColorGrader(ctx);

async function demonstrateColorGrading() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = 'https://picsum.photos/800/400?random=2';
    
    img.onload = () => {
        let currentPreset = 0;
        const presetNames = Object.keys(grader.presets);
        
        function renderWithGrading() {
            ctx.fillStyle = '#000000';
            ctx.fillCanvas();
            
            // Apply current color grading preset
            const presetName = presetNames[currentPreset];
            grader.applyGrade(presetName);
            
            // Draw the graded image
            ctx.drawImage(img, 100, 50, 600, 300);
            
            // Display preset info
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Color Grading: ${grader.presets[presetName].name}`, 400, 30);
            
            ctx.font = '16px Arial';
            ctx.fillText('Press SPACE to cycle presets', 400, 380);
            
            ctx.flush();
        }
        
        // Cycle presets automatically
        setInterval(() => {
            currentPreset = (currentPreset + 1) % presetNames.length;
            renderWithGrading();
        }, 2500);
        
        // Manual control
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                currentPreset = (currentPreset + 1) % presetNames.length;
                renderWithGrading();
                e.preventDefault();
            }
        });
        
        renderWithGrading();
    };
}

demonstrateColorGrading();
```

### Advanced Post-Processing Techniques

```javascript
// Dynamic post-processing based on game state
function createDynamicPostProcessing(ctx) {
    let playerHealth = 100;
    let isUnderwater = false;
    let timeOfDay = 0.5; // 0 = midnight, 0.5 = noon, 1 = midnight
    
    function updatePostProcessing() {
        ctx.clearPostEffects();
        
        // Health-based effects
        if (playerHealth < 30) {
            // Low health: red tint, vignette, blur
            ctx.addVignette(0.8, 0.6);
            ctx.addColorGrading({
                brightness: -0.1,
                contrast: 1.2,
                saturation: 0.7,
                hue: 0
            });
            ctx.addBlur(1.0);
        } else if (playerHealth < 60) {
            // Medium health: slight vignette
            ctx.addVignette(0.3, 0.8);
        }
        
        // Environmental effects
        if (isUnderwater) {
            ctx.addBlur(0.8);
            ctx.addColorGrading({
                brightness: -0.2,
                contrast: 0.9,
                saturation: 0.6,
                hue: 0
            });
            ctx.addVignette(0.4, 0.85);
        }
        
        // Time of day effects
        if (timeOfDay < 0.2 || timeOfDay > 0.8) {
            // Night time: blue tint, high contrast
            ctx.addColorGrading({
                brightness: -0.3,
                contrast: 1.4,
                saturation: 0.8,
                hue: 0
            });
            ctx.addVignette(0.6, 0.7);
        } else if (timeOfDay > 0.4 && timeOfDay < 0.6) {
            // High noon: bright, high saturation
            ctx.addBloom(0.7, 0.8);
            ctx.addColorGrading({
                brightness: 0.1,
                contrast: 1.1,
                saturation: 1.2,
                hue: 0
            });
        }
        
        // Always add anti-aliasing
        ctx.addFXAA();
    }
    
    // Simulate game events
    setInterval(() => {
        // Randomly change health
        if (Math.random() < 0.1) {
            playerHealth = Math.max(0, Math.min(100, playerHealth + (Math.random() - 0.5) * 20));
        }
        
        // Toggle underwater occasionally
        if (Math.random() < 0.05) {
            isUnderwater = !isUnderwater;
        }
        
        // Advance time
        timeOfDay = (timeOfDay + 0.01) % 1;
        
        updatePostProcessing();
    }, 100);
    
    return { updatePostProcessing };
}

// createDynamicPostProcessing(ctx);
```

## Good post-processing practice 
``` javascript
// Good: Enable effects once, not every frame
const ctx = new WebGLCanvas(canvas);
ctx.addBloom(1.0, 0.5, 2.0);  // Do this once at startup

function animate() {
    // Don't add/remove effects every frame!
    // ctx.clearPostEffects(); // ❌ Bad!
    // ctx.addBloom(...);       // ❌ Bad!
    
    // Just draw your scene
    ctx.clear();
    
    // Draw your animated objects
    drawScene();
    
    // Flush once at the end
    ctx.flush(); // ✅ Good - includes post-processing
    
    requestAnimationFrame(animate);
}

// If you need to change effect parameters dynamically:
ctx.updatePostEffect('bloom', { strength: 0.8 }); // ✅ Better
```

## 🎨 Image Color Manipulation API

### Properties

**HSL Color Space:**
- `imageHue` - Hue shift in degrees (-180 to 180)
- `imageSaturation` - Saturation multiplier (0+ where 1 = normal)  
- `imageLightness` - Lightness adjustment (-1 to 1 where 0 = normal)

**Exposure Control:**
- `imageBrightness` - Brightness offset (-1 to 1 where 0 = normal)
- `imageContrast` - Contrast multiplier (0+ where 1 = normal)
- `imageGamma` - Gamma correction (0.1 to 3 where 1 = normal)
- `imageExposure` - Exposure stops (-3 to 3 where 0 = normal)

**Color Effects:**
- `imageOpacity` - Image opacity (0 to 1 where 1 = opaque)
- `imageColorMode` - Filter mode (0=normal, 1=grayscale, 2=sepia, 3=invert, 4=threshold)
- `imageColorTint` - RGBA tint overlay color array [r, g, b, a]
- `imageColorMultiply` - RGBA multiply blend color array [r, g, b, a]
- `imageColorAdd` - RGBA additive blend color array [r, g, b, a]

### Methods

**Batch Operations:**
- `setImageColors(options)` - Set multiple properties at once
- `getImageColors()` - Get current color settings object
- `resetImageColors()` - Reset all properties to defaults

**Filter Presets:**
- `applyImageFilter(name, intensity?)` - Apply named preset filter
  - Available filters: 'grayscale', 'sepia', 'invert', 'vintage', 'cold', 'warm', 'dramatic', 'fade', 'bright', 'dark'
  - Intensity: 0-1 multiplier for effect strength

**Usage Examples:**

```javascript
// Individual property adjustments
ctx.imageHue = 45;          // Shift hue 45 degrees
ctx.imageSaturation = 1.3;  // Increase saturation 30%
ctx.imageBrightness = 0.2;  // Increase brightness

// Batch property setting
ctx.setImageColors({
    hue: -30,
    saturation: 0.8,
    brightness: 0.1,
    contrast: 1.2,
    tint: [1, 0.9, 0.7, 0.15]  // Warm tint
});

// Apply preset filters
ctx.applyImageFilter('vintage');      // Full vintage effect
ctx.applyImageFilter('sepia', 0.5);   // 50% sepia intensity

// Professional color grading
ctx.setImageColors({
    gamma: 0.9,        // Slightly darker gamma
    exposure: 0.3,     // Increase exposure
    contrast: 1.15,    // More contrast
    saturation: 0.95   // Slightly less saturation
});

// Draw image with all effects applied
ctx.drawImage(myImage, 0, 0);
ctx.flush(); // Apply effects and render
```

## 🎯 Complete API Reference

### Drawing Methods

**Rectangles:**
- `fillRect(x, y, width, height)` - GPU-batched filled rectangles
- `strokeRect(x, y, width, height)` - GPU-batched stroked rectangles

**Circles & Ellipses:**
- `fillCircle(x, y, radius)` - GPU-batched filled circles
- `strokeCircle(x, y, radius)` - GPU-batched stroked circles
- `fillEllipse(x, y, radiusX, radiusY, rotation?, startAngle?, endAngle?, counterclockwise?)`
- `strokeEllipse(x, y, radiusX, radiusY, rotation?, startAngle?, endAngle?, counterclockwise?)`

**Lines:**
- `drawLine(x1, y1, x2, y2)` - GPU-batched lines
- `setLineDash(segments)` - Set dash pattern
- `getLineDash()` - Get current dash pattern

**Paths:**
- `beginPath()` - Start new path
- `moveTo(x, y)` - Move without drawing
- `lineTo(x, y)` - Draw line to point
- `arc(x, y, radius, startAngle, endAngle, counterclockwise?)` - Arc segment
- `arcTo(x1, y1, x2, y2, radius)` - Arc between points
- `quadraticCurveTo(cpx, cpy, x, y)` - Quadratic Bézier curve
- `bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)` - Cubic Bézier curve
- `rect(x, y, width, height)` - Add rectangle to path
- `roundRect(x, y, width, height, radii)` - Add rounded rectangle to path
- `ellipse(x, y, radiusX, radiusY, rotation?, startAngle?, endAngle?, counterclockwise?)` - Add ellipse to path
- `closePath()` - Close current path
- `fill()` - Fill current path
- `stroke()` - Stroke current path

**Images:**
- `drawImage(image, dx, dy)` - Draw image at position
- `drawImage(image, dx, dy, dWidth, dHeight)` - Draw scaled image
- `drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)` - Draw image region

**Text:**
- `fillText(text, x, y, maxWidth?)` - Draw filled text
- `strokeText(text, x, y, maxWidth?)` - Draw stroked text
- `measureText(text)` - Get text metrics

**Image Data:**
- `putImageData(imageData, dx, dy, dirtyX?, dirtyY?, dirtyWidth?, dirtyHeight?)` - Put pixel data onto canvas
- `getImageData(sx, sy, sw, sh)` - Get pixel data from WebGL framebuffer as ImageData
- `createImageData(width, height)` - Create blank ImageData
- `toDataURL(type?, quality?)` - Export canvas as data URL string
- `toBlob(type?, quality?)` - Export canvas as Blob (async)

**Canvas Utilities:**
- `clear()` - Clear canvas and reset batches
- `clearRect(x, y, width, height)` - Clear rectangular area
- `fillCanvas()` - Fill entire canvas with current fillStyle

### Post-Processing Methods
- `addBlur(radius)` - Add Gaussian blur effect
- `addBloom(threshold, strength)` - Add HDR bloom/glow effect  
- `addChromaticAberration(strength)` - Add RGB color separation
- `addVignette(strength, radius)` - Add darkened edge effect
- `addColorGrading(params)` - Add color correction (brightness, contrast, saturation, hue)
- `addFXAA()` - Add fast approximate anti-aliasing
- `addPixelate(pixelSize)` - Add retro pixelation effect
- `clearPostEffects()` - Remove all post-processing effects
- `enablePostProcessing(enabled)` - Toggle post-processing system
- `listPostEffects()` - Get array of current effects


### Style Properties

**Colors & Fills:**
- `fillStyle` - Fill color/gradient/pattern (hex, rgb, rgba, hsl, named colors)
- `strokeStyle` - Stroke color/gradient/pattern
- `globalAlpha` - Global transparency (0-1)

**Lines:**
- `lineWidth` - Stroke line width
- `lineCap` - Line end style ('butt', 'round', 'square')
- `lineJoin` - Line join style ('miter', 'round', 'bevel')
- `miterLimit` - Miter join limit
- `lineDashOffset` - Dash pattern offset

**Text:**
- `font` - Font specification (e.g., '16px Arial')
- `textAlign` - Text alignment ('start', 'end', 'left', 'right', 'center')
- `textBaseline` - Text baseline ('top', 'hanging', 'middle', 'alphabetic', 'ideographic', 'bottom')

**Shadows:**
- `shadowColor` - Shadow color
- `shadowBlur` - Shadow blur radius
- `shadowOffsetX` - Shadow X offset
- `shadowOffsetY` - Shadow Y offset

**Compositing:**
- `globalCompositeOperation` - Blend mode ('source-over', 'multiply', 'screen', etc.)
- `imageSmoothingEnabled` - Enable/disable image smoothing
- `imageSmoothingQuality` - Smoothing quality ('low', 'medium', 'high')

### Transform Methods
- `save()` - Save current state to stack
- `restore()` - Restore state from stack
- `translate(x, y)` - Translate origin
- `rotate(angle)` - Rotate (radians)
- `scale(x, y)` - Scale transformation
- `transform(a, b, c, d, e, f)` - Apply matrix transformation
- `setTransform(a, b, c, d, e, f)` - Set transformation matrix
- `resetTransform()` - Reset to identity matrix

### Path Hit Testing
- `isPointInPath(x, y, fillRule?)` - Test if point is inside current path
- `isPointInStroke(x, y)` - Test if point is on path stroke

### Gradients & Patterns
- `createLinearGradient(x0, y0, x1, y1)` - Create linear gradient
- `createRadialGradient(x0, y0, r0, x1, y1, r1)` - Create radial gradient
- `createPattern(image, repetition)` - Create pattern ('repeat', 'repeat-x', 'repeat-y', 'no-repeat')
- `addColorStop(gradient, offset, color)` - Add color stop to gradient

### Performance Methods
- `flush()` - Force render all batched objects (**REQUIRED** after drawing)
- `beginBatch()` - Begin batch mode (semantic only)
- `endBatch()` - End batch and flush
- `setBatchSize(size)` - Set maximum batch size (max 5,000 for stability)

### Advanced Features
- `addShader(name, vertexSource, fragmentSource)` - Add custom GLSL shader
- `useShader(name)` - Use custom shader program
- `drawWithShader(name, vertices, indices?, uniforms?, attributes?)` - Draw with custom shader
- `createQuad(x, y, width, height)` - Helper to create quad vertices/indices
- `listShaders()` - Get all available shader names
- `getShaderInfo(name)` - Get shader debugging information

### Clipping (Partial Implementation)
- `clip()` - Set clipping region from current path
- `resetClip()` - Clear clipping region

### Fullscreen & Display
- `toggleFullscreen()` - Toggle fullscreen mode
- `enterFullscreen()` - Enter fullscreen
- `exitFullscreen()` - Exit fullscreen
- `resize(width, height)` - Resize canvas

### Resource Management
- `dispose()` - Clean up all WebGL resources and event listeners
- `cleanup()` - Legacy cleanup method (use `dispose()` instead)

### Context Management
- `isContextLost()` - Check if WebGL context is lost
- `onContextRestore(callback)` - Add callback for context restore

### Events
- `'enterFullscreen'` - Fired when entering fullscreen
- `'exitFullscreen'` - Fired when exiting fullscreen
- `'contextlost'` - Fired when WebGL context is lost
- `'contextrestored'` - Fired when WebGL context is restored

## 📋 Important Usage Notes

### Critical: Always Call flush()
Unlike regular Canvas 2D, WebGL Canvas uses batching for performance. **You must call `ctx.flush()` after all your drawing operations** to actually render them:

```javascript
// Draw things
ctx.fillRect(10, 10, 100, 100);
ctx.fillCircle(50, 50, 25);

// REQUIRED: Flush to actually render
if (ctx.flush) ctx.flush();
```

### Context Loss Handling
WebGL contexts can be lost due to GPU driver issues, browser tabs, or memory pressure. WebGL Canvas automatically handles context loss/restore:

```javascript
const ctx = new WebGLCanvas(canvas);

// Optional: Add custom restore logic
ctx.onContextRestore(() => {
    console.log('Context restored, reinitialize resources if needed');
});

// Always check if operations should continue
function animate() {
    if (ctx.isContextLost()) {
        requestAnimationFrame(animate);
        return;
    }
    
    // Safe to draw
    ctx.fillRect(10, 10, 100, 100);
    ctx.flush();
    
    requestAnimationFrame(animate);
}
```

### Memory Management
Always dispose of the canvas when done to prevent memory leaks:

```javascript
const ctx = new WebGLCanvas(canvas);

// When finished (e.g., component unmounting, page unload)
ctx.dispose();
```

### Batch Size Limits
For stability, batch sizes are limited to 5,000 objects. Larger batches risk context loss:

```javascript
// Good: Stay within limits
ctx.setBatchSize(2000);

// Potentially problematic: May cause context loss
ctx.setBatchSize(10000); // Will be clamped to 5000
```

## 🔧 Browser Support

- **Chrome/Edge**: Full support with excellent performance
- **Firefox**: Full support with good performance
- **Safari**: Full support (may require WebGL enable in settings)
- **Mobile browsers**: Generally supported on modern devices

## 🐛 Known Limitations

- **Pattern Support**: createPattern() objects created but rendering not fully implemented
- **Line Dash Rendering**: setLineDash() stores patterns but visual rendering pending
- **Advanced Clipping**: clip() partially implemented, complex paths may not clip correctly
- **Variable Line Width**: Path strokes use single line width, complex stroke widths not supported
- **Some Composite Operations**: Not all globalCompositeOperation modes implemented

Perfect for demanding applications like real-time games, data visualizations, and interactive art installations! 🎨✨