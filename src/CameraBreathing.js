import * as THREE from 'three'

/**
 * CameraBreathing — Camera breathes with the sphere
 * "The observer is not separate from the observed"
 */
export class CameraBreathing {
  constructor(camera) {
    this.camera = camera
    this.basePosition = camera.position.clone()
    this.baseDistance = camera.position.z
    this.breathAmount = 0.1  // 10% zoom variation
    this.enabled = false
  }

  enable() {
    this.enabled = true
    this.basePosition.copy(this.camera.position)
    this.baseDistance = this.camera.position.z
  }

  disable() {
    this.enabled = false
    this.camera.position.copy(this.basePosition)
  }

  update(breathPhase, assemblyProgress) {
    if (!this.enabled) return

    // Breathing amplitude increases with assembly
    const amplitude = this.breathAmount * assemblyProgress

    // Zoom: closer on inhale, further on exhale
    const breathOffset = Math.sin(breathPhase) * amplitude
    const distance = this.baseDistance - breathOffset

    // Subtle sway
    const sway = Math.sin(breathPhase * 0.5) * 0.02

    this.camera.position.z = distance
    this.camera.position.x = this.basePosition.x + sway
    this.camera.position.y = this.basePosition.y + sway * 0.5
  }

  /**
   * Trigger shake during ego death
   * @param {number} intensity - 0-1
   */
  shake(intensity) {
    if (!this.enabled) return

    this.camera.position.x += (Math.random() - 0.5) * intensity * 0.05
    this.camera.position.y += (Math.random() - 0.5) * intensity * 0.05
  }
}
