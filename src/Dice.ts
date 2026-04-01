import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { diceFaceMaterials } from './diceTexture';

export class Dice extends THREE.Group {
  public mesh: THREE.Mesh;
  public currentValue: number = 1;
  // Store the target rotation for animation
  public targetRotation = new THREE.Euler();

  constructor(size = 1) {
    super();

    // BoxGeometry face order: [+x, -x, +y, -y, +z, -z]
    // Standard dice: opposite faces sum to 7
    //   +x: 3   -x: 4
    //   +y: 1   -y: 6
    //   +z: 2   -z: 5
    const materials = [
      diceFaceMaterials[2], // +x = face 3
      diceFaceMaterials[3], // -x = face 4
      diceFaceMaterials[0], // +y = face 1
      diceFaceMaterials[5], // -y = face 6
      diceFaceMaterials[1], // +z = face 2
      diceFaceMaterials[4], // -z = face 5
    ];

    const geometry = new RoundedBoxGeometry(size, size, size, 6, size * 0.12);
    this.mesh = new THREE.Mesh(geometry, materials);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    this.add(this.mesh);
  }

  /**
   * Set the rotation so that `value` faces UP (+y direction).
   * Also adds a random spin around the world Y‑axis so dice look natural.
   */
  setFaceUp(value: number) {
    this.currentValue = value;

    // Reset
    this.rotation.set(0, 0, 0);

    // Rotate so the desired face points up
    // Default layout: 1→+y, 6→-y, 2→+z, 5→-z, 3→+x, 4→-x
    switch (value) {
      case 1: /* already on top */ break;
      case 6: this.rotateX(Math.PI); break;
      case 2: this.rotateX(-Math.PI / 2); break;
      case 5: this.rotateX(Math.PI / 2); break;
      case 3: this.rotateZ(Math.PI / 2); break;
      case 4: this.rotateZ(-Math.PI / 2); break;
    }

    // Random spin around world‑Y so they don't all face the same direction
    const randomY = Math.random() * Math.PI * 2;
    this.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), randomY);

    // Store for animation
    this.targetRotation.copy(this.rotation);
  }
}
