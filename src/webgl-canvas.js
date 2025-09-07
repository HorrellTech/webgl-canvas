/**
 * WebGLCanvas - A WebGL-powered canvas with HTML5 Canvas-like API
 * Easy to use, GPU-accelerated 2D graphics library with optimized batching
 */
class WebGLCanvas {
    constructor(canvas, options = {}) {
        this.canvas = canvas;

        // Handle pixel scaling options
        this.options = {
            enableFullscreen: options.enableFullscreen || false,
            pixelWidth: options.pixelWidth || canvas.width,
            pixelHeight: options.pixelHeight || canvas.height,
            pixelScale: options.pixelScale || 1,
            batchSize: options.batchSize || 10000, // Max objects per batch
            ...options
        };

        // Set up pixel scaling
        this.setupPixelScaling();

        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // WebGL context
        this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }

        // State management
        this.state = {
            fillStyle: [1, 1, 1, 1], // white
            strokeStyle: [0, 0, 0, 1], // black
            lineWidth: 1,
            lineCap: 'butt',
            lineJoin: 'miter',
            miterLimit: 10,
            lineDashOffset: 0,
            lineDash: [],
            globalAlpha: 1,
            globalCompositeOperation: 'source-over',
            textAlign: 'start',
            textBaseline: 'alphabetic',
            font: '10px sans-serif',
            shadowColor: [0, 0, 0, 0],
            shadowBlur: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            imageSmoothingEnabled: true,
            transform: this.createIdentityMatrix()
        };
        this.stateStack = [];

        // Path state
        this.currentPath = [];
        this.pathStartX = 0;
        this.pathStartY = 0;
        this.currentX = 0;
        this.currentY = 0;

        // Fullscreen state
        this.isFullscreen = false;
        this.originalStyle = {};
        this.originalDimensions = {};
        this.fullscreenButton = null;

        // Batching system
        this.batches = {
            rectangles: [],
            circles: [],
            ellipses: [],
            lines: [],
            images: [],
            text: []
        };
        this.batchBuffers = {};

        // Texture cache for images
        this.textureCache = new Map();
        this.fontCache = new Map();

        // Initialize WebGL
        this.init();

        // Create built-in shaders
        this.shaders = {};
        this.createBuiltInShaders();

        // Create batch buffers
        this.createBatchBuffers();

        // Set initial viewport
        this.gl.viewport(0, 0, this.width, this.height);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        // Setup fullscreen if enabled
        if (this.options.enableFullscreen) {
            this.setupFullscreen();
        }
    }

    /*
     * Setup pixel scaling for pixel art games
     * Configures canvas internal resolution vs display size
     */
    setupPixelScaling() {
        // Set canvas internal resolution
        this.canvas.width = this.options.pixelWidth;
        this.canvas.height = this.options.pixelHeight;

        // Set display size (CSS size)
        const displayWidth = this.options.pixelWidth * this.options.pixelScale;
        const displayHeight = this.options.pixelHeight * this.options.pixelScale;

        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;

        // Ensure pixel-perfect scaling
        this.canvas.style.imageRendering = 'pixelated';
        this.canvas.style.imageRendering = '-moz-crisp-edges';
        this.canvas.style.imageRendering = 'crisp-edges';

        // Store display dimensions
        this.displayWidth = displayWidth;
        this.displayHeight = displayHeight;
    }

    /*
     * Create optimized batch buffers for different shape types
     */
    createBatchBuffers() {
        const gl = this.gl;
        const batchSize = this.options.batchSize;

        // Rectangle batch buffer (4 vertices per rectangle)
        this.batchBuffers.rectangles = {
            vertices: gl.createBuffer(),
            colors: gl.createBuffer(),
            indices: gl.createBuffer(),
            maxVertices: batchSize * 4,
            maxIndices: batchSize * 6,
            currentVertices: 0,
            currentIndices: 0,
            vertexData: new Float32Array(batchSize * 4 * 2), // x, y for each vertex
            colorData: new Float32Array(batchSize * 4 * 4),  // r, g, b, a for each vertex
            indexData: new Uint16Array(batchSize * 6)        // 6 indices per rectangle
        };

        // Circle batch buffer (4 vertices per circle quad)
        this.batchBuffers.circles = {
            vertices: gl.createBuffer(),
            colors: gl.createBuffer(),
            centers: gl.createBuffer(),
            radii: gl.createBuffer(),
            indices: gl.createBuffer(),
            maxVertices: batchSize * 4,
            maxIndices: batchSize * 6,
            currentVertices: 0,
            currentIndices: 0,
            vertexData: new Float32Array(batchSize * 4 * 2), // x, y for each vertex
            colorData: new Float32Array(batchSize * 4 * 4),  // r, g, b, a for each vertex
            centerData: new Float32Array(batchSize * 4 * 2), // center x, y for each vertex
            radiusData: new Float32Array(batchSize * 4),     // radius for each vertex
            indexData: new Uint16Array(batchSize * 6)        // 6 indices per circle
        };

        // Ellipse batch buffer
        this.batchBuffers.ellipses = {
            vertices: gl.createBuffer(),
            colors: gl.createBuffer(),
            centers: gl.createBuffer(),
            radii: gl.createBuffer(),
            indices: gl.createBuffer(),
            maxVertices: batchSize * 4,
            maxIndices: batchSize * 6,
            currentVertices: 0,
            currentIndices: 0,
            vertexData: new Float32Array(batchSize * 4 * 2),
            colorData: new Float32Array(batchSize * 4 * 4),
            centerData: new Float32Array(batchSize * 4 * 2),
            radiusData: new Float32Array(batchSize * 4 * 2), // radiusX, radiusY
            indexData: new Uint16Array(batchSize * 6)
        };

        // Line batch buffer
        this.batchBuffers.lines = {
            vertices: gl.createBuffer(),
            colors: gl.createBuffer(),
            maxVertices: batchSize * 2,
            currentVertices: 0,
            vertexData: new Float32Array(batchSize * 2 * 2), // x, y for each vertex
            colorData: new Float32Array(batchSize * 2 * 4)   // r, g, b, a for each vertex
        };

        // Image batch buffer
        this.batchBuffers.images = {
            vertices: gl.createBuffer(),
            texCoords: gl.createBuffer(),
            indices: gl.createBuffer(),
            maxVertices: batchSize * 4,
            maxIndices: batchSize * 6,
            currentVertices: 0,
            currentIndices: 0,
            vertexData: new Float32Array(batchSize * 4 * 2),
            texCoordData: new Float32Array(batchSize * 4 * 2),
            indexData: new Uint16Array(batchSize * 6)
        };
    }

    /*
        * Initialize WebGL settings
        * Set clear color to transparent
    */
    init() {
        const gl = this.gl;
        gl.clearColor(0, 0, 0, 0); // Transparent background
    }

    /*
        * Create an identity matrix
        * Used for initial transformations
    */
    createIdentityMatrix() {
        return [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ];
    }

    /*        
        * Multiply two 3x3 matrices
        * Used for combining transformations
        * @param {Array} a - First matrix (3x3)
        * @param {Array} b - Second matrix (3x3)
        * @return {Array} - Resulting matrix (3x3)
    */
    multiplyMatrix(a, b) {
        const result = new Array(9);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                result[i * 3 + j] = 0;
                for (let k = 0; k < 3; k++) {
                    result[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
                }
            }
        }
        return result;
    }

    /*
     * Transform a point using the current transformation matrix
     */
    transformPoint(x, y) {
        const m = this.state.transform;
        return [
            m[0] * x + m[1] * y + m[2],
            m[3] * x + m[4] * y + m[5]
        ];
    }

    /*
        * Create a shader program from vertex and fragment shader sources
        * Compiles shaders and links them into a program
        * @param {string} vertexShaderSource - GLSL source code for the vertex shader
        * @param {string} fragmentShaderSource - GLSL source code for the fragment shader
        * @return {WebGLProgram} - Compiled and linked shader program
    */
    createShaderProgram(vertexShaderSource, fragmentShaderSource) {
        const gl = this.gl;

        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error('Shader program failed to link: ' + gl.getProgramInfoLog(program));
        }

        return program;
    }

    /*
        * Create a shader of a specific type (vertex or fragment)
        * Compiles the shader source code
        * @param {number} type - Shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
        * @param {string} source - GLSL source code for the shader
        * @return {WebGLShader} - Compiled shader
    */
    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error('Shader compilation error: ' + gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    /*
        * Create built-in shaders for batched rendering
        * Optimized shaders that can handle multiple objects in single draw calls
    */
    createBuiltInShaders() {
        // Batched rectangle vertex shader
        const batchedRectVertexShader = `
        precision mediump float;
        attribute vec2 a_position;
        attribute vec4 a_color;
        uniform vec2 u_resolution;
        varying vec4 v_color;
        
        void main() {
            // Convert to normalized device coordinates (-1 to 1)
            vec2 normalized = (a_position / u_resolution) * 2.0 - 1.0;
            normalized.y = -normalized.y; // Flip Y coordinate
            
            gl_Position = vec4(normalized, 0, 1);
            v_color = a_color;
        }
    `;

        // Batched fragment shader
        const batchedFragmentShader = `
        precision mediump float;
        varying vec4 v_color;
        
        void main() {
            gl_FragColor = v_color;
        }
    `;

        // Circle vertex shader
        const circleVertexShader = `
        precision mediump float;
        attribute vec2 a_position;
        attribute vec4 a_color;
        attribute vec2 a_center;
        attribute float a_radius;
        uniform vec2 u_resolution;
        varying vec4 v_color;
        varying vec2 v_center;
        varying float v_radius;
        varying vec2 v_fragCoord;
        
        void main() {
            vec2 normalized = (a_position / u_resolution) * 2.0 - 1.0;
            normalized.y = -normalized.y;
            
            gl_Position = vec4(normalized, 0, 1);
            v_color = a_color;
            v_center = (a_center / u_resolution) * 2.0 - 1.0;
            v_center.y = -v_center.y;
            v_radius = a_radius;
            v_fragCoord = a_position;
        }
    `;

        const circleFragmentShader = `
        precision mediump float;
        varying vec4 v_color;
        varying vec2 v_center;
        varying float v_radius;
        varying vec2 v_fragCoord;
        uniform vec2 u_resolution;
        
        void main() {
            vec2 centerPixels = (v_center + 1.0) * 0.5 * u_resolution;
            centerPixels.y = u_resolution.y - centerPixels.y;
            
            float dist = distance(v_fragCoord, centerPixels);
            if (dist > v_radius) {
                discard;
            }
            gl_FragColor = v_color;
        }
    `;

        // Ellipse vertex shader
        const ellipseVertexShader = `
        precision mediump float;
        attribute vec2 a_position;
        attribute vec4 a_color;
        attribute vec2 a_center;
        attribute vec2 a_radius;
        uniform vec2 u_resolution;
        varying vec4 v_color;
        varying vec2 v_center;
        varying vec2 v_radius;
        varying vec2 v_fragCoord;
        
        void main() {
            vec2 normalized = (a_position / u_resolution) * 2.0 - 1.0;
            normalized.y = -normalized.y;
            
            gl_Position = vec4(normalized, 0, 1);
            v_color = a_color;
            v_center = (a_center / u_resolution) * 2.0 - 1.0;
            v_center.y = -v_center.y;
            v_radius = a_radius;
            v_fragCoord = a_position;
        }
    `;

        const ellipseFragmentShader = `
        precision mediump float;
        varying vec4 v_color;
        varying vec2 v_center;
        varying vec2 v_radius;
        varying vec2 v_fragCoord;
        uniform vec2 u_resolution;
        
        void main() {
            vec2 centerPixels = (v_center + 1.0) * 0.5 * u_resolution;
            centerPixels.y = u_resolution.y - centerPixels.y;
            
            vec2 diff = v_fragCoord - centerPixels;
            float ellipse = (diff.x * diff.x) / (v_radius.x * v_radius.x) + 
                           (diff.y * diff.y) / (v_radius.y * v_radius.y);
            
            if (ellipse > 1.0) {
                discard;
            }
            gl_FragColor = v_color;
        }
    `;

        // Image vertex shader
        const imageVertexShader = `
        precision mediump float;
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        uniform vec2 u_resolution;
        varying vec2 v_texCoord;
        
        void main() {
            vec2 normalized = (a_position / u_resolution) * 2.0 - 1.0;
            normalized.y = -normalized.y;
            
            gl_Position = vec4(normalized, 0, 1);
            v_texCoord = a_texCoord;
        }
    `;

        const imageFragmentShader = `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform float u_globalAlpha;
        varying vec2 v_texCoord;
        
        void main() {
            gl_FragColor = texture2D(u_texture, v_texCoord);
            gl_FragColor.a *= u_globalAlpha;
        }
    `;

        this.shaders.batchedRect = this.createShaderProgram(batchedRectVertexShader, batchedFragmentShader);
        this.shaders.batchedCircle = this.createShaderProgram(circleVertexShader, circleFragmentShader);
        this.shaders.batchedEllipse = this.createShaderProgram(ellipseVertexShader, ellipseFragmentShader);
        this.shaders.batchedLine = this.createShaderProgram(batchedRectVertexShader, batchedFragmentShader);
        this.shaders.image = this.createShaderProgram(imageVertexShader, imageFragmentShader);
    }

    // Canvas-like API methods

    /*
    * Clear the canvas and reset batches
    * Sets the clear color to transparent and clears the color buffer
    */
    clear() {
        // First flush any pending batches before clearing
        this.flush();

        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Reset all batches AFTER clearing
        this.batchBuffers.rectangles.currentVertices = 0;
        this.batchBuffers.rectangles.currentIndices = 0;
        this.batchBuffers.circles.currentVertices = 0;
        this.batchBuffers.circles.currentIndices = 0;
        this.batchBuffers.lines.currentVertices = 0;
    }

    /*
    * Clear a rectangular area to transparent
    * Canvas API equivalent: clearRect(x, y, width, height)
    * @param {number} x - X coordinate of rectangle
    * @param {number} y - Y coordinate of rectangle  
    * @param {number} width - Width of rectangle
    * @param {number} height - Height of rectangle
    */
    clearRect(x, y, width, height) {
        // Flush current batches first
        this.flush();

        const gl = this.gl;

        // Enable scissor test to limit clearing to specific rectangle
        gl.enable(gl.SCISSOR_TEST);

        // Transform coordinates if needed
        const [transformedX, transformedY] = this.transformPoint(x, y);
        const [transformedX2, transformedY2] = this.transformPoint(x + width, y + height);

        // Calculate actual rectangle bounds
        const minX = Math.min(transformedX, transformedX2);
        const maxX = Math.max(transformedX, transformedX2);
        const minY = Math.min(transformedY, transformedY2);
        const maxY = Math.max(transformedY, transformedY2);

        // Convert to WebGL screen coordinates (flip Y)
        const screenY = this.height - maxY;
        const rectWidth = maxX - minX;
        const rectHeight = maxY - minY;

        // Set scissor rectangle
        gl.scissor(
            Math.floor(minX),
            Math.floor(screenY),
            Math.ceil(rectWidth),
            Math.ceil(rectHeight)
        );

        // Clear the scissored area
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Disable scissor test
        gl.disable(gl.SCISSOR_TEST);
    }

    /*
     * Set the clear color (background color when clearing)
     * @param {string|Array} color - Color to clear to
     */
    setClearColor(color) {
        const rgba = this.parseColor(color);
        this.gl.clearColor(rgba[0], rgba[1], rgba[2], rgba[3]);
    }

    /*
     * Get current clear color
     * @return {Array} - RGBA array of current clear color
     */
    getClearColor() {
        const gl = this.gl;
        return gl.getParameter(gl.COLOR_CLEAR_VALUE);
    }

    /*
     * Clear canvas to a specific color
     * @param {string|Array} color - Color to clear to (optional, uses current clear color if not specified)
     */
    clearToColor(color) {
        if (color) {
            // Temporarily set clear color
            const currentClearColor = this.getClearColor();
            this.setClearColor(color);
            this.clear();
            // Restore previous clear color
            this.gl.clearColor(currentClearColor[0], currentClearColor[1], currentClearColor[2], currentClearColor[3]);
        } else {
            this.clear();
        }
    }

    /*
     * Clear a rectangular area to a specific color
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {string|Array} color - Color to clear to
     */
    clearRectToColor(x, y, width, height, color) {
        // Save current fill style
        const currentFillStyle = [...this.state.fillStyle];
        const currentGlobalAlpha = this.state.globalAlpha;

        // Set fill style to clear color with full opacity
        this.fillStyle = color;
        this.globalAlpha = 1;

        // Draw a rectangle with the clear color
        this.fillRect(x, y, width, height);

        // Restore previous fill style
        this.state.fillStyle = currentFillStyle;
        this.state.globalAlpha = currentGlobalAlpha;
    }

    /*
     * Fill entire canvas with a color (like clearToColor but uses fillStyle)
     */
    fillCanvas() {
        this.fillRect(0, 0, this.width, this.height);
    }

    /*
     * Clear with checkerboard pattern (useful for transparency visualization)
     * @param {number} size - Size of checkerboard squares (default: 16)
     * @param {string|Array} color1 - First color (default: light gray)
     * @param {string|Array} color2 - Second color (default: white)
     */
    clearWithCheckerboard(size = 16, color1 = '#E0E0E0', color2 = '#FFFFFF') {
        // Save current state
        const currentFillStyle = [...this.state.fillStyle];

        // Clear to transparent first
        this.clear();

        // Draw checkerboard pattern
        const cols = Math.ceil(this.width / size);
        const rows = Math.ceil(this.height / size);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Alternate colors based on position
                const isEven = (row + col) % 2 === 0;
                this.fillStyle = isEven ? color1 : color2;
                this.fillRect(col * size, row * size, size, size);
            }
        }

        // Restore fill style
        this.state.fillStyle = currentFillStyle;
    }

    /*
     * Set global alpha (transparency)
     * @param {number} alpha - Alpha value (0-1)
     */
    set globalAlpha(alpha) {
        this.state.globalAlpha = Math.max(0, Math.min(1, alpha));
    }

    get globalAlpha() {
        return this.state.globalAlpha;
    }

    /*
     * Set line cap style
     * @param {string} cap - 'butt', 'round', or 'square'
     */
    set lineCap(cap) {
        this.state.lineCap = cap;
    }

    get lineCap() {
        return this.state.lineCap;
    }

    /*
     * Set line join style
     * @param {string} join - 'miter', 'round', or 'bevel'
     */
    set lineJoin(join) {
        this.state.lineJoin = join;
    }

    get lineJoin() {
        return this.state.lineJoin;
    }

    /*
     * Set text properties
     */
    set font(font) {
        this.state.font = font;
    }

    get font() {
        return this.state.font;
    }

    set textAlign(align) {
        this.state.textAlign = align;
    }

    get textAlign() {
        return this.state.textAlign;
    }

    set textBaseline(baseline) {
        this.state.textBaseline = baseline;
    }

    get textBaseline() {
        return this.state.textBaseline;
    }

    /*
     * Flush all batches to GPU
     */
    flush() {
        this.flushRectangles();
        this.flushCircles();
        this.flushEllipses();
        this.flushLines();
        this.flushImages();
    }

    /*
     * Flush image batch
     */
    flushImages() {
        // Images are rendered immediately, so nothing to flush
    }

    /*
     * Flush ellipse batch
     */
    flushEllipses() {
        const batch = this.batchBuffers.ellipses;
        if (batch.currentVertices === 0) return;

        const gl = this.gl;
        const program = this.shaders.batchedEllipse;

        gl.useProgram(program);

        // Upload vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.vertices);
        gl.bufferData(gl.ARRAY_BUFFER, batch.vertexData.subarray(0, batch.currentVertices * 2), gl.DYNAMIC_DRAW);

        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        // Upload color data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.colors);
        gl.bufferData(gl.ARRAY_BUFFER, batch.colorData.subarray(0, batch.currentVertices * 4), gl.DYNAMIC_DRAW);

        const colorLoc = gl.getAttribLocation(program, 'a_color');
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);

        // Upload center data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.centers);
        gl.bufferData(gl.ARRAY_BUFFER, batch.centerData.subarray(0, batch.currentVertices * 2), gl.DYNAMIC_DRAW);

        const centerLoc = gl.getAttribLocation(program, 'a_center');
        gl.enableVertexAttribArray(centerLoc);
        gl.vertexAttribPointer(centerLoc, 2, gl.FLOAT, false, 0, 0);

        // Upload radius data (radiusX, radiusY)
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.radii);
        gl.bufferData(gl.ARRAY_BUFFER, batch.radiusData.subarray(0, batch.currentVertices * 2), gl.DYNAMIC_DRAW);

        const radiusLoc = gl.getAttribLocation(program, 'a_radius');
        gl.enableVertexAttribArray(radiusLoc);
        gl.vertexAttribPointer(radiusLoc, 2, gl.FLOAT, false, 0, 0);

        // Upload index data
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, batch.indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, batch.indexData.subarray(0, batch.currentIndices), gl.DYNAMIC_DRAW);

        // Set uniforms
        const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
        gl.uniform2f(resolutionLoc, this.width, this.height);

        // Draw all ellipses
        gl.drawElements(gl.TRIANGLES, batch.currentIndices, gl.UNSIGNED_SHORT, 0);

        // Reset batch
        batch.currentVertices = 0;
        batch.currentIndices = 0;
    }

    /*
     * Flush rectangle batch
     */
    flushRectangles() {
        const batch = this.batchBuffers.rectangles;
        if (batch.currentVertices === 0) return;

        const gl = this.gl;
        const program = this.shaders.batchedRect;

        gl.useProgram(program);

        // Upload vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.vertices);
        gl.bufferData(gl.ARRAY_BUFFER, batch.vertexData.subarray(0, batch.currentVertices * 2), gl.DYNAMIC_DRAW);

        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        // Upload color data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.colors);
        gl.bufferData(gl.ARRAY_BUFFER, batch.colorData.subarray(0, batch.currentVertices * 4), gl.DYNAMIC_DRAW);

        const colorLoc = gl.getAttribLocation(program, 'a_color');
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);

        // Upload index data
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, batch.indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, batch.indexData.subarray(0, batch.currentIndices), gl.DYNAMIC_DRAW);

        // Set uniforms
        const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
        gl.uniform2f(resolutionLoc, this.width, this.height);

        // Draw all rectangles in one call!
        gl.drawElements(gl.TRIANGLES, batch.currentIndices, gl.UNSIGNED_SHORT, 0);

        // Reset batch after flushing
        batch.currentVertices = 0;
        batch.currentIndices = 0;

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    /*
     * Flush circle batch using instanced rendering
     */
    flushCircles() {
        const batch = this.batchBuffers.circles;
        if (batch.currentVertices === 0) return;

        const gl = this.gl;
        const program = this.shaders.batchedCircle;

        gl.useProgram(program);

        // Upload vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.vertices);
        gl.bufferData(gl.ARRAY_BUFFER, batch.vertexData.subarray(0, batch.currentVertices * 2), gl.DYNAMIC_DRAW);

        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        // Upload color data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.colors);
        gl.bufferData(gl.ARRAY_BUFFER, batch.colorData.subarray(0, batch.currentVertices * 4), gl.DYNAMIC_DRAW);

        const colorLoc = gl.getAttribLocation(program, 'a_color');
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);

        // Upload center data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.centers);
        gl.bufferData(gl.ARRAY_BUFFER, batch.centerData.subarray(0, batch.currentVertices * 2), gl.DYNAMIC_DRAW);

        const centerLoc = gl.getAttribLocation(program, 'a_center');
        gl.enableVertexAttribArray(centerLoc);
        gl.vertexAttribPointer(centerLoc, 2, gl.FLOAT, false, 0, 0);

        // Upload radius data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.radii);
        gl.bufferData(gl.ARRAY_BUFFER, batch.radiusData.subarray(0, batch.currentVertices), gl.DYNAMIC_DRAW);

        const radiusLoc = gl.getAttribLocation(program, 'a_radius');
        gl.enableVertexAttribArray(radiusLoc);
        gl.vertexAttribPointer(radiusLoc, 1, gl.FLOAT, false, 0, 0);

        // Upload index data
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, batch.indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, batch.indexData.subarray(0, batch.currentIndices), gl.DYNAMIC_DRAW);

        // Set uniforms
        const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
        gl.uniform2f(resolutionLoc, this.width, this.height);

        // Draw all circles in one call!
        gl.drawElements(gl.TRIANGLES, batch.currentIndices, gl.UNSIGNED_SHORT, 0);

        // Reset batch after flushing
        batch.currentVertices = 0;
        batch.currentIndices = 0;
    }

    /*
     * Flush line batch
     */
    flushLines() {
        const batch = this.batchBuffers.lines;
        if (batch.currentVertices === 0) return;

        const gl = this.gl;
        const program = this.shaders.batchedLine;

        gl.useProgram(program);

        // Upload vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.vertices);
        gl.bufferData(gl.ARRAY_BUFFER, batch.vertexData.subarray(0, batch.currentVertices * 2), gl.DYNAMIC_DRAW);

        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        // Upload color data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.colors);
        gl.bufferData(gl.ARRAY_BUFFER, batch.colorData.subarray(0, batch.currentVertices * 4), gl.DYNAMIC_DRAW);

        const colorLoc = gl.getAttribLocation(program, 'a_color');
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);

        // Set uniforms
        const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
        gl.uniform2f(resolutionLoc, this.width, this.height);

        // Draw all lines
        gl.drawArrays(gl.LINES, 0, batch.currentVertices);

        // Reset batch after flushing
        batch.currentVertices = 0;
    }

    /*
        * Set fill style (color)
        * Accepts color in hex, rgb, rgba, or array format
        * @param {string|Array} color - Color value
    */
    set fillStyle(color) {
        this.state.fillStyle = this.parseColor(color);
    }

    /*
        * Get current fill style
        * Returns the fill style as an RGBA array
        * @return {Array}
    */
    get fillStyle() {
        return this.state.fillStyle;
    }

    /*
        * Set stroke style (color)
        * Accepts color in hex, rgb, rgba, or array format
        * @param {string|Array} color - Color value
    */
    set strokeStyle(color) {
        this.state.strokeStyle = this.parseColor(color);
    }

    /*
        * Get current stroke style
        * Returns the stroke style as an RGBA array
        * @return {Array}
    */
    get strokeStyle() {
        return this.state.strokeStyle;
    }

    /*
        * Set line width for strokes
        * @param {number} width - Line width in pixels
    */
    set lineWidth(width) {
        this.state.lineWidth = width;
    }

    /*
        * Get current line width
        * Returns the line width in pixels
        * @return {number}
    */
    get lineWidth() {
        return this.state.lineWidth;
    }

    /*
 * Set shadow properties
 */
    set shadowColor(color) {
        this.state.shadowColor = this.parseColor(color);
    }

    get shadowColor() {
        return this.state.shadowColor;
    }

    set shadowBlur(blur) {
        this.state.shadowBlur = Math.max(0, blur);
    }

    get shadowBlur() {
        return this.state.shadowBlur;
    }

    set shadowOffsetX(offset) {
        this.state.shadowOffsetX = offset;
    }

    get shadowOffsetX() {
        return this.state.shadowOffsetX;
    }

    set shadowOffsetY(offset) {
        this.state.shadowOffsetY = offset;
    }

    get shadowOffsetY() {
        return this.state.shadowOffsetY;
    }

    /*
 * Set image smoothing
 */
    set imageSmoothingEnabled(enabled) {
        this.state.imageSmoothingEnabled = enabled;

        // Update existing textures
        this.textureCache.forEach((texture) => {
            const gl = this.gl;
            gl.bindTexture(gl.TEXTURE_2D, texture);

            if (enabled) {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            } else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            }
        });
    }

    get imageSmoothingEnabled() {
        return this.state.imageSmoothingEnabled;
    }

    /*
     * Set image smoothing quality
     */
    set imageSmoothingQuality(quality) {
        const validQualities = ['low', 'medium', 'high'];
        const intQualities = [0, 1, 2]; // For compatibility with numeric values
        if (validQualities.includes(quality)) {
            this.state.imageSmoothingQuality = quality;
        } else if (intQualities.includes(quality)) {
            this.state.imageSmoothingQuality = validQualities[quality];
        }
    }

    get imageSmoothingQuality() {
        return this.state.imageSmoothingQuality || 'low';
    }

    /*
    * Set global composite operation
    */
    set globalCompositeOperation(operation) {
        const validOperations = [
            'source-over', 'source-in', 'source-out', 'source-atop',
            'destination-over', 'destination-in', 'destination-out', 'destination-atop',
            'lighter', 'copy', 'xor', 'multiply', 'screen', 'overlay',
            'darken', 'lighten', 'color-dodge', 'color-burn',
            'hard-light', 'soft-light', 'difference', 'exclusion'
        ];

        if (validOperations.includes(operation)) {
            this.state.globalCompositeOperation = operation;
            // Update WebGL blend mode
            this.updateBlendMode(operation);
        }
    }

    get globalCompositeOperation() {
        return this.state.globalCompositeOperation;
    }

    /*
    * Update WebGL blend mode based on composite operation
    */
    updateBlendMode(operation) {
        const gl = this.gl;

        switch (operation) {
            case 'source-over':
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                break;
            case 'source-in':
                gl.blendFunc(gl.DST_ALPHA, gl.ZERO);
                break;
            case 'source-out':
                gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ZERO);
                break;
            case 'destination-over':
                gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE);
                break;
            case 'lighter':
                gl.blendFunc(gl.ONE, gl.ONE);
                break;
            case 'multiply':
                gl.blendFunc(gl.DST_COLOR, gl.ZERO);
                break;
            case 'screen':
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
                break;
            default:
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                break;
        }
    }

    /*
    * Add color stop to gradient
    * @param {number} offset - Position (0-1)
    * @param {string} color - Color at this position
    */
    addColorStop(gradient, offset, color) {
        if (gradient && gradient.colorStops) {
            gradient.colorStops.push({
                offset: Math.max(0, Math.min(1, offset)),
                color: this.parseColor(color)
            });
            // Sort by offset
            gradient.colorStops.sort((a, b) => a.offset - b.offset);
        }
    }

    /*
        * Parse color input
        * Converts hex, rgb, rgba, or array formats to RGBA array
        * @param {string|Array} color - Color value
        * @return {Array} - RGBA array
    */
    parseColor(color) {
        if (Array.isArray(color)) return color;

        // Handle gradient objects
        if (color && typeof color === 'object' && color.type) {
            if (color.type === 'linear' || color.type === 'radial') {
                return this.evaluateGradient(color, 0.5, 0.5); // Default to middle
            }
            if (color.type === 'pattern') {
                return [1, 1, 1, 1]; // Default white for patterns
            }
        }

        if (typeof color === 'string') {
            // Handle named colors
            const namedColors = {
                'transparent': [0, 0, 0, 0],
                'black': [0, 0, 0, 1],
                'white': [1, 1, 1, 1],
                'red': [1, 0, 0, 1],
                'green': [0, 1, 0, 1],
                'blue': [0, 0, 1, 1],
                'yellow': [1, 1, 0, 1],
                'cyan': [0, 1, 1, 1],
                'magenta': [1, 0, 1, 1],
                'gray': [0.5, 0.5, 0.5, 1],
                'grey': [0.5, 0.5, 0.5, 1]
            };

            if (namedColors[color.toLowerCase()]) {
                return namedColors[color.toLowerCase()];
            }

            if (color.startsWith('#')) {
                // Hex color - support both 3 and 6 character formats
                const hex = color.substring(1);
                if (hex.length === 3) {
                    const r = parseInt(hex[0] + hex[0], 16) / 255;
                    const g = parseInt(hex[1] + hex[1], 16) / 255;
                    const b = parseInt(hex[2] + hex[2], 16) / 255;
                    return [r, g, b, 1];
                } else if (hex.length === 6) {
                    const r = parseInt(hex.substring(0, 2), 16) / 255;
                    const g = parseInt(hex.substring(2, 4), 16) / 255;
                    const b = parseInt(hex.substring(4, 6), 16) / 255;
                    return [r, g, b, 1];
                }
            }

            if (color.startsWith('rgb')) {
                // RGB/RGBA color
                const values = color.match(/[\d.]+/g);
                if (values && values.length >= 3) {
                    const r = parseFloat(values[0]) / 255;
                    const g = parseFloat(values[1]) / 255;
                    const b = parseFloat(values[2]) / 255;
                    const a = values.length > 3 ? parseFloat(values[3]) : 1;
                    return [r, g, b, a];
                }
            }

            if (color.startsWith('hsl')) {
                // HSL color - convert to RGB
                const values = color.match(/[\d.]+/g);
                if (values && values.length >= 3) {
                    const h = parseFloat(values[0]) / 360;
                    const s = parseFloat(values[1]) / 100;
                    const l = parseFloat(values[2]) / 100;
                    const a = values.length > 3 ? parseFloat(values[3]) : 1;

                    const hslToRgb = (h, s, l) => {
                        let r, g, b;
                        if (s === 0) {
                            r = g = b = l;
                        } else {
                            const hue2rgb = (p, q, t) => {
                                if (t < 0) t += 1;
                                if (t > 1) t -= 1;
                                if (t < 1 / 6) return p + (q - p) * 6 * t;
                                if (t < 1 / 2) return q;
                                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                                return p;
                            };
                            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                            const p = 2 * l - q;
                            r = hue2rgb(p, q, h + 1 / 3);
                            g = hue2rgb(p, q, h);
                            b = hue2rgb(p, q, h - 1 / 3);
                        }
                        return [r, g, b, a];
                    };

                    return hslToRgb(h, s, l);
                }
            }
        }

        // Default to white
        return [1, 1, 1, 1];
    }

    /*
 * Evaluate gradient color at specific coordinates
 */
    evaluateGradient(gradient, x, y) {
        if (!gradient.colorStops || gradient.colorStops.length === 0) {
            return [1, 1, 1, 1]; // Default white
        }

        if (gradient.colorStops.length === 1) {
            return gradient.colorStops[0].color;
        }

        let t = 0;
        if (gradient.type === 'linear') {
            // Calculate position along gradient line
            const dx = gradient.x1 - gradient.x0;
            const dy = gradient.y1 - gradient.y0;
            const length = Math.sqrt(dx * dx + dy * dy);

            if (length > 0) {
                const px = x - gradient.x0;
                const py = y - gradient.y0;
                t = (px * dx + py * dy) / (length * length);
            }
        } else if (gradient.type === 'radial') {
            // Calculate distance from center
            const dx = x - gradient.x0;
            const dy = y - gradient.y0;
            const dist = Math.sqrt(dx * dx + dy * dy);
            t = dist / gradient.r1;
        }

        t = Math.max(0, Math.min(1, t));

        // Find surrounding color stops
        let stop1 = gradient.colorStops[0];
        let stop2 = gradient.colorStops[gradient.colorStops.length - 1];

        for (let i = 0; i < gradient.colorStops.length - 1; i++) {
            if (t >= gradient.colorStops[i].offset && t <= gradient.colorStops[i + 1].offset) {
                stop1 = gradient.colorStops[i];
                stop2 = gradient.colorStops[i + 1];
                break;
            }
        }

        // Interpolate between colors
        if (stop1.offset === stop2.offset) {
            return stop1.color;
        }

        const factor = (t - stop1.offset) / (stop2.offset - stop1.offset);
        return [
            stop1.color[0] + (stop2.color[0] - stop1.color[0]) * factor,
            stop1.color[1] + (stop2.color[1] - stop1.color[1]) * factor,
            stop1.color[2] + (stop2.color[2] - stop1.color[2]) * factor,
            stop1.color[3] + (stop2.color[3] - stop1.color[3]) * factor
        ];
    }

    /*
        * Save the current state
        * Saves all drawing state to the state stack
    */
    save() {
        this.stateStack.push({
            fillStyle: [...this.state.fillStyle],
            strokeStyle: [...this.state.strokeStyle],
            lineWidth: this.state.lineWidth,
            lineCap: this.state.lineCap,
            lineJoin: this.state.lineJoin,
            miterLimit: this.state.miterLimit,
            lineDashOffset: this.state.lineDashOffset,
            lineDash: [...this.state.lineDash],
            globalAlpha: this.state.globalAlpha,
            globalCompositeOperation: this.state.globalCompositeOperation,
            textAlign: this.state.textAlign,
            textBaseline: this.state.textBaseline,
            font: this.state.font,
            shadowColor: [...this.state.shadowColor],
            shadowBlur: this.state.shadowBlur,
            shadowOffsetX: this.state.shadowOffsetX,
            shadowOffsetY: this.state.shadowOffsetY,
            imageSmoothingEnabled: this.state.imageSmoothingEnabled,
            transform: [...this.state.transform]
        });
    }

    /*
        * Restore the last saved state
        * Restores fillStyle, strokeStyle, lineWidth, and transform from the state stack
    */
    restore() {
        if (this.stateStack.length > 0) {
            this.state = this.stateStack.pop();
        }
    }

    /*
     * Add rectangle to batch
     */
    addRectangleToBatch(x, y, width, height, color) {
        const batch = this.batchBuffers.rectangles;

        if (batch.currentVertices + 4 > batch.maxVertices) {
            this.flushRectangles();
            batch.currentVertices = 0;
            batch.currentIndices = 0;
        }

        // Transform rectangle vertices properly
        const [x1, y1] = this.transformPoint(x, y);
        const [x2, y2] = this.transformPoint(x + width, y);
        const [x3, y3] = this.transformPoint(x, y + height);
        const [x4, y4] = this.transformPoint(x + width, y + height);

        const vertexIndex = batch.currentVertices;

        // Add vertices
        batch.vertexData[vertexIndex * 2 + 0] = x1;
        batch.vertexData[vertexIndex * 2 + 1] = y1;
        batch.vertexData[vertexIndex * 2 + 2] = x2;
        batch.vertexData[vertexIndex * 2 + 3] = y2;
        batch.vertexData[vertexIndex * 2 + 4] = x3;
        batch.vertexData[vertexIndex * 2 + 5] = y3;
        batch.vertexData[vertexIndex * 2 + 6] = x4;
        batch.vertexData[vertexIndex * 2 + 7] = y4;

        // Apply global alpha to colors
        const finalColor = [
            color[0],
            color[1],
            color[2],
            color[3] * this.state.globalAlpha
        ];

        // Add colors for all 4 vertices
        for (let i = 0; i < 4; i++) {
            batch.colorData[(vertexIndex + i) * 4 + 0] = finalColor[0];
            batch.colorData[(vertexIndex + i) * 4 + 1] = finalColor[1];
            batch.colorData[(vertexIndex + i) * 4 + 2] = finalColor[2];
            batch.colorData[(vertexIndex + i) * 4 + 3] = finalColor[3];
        }

        // Add indices (two triangles)
        const indexBase = batch.currentVertices;
        const indexOffset = batch.currentIndices;
        batch.indexData[indexOffset + 0] = indexBase + 0;
        batch.indexData[indexOffset + 1] = indexBase + 1;
        batch.indexData[indexOffset + 2] = indexBase + 2;
        batch.indexData[indexOffset + 3] = indexBase + 1;
        batch.indexData[indexOffset + 4] = indexBase + 2;
        batch.indexData[indexOffset + 5] = indexBase + 3;

        batch.currentVertices += 4;
        batch.currentIndices += 6;
    }

    /*
     * Add circle to batch
     */
    addCircleToBatch(x, y, radius, color) {
        const batch = this.batchBuffers.circles;

        if (batch.currentVertices + 4 > batch.maxVertices) {
            this.flushCircles();
            batch.currentVertices = 0;
            batch.currentIndices = 0;
        }

        const [cx, cy] = this.transformPoint(x, y);
        const vertexIndex = batch.currentVertices;

        // Create quad around circle
        const vertices = [
            [cx - radius, cy - radius],
            [cx + radius, cy - radius],
            [cx - radius, cy + radius],
            [cx + radius, cy + radius]
        ];

        // Apply global alpha consistently
        const finalColor = [
            color[0],
            color[1],
            color[2],
            color[3] * this.state.globalAlpha
        ];

        for (let i = 0; i < 4; i++) {
            batch.vertexData[(vertexIndex + i) * 2 + 0] = vertices[i][0];
            batch.vertexData[(vertexIndex + i) * 2 + 1] = vertices[i][1];

            batch.colorData[(vertexIndex + i) * 4 + 0] = finalColor[0];
            batch.colorData[(vertexIndex + i) * 4 + 1] = finalColor[1];
            batch.colorData[(vertexIndex + i) * 4 + 2] = finalColor[2];
            batch.colorData[(vertexIndex + i) * 4 + 3] = finalColor[3];

            batch.centerData[(vertexIndex + i) * 2 + 0] = cx;
            batch.centerData[(vertexIndex + i) * 2 + 1] = cy;

            batch.radiusData[vertexIndex + i] = radius;
        }

        // Add indices
        const indexBase = batch.currentVertices;
        const indexOffset = batch.currentIndices;
        batch.indexData[indexOffset + 0] = indexBase + 0;
        batch.indexData[indexOffset + 1] = indexBase + 1;
        batch.indexData[indexOffset + 2] = indexBase + 2;
        batch.indexData[indexOffset + 3] = indexBase + 1;
        batch.indexData[indexOffset + 4] = indexBase + 2;
        batch.indexData[indexOffset + 5] = indexBase + 3;

        batch.currentVertices += 4;
        batch.currentIndices += 6;
    }

    /*
     * Add ellipse to batch
     */
    addEllipseToBatch(x, y, radiusX, radiusY, color) {
        const batch = this.batchBuffers.ellipses;

        if (batch.currentVertices + 4 > batch.maxVertices) {
            this.flushEllipses();
            batch.currentVertices = 0;
            batch.currentIndices = 0;
        }

        const [cx, cy] = this.transformPoint(x, y);
        const vertexIndex = batch.currentVertices;

        // Create quad around ellipse
        const vertices = [
            [cx - radiusX, cy - radiusY],
            [cx + radiusX, cy - radiusY],
            [cx - radiusX, cy + radiusY],
            [cx + radiusX, cy + radiusY]
        ];

        // Apply global alpha consistently like other batches
        const finalColor = [
            color[0],
            color[1],
            color[2],
            color[3] * this.state.globalAlpha
        ];

        for (let i = 0; i < 4; i++) {
            batch.vertexData[(vertexIndex + i) * 2 + 0] = vertices[i][0];
            batch.vertexData[(vertexIndex + i) * 2 + 1] = vertices[i][1];

            batch.colorData[(vertexIndex + i) * 4 + 0] = finalColor[0];
            batch.colorData[(vertexIndex + i) * 4 + 1] = finalColor[1];
            batch.colorData[(vertexIndex + i) * 4 + 2] = finalColor[2];
            batch.colorData[(vertexIndex + i) * 4 + 3] = finalColor[3];

            batch.centerData[(vertexIndex + i) * 2 + 0] = cx;
            batch.centerData[(vertexIndex + i) * 2 + 1] = cy;

            batch.radiusData[(vertexIndex + i) * 2 + 0] = radiusX;
            batch.radiusData[(vertexIndex + i) * 2 + 1] = radiusY;
        }

        // Add indices
        const indexBase = batch.currentVertices;
        const indexOffset = batch.currentIndices;
        batch.indexData[indexOffset + 0] = indexBase + 0;
        batch.indexData[indexOffset + 1] = indexBase + 1;
        batch.indexData[indexOffset + 2] = indexBase + 2;
        batch.indexData[indexOffset + 3] = indexBase + 1;
        batch.indexData[indexOffset + 4] = indexBase + 2;
        batch.indexData[indexOffset + 5] = indexBase + 3;

        batch.currentVertices += 4;
        batch.currentIndices += 6;
    }

    /*
     * Add image to batch
     */
    addImageToBatch(texture, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
        // For now, flush immediately since we need to bind different textures
        // TODO: Implement texture atlas for true batching
        this.flushImages();

        const batch = this.batchBuffers.images;
        const gl = this.gl;

        // Transform destination vertices
        const [x1, y1] = this.transformPoint(dx, dy);
        const [x2, y2] = this.transformPoint(dx + dWidth, dy);
        const [x3, y3] = this.transformPoint(dx, dy + dHeight);
        const [x4, y4] = this.transformPoint(dx + dWidth, dy + dHeight);

        // Calculate texture coordinates
        const imageWidth = texture.width || 1;
        const imageHeight = texture.height || 1;
        const u1 = sx / imageWidth;
        const v1 = sy / imageHeight;
        const u2 = (sx + sWidth) / imageWidth;
        const v2 = (sy + sHeight) / imageHeight;

        const vertexIndex = 0;

        // Add vertices
        batch.vertexData[0] = x1; batch.vertexData[1] = y1;
        batch.vertexData[2] = x2; batch.vertexData[3] = y2;
        batch.vertexData[4] = x3; batch.vertexData[5] = y3;
        batch.vertexData[6] = x4; batch.vertexData[7] = y4;

        // Add texture coordinates
        batch.texCoordData[0] = u1; batch.texCoordData[1] = v1;
        batch.texCoordData[2] = u2; batch.texCoordData[3] = v1;
        batch.texCoordData[4] = u1; batch.texCoordData[5] = v2;
        batch.texCoordData[6] = u2; batch.texCoordData[7] = v2;

        // Add indices
        batch.indexData[0] = 0; batch.indexData[1] = 1; batch.indexData[2] = 2;
        batch.indexData[3] = 1; batch.indexData[4] = 2; batch.indexData[5] = 3;

        batch.currentVertices = 4;
        batch.currentIndices = 6;

        // Render immediately
        this.renderImageBatch(texture);
    }

    /*
     * Render image batch
     */
    renderImageBatch(texture) {
        const batch = this.batchBuffers.images;
        if (batch.currentVertices === 0) return;

        const gl = this.gl;
        const program = this.shaders.image;

        gl.useProgram(program);

        // Bind texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);

        // Upload vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.vertices);
        gl.bufferData(gl.ARRAY_BUFFER, batch.vertexData.subarray(0, batch.currentVertices * 2), gl.DYNAMIC_DRAW);

        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        // Upload texture coordinate data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.texCoords);
        gl.bufferData(gl.ARRAY_BUFFER, batch.texCoordData.subarray(0, batch.currentVertices * 2), gl.DYNAMIC_DRAW);

        const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
        gl.enableVertexAttribArray(texCoordLoc);
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

        // Upload index data
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, batch.indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, batch.indexData.subarray(0, batch.currentIndices), gl.DYNAMIC_DRAW);

        // Set uniforms
        const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
        gl.uniform2f(resolutionLoc, this.width, this.height);

        const globalAlphaLoc = gl.getUniformLocation(program, 'u_globalAlpha');
        gl.uniform1f(globalAlphaLoc, this.state.globalAlpha);

        // Draw
        gl.drawElements(gl.TRIANGLES, batch.currentIndices, gl.UNSIGNED_SHORT, 0);

        // Reset batch
        batch.currentVertices = 0;
        batch.currentIndices = 0;
    }

    /*
     * Get or create texture from image
     */
    getOrCreateTexture(image) {
        if (this.textureCache.has(image)) {
            return this.textureCache.get(image);
        }

        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        if (this.state.imageSmoothingEnabled) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        }

        // Upload image data
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        this.textureCache.set(image, texture);
        return texture;
    }

    /*
     * Draw image
     * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} image - Image to draw
     * @param {number} sx - Source x (optional)
     * @param {number} sy - Source y (optional)  
     * @param {number} sWidth - Source width (optional)
     * @param {number} sHeight - Source height (optional)
     * @param {number} dx - Destination x
     * @param {number} dy - Destination y
     * @param {number} dWidth - Destination width (optional)
     * @param {number} dHeight - Destination height (optional)
     */
    drawImage(image, ...args) {
        let sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight;

        if (args.length === 2) {
            // drawImage(image, dx, dy)
            [dx, dy] = args;
            sx = 0;
            sy = 0;
            sWidth = image.width || image.videoWidth || image.naturalWidth;
            sHeight = image.height || image.videoHeight || image.naturalHeight;
            dWidth = sWidth;
            dHeight = sHeight;
        } else if (args.length === 4) {
            // drawImage(image, dx, dy, dWidth, dHeight)
            [dx, dy, dWidth, dHeight] = args;
            sx = 0;
            sy = 0;
            sWidth = image.width || image.videoWidth || image.naturalWidth;
            sHeight = image.height || image.videoHeight || image.naturalHeight;
        } else if (args.length === 8) {
            // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
            [sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight] = args;
        } else {
            throw new Error('Invalid number of arguments for drawImage');
        }

        const texture = this.getOrCreateTexture(image);
        this.addImageToBatch(texture, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    }

    /*
     * Fill ellipse
     * @param {number} x - X coordinate of center
     * @param {number} y - Y coordinate of center
     * @param {number} radiusX - Horizontal radius
     * @param {number} radiusY - Vertical radius
     * @param {number} rotation - Rotation in radians (optional)
     * @param {number} startAngle - Start angle in radians (optional)
     * @param {number} endAngle - End angle in radians (optional)
     * @param {boolean} counterclockwise - Direction (optional)
     */
    fillEllipse(x, y, radiusX, radiusY, rotation = 0, startAngle = 0, endAngle = 2 * Math.PI, counterclockwise = false) {
        this.addEllipseToBatch(x, y, radiusX, radiusY, this.state.fillStyle);
    }

    /*
     * Stroke ellipse
     */
    strokeEllipse(x, y, radiusX, radiusY, rotation = 0, startAngle = 0, endAngle = 2 * Math.PI, counterclockwise = false) {
        this.addEllipseToBatch(x, y, radiusX, radiusY, this.state.strokeStyle);
    }

    /*
        * Fill rectangle - adds to batch
        * @param {number} x - X coordinate of the rectangle
        * @param {number} y - Y coordinate of the rectangle
        * @param {number} width - Width of the rectangle    
        * @param {number} height - Height of the rectangle
    */
    fillRect(x, y, width, height) {
        this.addRectangleToBatch(x, y, width, height, this.state.fillStyle);
    }

    /*
        * Stroke rectangle - adds to batch (not implemented in this version)
        * @param {number} x - X coordinate of the rectangle
        * @param {number} y - Y coordinate of the rectangle
        * @param {number} width - Width of the rectangle    
        * @param {number} height - Height of the rectangle
    */
    strokeRect(x, y, width, height) {
        const lineWidth = this.state.lineWidth;
        const halfWidth = lineWidth / 2;

        // Draw four rectangles to form the stroke
        // Top
        this.addRectangleToBatch(x - halfWidth, y - halfWidth, width + lineWidth, lineWidth, this.state.strokeStyle);
        // Bottom  
        this.addRectangleToBatch(x - halfWidth, y + height - halfWidth, width + lineWidth, lineWidth, this.state.strokeStyle);
        // Left
        this.addRectangleToBatch(x - halfWidth, y + halfWidth, lineWidth, height - lineWidth, this.state.strokeStyle);
        // Right
        this.addRectangleToBatch(x + width - halfWidth, y + halfWidth, lineWidth, height - lineWidth, this.state.strokeStyle);
    }

    /*
        * Fill circle - adds to batch
        * @param {number} x - X coordinate of the circle center
        * @param {number} y - Y coordinate of the circle center
        * @param {number} radius - Radius of the circle
    */
    fillCircle(x, y, radius) {
        this.addCircleToBatch(x, y, radius, this.state.fillStyle);
    }

    /*
        * Stroke circle - adds to batch
        * @param {number} x - X coordinate of the circle center
        * @param {number} y - Y coordinate of the circle center
        * @param {number} radius - Radius of the circle
    */
    strokeCircle(x, y, radius) {
        // TODO: Implement stroke circle batching
        this.addCircleToBatch(x, y, radius, this.state.strokeStyle);
    }

    /*
        * Draw a line between two points - adds to batch
        * @param {number} x1 - X coordinate of the first point
        * @param {number} y1 - Y coordinate of the first point
        * @param {number} x2 - X coordinate of the second point
        * @param {number} y2 - Y coordinate of the second point
    */
    drawLine(x1, y1, x2, y2) {
        const batch = this.batchBuffers.lines;

        // Check if batch is full
        if (batch.currentVertices + 2 > batch.maxVertices) {
            this.flushLines();
            batch.currentVertices = 0;
        }

        // Transform line endpoints
        const [tx1, ty1] = this.transformPoint(x1, y1);
        const [tx2, ty2] = this.transformPoint(x2, y2);

        const vertexIndex = batch.currentVertices;
        const color = this.state.strokeStyle;

        // Apply global alpha to line colors
        const finalColor = [
            color[0],
            color[1],
            color[2],
            color[3] * this.state.globalAlpha
        ];

        // Add vertices
        batch.vertexData[vertexIndex * 2 + 0] = tx1;
        batch.vertexData[vertexIndex * 2 + 1] = ty1;
        batch.vertexData[vertexIndex * 2 + 2] = tx2;
        batch.vertexData[vertexIndex * 2 + 3] = ty2;

        // Add colors with global alpha
        for (let i = 0; i < 2; i++) {
            batch.colorData[(vertexIndex + i) * 4 + 0] = finalColor[0];
            batch.colorData[(vertexIndex + i) * 4 + 1] = finalColor[1];
            batch.colorData[(vertexIndex + i) * 4 + 2] = finalColor[2];
            batch.colorData[(vertexIndex + i) * 4 + 3] = finalColor[3];
        }

        batch.currentVertices += 2;
    }

    /*
    * Set line dash pattern
    * @param {Array} segments - Array of line and gap lengths
    */
    setLineDash(segments) {
        this.state.lineDash = [...segments];
    }

    /*
    * Get current line dash pattern
    * @return {Array} - Current dash pattern
    */
    getLineDash() {
        return [...this.state.lineDash];
    }

    /*
    * Set line dash offset
    * @param {number} offset - Dash offset
    */
    set lineDashOffset(offset) {
        this.state.lineDashOffset = offset;
    }

    get lineDashOffset() {
        return this.state.lineDashOffset;
    }

    /*
     * Begin a new path
     */
    beginPath() {
        this.currentPath = [];
    }

    /*
     * Close the current path
     */
    closePath() {
        if (this.currentPath.length > 0) {
            this.currentPath.push({ type: 'close' });
        }
    }

    /*
     * Move to point without drawing
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    moveTo(x, y) {
        this.currentPath.push({ type: 'moveTo', x, y });
        this.pathStartX = x;
        this.pathStartY = y;
        this.currentX = x;
        this.currentY = y;
    }

    /*
     * Draw line to point
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    lineTo(x, y) {
        this.currentPath.push({ type: 'lineTo', x, y });
        this.currentX = x;
        this.currentY = y;
    }

    /*
     * Draw quadratic curve
     * @param {number} cpx - Control point X
     * @param {number} cpy - Control point Y
     * @param {number} x - End point X
     * @param {number} y - End point Y
     */
    quadraticCurveTo(cpx, cpy, x, y) {
        this.currentPath.push({ type: 'quadraticCurveTo', cpx, cpy, x, y });
        this.currentX = x;
        this.currentY = y;
    }

    /*
     * Draw bezier curve
     * @param {number} cp1x - Control point 1 X
     * @param {number} cp1y - Control point 1 Y
     * @param {number} cp2x - Control point 2 X
     * @param {number} cp2y - Control point 2 Y
     * @param {number} x - End point X
     * @param {number} y - End point Y
     */
    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        this.currentPath.push({ type: 'bezierCurveTo', cp1x, cp1y, cp2x, cp2y, x, y });
        this.currentX = x;
        this.currentY = y;
    }

    /*
     * Draw arc
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Arc radius
     * @param {number} startAngle - Start angle in radians
     * @param {number} endAngle - End angle in radians
     * @param {boolean} counterclockwise - Direction
     */
    arc(x, y, radius, startAngle, endAngle, counterclockwise = false) {
        this.currentPath.push({ type: 'arc', x, y, radius, startAngle, endAngle, counterclockwise });

        // Update current position to end of arc
        this.currentX = x + Math.cos(endAngle) * radius;
        this.currentY = y + Math.sin(endAngle) * radius;
    }

    /*
     * Draw arc between two points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @param {number} radius - Arc radius
     */
    arcTo(x1, y1, x2, y2, radius) {
        this.currentPath.push({ type: 'arcTo', x1, y1, x2, y2, radius });
        this.currentX = x2;
        this.currentY = y2;
    }

    /*
     * Add rectangle to path
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Width
     * @param {number} height - Height
     */
    rect(x, y, width, height) {
        this.moveTo(x, y);
        this.lineTo(x + width, y);
        this.lineTo(x + width, y + height);
        this.lineTo(x, y + height);
        this.closePath();
    }

    /*
     * Fill the current path
     */
    fill() {
        this.renderPath(true);
    }

    /*
     * Stroke the current path
     */
    stroke() {
        this.renderPath(false);
    }

    /*
     * Render the current path
     * @param {boolean} fill - Whether to fill (true) or stroke (false)
     */
    renderPath(fill) {
        if (this.currentPath.length === 0) return;

        // Convert path to line segments for rendering
        const segments = this.pathToSegments(this.currentPath);

        for (const segment of segments) {
            if (fill) {
                // For filling, we'd need to triangulate the path
                // For now, just draw lines
                this.drawLine(segment.x1, segment.y1, segment.x2, segment.y2);
            } else {
                this.drawLine(segment.x1, segment.y1, segment.x2, segment.y2);
            }
        }
    }

    /*
     * Convert path to line segments
     * @param {Array} path - Path commands
     * @return {Array} - Array of line segments
     */
    pathToSegments(path) {
        const segments = [];
        let currentX = 0, currentY = 0;
        let startX = 0, startY = 0;

        for (const command of path) {
            switch (command.type) {
                case 'moveTo':
                    currentX = command.x;
                    currentY = command.y;
                    startX = command.x;
                    startY = command.y;
                    break;

                case 'lineTo':
                    segments.push({
                        x1: currentX, y1: currentY,
                        x2: command.x, y2: command.y
                    });
                    currentX = command.x;
                    currentY = command.y;
                    break;

                case 'quadraticCurveTo':
                    // Approximate with line segments
                    const quadSegments = this.approximateQuadratic(
                        currentX, currentY,
                        command.cpx, command.cpy,
                        command.x, command.y,
                        10 // number of segments
                    );
                    segments.push(...quadSegments);
                    currentX = command.x;
                    currentY = command.y;
                    break;

                case 'bezierCurveTo':
                    // Approximate with line segments
                    const bezierSegments = this.approximateBezier(
                        currentX, currentY,
                        command.cp1x, command.cp1y,
                        command.cp2x, command.cp2y,
                        command.x, command.y,
                        10 // number of segments
                    );
                    segments.push(...bezierSegments);
                    currentX = command.x;
                    currentY = command.y;
                    break;

                case 'arc':
                    const arcSegments = this.approximateArc(
                        command.x, command.y,
                        command.radius,
                        command.startAngle,
                        command.endAngle,
                        command.counterclockwise,
                        20 // number of segments
                    );
                    if (arcSegments.length > 0) {
                        // Connect to start of arc
                        const firstPoint = arcSegments[0];
                        segments.push({
                            x1: currentX, y1: currentY,
                            x2: firstPoint.x1, y2: firstPoint.y1
                        });
                        segments.push(...arcSegments);
                        const lastPoint = arcSegments[arcSegments.length - 1];
                        currentX = lastPoint.x2;
                        currentY = lastPoint.y2;
                    }
                    break;

                case 'close':
                    segments.push({
                        x1: currentX, y1: currentY,
                        x2: startX, y2: startY
                    });
                    currentX = startX;
                    currentY = startY;
                    break;
            }
        }

        return segments;
    }

    /*
     * Approximate quadratic curve with line segments
     */
    approximateQuadratic(x0, y0, cx, cy, x1, y1, segments) {
        const result = [];
        for (let i = 0; i < segments; i++) {
            const t1 = i / segments;
            const t2 = (i + 1) / segments;

            const p1 = this.quadraticBezier(x0, y0, cx, cy, x1, y1, t1);
            const p2 = this.quadraticBezier(x0, y0, cx, cy, x1, y1, t2);

            result.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
        }
        return result;
    }

    /*
     * Approximate cubic bezier curve with line segments
     */
    approximateBezier(x0, y0, cx1, cy1, cx2, cy2, x1, y1, segments) {
        const result = [];
        for (let i = 0; i < segments; i++) {
            const t1 = i / segments;
            const t2 = (i + 1) / segments;

            const p1 = this.cubicBezier(x0, y0, cx1, cy1, cx2, cy2, x1, y1, t1);
            const p2 = this.cubicBezier(x0, y0, cx1, cy1, cx2, cy2, x1, y1, t2);

            result.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
        }
        return result;
    }

    /*
     * Approximate arc with line segments
     */
    approximateArc(cx, cy, radius, startAngle, endAngle, counterclockwise, segments) {
        const result = [];

        let totalAngle = endAngle - startAngle;
        if (counterclockwise) {
            if (totalAngle > 0) totalAngle -= 2 * Math.PI;
        } else {
            if (totalAngle < 0) totalAngle += 2 * Math.PI;
        }

        const angleStep = totalAngle / segments;

        for (let i = 0; i < segments; i++) {
            const angle1 = startAngle + angleStep * i;
            const angle2 = startAngle + angleStep * (i + 1);

            const x1 = cx + Math.cos(angle1) * radius;
            const y1 = cy + Math.sin(angle1) * radius;
            const x2 = cx + Math.cos(angle2) * radius;
            const y2 = cy + Math.sin(angle2) * radius;

            result.push({ x1, y1, x2, y2 });
        }

        return result;
    }

    /*
     * Calculate point on quadratic bezier curve
     */
    quadraticBezier(x0, y0, cx, cy, x1, y1, t) {
        const u = 1 - t;
        const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
        const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
        return { x, y };
    }

    /*
     * Calculate point on cubic bezier curve
     */
    cubicBezier(x0, y0, cx1, cy1, cx2, cy2, x1, y1, t) {
        const u = 1 - t;
        const x = u * u * u * x0 + 3 * u * u * t * cx1 + 3 * u * t * t * cx2 + t * t * t * x1;
        const y = u * u * u * y0 + 3 * u * u * t * cy1 + 3 * u * t * t * cy2 + t * t * t * y1;
        return { x, y };
    }

    /*
     * Fill text (basic implementation)
     * @param {string} text - Text to draw
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} maxWidth - Maximum width (optional)
     */
    fillText(text, x, y, maxWidth) {
        this.renderText(text, x, y, maxWidth, true);
    }

    /*
     * Stroke text (basic implementation)
     * @param {string} text - Text to draw
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} maxWidth - Maximum width (optional)
     */
    strokeText(text, x, y, maxWidth) {
        this.renderText(text, x, y, maxWidth, false);
    }

    /*
    * Create or get cached font canvas for text rendering
    */
    getFontCanvas(font) {
        if (!this.fontCanvas) {
            this.fontCanvas = document.createElement('canvas');
            this.fontCtx = this.fontCanvas.getContext('2d');
        }

        // Set font on the 2D context
        this.fontCtx.font = font;
        return { canvas: this.fontCanvas, ctx: this.fontCtx };
    }

    /*
 * Render text to texture and draw
 */
    renderText(text, x, y, maxWidth, fill = true) {
        const { canvas, ctx } = this.getFontCanvas(this.state.font);

        // Measure text
        const metrics = ctx.measureText(text);
        let textWidth = metrics.width;

        // Handle max width
        if (maxWidth && textWidth > maxWidth) {
            const scale = maxWidth / textWidth;
            textWidth = maxWidth;
        }

        const textHeight = Math.abs(metrics.actualBoundingBoxAscent) + Math.abs(metrics.actualBoundingBoxDescent);

        // Resize canvas to fit text with some padding
        const padding = 4;
        canvas.width = Math.ceil(textWidth) + padding * 2;
        canvas.height = Math.ceil(textHeight) + padding * 2;

        // Reset context after resize
        ctx.font = this.state.font;
        ctx.textAlign = this.state.textAlign;
        ctx.textBaseline = this.state.textBaseline;

        // Set up rendering
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (fill) {
            const color = this.state.fillStyle;
            ctx.fillStyle = `rgba(${Math.floor(color[0] * 255)}, ${Math.floor(color[1] * 255)}, ${Math.floor(color[2] * 255)}, ${color[3] * this.state.globalAlpha})`;
            ctx.fillText(text, padding, padding + Math.abs(metrics.actualBoundingBoxAscent));
        } else {
            const color = this.state.strokeStyle;
            ctx.strokeStyle = `rgba(${Math.floor(color[0] * 255)}, ${Math.floor(color[1] * 255)}, ${Math.floor(color[2] * 255)}, ${color[3] * this.state.globalAlpha})`;
            ctx.lineWidth = this.state.lineWidth;
            ctx.strokeText(text, padding, padding + Math.abs(metrics.actualBoundingBoxAscent));
        }

        // Calculate final position based on text alignment
        let finalX = x;
        let finalY = y;

        // Adjust for text alignment
        switch (this.state.textAlign) {
            case 'center':
                finalX -= textWidth / 2;
                break;
            case 'right':
            case 'end':
                finalX -= textWidth;
                break;
        }

        // Adjust for text baseline
        switch (this.state.textBaseline) {
            case 'top':
                finalY -= Math.abs(metrics.actualBoundingBoxAscent);
                break;
            case 'middle':
                finalY -= textHeight / 2;
                break;
            case 'bottom':
                finalY += Math.abs(metrics.actualBoundingBoxDescent);
                break;
        }

        // Draw the text canvas as an image
        this.drawImage(canvas, finalX - padding, finalY - padding);
    }

    /*
     * Measure text width
     * @param {string} text - Text to measure
     * @return {object} - Text metrics
     */
    measureText(text) {
        const { ctx } = this.getFontCanvas(this.state.font);
        ctx.font = this.state.font;
        ctx.textAlign = this.state.textAlign;
        ctx.textBaseline = this.state.textBaseline;
        return ctx.measureText(text);
    }

    /*
     * Create linear gradient
     * @param {number} x0 - Start x
     * @param {number} y0 - Start y
     * @param {number} x1 - End x
     * @param {number} y1 - End y
     * @return {object} - Gradient object
     */
    createLinearGradient(x0, y0, x1, y1) {
        return {
            type: 'linear',
            x0, y0, x1, y1,
            colorStops: []
        };
    }

    /*
     * Create radial gradient
     * @param {number} x0 - Start center x
     * @param {number} y0 - Start center y
     * @param {number} r0 - Start radius
     * @param {number} x1 - End center x
     * @param {number} y1 - End center y
     * @param {number} r1 - End radius
     * @return {object} - Gradient object
     */
    createRadialGradient(x0, y0, r0, x1, y1, r1) {
        return {
            type: 'radial',
            x0, y0, r0, x1, y1, r1,
            colorStops: []
        };
    }

    /*
     * Create pattern
     * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} image - Image for pattern
     * @param {string} repetition - 'repeat', 'repeat-x', 'repeat-y', 'no-repeat'
     * @return {object} - Pattern object
     */
    createPattern(image, repetition) {
        return {
            type: 'pattern',
            image,
            repetition
        };
    }

    /*
     * Put image data
     * @param {ImageData} imageData - Image data to put
     * @param {number} dx - Destination x
     * @param {number} dy - Destination y
     */
    putImageData(imageData, dx, dy) {
        // Create a temporary canvas to draw the image data
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);

        this.drawImage(tempCanvas, dx, dy);
    }

    /*
     * Get image data
     * @param {number} sx - Source x
     * @param {number} sy - Source y
     * @param {number} sw - Source width
     * @param {number} sh - Source height
     * @return {ImageData} - Image data
     */
    getImageData(sx, sy, sw, sh) {
        // This would require reading from the WebGL framebuffer
        // For now, return empty image data
        console.warn('getImageData is not fully implemented in this WebGL canvas');
        return new ImageData(sw, sh);
    }

    /*
     * Create image data
     * @param {number} width - Width
     * @param {number} height - Height
     * @return {ImageData} - New image data
     */
    createImageData(width, height) {
        return new ImageData(width, height);
    }

    /*
    * Set transform matrix directly
    * @param {number} a - Horizontal scaling
    * @param {number} b - Horizontal skewing
    * @param {number} c - Vertical skewing
    * @param {number} d - Vertical scaling
    * @param {number} e - Horizontal translation
    * @param {number} f - Vertical translation
    */
    setTransform(a, b, c, d, e, f) {
        this.state.transform = [
            a, c, e,
            b, d, f,
            0, 0, 1
        ];
    }

    /*
    * Transform matrix multiplication
    * @param {number} a - Horizontal scaling
    * @param {number} b - Horizontal skewing
    * @param {number} c - Vertical skewing
    * @param {number} d - Vertical scaling
    * @param {number} e - Horizontal translation
    * @param {number} f - Vertical translation
    */
    transform(a, b, c, d, e, f) {
        const transformMatrix = [
            a, c, e,
            b, d, f,
            0, 0, 1
        ];
        this.state.transform = this.multiplyMatrix(this.state.transform, transformMatrix);
    }

    /*
    * Reset transform to identity matrix
    */
    resetTransform() {
        this.state.transform = this.createIdentityMatrix();
    }

    /*
        * Translate the canvas
        * Applies a translation transformation to the current state
        * @param {number} x - X translation
        * @param {number} y - Y translation
    */
    translate(x, y) {
        const translateMatrix = [
            1, 0, x,
            0, 1, y,
            0, 0, 1
        ];
        this.state.transform = this.multiplyMatrix(this.state.transform, translateMatrix);
    }

    /*
        * Rotate the canvas
        * Applies a rotation transformation to the current state
        * @param {number} angle - Rotation angle in radians
    */
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const rotateMatrix = [
            cos, -sin, 0,
            sin, cos, 0,
            0, 0, 1
        ];
        this.state.transform = this.multiplyMatrix(this.state.transform, rotateMatrix);
    }

    /*
        * Scale the canvas
        * Applies a scaling transformation to the current state
        * @param {number} x - X scale factor
        * @param {number} y - Y scale factor (optional, defaults to x)
    */
    scale(x, y = x) {
        const scaleMatrix = [
            x, 0, 0,
            0, y, 0,
            0, 0, 1
        ];
        this.state.transform = this.multiplyMatrix(this.state.transform, scaleMatrix);
    }

    /*
    * Create clipping region from current path
    */
    clip() {
        // For now, store the current path as a clipping region
        // Full implementation would require stencil buffer or scissor test
        if (this.currentPath.length > 0) {
            this.state.clipPath = [...this.currentPath];
            console.warn('clip() is partially implemented - full clipping requires stencil buffer');
        }
    }

    /*
    * Clear the current clipping region
    */
    resetClip() {
        this.state.clipPath = null;
    }

    /*
        * Add a custom shader program
        * Allows users to define their own shaders for advanced effects
        * @param {string} name - Name of the shader
        * @param {string} vertexShaderSource - GLSL source code for the vertex shader
        * @param {string} fragmentShaderSource - GLSL source code for the fragment shader
    */
    addShader(name, vertexShaderSource, fragmentShaderSource) {
        try {
            const program = this.createShaderProgram(vertexShaderSource, fragmentShaderSource);

            // Cache attribute and uniform locations for better performance
            const attributes = {};
            const uniforms = {};

            // Get all active attributes
            const numAttributes = this.gl.getProgramParameter(program, this.gl.ACTIVE_ATTRIBUTES);
            for (let i = 0; i < numAttributes; i++) {
                const info = this.gl.getActiveAttrib(program, i);
                if (info) {
                    const location = this.gl.getAttribLocation(program, info.name);
                    attributes[info.name] = location;
                }
            }

            // Get all active uniforms
            const numUniforms = this.gl.getProgramParameter(program, this.gl.ACTIVE_UNIFORMS);
            for (let i = 0; i < numUniforms; i++) {
                const info = this.gl.getActiveUniform(program, i);
                if (info) {
                    const location = this.gl.getUniformLocation(program, info.name);
                    uniforms[info.name] = location;
                }
            }

            this.shaders[name] = program;
            this.shaders[name].attributes = attributes;
            this.shaders[name].uniforms = uniforms;
            this.shaders[name].name = name; // Add name for debugging

            return program;
        } catch (error) {
            console.error(`Failed to create shader "${name}":`, error);
            throw error;
        }
    }

    /*
        * Use a custom shader program
        * Sets the current shader program to the specified one
        * @param {string} name - Name of the shader to use
        * @return {WebGLProgram} - The shader program being used
    */
    useShader(name) {
        if (this.shaders[name]) {
            const program = this.shaders[name];
            this.gl.useProgram(program);
            this.currentShader = program; // Keep track of current shader
            return program;
        }
        throw new Error(`Shader "${name}" not found. Available shaders: ${Object.keys(this.shaders).join(', ')}`);
    }

    /*
    * Draw with custom shader
    * @param {string} shaderName - Name of the shader to use
    * @param {Float32Array} vertices - Vertex data
    * @param {Uint16Array} indices - Index data (optional)
    * @param {Object} uniforms - Uniform values to set
    * @param {Object} attributes - Additional attribute data
    */
    drawWithShader(shaderName, vertices, indices = null, uniforms = {}, attributes = {}) {
        const program = this.useShader(shaderName);
        const gl = this.gl;

        // Create vertex buffer if needed
        if (!this.customVertexBuffer) {
            this.customVertexBuffer = gl.createBuffer();
        }

        // Upload vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.customVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

        // Set up position attribute (assuming it exists)
        if (program.attributes['a_position'] !== undefined) {
            gl.enableVertexAttribArray(program.attributes['a_position']);
            gl.vertexAttribPointer(program.attributes['a_position'], 2, gl.FLOAT, false, 0, 0);
        }

        // Set additional attributes
        Object.keys(attributes).forEach(name => {
            const location = program.attributes[name];
            if (location !== undefined) {
                const data = attributes[name];
                // Create buffer for this attribute
                const buffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ARRAY_BUFFER, data.data, gl.DYNAMIC_DRAW);

                gl.enableVertexAttribArray(location);
                gl.vertexAttribPointer(location, data.size, data.type || gl.FLOAT, false, 0, 0);
            }
        });

        // Set uniforms
        Object.keys(uniforms).forEach(name => {
            const location = program.uniforms[name];
            if (location !== null) {
                const value = uniforms[name];
                if (Array.isArray(value)) {
                    switch (value.length) {
                        case 1: gl.uniform1f(location, value[0]); break;
                        case 2: gl.uniform2f(location, value[0], value[1]); break;
                        case 3: gl.uniform3f(location, value[0], value[1], value[2]); break;
                        case 4: gl.uniform4f(location, value[0], value[1], value[2], value[3]); break;
                    }
                } else if (typeof value === 'number') {
                    gl.uniform1f(location, value);
                }
            }
        });

        // Set common uniforms if they exist
        if (program.uniforms['u_resolution']) {
            gl.uniform2f(program.uniforms['u_resolution'], this.width, this.height);
        }
        if (program.uniforms['u_globalAlpha']) {
            gl.uniform1f(program.uniforms['u_globalAlpha'], this.state.globalAlpha);
        }

        // Draw
        if (indices) {
            // Create index buffer if needed
            if (!this.customIndexBuffer) {
                this.customIndexBuffer = gl.createBuffer();
            }
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.customIndexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);
            gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        } else {
            gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
        }
    }

    /*
    * Helper method to create a simple quad for shader testing
    * @param {number} x - X position
    * @param {number} y - Y position
    * @param {number} width - Width
    * @param {number} height - Height
    * @return {Object} - Vertices and indices for a quad
    */
    createQuad(x, y, width, height) {
        const vertices = new Float32Array([
            x, y,                    // Bottom-left
            x + width, y,            // Bottom-right
            x, y + height,           // Top-left
            x + width, y + height    // Top-right
        ]);

        const indices = new Uint16Array([
            0, 1, 2,    // First triangle
            1, 2, 3     // Second triangle
        ]);

        return { vertices, indices };
    }

    /*
     * List all available shaders
     * @return {Array} - Array of shader names
     */
    listShaders() {
        return Object.keys(this.shaders);
    }

    /*
    * Get shader info for debugging
    * @param {string} name - Shader name
    * @return {Object} - Shader information
    */
    getShaderInfo(name) {
        const program = this.shaders[name];
        if (!program) return null;

        return {
            name: name,
            attributes: Object.keys(program.attributes || {}),
            uniforms: Object.keys(program.uniforms || {}),
            program: program
        };
    }

    /*
    * Begin batch mode - call this before drawing many objects
    */
    beginBatch() {
        // This is just for semantic clarity - batching is always active
    }

    /*
    * End batch mode and flush everything
    */
    endBatch() {
        this.flush();
    }

    /*
    * Set a higher batch size for better performance
    */
    setBatchSize(size) {
        this.options.batchSize = size;
        // Recreate buffers with new size
        this.createBatchBuffers();
    }

    checkGLError(operation) {
        const error = this.gl.getError();
        if (error !== this.gl.NO_ERROR) {
            console.error(`WebGL error after ${operation}: ${error}`);
            return false;
        }
        return true;
    }

    /*
        * Resize the canvas
        * Updates the canvas size and WebGL viewport
        * @param {number} width - New width of the canvas
        * @param {number} height - New height of the canvas
    */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;
        this.gl.viewport(0, 0, width, height);
    }

    // Fullscreen functionality (keeping existing implementation)
    setupFullscreen() {
        // Create fullscreen button
        this.createFullscreenButton();

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());

        // Listen for escape key when canvas is focused
        this.canvas.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isFullscreen) {
                e.preventDefault();
                e.stopPropagation();
                this.exitFullscreen();
            }
        });

        // Global escape key handler to prevent double-escape issue
        this.globalEscapeHandler = (e) => {
            if (e.key === 'Escape' && this.isFullscreen) {
                e.preventDefault();
                e.stopPropagation();
                this.exitFullscreen();
            }
        };
        document.addEventListener('keydown', this.globalEscapeHandler, true);
    }

    createFullscreenButton() {
        // Create a wrapper around the canvas if it doesn't exist
        let wrapper = this.canvas.parentElement;
        const needsWrapper = !wrapper || !wrapper.classList.contains('webgl-canvas-wrapper');

        if (needsWrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'webgl-canvas-wrapper';
            wrapper.style.cssText = `
                position: relative;
                display: inline-block;
                width: ${this.displayWidth || this.canvas.offsetWidth || this.canvas.width}px;
                height: ${this.displayHeight || this.canvas.offsetHeight || this.canvas.height}px;
                margin: 0;
                padding: 0;
            `;

            // Insert wrapper and move canvas into it
            this.canvas.parentNode.insertBefore(wrapper, this.canvas);
            wrapper.appendChild(this.canvas);
        }

        // Create the button
        this.fullscreenButton = document.createElement('button');
        this.fullscreenButton.className = 'webgl-fullscreen-btn';
        this.fullscreenButton.style.cssText = `
            position: absolute;
            bottom: 5px;
            right: 5px;
            z-index: 1000;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            padding: 6px;
            transition: all 0.3s ease;
            backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            opacity: 0.7;
            margin: 0;
            box-sizing: border-box;
            line-height: 1;
        `;

        this.fullscreenButton.innerHTML = '⛶'; // Fullscreen icon
        this.fullscreenButton.title = 'Toggle Fullscreen (F11 or click)';

        // Button hover effects
        this.fullscreenButton.addEventListener('mouseenter', () => {
            this.fullscreenButton.style.background = 'rgba(102, 126, 234, 0.8)';
            this.fullscreenButton.style.transform = 'scale(1.1)';
            this.fullscreenButton.style.opacity = '1';
        });

        this.fullscreenButton.addEventListener('mouseleave', () => {
            this.fullscreenButton.style.background = 'rgba(0, 0, 0, 0.5)';
            this.fullscreenButton.style.transform = 'scale(1)';
            this.fullscreenButton.style.opacity = '0.7';
        });

        // Button click handler
        this.fullscreenButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFullscreen();
        });

        // Add button to wrapper
        wrapper.appendChild(this.fullscreenButton);

        // Store references
        this.wrapper = wrapper;
    }

    toggleFullscreen() {
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }

    enterFullscreen() {
        // Store original styles and dimensions
        this.originalStyle = {
            width: this.canvas.style.width,
            height: this.canvas.style.height,
            position: this.canvas.style.position,
            top: this.canvas.style.top,
            left: this.canvas.style.left,
            zIndex: this.canvas.style.zIndex,
            margin: this.canvas.style.margin,
            transform: this.canvas.style.transform
        };

        // Store original canvas dimensions (these stay the same for drawing)
        this.originalDimensions = {
            width: this.canvas.width,
            height: this.canvas.height,
            cssWidth: this.canvas.style.width,
            cssHeight: this.canvas.style.height
        };

        // Calculate scale to fit screen while maintaining aspect ratio
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const canvasAspect = this.canvas.width / this.canvas.height;
        const screenAspect = screenWidth / screenHeight;

        let scaledWidth, scaledHeight;

        if (canvasAspect > screenAspect) {
            // Canvas is wider than screen - fit to width
            scaledWidth = screenWidth;
            scaledHeight = screenWidth / canvasAspect;
        } else {
            // Canvas is taller than screen - fit to height
            scaledHeight = screenHeight;
            scaledWidth = screenHeight * canvasAspect;
        }

        // Center the canvas on screen
        const left = (screenWidth - scaledWidth) / 2;
        const top = (screenHeight - scaledHeight) / 2;

        // Apply fullscreen styles with scaling
        this.canvas.style.cssText += `
            position: fixed !important;
            top: ${top}px !important;
            left: ${left}px !important;
            width: ${scaledWidth}px !important;
            height: ${scaledHeight}px !important;
            z-index: 9999 !important;
            margin: 0 !important;
            border-radius: 0 !important;
            image-rendering: pixelated !important;
            image-rendering: -moz-crisp-edges !important;
            image-rendering: crisp-edges !important;
        `;

        // Update button position for fullscreen
        if (this.fullscreenButton) {
            this.fullscreenButton.style.position = 'fixed';
            this.fullscreenButton.style.bottom = '5px';
            this.fullscreenButton.style.right = '5px';
            this.fullscreenButton.style.zIndex = '10000';
        }

        // Update button icon
        this.fullscreenButton.innerHTML = '⛷'; // Exit fullscreen icon
        this.fullscreenButton.title = 'Exit Fullscreen (Esc or click)';

        this.isFullscreen = true;

        // Try to enter browser fullscreen if supported
        if (this.canvas.requestFullscreen) {
            this.canvas.requestFullscreen().catch(() => {
                // Fullscreen failed, but we still have our custom fullscreen
            });
        } else if (this.canvas.webkitRequestFullscreen) {
            this.canvas.webkitRequestFullscreen();
        } else if (this.canvas.mozRequestFullScreen) {
            this.canvas.mozRequestFullScreen();
        } else if (this.canvas.msRequestFullscreen) {
            this.canvas.msRequestFullscreen();
        }

        // Focus the canvas
        this.canvas.focus();

        // Dispatch custom event
        this.canvas.dispatchEvent(new CustomEvent('enterFullscreen'));
    }

    exitFullscreen() {
        // Restore original styles
        Object.keys(this.originalStyle).forEach(key => {
            this.canvas.style[key] = this.originalStyle[key] || '';
        });

        // Restore original dimensions from stored values
        this.canvas.width = this.originalDimensions.width;
        this.canvas.height = this.originalDimensions.height;
        this.width = this.originalDimensions.width;
        this.height = this.originalDimensions.height;

        // Restore CSS size if it was set
        if (this.originalDimensions.cssWidth) {
            this.canvas.style.width = this.originalDimensions.cssWidth;
        } else {
            this.canvas.style.width = '';
        }
        if (this.originalDimensions.cssHeight) {
            this.canvas.style.height = this.originalDimensions.cssHeight;
        } else {
            this.canvas.style.height = '';
        }

        // Update wrapper size if we have a wrapper
        if (this.wrapper && this.wrapper.classList.contains('webgl-canvas-wrapper')) {
            this.wrapper.style.width = `${this.displayWidth || this.canvas.offsetWidth || this.canvas.width}px`;
            this.wrapper.style.height = `${this.displayHeight || this.canvas.offsetHeight || this.canvas.height}px`;
        }

        // Update WebGL viewport
        this.gl.viewport(0, 0, this.width, this.height);

        // Restore button position
        if (this.fullscreenButton) {
            this.fullscreenButton.style.position = 'absolute';
            this.fullscreenButton.style.bottom = '5px';
            this.fullscreenButton.style.right = '5px';
            this.fullscreenButton.style.zIndex = '1000';
        }

        // Update button icon
        this.fullscreenButton.innerHTML = '⛶'; // Fullscreen icon
        this.fullscreenButton.title = 'Toggle Fullscreen (F11 or click)';

        this.isFullscreen = false;

        // Exit browser fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => { });
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }

        // Dispatch custom event
        this.canvas.dispatchEvent(new CustomEvent('exitFullscreen'));
    }

    handleFullscreenChange() {
        // Check if we're still in browser fullscreen
        const isInBrowserFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );

        // If browser fullscreen was exited but we're still in custom fullscreen
        if (!isInBrowserFullscreen && this.isFullscreen) {
            // Exit our custom fullscreen to stay in sync
            this.exitFullscreen();
        }
    }

    /**
     * Clean up resources and remove fullscreen elements
     * Call this when you're done with the canvas
     */
    cleanup() {
        // Remove global escape handler
        if (this.globalEscapeHandler) {
            document.removeEventListener('keydown', this.globalEscapeHandler, true);
        }

        // Remove fullscreen button
        if (this.fullscreenButton && this.fullscreenButton.parentNode) {
            this.fullscreenButton.parentNode.removeChild(this.fullscreenButton);
        }

        // If we created a wrapper, restore original structure
        if (this.wrapper && this.wrapper.classList.contains('webgl-canvas-wrapper')) {
            const parent = this.wrapper.parentNode;
            if (parent) {
                parent.insertBefore(this.canvas, this.wrapper);
                parent.removeChild(this.wrapper);
            }
        }

        // Clean up WebGL resources
        if (this.gl) {
            // Clean up batch buffers
            Object.values(this.batchBuffers).forEach(batch => {
                if (batch.vertices) this.gl.deleteBuffer(batch.vertices);
                if (batch.colors) this.gl.deleteBuffer(batch.colors);
                if (batch.indices) this.gl.deleteBuffer(batch.indices);
                if (batch.instanceData) this.gl.deleteBuffer(batch.instanceData);
            });

            // Clean up shaders
            Object.values(this.shaders).forEach(shader => {
                if (shader) this.gl.deleteProgram(shader);
            });
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebGLCanvas;
} else if (typeof window !== 'undefined') {
    window.WebGLCanvas = WebGLCanvas;
}