import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  effect,
  inject,
  input,
  output,
  runInInjectionContext,
  viewChild,
} from '@angular/core';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Public config type — used by app.ts to define each character
// ---------------------------------------------------------------------------

export interface ThreeCharacterConfig {
  id: string;
  videoSrc: string;
  videoWidth: number;
  videoHeight: number;
  /** % of viewport width from center (negative = left) */
  offsetXPercent: number;
  /** % of viewport height above the bottom edge */
  offsetBottomPercent: number;
  /** fraction of viewport height for character height */
  scale: number;
  flipHorizontal?: boolean;
  /** Horizontal squeeze independent of scale (1 = natural aspect, 0.4 = 60% narrower) */
  widthScale?: number;
  /** Show only the top fraction of the character (0.5 = top half, 1 = full, default 1) */
  clipFraction?: number;
  /** Brightness multiplier (1 = normal, 2 = double, default 1) */
  brightness?: number;
  key: {
    minGreen: number;        // 0-255
    greenDominance: number;  // ratio
    minChannelGap: number;   // 0-255
  };
}

// ---------------------------------------------------------------------------
// Shaders — chroma key in fragment shader, runs on GPU
// ---------------------------------------------------------------------------

const CHROMA_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const CHROMA_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D map;
uniform float minGreen;
uniform float greenDominance;
uniform float minChannelGap;
uniform float opacity;
uniform float brightness;
void main() {
  vec4 c = texture2D(map, vUv);
  float g = c.g, r = c.r, b = c.b;
  if (g > minGreen &&
      g > r * greenDominance &&
      g > b * greenDominance &&
      (g - max(r, b)) > minChannelGap) {
    discard;
  }
  gl_FragColor = vec4(c.rgb * brightness, c.a * opacity);
}`;

// ---------------------------------------------------------------------------
// Internal state per character
// ---------------------------------------------------------------------------

interface CharacterEntry {
  mesh: THREE.Mesh;
  video: HTMLVideoElement;
  texture: THREE.VideoTexture;
  config: ThreeCharacterConfig;
  dragOffsetXPercent: number;
  dragOffsetYPercent: number;
  scaleOffset: number;
  fadeStartTime: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-three-scene',
  standalone: true,
  template: `
    <div class="viewport-wrapper">
      <canvas #canvas></canvas>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      overflow: auto;
    }
    .viewport-wrapper {
      position: relative;
      width: 1920px;
      height: 1080px;
      max-width: 100%;
      max-height: 100%;
      aspect-ratio: 16 / 9;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreeSceneComponent implements AfterViewInit {

  // Fixed render resolution for every scene
  private static readonly VIEWPORT_WIDTH = 1920;
  private static readonly VIEWPORT_HEIGHT = 1080;

  // --- Inputs ---
  readonly backgroundImageSrc = input('');
  readonly transitionVideoSrc = input<string | null>(null);
  readonly showCharacters = input(false);
  readonly characters = input<ThreeCharacterConfig[]>([]);
  readonly selectedCharacterId = input<string | null>(null);

  // --- Outputs ---
  readonly transitionVideoEnded = output<void>();
  readonly characterClicked = output<string>();

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  // Three.js core
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private aspect = ThreeSceneComponent.VIEWPORT_WIDTH / ThreeSceneComponent.VIEWPORT_HEIGHT;
  private rafId: number | null = null;

  // Camera zoom state
  private cameraTargetX = 0;
  private cameraTargetY = 0;
  private cameraZoom = 1;
  private hoveredEntry: CharacterEntry | null = null;
  private readonly CAMERA_ZOOM = 1.5; // Camera zoom factor when hovering

  // Background
  private bgMesh!: THREE.Mesh;
  private bgCurrentSrc = '';

  // Transition video overlay
  private tvMesh: THREE.Mesh | null = null;
  private tvVideo: HTMLVideoElement | null = null;
  private tvTexture: THREE.VideoTexture | null = null;
  private tvCurrentSrc: string | null = null;

  // Characters
  private readonly characterEntries = new Map<string, CharacterEntry>();

  // Drag state
  private dragEntry: CharacterEntry | null = null;
  private dragPointerId = -1;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartOffsetX = 0;
  private dragStartOffsetY = 0;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngAfterViewInit(): void {
    const canvas = this.canvasRef().nativeElement;
    const w = ThreeSceneComponent.VIEWPORT_WIDTH;
    const h = ThreeSceneComponent.VIEWPORT_HEIGHT;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, premultipliedAlpha: false });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w, h, false);
    this.renderer.setClearColor(0x111111, 1);
    this.renderer.localClippingEnabled = true;

    this.scene = new THREE.Scene();
    // Orthographic camera: left=-aspect, right=aspect, top=1, bottom=-1
    this.camera = new THREE.OrthographicCamera(-this.aspect, this.aspect, 1, -1, -10, 10);
    this.camera.position.z = 5;

    // Create permanent background mesh — always at z=-5 (rear)
    const bgGeo = new THREE.PlaneGeometry(1, 1);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    this.bgMesh = new THREE.Mesh(bgGeo, bgMat);
    this.bgMesh.position.z = -5;
    this.scene.add(this.bgMesh);

    // Pointer events — bound as arrows so `this` is correct
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);

    this.destroyRef.onDestroy(() => {
      canvas.removeEventListener('pointerdown', this.onPointerDown);
      canvas.removeEventListener('pointermove', this.onPointerMove);
      canvas.removeEventListener('pointerup', this.onPointerUp);
      canvas.removeEventListener('pointercancel', this.onPointerUp);
      canvas.removeEventListener('wheel', this.onWheel);
      window.removeEventListener('keydown', this.onKeyDown);
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
      this.renderer.dispose();
    });

    // Reactive effects (must run inside injection context when called outside constructor)
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const src = this.backgroundImageSrc();
        if (src) this.loadBackground(src);
      });
      effect(() => this.handleTransitionVideo(this.transitionVideoSrc()));
      effect(() => this.syncCharacters(this.characters(), this.showCharacters()));
    });

    this.startLoop();
  }

  // ---------------------------------------------------------------------------
  // Resize
  // ---------------------------------------------------------------------------

  private handleResize(): void {
    // Viewport resolution is fixed; only re-fit content to the current aspect ratio.
    this.camera.left = -this.aspect;
    this.camera.right = this.aspect;
    this.camera.updateProjectionMatrix();
    this.fitCover(this.bgMesh);
    if (this.tvMesh) this.fitCover(this.tvMesh);
    for (const entry of this.characterEntries.values()) this.placeCharacter(entry);
  }

  // ---------------------------------------------------------------------------
  // Background image
  // ---------------------------------------------------------------------------

  private loadBackground(src: string): void {
    if (src === this.bgCurrentSrc) return;
    this.bgCurrentSrc = src;
    new THREE.TextureLoader().load(src, tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = this.bgMesh.material as THREE.MeshBasicMaterial;
      if (mat.map) mat.map.dispose();
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
      this.fitCover(this.bgMesh, tex);
    });
  }

  /** Scale mesh so texture covers the full viewport (object-fit: cover equivalent) */
  private fitCover(mesh: THREE.Mesh, tex?: THREE.Texture): void {
    const texture = tex ?? (mesh.material as THREE.MeshBasicMaterial).map ?? null;
    const img = texture?.image as (HTMLImageElement | HTMLVideoElement | null | undefined);
    if (!img) {
      mesh.scale.set(this.aspect * 2, 2, 1);
      return;
    }
    const imgW = (img as HTMLVideoElement).videoWidth || (img as HTMLImageElement).width || 1;
    const imgH = (img as HTMLVideoElement).videoHeight || (img as HTMLImageElement).height || 1;
    const imgAspect = imgW / imgH;
    if (this.aspect >= imgAspect) {
      // Screen wider than image → fit to width, crop top/bottom
      mesh.scale.set(this.aspect * 2, (this.aspect * 2) / imgAspect, 1);
    } else {
      // Image wider than screen → fit to height, crop sides
      mesh.scale.set(imgAspect * 2, 2, 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Transition video
  // ---------------------------------------------------------------------------

  private handleTransitionVideo(src: string | null): void {
    if (src === this.tvCurrentSrc) return;
    this.tvCurrentSrc = src;

    // Tear down previous
    if (this.tvMesh) {
      this.scene.remove(this.tvMesh);
      (this.tvMesh.material as THREE.Material).dispose();
      this.tvMesh.geometry.dispose();
      this.tvMesh = null;
    }
    if (this.tvVideo) { this.tvVideo.pause(); this.tvVideo.src = ''; this.tvVideo = null; }
    if (this.tvTexture) { this.tvTexture.dispose(); this.tvTexture = null; }

    if (!src) return;

    const vid = document.createElement('video');
    vid.src = src;
    vid.muted = true;
    vid.playsInline = true;
    vid.autoplay = true;
    vid.loop = false;
    vid.addEventListener('ended', () => this.transitionVideoEnded.emit(), { once: true });
    vid.play().catch(() => {});

    const tex = new THREE.VideoTexture(vid);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: tex }),
    );
    mesh.position.z = -4; // In front of background (-5), behind characters (-3 to -1)
    mesh.scale.set(this.aspect * 2, 2, 1); // Initial size; refined once metadata loads
    this.scene.add(mesh);

    vid.addEventListener('loadedmetadata', () => this.fitCover(mesh, tex), { once: true });

    this.tvVideo = vid;
    this.tvTexture = tex;
    this.tvMesh = mesh;
  }

  // ---------------------------------------------------------------------------
  // Characters
  // ---------------------------------------------------------------------------

  private syncCharacters(configs: ThreeCharacterConfig[], show: boolean): void {
    const activeIds = show ? new Set(configs.map(c => c.id)) : new Set<string>();

    // Remove characters no longer needed
    for (const [id, entry] of this.characterEntries) {
      if (!activeIds.has(id)) {
        this.disposeCharacterEntry(entry);
        this.characterEntries.delete(id);
      }
    }

    if (!show) return;

    for (const config of configs) {
      if (this.characterEntries.has(config.id)) {
        const entry = this.characterEntries.get(config.id)!;
        entry.config = config;
        this.updateKeyUniforms(entry);
        this.placeCharacter(entry);
      } else {
        this.addCharacter(config);
      }
    }
  }

  private addCharacter(config: ThreeCharacterConfig): void {
    const vid = document.createElement('video');
    vid.src = config.videoSrc;
    vid.autoplay = true;
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.style.border = 'none';
    vid.style.outline = 'none';
    vid.style.padding = '0';
    vid.style.margin = '0';
    vid.style.display = 'block';
    vid.play().catch(() => {});

    const tex = new THREE.VideoTexture(vid);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;

    const videoAspect = config.videoWidth / config.videoHeight;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: tex },
        minGreen: { value: config.key.minGreen / 255 },
        greenDominance: { value: config.key.greenDominance },
        minChannelGap: { value: config.key.minChannelGap / 255 },
        opacity: { value: 0 },
        brightness: { value: config.brightness ?? 1.0 },
      },
      vertexShader: CHROMA_VERT,
      fragmentShader: CHROMA_FRAG,
      transparent: true,
      depthWrite: false,
      premultipliedAlpha: false,
      clippingPlanes: config.clipFraction !== undefined && config.clipFraction < 1
        ? [new THREE.Plane(new THREE.Vector3(0, 1, 0), -(0.5 - config.clipFraction))]
        : [],
      clipIntersection: false,
    });

    // Geometry sized to video native aspect ratio; scale applied separately
    const geo = new THREE.PlaneGeometry(videoAspect, 1);
    const mesh = new THREE.Mesh(geo, mat);
    // Second character slightly in front of first
    mesh.position.z = -3 + this.characterEntries.size * 0.1;
    this.scene.add(mesh);

    const entry: CharacterEntry = {
      mesh, video: vid, texture: tex, config,
      dragOffsetXPercent: 0,
      dragOffsetYPercent: 0,
      scaleOffset: 1,
      fadeStartTime: performance.now(),
    };
    this.characterEntries.set(config.id, entry);
    this.placeCharacter(entry);
  }

  /** Position and scale a character mesh from its config + drag offsets */
  private placeCharacter(entry: CharacterEntry): void {
    const c = entry.config;
    const videoAspect = c.videoWidth / c.videoHeight;

    // Character height in world units: scale * 2 (viewport height = 2 world units)
    const worldH = c.scale * entry.scaleOffset * 2;
    const worldW = worldH * videoAspect;

    // X: offsetXPercent % of viewport width from center (aspect-independent)
    const worldX = ((c.offsetXPercent + entry.dragOffsetXPercent) / 100) * 2;

    // Y: offsetBottomPercent % of viewport height from bottom
    // Viewport Y: -1 (bottom) to 1 (top)
    const worldYBottom = -1 + ((c.offsetBottomPercent + entry.dragOffsetYPercent) / 100) * 2;
    const worldYCenter = worldYBottom + worldH / 2;

    entry.mesh.position.x = worldX;
    entry.mesh.position.y = worldYCenter;

    // Geometry is (videoAspect × 1); we scale it to (worldW × worldH)
    const flipX = c.flipHorizontal ? -1 : 1;
    entry.mesh.scale.set(flipX * (worldW / videoAspect) * (c.widthScale ?? 1), worldH, 1);
  }

  private updateKeyUniforms(entry: CharacterEntry): void {
    const uniforms = (entry.mesh.material as THREE.ShaderMaterial).uniforms;
    uniforms['minGreen'].value = entry.config.key.minGreen / 255;
    uniforms['greenDominance'].value = entry.config.key.greenDominance;
    uniforms['minChannelGap'].value = entry.config.key.minChannelGap / 255;
    uniforms['brightness'].value = entry.config.brightness ?? 1.0;
  }

  private disposeCharacterEntry(entry: CharacterEntry): void {
    this.scene.remove(entry.mesh);
    entry.video.pause();
    entry.video.src = '';
    entry.texture.dispose();
    (entry.mesh.material as THREE.ShaderMaterial).dispose();
    entry.mesh.geometry.dispose();
  }

  // ---------------------------------------------------------------------------
  // Render loop
  // ---------------------------------------------------------------------------

  private startLoop(): void {
    const FADE_DURATION = 1500; // ms
    const CAMERA_SPEED = 0.1; // Smooth camera interpolation speed
    const loop = () => {
      this.rafId = requestAnimationFrame(loop);
      const now = performance.now();
      // Mark video textures dirty each frame and update fade opacity
      for (const entry of this.characterEntries.values()) {
        if (entry.video.readyState >= 2) entry.texture.needsUpdate = true;
        const elapsed = now - entry.fadeStartTime;
        const opacity = Math.min(1, elapsed / FADE_DURATION);
        (entry.mesh.material as THREE.ShaderMaterial).uniforms['opacity'].value = opacity;
        this.placeCharacter(entry);
      }
      
      // Smooth camera zoom/pan interpolation
      this.camera.zoom += (this.cameraZoom - this.camera.zoom) * CAMERA_SPEED;
      this.camera.position.x += (this.cameraTargetX - this.camera.position.x) * CAMERA_SPEED;
      this.camera.position.y += (this.cameraTargetY - this.camera.position.y) * CAMERA_SPEED;
      
      this.camera.updateProjectionMatrix();
      
      if (this.tvVideo && this.tvVideo.readyState >= 2 && this.tvTexture) {
        this.tvTexture.needsUpdate = true;
      }
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  // ---------------------------------------------------------------------------
  // Pointer interaction — drag to move, scroll to resize selected character
  // ---------------------------------------------------------------------------

  private readonly onPointerDown = (event: PointerEvent): void => {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Raycast to find which character is under the mouse
    const mouse = new THREE.Vector2(
      (x / rect.width) * 2 - 1,
      -(y / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const meshes = Array.from(this.characterEntries.values()).map(e => e.mesh);
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const entry = Array.from(this.characterEntries.values()).find(e => e.mesh === hitMesh);
      if (entry && !this.selectedCharacterId()) {
        // Zoom in on clicked character
        this.hoveredEntry = entry;
        this.cameraTargetX = entry.mesh.position.x;
        this.cameraTargetY = entry.mesh.position.y;
        this.cameraZoom = this.CAMERA_ZOOM;
        // Trigger fade to white after camera zoom starts
        setTimeout(() => this.characterClicked.emit(entry.config.id), 200);
      }
    } else {
      // Clicked on background - reset camera
      this.hoveredEntry = null;
      this.cameraTargetX = 0;
      this.cameraTargetY = 0;
      this.cameraZoom = 1;
    }

    // Handle dragging for selected character
    const id = this.selectedCharacterId();
    if (!id) return;
    const dragEntry = this.characterEntries.get(id);
    if (!dragEntry) return;

    canvas.setPointerCapture(event.pointerId);

    this.dragEntry = dragEntry;
    this.dragPointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragStartOffsetX = dragEntry.dragOffsetXPercent;
    this.dragStartOffsetY = dragEntry.dragOffsetYPercent;
    event.preventDefault();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const canvas = this.canvasRef().nativeElement;

    // Handle dragging
    if (this.dragEntry && event.pointerId === this.dragPointerId) {
      const vw = canvas.clientWidth;
      const vh = canvas.clientHeight;
      if (vw <= 0 || vh <= 0) return;

      this.dragEntry.dragOffsetXPercent = this.dragStartOffsetX + ((event.clientX - this.dragStartX) / vw) * 100;
      this.dragEntry.dragOffsetYPercent = this.dragStartOffsetY - ((event.clientY - this.dragStartY) / vh) * 100;
      this.placeCharacter(this.dragEntry);
      event.preventDefault();
      return;
    }

    // Show pointer cursor when hovering over a character
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    const meshes = Array.from(this.characterEntries.values()).map(e => e.mesh);
    const intersects = raycaster.intersectObjects(meshes);
    canvas.style.cursor = intersects.length ? 'pointer' : '';
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.dragEntry || event.pointerId !== this.dragPointerId) return;
    const canvas = this.canvasRef().nativeElement;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    this.copyToClipboard(this.dragEntry);
    this.dragEntry = null;
    this.dragPointerId = -1;
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    const id = this.selectedCharacterId();
    if (!id) return;
    const payload = { action: 'delete', id };
    const text = JSON.stringify(payload, null, 2);
    navigator.clipboard?.writeText(text).catch(() => console.info('Delete action:', text));
  };

  private readonly onWheel = (event: WheelEvent): void => {
    const id = this.selectedCharacterId();
    if (!id) return;
    const entry = this.characterEntries.get(id);
    if (!entry) return;

    const dir = event.deltaY < 0 ? 1 : -1;
    entry.scaleOffset = Math.min(3, Math.max(0.1, entry.scaleOffset + dir * 0.05));
    this.placeCharacter(entry);
    this.copyToClipboard(entry);
    event.preventDefault();
  };

  // ---------------------------------------------------------------------------
  // Clipboard
  // ---------------------------------------------------------------------------

  private copyToClipboard(entry: CharacterEntry): void {
    const c = entry.config;
    const payload = {
      id: c.id,
      offsetXPercent: Number((c.offsetXPercent + entry.dragOffsetXPercent).toFixed(2)),
      offsetBottomPercent: Number((c.offsetBottomPercent + entry.dragOffsetYPercent).toFixed(2)),
      scale: Number((c.scale * entry.scaleOffset).toFixed(3)),
    };
    const text = JSON.stringify(payload, null, 2);
    navigator.clipboard?.writeText(text).catch(() => console.info('Position update:', text));
  }
}
