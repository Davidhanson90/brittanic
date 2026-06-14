import { Character } from './character';
import type { ThreeCharacterConfig } from '../three-scene.component';

export class SecurityGuard extends Character {
  override readonly id = 'security-guard-lobby';
  override readonly label = 'Security Guard';
  override readonly cinematicVideoSrc = 'video/security/the-best-deals.mp4';
  override readonly triggersSceneTransition = true;

  override readonly config: ThreeCharacterConfig = {
    id: this.id,
    videoSrc: 'video/security-guard.mp4',
    videoWidth: 1152,
    videoHeight: 648,
    offsetXPercent: -46.84,
    offsetBottomPercent: 5.83,
    scale: 0.558,
    widthScale: 0.29,
    brightness: 0.9,
    key: { minGreen: 70, greenDominance: 1.02, minChannelGap: 5 },
  };
}
