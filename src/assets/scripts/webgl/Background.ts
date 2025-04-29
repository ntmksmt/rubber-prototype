import Common from './Common';
import { RenderTarget } from './RenderTargetBase';

import backgroundVert from './shaders/background.vert';
import backgroundFrag from './shaders/background.frag';
import basicVert from './shaders/basic.vert';
import copyFrag from './shaders/copy.frag';

import * as THREE from 'three';

export default class Background {
  params: Record<string, number>;

  private scene!: THREE.Scene;
  private pCamera: THREE.PerspectiveCamera;
  private oCamera!: THREE.OrthographicCamera;
  private renderTargets!: Record<string, RenderTarget>;
  private materials!: Record<string, THREE.RawShaderMaterial>;
  private meshes!: Record<string, THREE.Mesh>;

  constructor(pCamera: THREE.PerspectiveCamera) {
    this.pCamera = pCamera;

    this.params = {
      sphereRad: 100,
      gradStrength: 1.5,
      gradPos: 0.5,
      topColor: 0x3c6ea0,
      bottomColor: 0x5397e0
    };
  }

  init() {
    this.scene = this.initScene();

    this.oCamera = this.initCamera();

    this.renderTargets = this.initRenderTargets();

    this.materials = this.initMaterials();

    this.meshes = this.initMeshes();
    this.scene.add(this.meshes['sphere']);
  }

  private initScene() {
    return new THREE.Scene();
  }

  private initCamera() {
    return new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
  }

  private initRenderTargets() {
    return {
      background: new RenderTarget()
    };
  }

  private resizeRenderTargets(width: number, height: number) {
    for(const key of Object.keys(this.renderTargets)) {
      this.renderTargets[key].onResize(width, height);
    }
  }

  private initMaterials() {
    return {
      background: new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: backgroundVert,
        fragmentShader: backgroundFrag,
        uniforms: {
          sphereRad: { value: this.params.sphereRad },
          gradStrength: { value: this.params.gradStrength },
          gradPos: { value: this.params.gradPos },
          topColor: { value: new THREE.Color(this.params.topColor) },
          bottomColor: { value: new THREE.Color(this.params.bottomColor) }
        },
        side: THREE.DoubleSide
      }),
      copy: new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: basicVert,
        fragmentShader: copyFrag,
        uniforms: {
          srcTexture: { value: null }
        }
      })
    };
  }

  private initMeshes() {
    return {
      sphere: new THREE.Mesh(
        new THREE.SphereGeometry(this.params.sphereRad, 32, 16),
        this.materials['background']
      ),
      plane: new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        this.materials['copy']
      )
    };
  }

  private initRender() {
    Common.renderer.setRenderTarget(this.renderTargets['background'].getRenderTarget());
    Common.renderer.render(this.scene, this.pCamera);
  }

  onResize() {
    this.resizeRenderTargets(
      Common.windowSize.x * Common.devicePixelRatio,
      Common.windowSize.y * Common.devicePixelRatio
    );

    this.initRender();
  }

  update() {
    this.materials['copy'].uniforms.srcTexture.value = this.renderTargets['background'].getTexture();
    Common.renderer.setRenderTarget(null);
    Common.renderer.render(this.meshes['plane'], this.oCamera);
  }
}
