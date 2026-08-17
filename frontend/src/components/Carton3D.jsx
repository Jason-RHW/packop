import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { lengthSuffix, formatLength } from '../units.js'
import { addLinearDimension, disposeGroup, fitCameraDistance } from '../three-dims.js'

export default function Carton3D({ best, units, canvasHeight }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth
    const height = canvasHeight || 700

    const {
      carton_length: CL, carton_width: CW, carton_height: CH,
      x_num: nx, y_num: ny, z_num: nz,
      box_l: bl, box_w: bw, box_h: bh,
    } = best

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x163a5c)

    const maxSpan = Math.max(CL, CW, CH) * 2.2
    const target = new THREE.Vector3(0, 0, 0)

    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 20000)
    const viewDir = new THREE.Vector3(0.55, 0.45, 0.6).normalize()
    const halfExtents = new THREE.Vector3(CL / 2, CH / 2, CW / 2)
    const distance = fitCameraDistance(camera, viewDir, halfExtents)
    camera.position.copy(target).addScaledVector(viewDir, distance)
    const radius = halfExtents.length()

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.innerHTML = ''
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 50
    controls.maxDistance = radius * 8
    controls.target.copy(target)
    controls.update()

    scene.add(new THREE.AmbientLight(0xffffff, 0.65))
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7)
    dirLight.position.set(maxSpan * 0.5, maxSpan, maxSpan * 0.3)
    scene.add(dirLight)

    // Carton shell -- centered at the origin
    const shellGeo = new THREE.BoxGeometry(CL, CH, CW)
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x1c4568, transparent: true, opacity: 0.08, depthWrite: false })
    const shell = new THREE.Mesh(shellGeo, shellMat)
    scene.add(shell)
    const shellEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(shellGeo),
      new THREE.LineBasicMaterial({ color: 0xeaf3ff, transparent: true, opacity: 0.7 }),
    )
    scene.add(shellEdges)

    // Inner boxes: nx x ny x nz grid, packed tight and centered inside the shell
    const totalX = nx * bl
    const totalZ = ny * bw
    const totalY = nz * bh
    const startX = -totalX / 2 + bl / 2
    const startZ = -totalZ / 2 + bw / 2
    const startY = -totalY / 2 + bh / 2

    const boxGeo = new THREE.BoxGeometry(bl * 0.96, bh * 0.9, bw * 0.96)
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xc9a24b, transparent: true, opacity: 0.6, roughness: 0.85, metalness: 0, depthWrite: false })
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xf0d99a, transparent: true, opacity: 0.9 })
    const edgeGeo = new THREE.EdgesGeometry(boxGeo)

    const group = new THREE.Group()
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        for (let k = 0; k < nz; k++) {
          const x = startX + i * bl
          const y = startY + k * bh
          const z = startZ + j * bw
          const mesh = new THREE.Mesh(boxGeo, boxMat)
          mesh.position.set(x, y, z)
          group.add(mesh)
          const edges = new THREE.LineSegments(edgeGeo, edgeMat)
          edges.position.set(x, y, z)
          group.add(edges)
        }
      }
    }
    scene.add(group)

    // ---- Dimension annotations: carton length / width / height ----
    const dimGroup = new THREE.Group()
    const suf = lengthSuffix(units)
    const fmt = (mm) => `${formatLength(mm, units)}${suf}`
    const labelScale = maxSpan * 0.05
    const extLen = Math.max(maxSpan * 0.08, 30)

    addLinearDimension(
      dimGroup,
      new THREE.Vector3(-CL / 2, -CH / 2, -CW / 2),
      new THREE.Vector3(CL / 2, -CH / 2, -CW / 2),
      new THREE.Vector3(0, 0, -1),
      extLen,
      `L ${fmt(CL)}`,
      labelScale,
      `×${nx} BOXES`,
    )

    addLinearDimension(
      dimGroup,
      new THREE.Vector3(CL / 2, -CH / 2, -CW / 2),
      new THREE.Vector3(CL / 2, -CH / 2, CW / 2),
      new THREE.Vector3(1, 0, 0),
      extLen,
      `W ${fmt(CW)}`,
      labelScale,
      `×${ny} BOXES`,
    )

    const heightExtDir = new THREE.Vector3(-1, 0, -1).normalize()
    addLinearDimension(
      dimGroup,
      new THREE.Vector3(-CL / 2, -CH / 2, -CW / 2),
      new THREE.Vector3(-CL / 2, CH / 2, -CW / 2),
      heightExtDir,
      extLen,
      `H ${fmt(CH)}`,
      labelScale,
      `×${nz} BOXES`,
    )

    scene.add(dimGroup)

    let frameId
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      const w = mount.clientWidth
      camera.aspect = w / height
      camera.updateProjectionMatrix()
      renderer.setSize(w, height)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(frameId)
      controls.dispose()
      renderer.dispose()
      shellGeo.dispose()
      shellMat.dispose()
      boxGeo.dispose()
      boxMat.dispose()
      edgeGeo.dispose()
      disposeGroup(dimGroup)
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [best, units, canvasHeight])

  return <div ref={mountRef} className="pallet3d-mount" style={{ height: canvasHeight || undefined }} />
}
