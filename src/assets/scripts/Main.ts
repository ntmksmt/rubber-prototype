import WebGLMain from './webgl/WebGLMain';

export default class Main {
  private webGLMain!: WebGLMain;

  constructor() {
    this.init();
  }

  private async init() {
    const canvas = document.querySelector<HTMLCanvasElement>('main canvas')!;
    const html = document.querySelector<HTMLHtmlElement>('html')!;

    this.webGLMain = new WebGLMain();
    await this.webGLMain.init(canvas);
    
    window.addEventListener('resize', this.onResize.bind(this));
    this.onResize();

    this.webGLMain.update();

    html.style.visibility = 'visible';
  }

  private onResize() {
    this.webGLMain.onResize();
  }
}
