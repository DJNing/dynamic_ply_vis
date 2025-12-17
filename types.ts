import { BufferGeometry } from 'three';

export enum VisMode {
  RGB = 0,
  GROUP_ID = 1,
  PART_ID = 2
}

export interface PointCloudData {
  geometry: BufferGeometry;
  count: number;
}

export interface SE3Transform {
  rotation: [number, number, number]; // Euler angles in degrees
  translation: [number, number, number];
}

export interface AnimationState {
  displacement: [number, number, number];
  anim1Progress: number; // 0 to 1
  anim2Progress: number; // 0 to 1
  selectedGroup: number;
  selectedPart: number;
  targetSE3: SE3Transform;
  isPlaying1: boolean;
  isPlaying2: boolean;
  isRecording: boolean;
}

export type Hierarchy = Record<number, number[]>;

// CCapture global definition
declare global {
  class CCapture {
    constructor(settings: { 
      format: string; 
      framerate?: number; 
      verbose?: boolean; 
      name?: string; 
      workersPath?: string;
      quality?: number;
    });
    start(): void;
    stop(): void;
    save(): void;
    capture(canvas: HTMLCanvasElement): void;
  }
}