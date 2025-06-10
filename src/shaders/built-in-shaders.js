/**
 * Built-in shaders for WebGLCanvas
 * These provide common shader effects that can be easily applied
 */

// Gradient shader
export const gradientShader = {
    vertex: `
        attribute vec2 a_position;
        uniform mat3 u_transform;
        uniform vec2 u_resolution;
        varying vec2 v_position;
        
        void main() {
            vec3 transformed = u_transform * vec3(a_position, 1.0);
            vec2 normalized = ((transformed.xy / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
            gl_Position = vec4(normalized, 0, 1);
            v_position = a_position;
        }
    `,
    fragment: `
        precision mediump float;
        uniform vec4 u_color1;
        uniform vec4 u_color2;
        uniform vec2 u_gradientStart;
        uniform vec2 u_gradientEnd;
        varying vec2 v_position;
        
        void main() {
            vec2 dir = u_gradientEnd - u_gradientStart;
            vec2 pos = v_position - u_gradientStart;
            float t = clamp(dot(pos, dir) / dot(dir, dir), 0.0, 1.0);
            gl_FragColor = mix(u_color1, u_color2, t);
        }
    `
};

// Texture shader
export const textureShader = {
    vertex: `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        uniform mat3 u_transform;
        uniform vec2 u_resolution;
        varying vec2 v_texCoord;
        
        void main() {
            vec3 transformed = u_transform * vec3(a_position, 1.0);
            vec2 normalized = ((transformed.xy / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
            gl_Position = vec4(normalized, 0, 1);
            v_texCoord = a_texCoord;
        }
    `,
    fragment: `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform vec4 u_color;
        varying vec2 v_texCoord;
        
        void main() {
            vec4 texColor = texture2D(u_texture, v_texCoord);
            gl_FragColor = texColor * u_color;
        }
    `
};

// Blur shader
export const blurShader = {
    vertex: `
        attribute vec2 a_position;
        uniform mat3 u_transform;
        uniform vec2 u_resolution;
        varying vec2 v_position;
        
        void main() {
            vec3 transformed = u_transform * vec3(a_position, 1.0);
            vec2 normalized = ((transformed.xy / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
            gl_Position = vec4(normalized, 0, 1);
            v_position = transformed.xy / u_resolution;
        }
    `,
    fragment: `
        precision mediump float;
        uniform sampler2D u_texture;
        uniform vec2 u_resolution;
        uniform float u_blurRadius;
        varying vec2 v_position;
        
        void main() {
            vec4 color = vec4(0.0);
            float total = 0.0;
            
            for (float x = -4.0; x <= 4.0; x++) {
                for (float y = -4.0; y <= 4.0; y++) {
                    vec2 offset = vec2(x, y) * u_blurRadius / u_resolution;
                    color += texture2D(u_texture, v_position + offset);
                    total += 1.0;
                }
            }
            
            gl_FragColor = color / total;
        }
    `
};

// Wave shader for animated effects
export const waveShader = {
    vertex: `
        attribute vec2 a_position;
        uniform mat3 u_transform;
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform float u_amplitude;
        uniform float u_frequency;
        varying vec2 v_position;
        
        void main() {
            vec2 pos = a_position;
            pos.y += sin(pos.x * u_frequency + u_time) * u_amplitude;
            
            vec3 transformed = u_transform * vec3(pos, 1.0);
            vec2 normalized = ((transformed.xy / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
            gl_Position = vec4(normalized, 0, 1);
            v_position = a_position;
        }
    `,
    fragment: `
        precision mediump float;
        uniform vec4 u_color;
        varying vec2 v_position;
        
        void main() {
            gl_FragColor = u_color;
        }
    `
};
