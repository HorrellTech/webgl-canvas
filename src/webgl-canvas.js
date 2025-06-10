/**
 * WebGLCanvas - A WebGL-powered canvas with HTML5 Canvas-like API
 * Easy to use, GPU-accelerated 2D graphics library
 */
class WebGLCanvas {    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;
        this.options = {
            enableFullscreen: options.enableFullscreen || false,
            ...options
        };
        
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
        
        // Initialize WebGL
        this.init();
        
        // Create built-in shaders
        this.shaders = {};
        this.createBuiltInShaders();
        
        // Vertex buffer for shapes
        this.vertexBuffer = this.gl.createBuffer();
        this.indexBuffer = this.gl.createBuffer();
        
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
        * Create built-in shaders for common effects
        * These shaders can be used for basic shapes and effects
        * Includes basic vertex shader and fragment shaders for solid colors and circles
    */
    createBuiltInShaders() {        // Basic vertex shader
        const basicVertexShader = `
            precision mediump float;
            attribute vec2 a_position;
            uniform mat3 u_transform;
            uniform vec2 u_resolution;
            
            void main() {
                // Apply transform matrix
                vec3 transformed = u_transform * vec3(a_position, 1.0);
                
                // Convert to normalized device coordinates (-1 to 1)
                vec2 normalized = (transformed.xy / u_resolution) * 2.0 - 1.0;
                
                // Flip Y coordinate to match Canvas coordinate system
                normalized.y = -normalized.y;
                
                gl_Position = vec4(normalized, 0, 1);
            }
        `;
        
        // Basic fragment shader for solid colors
        const basicFragmentShader = `
            precision mediump float;
            uniform vec4 u_color;
            
            void main() {
                gl_FragColor = u_color;
            }
        `;
        
        // Circle fragment shader
        const circleFragmentShader = `
            precision mediump float;
            uniform vec4 u_color;
            uniform vec2 u_center;
            uniform float u_radius;
            uniform vec2 u_resolution;
            
            void main() {
                vec2 coord = gl_FragCoord.xy;
                coord.y = u_resolution.y - coord.y; // Flip Y coordinate
                float dist = distance(coord, u_center);
                if (dist > u_radius) {
                    discard;
                }
                gl_FragColor = u_color;
            }
        `;
          // Texture vertex shader
        const textureVertexShader = `
            precision mediump float;
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            uniform mat3 u_transform;
            uniform vec2 u_resolution;
            varying vec2 v_texCoord;
            
            void main() {
                // Apply transform matrix
                vec3 transformed = u_transform * vec3(a_position, 1.0);
                
                // Convert to normalized device coordinates (-1 to 1)
                vec2 normalized = (transformed.xy / u_resolution) * 2.0 - 1.0;
                
                // Flip Y coordinate to match Canvas coordinate system
                normalized.y = -normalized.y;
                
                gl_Position = vec4(normalized, 0, 1);
                v_texCoord = a_texCoord;
            }
        `;
        
        // Texture fragment shader
        const textureFragmentShader = `
            precision mediump float;
            uniform sampler2D u_texture;
            uniform vec4 u_tint;
            varying vec2 v_texCoord;
            
            void main() {
                vec4 texColor = texture2D(u_texture, v_texCoord);
                gl_FragColor = texColor * u_tint;
            }
        `;
        
        this.shaders.basic = this.createShaderProgram(basicVertexShader, basicFragmentShader);
        this.shaders.circle = this.createShaderProgram(basicVertexShader, circleFragmentShader);
        this.shaders.texture = this.createShaderProgram(textureVertexShader, textureFragmentShader);
        
        // Create texture coordinate buffer
        this.texCoordBuffer = this.gl.createBuffer();
    }
    
    // Canvas-like API methods
    
    /*
        * Clear the canvas
        * Sets the clear color to transparent and clears the color buffer
    */ 
    clear() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
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
            if (values.length >= 3) {
                const r = parseFloat(values[0]) / 255;
                const g = parseFloat(values[1]) / 255;
                const b = parseFloat(values[2]) / 255;
                const a = values.length > 3 ? parseFloat(values[3]) : 1;
                return [r, g, b, a];
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
    
    // Drawing methods
    
    /*
        * Fill rectangle
        * @param {number} x - X coordinate of the rectangle
        * @param {number} y - Y coordinate of the rectangle
        * @param {number} width - Width of the rectangle    
        * @param {number} height - Height of the rectangle
    */
    fillRect(x, y, width, height) {
        this.drawRect(x, y, width, height, true);
    }
    
    /*
        * Stroke rectangle
        * @param {number} x - X coordinate of the rectangle
        * @param {number} y - Y coordinate of the rectangle
        * @param {number} width - Width of the rectangle    
        * @param {number} height - Height of the rectangle
    */
    strokeRect(x, y, width, height) {
        this.drawRect(x, y, width, height, false);
    }
    
    /*
        * Internal rectangle drawing method
        * Draws a rectangle using the current fillStyle or strokeStyle
        * @param {number} x - X coordinate of the rectangle
        * @param {number} y - Y coordinate of the rectangle
        * @param {number} width - Width of the rectangle
        * @param {number} height - Height of the rectangle
        * @param {boolean} fill - Whether to fill (true) or stroke (false) the rectangle
    */
    drawRect(x, y, width, height, fill = true) {
        const gl = this.gl;
        const program = this.shaders.basic;
        
        gl.useProgram(program);
        
        // Create rectangle vertices
        const vertices = new Float32Array([
            x, y,
            x + width, y,
            x, y + height,
            x + width, y + height
        ]);
        
        const indices = fill ? 
            new Uint16Array([0, 1, 2, 1, 2, 3]) : // Filled triangle pairs
            new Uint16Array([0, 1, 1, 3, 3, 2, 2, 0]); // Outline
        
        // Set up buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        
        // Set up attributes and uniforms
        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        
        const transformLoc = gl.getUniformLocation(program, 'u_transform');
        gl.uniformMatrix3fv(transformLoc, false, this.state.transform);
        
        const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
        gl.uniform2f(resolutionLoc, this.width, this.height);
        
        const colorLoc = gl.getUniformLocation(program, 'u_color');
        const color = fill ? this.state.fillStyle : this.state.strokeStyle;
        gl.uniform4fv(colorLoc, color);
        
        // Draw
        if (fill) {
            gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        } else {
            gl.lineWidth(this.state.lineWidth);
            gl.drawElements(gl.LINES, indices.length, gl.UNSIGNED_SHORT, 0);
        }
    }
    
    /*
        * Fill circle
        * @param {number} x - X coordinate of the circle center
        * @param {number} y - Y coordinate of the circle center
        * @param {number} radius - Radius of the circle
    */
    fillCircle(x, y, radius) {
        this.drawCircle(x, y, radius, true);
    }
    
    /*
        * Stroke circle
        * @param {number} x - X coordinate of the circle center
        * @param {number} y - Y coordinate of the circle center
        * @param {number} radius - Radius of the circle
    */
    strokeCircle(x, y, radius) {
        this.drawCircle(x, y, radius, false);
    }
    
    /*
        * Internal circle drawing method
        * Draws a circle using the current fillStyle or strokeStyle
        * @param {number} x - X coordinate of the circle center
        * @param {number} y - Y coordinate of the circle center
        * @param {number} radius - Radius of the circle
        * @param {boolean} fill - Whether to fill (true) or stroke (false) the circle
    */
    drawCircle(x, y, radius, fill = true) {
        const gl = this.gl;
        const program = this.shaders.circle;
        
        gl.useProgram(program);
        
        // Create a quad that covers the circle
        const vertices = new Float32Array([
            x - radius, y - radius,
            x + radius, y - radius,
            x - radius, y + radius,
            x + radius, y + radius
        ]);
        
        const indices = new Uint16Array([0, 1, 2, 1, 2, 3]);
        
        // Set up buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        
        // Set up attributes and uniforms
        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        
        const transformLoc = gl.getUniformLocation(program, 'u_transform');
        gl.uniformMatrix3fv(transformLoc, false, this.state.transform);
        
        const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
        gl.uniform2f(resolutionLoc, this.width, this.height);
        
        const centerLoc = gl.getUniformLocation(program, 'u_center');
        gl.uniform2f(centerLoc, x, y);
        
        const radiusLoc = gl.getUniformLocation(program, 'u_radius');
        gl.uniform1f(radiusLoc, radius);
        
        const colorLoc = gl.getUniformLocation(program, 'u_color');
        const color = fill ? this.state.fillStyle : this.state.strokeStyle;
        gl.uniform4fv(colorLoc, color);
        
        // Draw
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    }
    
    /*
        * Draw a line between two points
        * @param {number} x1 - X coordinate of the first point
        * @param {number} y1 - Y coordinate of the first point
        * @param {number} x2 - X coordinate of the second point
        * @param {number} y2 - Y coordinate of the second point
    */
    drawLine(x1, y1, x2, y2) {
        const gl = this.gl;
        const program = this.shaders.basic;
        
        gl.useProgram(program);
        
        const vertices = new Float32Array([x1, y1, x2, y2]);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        
        const transformLoc = gl.getUniformLocation(program, 'u_transform');
        gl.uniformMatrix3fv(transformLoc, false, this.state.transform);
        
        const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
        gl.uniform2f(resolutionLoc, this.width, this.height);
        
        const colorLoc = gl.getUniformLocation(program, 'u_color');
        gl.uniform4fv(colorLoc, this.state.strokeStyle);
        
        gl.lineWidth(this.state.lineWidth);
        gl.drawArrays(gl.LINES, 0, 2);
    }    /*
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
        * @param {number}  
        * angle - Rotation angle in radians
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
    
    // Image/Texture support
    
    // Load and create texture from image
    loadTexture(image) {
        const gl = this.gl;
        const texture = gl.createTexture();
        
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        
        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        return texture;
    }
    
    // Load image from URL and return promise
    loadImage(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                const texture = this.loadTexture(image);
                resolve({ image, texture, width: image.width, height: image.height });
            };
            image.onerror = reject;
            image.crossOrigin = 'anonymous'; // Enable CORS
            image.src = url;
        });
    }
    
    // Draw image/texture
    drawImage(texture, sx = 0, sy = 0, sw = null, sh = null, dx = 0, dy = 0, dw = null, dh = null) {
        const gl = this.gl;
        const program = this.shaders.texture;
        
        gl.useProgram(program);
        
        // Handle different parameter combinations like Canvas drawImage
        let sourceX = sx, sourceY = sy, sourceWidth = sw, sourceHeight = sh;
        let destX = dx, destY = dy, destWidth = dw, destHeight = dh;
        
        if (arguments.length === 4) {
            // drawImage(texture, dx, dy, dw, dh)
            destX = sx;
            destY = sy;
            destWidth = sw;
            destHeight = sh;
            sourceX = 0;
            sourceY = 0;
            sourceWidth = texture.width || 1;
            sourceHeight = texture.height || 1;
        } else if (arguments.length === 3) {
            // drawImage(texture, dx, dy)
            destX = sx;
            destY = sy;
            destWidth = texture.width || 1;
            destHeight = texture.height || 1;
            sourceX = 0;
            sourceY = 0;
            sourceWidth = texture.width || 1;
            sourceHeight = texture.height || 1;
        }
        
        // Create vertices for the destination rectangle
        const vertices = new Float32Array([
            destX, destY,
            destX + destWidth, destY,
            destX, destY + destHeight,
            destX + destWidth, destY + destHeight
        ]);
        
        // Create texture coordinates (mapping source rectangle to destination)
        const texCoords = new Float32Array([
            sourceX / (texture.width || 1), sourceY / (texture.height || 1),
            (sourceX + sourceWidth) / (texture.width || 1), sourceY / (texture.height || 1),
            sourceX / (texture.width || 1), (sourceY + sourceHeight) / (texture.height || 1),
            (sourceX + sourceWidth) / (texture.width || 1), (sourceY + sourceHeight) / (texture.height || 1)
        ]);
        
        const indices = new Uint16Array([0, 1, 2, 1, 2, 3]);
        
        // Set up vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        
        // Set up texture coordinate buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        
        const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
        gl.enableVertexAttribArray(texCoordLoc);
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
        
        // Set up index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        
        // Set uniforms
        const transformLoc = gl.getUniformLocation(program, 'u_transform');
        gl.uniformMatrix3fv(transformLoc, false, this.state.transform);
        
        const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
        gl.uniform2f(resolutionLoc, this.width, this.height);
        
        const tintLoc = gl.getUniformLocation(program, 'u_tint');
        gl.uniform4f(tintLoc, 1, 1, 1, 1); // White tint (no change)
        
        // Bind texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture.texture || texture);
        
        const textureLoc = gl.getUniformLocation(program, 'u_texture');
        gl.uniform1i(textureLoc, 0);
          // Draw
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    }
    
    // Fullscreen functionality
    setupFullscreen() {
        // Create fullscreen button
        this.createFullscreenButton();
        
        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());        // Listen for escape key when canvas is focused
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
    }    createFullscreenButton() {
        // Create a wrapper around the canvas if it doesn't exist
        let wrapper = this.canvas.parentElement;
        const needsWrapper = !wrapper || !wrapper.classList.contains('webgl-canvas-wrapper');
        
        if (needsWrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'webgl-canvas-wrapper';            wrapper.style.cssText = `
                position: relative;
                display: inline-block;
                width: ${this.canvas.offsetWidth || this.canvas.width}px;
                height: ${this.canvas.offsetHeight || this.canvas.height}px;
                margin: 0;
                padding: 0;
            `;
            
            // Insert wrapper and move canvas into it
            this.canvas.parentNode.insertBefore(wrapper, this.canvas);
            wrapper.appendChild(this.canvas);
        }
        
        // Create the button
        this.fullscreenButton = document.createElement('button');
        this.fullscreenButton.className = 'webgl-fullscreen-btn';        this.fullscreenButton.style.cssText = `
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
    }enterFullscreen() {
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
        
        // Store original canvas dimensions
        this.originalDimensions = {
            width: this.canvas.width,
            height: this.canvas.height,
            cssWidth: this.canvas.style.width,
            cssHeight: this.canvas.style.height
        };
        
        // Apply fullscreen styles
        this.canvas.style.cssText += `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 9999 !important;
            margin: 0 !important;
            border-radius: 0 !important;
        `;
        
        // Update canvas dimensions
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // Update WebGL viewport
        this.gl.viewport(0, 0, this.width, this.height);
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
            this.wrapper.style.width = `${this.canvas.offsetWidth || this.canvas.width}px`;
            this.wrapper.style.height = `${this.canvas.offsetHeight || this.canvas.height}px`;
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
     */    cleanup() {
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
            if (this.vertexBuffer) this.gl.deleteBuffer(this.vertexBuffer);
            if (this.indexBuffer) this.gl.deleteBuffer(this.indexBuffer);
            
            // Clean up shaders
            Object.values(this.shaders).forEach(shader => {
                if (shader.program) this.gl.deleteProgram(shader.program);
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
