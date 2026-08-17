import * as THREE from 'three'

export const DIM_COLOR = 0xff8a6a

// Distance along viewDir (unit vector, camera looks back toward target) needed so an
// axis-aligned box of the given half-extents fits inside the camera's FOV from that
// specific angle -- tighter than a bounding-sphere fit, which frames for every possible
// rotation and leaves the model looking small at the default (unrotated) view.
export function fitCameraDistance(camera, viewDir, halfExtents, padding = 1.1) {
  const forward = viewDir.clone().negate()
  const worldUp = new THREE.Vector3(0, 1, 0)
  const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize()
  const up = new THREE.Vector3().crossVectors(right, forward).normalize()

  const apparentHalfWidth =
    Math.abs(right.x) * halfExtents.x + Math.abs(right.y) * halfExtents.y + Math.abs(right.z) * halfExtents.z
  const apparentHalfHeight =
    Math.abs(up.x) * halfExtents.x + Math.abs(up.y) * halfExtents.y + Math.abs(up.z) * halfExtents.z

  const vFov = (camera.fov * Math.PI) / 180
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)

  const distV = apparentHalfHeight / Math.tan(vFov / 2)
  const distH = apparentHalfWidth / Math.tan(hFov / 2)
  return Math.max(distV, distH) * padding
}

export function makeLabelSprite(text, worldScale, subtitle) {
  // Power-of-two canvas, supersampled well above final display size, so WebGL
  // can build a full mipmap chain -- without it, minifying the sprite when
  // zoomed out falls back to a filtering mode that looks soft/blurry.
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = subtitle ? 168 : 128
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(18, 51, 84, 0.9)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = '#ff8a6a'
  ctx.lineWidth = 5
  ctx.strokeRect(2.5, 2.5, canvas.width - 5, canvas.height - 5)
  ctx.fillStyle = '#ffe0d2'
  ctx.font = 'bold 52px Consolas, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, subtitle ? 60 : canvas.height / 2 + 3)

  if (subtitle) {
    ctx.font = 'bold 38px Consolas, monospace'
    ctx.fillStyle = 'rgba(255, 224, 210, 0.75)'
    ctx.fillText(subtitle, canvas.width / 2, 128)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 8
  texture.needsUpdate = true

  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(material)
  const aspect = canvas.width / canvas.height
  sprite.scale.set(worldScale * aspect, worldScale, 1)
  sprite.renderOrder = 999
  return sprite
}

// A dimension line with extension stubs from the measured edge, end ticks, and a label chip at the midpoint.
export function addLinearDimension(group, from, to, extDir, extLen, label, labelScale, subtitle) {
  const mat = new THREE.LineBasicMaterial({ color: DIM_COLOR, transparent: true, opacity: 0.85 })
  const offset = extDir.clone().multiplyScalar(extLen)
  const dimFrom = from.clone().add(offset)
  const dimTo = to.clone().add(offset)

  const segPts = [from, dimFrom, to, dimTo, dimFrom, dimTo]
  const lineGeo = new THREE.BufferGeometry().setFromPoints(segPts)
  group.add(new THREE.LineSegments(lineGeo, mat))

  const tickLen = Math.max(extLen * 0.3, 8)
  const tickVec = extDir.clone().multiplyScalar(tickLen / 2)
  const tickPts = [
    dimFrom.clone().sub(tickVec), dimFrom.clone().add(tickVec),
    dimTo.clone().sub(tickVec), dimTo.clone().add(tickVec),
  ]
  const tickGeo = new THREE.BufferGeometry().setFromPoints(tickPts)
  group.add(new THREE.LineSegments(tickGeo, mat))

  const mid = dimFrom.clone().add(dimTo).multiplyScalar(0.5)
  const sprite = makeLabelSprite(label, labelScale, subtitle)
  sprite.position.copy(mid)
  group.add(sprite)
}

export function disposeGroup(group) {
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose()
    if (obj.material) {
      if (obj.material.map) obj.material.map.dispose()
      obj.material.dispose()
    }
  })
}
