// WebGL2 post stack: coloured-pencil grain, paper tooth, line boil, bloom, grade, vignette.
// Inputs: base paint canvas and additive glow canvas. Output: the GL canvas.

export interface Grade {
  exposure: number;
  contrast: number;
  saturation: number;
  lift: [number, number, number];
  gain: [number, number, number];
  gamma: [number, number, number];
  vignette: number;
  bloom: number;
  bloomThreshold: number;
  bloomRadius: number;
  grain: number;      // pencil texture amount
  hatch: number;      // directional stroke amount
  boil: number;       // edge wobble in 1080p px
  tooth: number;      // edge breakup in 1080p px
  paper: [number, number, number]; // paper colour (speckle)
  speckle: number;
  fade: number;       // 0..1 to fadeColor
  fadeColor: [number, number, number];
  glowGain: number;
  flicker: number;
}

export function defaultGrade(): Grade {
  return {
    exposure: 1, contrast: 1, saturation: 1,
    lift: [0, 0, 0], gain: [1, 1, 1], gamma: [1, 1, 1],
    vignette: 0.35, bloom: 0.7, bloomThreshold: 0.78, bloomRadius: 1,
    grain: 1, hatch: 1, boil: 1.4, tooth: 1.1,
    paper: [0.96, 0.93, 0.86], speckle: 1,
    fade: 0, fadeColor: [0, 0, 0], glowGain: 1, flicker: 1,
  };
}

const VS = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;

const FS_BRIGHT = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D uBase, uGlow; uniform float uThr; uniform vec2 uTexel;
void main(){
  vec3 acc = vec3(0.);
  // 4-tap box downsample
  for(int i=0;i<4;i++){
    vec2 off = vec2(float(i%2)-0.5, float(i/2)-0.5)*uTexel;
    vec3 b = texture(uBase, uv+off).rgb; vec3 g = texture(uGlow, uv+off).rgb;
    float l = dot(b, vec3(0.299,0.587,0.114));
    acc += g*0.6 + b*smoothstep(uThr, uThr+0.25, l);
  }
  o = vec4(acc*0.25, 1.);
}`;

const FS_BLUR = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D uTex; uniform vec2 uDir;
void main(){
  vec3 c = texture(uTex, uv).rgb*0.2270270270;
  c += texture(uTex, uv+uDir*1.3846153846).rgb*0.3162162162;
  c += texture(uTex, uv-uDir*1.3846153846).rgb*0.3162162162;
  c += texture(uTex, uv+uDir*3.2307692308).rgb*0.0702702703;
  c += texture(uTex, uv-uDir*3.2307692308).rgb*0.0702702703;
  o = vec4(c,1.);
}`;

const FS_FINAL = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D uBase, uGlow, uB1, uB2, uB3, uTooth, uHatch, uPaper;
uniform vec2 uRes; uniform float uScale; uniform float uBoilSeed;
uniform float uExposure, uContrast, uSat, uVig, uBloom, uGrain, uHatchAmt, uBoil, uToothAmt, uSpeckle, uFade, uGlowGain, uFlick;
uniform vec3 uLift, uGain, uGamma, uPaperCol, uFadeCol;

vec2 boilOff(float s){ return vec2(fract(sin(s*12.9898)*43758.5453), fract(sin(s*78.233)*12345.678)); }
float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }

void main(){
  vec2 px = uv*uRes/uScale;              // position in 1080p pixel units
  vec2 bo = boilOff(uBoilSeed);
  vec2 bo2 = boilOff(uBoilSeed+3.7);
  // low-frequency wobble (line boil)
  vec2 w = texture(uPaper, px/310. + bo).gb - 0.5;
  // high-frequency tooth jitter: breaks edges like pencil catching on paper
  vec2 j = texture(uTooth, px/180. + bo2).gb - 0.5;
  vec2 duv = (w*uBoil*2.0 + j*uToothAmt*2.0) * uScale / uRes;
  vec3 base = texture(uBase, uv + duv).rgb;
  vec3 glow = texture(uGlow, uv + duv*0.6).rgb * uGlowGain;

  // pencil texture: directional hatch + tooth
  float a1 = 1.02; // ~58 degrees, dominant right-hand diagonal
  mat2 R = mat2(cos(a1), -sin(a1), sin(a1), cos(a1));
  vec2 hp = R*px;
  float h1 = texture(uHatch, hp/vec2(260., 36.) + bo*0.7).r;
  float a2 = -0.42; mat2 R2 = mat2(cos(a2), -sin(a2), sin(a2), cos(a2));
  float h2 = texture(uHatch, (R2*px)/vec2(240., 30.) + bo2*0.7).r;
  float tooth = texture(uTooth, px/220. + bo*0.3).r;
  float L = luma(base);
  float midW = 1.0 - abs(L - 0.45)*1.35;           // texture strongest in mid tones
  float darkW = smoothstep(0.35, 0.05, L);           // cross-hatch in darks
  float g = (h1 - 0.5)*1.0*uHatchAmt + (h2-0.5)*0.55*darkW*uHatchAmt + (tooth - 0.5)*0.75;
  vec3 col = base * (1.0 + g*0.30*uGrain*(0.45+0.55*midW)) + g*0.022*uGrain;
  // paper speckle: pigment misses the tooth peaks
  float sp = smoothstep(0.80, 0.97, texture(uTooth, px/95. + bo2*0.5).r);
  col = mix(col, mix(col, uPaperCol*max(L*1.6, 0.25), 0.55), sp*0.30*uSpeckle);

  // glow with a little pencil texture so light shafts feel drawn
  glow *= 0.86 + 0.28*(h1 - 0.5) + 0.12*(tooth-0.5);
  col += glow;

  // bloom (three radii)
  vec3 bl = texture(uB1, uv).rgb*0.5 + texture(uB2, uv).rgb*0.7 + texture(uB3, uv).rgb*0.9;
  col += bl * uBloom;

  // grade
  col *= uExposure * (1.0 + (fract(sin(uBoilSeed*3.17)*9871.3)-0.5)*0.018*uFlick);
  col = max(col, 0.0);
  // soft shoulder tone-map so blazes don't clip harshly
  col = col / (1.0 + max(col - 0.85, 0.0)*0.9);
  col = pow(col, 1.0/uGamma);
  col = uLift + col*(uGain - uLift);
  float l2 = luma(col);
  col = mix(vec3(l2), col, uSat);
  col = (col - 0.5)*uContrast + 0.5;
  // vignette (oval, soft)
  vec2 q = uv - 0.5; q.x *= uRes.x/uRes.y*0.82;
  float vig = smoothstep(0.95, 0.25, length(q));
  col *= mix(1.0, vig, uVig);
  // large-scale paper mottling
  float m = texture(uPaper, px/900. + bo*0.02).r - 0.5;
  col *= 1.0 + m*0.06*uGrain;
  col = mix(col, uFadeCol, uFade);
  // dither
  float d = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233)))*43758.5453) - 0.5;
  o = vec4(clamp(col + d/255.0, 0.0, 1.0), 1.0);
}`;

type Tex = WebGLTexture;
interface FBO { fb: WebGLFramebuffer; tex: Tex; w: number; h: number; }

export class Post {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  W: number; H: number; scale: number;
  private progBright!: WebGLProgram; private progBlur!: WebGLProgram; private progFinal!: WebGLProgram;
  private texBase: Tex; private texGlow: Tex;
  private texTooth: Tex; private texHatch: Tex; private texPaper: Tex;
  private fbos: FBO[] = [];

  constructor(W: number, H: number, scale: number) {
    this.W = W; this.H = H; this.scale = scale;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W; this.canvas.height = H;
    const gl = this.canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.progBright = this.prog(FS_BRIGHT); this.progBlur = this.prog(FS_BLUR); this.progFinal = this.prog(FS_FINAL);
    this.texBase = this.makeTex(); this.texGlow = this.makeTex();
    this.texTooth = this.noiseTex(512, 'tooth'); this.texHatch = this.noiseTex(512, 'hatch'); this.texPaper = this.noiseTex(256, 'paper');
    // bloom chain: 1/4, 1/8, 1/16 res, two fbos each for ping-pong
    const sizes = [4, 8, 16];
    for (const s of sizes) {
      this.fbos.push(this.makeFBO(Math.ceil(W / s), Math.ceil(H / s)));
      this.fbos.push(this.makeFBO(Math.ceil(W / s), Math.ceil(H / s)));
    }
  }

  private prog(fs: string): WebGLProgram {
    const gl = this.gl;
    const sh = (t: number, s: string) => {
      const o = gl.createShader(t)!; gl.shaderSource(o, s); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o) || 'shader');
      return o;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    return p;
  }
  private makeTex(wrap = false): Tex {
    const gl = this.gl; const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const w = wrap ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w);
    return t;
  }
  private makeFBO(w: number, h: number): FBO {
    const gl = this.gl; const tex = this.makeTex();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb, tex, w, h };
  }

  /** Tileable procedural noise textures, generated once on the CPU. */
  private noiseTex(N: number, kind: 'tooth' | 'hatch' | 'paper'): Tex {
    const data = new Uint8Array(N * N * 4);
    // tileable value-noise lattice
    const lattice = (period: number, seed: number) => {
      const g = new Float32Array(period * period);
      let s = seed >>> 0;
      for (let i = 0; i < g.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; g[i] = s / 4294967296; }
      return (x: number, y: number) => {
        const fx = (x / N) * period, fy = (y / N) * period;
        const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const at = (a: number, b: number) => g[((b % period) + period) % period * period + ((a % period) + period) % period];
        const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1);
        return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
      };
    };
    if (kind === 'tooth') {
      const n1 = lattice(N / 2, 11), n2 = lattice(N / 4, 23), n3 = lattice(N / 8, 37);
      const m1 = lattice(N / 3 | 0, 51), m2 = lattice(N / 5 | 0, 67), q1 = lattice(N / 3 | 0, 91), q2 = lattice(N / 6 | 0, 97);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = (y * N + x) * 4;
        const v = n1(x, y) * 0.5 + n2(x, y) * 0.3 + n3(x, y) * 0.2;
        data[i] = Math.max(0, Math.min(255, (v - 0.5) * 1.9 * 255 + 128));
        data[i + 1] = (m1(x, y) * 0.6 + m2(x, y) * 0.4) * 255;
        data[i + 2] = (q1(x, y) * 0.6 + q2(x, y) * 0.4) * 255;
        data[i + 3] = 255;
      }
    } else if (kind === 'hatch') {
      // streaks: high frequency across (y), low along (x)
      const across = [lattice(N / 2, 5), lattice(N / 2, 9)];
      const along = lattice(16, 13);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = (y * N + x) * 4;
        // sample "across" noise at strongly anisotropic coords by compressing x
        const xs = (x / 24) | 0; // stretch along x by 24
        const v = across[0](xs * 3 % N, y) * 0.65 + across[1]((xs * 7 + 101) % N, (y + 7) % N) * 0.35;
        const mod = along(x, y) * 0.6 + 0.4;
        const s = Math.pow(v, 1.3) * mod;
        data[i] = Math.max(0, Math.min(255, (s - 0.35) * 2.4 * 255 + 128)); data[i + 1] = data[i]; data[i + 2] = data[i]; data[i + 3] = 255;
      }
    } else {
      const a = lattice(8, 3), b = lattice(16, 7), c = lattice(32, 17), d = lattice(8, 41), e = lattice(16, 43), f = lattice(8, 59), g2 = lattice(16, 61);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = (y * N + x) * 4;
        data[i] = (a(x, y) * 0.5 + b(x, y) * 0.3 + c(x, y) * 0.2) * 255;
        data[i + 1] = (d(x, y) * 0.7 + e(x, y) * 0.3) * 255;
        data[i + 2] = (f(x, y) * 0.7 + g2(x, y) * 0.3) * 255;
        data[i + 3] = 255;
      }
    }
    const gl = this.gl; const t = this.makeTex(true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    return t;
  }

  private draw(p: WebGLProgram, target: FBO | null) {
    const gl = this.gl;
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
    gl.viewport(0, 0, target ? target.w : this.W, target ? target.h : this.H);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  private bind(p: WebGLProgram, name: string, unit: number, tex: Tex) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(p, name), unit);
  }

  run(base: HTMLCanvasElement, glow: HTMLCanvasElement, g: Grade, boilSeed: number) {
    const gl = this.gl;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, this.texBase);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, base);
    gl.bindTexture(gl.TEXTURE_2D, this.texGlow);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); // glow is additive light: keep rgb premultiplied
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glow);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    // bright pass into 1/4
    const pb = this.progBright; gl.useProgram(pb);
    this.bind(pb, 'uBase', 0, this.texBase); this.bind(pb, 'uGlow', 1, this.texGlow);
    gl.uniform1f(gl.getUniformLocation(pb, 'uThr'), g.bloomThreshold);
    gl.uniform2f(gl.getUniformLocation(pb, 'uTexel'), 1 / this.fbos[0].w, 1 / this.fbos[0].h);
    this.draw(pb, this.fbos[0]);
    // blur chain
    const blur = (src: FBO, dst: FBO, dx: number, dy: number) => {
      const p = this.progBlur; gl.useProgram(p);
      this.bind(p, 'uTex', 0, src.tex);
      gl.uniform2f(gl.getUniformLocation(p, 'uDir'), dx / src.w, dy / src.h);
      this.draw(p, dst);
    };
    const r = g.bloomRadius;
    blur(this.fbos[0], this.fbos[1], r, 0); blur(this.fbos[1], this.fbos[0], 0, r);
    blur(this.fbos[0], this.fbos[2], r, 0); blur(this.fbos[2], this.fbos[3], 0, r); // 1/8
    blur(this.fbos[3], this.fbos[2], r, 0); blur(this.fbos[2], this.fbos[3], 0, r);
    blur(this.fbos[3], this.fbos[4], r, 0); blur(this.fbos[4], this.fbos[5], 0, r); // 1/16
    blur(this.fbos[5], this.fbos[4], r * 1.5, 0); blur(this.fbos[4], this.fbos[5], 0, r * 1.5);

    const p = this.progFinal; gl.useProgram(p);
    this.bind(p, 'uBase', 0, this.texBase); this.bind(p, 'uGlow', 1, this.texGlow);
    this.bind(p, 'uB1', 2, this.fbos[0].tex); this.bind(p, 'uB2', 3, this.fbos[3].tex); this.bind(p, 'uB3', 4, this.fbos[5].tex);
    this.bind(p, 'uTooth', 5, this.texTooth); this.bind(p, 'uHatch', 6, this.texHatch); this.bind(p, 'uPaper', 7, this.texPaper);
    const u1 = (n: string, v: number) => gl.uniform1f(gl.getUniformLocation(p, n), v);
    const u3 = (n: string, v: number[]) => gl.uniform3f(gl.getUniformLocation(p, n), v[0], v[1], v[2]);
    gl.uniform2f(gl.getUniformLocation(p, 'uRes'), this.W, this.H);
    u1('uScale', this.scale); u1('uBoilSeed', boilSeed);
    u1('uExposure', g.exposure); u1('uContrast', g.contrast); u1('uSat', g.saturation); u1('uVig', g.vignette);
    u1('uBloom', g.bloom); u1('uGrain', g.grain); u1('uHatchAmt', g.hatch); u1('uBoil', g.boil); u1('uToothAmt', g.tooth);
    u1('uSpeckle', g.speckle); u1('uFade', g.fade); u1('uGlowGain', g.glowGain); u1('uFlick', g.flicker);
    u3('uLift', g.lift); u3('uGain', g.gain); u3('uGamma', g.gamma); u3('uPaperCol', g.paper); u3('uFadeCol', g.fadeColor);
    this.draw(p, null);
  }

  readPixels(out: Uint8Array) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.readPixels(0, 0, this.W, this.H, gl.RGBA, gl.UNSIGNED_BYTE, out);
  }
}
