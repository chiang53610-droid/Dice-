import * as THREE from 'three';

/**
 * A realistic dice cup (骰盅) built from LatheGeometry.
 * - Wider opening at the bottom, narrower closed top.
 * - Thick walls with an inner hollow.
 * - Dark leather-like exterior material with a lighter interior.
 */
export class Cup extends THREE.Group {
  constructor() {
    super();

    // Dimensions
    const bottomRadius = 3.8;   // wide opening
    const topRadius = 2.8;   // narrower closed top
    const height = 5.5;
    const wallThick = 0.25;
    const topThick = 0.2;

    // --- Build the profile for LatheGeometry ---
    // The cup sits upside‑down: the closed end is at Y = height, the
    // open end at Y = 0.
    // Profile goes clockwise: outer bottom → outer top → inner top → inner bottom
    const pts: THREE.Vector2[] = [];

    // Outer wall (bottom → top)
    pts.push(new THREE.Vector2(bottomRadius, 0));
    pts.push(new THREE.Vector2(topRadius, height));

    // Top cap (outer edge → center → back to inner edge)
    pts.push(new THREE.Vector2(0, height));
    pts.push(new THREE.Vector2(0, height - topThick));

    // Inner wall (top → bottom)
    pts.push(new THREE.Vector2(topRadius - wallThick, height - topThick));
    pts.push(new THREE.Vector2(bottomRadius - wallThick, 0));

    const latheGeo = new THREE.LatheGeometry(pts, 48);

    // Material — dark matte "leather" exterior
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1c1c1e,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(latheGeo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.add(mesh);

    // Decorative rim ring at the opening
    const rimGeo = new THREE.TorusGeometry(bottomRadius - wallThick * 0.5, wallThick * 0.6, 12, 48);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x8b6914,
      roughness: 0.4,
      metalness: 0.6,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0;
    rim.castShadow = true;
    this.add(rim);

    // A second thin gold ring near the top for aesthetics
    const topRimGeo = new THREE.TorusGeometry(topRadius - wallThick * 0.5, wallThick * 0.35, 12, 48);
    const topRim = new THREE.Mesh(topRimGeo, rimMat);
    topRim.rotation.x = Math.PI / 2;
    topRim.position.y = height * 0.92;
    topRim.castShadow = true;
    this.add(topRim);
  }
}
