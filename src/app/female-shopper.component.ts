import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RotoscopeOverlayComponent, type RotoscopeOverlayConfig } from './rotoscope-overlay.component';

@Component({
  selector: 'app-female-shopper',
  standalone: true,
  imports: [RotoscopeOverlayComponent],
  template: `
    <app-rotoscope-overlay [overlay]="overlayConfig()" [active]="active()" [editMode]="editMode()"></app-rotoscope-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FemaleShopperComponent {
  readonly active = input(true);
  readonly scaleMultiplier = input(1);
  readonly editMode = input(false);

  private readonly baseOverlayConfig: RotoscopeOverlayConfig = {
    id: 'female-shopper-lobby',
    videoPath: 'video/female-shopper.mp4',
    width: 1152,
    height: 648,
    offsetXPercent: -27.91,
    offsetBottomPx: 214,
    offsetBottomPercent: 22.83,
    scale: 0.212,
    flipHorizontal: true,
    key: {
      minGreen: 92,
      greenDominance: 1.1,
      minChannelGap: 12,
    },
  };

  protected readonly overlayConfig = computed<RotoscopeOverlayConfig>(() => ({
    ...this.baseOverlayConfig,
    scale: this.baseOverlayConfig.scale * this.scaleMultiplier(),
  }));
}
