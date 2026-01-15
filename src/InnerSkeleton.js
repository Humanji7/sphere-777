import * as THREE from 'three'

/**
 * InnerSkeleton — Icosahedron wireframe inside the sphere
 * "The geometric core — structure becomes visible during birth"
 *
 * Visible only during onboarding (PROTO → CRYSTALLIZE phases)
 * Creates "sacred geometry" feel
 *
 * Performance: Single draw call, wireframe mode
 */
export class InnerSkeleton {
  constructor(radius = 1.5) {
    this.baseRadius = radius
    this.innerRadius = radius * 0.7  // Sits inside particle sphere
    this.opacity = 0
    this.visible = false
    this.rotationSpeed = 0.05  // Very slow organic rotation

    this._createGeometry()
    this._createMaterial()
    this._createMesh()
  }

  _createGeometry() {
    // Icosahedron (20 faces) — sacred geometry, platonic solid
    // Detail level 0 = basic 20-face icosahedron
    this.geometry = new THREE.IcosahedronGeometry(this.innerRadius, 0)

    // Convert to wireframe geometry for clean edges
    this.edgesGeometry = new THREE.EdgesGeometry(this.geometry)
  }

  _createMaterial() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uColor: { value: new THREE.Color(0x88aaff) },  // Soft blue
        uPulse: { value: 0 },  // 0-1, breathing pulse
        uAssemblyProgress: { value: 0 }  // 0-1, from OnboardingManager
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPulse;
        uniform float uAssemblyProgress;

        varying float vEdgeFactor;

        void main() {
          vec3 pos = position;

          // Subtle breathing pulse
          float pulse = sin(uTime * 2.0) * 0.02 * uPulse;
          pos *= 1.0 + pulse;

          // Assembly effect: vertices collapse to center when progress is low
          float assemblyScale = 0.2 + uAssemblyProgress * 0.8;
          pos *= assemblyScale;

          vEdgeFactor = 1.0;  // For potential edge glow

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform vec3 uColor;
        uniform float uPulse;

        varying float vEdgeFactor;

        void main() {
          // Glow effect based on pulse
          float glow = 1.0 + uPulse * 0.3;
          vec3 color = uColor * glow;

          gl_FragColor = vec4(color, uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }

  _createMesh() {
    // Use LineSegments for wireframe
    this.mesh = new THREE.LineSegments(this.edgesGeometry, this.material)
    this.mesh.visible = false
  }

  /**
   * Update skeleton animation
   * @param {number} delta - Frame delta time
   * @param {number} time - Total elapsed time
   * @param {number} assemblyProgress - 0-1, from OnboardingManager
   */
  update(delta, time, assemblyProgress = 1) {
    this.material.uniforms.uTime.value = time
    this.material.uniforms.uAssemblyProgress.value = assemblyProgress

    // Slow organic rotation
    this.mesh.rotation.x += delta * this.rotationSpeed * 0.7
    this.mesh.rotation.y += delta * this.rotationSpeed
    this.mesh.rotation.z += delta * this.rotationSpeed * 0.3

    // Update visibility based on opacity
    this.mesh.visible = this.visible && this.opacity > 0.01
    this.material.uniforms.uOpacity.value = this.opacity
  }

  /**
   * Set visibility (used during onboarding phases)
   * @param {boolean} visible
   */
  setVisible(visible) {
    this.visible = visible
    if (!visible) {
      this.mesh.visible = false
    }
  }

  /**
   * Set opacity (0-1)
   * @param {number} value
   */
  setOpacity(value) {
    this.opacity = Math.max(0, Math.min(1, value))
  }

  /**
   * Set pulse amount (for breathing synchronization)
   * @param {number} value - 0-1
   */
  setPulse(value) {
    this.material.uniforms.uPulse.value = Math.max(0, Math.min(1, value))
  }

  /**
   * Set color
   * @param {THREE.Color|number} color
   */
  setColor(color) {
    const c = color instanceof THREE.Color ? color : new THREE.Color(color)
    this.material.uniforms.uColor.value.copy(c)
  }

  /**
   * Sync with sphere rotation (optional, for cohesion)
   * @param {THREE.Euler} rotation
   */
  syncRotation(rotation) {
    // Skeleton rotates independently but can be offset
    // This is intentional — creates "nested" rotation feel
  }

  getMesh() {
    return this.mesh
  }

  dispose() {
    this.geometry.dispose()
    this.edgesGeometry.dispose()
    this.material.dispose()
  }
}
