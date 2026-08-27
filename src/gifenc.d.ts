declare module 'gifenc' {
  export interface GIFEncoderOptions {
    initialCapacity?: number;
    auto?: boolean;
  }
  export interface WriteFrameOptions {
    transparent?: boolean;
    transparentIndex?: number;
    delay?: number;
    palette?: number[][] | null;
    repeat?: number;
    colorDepth?: number;
    dispose?: number;
    first?: boolean;
  }
  export interface GIFEncoderInstance {
    reset(): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    writeFrame(index: Uint8Array, width: number, height: number, opts?: WriteFrameOptions): void;
  }
  export function GIFEncoder(opts?: GIFEncoderOptions): GIFEncoderInstance;
  export function quantize(rgba: Uint8Array, maxColors: number, opts?: Record<string, unknown>): number[][];
  export function applyPalette(rgba: Uint8Array, palette: number[][], format?: string): Uint8Array;
}
