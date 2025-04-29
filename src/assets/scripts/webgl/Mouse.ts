import Common from './Common';
import CylinderData from './CylinderData';

import * as THREE from 'three';

type Pointer = {
  index: number | null,
  screenCoordinates: THREE.Vector2,
  worldCoordinates: THREE.Vector3,
  worldCoordinatesStart: THREE.Vector3
};

export default class Mouse {
  private params: Record<string, number>;

  private camera: THREE.PerspectiveCamera;
  private cylinderData: CylinderData;

  pointer: Pointer | null = null;
  needsUpdate: boolean = false;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private plane!: THREE.Plane;
  modelMatrix: THREE.Matrix4 = new THREE.Matrix4();

  constructor(camera: THREE.PerspectiveCamera, cylinderData: CylinderData) {
    this.camera = camera;
    this.cylinderData = cylinderData;

    this.params = {
      pullLength: 0.2
    };
  }

  init() {
    const planeZ = this.cylinderData.mesh.geometry.boundingBox!.max.z + this.params.pullLength;
    this.plane = new THREE.Plane(
      new THREE.Vector3(0, 0, 1),
      - planeZ
    );

    const canvas = Common.canvas;
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseout', this.onMouseUp.bind(this));

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private setScreenCoordinates(x: number, y: number) {
    if(this.pointer) {
      this.pointer.screenCoordinates.set(
        x / Common.windowSize.x * 2 - 1,
        (Common.windowSize.y - y) / Common.windowSize.y * 2 - 1
      );
      // console.log(this.pointer.screenCoordinates.x + ', ' + this.pointer.screenCoordinates.y);
    }
  }

  private setupPointer() {
    this.pointer = {
      index: null,
      screenCoordinates: new THREE.Vector2(),
      worldCoordinates: new THREE.Vector3(),
      worldCoordinatesStart: new THREE.Vector3()
    };
  }

  private onMouseDown(event: MouseEvent) {
    this.setupPointer();

    this.onMouseMove(event);
  }

  private onMouseMove(event: MouseEvent) {
    this.setScreenCoordinates(event.clientX, event.clientY);
  }

  private onMouseUp() {
    this.pointer = null;
    this.modelMatrix.identity();
  }

  private onTouchStart(event: TouchEvent) {
    event.preventDefault();

    if(event.touches.length === 1) {
      this.setupPointer();

      this.onTouchMove(event);
    }
  }

  private onTouchMove(event: TouchEvent) {
    event.preventDefault();

    this.setScreenCoordinates(event.touches[0].clientX, event.touches[0].clientY);
  }

  private onTouchEnd() {
    this.onMouseUp();
  }

  private updateModelMatrix() {
    if(this.pointer && this.pointer.index) {
      // 掴んでいるindexの掴んだ時の位置、現在の位置
      const indexOrgPos = new THREE.Vector3().copy(this.pointer.worldCoordinatesStart);
      const indexPos = new THREE.Vector3().copy(this.pointer.worldCoordinates);
      indexOrgPos.normalize();
      indexPos.normalize();

      // 回転軸
      const axis = new THREE.Vector3().crossVectors(indexOrgPos, indexPos);
      axis.normalize();

      // 回転角度
      let angle = indexOrgPos.angleTo(indexPos);
      // 0〜1
      angle = angle / Math.PI;

      angle = Math.pow(angle, 2.5);
      angle *= 2.0;

      angle = Math.min(angle, Math.PI / 2);

      // matrixを設定
      const q = new THREE.Quaternion();
      q.setFromAxisAngle(axis, angle);
      this.modelMatrix.identity();
      this.modelMatrix.compose(this.cylinderData.mesh.position, q, this.cylinderData.mesh.scale);
    }
  }

  // FBOに以下を渡したい
  // needsUpdate - マウスシェーダーを実行するか
  // index - 握っているindex
  // worldCoordinates - 世界での座標(planeとの衝突点)
  // modelMatrix - 回転
  update() {
    this.needsUpdate = false;

    if(this.pointer) {
      // レイを作成
      this.raycaster.setFromCamera(this.pointer.screenCoordinates, this.camera);
      // 変形無しのMeshに衝突している場合取得
      const intersectObject = this.raycaster.intersectObject(this.cylinderData.mesh)[0];

      // indexがない状態(初回握り)でMeshに衝突 -> 握り位置から最も近いindexを取得
      if(this.pointer.index === null && intersectObject !== undefined) {
        const face = intersectObject.face!;
        const indices = [face.a, face.b, face.c];
        const intersectPoint = intersectObject.point;

        let dist = Infinity, tmpDist;
        for(let i = 0; i < indices.length; i++) {
          tmpDist = intersectPoint.distanceTo(this.cylinderData.vertices[indices[i]]);

          if(dist > tmpDist) {
            dist = tmpDist;
            this.pointer.index = indices[i];
          }
        }

        // console.log(this.pointer.index);

        // 掴んだ時の初期位置
        let startPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.plane, startPoint);
        this.pointer.worldCoordinatesStart.copy(startPoint);
      }

      if(this.pointer.index !== null) {
        let intersectPoint = new THREE.Vector3();
        // planeとの衝突座標を取得
        this.raycaster.ray.intersectPlane(this.plane, intersectPoint);
        this.pointer.worldCoordinates.copy(intersectPoint);

        this.needsUpdate = true;

        // console.log(this.pointer.worldCoordinates.x + ', ' + this.pointer.worldCoordinates.y);
      }
    }

    this.updateModelMatrix();
  }
}
