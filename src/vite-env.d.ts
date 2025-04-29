/// <reference types="vite/client" />
/// <reference types="vite-plugin-glsl/ext" />

declare module '*.glb' {
  const src: string
  export default src
}

declare module '*.gltf' {
  const src: string
  export default src
}
