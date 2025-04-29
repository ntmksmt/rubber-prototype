import Common from './Common';
import CylinderData from './CylinderData';
import Background from './Background';
import Mouse from './Mouse';
import Simulation from './Simulation';
import Output from './Output';

import * as THREE from 'three';

export default class WebGLMain {
  private params: Record<string, number>;

  private cylinderData!: CylinderData;
  private pCamera!: THREE.PerspectiveCamera;
  private background!: Background;
  private mouse!: Mouse;
  private simulation!: Simulation;
  private output!: Output;

  constructor() {
    this.params = {
      fov: 45,
      minYRatio: 0.9,
      minXRatio: 0.7
    };
  }

  async init(canvas: HTMLCanvasElement) {
    Common.init(canvas);

    this.cylinderData = new CylinderData();
    await this.cylinderData.init();

    this.pCamera = this.initCamera();

    this.background = new Background(this.pCamera);
    this.background.init();

    this.mouse = new Mouse(this.pCamera, this.cylinderData);
    this.mouse.init();

    this.simulation = new Simulation(this.cylinderData);
    this.simulation.init();

    this.output = new Output(
      this.pCamera,
      this.cylinderData,
      this.simulation,
      this.background
    );
    await this.output.init();

    this.update = this.update.bind(this);
  }

  private initCamera() {
    const camera = new THREE.PerspectiveCamera(this.params.fov, 1, 0.1, 1000);
    camera.lookAt(0, 0, 0);

    return camera;
  }

  private updateCamera() {
    this.pCamera.aspect = Common.windowSize.x / Common.windowSize.y;

    let y;
    if(Common.windowSize.x >= Common.windowSize.y) {
      y = this.params.minYRatio;
    } else {
      y = Common.windowSize.y / Common.windowSize.x * this.params.minXRatio;
    }

    let z = y / Math.tan(this.pCamera.fov / 2 * Math.PI / 180);
    z += this.cylinderData.mesh.geometry.boundingBox!.max.z;
    this.pCamera.position.z = z;

    this.pCamera.updateProjectionMatrix();
  }

  onResize() {
    Common.onResize();

    this.updateCamera();

    this.background.onResize();

    this.simulation.onResize();
  }

  update() {
    Common.update();

    this.background.update();

    this.mouse.update();

    this.simulation.update(this.mouse);

    this.output.update();
    
    requestAnimationFrame(this.update);
  }
}
