/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_QBX_RUNTIME_MODE?: 'hardware' | 'simulator';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
