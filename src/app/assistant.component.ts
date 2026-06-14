import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RotoscopeOverlayComponent, type RotoscopeOverlayConfig } from './rotoscope-overlay.component';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [RotoscopeOverlayComponent],
  template: `
    <app-rotoscope-overlay [overlay]="overlayConfig()" [active]="active()" [editMode]="editMode()"></app-rotoscope-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantComponent {
  readonly active = input(true);
  readonly scaleMultiplier = input(1);
  readonly editMode = input(false);

  private readonly baseOverlayConfig: RotoscopeOverlayConfig = {
    id: 'assistant-lobby',
    videoPath: 'video/assistant.mp4',
    width: 1152,
    height: 648,
    offsetXPercent: 40,
    offsetBottomPx: 0,
    scale: 0.5,
    key: {
      minGreen: 80,
      greenDominance: 1.05,
      minChannelGap: 10,
    },
  };

  protected readonly overlayConfig = computed<RotoscopeOverlayConfig>(() => ({
    ...this.baseOverlayConfig,
    scale: this.baseOverlayConfig.scale * this.scaleMultiplier(),
  }));
}
