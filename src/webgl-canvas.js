/**
 * WebGLCanvas - A WebGL-powered canvas with HTML5 Canvas-like API
 * Easy to use, GPU-accelerated 2D graphics library
 */
class WebGLCanvas {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;
        
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
    }
    
    init() {
        const gl = this.gl;
        gl.clearColor(0, 0, 0, 0); // Transparent background
    }
    
    // Utility function to create identity matrix
    createIdentityMatrix() {
        return [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ];
    }
    
    // Matrix multiplication
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
    
    // Create shader program
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
      // Create built-in shaders
    createBuiltInShaders() {
        // Basic vertex shader
        const basicVertexShader = `
            precision mediump float;
            attribute vec2 a_position;
            uniform mat3 u_transform;
            uniform vec2 u_resolution;
            
            void main() {
                vec3 transformed = u_transform * vec3(a_position, 1.0);
                vec2 normalized = ((transformed.xy / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
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
        
        this.shaders.basic = this.createShaderProgram(basicVertexShader, basicFragmentShader);
        this.shaders.circle = this.createShaderProgram(basicVertexShader, circleFragmentShader);
    }
    
    // Canvas-like API methods
    
    // Clear the canvas
    clear() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
    
    // Set fill style (color)
    set fillStyle(color) {
        this.state.fillStyle = this.parseColor(color);
    }
    
    get fillStyle() {
        return this.state.fillStyle;
    }
    
    // Set stroke style (color)
    set strokeStyle(color) {
        this.state.strokeStyle = this.parseColor(color);
    }
    
    get strokeStyle() {
        return this.state.strokeStyle;
    }
    
    // Set line width
    set lineWidth(width) {
        this.state.lineWidth = width;
    }
    
    get lineWidth() {
        return this.state.lineWidth;
    }
    
    // Parse color string to RGBA array
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
    
    // Save current state
    save() {
        this.stateStack.push({
            fillStyle: [...this.state.fillStyle],
            strokeStyle: [...this.state.strokeStyle],
            lineWidth: this.state.lineWidth,
            transform: [...this.state.transform]
        });
    }
    
    // Restore previous state
    restore() {
        if (this.stateStack.length > 0) {
            this.state = this.stateStack.pop();
        }
    }
    
    // Drawing methods
    
    // Fill rectangle
    fillRect(x, y, width, height) {
        this.drawRect(x, y, width, height, true);
    }
    
    // Stroke rectangle
    strokeRect(x, y, width, height) {
        this.drawRect(x, y, width, height, false);
    }
    
    // Internal rectangle drawing
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
    
    // Fill circle
    fillCircle(x, y, radius) {
        this.drawCircle(x, y, radius, true);
    }
    
    // Stroke circle
    strokeCircle(x, y, radius) {
        this.drawCircle(x, y, radius, false);
    }
    
    // Internal circle drawing
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
    
    // Draw line
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
    }
    
    // Transform methods
    translate(x, y) {
        const translateMatrix = [
            1, 0, x,
            0, 1, y,
            0, 0, 1
        ];
        this.state.transform = this.multiplyMatrix(this.state.transform, translateMatrix);
    }
    
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
    
    scale(x, y = x) {
        const scaleMatrix = [
            x, 0, 0,
            0, y, 0,
            0, 0, 1
        ];
        this.state.transform = this.multiplyMatrix(this.state.transform, scaleMatrix);
    }
    
    // Custom shader support
    addShader(name, vertexShaderSource, fragmentShaderSource) {
        this.shaders[name] = this.createShaderProgram(vertexShaderSource, fragmentShaderSource);
    }
    
    useShader(name) {
        if (this.shaders[name]) {
            this.gl.useProgram(this.shaders[name]);
            return this.shaders[name];
        }
        throw new Error(`Shader "${name}" not found`);
    }
    
    // Utility method to resize canvas
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;
        this.gl.viewport(0, 0, width, height);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebGLCanvas;
} else if (typeof window !== 'undefined') {
    window.WebGLCanvas = WebGLCanvas;
}
