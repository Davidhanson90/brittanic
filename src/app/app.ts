import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { ThreeSceneComponent, ThreeCharacterConfig } from './three-scene.component';

type SceneStage = 'start' | 'transition-video' | 'end';
type SceneId = 'outside' | 'lobby' | 'lift' | 'store-entrance';

interface LocationScene {
  id: string;
  startImage: string;
  transitionVideo: string;
  endImage: string;
  altStart: string;
  altEnd: string;
}


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ThreeSceneComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly scenes: LocationScene[] = [
    {
      id: 'outside',
      startImage: 'images/brittanic-entrance.jpg',
      transitionVideo: 'video/entrance-transition.mp4',
      endImage: 'images/brittanic-lobby.jpg',
      altStart: 'Brittanic entrance',
      altEnd: 'Brittanic lobby',
    },
  ];

  protected readonly activeScene = this.scenes[0];

  protected readonly outsideCharacters: ThreeCharacterConfig[] = [
    {
      id: 'doorman-outside',
      videoSrc: 'video/doorman.mp4',
      videoWidth: 1152,
      videoHeight: 648,
      offsetXPercent: 6.29,
      offsetBottomPercent: 29.07,
      scale: 0.135,
      widthScale: 0.325,
      brightness: 0.8,
      key: { minGreen: 80, greenDominance: 1.05, minChannelGap: 10 },
    },
    {
      id: 'lady-in-red',
      videoSrc: 'video/lady-in-red.mp4',
      videoWidth: 1152,
      videoHeight: 648,
      offsetXPercent: -30.89,
      offsetBottomPercent: 18.34,
      scale: 0.18,
      widthScale: 0.3,
      brightness: 0.75,
      key: { minGreen: 80, greenDominance: 1.05, minChannelGap: 10 },
    },
  ];

  protected readonly lobbyCharacters: ThreeCharacterConfig[] = [
    {
      id: 'security-guard-lobby',
      videoSrc: 'video/security-guard.mp4',
      videoWidth: 1152,
      videoHeight: 648,
      offsetXPercent: -46.84,
      offsetBottomPercent: 5.83,
      scale: 0.558,
      widthScale: 0.29,
      brightness: 0.9,
      key: { minGreen: 70, greenDominance: 1.02, minChannelGap: 5 },
    },
    {
      id: 'old-ladies-lobby',
      videoSrc: 'video/old-ladies.mp4',
      videoWidth: 1152,
      videoHeight: 648,
      offsetXPercent: -9.78,
      offsetBottomPercent: 24.5,
      scale: 0.259,
      widthScale: 0.5,
      brightness: 0.85,
      key: { minGreen: 80, greenDominance: 1.05, minChannelGap: 10 },
    },
    {
      id: 'jewelry-guy-lobby',
      videoSrc: 'video/jewlery-guy.mp4',
      videoWidth: 1152,
      videoHeight: 648,
      offsetXPercent: 69.43,
      offsetBottomPercent: 34.43,
      scale: 0.14,
      widthScale: 0.6,
      brightness: 1.0,
      key: { minGreen: 80, greenDominance: 1.05, minChannelGap: 10 },
    },
  ];
  protected readonly stage = signal<SceneStage>('start');
  protected readonly currentSceneId = signal<SceneId>('outside');
  protected readonly selectedCharacter = signal<string | null>(null);

  // --- Cinematic video overlay ---
  protected readonly cinematicVideoActive = signal(false);
  protected readonly cinematicVideoSrc = signal('');

  // --- Per-character edit state (reset when selection changes) ---
  protected readonly editBrightness = signal(1.0);
  protected readonly editWidthScale = signal(1.0);
  protected readonly editScale = signal(0.3);

  constructor() {
    effect(() => {
      const id = this.selectedCharacter();
      if (!id) return;
      const all = [...this.outsideCharacters, ...this.lobbyCharacters];
      const c = all.find(ch => ch.id === id);
      if (c) {
        this.editBrightness.set(c.brightness ?? 1.0);
        this.editWidthScale.set(c.widthScale ?? 1.0);
        this.editScale.set(c.scale);
      }
    });
  }
  protected readonly transitionVideoPathState = signal(this.activeScene.transitionVideo);
  protected readonly transitionTargetSceneId = signal<SceneId>('lobby');
  protected readonly transitionTargetImagePath = signal(this.activeScene.endImage);
  protected readonly transitionTargetImageAlt = signal(this.activeScene.altEnd);
  protected readonly currentStillImagePath = signal(this.activeScene.startImage);
  protected readonly currentStillImageAlt = signal(this.activeScene.altEnd);
  protected readonly transitionStarted = signal(false);
  protected readonly showVideo = signal(false);

  // --- Computed signals for ThreeSceneComponent ---

  protected readonly sceneBackgroundSrc = computed(() => {
    if (this.stage() === 'start') return this.activeScene.startImage;
    return this.currentStillImagePath();
  });

  protected readonly sceneTransitionVideoSrc = computed<string | null>(() =>
    this.showVideo() ? this.transitionVideoPathState() : null,
  );

  protected readonly sceneShowCharacters = computed(() =>
    (this.stage() === 'start' || (this.stage() === 'end' && this.currentSceneId() === 'lobby')) && !this.showVideo(),
  );

  protected readonly sceneCharacters = computed(() => {
    const id = this.selectedCharacter();
    const applyEdits = (chars: ThreeCharacterConfig[]) =>
      chars.map(c => c.id === id ? {
        ...c,
        brightness: this.editBrightness(),
        widthScale: this.editWidthScale(),
        scale: this.editScale(),
      } : c);
    if (this.stage() === 'start') return applyEdits(this.outsideCharacters);
    if (this.currentSceneId() === 'lobby') return applyEdits(this.lobbyCharacters);
    return [];
  });

  protected copyEditConfig(): void {
    const id = this.selectedCharacter();
    if (!id) return;
    const all = [...this.outsideCharacters, ...this.lobbyCharacters];
    const base = all.find(c => c.id === id);
    if (!base) return;
    const payload = {
      id,
      offsetXPercent: base.offsetXPercent,
      offsetBottomPercent: base.offsetBottomPercent,
      scale: Number(this.editScale().toFixed(3)),
      widthScale: Number(this.editWidthScale().toFixed(3)),
      brightness: Number(this.editBrightness().toFixed(2)),
    };
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
  }

  protected onCharacterClicked(id: string): void {
    if (id !== 'security-guard-lobby') return;
    this.cinematicVideoSrc.set('video/security/the-best-deals.mp4');
    this.cinematicVideoActive.set(true);
  }

  protected onCinematicVideoEnded(): void {
    this.cinematicVideoActive.set(false);
    this.cinematicVideoSrc.set('');
    this.transitionStarted.set(true);
    this.currentStillImagePath.set('images/brittanic-lobby.jpg');
    this.currentStillImageAlt.set('Brittanic lobby');
    this.currentSceneId.set('lobby');
    this.stage.set('end');
  }

  protected onStartImageClick(): void {
    if (this.transitionStarted() || this.stage() !== 'start') return;
    this.transitionStarted.set(true);
    this.transitionVideoPathState.set(this.activeScene.transitionVideo);
    this.transitionTargetSceneId.set('lobby');
    this.transitionTargetImagePath.set(this.activeScene.endImage);
    this.transitionTargetImageAlt.set(this.activeScene.altEnd);
    this.stage.set('transition-video');
    this.showVideo.set(true);
  }

  protected jumpToScene(sceneId: SceneId): void {
    const imageMap: Record<SceneId, { image: string; alt: string }> = {
      outside: { image: this.activeScene.startImage, alt: this.activeScene.altStart },
      lobby:   { image: 'images/brittanic-lobby.jpg', alt: 'Brittanic lobby' },
      lift:    { image: 'images/lift.jpg', alt: 'Lift' },
      'store-entrance': { image: 'images/store-entrance.jpg', alt: 'Store entrance' },
    };
    const dest = imageMap[sceneId];
    this.transitionStarted.set(true);
    this.showVideo.set(false);
    this.currentStillImagePath.set(dest.image);
    this.currentStillImageAlt.set(dest.alt);
    this.currentSceneId.set(sceneId);
    this.stage.set('end');
  }

  protected onVideoEnded(): void {
    if (this.stage() !== 'transition-video') return;
    this.currentStillImagePath.set(this.transitionTargetImagePath());
    this.currentStillImageAlt.set(this.transitionTargetImageAlt());
    this.showVideo.set(false);
    this.currentSceneId.set(this.transitionTargetSceneId());
    this.stage.set('end');
  }

  protected onLiftClick(): void {
    if (this.stage() !== 'end' || this.currentSceneId() !== 'lobby' || this.showVideo()) return;
    this.transitionVideoPathState.set('video/lobby-2-lift.mp4');
    this.transitionTargetSceneId.set('lift');
    this.transitionTargetImagePath.set('images/lift.jpg');
    this.transitionTargetImageAlt.set('Lift');
    this.stage.set('transition-video');
    this.showVideo.set(true);
  }

  protected onEnterLiftClick(): void {
    if (this.stage() !== 'end' || this.currentSceneId() !== 'lift' || this.showVideo()) return;
    this.transitionVideoPathState.set('video/lift-to-floor.mp4');
    this.transitionTargetSceneId.set('store-entrance');
    this.transitionTargetImagePath.set('images/store-entrance.jpg');
    this.transitionTargetImageAlt.set('Store entrance');
    this.stage.set('transition-video');
    this.showVideo.set(true);
  }

  protected get isLobbyScene(): boolean {
    return this.stage() === 'end' && this.currentSceneId() === 'lobby';
  }

  protected get isLiftScene(): boolean {
    return this.stage() === 'end' && this.currentSceneId() === 'lift';
  }
}
