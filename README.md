# 🚀 WebGL Canvas

A powerful, easy-to-use WebGL-powered 2D graphics library with an HTML5 Canvas-like API. Get the simplicity of Canvas 2D with the performance of WebGL!

## ✨ Features

- **HTML5 Canvas-like API** - Familiar methods like `fillRect()`, `drawCircle()`, `drawLine()`
- **WebGL Performance** - Hardware-accelerated rendering for smooth 60fps graphics
- **Custom Shader Support** - Easy integration of custom fragment and vertex shaders
- **Transform Stack** - Save/restore state management like Canvas 2D
- **Game-Ready** - Perfect for 2D games, visualizations, and interactive graphics
- **Lightweight** - No dependencies, small footprint
- **Modern Browser Support** - Works in all modern browsers with WebGL support

## 🎮 Quick Start

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
    <title>WebGL Canvas Demo</title>
</head>
<body>
    <canvas id="myCanvas" width="800" height="600"></canvas>
    <script src="src/webgl-canvas.js"></script>
    <script>
        const canvas = document.getElementById('myCanvas');
        const ctx = new WebGLCanvas(canvas, {
            enableFullscreen: true  // Add fullscreen button
        });
        
        // Draw like HTML5 Canvas but with WebGL power!
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(50, 50, 200, 100);
        
        ctx.fillStyle = '#4ecdc4';
        ctx.fillCircle(400, 100, 60);
        
        ctx.strokeStyle = '#45b7d1';
        ctx.lineWidth = 3;
        ctx.drawLine(50, 200, 400, 200);
    </script>
</body>
</html>
```

### Fullscreen Feature

Enable fullscreen mode with smart scaling that preserves drawing dimensions:

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = new WebGLCanvas(canvas, {
    enableFullscreen: true  // Shows fullscreen button
});

// Listen for fullscreen events
canvas.addEventListener('enterFullscreen', () => {
    console.log('Entered fullscreen mode');
    // Canvas is scaled to fit screen while maintaining aspect ratio
    // Drawing dimensions remain unchanged (e.g., still 800x600 internally)
});

canvas.addEventListener('exitFullscreen', () => {
    console.log('Exited fullscreen mode');
    // Canvas returns to original display size
});

// Programmatic fullscreen control
ctx.toggleFullscreen();  // Toggle fullscreen
ctx.enterFullscreen();   // Enter fullscreen
ctx.exitFullscreen();    // Exit fullscreen
```

**Fullscreen Behavior:**
- Scales canvas to fit screen while maintaining aspect ratio
- Centers canvas on screen with black bars if needed
- Preserves original drawing resolution (no stretching)
- Perfect for games that need consistent coordinates

### Animation Example

```javascript
const canvas = document.getElementById('myCanvas');
const ctx = new WebGLCanvas(canvas);

function animate() {
    ctx.clear();
    
    const time = Date.now() * 0.001;
    
    // Rotating square with transforms
    ctx.save();
    ctx.translate(400, 300);
    ctx.rotate(time);
    ctx.fillStyle = '#ff9ff3';
    ctx.fillRect(-50, -50, 100, 100);
    ctx.restore();
    
    // Bouncing circle
    const y = 300 + Math.sin(time * 3) * 100;
    ctx.fillStyle = '#54a0ff';
    ctx.fillCircle(200, y, 30);
    
    requestAnimationFrame(animate);
}

animate();
```

### Pixel Art Games

Perfect for retro-style games with crisp pixel scaling:

```javascript
// Create a low-resolution canvas that displays scaled up
const canvas = document.getElementById('gameCanvas');
const ctx = new WebGLCanvas(canvas, {
    pixelWidth: 160,     // Game resolution: 160x120 (retro)
    pixelHeight: 120,
    pixelScale: 4,       // Display size: 640x480 (4x larger)
    enableFullscreen: true
});

// Game objects work in the 160x120 coordinate space
class Player {
    constructor() {
        this.x = 80;  // Center of 160px width
        this.y = 60;  // Center of 120px height
        this.size = 8;
    }
    
    render(ctx) {
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    }
}

// Crisp pixel art rendering - no blurry scaling!
const player = new Player();
player.render(ctx);
```

## 🎨 API Reference

### Constructor

```javascript
const ctx = new WebGLCanvas(canvas, options = {});
```

**Options:**
- `enableFullscreen: boolean` - Enable fullscreen button (default: false)
- `pixelWidth: number` - Internal drawing width (default: canvas.width)
- `pixelHeight: number` - Internal drawing height (default: canvas.height)  
- `pixelScale: number` - Display scale multiplier (default: 1)

**Pixel Scaling Example:**
```javascript
// Create a 64x64 pixel art canvas displayed at 256x256 (4x scale)
const ctx = new WebGLCanvas(canvas, {
    pixelWidth: 64,
    pixelHeight: 64,
    pixelScale: 4,
    enableFullscreen: true
});

// Draw at low resolution, display scaled up with crisp pixels
ctx.fillRect(16, 16, 32, 32); // Draws a 32x32 rectangle in the 64x64 space
```

### Drawing Methods

#### Rectangles
- `fillRect(x, y, width, height)` - Draw filled rectangle
- `strokeRect(x, y, width, height)` - Draw rectangle outline

#### Circles
- `fillCircle(x, y, radius)` - Draw filled circle
- `strokeCircle(x, y, radius)` - Draw circle outline

#### Lines
- `drawLine(x1, y1, x2, y2)` - Draw line between two points

#### Utility
- `clear()` - Clear the canvas

### Style Properties

```javascript
ctx.fillStyle = '#ff6b6b';      // Fill color (hex, rgb, rgba)
ctx.strokeStyle = '#000000';    // Stroke color
ctx.lineWidth = 2;              // Line width for strokes
```

### Transform Methods

```javascript
ctx.save();                     // Save current transform state
ctx.restore();                  // Restore previous transform state
ctx.translate(x, y);           // Move origin
ctx.rotate(angle);             // Rotate (radians)
ctx.scale(x, y);               // Scale
```

### Custom Shaders

```javascript
// Define custom shader
const glowShader = {
    vertex: `
        attribute vec2 a_position;
        uniform mat3 u_transform;
        uniform vec2 u_resolution;
        void main() {
            vec3 transformed = u_transform * vec3(a_position, 1.0);
            vec2 normalized = ((transformed.xy / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
            gl_Position = vec4(normalized, 0, 1);
        }
    `,
    fragment: `
        precision mediump float;
        uniform vec4 u_color;
        uniform float u_time;
        void main() {
            float glow = sin(u_time * 5.0) * 0.5 + 0.5;
            gl_FragColor = u_color * (0.5 + glow * 0.5);
        }
    `
};

// Add shader to context
ctx.addShader('glow', glowShader.vertex, glowShader.fragment);

// Use custom shader
const program = ctx.useShader('glow');
// Set custom uniforms and draw...
```

## 🎯 Examples

### 1. Basic Shapes
See `index.html` for a comprehensive demo of basic drawing functions.

### 2. Custom Shaders
Check `examples/custom-shaders.html` for advanced shader effects including:
- Rainbow gradients
- Plasma effects
- Distortion effects

### 3. Simple Game
See `examples/simple-game.html` for a complete asteroid dodge game showing:
- Game object management
- Collision detection
- Particle effects
- Input handling

## 🚀 Advanced Usage

### Game Development

WebGL Canvas is perfect for 2D games:

```javascript
class GameObject {
    constructor(x, y, width, height, color) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
    }
    
    update(deltaTime) {
        // Update game object logic
    }
    
    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// Game loop
function gameLoop() {
    ctx.clear();
    
    // Update game objects
    gameObjects.forEach(obj => obj.update(deltaTime));
    
    // Render game objects
    gameObjects.forEach(obj => obj.render(ctx));
    
    requestAnimationFrame(gameLoop);
}
```

### Performance Tips

1. **Batch Draw Calls** - Group similar objects to minimize state changes
2. **Use Transforms** - Leverage `save()`/`restore()` for complex transformations
3. **Custom Shaders** - Use shaders for complex effects instead of multiple draw calls
4. **Object Pooling** - Reuse objects to minimize garbage collection

## 🛠️ Installation

### CDN (Coming Soon)
```html
<script src="https://cdn.jsdelivr.net/npm/webgl-canvas@latest/dist/webgl-canvas.min.js"></script>
```

### NPM (Coming Soon)
```bash
npm install webgl-canvas
```

### Manual Installation
1. Download `src/webgl-canvas.js`
2. Include in your HTML:
```html
<script src="path/to/webgl-canvas.js"></script>
```

## 🌟 Browser Support

- Chrome 9+
- Firefox 4+
- Safari 5.1+
- Edge 12+
- Opera 12+

Requires WebGL support (available in 97%+ of browsers).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## 📄 License

MIT License - see LICENSE file for details.

## 🎉 Why WebGL Canvas?

Traditional HTML5 Canvas uses CPU rendering, which can become slow with complex graphics or many objects. WebGL Canvas leverages your GPU for hardware acceleration, providing:

- **60fps animations** with hundreds of objects
- **Smooth particle effects** and complex visuals
- **Custom shader effects** for advanced graphics
- **Better performance** for games and visualizations
- **Familiar API** - no need to learn WebGL from scratch!

Perfect for:
- 🎮 2D Games
- 📊 Data Visualizations  
- 🎨 Interactive Art
- 📈 Real-time Charts
- ✨ Particle Effects
- 🌟 UI Animations

Get started today and bring your graphics to life with GPU power! 🚀
