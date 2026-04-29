/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare module '*.mp3' {
  const src: string;
  export default src;
}
