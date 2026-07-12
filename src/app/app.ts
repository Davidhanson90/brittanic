import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { ThreeSceneComponent } from './three-scene.component';
import { Character, Doorman, JewelryGuy, LadyInRed, OldLadies, SecurityGuard, ShopAssistant } from './characters';

type SceneStage = 'start' | 'transition-video' | 'end';
type SceneId = 'outside' | 'lobby' | 'lift' | 'lift-inside' | 'store';

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

  protected readonly outsideCharacters: Character[] = [
    new Doorman(),
    new LadyInRed(),
  ];

  protected readonly lobbyCharacters: Character[] = [
    new SecurityGuard(),
    new OldLadies(),
    new JewelryGuy(),
  ];

  protected readonly storeCharacters: Character[] = [
    new ShopAssistant(),
  ];

  private get allCharacters(): Character[] {
    return [...this.outsideCharacters, ...this.lobbyCharacters, ...this.storeCharacters];
  }
  protected readonly stage = signal<SceneStage>('start');
  protected readonly currentSceneId = signal<SceneId>('outside');
  protected readonly selectedCharacter = signal<string | null>(null);

  // --- Cinematic video overlay ---
  protected readonly cinematicVideoActive = signal(false);
  protected readonly cinematicVideoSrc = signal('');
  protected readonly cinematicVideoEnded = signal(false);

  // --- Per-character edit state (reset when selection changes) ---
  protected readonly editBrightness = signal(1.0);
  protected readonly editWidthScale = signal(1.0);
  protected readonly editScale = signal(0.3);

  constructor() {
    effect(() => {
      const id = this.selectedCharacter();
      if (!id) return;
      const c = this.allCharacters.find(ch => ch.id === id);
      if (c) {
        this.editBrightness.set(c.config.brightness ?? 1.0);
        this.editWidthScale.set(c.config.widthScale ?? 1.0);
        this.editScale.set(c.config.scale);
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
  protected readonly videoSkipping = signal(false);
  protected readonly videoTransitioning = signal(false);
  protected readonly videoFadingOut = signal(false);
  protected readonly showFloorPanel = signal(false);

  protected readonly floors: { number: number; logo: string; shop: string }[] = [
    { number: 1,  logo: '💎', shop: 'Crown Jewellers' },
    { number: 2,  logo: '👗', shop: 'Maison Couture' },
    { number: 3,  logo: '⌚', shop: 'Horologium' },
    { number: 4,  logo: '👞', shop: 'Cobbler &amp; Co.' },
    { number: 5,  logo: '📚', shop: 'Page &amp; Quill' },
    { number: 6,  logo: '🍵', shop: 'The Tea Emporium' },
    { number: 7,  logo: '🧴', shop: 'Apothecary &amp; Bloom' },
    { number: 8,  logo: '🎩', shop: 'Hatters &amp; Haberdashers' },
    { number: 9,  logo: '🖼️', shop: 'Gilded Frame Gallery' },
    { number: 10, logo: '🍫', shop: 'Chocolatier Royale' },
    { number: 11, logo: '🧵', shop: 'Silk &amp; Thread' },
    { number: 12, logo: '🎻', shop: 'Crescendo Music Hall' },
    { number: 13, logo: '🕯️', shop: 'Chandler &amp; Wick' },
    { number: 14, logo: '🧳', shop: 'Globe Trotter Luggage' },
    { number: 15, logo: '🌿', shop: 'Botanica Verde' },
    { number: 16, logo: '🍷', shop: 'Vintner&apos;s Vault' },
    { number: 17, logo: '🖋️', shop: 'Stationer&apos;s Guild' },
    { number: 18, logo: '🧸', shop: 'Toy Emporium' },
    { number: 19, logo: '📷', shop: 'Lens &amp; Light' },
    { number: 20, logo: '🪞', shop: 'Looking Glass &amp; Co.' },
    { number: 21, logo: '🎀', shop: 'Ribbons &amp; Bows' },
    { number: 22, logo: '🧶', shop: 'The Knitting Nook' },
    { number: 23, logo: '🕰️', shop: 'Grandfather&apos;s Clocks' },
    { number: 24, logo: '🎭', shop: 'Masquerade Costumiers' },
    { number: 25, logo: '🪴', shop: 'Conservatory Plants' },
    { number: 26, logo: '📿', shop: 'Bead &amp; Bauble' },
    { number: 27, logo: '🧁', shop: 'Patisserie Belle' },
    { number: 28, logo: '🎨', shop: 'Atelier d&apos;Art' },
    { number: 29, logo: '🪶', shop: 'Quill &amp; Parchment' },
    { number: 30, logo: '🌟', shop: 'Penthouse Observatory' },
  ];

  // --- Computed signals for ThreeSceneComponent ---

  protected readonly sceneBackgroundSrc = computed(() => {
    if (this.stage() === 'start') return this.activeScene.startImage;
    return this.currentStillImagePath();
  });

  protected readonly sceneTransitionVideoSrc = computed<string | null>(() =>
    this.showVideo() ? this.transitionVideoPathState() : null,
  );

  protected readonly sceneShowCharacters = computed(() =>
    (this.stage() === 'start' || (this.stage() === 'end' && (this.currentSceneId() === 'lobby' || this.currentSceneId() === 'store'))) && !this.showVideo(),
  );

  protected readonly sceneCharacters = computed(() => {
    const id = this.selectedCharacter();
    const applyEdits = (chars: Character[]) =>
      chars.map(c => c.id === id ? {
        ...c.config,
        brightness: this.editBrightness(),
        widthScale: this.editWidthScale(),
        scale: this.editScale(),
      } : c.config);
    if (this.stage() === 'start') return applyEdits(this.outsideCharacters);
    if (this.currentSceneId() === 'lobby') return applyEdits(this.lobbyCharacters);
    if (this.currentSceneId() === 'store') return applyEdits(this.storeCharacters);
    return [];
  });

  protected copyEditConfig(): void {
    const id = this.selectedCharacter();
    if (!id) return;
    const base = this.allCharacters.find(c => c.id === id);
    if (!base) return;
    const payload = {
      id,
      offsetXPercent: base.config.offsetXPercent,
      offsetBottomPercent: base.config.offsetBottomPercent,
      scale: Number(this.editScale().toFixed(3)),
      widthScale: Number(this.editWidthScale().toFixed(3)),
      brightness: Number(this.editBrightness().toFixed(2)),
    };
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
  }

  protected onCharacterClicked(id: string): void {
    const character = this.allCharacters.find(c => c.id === id);
    if (!character?.cinematicVideoSrc) return;
    character.clicked.next(id);
    this.cinematicVideoEnded.set(false);
    this.cinematicVideoSrc.set(character.cinematicVideoSrc);
    this.cinematicVideoActive.set(true);
  }

  protected onCinematicVideoEnded(): void {
    this.cinematicVideoEnded.set(true);
  }

  protected closeCinematicVideo(): void {
    this.cinematicVideoActive.set(false);
    this.cinematicVideoEnded.set(false);
    const src = this.cinematicVideoSrc();
    this.cinematicVideoSrc.set('');
    const character = this.allCharacters.find(c => c.cinematicVideoSrc === src);
    if (character?.triggersSceneTransition) {
      this.transitionStarted.set(true);
      this.currentStillImagePath.set('images/brittanic-lobby.jpg');
      this.currentStillImageAlt.set('Brittanic lobby');
      this.currentSceneId.set('lobby');
      this.stage.set('end');
    }
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
      'lift-inside': { image: 'images/lift-inside.jpg', alt: 'Lift inside' },
      store: { image: 'images/store-1.jpg', alt: 'Store' },
    };
    const dest = imageMap[sceneId];
    this.transitionStarted.set(true);
    this.showVideo.set(false);
    this.currentStillImagePath.set(dest.image);
    this.currentStillImageAlt.set(dest.alt);
    this.currentSceneId.set(sceneId);
    this.stage.set('end');
  }

  protected onVideoEnding(): void {
    if (this.stage() !== 'transition-video') return;
    this.videoFadingOut.set(true);
  }

  protected onVideoEnded(): void {
    if (this.stage() !== 'transition-video' || this.videoTransitioning()) return;
    this.videoTransitioning.set(true);
    // Fade to black, then switch scene, then fade up
    setTimeout(() => {
      this.currentStillImagePath.set(this.transitionTargetImagePath());
      this.currentStillImageAlt.set(this.transitionTargetImageAlt());
      this.showVideo.set(false);
      this.currentSceneId.set(this.transitionTargetSceneId());
      this.stage.set('end');
      this.videoFadingOut.set(false);
      // Trigger fade-up by removing overlay after a frame
      requestAnimationFrame(() => {
        this.videoTransitioning.set(false);
      });
    }, 100);
  }

  protected onBackgroundClicked(): void {
    if (this.showVideo()) return;
    if (this.stage() === 'start') {
      this.onStartImageClick();
      return;
    }
    if (this.stage() !== 'end') return;
    const scene = this.currentSceneId();
    if (scene === 'lobby') this.onLiftClick();
    else if (scene === 'lift') this.onEnterLiftClick();
    else if (scene === 'lift-inside') this.toggleFloorPanel();
    else if (scene === 'store') this.jumpToScene('lobby');
  }

  protected skipVideo(): void {
    if (this.stage() !== 'transition-video' || this.videoSkipping()) return;
    this.videoSkipping.set(true);
    setTimeout(() => {
      this.currentStillImagePath.set(this.transitionTargetImagePath());
      this.currentStillImageAlt.set(this.transitionTargetImageAlt());
      this.showVideo.set(false);
      this.currentSceneId.set(this.transitionTargetSceneId());
      this.stage.set('end');
      this.videoSkipping.set(false);
    }, 300);
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
    this.transitionVideoPathState.set('video/enter-the-lift.mp4');
    this.transitionTargetSceneId.set('lift-inside');
    this.transitionTargetImagePath.set('images/lift-inside.jpg');
    this.transitionTargetImageAlt.set('Lift inside');
    this.stage.set('transition-video');
    this.showVideo.set(true);
  }

  protected get isLobbyScene(): boolean {
    return this.stage() === 'end' && this.currentSceneId() === 'lobby';
  }

  protected get isLiftScene(): boolean {
    return this.stage() === 'end' && this.currentSceneId() === 'lift';
  }

  protected get isLiftInsideScene(): boolean {
    return this.stage() === 'end' && this.currentSceneId() === 'lift-inside';
  }

  protected get isStoreScene(): boolean {
    return this.stage() === 'end' && this.currentSceneId() === 'store';
  }

  protected toggleFloorPanel(): void {
    if (this.stage() !== 'end' || this.currentSceneId() !== 'lift-inside' || this.showVideo()) return;
    this.showFloorPanel.update(v => !v);
  }

  protected closeFloorPanel(): void {
    this.showFloorPanel.set(false);
  }

  protected onFloorSelect(floor: number): void {
    this.showFloorPanel.set(false);
    if (this.stage() !== 'end' || this.currentSceneId() !== 'lift-inside' || this.showVideo()) return;
    this.transitionVideoPathState.set('video/exit-lift.mp4');
    this.transitionTargetSceneId.set('store');
    this.transitionTargetImagePath.set('images/store-1.jpg');
    this.transitionTargetImageAlt.set('Store');
    this.stage.set('transition-video');
    this.showVideo.set(true);
  }
}
