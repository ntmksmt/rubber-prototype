import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min';

class Common {
  canvas!: HTMLCanvasElement;
  renderer!: THREE.WebGLRenderer;
  devicePixelRatio!: number;
  windowSize: THREE.Vector2 = new THREE.Vector2();
  private isVisibleStats: boolean = false;
  private stats?: Stats;
  private isVisibleGUI: boolean = true;
  GUI?: GUI;
  private GUICloseWidth: number = 500;
  private clock: THREE.Clock = new THREE.Clock();
  delta: number = 0;

  constructor() {}

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.autoClearColor = false;
    this.changeDevicePixelRatio(window.devicePixelRatio);

    if(this.isVisibleStats) {
      this.stats = new Stats();
      document.body.appendChild(this.stats.dom);
    }

    if(this.isVisibleGUI) this.GUI = new GUI();
  }

  changeDevicePixelRatio(devicePixelRatio: number) {
    this.devicePixelRatio = Math.min(devicePixelRatio, 2);
    this.renderer.setPixelRatio(this.devicePixelRatio);
  }

  onResize() {
    this.windowSize.set(window.innerWidth, window.innerHeight);
    this.renderer.setSize(this.windowSize.x, this.windowSize.y);

    if(this.windowSize.x <= this.GUICloseWidth) this.GUI?.close();
  }

  update() {
    this.stats?.update();

    this.delta = this.clock.getDelta();
  }
}

export default new Common();
