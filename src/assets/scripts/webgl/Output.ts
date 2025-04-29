import Common from './Common';
import CylinderData from './CylinderData';
import Simulation from './Simulation';
import Background from './Background';

import { loadCubeTexture } from '../utils/webgl/loadAssets';

import outputVert from './shaders/output.vert';
import outputFrag from './shaders/output.frag';

import px from '../../images/envMap/px.png';
import nx from '../../images/envMap/nx.png';
import py from '../../images/envMap/py.png';
import ny from '../../images/envMap/ny.png';
import pz from '../../images/envMap/pz.png';
import nz from '../../images/envMap/nz.png';

import * as THREE from 'three';

export default class Output {
  private params: Record<string, number>;
  private GUIParams: Record<string, any>;

  private scene!: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cylinderData: CylinderData;
  private simulation: Simulation;
  private background: Background;
  private lightsNumber: number = 2;
  private lightsUniforms: {
    position: THREE.Vector3,
    intensity: number,
    color: THREE.Color
  }[] = new Array(this.lightsNumber);
  private envMap!: THREE.CubeTexture;
  private materials!: Record<string, THREE.RawShaderMaterial>;

  constructor(camera: THREE.PerspectiveCamera, cylinderData: CylinderData, simulation: Simulation, background: Background) {
    this.camera = camera;
    this.cylinderData = cylinderData;
    this.simulation = simulation;
    this.background = background;

    this.params = {
      normalScale: 0.12,
      roughness: 0.6,
      metalness: 0,
      IOR: 1.5191,
      lightColor: 0xfff1e0,
      light1PositionX: 12,
      light1PositionY: 15,
      light1PositionZ: 63,
      light1Intensity: 0.35,
      light2PositionX: - 10,
      light2PositionY: - 2.5,
      light2PositionZ: 30,
      light2Intensity: 0.2,
      diffuseDecay: 2.8,
      ambMinIntensity: 0,
      ambMaxIntensity: 1.0,
      ambBrightness: 4.0,
      ambMixCoef: 1,
      envLod: 7,
      envIntensity: 0.3
    };

    this.GUIParams = {
      wireframe: false,
      reset: () => {
        Common.GUI!.reset();
      }
    };

    if(Common.GUI) {
      const gui = Common.GUI;

      gui.add(this.GUIParams, 'wireframe').onChange(val => this.changeWireframe(val));
      gui.add(this.GUIParams, 'reset');
    }
  }

  async init() {
    this.scene = this.initScene();

    const geometry = this.initGeometry();

    this.initLights();

    this.envMap = await loadCubeTexture([ px, nx, py, ny, pz, nz ]);

    this.materials = this.initMaterials();

    const mesh = new THREE.Mesh(
      geometry,
      this.materials['output']
    );
    this.scene.add(mesh);
  }

  private initScene() {
    return new THREE.Scene();
  }

  private initGeometry() {
    const res = this.cylinderData.resolutionXY;
    const xy = res * res;
    const fboUV = new Float32Array(xy * 3);

    let i3;
    for(let i = 0; i < xy; i++) {
      i3 = i * 3;
      fboUV[i3 + 0] = i % res / res + 0.5 / res;
      fboUV[i3 + 1] = ~~ (i / res) / res + 0.5 / res;
    }

    const geometry = new THREE.BufferGeometry();
    // geometry.setAttribute('fboUV', new THREE.BufferAttribute(fboUV, 2)); // error
    geometry.setAttribute('position', new THREE.BufferAttribute(fboUV, 3));
    geometry.setAttribute('uv', this.cylinderData.mesh.geometry.attributes.uv);
    geometry.setIndex(this.cylinderData.mesh.geometry.index);

    return geometry;
  }

  private initLights() {
    const lightColor = new THREE.Color(this.params.lightColor);

    this.lightsUniforms[0] = {
      position: new THREE.Vector3(this.params.light1PositionX, this.params.light1PositionY, this.params.light1PositionZ),
      intensity: this.params.light1Intensity,
      color: lightColor
    };

    this.lightsUniforms[1] = {
      position: new THREE.Vector3(this.params.light2PositionX, this.params.light2PositionY, this.params.light2PositionZ),
      intensity: this.params.light2Intensity,
      color: lightColor
    };
  }

  private initMaterials() {
    return {
      output: new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: outputVert,
        fragmentShader: outputFrag,
        uniforms: {
          // vertexShader
          positionInt: { value: null },
          positionFloat: { value: null },
          normal: { value: null },

          // fragmentShader
          normalMap: { value: this.cylinderData.normalMap },
          normalScale: { value: this.params.normalScale },
          roughnessMap: { value: this.cylinderData.roughnessMap },
          roughness: { value: this.params.roughness },
          baseColor: { value: this.cylinderData.baseColor },
          metalness: { value: this.params.metalness },
          IOR: { value: this.params.IOR },
          lights: { value: this.lightsUniforms },
          diffuseDecay: { value: this.params.diffuseDecay },
          ambMinIntensity: { value: this.params.ambMinIntensity },
          ambMaxIntensity: { value: this.params.ambMaxIntensity },
          bgTopCol: { value: new THREE.Color(this.background.params.topColor) },
          bgBottomCol: { value: new THREE.Color(this.background.params.bottomColor) },
          ambBrightness: { value: this.params.ambBrightness },
          ambMixCoef: { value: this.params.ambMixCoef },
          envMap: { value: this.envMap },
          envLod: { value: this.params.envLod },
          envIntensity: { value: this.params.envIntensity }
        },
        defines: {
          LIGHTS_NUMBER: this.lightsNumber
        }
      })
    };
  }

  private setUniformValues(material: THREE.Material, uniformValues: Record<string, any>) {
    if(material instanceof THREE.ShaderMaterial) {
      for(const key of Object.keys(uniformValues)) {
        material.uniforms[key].value = uniformValues[key];
      }
    } else {
      console.error('webgl-template.error: material type is wrong.');
    }
  }

  private changeWireframe(val: boolean) {
    this.materials['output'].wireframe = val;
  }

  update() {
    this.setUniformValues(this.materials['output'], {
      positionInt: this.simulation.renderTargets!['positionInt'].getTexture(),
      positionFloat: this.simulation.renderTargets!['positionFloat'].getTexture(),
      normal: this.simulation.renderTargets!['normal'].getTexture()
    });

    Common.renderer.setRenderTarget(null);
    Common.renderer.render(this.scene, this.camera);
  }
}
