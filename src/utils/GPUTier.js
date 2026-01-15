/**
 * Detect GPU capabilities for progressive enhancement
 * Returns: 1 (low), 2 (mid), 3 (high)
 */
export function detectGPUTier() {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')

  if (!gl) return 1

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
  const renderer = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    : ''

  // Check for known low-end GPUs
  const lowEnd = /Mali-4|Adreno 3|PowerVR SGX|Apple A[789]|SM-J|SM-A[123]/i
  const midEnd = /Mali-G[567]|Adreno [56]|Apple A1[0-4]|Snapdragon [678]/i

  if (lowEnd.test(renderer)) return 1
  if (midEnd.test(renderer)) return 2

  // Check max texture size as fallback
  const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE)
  if (maxTexture < 4096) return 1
  if (maxTexture < 8192) return 2

  return 3
}
