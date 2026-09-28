import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';

// The table's lights from Visual Pinball are photometric (candela); this project's lights are not,
// so they are scaled down to sit alongside the scene's own lighting.
const TABLE_LIGHT_SCALE = 0.0005;

// Parents a flipper's meshes to a new group at their pivot, so turning the group turns them
// about the pivot. Visual Pinball exports each flipper part positioned at the pivot.
const pivotGroupFor = (node) => {
  const pivot = new THREE.Group();
  pivot.position.copy(node.children[0].position);
  [...node.children].forEach(child => {
    child.position.sub(pivot.position);
    pivot.add(child);
  });
  node.add(pivot);
  return pivot;
}

// Draws the table with its own Visual Pinball visuals (exported by the importer as a GLB) and
// keeps the moving parts in step with the physics: flippers, plunger, and the ball.
export const TableView = async ({ scene, renderer, physics }) => {
  const { definition, table, ball, flippers, plunger } = physics;
  const { width, length } = definition.playfield;
  const gltf = await new GLTFLoader().loadAsync(definition.visuals.url);
  const model = gltf.scene;

  // Image-based lighting, so metal and plastic materials have something to reflect.
  if (scene.environment === null) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
  model.traverse(node => { if (node.isLight) node.intensity *= TABLE_LIGHT_SCALE; });

  // The plunger's visual tip is drawn fully forward; line it up with where the physics stops the
  // ball. Measured before the model is moved, so the box is in the GLB's own coordinates.
  const plungerParts = ['Tip', 'Rod', 'Spring']
    .map(part => model.getObjectByName(`${definition.plunger.name}${part}`))
    .filter(Boolean);
  const tipNode = model.getObjectByName(`${definition.plunger.name}Tip`);
  const plungerRestOffset = tipNode
    ? definition.plunger.tip[1] + length / 2 - new THREE.Box3().setFromObject(tipNode).min.z
    : 0;
  const plungerBase = plungerParts.map(part => part.position.z);

  // The GLB's origin is the playfield's top-left corner and its playfield is level. The table
  // frame's origin is the playfield centre, tilted and placed by the table body.
  model.position.set(-width / 2, 0, -length / 2);
  const tableGroup = new THREE.Group();
  const { x, y, z, w } = table.body.rotation();
  tableGroup.quaternion.set(x, y, z, w);
  tableGroup.add(model);
  scene.add(tableGroup);

  const flipperViews = flippers.map(flipper => {
    const node = model.getObjectByName(flipper.name);
    if (node === undefined || node.children.length === 0) return null;
    const { upSign } = definition.flippers.find(f => f.name === flipper.name);
    return { flipper, upSign, pivot: pivotGroupFor(node) };
  }).filter(Boolean);

  // Visual Pinball creates the ball at run time, so it is not in the GLB.
  const ballMesh = new THREE.Mesh(
    new THREE.SphereGeometry(ball.radius, 32, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.12 })
  );
  scene.add(ballMesh);

  const update = () => {
    // Follows the table body, so nudges move the whole table.
    const position = table.body.translation();
    tableGroup.position.set(position.x, position.y, position.z);

    flipperViews.forEach(({ flipper, upSign, pivot }) => { pivot.rotation.y = flipper.getStroke() * upSign; });

    const pull = plungerRestOffset + plunger.pullAmount * definition.plunger.pullDistance;
    plungerParts.forEach((part, i) => { part.position.z = plungerBase[i] + pull; });

    ballMesh.visible = ball.body.isEnabled();
    const ballPosition = ball.body.translation();
    const ballRotation = ball.body.rotation();
    ballMesh.position.set(ballPosition.x, ballPosition.y, ballPosition.z);
    ballMesh.quaternion.set(ballRotation.x, ballRotation.y, ballRotation.z, ballRotation.w);
  }

  return { update };
}
