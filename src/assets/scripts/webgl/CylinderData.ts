import { loadGLTFModel, loadTexture } from '../utils/webgl/loadAssets';

import cylinderModelPath from '../../models/cylinder_13826.glb';
import normalMapPath from '../../models/normalMap.png';
import roughnessMapPath from '../../models/roughnessMap.jpg';

import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils';

type Face = {
  a: number,
  b: number,
  c: number
};

type DataTextures = {
  vertices: THREE.DataTexture,
  adjacentIndices: THREE.DataTexture[],
  adjacentDistances: THREE.DataTexture[]
};

export default class CylinderData {
  private params: Record<string, number>;

  mesh!: THREE.Mesh;
  baseColor!: THREE.Color;
  normalMap!: THREE.Texture;
  roughnessMap!: THREE.Texture;
  resolutionXY!: number;
  vertices!: THREE.Vector3[];
  dataTextures!: DataTextures;

  constructor() {
    this.params = {
      baseColor: 0xcc3f28
    };
  }

  async init() {
    const geometry = await this.initGeometry();
    this.mesh = new THREE.Mesh(geometry);

    this.baseColor = new THREE.Color(this.params.baseColor);

    this.normalMap = await this.initTexture(normalMapPath);
    this.roughnessMap = await this.initTexture(roughnessMapPath);

    this.resolutionXY = Math.ceil(Math.sqrt(geometry.attributes.position.count));

    this.vertices = this.getVerticesFromGeometry(geometry);

    const adjacentIndices = this.getAdjacentIndices(geometry);
    const maxNumOfAdjacentIndices = this.getMaxNumOfAdjacentIndices(adjacentIndices);
    const dataTextureNum = Math.ceil(maxNumOfAdjacentIndices / 4); // RGBA
    this.dataTextures = this.dataToDataTextures(this.resolutionXY, dataTextureNum, this.vertices, adjacentIndices);
  }

  private async initGeometry() {
    const loadMesh = await loadGLTFModel(cylinderModelPath);
    let geometry = loadMesh.geometry;
    geometry.scale(1000, 1000, 1000);
    geometry = mergeVertices(geometry, 2);
    geometry.scale(0.001, 0.001, 0.001);

    geometry.computeBoundingBox();

    return geometry;
  }

  private async initTexture(texturePath: string) {
    const texture = await loadTexture(texturePath);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.flipY = false;

    return texture;
  }

  private getVerticesFromGeometry(geometry: THREE.BufferGeometry) {
    const positions = geometry.attributes.position;
    const vertices = Array(positions.count);

    const tmpVec3 = new THREE.Vector3();
    for(let i = 0; i < vertices.length; i++) {
      tmpVec3.fromBufferAttribute(positions, i);
      vertices[i] = tmpVec3.clone();
    }

    return vertices;
  }

  private getAdjacentFaces(faces: Face[], first: number, second: number) {
    let adjacentFaces = null;

    let face;
    for(let i = 0; i < faces.length; i++) {
      face = faces[i];
      if(
        face.a === first && face.b === second ||
        face.b === first && face.c === second ||
        face.c === first && face.a === second
      ) {
        adjacentFaces = face;
        break;
      }
    }

    if(adjacentFaces === null) throw new Error('Failed to find Face.');

    return adjacentFaces;
  }

  private getAdjacentIndices(geometry: THREE.BufferGeometry) {
    // [index][(face or index) that share a index, ...]
    const faces = [...Array(geometry.attributes.position.count)].map(() => Array());
    const adjacentIndices = structuredClone(faces);
    const index = geometry.index!;

    let face: Face;

    const loopNum = index.count / 3;
    let i3, a, b, c;
    for(let i = 0; i < loopNum; i++) {
      i3 = i * 3;
      a = index.getX(i3);
      b = index.getY(i3);
      c = index.getZ(i3);

      face = { a: a, b: b, c: c };
      faces[a].push(face);
      faces[b].push(face);
      faces[c].push(face);
    }

    for(let i = 0; i < faces.length; i++) {
      face = faces[i][0];

      while(true) {
        if(face.a === i) {
          adjacentIndices[i].push(face.c);
          face = this.getAdjacentFaces(faces[i], i, face.c);
        } else if(face.b === i) {
          adjacentIndices[i].push(face.a);
          face = this.getAdjacentFaces(faces[i], i, face.a);
        } else {
          adjacentIndices[i].push(face.b);
          face = this.getAdjacentFaces(faces[i], i, face.b);
        }

        if(face === faces[i][0]) break;
      }
    }

    return adjacentIndices;
  }

  private getMaxNumOfAdjacentIndices(adjacentIndices: number[][]) {
    let min = Infinity, max = 0, length;
    for(let i = 0; i < adjacentIndices.length; i++) {
      length = adjacentIndices[i].length;

      if(length < min) min = length;
      if(length > max) max = length;
    }
    console.log('number of adjacent indices -> min: ' + min + ', max: ' + max);

    return max;
  }

  private createDataTexture(data: Float32Array, resolutionXY: number) {
    const dataTexture = new THREE.DataTexture(data, resolutionXY, resolutionXY, THREE.RGBAFormat, THREE.FloatType);
    dataTexture.needsUpdate = true;
    return dataTexture;
  }

  private dataToDataTextures(
    resolutionXY: number,
    dataTextureNum: number,
    verticesData: THREE.Vector3[],
    adjacentIndicesData: number[][]) {
    const data = new Float32Array(resolutionXY * resolutionXY * 4);
    const verticesArray = structuredClone(data);
    const adjacentIndicesArray = [...Array(dataTextureNum)].map(() => structuredClone(data));
    const adjacentDistancesArray = structuredClone(adjacentIndicesArray);

    let i4;
    
    for(let i = 0; i < verticesData.length; i++) {
      i4 = i * 4;
      verticesArray[i4 + 0] = verticesData[i].x;
      verticesArray[i4 + 1] = verticesData[i].y;
      verticesArray[i4 + 2] = verticesData[i].z;
    }

    let ais, aisl, ari, ai, ad;
    for(let i = 0; i < adjacentIndicesData.length; i++) {
      i4 = i * 4;
      ais = adjacentIndicesData[i];
      aisl = ais.length;

      for(let j = 0; j < dataTextureNum; j++) {
        for(let k = 0; k < 4; k++) {
          ari = k + j * 4;
          ai = ari < aisl ? ais[ari] : - 1;
          ad = ari < aisl ? verticesData[i].distanceTo(verticesData[ai]) : - 1;

          adjacentIndicesArray[j][i4 + k] = ai;
          adjacentDistancesArray[j][i4 + k] = ad;
        }
      }
    }

    const vertices = this.createDataTexture(verticesArray, resolutionXY);

    const adjacentIndices = Array(dataTextureNum);
    const adjacentDistances = Array(dataTextureNum);
    for(let i = 0; i < dataTextureNum; i++) {
      adjacentIndices[i] = this.createDataTexture(adjacentIndicesArray[i], resolutionXY);
      adjacentDistances[i] = this.createDataTexture(adjacentDistancesArray[i], resolutionXY);
    }

    const dataTextures: DataTextures = {
      vertices: vertices,
      adjacentIndices: adjacentIndices,
      adjacentDistances: adjacentDistances
    };

    return dataTextures;
  }
}
