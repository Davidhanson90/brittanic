import { Character } from './character';
import type { ThreeCharacterConfig } from '../three-scene.component';

export class LadyInRed extends Character {
  override readonly id = 'lady-in-red';
  override readonly label = 'Lady in Red';
  override readonly cinematicVideoSrc = 'video/lady-in-red/closed-my-credit-line.mp4';

  override readonly config: ThreeCharacterConfig = {
    id: this.id,
    videoSrc: 'video/lady-in-red.mp4',
    videoWidth: 1152,
    videoHeight: 648,
    offsetXPercent: -30.89,
    offsetBottomPercent: 18.34,
    scale: 0.18,
    widthScale: 0.3,
    brightness: 0.75,
    key: { minGreen: 80, greenDominance: 1.05, minChannelGap: 10 },
  };
}
