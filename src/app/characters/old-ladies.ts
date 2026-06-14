import { Character } from './character';
import type { ThreeCharacterConfig } from '../three-scene.component';

export class OldLadies extends Character {
  override readonly id = 'old-ladies-lobby';
  override readonly label = 'Old Ladies';
  override readonly cinematicVideoSrc = 'video/two-old-ladies/selling-the-villa.mp4';

  override readonly config: ThreeCharacterConfig = {
    id: this.id,
    videoSrc: 'video/old-ladies.mp4',
    videoWidth: 1152,
    videoHeight: 648,
    offsetXPercent: -9.78,
    offsetBottomPercent: 24.5,
    scale: 0.259,
    widthScale: 0.5,
    brightness: 0.85,
    key: { minGreen: 80, greenDominance: 1.05, minChannelGap: 10 },
  };
}
