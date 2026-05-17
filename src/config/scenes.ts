import * as THREE from "three";
import type { SceneMap } from "../types";

export const SCENES: SceneMap = {
  entrance: {
    label: "Entrance Hall",
    eyebrow: "Entrance",
    title: "The Entrance Hall",
    copy: "A fully structured reception room with coffered ceiling and lift portal. Move your pointer to look around and use W, A, S, D (or arrow keys) to walk toward the lift.",
    assistant: "Please step forward. Click directly on the lift doors when you are ready.",
    action: "Approach Lift",
    cam: new THREE.Vector3(0, 1.9, 11.4),
    target: new THREE.Vector3(0, 2.2, -9.6),
    fog: new THREE.Color("#3a1f22"),
    ambient: 0.82,
    accent: new THREE.Color("#c7a168")
  },
  lift: {
    label: "Lift Interior",
    eyebrow: "Vertical Transit",
    title: "Inside The Lift",
    copy: "Click the 3D control panel on the right wall to open a centered floor selector. Select any level, or press Lobby to return to the entrance.",
    assistant: "The selector offers one hundred levels with dedicated call buttons. I will update the cabin display as you travel.",
    action: "Back to Entrance",
    cam: new THREE.Vector3(0, 1.62, 0.2),
    target: new THREE.Vector3(0, 1.62, -4.8),
    fog: new THREE.Color("#332024"),
    ambient: 0.74,
    accent: new THREE.Color("#b9874e")
  },
  shop: {
    label: "Shopfront Floor",
    eyebrow: "Retail Domain",
    title: "Mayfair Shop Front",
    copy: "A 3D storefront floor reached by lift. Move your pointer to look around, press W to advance, and use A/D to pan your route while staying oriented toward the storefront.",
    assistant: "You have arrived on your selected floor. Return to level 0 anytime to re-enter the entrance hall.",
    action: "Return to Lift",
    cam: new THREE.Vector3(0, 1.92, 9.4),
    target: new THREE.Vector3(0, 1.9, -5.2),
    fog: new THREE.Color("#3a2a1f"),
    ambient: 0.86,
    accent: new THREE.Color("#d0ad73")
  }
};
