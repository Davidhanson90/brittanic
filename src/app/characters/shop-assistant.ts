import { Character } from './character';
import type { ThreeCharacterConfig } from '../three-scene.component';

export class ShopAssistant extends Character {
  override readonly id = 'shop-assistant';
  override readonly label = 'Shop Assistant';
  override readonly cinematicVideoSrc = 'video/lady-assistant/lady-assistant-add-clothes.mp4';

  override readonly config: ThreeCharacterConfig = {
    id: this.id,
    videoSrc: 'video/lady-assistant/lady-assistant-add-clothes.mp4',
    videoWidth: 1152,
    videoHeight: 648,
    offsetXPercent: 46.33,
    offsetBottomPercent: 17.33,
    scale: 0.49,
    widthScale: 0.42,
    brightness: 0.85,
    key: { minGreen: 80, greenDominance: 1.05, minChannelGap: 10 },
  };
}
