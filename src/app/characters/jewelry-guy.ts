import { Character } from './character';
import type { ThreeCharacterConfig } from '../three-scene.component';

export class JewelryGuy extends Character {
  override readonly id = 'jewelry-guy-lobby';
  override readonly label = 'Jewelry Guy';
  override readonly cinematicVideoSrc = 'video/jewlery-guy/secret-necklass.mp4';

  override readonly config: ThreeCharacterConfig = {
    id: this.id,
    videoSrc: 'video/jewlery-guy.mp4',
    videoWidth: 1152,
    videoHeight: 648,
    offsetXPercent: 81.18,
    offsetBottomPercent: 35.17,
    scale: 0.14,
    widthScale: 0.6,
    brightness: 1.0,
    key: { minGreen: 80, greenDominance: 1.05, minChannelGap: 10 },
  };
}
