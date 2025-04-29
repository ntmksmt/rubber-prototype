import Common from './Common';
import { RenderTarget, RenderTarget2Phase } from './RenderTargetBase';

import * as THREE from 'three';

abstract class Rendering {
  renderTargets!: Record<string, RenderTarget> | null;
  protected materials!: Record<string, THREE.Material>;
  protected resolution: THREE.Vector2 = new THREE.Vector2();
  protected px: THREE.Vector2 = new THREE.Vector2();

  init() {
    this.renderTargets = this.initRenderTargets();

    this.materials = this.initMaterials();
  }

  protected abstract initRenderTargets(): Record<string, RenderTarget> | null;

  protected abstract initMaterials(): Record<string, THREE.Material>;

  protected setResolution(width: number, height: number) {
    this.resolution.set(width, height);
    this.px.set(1 / this.resolution.x, 1 / this.resolution.y);
  }

  protected resizeRenderTargets() {
    if(this.renderTargets !== null) {
      Object.keys(this.renderTargets).map(key => {
        this.renderTargets![key].onResize(this.resolution.x, this.resolution.y);
      });
    }
  }

  onResize() {
    this.setResolution(
      Common.windowSize.x * Common.devicePixelRatio,
      Common.windowSize.y * Common.devicePixelRatio
    );

    this.resizeRenderTargets();
  }

  protected setUniformValues(material: THREE.Material, uniformValues: Record<string, any>) {
    if(material instanceof THREE.ShaderMaterial) {
      Object.keys(uniformValues).map(key => {
        material.uniforms[key].value = uniformValues[key];
      });
    } else {
      console.error('webgl-template.error: material type is wrong.');
    }
  }

  protected setRenderTarget(renderTarget: RenderTarget | null) {
    const target = renderTarget === null ? null : renderTarget.getRenderTarget();
    Common.renderer.setRenderTarget(target);
  }

  protected abstract render(renderTarget: RenderTarget | null): void;

  abstract update(...param: any[]): void;
}

abstract class SingleQuadRendering extends Rendering {
  protected camera!: THREE.OrthographicCamera;
  protected mesh!: THREE.Mesh;

  init() {
    this.camera = this.initCamera();

    super.init();

    this.mesh = this.initMesh();
  }

  protected initCamera() {
    return new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
  }

  protected initMesh() {
    return new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  }

  protected render(renderTarget: RenderTarget | null) {
    super.setRenderTarget(renderTarget);
    Common.renderer.render(this.mesh, this.camera);

    if(renderTarget instanceof RenderTarget2Phase) renderTarget.swap();
  }
}

abstract class SceneRendering extends Rendering {
  protected scene!: THREE.Scene;
  protected camera!: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  protected meshes!: Record<string, THREE.Mesh>;

  init() {
    this.scene = this.initScene();

    this.camera = this.initCamera();

    super.init();

    this.meshes = this.initMeshes();
    Object.keys(this.meshes).map(key => {
      this.scene.add(this.meshes[key]);
    });
  }

  protected initScene() {
    return new THREE.Scene();
  }

  protected abstract initCamera(): THREE.PerspectiveCamera | THREE.OrthographicCamera;

  protected updateCamera() {
    if(this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = Common.windowSize.x / Common.windowSize.y;
      this.camera.updateProjectionMatrix();
    }
  }

  protected abstract initMeshes(): Record<string, THREE.Mesh>;

  onResize() {
    super.onResize();
    
    this.updateCamera();
  }

  protected render(renderTarget: RenderTarget | null) {
    super.setRenderTarget(renderTarget);
    Common.renderer.render(this.scene, this.camera);

    if(renderTarget instanceof RenderTarget2Phase) renderTarget.swap();
  }
}

export { SingleQuadRendering, SceneRendering };
