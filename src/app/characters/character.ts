import { Subject } from 'rxjs';
import type { ThreeCharacterConfig } from '../three-scene.component';

/** Base class for all green-screened characters in the Brittanic experience. */
export abstract class Character {
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly config: ThreeCharacterConfig;

  /** Path to the cinematic cutscene video, or null if this character has no cutscene. */
  abstract readonly cinematicVideoSrc: string | null;

  /** Whether the cinematic video triggers a scene transition when it ends. */
  readonly triggersSceneTransition: boolean = false;

  /** Emits when the character is clicked. */
  readonly clicked = new Subject<string>();
}
