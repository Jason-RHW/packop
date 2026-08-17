import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { lengthSuffix, formatLength } from '../units.js'
import { addLinearDimension, disposeGroup, fitCameraDistance } from '../three-dims.js'
import { STANDARD_L, STANDARD_W, PALLET_THICKNESS } from '../pallet-constants.js'

export default function Pallet3D({ best, units, canvasHeight }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth
    const height = canvasHeight || 700

    const { pallet_l_l: cl, pallet_w_w: cw, pallet_h_h: ch, pallet_l_num: a, pallet_w_num: b, pallet_h_num: c } = best

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x163a5c)

    const totalHeight = PALLET_THICKNESS + ch * c
    const maxSpan = Math.max(STANDARD_L, STANDARD_W, totalHeight) * 1.8
    const target = new THREE.Vector3(0, totalHeight / 2, 0)

    const camera = new THREE.PerspectiveCamera(40, width / height, 10, 20000)
    const viewDir = new THREE.Vector3(0.55, 0.42, 0.6).normalize()
    const halfExtents = new THREE.Vector3(STANDARD_L / 2, totalHeight / 2, STANDARD_W / 2)
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
    controls.minDistance = 200
    controls.maxDistance = radius * 8
    controls.target.copy(target)
    controls.update()

    scene.add(new THREE.AmbientLight(0xffffff, 0.65))
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7)
    dirLight.position.set(maxSpan * 0.5, maxSpan, maxSpan * 0.3)
    scene.add(dirLight)

    // Standard pallet reference footprint (dashed boundary, on the ground)
    const pointsPallet = [
      new THREE.Vector3(-STANDARD_L / 2, 0.5, -STANDARD_W / 2),
      new THREE.Vector3(STANDARD_L / 2, 0.5, -STANDARD_W / 2),
      new THREE.Vector3(STANDARD_L / 2, 0.5, STANDARD_W / 2),
      new THREE.Vector3(-STANDARD_L / 2, 0.5, STANDARD_W / 2),
      new THREE.Vector3(-STANDARD_L / 2, 0.5, -STANDARD_W / 2),
    ]
    const palletLine = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(pointsPallet),
      new THREE.LineDashedMaterial({ color: 0xeaf3ff, dashSize: 20, gapSize: 14, transparent: true, opacity: 0.55 }),
    )
    palletLine.computeLineDistances()
    scene.add(palletLine)

    // Pallet deck slab
    const deckGeo = new THREE.BoxGeometry(STANDARD_L, PALLET_THICKNESS, STANDARD_W)
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x1c4568, transparent: true, opacity: 0.55, depthWrite: false })
    const deck = new THREE.Mesh(deckGeo, deckMat)
    deck.position.set(0, PALLET_THICKNESS / 2, 0)
    scene.add(deck)
    const deckEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(deckGeo),
      new THREE.LineBasicMaterial({ color: 0xeaf3ff, transparent: true, opacity: 0.5 }),
    )
    deckEdges.position.copy(deck.position)
    scene.add(deckEdges)

    // Cartons: a x b x c grid, centered on the pallet footprint
    const totalX = a * cl
    const totalZ = b * cw
    const startX = -totalX / 2 + cl / 2
    const startZ = -totalZ / 2 + cw / 2
    const startY = PALLET_THICKNESS + ch / 2

    const cartonGeo = new THREE.BoxGeometry(cl * 0.97, ch * 0.94, cw * 0.97)
    const cartonMat = new THREE.MeshStandardMaterial({ color: 0xc9a24b, transparent: true, opacity: 0.55, roughness: 0.85, metalness: 0, depthWrite: false })
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xf0d99a, transparent: true, opacity: 0.9 })
    const edgeGeo = new THREE.EdgesGeometry(cartonGeo)

    const group = new THREE.Group()
    for (let i = 0; i < a; i++) {
      for (let j = 0; j < b; j++) {
        for (let k = 0; k < c; k++) {
          const mesh = new THREE.Mesh(cartonGeo, cartonMat)
          const x = startX + i * cl
          const y = startY + k * ch
          const z = startZ + j * cw
          mesh.position.set(x, y, z)
          group.add(mesh)
          const edges = new THREE.LineSegments(edgeGeo, edgeMat)
          edges.position.set(x, y, z)
          group.add(edges)
        }
      }
    }
    scene.add(group)

    // ---- Dimension annotations: pallet length / width / total height ----
    const dimGroup = new THREE.Group()
    const suf = lengthSuffix(units)
    const fmt = (mm) => `${formatLength(mm, units)}${suf}`
    const labelScale = maxSpan * 0.045

    addLinearDimension(
      dimGroup,
      new THREE.Vector3(-STANDARD_L / 2, 0, -STANDARD_W / 2),
      new THREE.Vector3(STANDARD_L / 2, 0, -STANDARD_W / 2),
      new THREE.Vector3(0, 0, -1),
      150,
      `L ${fmt(STANDARD_L)}`,
      labelScale,
      `×${a} CARTONS`,
    )

    addLinearDimension(
      dimGroup,
      new THREE.Vector3(STANDARD_L / 2, 0, -STANDARD_W / 2),
      new THREE.Vector3(STANDARD_L / 2, 0, STANDARD_W / 2),
      new THREE.Vector3(1, 0, 0),
      150,
      `W ${fmt(STANDARD_W)}`,
      labelScale,
      `×${b} CARTONS`,
    )

    const heightExtDir = new THREE.Vector3(-1, 0, -1).normalize()
    addLinearDimension(
      dimGroup,
      new THREE.Vector3(-STANDARD_L / 2, 0, -STANDARD_W / 2),
      new THREE.Vector3(-STANDARD_L / 2, totalHeight, -STANDARD_W / 2),
      heightExtDir,
      150,
      `H ${fmt(totalHeight)}`,
      labelScale,
      `×${c} CARTONS`,
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
      cartonGeo.dispose()
      cartonMat.dispose()
      edgeGeo.dispose()
      deckGeo.dispose()
      deckMat.dispose()
      disposeGroup(dimGroup)
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [best, units, canvasHeight])

  return <div ref={mountRef} className="pallet3d-mount" style={{ height: canvasHeight || undefined }} />
}
