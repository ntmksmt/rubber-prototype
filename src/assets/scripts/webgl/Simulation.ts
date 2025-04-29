import Common from './Common';
import { SingleQuadRendering } from './RenderingBase';
import CylinderData from './CylinderData';
import { RenderTarget } from './RenderTargetBase';
import Mouse from './Mouse';

import basicVert from './shaders/basic.vert';
import initPositionFrag from './shaders/initPosition.frag';
import integrateFrag from './shaders/integrate.frag';
import mouseOffsetFrag from './shaders/mouseOffset.frag';
import solveConstraintsFrag from './shaders/solveConstraints.frag';
import computeNormalFrag from './shaders/computeNormal.frag';

import * as THREE from 'three';

const QUALITY = {
  high: 0,
  medium: 1
};

export default class Simulation extends SingleQuadRendering {
  private params: Record<string, number>;
  private GUIParams: Record<string, number>;

  private cylinderData: CylinderData;
  private steps: number;

  constructor(cylinderData: CylinderData) {
    super();

    this.cylinderData = cylinderData;
    this.setResolution(this.cylinderData.resolutionXY, this.cylinderData.resolutionXY);

    this.params = {
      minSteps: 40,
      maxSteps: 60,
      minCursorSize: 0.08,
      maxCursorSize: 0.16,
      minTension: 5,
      maxTension: 100,
      minDamping: 20,
      maxDamping: 100,
    };
    this.steps = this.params.maxSteps;

    this.GUIParams = {
      quality: QUALITY.high,
      cursorSize: 0.13,
      tension: 25,
      damping: 60,
      mass: 12
    };

    if(Common.GUI) {
      const gui = Common.GUI;

      gui.add(this.GUIParams, 'quality', QUALITY).onChange(val => this.changeQuality(val));
      gui.add(this.GUIParams, 'cursorSize', this.params.minCursorSize, this.params.maxCursorSize, 0.01);
      gui.add(this.GUIParams, 'tension', this.params.minTension, this.params.maxTension, 1);
      gui.add(this.GUIParams, 'damping', this.params.minDamping, this.params.maxDamping, 1);
    }
  }

  init() {
    super.init();

    this.resizeRenderTargets();
  }

  protected initRenderTargets(): Record<string, RenderTarget> | null {
    return {
      positionInt: new RenderTarget({ magFilter: THREE.NearestFilter }),
      positionFloat: new RenderTarget({ magFilter: THREE.NearestFilter }),
      prvPositionInt: new RenderTarget({ magFilter: THREE.NearestFilter }),
      prvPositionFloat: new RenderTarget({ magFilter: THREE.NearestFilter }),
      tmpInt: new RenderTarget({ magFilter: THREE.NearestFilter }),
      tmpFloat: new RenderTarget({ magFilter: THREE.NearestFilter }),
      normal: new RenderTarget({ magFilter: THREE.NearestFilter })
    };
  }

  protected initMaterials(): Record<string, THREE.Material> {
    return {
      initPosition: new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: basicVert,
        fragmentShader: initPositionFrag,
        uniforms: {
          vertices: { value: this.cylinderData.dataTextures.vertices },
          order: { value: null }
        }
      }),
      integrate: new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: basicVert,
        fragmentShader: integrateFrag,
        uniforms: {
          customModelMatrix: { value: null },
          vertices: { value: this.cylinderData.dataTextures.vertices },
          prvPositionInt: { value: null },
          prvPositionFloat: { value: null },
          positionInt: { value: null },
          positionFloat: { value: null },
          delta: { value: 0 },
          tension: { value: this.GUIParams.tension },
          damping: { value: this.GUIParams.damping },
          mass: { value: this.GUIParams.mass },
          order: { value: null }
        }
      }),
      mouseOffset: new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: basicVert,
        fragmentShader: mouseOffsetFrag,
        uniforms: {
          positionInt: { value: null },
          positionFloat: { value: null },
          vertices: { value: this.cylinderData.dataTextures.vertices },
          index: { value: null },
          resolutionXY: { value: this.cylinderData.resolutionXY },
          cursorSize: { value: this.GUIParams.cursorSize },
          worldCoordinates: { value: null },
          order: { value: null }
        }
      }),
      solveConstraints: new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: basicVert,
        fragmentShader: solveConstraintsFrag,
        uniforms: {
          positionInt: { value: null },
          positionFloat: { value: null },
          adjacentIndices0: { value: this.cylinderData.dataTextures.adjacentIndices[0] },
          adjacentIndices1: { value: this.cylinderData.dataTextures.adjacentIndices[1] },
          adjacentDistances0: { value: this.cylinderData.dataTextures.adjacentDistances[0] },
          adjacentDistances1: { value: this.cylinderData.dataTextures.adjacentDistances[1] },
          resolutionXY: { value: this.cylinderData.resolutionXY },
          order: { value: null }
        }
      }),
      computeNormal: new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: basicVert,
        fragmentShader: computeNormalFrag,
        uniforms: {
          positionInt: { value: null },
          positionFloat: { value: null },
          adjacentIndices0: { value: this.cylinderData.dataTextures.adjacentIndices[0] },
          adjacentIndices1: { value: this.cylinderData.dataTextures.adjacentIndices[1] },
          resolutionXY: { value: this.cylinderData.resolutionXY }
        }
      })
    };
  }

  private initRender() {
    this.mesh.material = this.materials['initPosition'];
    this.setUniformValues(this.materials['initPosition'], { order: 1 });
    this.render(this.renderTargets!['positionInt']);
    this.render(this.renderTargets!['prvPositionInt']);
    this.setUniformValues(this.materials['initPosition'], { order: - 1 });
    this.render(this.renderTargets!['positionFloat']);
    this.render(this.renderTargets!['prvPositionFloat']);
  }

  private integrate(delta: number, mouse: Mouse) {
    this.mesh.material = this.materials['integrate'];
    this.setUniformValues(this.materials['integrate'], {
      customModelMatrix: mouse.modelMatrix,
      prvPositionInt: this.renderTargets!['prvPositionInt'].getTexture(),
      prvPositionFloat: this.renderTargets!['prvPositionFloat'].getTexture(),
      positionInt: this.renderTargets!['positionInt'].getTexture(),
      positionFloat: this.renderTargets!['positionFloat'].getTexture(),
      delta: delta
    });

    this.setUniformValues(this.materials['integrate'], { order: 1 });
    this.render(this.renderTargets!['tmpInt']);
    this.setUniformValues(this.materials['integrate'], { order: - 1 });
    this.render(this.renderTargets!['tmpFloat']);

    let tmp;
    tmp = this.renderTargets!['prvPositionInt'];
    this.renderTargets!['prvPositionInt'] = this.renderTargets!['positionInt'];
    this.renderTargets!['positionInt'] = this.renderTargets!['tmpInt'];
    this.renderTargets!['tmpInt'] = tmp;

    tmp = this.renderTargets!['prvPositionFloat'];
    this.renderTargets!['prvPositionFloat'] = this.renderTargets!['positionFloat'];
    this.renderTargets!['positionFloat'] = this.renderTargets!['tmpFloat'];
    this.renderTargets!['tmpFloat'] = tmp;
  }

  private mouseOffset(mouse: Mouse) {
    this.mesh.material = this.materials['mouseOffset'];
    this.setUniformValues(this.materials['mouseOffset'], {
      positionInt: this.renderTargets!['positionInt'].getTexture(),
      positionFloat: this.renderTargets!['positionFloat'].getTexture(),
      index: mouse.pointer!.index,
      worldCoordinates: mouse.pointer!.worldCoordinates
    });

    this.setUniformValues(this.materials['mouseOffset'], { order: 1 });
    this.render(this.renderTargets!['tmpInt']);
    this.setUniformValues(this.materials['mouseOffset'], { order: - 1 });
    this.render(this.renderTargets!['tmpFloat']);

    let tmp;
    tmp = this.renderTargets!['positionInt'];
    this.renderTargets!['positionInt'] = this.renderTargets!['tmpInt'];
    this.renderTargets!['tmpInt'] = tmp;

    tmp = this.renderTargets!['positionFloat'];
    this.renderTargets!['positionFloat'] = this.renderTargets!['tmpFloat'];
    this.renderTargets!['tmpFloat'] = tmp;
  }

  private solveConstraints() {
    this.mesh.material = this.materials['solveConstraints'];
    this.setUniformValues(this.materials['solveConstraints'], {
      positionInt: this.renderTargets!['positionInt'].getTexture(),
      positionFloat: this.renderTargets!['positionFloat'].getTexture(),
    });

    this.setUniformValues(this.materials['solveConstraints'], { order: 1 });
    this.render(this.renderTargets!['tmpInt']);
    this.setUniformValues(this.materials['solveConstraints'], { order: - 1 });
    this.render(this.renderTargets!['tmpFloat']);

    let tmp;
    tmp = this.renderTargets!['positionInt'];
    this.renderTargets!['positionInt'] = this.renderTargets!['tmpInt'];
    this.renderTargets!['tmpInt'] = tmp;

    tmp = this.renderTargets!['positionFloat'];
    this.renderTargets!['positionFloat'] = this.renderTargets!['tmpFloat'];
    this.renderTargets!['tmpFloat'] = tmp;
  }

  private computeNormal() {
    this.mesh.material = this.materials['computeNormal'];
    this.setUniformValues(this.materials['computeNormal'], {
      positionInt: this.renderTargets!['positionInt'].getTexture(),
      positionFloat: this.renderTargets!['positionFloat'].getTexture()
    });
    this.render(this.renderTargets!['normal']);
  }

  private changeQuality(val: number) {
    let devicePixelRatio, steps;
    if(val === QUALITY.high) {
      devicePixelRatio = window.devicePixelRatio;
      steps = this.params.maxSteps;
    } else {
      devicePixelRatio = 1;
      steps = this.params.minSteps;
    }

    Common.changeDevicePixelRatio(devicePixelRatio);
    this.steps = steps;
  }

  onResize() {
    this.initRender();
  }

  update(mouse: Mouse) {
    if(Common.GUI) {
      this.setUniformValues(this.materials['mouseOffset'], {
        cursorSize: this.GUIParams.cursorSize
      });
      this.setUniformValues(this.materials['integrate'], {
        tension: this.GUIParams.tension,
        damping: this.GUIParams.damping
      });
    }

    this.integrate(Common.delta, mouse);

    if(mouse.needsUpdate) this.mouseOffset(mouse);

    for(let i = 0; i < this.steps; i++) this.solveConstraints();
    
    this.computeNormal();
  }
}
