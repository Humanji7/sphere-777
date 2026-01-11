/**
 * BeetleShell.js — Хитиновый Панцирь Жука (State A)
 * 
 * Визуал: Сегментированная оболочка. Хитиновая текстура. 
 * Матовый органически-неприятный блеск с bio-luminescent швами.
 * 
 * Eerie-элемент: "Частицы были личинками?.. 
 * Или частицы — это была маскировка?"
 */

import * as THREE from 'three'
import { BaseShell } from './BaseShell.js'

export class BeetleShell extends BaseShell {
    constructor(scene) {
        super(scene)

        this.config = {
            holdDuration: 8.0,       // Longer hold for Eerie effect
            eerieIntensity: 1.2,
            // Beetle-specific
            segmentCount: 8,         // Horizontal segments
            chitinColor: 0x1a1a0f,   // Dark olive-brown
            highlightColor: 0x3d3d2b, // Lighter chitin sheen
            seamGlowColor: 0x2a4a3a, // Sickly green seams
            pulseSpeed: 0.3,         // Slow disturbing pulse
            seamGlow: 0.5            // Glow intensity in seams
        }

        this._createGeometry()
        this._createMaterial()
        this._createMesh()
    }

    _createGeometry() {
        // Icosahedron for organic segmented feel
        const baseGeom = new THREE.IcosahedronGeometry(1.5, 2)
        this.geometry = baseGeom

        // Add segment ID attribute based on vertical position
        const positions = this.geometry.attributes.position
        const segments = new Float32Array(positions.count)
        const normals = this.geometry.attributes.normal

        for (let i = 0; i < positions.count; i++) {
            const y = positions.getY(i)
            // Assign segment based on vertical position (0-7)
            const normalizedY = (y + 1.5) / 3.0  // 0-1
            segments[i] = Math.floor(normalizedY * this.config.segmentCount)
        }

        this.geometry.setAttribute('aSegment', new THREE.BufferAttribute(segments, 1))
    }

    _createMaterial() {
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uOpacity: { value: 0 },
                uChitinColor: { value: new THREE.Color(this.config.chitinColor) },
                uHighlightColor: { value: new THREE.Color(this.config.highlightColor) },
                uSeamGlowColor: { value: new THREE.Color(this.config.seamGlowColor) },
                uSeamGlow: { value: this.config.seamGlow },
                uPulseSpeed: { value: this.config.pulseSpeed },
                uSegmentCount: { value: this.config.segmentCount }
            },
            vertexShader: `
        attribute float aSegment;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying float vSegment;
        varying float vEdgeFactor;
        
        uniform float uTime;
        uniform float uPulseSpeed;
        uniform float uSegmentCount;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vSegment = aSegment;
          
          // Calculate edge factor (distance from segment boundary)
          // 0 at edges (seams), 1 in center of segment
          float normalizedY = (position.y + 1.5) / 3.0;
          float segmentPos = fract(normalizedY * uSegmentCount);
          vEdgeFactor = min(segmentPos, 1.0 - segmentPos) * 2.0;
          vEdgeFactor = smoothstep(0.0, 0.15, vEdgeFactor);  // Sharp seam transition
          
          // Subtle breathing (disturbing, slow)
          float pulse = sin(uTime * uPulseSpeed) * 0.015;
          vec3 displaced = position + normal * pulse;
          
          // Segment separation at seams (plates slightly apart)
          vec3 dir = normalize(position);
          float separation = (1.0 - vEdgeFactor) * 0.02;
          displaced += dir * separation;
          
          vWorldPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
            fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uChitinColor;
        uniform vec3 uHighlightColor;
        uniform vec3 uSeamGlowColor;
        uniform float uSeamGlow;
        uniform float uPulseSpeed;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying float vSegment;
        varying float vEdgeFactor;
        
        void main() {
          // Early discard for fully transparent
          if (uOpacity < 0.01) discard;
          
          // Fresnel for chitin iridescent sheen
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float fresnel = pow(1.0 - max(0.0, dot(viewDir, vNormal)), 3.0);
          
          // Base chitin color with iridescence
          vec3 baseColor = mix(uChitinColor, uHighlightColor, fresnel * 0.5);
          
          // Segment variation (slight color shift per segment)
          float segmentHue = sin(vSegment * 0.7) * 0.05;
          baseColor.r += segmentHue;
          baseColor.g -= segmentHue * 0.5;
          
          // Bio-luminescent seam glow
          float edgeGlow = (1.0 - vEdgeFactor) * uSeamGlow;
          baseColor = mix(baseColor, uSeamGlowColor, edgeGlow);
          
          // Subtle pulsing (per-segment phase offset)
          float pulse = sin(uTime * uPulseSpeed * 2.0 + vSegment * 0.4) * 0.08 + 0.92;
          baseColor *= pulse;
          
          // Additional surface noise (chitin texture feel)
          float noise = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
          baseColor *= 0.95 + noise * 0.05;
          
          gl_FragColor = vec4(baseColor, uOpacity);
        }
      `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.NormalBlending
        })
    }

    _createMesh() {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.renderOrder = 10  // Render on top of particles
    }

    _animate(delta, elapsed) {
        if (this.material && this.material.uniforms) {
            this.material.uniforms.uTime.value = elapsed
            this.material.uniforms.uOpacity.value = this.opacity
        }

        // Slow unsettling rotation
        if (this.mesh && this.isVisible) {
            this.mesh.rotation.y += delta * 0.03
            this.mesh.rotation.z = Math.sin(elapsed * 0.15) * 0.02
            // Slight wobble
            this.mesh.rotation.x = Math.sin(elapsed * 0.1) * 0.01
        }
    }
}
