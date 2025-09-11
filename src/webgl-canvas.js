/**
 * WebGLCanvas - A WebGL-powered canvas with HTML5 Canvas-like API
 * Easy to use, GPU-accelerated 2D graphics library with optimized batching
 */
class WebGLCanvas {
    constructor(canvas, options = {}, useWebGL = true) {
        this.canvas = canvas;
        this.useWebGL = useWebGL;

        // Handle pixel scaling options
        this.options = {
            enableFullscreen: options.enableFullscreen || false,
            pixelWidth: options.pixelWidth || canvas.width,
            pixelHeight: options.pixelHeight || canvas.height,
            pixelScale: options.pixelScale || 1,
            batchSize: Math.min(options.batchSize || 8000, 8000), // Max objects per batch
            ...options
        };

        // Set up pixel scaling
        this.setupPixelScaling();

        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Context lost state
        this.contextLost = false;
        this.contextRestoreCallbacks = [];

        // Context stability tracking
        this.contextLossCount = 0;
        this.timers = new Set();

        if (!this.useWebGL) {
            // 2D context
            this.ctx = canvas.getContext('2d');
            if (!this.ctx) {
                throw new Error('2D context not supported');
            }
        } else {
            // WebGL context with better stability settings
            this.gl = canvas.getContext('webgl', {
                preserveDrawingBuffer: true,
                antialias: true,
                alpha: true,
                premultipliedAlpha: true,
                failIfMajorPerformanceCaveat: false,
                powerPreference: 'default'
            }) || canvas.getContext('experimental-webgl', {
                preserveDrawingBuffer: true,
                antialias: false,
                alpha: true,
                premultipliedAlpha: true,
                failIfMajorPerformanceCaveat: false,
                powerPreference: 'default'
            });

            if (!this.gl) {
                throw new Error('WebGL not supported');
            }

            // Set up context loss handlers immediately
            this.setupContextLossHandling();
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
            transform: this.createIdentityMatrix(),

            // Image color properties
            imageHue: 0,            // -180 to 180 degrees
            imageSaturation: 1,     // 0 to 2+ (1 = normal)
            imageLightness: 0,      // -1 to 1 (0 = normal)
            imageBrightness: 0,     // -1 to 1 (0 = normal)
            imageContrast: 1,       // 0 to 2+ (1 = normal)
            imageOpacity: 1,        // 0 to 1 (1 = opaque)
            imageColorTint: [0, 0, 0, 0], // RGBA tint color
            imageColorMode: 0,      // 0=normal, 1=grayscale, 2=sepia, 3=invert, 4=blackwhite
            imageColorMultiply: [1, 1, 1, 1], // RGBA multiply
            imageColorAdd: [0, 0, 0, 0],      // RGBA add
            imageGamma: 1,          // 0.1 to 3 (1 = normal)
            imageExposure: 0        // -3 to 3 (0 = normal)
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
            rectangles: new Map(),
            circles: new Map(),
            ellipses: new Map(),
            lines: new Map(),
            images: new Map(),
            text: new Map()
        };
        this.batchBuffers = {};

        // Texture cache for images
        this.textureCache = new Map();
        this.fontCache = new Map();

        this.currentImageBatch = null;
        this.imageBatchTexture = null;

        if (this.useWebGL) {
            // Initialize WebGL
            this.init();

            // Create built-in shaders
            this.shaders = {};
            this.createBuiltInShaders();

            // Create post-processing system
            this.postProcessing = {
                enabled: false,
                effects: [],
                framebuffers: [],
                currentEffect: 0,
                tempTextures: []
            };
            this.createPostProcessingSystem();

            // Create batch buffers
            this.createBatchBuffers();

            // Create optimized image batch system
            this.createImageBatchSystem();

            // Set initial viewport
            this.gl.viewport(0, 0, this.width, this.height);
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        }

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
            maxQuads: batchSize,
            maxVertices: batchSize * 4,
            maxIndices: batchSize * 6,
            currentQuads: 0,
            currentVertices: 0,
            currentIndices: 0,
            vertexData: new Float32Array(batchSize * 4 * 2),
            texCoordData: new Float32Array(batchSize * 4 * 2),
            indexData: new Uint16Array(batchSize * 6),
            currentTexture: null
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

        // Log any warnings or info even if linking succeeds
        const log = gl.getProgramInfoLog(program);
        if (log) {
            // console.warn('Shader program link log:', log);
        }

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

        // Always check compilation status and log errors
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            const shaderType = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
            // console.error(`${shaderType} shader compilation error:`, error);
            // console.error('Shader source:', source);
            gl.deleteShader(shader);
            throw new Error(`${shaderType} shader compilation error: ${error}`);
        }

        // Log warnings even if compilation succeeds
        const log = gl.getShaderInfoLog(shader);
        if (log && log.trim()) {
            const shaderType = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
            // console.warn(`${shaderType} shader compile log:`, log);
        }

        return shader;
    }

    /*
     * Create post-processing system with framebuffers and built-in effects
     */
    createPostProcessingSystem() {
        this.createPostProcessingFramebuffers();
        this.createPostProcessingShaders();
        this.createFullscreenQuad();
    }

    /*
     * Create framebuffers for post-processing pipeline
     */
    createPostProcessingFramebuffers() {
        const gl = this.gl;

        // Create two framebuffers for ping-ponging between effects
        for (let i = 0; i < 2; i++) {
            const framebuffer = gl.createFramebuffer();
            const texture = gl.createTexture();

            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

            if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
                // console.error('Framebuffer is not complete');
            }

            this.postProcessing.framebuffers.push(framebuffer);
            this.postProcessing.tempTextures.push(texture);
        }

        // Unbind framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /*
     * Create fullscreen quad for post-processing
     */
    createFullscreenQuad() {
        const gl = this.gl;

        // Create vertex buffer for fullscreen quad
        const vertices = new Float32Array([
            -1, -1, 0, 0,  // Bottom-left
            1, -1, 1, 0,  // Bottom-right
            -1, 1, 0, 1,  // Top-left
            1, 1, 1, 1   // Top-right
        ]);

        this.postProcessing.quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.postProcessing.quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // Create index buffer
        const indices = new Uint16Array([0, 1, 2, 1, 2, 3]);
        this.postProcessing.quadIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.postProcessing.quadIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    }

    /*
     * Create built-in post-processing shaders
     */
    createPostProcessingShaders() {
        // Base vertex shader for all post-processing effects
        const postVertexShader = `
        precision mediump float;
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `;

        // Pass-through fragment shader (no effect)
        const passthroughFragmentShader = `
        precision mediump float;
        uniform sampler2D u_texture;
        varying vec2 v_texCoord;
        
        void main() {
            gl_FragColor = texture2D(u_texture, v_texCoord);
        }
    `;

        // Improved Gaussian blur fragment shader
        const blurFragmentShader = `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform vec2 u_resolution;
        uniform vec2 u_direction;
        uniform float u_blurRadius;
        varying vec2 v_texCoord;
        
        void main() {
            vec2 texelSize = 1.0 / u_resolution;
            vec4 color = vec4(0.0);
            
            // 5-tap blur for better performance
            float weights[5];
            weights[0] = 0.227027;
            weights[1] = 0.1945946;
            weights[2] = 0.1216216;
            weights[3] = 0.054054;
            weights[4] = 0.016216;
            
            // Sample center
            color += texture2D(u_texture, v_texCoord) * weights[0];
            
            // Sample in both directions
            for(int i = 1; i < 5; i++) {
                vec2 offset = u_direction * texelSize * float(i) * u_blurRadius;
                color += texture2D(u_texture, v_texCoord + offset) * weights[i];
                color += texture2D(u_texture, v_texCoord - offset) * weights[i];
            }
            
            gl_FragColor = color;
        }
    `;

        // Fixed bloom extract shader with better threshold handling
        const bloomExtractFragmentShader = `
    precision mediump float;
    uniform sampler2D u_texture;
    uniform float u_bloomThreshold;
    varying vec2 v_texCoord;
    
    void main() {
        vec4 color = texture2D(u_texture, v_texCoord);
        float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
        
        // Only output bright areas above threshold
        if(brightness > u_bloomThreshold) {
            // Scale the color by how much it exceeds the threshold
            float excess = brightness - u_bloomThreshold;
            gl_FragColor = vec4(color.rgb * excess / brightness, color.a);
        } else {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        }
    }
`;

        // Fixed bloom combine shader
        const bloomCombineFragmentShader = `
    precision mediump float;
    uniform sampler2D u_texture;
    uniform sampler2D u_bloomTexture;
    uniform float u_bloomStrength;
    varying vec2 v_texCoord;
    
    void main() {
        vec3 original = texture2D(u_texture, v_texCoord).rgb;
        vec3 bloom = texture2D(u_bloomTexture, v_texCoord).rgb;
        
        // Add bloom to original with strength multiplier
        vec3 result = original + bloom * u_bloomStrength;
        gl_FragColor = vec4(result, 1.0);
    }
`;

        // FXAA antialiasing fragment shader (simplified)
        const fxaaFragmentShader = `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform vec2 u_resolution;
        varying vec2 v_texCoord;
        
        void main() {
            vec2 texelSize = 1.0 / u_resolution;
            
            vec3 rgbNW = texture2D(u_texture, v_texCoord + vec2(-1.0, -1.0) * texelSize).rgb;
            vec3 rgbNE = texture2D(u_texture, v_texCoord + vec2(1.0, -1.0) * texelSize).rgb;
            vec3 rgbSW = texture2D(u_texture, v_texCoord + vec2(-1.0, 1.0) * texelSize).rgb;
            vec3 rgbSE = texture2D(u_texture, v_texCoord + vec2(1.0, 1.0) * texelSize).rgb;
            vec3 rgbM  = texture2D(u_texture, v_texCoord).rgb;
            
            vec3 luma = vec3(0.299, 0.587, 0.114);
            float lumaNW = dot(rgbNW, luma);
            float lumaNE = dot(rgbNE, luma);
            float lumaSW = dot(rgbSW, luma);
            float lumaSE = dot(rgbSE, luma);
            float lumaM  = dot(rgbM,  luma);
            
            float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
            float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));
            
            if(lumaMax - lumaMin < 0.1) {
                gl_FragColor = vec4(rgbM, 1.0);
                return;
            }
            
            vec2 dir = vec2(
                -((lumaNW + lumaNE) - (lumaSW + lumaSE)),
                ((lumaNW + lumaSW) - (lumaNE + lumaSE))
            );
            
            float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * 0.03125, 0.0078125);
            float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
            dir = min(vec2(8.0), max(vec2(-8.0), dir * rcpDirMin)) * texelSize;
            
            vec3 rgbA = 0.5 * (
                texture2D(u_texture, v_texCoord + dir * -0.166667).rgb +
                texture2D(u_texture, v_texCoord + dir * 0.166667).rgb);
            vec3 rgbB = rgbA * 0.5 + 0.25 * (
                texture2D(u_texture, v_texCoord + dir * -0.5).rgb +
                texture2D(u_texture, v_texCoord + dir * 0.5).rgb);
            
            float lumaB = dot(rgbB, luma);
            
            if((lumaB < lumaMin) || (lumaB > lumaMax)) {
                gl_FragColor = vec4(rgbA, 1.0);
            } else {
                gl_FragColor = vec4(rgbB, 1.0);
            }
        }
    `;

        // Chromatic aberration fragment shader
        const chromaticAberrationFragmentShader = `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform float u_aberrationStrength;
        varying vec2 v_texCoord;
        
        void main() {
            vec2 center = vec2(0.5);
            vec2 offset = (v_texCoord - center) * u_aberrationStrength;
            
            float r = texture2D(u_texture, v_texCoord - offset).r;
            float g = texture2D(u_texture, v_texCoord).g;
            float b = texture2D(u_texture, v_texCoord + offset).b;
            float a = texture2D(u_texture, v_texCoord).a;
            
            gl_FragColor = vec4(r, g, b, a);
        }
    `;

        // Vignette fragment shader
        const vignetteFragmentShader = `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform float u_vignetteStrength;
        uniform float u_vignetteRadius;
        varying vec2 v_texCoord;
        
        void main() {
            vec3 color = texture2D(u_texture, v_texCoord).rgb;
            
            vec2 center = vec2(0.5);
            float dist = distance(v_texCoord, center);
            float vignette = smoothstep(u_vignetteRadius, u_vignetteRadius - 0.3, dist);
            vignette = mix(1.0 - u_vignetteStrength, 1.0, vignette);
            
            gl_FragColor = vec4(color * vignette, texture2D(u_texture, v_texCoord).a);
        }
    `;

        // Color grading fragment shader
        const colorGradingFragmentShader = `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform float u_brightness;
        uniform float u_contrast;
        uniform float u_saturation;
        uniform float u_hue;
        varying vec2 v_texCoord;
        
        void main() {
            vec3 color = texture2D(u_texture, v_texCoord).rgb;
            
            // Brightness
            color += u_brightness;
            
            // Contrast
            color = (color - 0.5) * u_contrast + 0.5;
            
            // Simple saturation adjustment
            float gray = dot(color, vec3(0.299, 0.587, 0.114));
            color = mix(vec3(gray), color, u_saturation);
            
            gl_FragColor = vec4(clamp(color, 0.0, 1.0), texture2D(u_texture, v_texCoord).a);
        }
    `;

        // Pixelate fragment shader
        const pixelateFragmentShader = `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform vec2 u_resolution;
        uniform float u_pixelSize;
        varying vec2 v_texCoord;
        
        void main() {
            vec2 pixelatedUV = floor(v_texCoord * u_resolution / u_pixelSize) * u_pixelSize / u_resolution;
            gl_FragColor = texture2D(u_texture, pixelatedUV);
        }
    `;

        // Create shader programs
        this.shaders.postPassthrough = this.createShaderProgram(postVertexShader, passthroughFragmentShader);
        this.shaders.postBlur = this.createShaderProgram(postVertexShader, blurFragmentShader);
        this.shaders.postBloomExtract = this.createShaderProgram(postVertexShader, bloomExtractFragmentShader);
        this.shaders.postBloomCombine = this.createShaderProgram(postVertexShader, bloomCombineFragmentShader);
        this.shaders.postFXAA = this.createShaderProgram(postVertexShader, fxaaFragmentShader);
        this.shaders.postChromaticAberration = this.createShaderProgram(postVertexShader, chromaticAberrationFragmentShader);
        this.shaders.postVignette = this.createShaderProgram(postVertexShader, vignetteFragmentShader);
        this.shaders.postColorGrading = this.createShaderProgram(postVertexShader, colorGradingFragmentShader);
        this.shaders.postPixelate = this.createShaderProgram(postVertexShader, pixelateFragmentShader);
    }

    /*
     * Enable post-processing
     */
    enablePostProcessing() {
        this.postProcessing.enabled = true;
    }

    /*
     * Disable post-processing
     */
    disablePostProcessing() {
        this.postProcessing.enabled = false;
    }

    /*
     * Add a post-processing effect to the pipeline
     */
    addPostEffect(effectName, parameters = {}) {
        const effect = {
            name: effectName,
            parameters: { ...parameters }
        };

        // Set default parameters for each effect
        switch (effectName) {
            case 'blur':
                effect.parameters = {
                    radius: 2.0,
                    ...parameters
                };
                break;
            case 'bloom':
                effect.parameters = {
                    strength: 0.5,
                    threshold: 0.7,
                    ...parameters
                };
                break;
            case 'chromaticAberration':
                effect.parameters = {
                    strength: 0.01,
                    ...parameters
                };
                break;
            case 'vignette':
                effect.parameters = {
                    strength: 0.5,
                    radius: 0.8,
                    ...parameters
                };
                break;
            case 'colorGrading':
                effect.parameters = {
                    brightness: 0.0,
                    contrast: 1.0,
                    saturation: 1.0,
                    hue: 0.0,
                    ...parameters
                };
                break;
            case 'pixelate':
                effect.parameters = {
                    pixelSize: 4.0,
                    ...parameters
                };
                break;
        }

        this.postProcessing.effects.push(effect);
        this.enablePostProcessing();
    }

    /*
     * Clear all post-processing effects
     */
    clearPostEffects() {
        this.postProcessing.effects = [];
        this.disablePostProcessing();
    }

    /*
     * Update parameters for a specific post-processing effect
     */
    updatePostEffect(effectName, parameters) {
        const effect = this.postProcessing.effects.find(e => e.name === effectName);
        if (effect) {
            Object.assign(effect.parameters, parameters);
        }
    }

    /*
     * Remove a specific post-processing effect
     */
    removePostEffect(effectName) {
        this.postProcessing.effects = this.postProcessing.effects.filter(e => e.name !== effectName);
        if (this.postProcessing.effects.length === 0) {
            this.disablePostProcessing();
        }
    }

    /*
     * Render post-processing effects
     */
    renderPostProcessing() {
        if (!this.postProcessing.enabled || this.postProcessing.effects.length === 0) {
            return;
        }

        const gl = this.gl;

        // For bloom, we need special handling with multiple passes
        const hasBloom = this.postProcessing.effects.some(e =>
            e.name === 'bloomExtract' || e.name === 'bloomCombine'
        );

        if (hasBloom) {
            this.renderBloomEffect();
            return;
        }

        // Original post-processing for non-bloom effects
        let inputTexture = this.postProcessing.tempTextures[0];
        let sourceFramebuffer = 0;
        let targetFramebuffer = 1;

        for (let i = 0; i < this.postProcessing.effects.length; i++) {
            const effect = this.postProcessing.effects[i];
            const isLastEffect = i === this.postProcessing.effects.length - 1;

            if (isLastEffect) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            } else {
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.postProcessing.framebuffers[targetFramebuffer]);
            }

            gl.viewport(0, 0, this.width, this.height);
            gl.clear(gl.COLOR_BUFFER_BIT);

            this.renderPostEffect(effect, inputTexture);

            if (!isLastEffect) {
                inputTexture = this.postProcessing.tempTextures[targetFramebuffer];
                const temp = sourceFramebuffer;
                sourceFramebuffer = targetFramebuffer;
                targetFramebuffer = temp;
            }
        }
    }

    /*
    * Specialized bloom rendering with proper multi-pass setup
    */
    renderBloomEffect() {
        const gl = this.gl;

        // Get bloom parameters
        const extractEffect = this.postProcessing.effects.find(e => e.name === 'bloomExtract');
        const blurEffect = this.postProcessing.effects.find(e => e.name === 'blur');
        const combineEffect = this.postProcessing.effects.find(e => e.name === 'bloomCombine');

        const threshold = extractEffect ? extractEffect.parameters.threshold : 0.5;
        const blurRadius = blurEffect ? blurEffect.parameters.radius : 2.0;
        const strength = combineEffect ? combineEffect.parameters.strength : 1.0;

        // Create bloom framebuffer only once
        if (!this.bloomFramebuffer) {
            this.bloomFramebuffer = gl.createFramebuffer();
            this.bloomTexture = gl.createTexture();

            gl.bindTexture(gl.TEXTURE_2D, this.bloomTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomFramebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.bloomTexture, 0);
        }

        // Extract bright areas
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomFramebuffer);
        gl.viewport(0, 0, this.width, this.height);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const extractProgram = this.shaders.postBloomExtract;
        gl.useProgram(extractProgram);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.postProcessing.tempTextures[0]);
        gl.uniform1i(gl.getUniformLocation(extractProgram, 'u_texture'), 0);
        gl.uniform1f(gl.getUniformLocation(extractProgram, 'u_bloomThreshold'), threshold);

        this.renderFullscreenQuad(extractProgram);

        // Combined blur passes (more efficient)
        this.renderOptimizedBlur(this.bloomTexture, blurRadius);

        // Final combine
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.width, this.height);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const combineProgram = this.shaders.postBloomCombine;
        gl.useProgram(combineProgram);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.postProcessing.tempTextures[0]);
        gl.uniform1i(gl.getUniformLocation(combineProgram, 'u_texture'), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.bloomTexture);
        gl.uniform1i(gl.getUniformLocation(combineProgram, 'u_bloomTexture'), 1);
        gl.uniform1f(gl.getUniformLocation(combineProgram, 'u_bloomStrength'), strength);

        this.renderFullscreenQuad(combineProgram);
    }

    renderOptimizedBlur(inputTexture, radius) {
        const gl = this.gl;
        const blurProgram = this.shaders.postBlur;

        gl.useProgram(blurProgram);
        gl.uniform2f(gl.getUniformLocation(blurProgram, 'u_resolution'), this.width, this.height);
        gl.uniform1f(gl.getUniformLocation(blurProgram, 'u_blurRadius'), radius);

        // Horizontal pass
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.postProcessing.framebuffers[1]);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, inputTexture);
        gl.uniform1i(gl.getUniformLocation(blurProgram, 'u_texture'), 0);
        gl.uniform2f(gl.getUniformLocation(blurProgram, 'u_direction'), 1.0, 0.0);

        this.renderFullscreenQuad(blurProgram);

        // Vertical pass
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomFramebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.postProcessing.tempTextures[1]);
        gl.uniform2f(gl.getUniformLocation(blurProgram, 'u_direction'), 0.0, 1.0);

        this.renderFullscreenQuad(blurProgram);
    }

    /*
     * Render a single post-processing effect
     */
    renderPostEffect(effect, inputTexture) {
        const gl = this.gl;
        let program;

        // Get shader program for effect
        switch (effect.name) {
            case 'blur':
                program = this.shaders.postBlur;
                break;
            case 'bloom':
                program = this.shaders.postBloom;
                break;
            case 'fxaa':
                program = this.shaders.postFXAA;
                break;
            case 'chromaticAberration':
                program = this.shaders.postChromaticAberration;
                break;
            case 'vignette':
                program = this.shaders.postVignette;
                break;
            case 'colorGrading':
                program = this.shaders.postColorGrading;
                break;
            case 'pixelate':
                program = this.shaders.postPixelate;
                break;
            default:
                program = this.shaders.postPassthrough;
        }

        gl.useProgram(program);

        // Bind input texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, inputTexture);
        gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);

        // Set common uniforms
        gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), this.width, this.height);

        // Set effect-specific uniforms
        this.setPostEffectUniforms(program, effect);

        // Bind fullscreen quad and render
        this.renderFullscreenQuad(program);
    }

    /*
     * Set uniforms for specific post-processing effects
     */
    setPostEffectUniforms(program, effect) {
        const gl = this.gl;
        const params = effect.parameters;

        switch (effect.name) {
            case 'blur':
                const directionLoc = gl.getUniformLocation(program, 'u_direction');
                const radiusLoc = gl.getUniformLocation(program, 'u_blurRadius');

                if (directionLoc !== null) {
                    // For now, just do horizontal blur. For better quality, you'd do two passes
                    gl.uniform2f(directionLoc, 1.0, 0.0);
                }
                if (radiusLoc !== null) {
                    gl.uniform1f(radiusLoc, params.radius || 2.0);
                }
                break;

            case 'bloom':
                const strengthLoc = gl.getUniformLocation(program, 'u_bloomStrength');
                const thresholdLoc = gl.getUniformLocation(program, 'u_bloomThreshold');

                if (strengthLoc !== null) {
                    gl.uniform1f(strengthLoc, params.strength || 0.5);
                }
                if (thresholdLoc !== null) {
                    gl.uniform1f(thresholdLoc, params.threshold || 0.7);
                }
                break;

            case 'chromaticAberration':
                const aberrationLoc = gl.getUniformLocation(program, 'u_aberrationStrength');
                if (aberrationLoc !== null) {
                    gl.uniform1f(aberrationLoc, params.strength || 0.01);
                }
                break;

            case 'vignette':
                const vignetteStrengthLoc = gl.getUniformLocation(program, 'u_vignetteStrength');
                const vignetteRadiusLoc = gl.getUniformLocation(program, 'u_vignetteRadius');

                if (vignetteStrengthLoc !== null) {
                    gl.uniform1f(vignetteStrengthLoc, params.strength || 0.5);
                }
                if (vignetteRadiusLoc !== null) {
                    gl.uniform1f(vignetteRadiusLoc, params.radius || 0.8);
                }
                break;

            case 'colorGrading':
                const brightnessLoc = gl.getUniformLocation(program, 'u_brightness');
                const contrastLoc = gl.getUniformLocation(program, 'u_contrast');
                const saturationLoc = gl.getUniformLocation(program, 'u_saturation');
                const hueLoc = gl.getUniformLocation(program, 'u_hue');

                if (brightnessLoc !== null) {
                    gl.uniform1f(brightnessLoc, params.brightness || 0.0);
                }
                if (contrastLoc !== null) {
                    gl.uniform1f(contrastLoc, params.contrast || 1.0);
                }
                if (saturationLoc !== null) {
                    gl.uniform1f(saturationLoc, params.saturation || 1.0);
                }
                if (hueLoc !== null) {
                    gl.uniform1f(hueLoc, params.hue || 0.0);
                }
                break;

            case 'pixelate':
                const pixelSizeLoc = gl.getUniformLocation(program, 'u_pixelSize');
                if (pixelSizeLoc !== null) {
                    gl.uniform1f(pixelSizeLoc, params.pixelSize || 4.0);
                }
                break;
        }
    }

    /*
     * Render fullscreen quad for post-processing
     */
    renderFullscreenQuad(program) {
        const gl = this.gl;

        // Bind quad vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.postProcessing.quadBuffer);

        // Set up position attribute
        const positionLoc = gl.getAttribLocation(program, 'a_position');
        if (positionLoc >= 0) {
            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 16, 0);
        }

        // Set up texture coordinate attribute
        const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
        if (texCoordLoc >= 0) {
            gl.enableVertexAttribArray(texCoordLoc);
            gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 16, 8);
        }

        // Bind index buffer and draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.postProcessing.quadIndexBuffer);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
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

        // Enhanced circle fragment shader that can handle both fill and stroke
        const circleFragmentShader = `
            precision mediump float;
            varying vec4 v_color;
            varying vec2 v_center;
            varying float v_radius;
            varying vec2 v_fragCoord;
            uniform vec2 u_resolution;
            uniform float u_strokeWidth;
            uniform int u_isStroke;
            
            void main() {
                vec2 centerPixels = (v_center + 1.0) * 0.5 * u_resolution;
                centerPixels.y = u_resolution.y - centerPixels.y;
                
                float dist = distance(v_fragCoord, centerPixels);
                
                if (u_isStroke == 1) {
                    // Stroke mode - render only the ring
                    float innerRadius = v_radius - u_strokeWidth;
                    if (dist > v_radius || dist < innerRadius) {
                        discard;
                    }
                } else {
                    // Fill mode - render the entire circle
                    if (dist > v_radius) {
                        discard;
                    }
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

        // Enhanced Image vertex shader
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

        // Enhanced Image fragment shader with color manipulation
        const imageFragmentShader = `
    precision mediump float;
    uniform sampler2D u_texture;
    uniform float u_globalAlpha;
    
    // Color manipulation uniforms
    uniform float u_hue;
    uniform float u_saturation;
    uniform float u_lightness;
    uniform float u_brightness;
    uniform float u_contrast;
    uniform vec4 u_colorTint;
    uniform float u_opacity;
    uniform int u_colorMode;
    uniform vec4 u_colorMultiply;
    uniform vec4 u_colorAdd;
    uniform float u_gamma;
    uniform float u_exposure;
    
    varying vec2 v_texCoord;
    
    // Convert RGB to HSL
    vec3 rgb2hsl(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }
    
    // Convert HSL to RGB
    vec3 hsl2rgb(vec3 c) {
        vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
        return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
    }
    
    // Apply color temperature effect
    vec3 applyColorTemperature(vec3 color, float temperature) {
        // Simplified color temperature adjustment
        float t = temperature * 0.01;
        vec3 warm = vec3(1.0, 0.8, 0.6);
        vec3 cool = vec3(0.6, 0.8, 1.0);
        return mix(color * cool, color * warm, clamp(t + 0.5, 0.0, 1.0));
    }
    
    void main() {
        vec4 texColor = texture2D(u_texture, v_texCoord);
        vec3 color = texColor.rgb;
        float alpha = texColor.a;
        
        // Apply gamma correction first if needed
        if (u_gamma != 1.0) {
            color = pow(color, vec3(1.0 / u_gamma));
        }
        
        // Apply exposure
        if (u_exposure != 0.0) {
            color *= pow(2.0, u_exposure);
        }
        
        // Apply brightness and contrast
        if (u_brightness != 0.0 || u_contrast != 1.0) {
            color += u_brightness;
            color = (color - 0.5) * u_contrast + 0.5;
        }
        
        // Apply HSL adjustments
        if (u_hue != 0.0 || u_saturation != 1.0 || u_lightness != 0.0) {
            vec3 hsl = rgb2hsl(color);
            
            // Adjust hue (wrap around)
            hsl.x = mod(hsl.x + u_hue / 360.0, 1.0);
            
            // Adjust saturation
            hsl.y *= u_saturation;
            
            // Adjust lightness
            hsl.z += u_lightness;
            
            // Clamp HSL values
            hsl = clamp(hsl, vec3(0.0), vec3(1.0));
            
            color = hsl2rgb(hsl);
        }
        
        // Apply color modes
        if (u_colorMode == 1) {
            // Grayscale
            float gray = dot(color, vec3(0.299, 0.587, 0.114));
            color = vec3(gray);
        } else if (u_colorMode == 2) {
            // Sepia
            vec3 sepia = vec3(
                dot(color, vec3(0.393, 0.769, 0.189)),
                dot(color, vec3(0.349, 0.686, 0.168)),
                dot(color, vec3(0.272, 0.534, 0.131))
            );
            color = sepia;
        } else if (u_colorMode == 3) {
            // Invert
            color = 1.0 - color;
        } else if (u_colorMode == 4) {
            // Black and white (threshold)
            float gray = dot(color, vec3(0.299, 0.587, 0.114));
            color = vec3(step(0.5, gray));
        }
        
        // Apply color multiply
        color *= u_colorMultiply.rgb;
        alpha *= u_colorMultiply.a;
        
        // Apply color addition
        color += u_colorAdd.rgb;
        alpha += u_colorAdd.a;
        
        // Apply color tint
        color = mix(color, u_colorTint.rgb, u_colorTint.a);
        
        // Apply opacity
        alpha *= u_opacity;
        
        // Clamp final color
        color = clamp(color, 0.0, 1.0);
        alpha = clamp(alpha, 0.0, 1.0);
        
        gl_FragColor = vec4(color, alpha * u_globalAlpha);
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
    * Set up WebGL context loss and restore handling
    */
    setupContextLossHandling() {
        // Store the lose context extension for emergency use
        this.loseContextExtension = this.gl.getExtension('WEBGL_lose_context');

        // Handle context lost event
        this.canvas.addEventListener('webglcontextlost', (event) => {
            // console.warn('WebGL context lost');
            event.preventDefault(); // This is crucial - prevents default behavior
            this.contextLost = true;

            // Stop any ongoing animations immediately
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }

            // Clear all pending timeouts/intervals
            this.clearAllTimers();

            // Clear all resources immediately - don't try to delete WebGL objects
            this.clearResourcesOnContextLoss();

            // Emit custom event
            if (this.canvas && typeof this.canvas.dispatchEvent === 'function') {
                try {
                    this.canvas.dispatchEvent(new CustomEvent('contextlost'));
                } catch (e) {
                    // console.warn('Failed to dispatch contextlost event:', e);
                }
            }
        }, false);

        // Handle context restored event with retry mechanism
        this.canvas.addEventListener('webglcontextrestored', (event) => {
            // console.log('WebGL context restored');
            this.contextLost = false;

            // Add a small delay before restoration to ensure stability
            setTimeout(() => {
                this.attemptContextRestore();
            }, 100);
        }, false);

        // Monitor for context loss in critical operations
        this.setupContextMonitoring();
    }

    /*
    * Attempt context restoration with error handling
    */
    attemptContextRestore() {
        let attempts = 0;
        const maxAttempts = 3;

        const restore = () => {
            try {
                this.restoreWebGLState();

                // Run restore callbacks
                this.contextRestoreCallbacks.forEach(callback => {
                    try {
                        callback();
                    } catch (e) {
                        // console.error('Error in context restore callback:', e);
                    }
                });

                // Emit custom event
                if (this.canvas && typeof this.canvas.dispatchEvent === 'function') {
                    this.canvas.dispatchEvent(new CustomEvent('contextrestored'));
                }

                // console.log('WebGL context successfully restored');
            } catch (e) {
                attempts++;
                // console.error(`Context restore attempt ${attempts} failed:`, e);

                if (attempts < maxAttempts) {
                    // console.log(`Retrying context restore in ${attempts * 500}ms...`);
                    setTimeout(restore, attempts * 500);
                } else {
                    // console.error('Failed to restore WebGL context after maximum attempts');
                    this.contextLost = true;
                }
            }
        };

        restore();
    }

    /*
    * Monitor context health during operations
    */
    setupContextMonitoring() {
        // Check context periodically but less frequently to reduce overhead
        this.contextHealthCheck = setInterval(() => {
            if (this.gl && !this.contextLost) {
                try {
                    if (this.gl.isContextLost()) {
                        // console.warn('Context loss detected during health check');
                        this.contextLost = true;
                        this.clearResourcesOnContextLoss();
                    }
                } catch (e) {
                    // If we can't even call isContextLost, context is definitely lost
                    // console.warn('Cannot check context health, assuming lost');
                    this.contextLost = true;
                    this.clearResourcesOnContextLoss();
                }
            }
        }, 10000); // Check every 10 seconds instead of 5
    }

    /*
    * Clear all timers and intervals
    */
    clearAllTimers() {
        // Clear any stored timer IDs
        if (this.timers) {
            this.timers.forEach(id => clearTimeout(id));
            this.timers.clear();
        }
    }

    /*
     * Clear resources when context is lost
     */
    clearResourcesOnContextLoss() {
        // Clear texture cache references (textures are automatically lost)
        this.textureCache.clear();
        this.fontCache.clear();

        // Clear shader references (programs are automatically lost)
        this.shaders = {};

        // Reset batch state without trying to delete buffers
        if (this.batchBuffers) {
            Object.values(this.batchBuffers).forEach(batch => {
                if (batch) {
                    batch.currentVertices = 0;
                    batch.currentIndices = 0;
                    if (batch.currentQuads !== undefined) batch.currentQuads = 0;
                    batch.currentTexture = null;
                    // Don't try to delete buffers - they're automatically lost
                    batch.vertices = null;
                    batch.colors = null;
                    batch.indices = null;
                    batch.centers = null;
                    batch.radii = null;
                    batch.texCoords = null;
                }
            });
        }

        // Clear post-processing resources references
        if (this.postProcessing) {
            this.postProcessing.framebuffers = [];
            this.postProcessing.tempTextures = [];
            this.postProcessing.quadBuffer = null;
            this.postProcessing.quadIndexBuffer = null;
        }

        // Clear custom buffers
        this.customVertexBuffer = null;
        this.customIndexBuffer = null;
        this.currentShader = null;
    }

    /*
     * Restore WebGL state after context restore
     */
    restoreWebGLState() {
        if (!this.gl || this.gl.isContextLost()) {
            // console.error('Cannot restore state - context is still lost');
            return;
        }

        try {
            // Reinitialize WebGL
            this.init();

            // Recreate built-in shaders
            this.createBuiltInShaders();

            // Recreate batch buffers
            this.createBatchBuffers();

            // Set initial viewport
            this.gl.viewport(0, 0, this.width, this.height);
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

            // console.log('WebGL state restored successfully');
        } catch (e) {
            // console.error('Failed to restore WebGL state:', e);
            this.contextLost = true; // Keep marked as lost if restore fails
            throw e;
        }
    }

    /*
 * Periodic texture cache cleanup
 */
    cleanupTextureCache() {
        const now = performance.now();
        const maxAge = 30000; // 30 seconds

        for (const [image, data] of this.textureCache.entries()) {
            if (now - data.lastUsed > maxAge) {
                if (data.atlas === null && this.gl.isTexture(data.texture)) {
                    this.gl.deleteTexture(data.texture);
                }
                this.textureCache.delete(image);
            }
        }
    }

    /*
     * Add callback to run when context is restored
     * @param {Function} callback - Function to call on context restore
     */
    onContextRestore(callback) {
        this.contextRestoreCallbacks.push(callback);
    }

    /*
     * Check if context is lost before performing operations
     */
    isContextLost() {
        return this.contextLost || (this.gl && this.gl.isContextLost());
    }

    isFramebufferValid(framebuffer) {
        return framebuffer &&
            this.gl.isFramebuffer(framebuffer) &&
            this.gl.getFramebufferAttachmentParameter(
                this.gl.FRAMEBUFFER,
                this.gl.COLOR_ATTACHMENT0,
                this.gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME
            ) !== null;
    }

    /*
     * Flush all batches to GPU
     */
    flush() {
        if (this.isContextLost() || !this.gl) {
            //// console.warn('Skipping flush - WebGL context is lost/unavailable');
            return;
        }

        try {
            // If post-processing is enabled, render to framebuffer first
            if (this.postProcessing.enabled && this.postProcessing.effects.length > 0) {
                // Only recreate if truly invalid - not every frame!
                if (!this.isFramebufferValid(this.postProcessing.framebuffers[0])) {
                    // console.warn('Recreating invalid framebuffers');
                    this.createPostProcessingFramebuffers();
                }

                // Bind first framebuffer for scene rendering
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.postProcessing.framebuffers[0]);
                this.gl.viewport(0, 0, this.width, this.height);
                this.gl.clear(this.gl.COLOR_BUFFER_BIT);

                // Render all batches to the framebuffer
                this.flushRectangles();
                this.flushCircles();
                this.flushEllipses();
                this.flushLines();
                this.flushImages();

                // Now apply post-processing effects
                this.renderPostProcessing();
            } else {
                // Normal rendering directly to screen
                this.flushRectangles();
                this.flushCircles();
                this.flushEllipses();
                this.flushLines();
                this.flushImages();
            }
        } catch (e) {
            if (this.gl && this.gl.isContextLost()) {
                // console.warn('Context lost during flush operation');
                this.contextLost = true;
                this.clearResourcesOnContextLoss();
            } else {
                // console.error('Error during flush:', e);
            }
        }
    }

    /*
 * Ultra-fast image batch flushing
 */
    flushImageBatch() {
        const batch = this.imageBatchBuffer;
        if (batch.currentQuads === 0 || !batch.currentTexture) return;

        const gl = this.gl;
        const program = this.shaders.instancedImage;

        gl.useProgram(program);

        // Bind texture once
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, batch.currentTexture);
        gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);

        // Set uniforms
        gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), this.width, this.height);
        gl.uniform1f(gl.getUniformLocation(program, 'u_globalAlpha'), this.state.globalAlpha);
        gl.uniformMatrix3fv(gl.getUniformLocation(program, 'u_globalTransform'), false, this.state.transform);

        // Upload vertex data (only current portion)
        const vertexCount = batch.currentQuads * 8;
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.vertices);
        gl.bufferData(gl.ARRAY_BUFFER, batch.vertexData.subarray(0, vertexCount), gl.DYNAMIC_DRAW);

        const positionLoc = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        // Upload texture coordinate data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.texCoords);
        gl.bufferData(gl.ARRAY_BUFFER, batch.texCoordData.subarray(0, vertexCount), gl.DYNAMIC_DRAW);

        const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
        gl.enableVertexAttribArray(texCoordLoc);
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

        // Upload transform data
        const transformCount = batch.currentQuads * 6;
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.transforms);
        gl.bufferData(gl.ARRAY_BUFFER, batch.transformData.subarray(0, transformCount), gl.DYNAMIC_DRAW);

        const transformLoc = gl.getAttribLocation(program, 'a_transform');
        gl.enableVertexAttribArray(transformLoc);
        gl.vertexAttribPointer(transformLoc, 6, gl.FLOAT, false, 0, 0);

        // Use pre-generated indices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, batch.indices);

        // Draw all quads in one call
        gl.drawElements(gl.TRIANGLES, batch.currentQuads * 6, gl.UNSIGNED_SHORT, 0);

        // Reset batch
        batch.currentQuads = 0;
        batch.currentTexture = null;
    }

    /*
     * Flush image batch
     */
    flushImages() {
        const batch = this.batchBuffers.images;
        if (batch.currentQuads === 0 || !batch.currentTexture) return;

        const gl = this.gl;
        const program = this.shaders.image;

        gl.useProgram(program);

        // Bind and activate texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, batch.currentTexture);

        // Set texture uniform
        const textureLocation = gl.getUniformLocation(program, 'u_texture');
        if (textureLocation !== null) {
            gl.uniform1i(textureLocation, 0);
        }

        // Upload and bind vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.vertices);
        gl.bufferData(gl.ARRAY_BUFFER, batch.vertexData.subarray(0, batch.currentVertices * 2), gl.DYNAMIC_DRAW);

        const positionLoc = gl.getAttribLocation(program, 'a_position');
        if (positionLoc >= 0) {
            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        }

        // Upload and bind texture coordinate data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.texCoords);
        gl.bufferData(gl.ARRAY_BUFFER, batch.texCoordData.subarray(0, batch.currentVertices * 2), gl.DYNAMIC_DRAW);

        const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');
        if (texCoordLoc >= 0) {
            gl.enableVertexAttribArray(texCoordLoc);
            gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
        }

        // Upload and bind index data
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, batch.indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, batch.indexData.subarray(0, batch.currentIndices), gl.DYNAMIC_DRAW);

        // Set basic uniforms
        const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
        if (resolutionLoc !== null) {
            gl.uniform2f(resolutionLoc, this.width, this.height);
        }

        const globalAlphaLoc = gl.getUniformLocation(program, 'u_globalAlpha');
        if (globalAlphaLoc !== null) {
            gl.uniform1f(globalAlphaLoc, this.state.globalAlpha);
        }

        // Set color manipulation uniforms
        const hueLocation = gl.getUniformLocation(program, 'u_hue');
        if (hueLocation !== null) {
            gl.uniform1f(hueLocation, this.state.imageHue);
        }

        const saturationLocation = gl.getUniformLocation(program, 'u_saturation');
        if (saturationLocation !== null) {
            gl.uniform1f(saturationLocation, this.state.imageSaturation);
        }

        const lightnessLocation = gl.getUniformLocation(program, 'u_lightness');
        if (lightnessLocation !== null) {
            gl.uniform1f(lightnessLocation, this.state.imageLightness);
        }

        const brightnessLocation = gl.getUniformLocation(program, 'u_brightness');
        if (brightnessLocation !== null) {
            gl.uniform1f(brightnessLocation, this.state.imageBrightness);
        }

        const contrastLocation = gl.getUniformLocation(program, 'u_contrast');
        if (contrastLocation !== null) {
            gl.uniform1f(contrastLocation, this.state.imageContrast);
        }

        const colorTintLocation = gl.getUniformLocation(program, 'u_colorTint');
        if (colorTintLocation !== null) {
            gl.uniform4fv(colorTintLocation, this.state.imageColorTint);
        }

        const opacityLocation = gl.getUniformLocation(program, 'u_opacity');
        if (opacityLocation !== null) {
            gl.uniform1f(opacityLocation, this.state.imageOpacity);
        }

        const colorModeLocation = gl.getUniformLocation(program, 'u_colorMode');
        if (colorModeLocation !== null) {
            gl.uniform1i(colorModeLocation, this.state.imageColorMode);
        }

        const colorMultiplyLocation = gl.getUniformLocation(program, 'u_colorMultiply');
        if (colorMultiplyLocation !== null) {
            gl.uniform4fv(colorMultiplyLocation, this.state.imageColorMultiply);
        }

        const colorAddLocation = gl.getUniformLocation(program, 'u_colorAdd');
        if (colorAddLocation !== null) {
            gl.uniform4fv(colorAddLocation, this.state.imageColorAdd);
        }

        const gammaLocation = gl.getUniformLocation(program, 'u_gamma');
        if (gammaLocation !== null) {
            gl.uniform1f(gammaLocation, this.state.imageGamma);
        }

        const exposureLocation = gl.getUniformLocation(program, 'u_exposure');
        if (exposureLocation !== null) {
            gl.uniform1f(exposureLocation, this.state.imageExposure);
        }

        // Draw all batched quads in one call
        gl.drawElements(gl.TRIANGLES, batch.currentIndices, gl.UNSIGNED_SHORT, 0);

        // Check for errors
        this.checkGLError('flushImages');

        // Reset batch
        batch.currentVertices = 0;
        batch.currentIndices = 0;
        batch.currentQuads = 0;
        batch.currentTexture = null;

        // Clean up
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    /*
    * Force flush of images using a specific texture
    * Useful when you want to ensure images are drawn before switching textures
    */
    flushImagesForTexture(texture) {
        const batch = this.batchBuffers.images;
        if (batch.currentTexture === texture && batch.currentQuads > 0) {
            this.flushImages();
        }
    }

    /*
    * Get current image batch statistics
    * Useful for monitoring batching efficiency
    */
    getImageBatchStats() {
        const batch = this.batchBuffers.images;
        return {
            currentQuads: batch.currentQuads,
            maxQuads: batch.maxQuads,
            currentTexture: batch.currentTexture,
            batchUtilization: (batch.currentQuads / batch.maxQuads * 100).toFixed(1) + '%'
        };
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

        // Check if program exists and is valid
        if (!program || !gl.isProgram(program)) {
            // console.error('Circle shader program not available or invalid');
            // Reset batch to prevent infinite loop
            batch.currentVertices = 0;
            batch.currentIndices = 0;
            return;
        }

        gl.useProgram(program);

        // Upload vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.vertices);
        gl.bufferData(gl.ARRAY_BUFFER, batch.vertexData.subarray(0, batch.currentVertices * 2), gl.DYNAMIC_DRAW);

        const positionLoc = gl.getAttribLocation(program, 'a_position');
        if (positionLoc >= 0) {
            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        }

        // Upload color data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.colors);
        gl.bufferData(gl.ARRAY_BUFFER, batch.colorData.subarray(0, batch.currentVertices * 4), gl.DYNAMIC_DRAW);

        const colorLoc = gl.getAttribLocation(program, 'a_color');
        if (colorLoc >= 0) {
            gl.enableVertexAttribArray(colorLoc);
            gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
        }

        // Upload center data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.centers);
        gl.bufferData(gl.ARRAY_BUFFER, batch.centerData.subarray(0, batch.currentVertices * 2), gl.DYNAMIC_DRAW);

        const centerLoc = gl.getAttribLocation(program, 'a_center');
        if (centerLoc >= 0) {
            gl.enableVertexAttribArray(centerLoc);
            gl.vertexAttribPointer(centerLoc, 2, gl.FLOAT, false, 0, 0);
        }

        // Upload radius data
        gl.bindBuffer(gl.ARRAY_BUFFER, batch.radii);
        gl.bufferData(gl.ARRAY_BUFFER, batch.radiusData.subarray(0, batch.currentVertices), gl.DYNAMIC_DRAW);

        const radiusLoc = gl.getAttribLocation(program, 'a_radius');
        if (radiusLoc >= 0) {
            gl.enableVertexAttribArray(radiusLoc);
            gl.vertexAttribPointer(radiusLoc, 1, gl.FLOAT, false, 0, 0);
        }

        // Upload index data
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, batch.indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, batch.indexData.subarray(0, batch.currentIndices), gl.DYNAMIC_DRAW);

        // Set uniforms
        const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
        if (resolutionLoc !== null) {
            gl.uniform2f(resolutionLoc, this.width, this.height);
        }

        // Add stroke uniforms
        const strokeWidthLoc = gl.getUniformLocation(program, 'u_strokeWidth');
        if (strokeWidthLoc !== null) {
            gl.uniform1f(strokeWidthLoc, this.state.lineWidth);
        }

        const isStrokeLoc = gl.getUniformLocation(program, 'u_isStroke');
        if (isStrokeLoc !== null) {
            // This would need to be set based on whether we're drawing fill or stroke circles
            // For now, default to fill (0)
            gl.uniform1i(isStrokeLoc, 0);
        }

        // Draw all circles in one call!
        gl.drawElements(gl.TRIANGLES, batch.currentIndices, gl.UNSIGNED_SHORT, 0);

        // Reset batch after flushing
        batch.currentVertices = 0;
        batch.currentIndices = 0;

        // Clean up
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
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
        if (!this.useWebGL) {
            this.ctx.fillStyle = color;
            return;
        }

        this.state.fillStyle = this.parseColor(color);
    }

    /*
        * Get current fill style
        * Returns the fill style as an RGBA array
        * @return {Array}
    */
    get fillStyle() {
        if (!this.useWebGL) {
            return this.ctx.fillStyle;
        }

        return this.state.fillStyle;
    }

    /*
        * Set stroke style (color)
        * Accepts color in hex, rgb, rgba, or array format
        * @param {string|Array} color - Color value
    */
    set strokeStyle(color) {
        if (!this.useWebGL) {
            this.ctx.strokeStyle = color;
            return;
        }

        this.state.strokeStyle = this.parseColor(color);
    }

    /*
        * Get current stroke style
        * Returns the stroke style as an RGBA array
        * @return {Array}
    */
    get strokeStyle() {
        if (!this.useWebGL) {
            return this.ctx.strokeStyle;
        }

        return this.state.strokeStyle;
    }

    /*
        * Set line width for strokes
        * @param {number} width - Line width in pixels
    */
    set lineWidth(width) {
        if (!this.useWebGL) {
            this.ctx.lineWidth = width;
            return;
        }

        this.state.lineWidth = Math.max(0, width);

        // Try to set WebGL line width for thin lines (fallback)
        if (this.gl && width <= 1) {
            try {
                this.gl.lineWidth(width);
            } catch (e) {
                // Some browsers/drivers don't support this
                // console.warn('WebGL lineWidth not supported, using rectangle-based rendering');
            }
        }
    }

    /*
        * Get current line width
        * Returns the line width in pixels
        * @return {number}
    */
    get lineWidth() {
        if (!this.useWebGL) {
            return this.ctx.lineWidth;
        }

        return this.state.lineWidth;
    }

    /*
 * Set shadow properties
 */
    set shadowColor(color) {
        if (!this.useWebGL) {
            this.ctx.shadowColor = color;
            return;
        }

        this.state.shadowColor = this.parseColor(color);
    }

    get shadowColor() {
        if (!this.useWebGL) {
            return this.ctx.shadowColor;
        }

        return this.state.shadowColor;
    }

    set shadowBlur(blur) {
        if (!this.useWebGL) {
            this.ctx.shadowBlur = Math.max(0, blur);
            return;
        }

        this.state.shadowBlur = Math.max(0, blur);
    }

    get shadowBlur() {
        if (!this.useWebGL) {
            return this.ctx.shadowBlur;
        }

        return this.state.shadowBlur;
    }

    set shadowOffsetX(offset) {
        if (!this.useWebGL) {
            this.ctx.shadowOffsetX = offset;
            return;
        }

        this.state.shadowOffsetX = offset;
    }

    get shadowOffsetX() {
        if (!this.useWebGL) {
            return this.ctx.shadowOffsetX;
        }

        return this.state.shadowOffsetX;
    }

    set shadowOffsetY(offset) {
        if (!this.useWebGL) {
            this.ctx.shadowOffsetY = offset;
            return;
        }

        this.state.shadowOffsetY = offset;
    }

    get shadowOffsetY() {
        if (!this.useWebGL) {
            return this.ctx.shadowOffsetY;
        }

        return this.state.shadowOffsetY;
    }

    /*
 * Set image smoothing
 */
    set imageSmoothingEnabled(enabled) {
        if (!this.useWebGL) {
            this.ctx.imageSmoothingEnabled = enabled;
            return;
        }

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
        if (!this.useWebGL) {
            return this.ctx.imageSmoothingEnabled;
        }

        return this.state.imageSmoothingEnabled;
    }

    /*
     * Set image smoothing quality
     */
    set imageSmoothingQuality(quality) {
        if (!this.useWebGL) {
            this.ctx.imageSmoothingQuality = quality;
            return;
        }

        const validQualities = ['low', 'medium', 'high'];
        const intQualities = [0, 1, 2]; // For compatibility with numeric values
        if (validQualities.includes(quality)) {
            this.state.imageSmoothingQuality = quality;
        } else if (intQualities.includes(quality)) {
            this.state.imageSmoothingQuality = validQualities[quality];
        }
    }

    get imageSmoothingQuality() {
        if (!this.useWebGL) {
            return this.ctx.imageSmoothingQuality;
        }

        return this.state.imageSmoothingQuality || 'low';
    }

    /*
    * Set global composite operation
    */
    set globalCompositeOperation(operation) {
        if (!this.useWebGL) {
            this.ctx.globalCompositeOperation = operation;
            return;
        }

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
        if (!this.useWebGL) {
            return this.ctx.globalCompositeOperation;
        }

        return this.state.globalCompositeOperation;
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

    // HSL Properties
    set imageHue(hue) {
        this.state.imageHue = Math.max(-180, Math.min(180, hue));
    }

    get imageHue() {
        return this.state.imageHue;
    }

    set imageSaturation(saturation) {
        this.state.imageSaturation = Math.max(0, saturation);
    }

    get imageSaturation() {
        return this.state.imageSaturation;
    }

    set imageLightness(lightness) {
        this.state.imageLightness = Math.max(-1, Math.min(1, lightness));
    }

    get imageLightness() {
        return this.state.imageLightness;
    }

    // Brightness/Contrast
    set imageBrightness(brightness) {
        this.state.imageBrightness = Math.max(-1, Math.min(1, brightness));
    }

    get imageBrightness() {
        return this.state.imageBrightness;
    }

    set imageContrast(contrast) {
        this.state.imageContrast = Math.max(0, contrast);
    }

    get imageContrast() {
        return this.state.imageContrast;
    }

    // Opacity (separate from globalAlpha)
    set imageOpacity(opacity) {
        this.state.imageOpacity = Math.max(0, Math.min(1, opacity));
    }

    get imageOpacity() {
        return this.state.imageOpacity;
    }

    // Color tint
    set imageColorTint(color) {
        if (Array.isArray(color)) {
            this.state.imageColorTint = [...color];
        } else {
            this.state.imageColorTint = this.parseColor(color);
        }
    }

    get imageColorTint() {
        return [...this.state.imageColorTint];
    }

    // Color mode
    set imageColorMode(mode) {
        this.state.imageColorMode = Math.max(0, Math.min(4, Math.floor(mode)));
    }

    get imageColorMode() {
        return this.state.imageColorMode;
    }

    // Color multiply
    set imageColorMultiply(color) {
        if (Array.isArray(color)) {
            this.state.imageColorMultiply = [...color];
        } else {
            this.state.imageColorMultiply = this.parseColor(color);
        }
    }

    get imageColorMultiply() {
        return [...this.state.imageColorMultiply];
    }

    // Color add
    set imageColorAdd(color) {
        if (Array.isArray(color)) {
            this.state.imageColorAdd = [...color];
        } else {
            this.state.imageColorAdd = this.parseColor(color);
        }
    }

    get imageColorAdd() {
        return [...this.state.imageColorAdd];
    }

    // Gamma correction
    set imageGamma(gamma) {
        this.state.imageGamma = Math.max(0.1, Math.min(3, gamma));
    }

    get imageGamma() {
        return this.state.imageGamma;
    }

    // Exposure
    set imageExposure(exposure) {
        this.state.imageExposure = Math.max(-3, Math.min(3, exposure));
    }

    get imageExposure() {
        return this.state.imageExposure;
    }

    /*
     * Convenience methods for common image color effects
     */

    // Reset all image color properties to default
    resetImageColors() {
        this.state.imageHue = 0;
        this.state.imageSaturation = 1;
        this.state.imageLightness = 0;
        this.state.imageBrightness = 0;
        this.state.imageContrast = 1;
        this.state.imageOpacity = 1;
        this.state.imageColorTint = [0, 0, 0, 0];
        this.state.imageColorMode = 0;
        this.state.imageColorMultiply = [1, 1, 1, 1];
        this.state.imageColorAdd = [0, 0, 0, 0];
        this.state.imageGamma = 1;
        this.state.imageExposure = 0;
    }

    // Apply a color filter preset
    applyImageFilter(filterName, intensity = 1.0) {
        this.resetImageColors();

        switch (filterName.toLowerCase()) {
            case 'grayscale':
            case 'greyscale':
                this.imageColorMode = 1;
                break;

            case 'sepia':
                this.imageColorMode = 2;
                break;

            case 'invert':
            case 'negative':
                this.imageColorMode = 3;
                break;

            case 'blackwhite':
            case 'threshold':
                this.imageColorMode = 4;
                break;

            case 'vintage':
                this.imageHue = 30 * intensity;
                this.imageSaturation = 0.7;
                this.imageContrast = 1.2;
                this.imageColorTint = [0.9, 0.8, 0.6, 0.1 * intensity];
                break;

            case 'cold':
                this.imageColorTint = [0.6, 0.8, 1.0, 0.2 * intensity];
                break;

            case 'warm':
                this.imageColorTint = [1.0, 0.8, 0.6, 0.2 * intensity];
                break;

            case 'dramatic':
                this.imageContrast = 1.5;
                this.imageSaturation = 1.3;
                this.imageBrightness = -0.1;
                break;

            case 'fade':
                this.imageOpacity = 0.7 * intensity;
                this.imageContrast = 0.8;
                break;

            case 'bright':
                this.imageBrightness = 0.3 * intensity;
                this.imageExposure = 0.5 * intensity;
                break;

            case 'dark':
                this.imageBrightness = -0.3 * intensity;
                this.imageExposure = -0.5 * intensity;
                break;
        }
    }

    // Batch set multiple image properties
    setImageColors(options) {
        if (options.hue !== undefined) this.imageHue = options.hue;
        if (options.saturation !== undefined) this.imageSaturation = options.saturation;
        if (options.lightness !== undefined) this.imageLightness = options.lightness;
        if (options.brightness !== undefined) this.imageBrightness = options.brightness;
        if (options.contrast !== undefined) this.imageContrast = options.contrast;
        if (options.opacity !== undefined) this.imageOpacity = options.opacity;
        if (options.tint !== undefined) this.imageColorTint = options.tint;
        if (options.mode !== undefined) this.imageColorMode = options.mode;
        if (options.multiply !== undefined) this.imageColorMultiply = options.multiply;
        if (options.add !== undefined) this.imageColorAdd = options.add;
        if (options.gamma !== undefined) this.imageGamma = options.gamma;
        if (options.exposure !== undefined) this.imageExposure = options.exposure;
    }

    // Get current image color settings
    getImageColors() {
        return {
            hue: this.state.imageHue,
            saturation: this.state.imageSaturation,
            lightness: this.state.imageLightness,
            brightness: this.state.imageBrightness,
            contrast: this.state.imageContrast,
            opacity: this.state.imageOpacity,
            tint: [...this.state.imageColorTint],
            mode: this.state.imageColorMode,
            multiply: [...this.state.imageColorMultiply],
            add: [...this.state.imageColorAdd],
            gamma: this.state.imageGamma,
            exposure: this.state.imageExposure
        };
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
        * Transfer current state to 2D context
        * Applies the current state properties to the 2D canvas context
    */
    transferContextState() {
        if (!this.useWebGL) {
            if (!this.ctx) return;
            // Apply current state to 2D context
            this.ctx.fillStyle = `rgba(${Math.round(this.state.fillStyle[0] * 255)}, ${Math.round(this.state.fillStyle[1] * 255)}, ${Math.round(this.state.fillStyle[2] * 255)}, ${this.state.fillStyle[3]})`;
            this.ctx.strokeStyle = `rgba(${Math.round(this.state.strokeStyle[0] * 255)}, ${Math.round(this.state.strokeStyle[1] * 255)}, ${Math.round(this.state.strokeStyle[2] * 255)}, ${this.state.strokeStyle[3]})`;
            this.ctx.lineWidth = this.state.lineWidth;
            this.ctx.lineCap = this.state.lineCap;
            this.ctx.lineJoin = this.state.lineJoin;
            this.ctx.miterLimit = this.state.miterLimit;
            this.ctx.setLineDash(this.state.lineDash);
            this.ctx.lineDashOffset = this.state.lineDashOffset;
            this.ctx.globalAlpha = this.state.globalAlpha;
            this.ctx.globalCompositeOperation = this.state.globalCompositeOperation;
            this.ctx.font = this.state.font;
            this.ctx.textAlign = this.state.textAlign;
            this.ctx.textBaseline = this.state.textBaseline;
            this.ctx.shadowColor = `rgba(${Math.round(this.state.shadowColor[0] * 255)}, ${Math.round(this.state.shadowColor[1] * 255)}, ${Math.round(this.state.shadowColor[2] * 255)}, ${this.state.shadowColor[3]})`;
            this.ctx.shadowBlur = this.state.shadowBlur;
            this.ctx.shadowOffsetX = this.state.shadowOffsetX;
            this.ctx.shadowOffsetY = this.state.shadowOffsetY;
            this.ctx.imageSmoothingEnabled = this.state.imageSmoothingEnabled;
            this.ctx.imageSmoothingQuality = this.state.imageSmoothingQuality || 'low';
            // Apply transform matrix
            this.ctx.setTransform(
                this.state.transform[0], this.state.transform[1],
                this.state.transform[2], this.state.transform[3],
                this.state.transform[4], this.state.transform[5]
            );
        }
    }

    /*
     * Convenience methods for common post-processing effects
     */

    // Add blur effect
    addBlur(radius = 2.0) {
        this.addPostEffect('blur', { radius });
    }

    // Add bloom effect
    addBloom(strength = 1.0, threshold = 0.5, blurRadius = 2.0) {
        // Remove existing bloom effects first
        this.removePostEffect('bloomExtract');
        this.removePostEffect('blur');
        this.removePostEffect('bloomCombine');

        // Add bloom extract
        this.addPostEffect('bloomExtract', { threshold });

        // Add blur for the bloom texture
        this.addPostEffect('blur', { radius: blurRadius });

        // Add bloom combine
        this.addPostEffect('bloomCombine', {
            strength,
            originalTexture: null // Will be set during rendering
        });
    }

    // Add FXAA antialiasing
    addFXAA() {
        this.addPostEffect('fxaa');
    }

    // Add chromatic aberration
    addChromaticAberration(strength = 0.01) {
        this.addPostEffect('chromaticAberration', { strength });
    }

    // Add vignette effect
    addVignette(strength = 0.5, radius = 0.8) {
        this.addPostEffect('vignette', { strength, radius });
    }

    // Add color grading
    addColorGrading(brightness = 0.0, contrast = 1.0, saturation = 1.0, hue = 0.0) {
        this.addPostEffect('colorGrading', { brightness, contrast, saturation, hue });
    }

    // Add pixelate effect
    addPixelate(pixelSize = 4.0) {
        this.addPostEffect('pixelate', { pixelSize });
    }

    /*
        * Save the current state
        * Saves all drawing state to the state stack
    */
    save() {
        if (!this.useWebGL) {
            if (!this.ctx) return;
            this.transferContextState();
            this.ctx.save();
            return;
        }

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
            transform: [...this.state.transform],

            // Image color properties
            imageHue: this.state.imageHue,
            imageSaturation: this.state.imageSaturation,
            imageLightness: this.state.imageLightness,
            imageBrightness: this.state.imageBrightness,
            imageContrast: this.state.imageContrast,
            imageOpacity: this.state.imageOpacity,
            imageColorTint: [...this.state.imageColorTint],
            imageColorMode: this.state.imageColorMode,
            imageColorMultiply: [...this.state.imageColorMultiply],
            imageColorAdd: [...this.state.imageColorAdd],
            imageGamma: this.state.imageGamma,
            imageExposure: this.state.imageExposure
        });
    }

    /*
        * Restore the last saved state
        * Restores fillStyle, strokeStyle, lineWidth, and transform from the state stack
    */
    restore() {
        if (!this.useWebGL) {
            if (!this.ctx) return;
            this.ctx.restore();
            return;
        }

        if (this.stateStack.length > 0) {
            this.state = this.stateStack.pop();
        }
    }

    /*
     * Add rectangle to batch
     */
    addRectangleToBatch(x, y, width, height, color) {
        if (!this.useWebGL) {
            return;
            this.transferContextState();
        }

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
 * Add stroke circle to batch (renders as ring/outline)
 */
    addStrokeCircleToBatch(x, y, radius, lineWidth, color) {
        if (!this.useWebGL) {
            return;
        }

        const batch = this.batchBuffers.circles;

        if (batch.currentVertices + 4 > batch.maxVertices) {
            this.flushCircles();
            batch.currentVertices = 0;
            batch.currentIndices = 0;
        }

        const [cx, cy] = this.transformPoint(x, y);
        const outerRadius = radius + lineWidth / 2;
        const vertexIndex = batch.currentVertices;

        // Create quad around the outer circle
        const vertices = [
            [cx - outerRadius, cy - outerRadius],
            [cx + outerRadius, cy - outerRadius],
            [cx - outerRadius, cy + outerRadius],
            [cx + outerRadius, cy + outerRadius]
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

            // Store both inner and outer radius in the radius data
            // We'll use radiusData for outer radius and add innerRadius data
            batch.radiusData[vertexIndex + i] = outerRadius;
        }

        // We need to modify the circle shader to handle stroke circles
        // For now, let's store the inner radius in a separate way
        // This is a workaround - ideally we'd have a separate stroke circle shader

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
     * Add circle to batch
     */
    addCircleToBatch(x, y, radius, color) {
        if (!this.useWebGL) {
            return;
            this.transferContextState();
        }

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
        if (!this.useWebGL) {
            return;
            this.transferContextState();
        }

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
        const batch = this.batchBuffers.images;

        // If different texture, flush current batch
        if (batch.currentTexture && batch.currentTexture !== texture) {
            this.flushImages();
        }

        // If batch is full, flush it
        if (batch.currentQuads >= batch.maxQuads) {
            this.flushImages();
        }

        batch.currentTexture = texture;

        // Transform rectangle vertices
        const [x1, y1] = this.transformPoint(dx, dy);
        const [x2, y2] = this.transformPoint(dx + dWidth, dy);
        const [x3, y3] = this.transformPoint(dx, dy + dHeight);
        const [x4, y4] = this.transformPoint(dx + dWidth, dy + dHeight);

        const vertexIndex = batch.currentVertices;
        const quadIndex = batch.currentQuads;

        // Add vertices
        batch.vertexData[vertexIndex * 2 + 0] = x1;
        batch.vertexData[vertexIndex * 2 + 1] = y1;
        batch.vertexData[vertexIndex * 2 + 2] = x2;
        batch.vertexData[vertexIndex * 2 + 3] = y2;
        batch.vertexData[vertexIndex * 2 + 4] = x3;
        batch.vertexData[vertexIndex * 2 + 5] = y3;
        batch.vertexData[vertexIndex * 2 + 6] = x4;
        batch.vertexData[vertexIndex * 2 + 7] = y4;

        // Calculate texture coordinates (assuming full texture for now)
        const imgWidth = texture.width || sWidth || dWidth;
        const imgHeight = texture.height || sHeight || dHeight;

        const u1 = sx / imgWidth;
        const v1 = 1.0 - (sy + sHeight) / imgHeight; // Flip Y
        const u2 = (sx + sWidth) / imgWidth;
        const v2 = 1.0 - sy / imgHeight; // Flip Y

        // Add texture coordinates
        batch.texCoordData[vertexIndex * 2 + 0] = u1; batch.texCoordData[vertexIndex * 2 + 1] = v2; // TL
        batch.texCoordData[vertexIndex * 2 + 2] = u2; batch.texCoordData[vertexIndex * 2 + 3] = v2; // TR
        batch.texCoordData[vertexIndex * 2 + 4] = u1; batch.texCoordData[vertexIndex * 2 + 5] = v1; // BL
        batch.texCoordData[vertexIndex * 2 + 6] = u2; batch.texCoordData[vertexIndex * 2 + 7] = v1; // BR

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
        batch.currentQuads += 1;
    }

    /*
    * Enhanced image batch system with texture atlas support
    */
    createImageBatchSystem() {
        // Create texture atlas for small images
        this.textureAtlas = {
            canvas: document.createElement('canvas'),
            ctx: null,
            width: 2048,
            height: 2048,
            regions: new Map(),
            currentX: 0,
            currentY: 0,
            rowHeight: 0,
            needsUpdate: false
        };

        this.textureAtlas.canvas.width = this.textureAtlas.width;
        this.textureAtlas.canvas.height = this.textureAtlas.height;
        this.textureAtlas.ctx = this.textureAtlas.canvas.getContext('2d');

        // Create atlas texture
        this.atlasTexture = null;

        // Improved batch buffer for images
        const gl = this.gl;
        const maxQuads = 5000; // Reduced for better stability

        this.imageBatchBuffer = {
            vertices: gl.createBuffer(),
            texCoords: gl.createBuffer(),
            indices: gl.createBuffer(),
            transformPos: gl.createBuffer(),    // Position transforms
            transformScale: gl.createBuffer(),  // Scale transforms
            transformRot: gl.createBuffer(),    // Rotation transforms
            transformAlpha: gl.createBuffer(),  // Alpha transforms

            maxQuads,
            currentQuads: 0,

            // Use typed arrays for better performance
            vertexData: new Float32Array(maxQuads * 8),     // 4 vertices * 2 coords
            texCoordData: new Float32Array(maxQuads * 8),   // 4 vertices * 2 tex coords
            indexData: new Uint16Array(maxQuads * 6),       // 2 triangles * 3 indices
            transformPosData: new Float32Array(maxQuads * 8),    // 4 vertices * 2 pos
            transformScaleData: new Float32Array(maxQuads * 8),  // 4 vertices * 2 scale
            transformRotData: new Float32Array(maxQuads * 4),    // 4 vertices * 1 rotation
            transformAlphaData: new Float32Array(maxQuads * 4),  // 4 vertices * 1 alpha

            currentTexture: null,
            textureCache: new Map(),

            // Pre-generate indices for better performance
            indicesGenerated: false
        };

        // Pre-generate all indices once
        this.preGenerateIndices();

        // Create instanced rendering shader
        this.createInstancedImageShader();
    }

    /*
     * Pre-generate indices for all possible quads
     */
    preGenerateIndices() {
        const batch = this.imageBatchBuffer;

        for (let i = 0; i < batch.maxQuads; i++) {
            const vertexIndex = i * 4;
            const indexOffset = i * 6;

            // First triangle
            batch.indexData[indexOffset + 0] = vertexIndex + 0;
            batch.indexData[indexOffset + 1] = vertexIndex + 1;
            batch.indexData[indexOffset + 2] = vertexIndex + 2;

            // Second triangle
            batch.indexData[indexOffset + 3] = vertexIndex + 1;
            batch.indexData[indexOffset + 4] = vertexIndex + 3;
            batch.indexData[indexOffset + 5] = vertexIndex + 2;
        }

        // Upload indices once
        const gl = this.gl;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, batch.indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, batch.indexData, gl.STATIC_DRAW);

        batch.indicesGenerated = true;
    }

    /*
     * Create instanced image shader for better performance
     */
    createInstancedImageShader() {
        const vertexShader = `
    precision highp float;
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    attribute vec2 a_transformPos;    // x, y position
    attribute vec2 a_transformScale;  // scaleX, scaleY
    attribute float a_transformRot;   // rotation
    attribute float a_transformAlpha; // alpha
    
    uniform vec2 u_resolution;
    uniform mat3 u_globalTransform;
    
    varying vec2 v_texCoord;
    varying float v_alpha;
    
    void main() {
        // Extract transform components
        vec2 position = a_transformPos;
        vec2 scale = a_transformScale;
        float rotation = a_transformRot;
        v_alpha = a_transformAlpha;
        
        // Apply local transform
        vec2 rotatedPos = a_position;
        if (rotation != 0.0) {
            float cos_r = cos(rotation);
            float sin_r = sin(rotation);
            rotatedPos = vec2(
                a_position.x * cos_r - a_position.y * sin_r,
                a_position.x * sin_r + a_position.y * cos_r
            );
        }
        
        vec2 scaledPos = rotatedPos * scale + position;
        
        // Apply global transform
        vec3 transformed = u_globalTransform * vec3(scaledPos, 1.0);
        
        // Convert to clip space
        vec2 clipSpace = (transformed.xy / u_resolution) * 2.0 - 1.0;
        clipSpace.y = -clipSpace.y;
        
        gl_Position = vec4(clipSpace, 0.0, 1.0);
        v_texCoord = a_texCoord;
    }
`;

        const fragmentShader = `
    precision mediump float;
    uniform sampler2D u_texture;
    uniform float u_globalAlpha;
    
    varying vec2 v_texCoord;
    varying float v_alpha;
    
    void main() {
        vec4 texColor = texture2D(u_texture, v_texCoord);
        gl_FragColor = vec4(texColor.rgb, texColor.a * v_alpha * u_globalAlpha);
    }
`;

        this.shaders.instancedImage = this.createShaderProgram(vertexShader, fragmentShader);
    }

    /*
     * Add image to texture atlas for small images
     */
    addToTextureAtlas(image) {
        const atlas = this.textureAtlas;
        const maxSize = 256; // Only atlas images smaller than this

        // Check if image is too large for atlas
        if (image.width > maxSize || image.height > maxSize) {
            return null;
        }

        // Check if already in atlas
        if (atlas.regions.has(image)) {
            return atlas.regions.get(image);
        }

        // Check if there's space
        if (atlas.currentX + image.width > atlas.width) {
            // Move to next row
            atlas.currentX = 0;
            atlas.currentY += atlas.rowHeight;
            atlas.rowHeight = 0;
        }

        if (atlas.currentY + image.height > atlas.height) {
            // Atlas is full
            return null;
        }

        // Add image to atlas
        const region = {
            x: atlas.currentX,
            y: atlas.currentY,
            width: image.width,
            height: image.height,
            u1: atlas.currentX / atlas.width,
            v1: atlas.currentY / atlas.height,
            u2: (atlas.currentX + image.width) / atlas.width,
            v2: (atlas.currentY + image.height) / atlas.height
        };

        atlas.ctx.drawImage(image, atlas.currentX, atlas.currentY);
        atlas.regions.set(image, region);
        atlas.needsUpdate = true;

        // Update position
        atlas.currentX += image.width;
        atlas.rowHeight = Math.max(atlas.rowHeight, image.height);

        return region;
    }

    /*
     * Update atlas texture
     */
    updateAtlasTexture() {
        const atlas = this.textureAtlas;
        if (!atlas.needsUpdate) return;

        if (!this.atlasTexture) {
            this.atlasTexture = this.gl.createTexture();
        }

        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        atlas.needsUpdate = false;
    }

    /*
     * Get or create texture from image
     */
    getOrCreateTexture(image) {
        // Check cache first
        if (this.textureCache.has(image)) {
            const cached = this.textureCache.get(image);
            if (this.gl.isTexture(cached.texture || cached)) {
                if (cached.lastUsed !== undefined) {
                    cached.lastUsed = performance.now();
                }
                return cached.texture || cached;
            }
            // Remove invalid texture
            this.textureCache.delete(image);
        }

        // Try to add to atlas first (for small images) - only if atlas is available
        if (this.textureAtlas) {
            const atlasRegion = this.addToTextureAtlas(image);
            if (atlasRegion) {
                this.updateAtlasTexture();
                this.textureCache.set(image, {
                    texture: this.atlasTexture,
                    atlas: atlasRegion,
                    lastUsed: performance.now()
                });
                return this.atlasTexture;
            }
        }

        // Create individual texture for large images
        return this.safeWebGLOperation(() => {
            const gl = this.gl;
            const texture = gl.createTexture();

            gl.bindTexture(gl.TEXTURE_2D, texture);

            // Use more efficient texture parameters
            const smoothing = this.state.imageSmoothingEnabled;
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, smoothing ? gl.LINEAR : gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, smoothing ? gl.LINEAR : gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            // Use efficient texture upload
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

            // Cache with metadata
            this.textureCache.set(image, {
                texture: texture,
                width: image.width || image.videoWidth || image.naturalWidth,
                height: image.height || image.videoHeight || image.naturalHeight,
                lastUsed: performance.now(),
                atlas: null
            });

            return texture;
        }, 'optimized texture creation');
    }

    /*
     * Clean up old textures when cache gets too large
     */
    cleanupOldTextures() {
        if (this.textureCache.size <= 50) return;

        let count = 0;
        const toDelete = [];

        for (const [image, texture] of this.textureCache.entries()) {
            if (count++ > 25) break; // Keep only the first 25
            toDelete.push([image, texture]);
        }

        toDelete.forEach(([image, texture]) => {
            if (this.gl && this.gl.isTexture(texture)) {
                this.gl.deleteTexture(texture);
            }
            this.textureCache.delete(image);
        });

        // console.log(`Cleaned up ${toDelete.length} old textures`);
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
        // Check if image is loaded
        if (!image || !image.complete || image.naturalWidth === 0) {
            //// console.warn('Image not loaded or invalid');
            return;
        }

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
        // Now just add to batch instead of rendering immediately
        this.addImageToBatch(texture, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
    }

    /*
    * Ellipse path
    * @param {number} x - X coordinate of center
    * @param {number} y - Y coordinate of center
    * @param {number} radiusX - Horizontal radius
    * @param {number} radiusY - Vertical radius
    * @param {number} rotation - Rotation in radians (optional)
    * @param {number} startAngle - Start angle in radians (optional)
    * @param {number} endAngle - End angle in radians (optional)
    * @param {boolean} counterclockwise - Direction (optional)
    */
    ellipse(x, y, radiusX, radiusY, rotation = 0, startAngle = 0, endAngle = 2 * Math.PI, counterclockwise = false) {
        // Transform the ellipse based on rotation
        this.save();
        this.translate(x, y);
        this.rotate(rotation);
        this.scale(radiusX, radiusY);
        this.arc(0, 0, 1, startAngle, endAngle, counterclockwise);
        this.restore();
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
    * Rounded rectangle path
    * @param {number} x - X coordinate of the rectangle
    * @param {number} y - Y coordinate of the rectangle
    * @param {number} width - Width of the rectangle
    * @param {number} height - Height of the rectangle
    * @param {number|Array} radii - Corner radii (single value or array of four values)
    */
    roundRect(x, y, width, height, radii = 0) {
        if (!Array.isArray(radii)) {
            radii = [radii, radii, radii, radii];
        } else if (radii.length === 1) {
            radii = [radii[0], radii[0], radii[0], radii[0]];
        } else if (radii.length === 2) {
            radii = [radii[0], radii[1], radii[0], radii[1]];
        }

        const [tl, tr, br, bl] = radii;

        this.beginPath();
        this.moveTo(x + tl, y);
        this.lineTo(x + width - tr, y);
        this.quadraticCurveTo(x + width, y, x + width, y + tr);
        this.lineTo(x + width, y + height - br);
        this.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
        this.lineTo(x + bl, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - bl);
        this.lineTo(x, y + tl);
        this.quadraticCurveTo(x, y, x + tl, y);
        this.closePath();
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
        // Clear any existing path to prevent unwanted connections
        this.beginPath();

        // For stroke circle, we need to draw a ring (hollow circle)
        // We can do this by drawing two circles: outer and inner
        const lineWidth = this.state.lineWidth;
        const outerRadius = radius + lineWidth / 2;
        const innerRadius = Math.max(0, radius - lineWidth / 2);

        if (innerRadius > 0) {
            // Draw as a ring using a custom approach
            this.addStrokeCircleToBatch(x, y, radius, lineWidth, this.state.strokeStyle);
        } else {
            // If inner radius is 0, just draw a filled circle
            this.addCircleToBatch(x, y, outerRadius, this.state.strokeStyle);
        }
    }

    /*
        * Enhanced drawLine method with proper line width support
        * Draws thick lines as rectangles for consistent cross-browser support
        * @param {number} x1 - X coordinate of the first point
        * @param {number} y1 - Y coordinate of the first point
        * @param {number} x2 - X coordinate of the second point
        * @param {number} y2 - Y coordinate of the second point
    */
    drawLine(x1, y1, x2, y2) {
        const lineWidth = this.state.lineWidth;

        // For line width of 1 or less, use the simple line rendering
        if (lineWidth <= 1) {
            this.drawThinLine(x1, y1, x2, y2);
            return;
        }

        // For thick lines, draw as rectangles
        this.drawThickLine(x1, y1, x2, y2, lineWidth);
    }

    /*
    * Draw line join between two segments
    * @param {Object} seg1 - First segment
    * @param {Object} seg2 - Second segment
    * @param {number} width - Line width
    */
    drawLineJoin(seg1, seg2, width) {
        const joinX = seg1.x2;
        const joinY = seg1.y2;
        const halfWidth = width / 2;

        if (this.state.lineJoin === 'round') {
            // Draw a circle at the join point
            this.fillCircle(joinX, joinY, halfWidth);
        } else if (this.state.lineJoin === 'bevel') {
            // Calculate bevel join geometry (simplified)
            // This is complex geometry, so for now just draw a circle
            this.fillCircle(joinX, joinY, halfWidth);
        }
        // For 'miter', we don't need to do anything extra as the rectangles will overlap
    }

    /*
     * Draw thin line using GL_LINES (original implementation)
     */
    drawThinLine(x1, y1, x2, y2) {
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
     * Draw thick line as a rectangle
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {number} width - Line width
     */
    drawThickLine(x1, y1, x2, y2, width) {
        // Calculate line direction and perpendicular
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) {
            // Draw a small circle for zero-length lines
            this.fillCircle(x1, y1, width / 2);
            return;
        }

        // Normalized perpendicular vector
        const perpX = -dy / length;
        const perpY = dx / length;

        // Half width offset
        const halfWidth = width / 2;
        const offsetX = perpX * halfWidth;
        const offsetY = perpY * halfWidth;

        // Calculate the four corners of the line rectangle
        const corners = [
            { x: x1 - offsetX, y: y1 - offsetY }, // Bottom-left of line start
            { x: x1 + offsetX, y: y1 + offsetY }, // Top-left of line start
            { x: x2 + offsetX, y: y2 + offsetY }, // Top-right of line end
            { x: x2 - offsetX, y: y2 - offsetY }  // Bottom-right of line end
        ];

        // Handle line caps
        if (this.state.lineCap !== 'butt') {
            this.drawLineWithCaps(corners, x1, y1, x2, y2, width, dx, dy, length);
        } else {
            this.drawLineRectangle(corners);
        }
    }

    /*
     * Draw line rectangle using the rectangle batch
     * @param {Array} corners - Four corner points
     */
    drawLineRectangle(corners) {
        const batch = this.batchBuffers.rectangles;

        if (batch.currentVertices + 4 > batch.maxVertices) {
            this.flushRectangles();
            batch.currentVertices = 0;
            batch.currentIndices = 0;
        }

        // Transform corners
        const transformedCorners = corners.map(corner =>
            this.transformPoint(corner.x, corner.y)
        );

        const vertexIndex = batch.currentVertices;
        const color = this.state.strokeStyle;

        // Apply global alpha
        const finalColor = [
            color[0],
            color[1],
            color[2],
            color[3] * this.state.globalAlpha
        ];

        // Add vertices (reorder for proper triangle winding)
        batch.vertexData[vertexIndex * 2 + 0] = transformedCorners[0][0]; // Bottom-left
        batch.vertexData[vertexIndex * 2 + 1] = transformedCorners[0][1];
        batch.vertexData[vertexIndex * 2 + 2] = transformedCorners[3][0]; // Bottom-right
        batch.vertexData[vertexIndex * 2 + 3] = transformedCorners[3][1];
        batch.vertexData[vertexIndex * 2 + 4] = transformedCorners[1][0]; // Top-left
        batch.vertexData[vertexIndex * 2 + 5] = transformedCorners[1][1];
        batch.vertexData[vertexIndex * 2 + 6] = transformedCorners[2][0]; // Top-right
        batch.vertexData[vertexIndex * 2 + 7] = transformedCorners[2][1];

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
     * Draw line with caps (round or square)
     * @param {Array} corners - Base rectangle corners
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {number} width - Line width
     * @param {number} dx - X direction
     * @param {number} dy - Y direction
     * @param {number} length - Line length
     */
    drawLineWithCaps(corners, x1, y1, x2, y2, width, dx, dy, length) {
        // Draw the main line rectangle
        this.drawLineRectangle(corners);

        const halfWidth = width / 2;

        if (this.state.lineCap === 'round') {
            // Draw round caps as circles
            this.fillCircle(x1, y1, halfWidth);
            this.fillCircle(x2, y2, halfWidth);
        } else if (this.state.lineCap === 'square') {
            // Extend the line by half width on each end
            const extendX = (dx / length) * halfWidth;
            const extendY = (dy / length) * halfWidth;

            // Extended corners
            const perpX = -dy / length;
            const perpY = dx / length;
            const offsetX = perpX * halfWidth;
            const offsetY = perpY * halfWidth;

            // Start cap
            const startCap = [
                { x: x1 - extendX - offsetX, y: y1 - extendY - offsetY },
                { x: x1 - extendX + offsetX, y: y1 - extendY + offsetY },
                { x: x1 + offsetX, y: y1 + offsetY },
                { x: x1 - offsetX, y: y1 - offsetY }
            ];

            // End cap
            const endCap = [
                { x: x2 - offsetX, y: y2 - offsetY },
                { x: x2 + offsetX, y: y2 + offsetY },
                { x: x2 + extendX + offsetX, y: y2 + extendY + offsetY },
                { x: x2 + extendX - offsetX, y: y2 + extendY - offsetY }
            ];

            this.drawLineRectangle(startCap);
            this.drawLineRectangle(endCap);
        }
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
        // If this is the start of a new path or we're at 0,0, move to the arc start point
        if (this.currentPath.length === 0 || (this.currentX === 0 && this.currentY === 0)) {
            const startX = x + Math.cos(startAngle) * radius;
            const startY = y + Math.sin(startAngle) * radius;
            this.moveTo(startX, startY);
        }

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
    * Fill the current path with a specific fill rule
    * @param {string} fillRule - 'nonzero' or 'evenodd'
    */
    fill(fillRule = 'nonzero') {
        this.renderPath(true, fillRule);
    }

    /*
    * Stroke the current path
    */
    stroke() {
        if (this.currentPath.length === 0) return;

        // If line width is thick, we need special handling
        if (this.state.lineWidth > 1) {
            this.renderThickStroke();
        } else {
            this.renderPath(false);
        }
    }

    /*
     * Render thick stroke for paths
     */
    renderThickStroke() {
        const segments = this.pathToSegments(this.currentPath);
        const lineWidth = this.state.lineWidth;

        // Draw each segment as a thick line
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            this.drawThickLine(segment.x1, segment.y1, segment.x2, segment.y2, lineWidth);

            // Handle line joins
            if (i > 0 && this.state.lineJoin !== 'miter') {
                const prevSegment = segments[i - 1];
                this.drawLineJoin(prevSegment, segment, lineWidth);
            }
        }
    }

    /*
    * Both fill and stroke the current path
    */
    fillAndStroke() {
        this.fill();
        this.stroke();
    }

    /*
    * Clear the current path without rendering
    */
    clearPath() {
        this.currentPath = [];
        this.currentX = 0;
        this.currentY = 0;
        this.pathStartX = 0;
        this.pathStartY = 0;
    }

    /*
    * Render the current path
    * @param {boolean} fill - Whether to fill (true) or stroke (false)
    * @param {string} fillRule - Fill rule for filling ('nonzero' or 'evenodd')
    */
    renderPath(fill, fillRule = 'nonzero') {
        if (this.currentPath.length === 0) return;

        if (fill) {
            // For filling, we need to triangulate the path
            const triangles = this.triangulatePath(this.currentPath, fillRule);
            if (triangles.length > 0) {
                this.renderTriangles(triangles, this.state.fillStyle);
            }
        } else {
            // For stroking, convert path to line segments
            const segments = this.pathToSegments(this.currentPath);
            for (const segment of segments) {
                this.drawLine(segment.x1, segment.y1, segment.x2, segment.y2);
            }
        }
    }

    /*
     * Triangulate a path for filling
     * Uses ear clipping algorithm for simple polygons
     * @param {Array} path - Path commands
     * @return {Array} - Array of triangles (each triangle is 6 values: x1,y1,x2,y2,x3,y3)
     */
    triangulatePath(path) {
        // Convert path to polygon points
        const polygons = this.pathToPolygons(path);
        const triangles = [];

        for (const polygon of polygons) {
            if (polygon.length < 3) continue;

            // Simple ear clipping triangulation
            const polyTriangles = this.earClipping(polygon);
            triangles.push(...polyTriangles);
        }

        return triangles;
    }

    /*
     * Convert path commands to polygon point arrays
     * @param {Array} path - Path commands
     * @return {Array} - Array of polygons (each polygon is array of {x, y} points)
     */
    pathToPolygons(path) {
        const polygons = [];
        let currentPolygon = [];
        let currentX = 0, currentY = 0;
        let startX = 0, startY = 0;

        for (const command of path) {
            switch (command.type) {
                case 'moveTo':
                    // Start new polygon if current one has points
                    if (currentPolygon.length > 0) {
                        polygons.push([...currentPolygon]);
                        currentPolygon = [];
                    }
                    currentX = command.x;
                    currentY = command.y;
                    startX = command.x;
                    startY = command.y;
                    currentPolygon.push({ x: currentX, y: currentY });
                    break;

                case 'lineTo':
                    currentX = command.x;
                    currentY = command.y;
                    currentPolygon.push({ x: currentX, y: currentY });
                    break;

                case 'quadraticCurveTo':
                    // Approximate curve with line segments
                    const quadPoints = this.approximateQuadraticPoints(
                        currentX, currentY,
                        command.cpx, command.cpy,
                        command.x, command.y,
                        16 // number of segments
                    );
                    currentPolygon.push(...quadPoints.slice(1)); // Skip first point as it's current position
                    currentX = command.x;
                    currentY = command.y;
                    break;

                case 'bezierCurveTo':
                    // Approximate curve with line segments
                    const bezierPoints = this.approximateBezierPoints(
                        currentX, currentY,
                        command.cp1x, command.cp1y,
                        command.cp2x, command.cp2y,
                        command.x, command.y,
                        16 // number of segments
                    );
                    currentPolygon.push(...bezierPoints.slice(1)); // Skip first point
                    currentX = command.x;
                    currentY = command.y;
                    break;

                case 'arc':
                    const arcPoints = this.approximateArcPoints(
                        command.x, command.y,
                        command.radius,
                        command.startAngle,
                        command.endAngle,
                        command.counterclockwise,
                        32 // number of segments
                    );
                    if (arcPoints.length > 0) {
                        currentPolygon.push(...arcPoints);
                        const lastPoint = arcPoints[arcPoints.length - 1];
                        currentX = lastPoint.x;
                        currentY = lastPoint.y;
                    }
                    break;

                case 'close':
                    if (currentPolygon.length > 0) {
                        // Close the polygon by ensuring it ends where it started
                        const first = currentPolygon[0];
                        const last = currentPolygon[currentPolygon.length - 1];
                        if (Math.abs(first.x - last.x) > 0.001 || Math.abs(first.y - last.y) > 0.001) {
                            currentPolygon.push({ x: startX, y: startY });
                        }
                    }
                    currentX = startX;
                    currentY = startY;
                    break;
            }
        }

        // Add final polygon if it has points
        if (currentPolygon.length > 0) {
            polygons.push(currentPolygon);
        }

        return polygons;
    }

    /*
     * Simple ear clipping triangulation
     * @param {Array} polygon - Array of {x, y} points
     * @return {Array} - Array of triangles
     */
    earClipping(polygon) {
        if (polygon.length < 3) return [];
        if (polygon.length === 3) {
            return [polygon[0], polygon[1], polygon[2]];
        }

        const triangles = [];
        const vertices = [...polygon];

        // Remove consecutive duplicate points
        for (let i = vertices.length - 1; i >= 0; i--) {
            const current = vertices[i];
            const next = vertices[(i + 1) % vertices.length];
            if (Math.abs(current.x - next.x) < 0.001 && Math.abs(current.y - next.y) < 0.001) {
                vertices.splice(i, 1);
            }
        }

        if (vertices.length < 3) return [];

        // Simple fan triangulation for convex polygons
        // This is a simplified version - full ear clipping is more complex
        const center = vertices[0];
        for (let i = 1; i < vertices.length - 1; i++) {
            triangles.push(center, vertices[i], vertices[i + 1]);
        }

        return triangles;
    }

    /*
     * Render triangles to the screen
     * @param {Array} triangles - Array of triangle vertices
     * @param {Array} color - RGBA color array
     */
    renderTriangles(triangles, color) {
        const batch = this.batchBuffers.rectangles; // Reuse rectangle batch buffer

        for (let i = 0; i < triangles.length; i += 3) {
            const p1 = triangles[i];
            const p2 = triangles[i + 1];
            const p3 = triangles[i + 2];

            // Check if batch is full (need 3 vertices, but buffer expects quads)
            if (batch.currentVertices + 4 > batch.maxVertices) {
                this.flushRectangles();
                batch.currentVertices = 0;
                batch.currentIndices = 0;
            }

            // Transform triangle vertices
            const [x1, y1] = this.transformPoint(p1.x, p1.y);
            const [x2, y2] = this.transformPoint(p2.x, p2.y);
            const [x3, y3] = this.transformPoint(p3.x, p3.y);

            // Create a degenerate quad by duplicating the third vertex
            const vertexIndex = batch.currentVertices;

            // Add vertices (triangle + duplicate third point to make quad)
            batch.vertexData[vertexIndex * 2 + 0] = x1;
            batch.vertexData[vertexIndex * 2 + 1] = y1;
            batch.vertexData[vertexIndex * 2 + 2] = x2;
            batch.vertexData[vertexIndex * 2 + 3] = y2;
            batch.vertexData[vertexIndex * 2 + 4] = x3;
            batch.vertexData[vertexIndex * 2 + 5] = y3;
            batch.vertexData[vertexIndex * 2 + 6] = x3; // Duplicate third point
            batch.vertexData[vertexIndex * 2 + 7] = y3;

            // Apply global alpha to colors
            const finalColor = [
                color[0],
                color[1],
                color[2],
                color[3] * this.state.globalAlpha
            ];

            // Add colors for all 4 vertices
            for (let j = 0; j < 4; j++) {
                batch.colorData[(vertexIndex + j) * 4 + 0] = finalColor[0];
                batch.colorData[(vertexIndex + j) * 4 + 1] = finalColor[1];
                batch.colorData[(vertexIndex + j) * 4 + 2] = finalColor[2];
                batch.colorData[(vertexIndex + j) * 4 + 3] = finalColor[3];
            }

            // Add indices to form triangle (first 3 indices form the triangle)
            const indexBase = batch.currentVertices;
            const indexOffset = batch.currentIndices;
            batch.indexData[indexOffset + 0] = indexBase + 0;
            batch.indexData[indexOffset + 1] = indexBase + 1;
            batch.indexData[indexOffset + 2] = indexBase + 2;
            // Degenerate second triangle (all same point)
            batch.indexData[indexOffset + 3] = indexBase + 2;
            batch.indexData[indexOffset + 4] = indexBase + 3;
            batch.indexData[indexOffset + 5] = indexBase + 2;

            batch.currentVertices += 4;
            batch.currentIndices += 6;
        }
    }

    /*
     * Approximate quadratic curve as points
     */
    approximateQuadraticPoints(x0, y0, cx, cy, x1, y1, segments) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = this.quadraticBezier(x0, y0, cx, cy, x1, y1, t);
            points.push({ x: point.x, y: point.y });
        }
        return points;
    }

    /*
     * Approximate cubic bezier curve as points
     */
    approximateBezierPoints(x0, y0, cx1, cy1, cx2, cy2, x1, y1, segments) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = this.cubicBezier(x0, y0, cx1, cy1, cx2, cy2, x1, y1, t);
            points.push({ x: point.x, y: point.y });
        }
        return points;
    }

    /*
     * Approximate arc as points
     */
    approximateArcPoints(cx, cy, radius, startAngle, endAngle, counterclockwise, segments) {
        const points = [];

        let totalAngle = endAngle - startAngle;
        if (counterclockwise) {
            if (totalAngle > 0) totalAngle -= 2 * Math.PI;
        } else {
            if (totalAngle < 0) totalAngle += 2 * Math.PI;
        }

        const angleStep = totalAngle / segments;

        for (let i = 0; i <= segments; i++) {
            const angle = startAngle + angleStep * i;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            points.push({ x, y });
        }

        return points;
    }

    /*
    * Convert path to line segments (updated to use enhanced version)
    * @param {Array} path - Path commands
    * @return {Array} - Array of line segments
    */
    pathToSegments(path) {
        return this.pathToSegmentsEnhanced(path);
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
 * Check if point is inside path
 * @param {number} x - X coordinate of the point
 * @param {number} y - Y coordinate of the point
 * @param {string} fillRule - Fill rule ('nonzero' or 'evenodd')
 * @return {boolean} - True if point is inside path, false otherwise
 */
    isPointInPath(x, y, fillRule = 'nonzero') {
        if (this.currentPath.length === 0) return false;

        // Convert path to polygons
        const polygons = this.pathToPolygons(this.currentPath);

        // Transform the test point using inverse of current transform
        const [testX, testY] = this.inverseTransformPoint(x, y);

        // Test against each polygon
        for (const polygon of polygons) {
            if (polygon.length < 3) continue;

            if (fillRule === 'evenodd') {
                if (this.pointInPolygonEvenOdd(testX, testY, polygon)) {
                    return true;
                }
            } else {
                if (this.pointInPolygonNonZero(testX, testY, polygon)) {
                    return true;
                }
            }
        }

        return false;
    }

    /*
     * Check if point is inside stroke
     * @param {number} x - X coordinate of the point
     * @param {number} y - Y coordinate of the point
     * @return {boolean} - True if point is inside stroke, false otherwise
     */
    isPointInStroke(x, y) {
        if (this.currentPath.length === 0) return false;

        // Transform the test point using inverse of current transform
        const [testX, testY] = this.inverseTransformPoint(x, y);

        // Convert path to line segments
        const segments = this.pathToSegments(this.currentPath);
        const lineWidth = this.state.lineWidth;
        const halfWidth = lineWidth / 2;

        // Test against each line segment
        for (const segment of segments) {
            if (this.pointNearLineSegment(testX, testY, segment.x1, segment.y1, segment.x2, segment.y2, halfWidth)) {
                return true;
            }
        }

        return false;
    }

    /*
     * Transform point using inverse of current transformation matrix
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @return {Array} - Transformed coordinates
     */
    inverseTransformPoint(x, y) {
        const m = this.state.transform;

        // Calculate determinant
        const det = m[0] * m[4] - m[1] * m[3];

        if (Math.abs(det) < 1e-10) {
            // Matrix is singular, return original point
            return [x, y];
        }

        // Calculate inverse matrix elements
        const invDet = 1 / det;
        const a = m[4] * invDet;
        const b = -m[1] * invDet;
        const c = -m[3] * invDet;
        const d = m[0] * invDet;
        const e = (m[3] * m[5] - m[4] * m[2]) * invDet;
        const f = (m[1] * m[2] - m[0] * m[5]) * invDet;

        // Apply inverse transformation
        return [
            a * x + c * y + e,
            b * x + d * y + f
        ];
    }

    /*
     * Point-in-polygon test using even-odd rule
     * @param {number} x - Test point X
     * @param {number} y - Test point Y
     * @param {Array} polygon - Array of {x, y} points
     * @return {boolean} - True if point is inside polygon
     */
    pointInPolygonEvenOdd(x, y, polygon) {
        let inside = false;
        const n = polygon.length;

        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;

            if (((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }

        return inside;
    }

    /*
     * Point-in-polygon test using non-zero winding rule
     * @param {number} x - Test point X
     * @param {number} y - Test point Y
     * @param {Array} polygon - Array of {x, y} points
     * @return {boolean} - True if point is inside polygon
     */
    pointInPolygonNonZero(x, y, polygon) {
        let winding = 0;
        const n = polygon.length;

        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;

            if (yi <= y) {
                if (yj > y) { // Upward crossing
                    if (this.isLeft(xi, yi, xj, yj, x, y) > 0) {
                        winding++;
                    }
                }
            } else {
                if (yj <= y) { // Downward crossing
                    if (this.isLeft(xi, yi, xj, yj, x, y) < 0) {
                        winding--;
                    }
                }
            }
        }

        return winding !== 0;
    }

    /*
     * Test if point is left of line segment
     * @param {number} x1 - Line start X
     * @param {number} y1 - Line start Y
     * @param {number} x2 - Line end X
     * @param {number} y2 - Line end Y
     * @param {number} px - Point X
     * @param {number} py - Point Y
     * @return {number} - Positive if left, negative if right, 0 if on line
     */
    isLeft(x1, y1, x2, y2, px, py) {
        return (x2 - x1) * (py - y1) - (px - x1) * (y2 - y1);
    }

    /*
     * Test if point is near a line segment (for stroke testing)
     * @param {number} px - Point X
     * @param {number} py - Point Y
     * @param {number} x1 - Line start X
     * @param {number} y1 - Line start Y
     * @param {number} x2 - Line end X
     * @param {number} y2 - Line end Y
     * @param {number} tolerance - Distance tolerance
     * @return {boolean} - True if point is within tolerance of line segment
     */
    pointNearLineSegment(px, py, x1, y1, x2, y2, tolerance) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) {
            // Line segment is a point
            const dist = Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
            return dist <= tolerance;
        }

        // Calculate the closest point on the line segment
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;

        // Calculate distance from point to closest point on segment
        const distance = Math.sqrt((px - closestX) * (px - closestX) + (py - closestY) * (py - closestY));

        return distance <= tolerance;
    }

    /*
     * Enhanced path to segments conversion that handles curves properly
     * @param {Array} path - Path commands
     * @return {Array} - Array of line segments with curve approximations
     */
    pathToSegmentsEnhanced(path) {
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
                        x2: command.x, y2: command.y,
                        type: 'line'
                    });
                    currentX = command.x;
                    currentY = command.y;
                    break;

                case 'quadraticCurveTo':
                    // Approximate curve with multiple line segments for better accuracy
                    const quadSegments = this.approximateQuadraticForTesting(
                        currentX, currentY,
                        command.cpx, command.cpy,
                        command.x, command.y,
                        20 // More segments for better accuracy
                    );
                    segments.push(...quadSegments);
                    currentX = command.x;
                    currentY = command.y;
                    break;

                case 'bezierCurveTo':
                    // Approximate curve with multiple line segments for better accuracy
                    const bezierSegments = this.approximateBezierForTesting(
                        currentX, currentY,
                        command.cp1x, command.cp1y,
                        command.cp2x, command.cp2y,
                        command.x, command.y,
                        20 // More segments for better accuracy
                    );
                    segments.push(...bezierSegments);
                    currentX = command.x;
                    currentY = command.y;
                    break;

                case 'arc':
                    const arcSegments = this.approximateArcForTesting(
                        command.x, command.y,
                        command.radius,
                        command.startAngle,
                        command.endAngle,
                        command.counterclockwise,
                        30 // More segments for circles
                    );
                    if (arcSegments.length > 0) {
                        // Connect to start of arc if needed
                        const firstPoint = arcSegments[0];
                        if (Math.abs(currentX - firstPoint.x1) > 0.001 || Math.abs(currentY - firstPoint.y1) > 0.001) {
                            segments.push({
                                x1: currentX, y1: currentY,
                                x2: firstPoint.x1, y2: firstPoint.y1,
                                type: 'line'
                            });
                        }
                        segments.push(...arcSegments);
                        const lastPoint = arcSegments[arcSegments.length - 1];
                        currentX = lastPoint.x2;
                        currentY = lastPoint.y2;
                    }
                    break;

                case 'close':
                    if (Math.abs(currentX - startX) > 0.001 || Math.abs(currentY - startY) > 0.001) {
                        segments.push({
                            x1: currentX, y1: currentY,
                            x2: startX, y2: startY,
                            type: 'line'
                        });
                    }
                    currentX = startX;
                    currentY = startY;
                    break;
            }
        }

        return segments;
    }

    /*
     * Approximate quadratic curve for testing (higher precision)
     */
    approximateQuadraticForTesting(x0, y0, cx, cy, x1, y1, segments) {
        const result = [];
        for (let i = 0; i < segments; i++) {
            const t1 = i / segments;
            const t2 = (i + 1) / segments;

            const p1 = this.quadraticBezier(x0, y0, cx, cy, x1, y1, t1);
            const p2 = this.quadraticBezier(x0, y0, cx, cy, x1, y1, t2);

            result.push({
                x1: p1.x, y1: p1.y,
                x2: p2.x, y2: p2.y,
                type: 'curve'
            });
        }
        return result;
    }

    /*
     * Approximate cubic bezier curve for testing (higher precision)
     */
    approximateBezierForTesting(x0, y0, cx1, cy1, cx2, cy2, x1, y1, segments) {
        const result = [];
        for (let i = 0; i < segments; i++) {
            const t1 = i / segments;
            const t2 = (i + 1) / segments;

            const p1 = this.cubicBezier(x0, y0, cx1, cy1, cx2, cy2, x1, y1, t1);
            const p2 = this.cubicBezier(x0, y0, cx1, cy1, cx2, cy2, x1, y1, t2);

            result.push({
                x1: p1.x, y1: p1.y,
                x2: p2.x, y2: p2.y,
                type: 'curve'
            });
        }
        return result;
    }

    /*
     * Approximate arc for testing (higher precision)
     */
    approximateArcForTesting(cx, cy, radius, startAngle, endAngle, counterclockwise, segments) {
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

            result.push({
                x1, y1, x2, y2,
                type: 'arc'
            });
        }

        return result;
    }

    /*
     * Put image data
     * @param {ImageData} imageData - Image data to put
     * @param {number} dx - Destination x
     * @param {number} dy - Destination y
     */
    putImageData(imageData, dx, dy, dirtyX = 0, dirtyY = 0, dirtyWidth, dirtyHeight) {
        // Handle dirty rectangle parameters
        dirtyWidth = dirtyWidth || imageData.width;
        dirtyHeight = dirtyHeight || imageData.height;

        // Create temporary canvas with just the dirty region
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = dirtyWidth;
        tempCanvas.height = dirtyHeight;
        const tempCtx = tempCanvas.getContext('2d');

        // Create ImageData for dirty region
        const dirtyImageData = tempCtx.createImageData(dirtyWidth, dirtyHeight);

        // Copy dirty region data
        for (let y = 0; y < dirtyHeight; y++) {
            for (let x = 0; x < dirtyWidth; x++) {
                const srcIdx = ((dirtyY + y) * imageData.width + (dirtyX + x)) * 4;
                const dstIdx = (y * dirtyWidth + x) * 4;

                dirtyImageData.data[dstIdx] = imageData.data[srcIdx];
                dirtyImageData.data[dstIdx + 1] = imageData.data[srcIdx + 1];
                dirtyImageData.data[dstIdx + 2] = imageData.data[srcIdx + 2];
                dirtyImageData.data[dstIdx + 3] = imageData.data[srcIdx + 3];
            }
        }

        tempCtx.putImageData(dirtyImageData, 0, 0);
        this.drawImage(tempCanvas, dx + dirtyX, dy + dirtyY);
    }

    /*
    * Get image data from the WebGL framebuffer
    * Reads pixel data from the specified region of the canvas
    * @param {number} sx - Source x coordinate (top-left origin)
    * @param {number} sy - Source y coordinate (top-left origin)
    * @param {number} sw - Source width
    * @param {number} sh - Source height
    * @return {ImageData} - ImageData object containing RGBA pixel data
    */
    getImageData(sx, sy, sw, sh) {
        if (!this.gl) {
            throw new Error('WebGL context not available');
        }

        // Ensure all pending draws are flushed to the framebuffer
        this.flush();

        // Clamp coordinates to canvas bounds
        sx = Math.max(0, Math.min(sx, this.width));
        sy = Math.max(0, Math.min(sy, this.height));
        sw = Math.max(0, Math.min(sw, this.width - sx));
        sh = Math.max(0, Math.min(sh, this.height - sy));

        if (sw === 0 || sh === 0) {
            return new ImageData(0, 0);
        }

        // WebGL uses bottom-left origin, so flip Y
        const glY = this.height - sy - sh;

        // Create array to hold pixel data (RGBA)
        const pixels = new Uint8Array(sw * sh * 4);

        // Bind the default framebuffer (0)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

        // Read pixels from the framebuffer
        this.gl.readPixels(sx, glY, sw, sh, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);

        // Create ImageData (this handles the RGBA format)
        const imageData = new ImageData(new Uint8ClampedArray(pixels), sw, sh);

        // Check for WebGL errors
        this.checkGLError('getImageData');

        return imageData;
    }

    /*
 * Get the entire canvas as a data URL (e.g., for saving or displaying)
 * @param {string} type - MIME type (default: 'image/png')
 * @param {number} quality - Quality for JPEG (0-1, ignored for PNG)
 * @return {string} - Data URL string
 */
    toDataURL(type = 'image/png', quality = 1.0) {
        // Get the full canvas image data
        const imageData = this.getImageData(0, 0, this.width, this.height);

        // Create a temporary 2D canvas to convert ImageData to data URL
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.width;
        tempCanvas.height = this.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Put the image data onto the temp canvas
        tempCtx.putImageData(imageData, 0, 0);

        // Get the data URL
        return tempCanvas.toDataURL(type, quality);
    }

    /*
     * Get the entire canvas as a blob (e.g., for downloading or uploading)
     * @param {string} type - MIME type (default: 'image/png')
     * @param {number} quality - Quality for JPEG (0-1, ignored for PNG)
     * @return {Promise<Blob>} - Promise resolving to a Blob
     */
    toBlob(type = 'image/png', quality = 1.0) {
        return new Promise((resolve, reject) => {
            // Get the full canvas image data
            const imageData = this.getImageData(0, 0, this.width, this.height);

            // Create a temporary 2D canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.width;
            tempCanvas.height = this.height;
            const tempCtx = tempCanvas.getContext('2d');

            // Put the image data onto the temp canvas
            tempCtx.putImageData(imageData, 0, 0);

            // Convert to blob
            tempCanvas.toBlob(resolve, type, quality);
        });
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
            // console.warn('clip() is partially implemented - full clipping requires stencil buffer');
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
            // console.error(`Failed to create shader "${name}":`, error);
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
 * Enhanced drawWithShader with context loss protection
 */
    drawWithShader(shaderName, vertices, indices = null, uniforms = {}, attributes = {}) {
        if (this.isContextLost()) {
            // console.warn('Skipping drawWithShader - WebGL context is lost');
            return;
        }

        try {
            const program = this.useShader(shaderName);
            const gl = this.gl;

            // Check if program is valid
            if (!program || !gl.isProgram(program)) {
                // console.error(`Invalid shader program: ${shaderName}`);
                return;
            }

            // Create vertex buffer if needed
            if (!this.customVertexBuffer) {
                this.customVertexBuffer = gl.createBuffer();
            }

            // Upload vertex data
            gl.bindBuffer(gl.ARRAY_BUFFER, this.customVertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

            // Set up position attribute (assuming it exists)
            if (program.attributes && program.attributes['a_position'] !== undefined) {
                gl.enableVertexAttribArray(program.attributes['a_position']);
                gl.vertexAttribPointer(program.attributes['a_position'], 2, gl.FLOAT, false, 0, 0);
            }

            // Set additional attributes
            Object.keys(attributes).forEach(name => {
                const location = program.attributes && program.attributes[name];
                if (location !== undefined && location >= 0) {
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
                const location = program.uniforms && program.uniforms[name];
                if (location !== null && location !== undefined) {
                    const value = uniforms[name];
                    if (Array.isArray(value)) {
                        switch (value.length) {
                            case 1: gl.uniform1f(location, value[0]); break;
                            case 2: gl.uniform2f(location, value[0], value[1]); break;
                            case 3: gl.uniform3f(location, value[0], value[1], value[2]); break;
                            case 4: gl.uniform4f(location, value[0], value[1], value[2], value[3]); break;
                            default: // console.warn(`Unsupported uniform array length for ${name}`);
                        }
                    } else if (typeof value === 'number') {
                        gl.uniform1f(location, value);
                    } else {
                        // console.warn(`Unsupported uniform type for ${name}:`, typeof value);
                    }
                }
            });

            // Set common uniforms if they exist
            if (program.uniforms && program.uniforms['u_resolution']) {
                gl.uniform2f(program.uniforms['u_resolution'], this.width, this.height);
            }
            if (program.uniforms && program.uniforms['u_globalAlpha']) {
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

            // Check for errors after drawing
            this.checkGLError(`drawWithShader(${shaderName})`);

        } catch (e) {
            // console.error(`Error in drawWithShader(${shaderName}):`, e);
            if (this.gl && this.gl.isContextLost()) {
                // console.warn('Context lost during drawWithShader');
                this.contextLost = true;
            }
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
        // Limit batch size to prevent memory issues that could cause context loss
        const maxSafeSize = 8000; // Reduced from potentially 10000+
        this.options.batchSize = Math.min(size, maxSafeSize);

        // console.log(`Batch size set to ${this.options.batchSize}`);

        // Recreate buffers with new size if WebGL is available
        if (this.gl && !this.isContextLost()) {
            this.safeWebGLOperation(() => {
                this.createBatchBuffers();
            }, 'batch buffer recreation');
        }
    }

    /*
    * Auto-adjust batch size based on performance
    */
    autoAdjustBatchSize() {
        if (this.contextLossCount > 2) {
            // If we've had multiple context losses, reduce batch size
            const newSize = Math.max(1000, this.options.batchSize * 0.7);
            // console.warn(`Reducing batch size to ${newSize} due to context instability`);
            this.setBatchSize(newSize);
        }
    }

    /*
    * Enhanced error checking with context loss detection
    */
    checkGLError(operation) {
        if (!this.gl || this.contextLost) return true;

        try {
            // First check if context is lost before calling getError
            if (this.gl.isContextLost()) {
                this.contextLost = true;
                this.clearResourcesOnContextLoss();
                return false;
            }

            const error = this.gl.getError();
            if (error !== this.gl.NO_ERROR) {
                let errorName = 'UNKNOWN_ERROR';
                switch (error) {
                    case this.gl.INVALID_ENUM: errorName = 'INVALID_ENUM'; break;
                    case this.gl.INVALID_VALUE: errorName = 'INVALID_VALUE'; break;
                    case this.gl.INVALID_OPERATION: errorName = 'INVALID_OPERATION'; break;
                    case this.gl.INVALID_FRAMEBUFFER_OPERATION: errorName = 'INVALID_FRAMEBUFFER_OPERATION'; break;
                    case this.gl.OUT_OF_MEMORY:
                        errorName = 'OUT_OF_MEMORY';
                        // OUT_OF_MEMORY can lead to context loss, so prepare for it
                        // console.warn('WebGL OUT_OF_MEMORY error - context loss may follow');
                        break;
                    case this.gl.CONTEXT_LOST_WEBGL:
                        errorName = 'CONTEXT_LOST_WEBGL';
                        this.contextLost = true;
                        this.clearResourcesOnContextLoss();
                        // console.error('WebGL context lost detected in checkGLError');
                        break;
                }

                // console.error(`WebGL error after ${operation}: ${errorName} (${error})`);
                return false;
            }
            return true;
        } catch (e) {
            // If getError itself throws, context is likely lost
            // console.warn('Error checking WebGL error state - context may be lost:', e);
            this.contextLost = true;
            this.clearResourcesOnContextLoss();
            return false;
        }
    }

    /*
     * Method to manually trigger context restore for testing
     */
    forceContextLoss() {
        if (this.loseContextExtension) {
            // console.log('Forcing context loss for testing...');
            this.loseContextExtension.loseContext();
        } else {
            // console.warn('WEBGL_lose_context extension not available');
        }
    }

    /*
     * Method to get context status
     */
    getContextStatus() {
        return {
            contextLost: this.contextLost,
            contextAvailable: !!this.gl,
            contextValid: this.gl && !this.gl.isContextLost(),
            contextLossCount: this.contextLossCount,
            disposing: this.disposing
        };
    }

    /**
     * Dispose of all WebGL resources and clean up
     * Call this when you're done with the canvas to prevent memory leaks
     */
    dispose() {
        // Clean up post-processing resources
        if (this.gl && !this.isContextLost()) {
            try {
                // Delete framebuffers
                if (this.postProcessing.framebuffers) {
                    this.postProcessing.framebuffers.forEach(fb => {
                        if (this.gl.isFramebuffer(fb)) {
                            this.gl.deleteFramebuffer(fb);
                        }
                    });
                }

                // Delete temp textures
                if (this.postProcessing.tempTextures) {
                    this.postProcessing.tempTextures.forEach(tex => {
                        if (this.gl.isTexture(tex)) {
                            this.gl.deleteTexture(tex);
                        }
                    });
                }

                // Delete quad buffers
                if (this.postProcessing.quadBuffer && this.gl.isBuffer(this.postProcessing.quadBuffer)) {
                    this.gl.deleteBuffer(this.postProcessing.quadBuffer);
                }
                if (this.postProcessing.quadIndexBuffer && this.gl.isBuffer(this.postProcessing.quadIndexBuffer)) {
                    this.gl.deleteBuffer(this.postProcessing.quadIndexBuffer);
                }
            } catch (e) {
                // console.warn('Error during post-processing cleanup:', e);
            }
        }

        // Set flag to prevent further operations
        this.disposing = true;

        // Clear context monitoring
        if (this.contextHealthCheck) {
            clearInterval(this.contextHealthCheck);
            this.contextHealthCheck = null;
        }

        // Clear all timers
        this.clearAllTimers();

        // Cancel any running animation frames
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Only try to delete WebGL resources if context exists and is not lost
        if (this.gl && !this.isContextLost()) {
            try {
                // Flush any pending operations first
                this.flush();

                // Clean up batch buffers
                if (this.batchBuffers) {
                    Object.values(this.batchBuffers).forEach(batch => {
                        if (batch) {
                            if (batch.vertices && this.gl.isBuffer(batch.vertices)) this.gl.deleteBuffer(batch.vertices);
                            if (batch.colors && this.gl.isBuffer(batch.colors)) this.gl.deleteBuffer(batch.colors);
                            if (batch.indices && this.gl.isBuffer(batch.indices)) this.gl.deleteBuffer(batch.indices);
                            if (batch.centers && this.gl.isBuffer(batch.centers)) this.gl.deleteBuffer(batch.centers);
                            if (batch.radii && this.gl.isBuffer(batch.radii)) this.gl.deleteBuffer(batch.radii);
                            if (batch.texCoords && this.gl.isBuffer(batch.texCoords)) this.gl.deleteBuffer(batch.texCoords);
                        }
                    });
                }

                // Clean up custom buffers
                if (this.customVertexBuffer && this.gl.isBuffer(this.customVertexBuffer)) {
                    this.gl.deleteBuffer(this.customVertexBuffer);
                }
                if (this.customIndexBuffer && this.gl.isBuffer(this.customIndexBuffer)) {
                    this.gl.deleteBuffer(this.customIndexBuffer);
                }

                // Clean up shaders
                if (this.shaders) {
                    Object.values(this.shaders).forEach(shader => {
                        if (shader && this.gl.isProgram(shader)) {
                            this.gl.deleteProgram(shader);
                        }
                    });
                }

                // Clean up textures
                if (this.textureCache) {
                    this.textureCache.forEach((texture) => {
                        if (this.gl.isTexture(texture)) {
                            this.gl.deleteTexture(texture);
                        }
                    });
                }
            } catch (e) {
                // console.warn('Error during WebGL cleanup (context may be lost):', e);
            }
        }

        // Don't force context loss in dispose - let it happen naturally
        // Clear references
        this.gl = null;
        this.ctx = null;
        this.shaders = {};
        this.state = null;
        this.contextLost = false;
        this.disposing = false;

        // Clear other references...
        if (this.textureCache) this.textureCache.clear();
        if (this.fontCache) this.fontCache.clear();

        // console.log('WebGLCanvas disposed successfully');
    }

    /*
     * Add safeguard to all WebGL operations
     */
    safeWebGLOperation(operation, errorMessage = 'WebGL operation failed') {
        if (this.disposing) {
            return false;
        }

        if (this.isContextLost()) {
            //// console.warn(`Skipping ${errorMessage} - WebGL context is lost`);
            return false;
        }

        if (!this.gl) {
            //// console.warn(`Skipping ${errorMessage} - WebGL context not available`);
            return false;
        }

        try {
            // Check context health before operation
            if (this.gl.isContextLost()) {
                // console.warn(`Context lost before ${errorMessage}`);
                this.contextLost = true;
                this.clearResourcesOnContextLoss();
                return false;
            }

            const result = operation();

            // Check context health after operation (but be careful about getError)
            if (this.gl.isContextLost()) {
                // console.warn(`Context lost after ${errorMessage}`);
                this.contextLost = true;
                this.clearResourcesOnContextLoss();
                return false;
            } else {
                // Only check for errors if context is still valid
                this.checkGLError(errorMessage);
            }

            return result;
        } catch (e) {
            if (this.gl && this.gl.isContextLost()) {
                // console.warn(`Context lost during ${errorMessage}`);
                this.contextLost = true;
                this.clearResourcesOnContextLoss();
            } else {
                // console.error(`Error during ${errorMessage}:`, e);
            }
            return false;
        }
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

        // Recreate post-processing framebuffers with new size
        if (this.postProcessing.enabled) {
            this.recreatePostProcessingFramebuffers();
        }
    }

    /*
     * Recreate framebuffers after resize
     */
    recreatePostProcessingFramebuffers() {
        const gl = this.gl;

        // Delete old framebuffers and textures
        this.postProcessing.framebuffers.forEach(fb => gl.deleteFramebuffer(fb));
        this.postProcessing.tempTextures.forEach(tex => gl.deleteTexture(tex));

        // Clear arrays
        this.postProcessing.framebuffers = [];
        this.postProcessing.tempTextures = [];

        // Recreate with new size
        this.createPostProcessingFramebuffers();
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