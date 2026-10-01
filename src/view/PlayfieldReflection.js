import * as THREE from 'three';

// Objects on this three.js layer appear in playfield reflections (see TableView).
export const REFLECTION_LAYER = 1;

const ReflectionShader = {
  uniforms: {
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    strength: { value: 0.3 }
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    void main() {
      vUv = textureMatrix * vec4( position, 1.0 );
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float strength;
    varying vec4 vUv;
    void main() {
      // Blended over the playfield by \`strength\` wherever something is reflected (alpha 1),
      // as Visual Pinball blends its playfield reflections. Empty areas are transparent.
      vec4 reflected = texture2DProj( tDiffuse, vUv );
      gl_FragColor = vec4( reflected.rgb, reflected.a * strength );
    }`
};

// A planar reflection laid over the playfield, adapted from three.js's Reflector. Each frame it
// renders the objects on REFLECTION_LAYER mirrored in its plane (everything below the plane is
// clipped away), then blends that image over the playfield at `strength`, as Visual Pinball does.
// The plane faces along its local +z.
export class PlayfieldReflection extends THREE.Mesh {
  constructor (geometry, { strength, resolution = 1024 }) {
    super(geometry);
    const renderTarget = new THREE.WebGLRenderTarget(resolution, resolution);
    const textureMatrix = new THREE.Matrix4();
    const virtualCamera = new THREE.PerspectiveCamera();
    virtualCamera.layers.set(REFLECTION_LAYER);

    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(ReflectionShader.uniforms),
      vertexShader: ReflectionShader.vertexShader,
      fragmentShader: ReflectionShader.fragmentShader,
      transparent: true,
      depthWrite: false
    });
    this.material.uniforms.tDiffuse.value = renderTarget.texture;
    this.material.uniforms.textureMatrix.value = textureMatrix;
    this.material.uniforms.strength.value = strength;

    const plane = new THREE.Plane();
    const normal = new THREE.Vector3();
    const planePosition = new THREE.Vector3();
    const cameraPosition = new THREE.Vector3();
    const rotation = new THREE.Matrix4();
    const lookAt = new THREE.Vector3();
    const view = new THREE.Vector3();
    const target = new THREE.Vector3();
    const clipPlane = new THREE.Vector4();
    const q = new THREE.Vector4();

    this.onBeforeRender = (renderer, scene, camera) => {
      planePosition.setFromMatrixPosition(this.matrixWorld);
      cameraPosition.setFromMatrixPosition(camera.matrixWorld);
      rotation.extractRotation(this.matrixWorld);
      normal.set(0, 0, 1).applyMatrix4(rotation);
      view.subVectors(planePosition, cameraPosition);
      // Seen from below: nothing to reflect.
      if (view.dot(normal) > 0) return;

      // Mirror the camera in the plane.
      view.reflect(normal).negate().add(planePosition);
      rotation.extractRotation(camera.matrixWorld);
      lookAt.set(0, 0, -1).applyMatrix4(rotation).add(cameraPosition);
      target.subVectors(planePosition, lookAt).reflect(normal).negate().add(planePosition);
      virtualCamera.position.copy(view);
      virtualCamera.up.set(0, 1, 0).applyMatrix4(rotation).reflect(normal);
      virtualCamera.lookAt(target);
      virtualCamera.far = camera.far;
      virtualCamera.updateMatrixWorld();
      virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

      textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
      textureMatrix.multiply(virtualCamera.projectionMatrix);
      textureMatrix.multiply(virtualCamera.matrixWorldInverse);
      textureMatrix.multiply(this.matrixWorld);

      // Oblique near plane, so nothing below the mirror is drawn:
      // http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
      plane.setFromNormalAndCoplanarPoint(normal, planePosition).applyMatrix4(virtualCamera.matrixWorldInverse);
      clipPlane.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
      const projection = virtualCamera.projectionMatrix.elements;
      q.x = (Math.sign(clipPlane.x) + projection[8]) / projection[0];
      q.y = (Math.sign(clipPlane.y) + projection[9]) / projection[5];
      q.z = -1;
      q.w = (1 + projection[10]) / projection[14];
      clipPlane.multiplyScalar(2 / clipPlane.dot(q));
      projection[2] = clipPlane.x;
      projection[6] = clipPlane.y;
      projection[10] = clipPlane.z + 1;
      projection[14] = clipPlane.w;

      renderTarget.texture.encoding = renderer.outputEncoding;
      this.visible = false;
      const currentRenderTarget = renderer.getRenderTarget();
      const xrEnabled = renderer.xr.enabled;
      renderer.xr.enabled = false;
      // Clear to transparent, so the playfield shows through wherever nothing is reflected.
      const clearAlpha = renderer.getClearAlpha();
      renderer.setClearAlpha(0);
      renderer.setRenderTarget(renderTarget);
      renderer.state.buffers.depth.setMask(true);
      if (renderer.autoClear === false) renderer.clear();
      renderer.render(scene, virtualCamera);
      renderer.setClearAlpha(clearAlpha);
      renderer.xr.enabled = xrEnabled;
      renderer.setRenderTarget(currentRenderTarget);
      if (camera.viewport !== undefined) renderer.state.viewport(camera.viewport);
      this.visible = true;
    };
  }
}
