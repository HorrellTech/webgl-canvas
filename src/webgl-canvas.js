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
            batchSize: options.batchSize || 1000, // Max objects per batch
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
            transform: this.createIdentityMatrix()
        };
        this.stateStack = [];
        
        // Fullscreen state
        this.isFullscreen = false;
        this.originalStyle = {};
        this.originalDimensions = {};
        this.fullscreenButton = null;
        
        // Batching system
        this.batches = {
            rectangles: [],
            circles: [],
            lines: []
        };
        this.batchBuffers = {};
        
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
        
        // Circle batch buffer (using instanced rendering)
        this.batchBuffers.circles = {
            vertices: gl.createBuffer(),
            instanceBuffer: gl.createBuffer(),  // Changed from instanceData to instanceBuffer
            indices: gl.createBuffer(),
            maxInstances: batchSize,
            currentInstances: 0,
            instanceData: new Float32Array(batchSize * 8), // Keep this as instanceData
            quadVertices: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            quadIndices: new Uint16Array([0, 1, 2, 1, 2, 3])
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
            m[0] * x + m[3] * y + m[6],
            m[1] * x + m[4] * y + m[7]
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
        
        // Instanced circle vertex shader
        const instancedCircleVertexShader = `
            precision mediump float;
            attribute vec2 a_position; // Quad vertex (-1 to 1)
            attribute vec4 a_instanceData1; // x, y, radius, rotation
            attribute vec4 a_instanceData2; // r, g, b, a
            uniform vec2 u_resolution;
            varying vec4 v_color;
            varying vec2 v_center;
            varying float v_radius;
            varying vec2 v_coord;
            
            void main() {
                vec2 center = a_instanceData1.xy;
                float radius = a_instanceData1.z;
                
                // Scale quad to circle size and position
                vec2 position = center + a_position * radius;
                
                // Convert to normalized device coordinates
                vec2 normalized = (position / u_resolution) * 2.0 - 1.0;
                normalized.y = -normalized.y;
                
                gl_Position = vec4(normalized, 0, 1);
                v_color = a_instanceData2;
                v_center = center;
                v_radius = radius;
                v_coord = position;
            }
        `;
        
        // Circle fragment shader with perfect circles
        const circleFragmentShader = `
            precision mediump float;
            varying vec4 v_color;
            varying vec2 v_center;
            varying float v_radius;
            varying vec2 v_coord;
            
            void main() {
                float dist = distance(v_coord, v_center);
                if (dist > v_radius) {
                    discard;
                }
                gl_FragColor = v_color;
            }
        `;
        
        // Line shader (same as batched rect but for lines)
        const lineVertexShader = batchedRectVertexShader;
        const lineFragmentShader = batchedFragmentShader;
        
        this.shaders.batchedRect = this.createShaderProgram(batchedRectVertexShader, batchedFragmentShader);
        this.shaders.instancedCircle = this.createShaderProgram(instancedCircleVertexShader, circleFragmentShader);
        this.shaders.batchedLine = this.createShaderProgram(lineVertexShader, lineFragmentShader);
    }
    
    // Canvas-like API methods
    
    /*
        * Clear the canvas and reset batches
        * Sets the clear color to transparent and clears the color buffer
    */ 
    clear() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        
        // Reset all batches
        this.batchBuffers.rectangles.currentVertices = 0;
        this.batchBuffers.rectangles.currentIndices = 0;
        this.batchBuffers.circles.currentInstances = 0;
        this.batchBuffers.lines.currentVertices = 0;
    }
    
    /*
     * Flush all batches to GPU
     * This is where the magic happens - renders all batched objects efficiently
     */
    flush() {
        this.flushRectangles();
        this.flushCircles();
        this.flushLines();
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
    }
    
    /*
     * Flush circle batch using instanced rendering
     */
    flushCircles() {
        const batch = this.batchBuffers.circles;
        if (batch.currentInstances === 0) return;
        
        const gl = this.gl;
        const program = this.shaders.instancedCircle;
        
        gl.useProgram(program);
        
        // Set up quad vertices (shared by all instances)
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.vertices);
        gl.bufferData(gl.ARRAY_BUFFER, batch.quadVertices, gl.STATIC_DRAW);
        
        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        
        // Set up instance data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.instanceBuffer);  // Changed from instanceData to instanceBuffer
        gl.bufferData(gl.ARRAY_BUFFER, batch.instanceData.subarray(0, batch.currentInstances * 8), gl.DYNAMIC_DRAW);
        
        // Instance data 1: x, y, radius, rotation
        const instanceLoc1 = gl.getAttribLocation(program, 'a_instanceData1');
        gl.enableVertexAttribArray(instanceLoc1);
        gl.vertexAttribPointer(instanceLoc1, 4, gl.FLOAT, false, 32, 0);
        
        // Instance data 2: r, g, b, a
        const instanceLoc2 = gl.getAttribLocation(program, 'a_instanceData2');
        gl.enableVertexAttribArray(instanceLoc2);
        gl.vertexAttribPointer(instanceLoc2, 4, gl.FLOAT, false, 32, 16);
        
        // Set up indices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, batch.indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, batch.quadIndices, gl.STATIC_DRAW);
        
        // Set uniforms
        const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
        gl.uniform2f(resolutionLoc, this.width, this.height);
        
        // Draw all circles using instancing (if supported) or loop
        if (gl.drawElementsInstanced) {
            gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, batch.currentInstances);
        } else {
            // Fallback: draw each circle individually (still faster than original method)
            for (let i = 0; i < batch.currentInstances; i++) {
                gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
            }
        }
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
        * Parse color input
        * Converts hex, rgb, rgba, or array formats to RGBA array
        * @param {string|Array} color - Color value
        * @return {Array} - RGBA array
    */
    parseColor(color) {
        if (Array.isArray(color)) return color;
        
        if (typeof color === 'string') {
            if (color.startsWith('#')) {
                // Hex color
                const hex = color.substring(1);
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                return [r, g, b, 1];
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
                                if (t < 1/6) return p + (q - p) * 6 * t;
                                if (t < 1/2) return q;
                                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                                return p;
                            };
                            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                            const p = 2 * l - q;
                            r = hue2rgb(p, q, h + 1/3);
                            g = hue2rgb(p, q, h);
                            b = hue2rgb(p, q, h - 1/3);
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
        * Save the current state
        * Saves fillStyle, strokeStyle, lineWidth, and transform to the state stack
    */
    save() {
        this.stateStack.push({
            fillStyle: [...this.state.fillStyle],
            strokeStyle: [...this.state.strokeStyle],
            lineWidth: this.state.lineWidth,
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
    
    // Drawing methods (now use batching)
    
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
        // TODO: Implement stroke rectangle batching
        this.addRectangleToBatch(x, y, width, height, this.state.strokeStyle);
    }
    
    /*
     * Add rectangle to batch
     */
    addRectangleToBatch(x, y, width, height, color) {
        const batch = this.batchBuffers.rectangles;
        
        // Check if batch is full
        if (batch.currentVertices + 4 > batch.maxVertices) {
            this.flushRectangles();
            batch.currentVertices = 0;
            batch.currentIndices = 0;
        }
        
        // Transform rectangle vertices
        const [x1, y1] = this.transformPoint(x, y);
        const [x2, y2] = this.transformPoint(x + width, y);
        const [x3, y3] = this.transformPoint(x, y + height);
        const [x4, y4] = this.transformPoint(x + width, y + height);
        
        const vertexIndex = batch.currentVertices;
        const colorIndex = batch.currentVertices;
        
        // Add vertices
        batch.vertexData[vertexIndex * 2 + 0] = x1;
        batch.vertexData[vertexIndex * 2 + 1] = y1;
        batch.vertexData[vertexIndex * 2 + 2] = x2;
        batch.vertexData[vertexIndex * 2 + 3] = y2;
        batch.vertexData[vertexIndex * 2 + 4] = x3;
        batch.vertexData[vertexIndex * 2 + 5] = y3;
        batch.vertexData[vertexIndex * 2 + 6] = x4;
        batch.vertexData[vertexIndex * 2 + 7] = y4;
        
        // Add colors for all 4 vertices
        for (let i = 0; i < 4; i++) {
            batch.colorData[(colorIndex + i) * 4 + 0] = color[0];
            batch.colorData[(colorIndex + i) * 4 + 1] = color[1];
            batch.colorData[(colorIndex + i) * 4 + 2] = color[2];
            batch.colorData[(colorIndex + i) * 4 + 3] = color[3];
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
     * Add circle to batch
     */
    addCircleToBatch(x, y, radius, color) {
        const batch = this.batchBuffers.circles;
        
        // Check if batch is full
        if (batch.currentInstances + 1 > batch.maxInstances) {
            this.flushCircles();
            batch.currentInstances = 0;
        }
        
        // Transform circle center
        const [tx, ty] = this.transformPoint(x, y);
        
        const instanceIndex = batch.currentInstances;
        
        // Add instance data: x, y, radius, rotation, r, g, b, a
        batch.instanceData[instanceIndex * 8 + 0] = tx;
        batch.instanceData[instanceIndex * 8 + 1] = ty;
        batch.instanceData[instanceIndex * 8 + 2] = radius;
        batch.instanceData[instanceIndex * 8 + 3] = 0; // rotation
        batch.instanceData[instanceIndex * 8 + 4] = color[0];
        batch.instanceData[instanceIndex * 8 + 5] = color[1];
        batch.instanceData[instanceIndex * 8 + 6] = color[2];
        batch.instanceData[instanceIndex * 8 + 7] = color[3];
        
        batch.currentInstances++;
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
        
        // Add vertices
        batch.vertexData[vertexIndex * 2 + 0] = tx1;
        batch.vertexData[vertexIndex * 2 + 1] = ty1;
        batch.vertexData[vertexIndex * 2 + 2] = tx2;
        batch.vertexData[vertexIndex * 2 + 3] = ty2;
        
        // Add colors
        for (let i = 0; i < 2; i++) {
            batch.colorData[(vertexIndex + i) * 4 + 0] = color[0];
            batch.colorData[(vertexIndex + i) * 4 + 1] = color[1];
            batch.colorData[(vertexIndex + i) * 4 + 2] = color[2];
            batch.colorData[(vertexIndex + i) * 4 + 3] = color[3];
        }
        
        batch.currentVertices += 2;
    }
    
    /*
        * Translate the canvas
        * Applies a translation transformation to the current state
        * @param {number} x - X translation
        * @param {number} y - Y translation
    */
    translate(x, y) {
        const translateMatrix = [
            1, 0, 0,
            0, 1, 0,
            x, y, 1
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
        * Add a custom shader program
        * Allows users to define their own shaders for advanced effects
        * @param {string} name - Name of the shader
        * @param {string} vertexShaderSource - GLSL source code for the vertex shader
        * @param {string} fragmentShaderSource - GLSL source code for the fragment shader
    */  
    addShader(name, vertexShaderSource, fragmentShaderSource) {
        this.shaders[name] = this.createShaderProgram(vertexShaderSource, fragmentShaderSource);
    }
    
    /*
        * Use a custom shader program
        * Sets the current shader program to the specified one
        * @param {string} name - Name of the shader to use
        * @return {WebGLProgram} - The shader program being used
    */
    useShader(name) {
        if (this.shaders[name]) {
            this.gl.useProgram(this.shaders[name]);
            return this.shaders[name];
        }
        throw new Error(`Shader "${name}" not found`);
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
            document.exitFullscreen().catch(() => {});
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