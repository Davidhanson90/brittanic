import * as THREE from "three";

export type SceneName = "entrance" | "lift" | "shop";

export interface SceneConfig {
  label: string;
  eyebrow: string;
  title: string;
  copy: string;
  assistant: string;
  action: string;
  cam: THREE.Vector3;
  target: THREE.Vector3;
  fog: THREE.Color;
  ambient: number;
  accent: THREE.Color;
}

export type SceneMap = Record<SceneName, SceneConfig>;
