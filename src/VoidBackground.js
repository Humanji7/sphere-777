import * as THREE from 'three'

/**
 * VoidBackground — Fullscreen living darkness
 * "The void breathes. It watches. It waits."
 */
export class VoidBackground {
  constructor(scene) {
    this.scene = scene
    this._createMesh()
  }

  _createMesh() {
    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAwakening: { value: 0 },
        uPresencePos: { value: new THREE.Vector2(0.5, 0.5) },
        uBreathPhase: { value: 0 },
        uSeedVisible: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.999, 1.0);
        }
      `,
      fragmentShader: this._generateFragmentShader(),
      depthTest: false,
      depthWrite: false,
      transparent: true,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -1000 // Render first (behind everything)
    this.scene.add(this.mesh)
  }

  _generateFragmentShader() {
    return `
      uniform float uTime;
      uniform float uAwakening;
      uniform vec2 uPresencePos;
      uniform float uBreathPhase;
      uniform float uSeedVisible;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 5; i++) {
          value += amplitude * noise(p);
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 uv = vUv;
        vec2 center = vec2(0.5, 0.5);

        // Base: Deep space color (not pure black)
        vec3 voidBase = vec3(0.008, 0.005, 0.015);

        // Cosmic breathing
        float cosmicBreath = sin(uBreathPhase * 0.3) * 0.02;
        vec2 breathedUV = uv + (uv - center) * cosmicBreath;

        // Nebula hints
        float nebulaNoise = fbm(breathedUV * 3.0 + uTime * 0.05);
        float nebulaIntensity = nebulaNoise * 0.015 * uAwakening;
        vec3 nebulaColor = mix(
          vec3(0.05, 0.02, 0.1),
          vec3(0.02, 0.05, 0.1),
          fbm(breathedUV * 2.0)
        );

        // Presence (follows user)
        float presenceDist = distance(uv, uPresencePos);
        float presence = smoothstep(0.4, 0.0, presenceDist) * uAwakening * 0.03;

        // Convergence point (where seed appears)
        float convergeDist = distance(uv, center);
        float converge = smoothstep(0.3, 0.0, convergeDist) * uSeedVisible * 0.05;

        // Combine
        vec3 color = voidBase;
        color += nebulaColor * nebulaIntensity;
        color += vec3(0.1, 0.05, 0.15) * presence;
        color += vec3(0.2, 0.15, 0.3) * converge;

        // Vignette
        float vignette = 1.0 - smoothstep(0.3, 0.8, convergeDist);
        color *= 0.7 + vignette * 0.3;

        // Fade based on awakening (0 = black, 1 = full effect)
        float alpha = uAwakening > 0.01 ? 1.0 : 0.0;

        gl_FragColor = vec4(color, alpha);
      }
    `
  }

  update(time, breathPhase, awakening, seedVisible) {
    this.material.uniforms.uTime.value = time
    this.material.uniforms.uBreathPhase.value = breathPhase
    this.material.uniforms.uAwakening.value = awakening
    this.material.uniforms.uSeedVisible.value = seedVisible
  }

  setPresencePosition(x, y) {
    const current = this.material.uniforms.uPresencePos.value
    current.x += (x - current.x) * 0.02
    current.y += (y - current.y) * 0.02
  }

  setVisible(visible) {
    this.mesh.visible = visible
  }

  dispose() {
    this.scene.remove(this.mesh)
    this.material.dispose()
  }
}
