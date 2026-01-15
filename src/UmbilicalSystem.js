import * as THREE from 'three'

/**
 * UmbilicalSystem — Visible cords from nebula origin to forming particles
 * "Connection to the source, dissolving at birth"
 *
 * GPU Tier 2+ feature — golden-pink birth cords connect scattered
 * particle positions to their sphere destinations during assembly.
 * Dissolves starting at 70% assembly completion.
 */
export class UmbilicalSystem {
  constructor(particleSystem, scene) {
    this.particleSystem = particleSystem
    this.scene = scene
    this.cordCount = 300  // Subset of particles (performance)
    this._createCords()
  }

  _createCords() {
    // Select random particle indices for cords
    this.selectedIndices = []
    const total = this.particleSystem.count
    for (let i = 0; i < this.cordCount; i++) {
      this.selectedIndices.push(Math.floor(Math.random() * total))
    }

    // Line geometry (2 points per cord = 6 floats)
    const positions = new Float32Array(this.cordCount * 6)
    const opacities = new Float32Array(this.cordCount * 2)

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1))

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDissolveProgress: { value: 0 },
      },
      vertexShader: `
        attribute float aOpacity;
        varying float vOpacity;
        uniform float uTime;
        uniform float uDissolveProgress;

        void main() {
          vOpacity = aOpacity;
          vec3 pos = position;

          // Cord wavers gently
          float waveAmount = (1.0 - uDissolveProgress) * 0.05;
          pos.x += sin(uTime * 3.0 + position.y * 5.0) * waveAmount;
          pos.z += cos(uTime * 2.5 + position.y * 4.0) * waveAmount;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        uniform float uDissolveProgress;
        uniform float uTime;

        void main() {
          float dissolve = smoothstep(0.0, 1.0, uDissolveProgress);
          float alpha = vOpacity * (1.0 - dissolve);
          float pulse = sin(uTime * 4.0) * 0.2 + 0.8;
          alpha *= pulse;

          // Golden-pink birth cord color
          vec3 color = mix(
            vec3(1.0, 0.7, 0.5),   // Warm gold
            vec3(1.0, 0.5, 0.7),   // Soft pink
            sin(uTime * 2.0) * 0.5 + 0.5
          );

          gl_FragColor = vec4(color, alpha * 0.3);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.mesh = new THREE.LineSegments(this.geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.visible = false  // Start hidden
    this.scene.add(this.mesh)
  }

  /**
   * Update cord positions based on assembly progress
   * @param {number} assemblyProgress - 0 (nebula) to 1 (sphere)
   * @param {number} time - Elapsed time in seconds
   */
  update(assemblyProgress, time) {
    const positions = this.geometry.attributes.position.array
    const opacities = this.geometry.attributes.aOpacity.array
    const ps = this.particleSystem

    for (let i = 0; i < this.cordCount; i++) {
      const particleIdx = this.selectedIndices[i]
      const i6 = i * 6
      const i2 = i * 2
      const p3 = particleIdx * 3

      // Start point: scattered (nebula) position
      positions[i6] = ps.scatteredPositions[p3]
      positions[i6 + 1] = ps.scatteredPositions[p3 + 1]
      positions[i6 + 2] = ps.scatteredPositions[p3 + 2]

      // End point: current interpolated position toward sphere
      const t = assemblyProgress
      positions[i6 + 3] = ps.scatteredPositions[p3] * (1 - t) + ps.originalPositions[p3] * t
      positions[i6 + 4] = ps.scatteredPositions[p3 + 1] * (1 - t) + ps.originalPositions[p3 + 1] * t
      positions[i6 + 5] = ps.scatteredPositions[p3 + 2] * (1 - t) + ps.originalPositions[p3 + 2] * t

      // Opacity fades as assembly completes
      opacities[i2] = 1.0 - assemblyProgress
      opacities[i2 + 1] = 1.0 - assemblyProgress
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.aOpacity.needsUpdate = true

    // Dissolve starts at 70% assembly
    const dissolveProgress = Math.max(0, (assemblyProgress - 0.7) / 0.3)
    this.material.uniforms.uDissolveProgress.value = dissolveProgress
    this.material.uniforms.uTime.value = time

    // Visibility: show during assembly, hide when dissolved
    this.mesh.visible = assemblyProgress > 0.01 && assemblyProgress < 0.95
  }

  /**
   * Force visibility state
   */
  setVisible(visible) {
    this.mesh.visible = visible
  }

  dispose() {
    this.scene.remove(this.mesh)
    this.geometry.dispose()
    this.material.dispose()
  }
}
