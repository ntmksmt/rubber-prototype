import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export const loadTexture = (url: string): Promise<THREE.Texture> => {
  return new Promise(resolve => {
    const loader = new THREE.TextureLoader();
    loader.load(url, texture => {
      resolve(texture);
    });
  });
}

export const loadCubeTexture = (url: string[]): Promise<THREE.CubeTexture> => {
  return new Promise(resolve => {
    const loader = new THREE.CubeTextureLoader();
    loader.load(url, texture => {
      resolve(texture);
    });
  });
}

export const loadGLTFModel = (url: string): Promise<THREE.Mesh> => {
  return new Promise(resolve => {
    const loader = new GLTFLoader();
    loader.load(url, gltf => {
      resolve(<THREE.Mesh>gltf.scene.children[0]);
    });
  });
}
