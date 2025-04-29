import * as THREE from 'three';
import {
  Wrapping,
  MagnificationTextureFilter,
  MinificationTextureFilter,
  PixelFormat,
  TextureDataType
} from 'three/src/constants';

type TextureParameters = {
  wrapS: Wrapping,
  wrapT: Wrapping,
  magFilter: MagnificationTextureFilter,
  minFilter: MinificationTextureFilter,
  generateMipmaps: boolean,
  format: PixelFormat,
  type: TextureDataType,
  depthBuffer: boolean,
  stencilBuffer: boolean,
  samples: number
};

class RenderTarget {
  width: number;
  height: number;
  textureParameters: TextureParameters;
  protected buffer0: THREE.WebGLRenderTarget;

  constructor(textureParameters?: Partial<TextureParameters>, width: number = 1, height: number = 1) {
    this.width = width;
    this.height = height;

    const type = (/(iPad|iPhone|iPod)/g.test(navigator.userAgent)) ? THREE.HalfFloatType : THREE.FloatType;
    this.textureParameters = {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
      generateMipmaps: false,
      format: THREE.RGBAFormat,
      type: type,
      depthBuffer: true,
      stencilBuffer: false,
      samples: 0
    };
    this.textureParameters = { ...this.textureParameters, ...textureParameters };

    this.buffer0 = new THREE.WebGLRenderTarget(this.width, this.height, this.textureParameters);
  }

  getRenderTarget() {
    return this.buffer0;
  }

  getTexture() {
    return this.buffer0.texture;
  }

  onResize(width: number, height: number) {
    this.width = width;
    this.height = height;

    this.buffer0.setSize(this.width, this.height);
  }
}

// buffer0 - read, buffer1 - write
class RenderTarget2Phase extends RenderTarget {
  protected buffer1: THREE.WebGLRenderTarget;

  constructor(textureParameters?: Partial<TextureParameters>, width: number = 1, height: number = 1) {
    super(textureParameters, width, height);

    this.buffer1 = this.buffer0.clone();
  }

  getRenderTarget() {
    return this.buffer1;
  }

  onResize(width: number, height: number): void {
    super.onResize(width, height);

    this.buffer1.setSize(this.width, this.height);
  }

  swap() {
    const tmp = this.buffer0;
    this.buffer0 = this.buffer1;
    this.buffer1 = tmp;
  }
}

export { RenderTarget, RenderTarget2Phase };
