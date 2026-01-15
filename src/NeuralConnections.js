import * as THREE from 'three'

/**
 * NeuralConnections — Synaptic links between nearby particles
 * "Consciousness emerges from connections"
 *
 * GPU Tier 3 feature — electric blue synaptic connections flash
 * between nearby particles during PROTO stage (50-85% assembly).
 *
 * NOTE: This is a skeleton implementation. Full dynamic neighbor
 * detection pending performance testing on target devices.
 */
export class NeuralConnections {
  constructor(particleSystem, scene, maxConnections = 1500) {
    this.particleSystem = particleSystem
    this.scene = scene
    this.maxConnections = maxConnections
    this.connectionThreshold = 0.6  // Distance threshold for connections
    this._createGeometry()
  }

  _createGeometry() {
    // Pre-allocate connection geometry
    const positions = new Float32Array(this.maxConnections * 6)  // 2 points per line
    const intensities = new Float32Array(this.maxConnections * 2)

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('aIntensity', new THREE.BufferAttribute(intensities, 1))

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uVisibility: { value: 0 },
      },
      vertexShader: `
        attribute float aIntensity;
        varying float vIntensity;
        uniform float uTime;

        void main() {
          vIntensity = aIntensity;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vIntensity;
        uniform float uTime;
        uniform float uVisibility;

        void main() {
          // Electric blue synaptic color
          vec3 color = vec3(0.3, 0.7, 1.0);

          // Pulse effect
          float pulse = sin(uTime * 8.0 + vIntensity * 10.0) * 0.3 + 0.7;

          float alpha = vIntensity * pulse * uVisibility * 0.4;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.mesh = new THREE.LineSegments(this.geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.visible = false
    this.scene.add(this.mesh)

    // Pre-generate static connections (placeholder for dynamic detection)
    this._generateStaticConnections()
  }

  /**
   * Generate static connections between nearby particles
   * Placeholder — full implementation uses spatial hashing
   */
  _generateStaticConnections() {
    const ps = this.particleSystem
    const positions = this.geometry.attributes.position.array
    const intensities = this.geometry.attributes.aIntensity.array

    let connectionCount = 0

    // Simple brute-force for skeleton (will be optimized)
    for (let i = 0; i < Math.min(500, ps.count) && connectionCount < this.maxConnections; i++) {
      const i3 = i * 3
      const x1 = ps.originalPositions[i3]
      const y1 = ps.originalPositions[i3 + 1]
      const z1 = ps.originalPositions[i3 + 2]

      for (let j = i + 1; j < Math.min(500, ps.count) && connectionCount < this.maxConnections; j++) {
        const j3 = j * 3
        const x2 = ps.originalPositions[j3]
        const y2 = ps.originalPositions[j3 + 1]
        const z2 = ps.originalPositions[j3 + 2]

        const dist = Math.sqrt(
          (x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2
        )

        if (dist < this.connectionThreshold && dist > 0.1) {
          const c6 = connectionCount * 6
          const c2 = connectionCount * 2

          positions[c6] = x1
          positions[c6 + 1] = y1
          positions[c6 + 2] = z1
          positions[c6 + 3] = x2
          positions[c6 + 4] = y2
          positions[c6 + 5] = z2

          // Intensity based on distance (closer = stronger)
          const intensity = 1.0 - (dist / this.connectionThreshold)
          intensities[c2] = intensity
          intensities[c2 + 1] = intensity

          connectionCount++
        }
      }
    }

    this.activeConnections = connectionCount
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.aIntensity.needsUpdate = true

    // Limit draw range to active connections
    this.geometry.setDrawRange(0, connectionCount * 2)
  }

  /**
   * Update visibility based on assembly progress
   * Only visible in PROTO stage (0.5-0.85 assembly)
   */
  update(assemblyProgress, time) {
    // Visibility window: 50-85% assembly
    const visibility =
      this._smoothstep(0.5, 0.6, assemblyProgress) *
      (1.0 - this._smoothstep(0.8, 0.85, assemblyProgress))

    this.material.uniforms.uVisibility.value = visibility
    this.material.uniforms.uTime.value = time

    this.mesh.visible = visibility > 0.01
  }

  _smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)
  }

  setVisible(visible) {
    this.mesh.visible = visible
  }

  dispose() {
    this.scene.remove(this.mesh)
    this.geometry.dispose()
    this.material.dispose()
  }
}
