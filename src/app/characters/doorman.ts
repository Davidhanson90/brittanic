import { Character } from './character';
import type { ThreeCharacterConfig } from '../three-scene.component';

export class Doorman extends Character {
  override readonly id = 'doorman-outside';
  override readonly label = 'Doorman';
  override readonly cinematicVideoSrc = null;

  override readonly config: ThreeCharacterConfig = {
    id: this.id,
    videoSrc: 'video/doorman.mp4',
    videoWidth: 1152,
    videoHeight: 648,
    offsetXPercent: 6.29,
    offsetBottomPercent: 29.07,
    scale: 0.135,
    widthScale: 0.325,
    brightness: 0.8,
    key: { minGreen: 80, greenDominance: 1.05, minChannelGap: 10 },
  };
}
