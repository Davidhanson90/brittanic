import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

interface RotoscopeKeyConfig {
  minGreen: number;
  greenDominance: number;
  minChannelGap: number;
}

export interface RotoscopeOverlayConfig {
  id: string;
  videoPath: string;
  width: number;
  height: number;
  offsetXPercent: number;
  offsetBottomPx: number;
  offsetBottomPercent?: number;
  scale: number;
  flipHorizontal?: boolean;
  key: RotoscopeKeyConfig;
}

@Component({
  selector: 'app-rotoscope-overlay',
  host: {
    '[style.z-index]': 'overlayZIndex()'
  },
  template: `
    <video
      #sourceVideo
      class="source-video"
      [src]="overlay().videoPath"
      [attr.width]="overlay().width"
      [attr.height]="overlay().height"
      autoplay
      loop
      muted
      playsinline
    ></video>

    <canvas
      #outputCanvas
      class="output-canvas"
      [attr.width]="overlay().width"
      [attr.height]="overlay().height"
      [style.transform]="canvasTransform()"
      [style.marginBottom.px]="effectiveOffsetBottomPx()"
      [style.pointerEvents]="editMode() ? 'auto' : 'none'"
      [style.cursor]="isDragging() ? 'grabbing' : 'grab'"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerCancel($event)"
      (wheel)="onWheel($event)"
    ></canvas>

    @if (showInteractionBadge()) {
      <div class="interaction-badge">{{ interactionBadgeText() }}</div>
    }
  `,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        overflow: hidden;
        pointer-events: none;
      }

      .source-video {
        display: none;
      }

      .output-canvas {
        display: block;
        transform-origin: bottom center;
        touch-action: none;
      }

      .interaction-badge {
        position: absolute;
        top: 1rem;
        left: 50%;
        transform: translateX(-50%);
        padding: 0.35rem 0.7rem;
        background: rgba(10, 10, 10, 0.75);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 999px;
        font: 600 0.8rem/1.1 system-ui, -apple-system, 'Segoe UI', sans-serif;
        letter-spacing: 0.02em;
        pointer-events: none;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RotoscopeOverlayComponent {
  readonly overlay = input.required<RotoscopeOverlayConfig>();
  readonly active = input(true);
  readonly editMode = input(false);

  private readonly sourceVideoRef = viewChild<ElementRef<HTMLVideoElement>>('sourceVideo');
  private readonly outputCanvasRef = viewChild<ElementRef<HTMLCanvasElement>>('outputCanvas');
  private readonly destroyRef = inject(DestroyRef);
  private readonly viewportSize = signal({ width: window.innerWidth, height: window.innerHeight });
  private readonly dragOffset = signal({ xPercent: 0, bottomPx: 0 });
  private readonly scaleOffset = signal(1);
  protected readonly isDragging = signal(false);
  protected readonly showInteractionBadge = signal(false);

  private animationFrameId: number | null = null;
  private isRendering = false;
  private interactionBadgeTimeoutId: number | null = null;

  // WebGL2 rendering state
  private gl: WebGL2RenderingContext | null = null;
  private glProgram: WebGLProgram | null = null;
  private glVideoTexture: WebGLTexture | null = null;
  private glPositionBuffer: WebGLBuffer | null = null;
  private glTexCoordBuffer: WebGLBuffer | null = null;
  private glPositionLocation = -1;
  private glTexCoordLocation = -1;
  private glVideoUniformLocation: WebGLUniformLocation | null = null;
  private glMinGreenLocation: WebGLUniformLocation | null = null;
  private glGreenDominanceLocation: WebGLUniformLocation | null = null;
  private glMinChannelGapLocation: WebGLUniformLocation | null = null;
  private dragState:
    | {
        pointerId: number;
        startClientX: number;
        startClientY: number;
        startOffsetXPercent: number;
        startOffsetBottomPx: number;
      }
    | null = null;

  protected readonly canvasTransform = computed(() => {
    const config = this.overlay();
    const drag = this.dragOffset();
    const scaleOffset = this.scaleOffset();
    const viewport = this.viewportSize();
    const scaleByWidth = viewport.width / config.width;
    const scaleByHeight = viewport.height / config.height;
    const viewportScale = Math.min(scaleByWidth, scaleByHeight);
    const totalScale = config.scale * scaleOffset * viewportScale;
    const horizontalScale = config.flipHorizontal ? -totalScale : totalScale;
    const translateXPx = ((config.offsetXPercent + drag.xPercent) / 100) * viewport.width;
    return `translateX(${translateXPx}px) scale(${horizontalScale}, ${totalScale})`;
  });

  protected readonly effectiveOffsetBottomPx = computed(() => {
    const config = this.overlay();
    const drag = this.dragOffset();
    const viewport = this.viewportSize();
    const baseBottomPx =
      config.offsetBottomPercent !== undefined
        ? (config.offsetBottomPercent / 100) * viewport.height
        : config.offsetBottomPx;
    return baseBottomPx + drag.bottomPx;
  });

  protected readonly overlayZIndex = computed(() => (this.isDragging() ? 7 : 3));

  protected readonly interactionBadgeText = computed(() => `${this.overlay().id} selected`);

  constructor() {
    effect(() => {
      const config = this.overlay();
      const isActive = this.active();
      const sourceVideo = this.sourceVideoRef()?.nativeElement;
      const outputCanvas = this.outputCanvasRef()?.nativeElement;

      // Reset interactive offsets when the overlay source changes.
      this.dragOffset.set({ xPercent: 0, bottomPx: 0 });
      this.scaleOffset.set(1);
      this.dragState = null;
      this.isDragging.set(false);
      this.clearInteractionBadgeTimer();
      this.showInteractionBadge.set(false);

      if (!sourceVideo || !outputCanvas) {
        return;
      }

      if (!isActive) {
        this.stopRendering();
        sourceVideo.pause();
        this.clearCanvas(outputCanvas);
        return;
      }

      sourceVideo.src = config.videoPath;
      sourceVideo.currentTime = 0;
      sourceVideo.load();

      sourceVideo
        .play()
        .then(() => {
          this.startRendering();
        })
        .catch(() => {
          // Autoplay may be blocked by the browser; playback listeners still recover when possible.
        });
    });

    const sourceVideo = this.sourceVideoRef;

    effect((onCleanup) => {
      const videoElement = sourceVideo()?.nativeElement;
      if (!videoElement) {
        return;
      }

      const handlePlay = () => this.startRendering();
      const handleLoadedData = () => {
        if (!videoElement.paused) {
          this.startRendering();
        }
      };

      videoElement.addEventListener('play', handlePlay);
      videoElement.addEventListener('loadeddata', handleLoadedData);

      onCleanup(() => {
        videoElement.removeEventListener('play', handlePlay);
        videoElement.removeEventListener('loadeddata', handleLoadedData);
      });
    });

    this.destroyRef.onDestroy(() => {
      this.stopRendering();
      this.destroyWebGL();
      this.clearInteractionBadgeTimer();
    });

    const handleResize = () => {
      this.viewportSize.set({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', handleResize);
    });
  }

  private startRendering(): void {
    if (this.isRendering) {
      return;
    }

    this.isRendering = true;
    this.animationFrameId = window.requestAnimationFrame(() => this.computeFrame());
  }

  private stopRendering(): void {
    this.isRendering = false;

    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // ---------------------------------------------------------------------------
  // WebGL2 initialisation
  // ---------------------------------------------------------------------------

  private initWebGL(canvas: HTMLCanvasElement): boolean {
    if (this.gl) {
      return true;
    }

    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false, alpha: true });
    if (!gl) {
      console.warn('WebGL2 not available — rotoscope rendering disabled.');
      return false;
    }

    const vsSource = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`;

    const fsSource = `#version 300 es
precision mediump float;
in vec2 v_texCoord;
uniform sampler2D u_video;
uniform float u_minGreen;
uniform float u_greenDominance;
uniform float u_minChannelGap;
out vec4 outColor;
void main() {
  vec4 color = texture(u_video, v_texCoord);
  float r = color.r;
  float g = color.g;
  float b = color.b;
  float maxRB = max(r, b);
  if (g > u_minGreen &&
      g > r * u_greenDominance &&
      g > b * u_greenDominance &&
      (g - maxRB) > u_minChannelGap) {
    discard;
  }
  outColor = color;
}`;

    const vs = this.compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) {
      return false;
    }

    const program = gl.createProgram();
    if (!program) {
      return false;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('WebGL program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return false;
    }

    const positionBuffer = gl.createBuffer();
    const texCoordBuffer = gl.createBuffer();
    const texture = gl.createTexture();
    if (!positionBuffer || !texCoordBuffer || !texture) {
      return false;
    }

    // Static UV coords — always map full texture to quad.
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.gl = gl;
    this.glProgram = program;
    this.glVideoTexture = texture;
    this.glPositionBuffer = positionBuffer;
    this.glTexCoordBuffer = texCoordBuffer;
    this.glPositionLocation = gl.getAttribLocation(program, 'a_position');
    this.glTexCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    this.glVideoUniformLocation = gl.getUniformLocation(program, 'u_video');
    this.glMinGreenLocation = gl.getUniformLocation(program, 'u_minGreen');
    this.glGreenDominanceLocation = gl.getUniformLocation(program, 'u_greenDominance');
    this.glMinChannelGapLocation = gl.getUniformLocation(program, 'u_minChannelGap');

    return true;
  }

  private compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) {
      return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('WebGL shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private destroyWebGL(): void {
    const gl = this.gl;
    if (!gl) {
      return;
    }
    if (this.glVideoTexture) gl.deleteTexture(this.glVideoTexture);
    if (this.glPositionBuffer) gl.deleteBuffer(this.glPositionBuffer);
    if (this.glTexCoordBuffer) gl.deleteBuffer(this.glTexCoordBuffer);
    if (this.glProgram) gl.deleteProgram(this.glProgram);
    this.gl = null;
    this.glProgram = null;
    this.glVideoTexture = null;
    this.glPositionBuffer = null;
    this.glTexCoordBuffer = null;
  }

  // ---------------------------------------------------------------------------
  // Per-frame rendering
  // ---------------------------------------------------------------------------

  private computeFrame(): void {
    if (!this.isRendering || !this.active()) {
      this.stopRendering();
      return;
    }

    const config = this.overlay();
    const sourceVideo = this.sourceVideoRef()?.nativeElement;
    const outputCanvas = this.outputCanvasRef()?.nativeElement;

    if (!sourceVideo || !outputCanvas) {
      this.stopRendering();
      return;
    }

    if (sourceVideo.readyState < 2) {
      this.animationFrameId = window.requestAnimationFrame(() => this.computeFrame());
      return;
    }

    if (!this.initWebGL(outputCanvas)) {
      this.stopRendering();
      return;
    }

    const gl = this.gl!;

    // Contain-fit: calculate clip-space quad for the video frame.
    const srcW = sourceVideo.videoWidth || outputCanvas.width;
    const srcH = sourceVideo.videoHeight || outputCanvas.height;
    const srcAspect = srcW / srcH;
    const canvasAspect = outputCanvas.width / outputCanvas.height;

    let drawW: number, drawH: number, offsetX = 0, offsetY = 0;
    if (srcAspect > canvasAspect) {
      drawW = outputCanvas.width;
      drawH = drawW / srcAspect;
      offsetY = (outputCanvas.height - drawH) / 2;
    } else {
      drawH = outputCanvas.height;
      drawW = drawH * srcAspect;
      offsetX = (outputCanvas.width - drawW) / 2;
    }

    // Convert pixel rect to WebGL clip space [-1, 1].
    const left   = (offsetX / outputCanvas.width) * 2 - 1;
    const right  = ((offsetX + drawW) / outputCanvas.width) * 2 - 1;
    const top    = 1 - (offsetY / outputCanvas.height) * 2;
    const bottom = 1 - ((offsetY + drawH) / outputCanvas.height) * 2;

    gl.viewport(0, 0, outputCanvas.width, outputCanvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.glProgram);

    // Upload quad position (dynamic each frame for contain-fit).
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      left, top,
      right, top,
      left, bottom,
      right, bottom,
    ]), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.glPositionLocation);
    gl.vertexAttribPointer(this.glPositionLocation, 2, gl.FLOAT, false, 0, 0);

    // Bind static UV coords.
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glTexCoordBuffer);
    gl.enableVertexAttribArray(this.glTexCoordLocation);
    gl.vertexAttribPointer(this.glTexCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Upload current video frame as texture.
    gl.bindTexture(gl.TEXTURE_2D, this.glVideoTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceVideo);

    // Chroma key uniforms — config values are 0-255; shader expects 0-1.
    gl.uniform1i(this.glVideoUniformLocation, 0);
    gl.uniform1f(this.glMinGreenLocation, config.key.minGreen / 255);
    gl.uniform1f(this.glGreenDominanceLocation, config.key.greenDominance);
    gl.uniform1f(this.glMinChannelGapLocation, config.key.minChannelGap / 255);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    this.animationFrameId = window.requestAnimationFrame(() => this.computeFrame());
  }

  private clearCanvas(canvas: HTMLCanvasElement): void {
    const gl = this.gl;
    if (gl) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }
    // Fallback for before WebGL is initialised.
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (!this.active() || !this.editMode()) {
      return;
    }

    const canvas = this.outputCanvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }

    const currentDragOffset = this.dragOffset();
    this.dragState = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetXPercent: currentDragOffset.xPercent,
      startOffsetBottomPx: currentDragOffset.bottomPx,
    };
    this.isDragging.set(true);
    this.bumpInteractionBadge();

    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  }


  protected onPointerMove(event: PointerEvent): void {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
      return;
    }

    const canvas = this.outputCanvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }

    const viewport = this.viewportSize();
    if (viewport.width <= 0) {
      return;
    }

    const deltaX = event.clientX - this.dragState.startClientX;
    const deltaY = event.clientY - this.dragState.startClientY;
    const deltaXPercent = (deltaX / viewport.width) * 100;

    this.dragOffset.set({
      xPercent: this.dragState.startOffsetXPercent + deltaXPercent,
      bottomPx: this.dragState.startOffsetBottomPx - deltaY,
    });

    event.preventDefault();
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
      return;
    }

    const canvas = this.outputCanvasRef()?.nativeElement;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    this.copyCurrentPositionToClipboard();
    this.dragState = null;
    this.isDragging.set(false);
    this.bumpInteractionBadge();
  }

  protected onPointerCancel(event: PointerEvent): void {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
      return;
    }

    const canvas = this.outputCanvasRef()?.nativeElement;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    this.dragState = null;
    this.isDragging.set(false);
    this.bumpInteractionBadge();
  }

  protected onWheel(event: WheelEvent): void {
    if (!this.active() || !this.editMode()) {
      return;
    }

    const canvas = this.outputCanvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }

    const currentScaleOffset = this.scaleOffset();
    const direction = event.deltaY < 0 ? 1 : -1;
    const nextScaleOffset = Math.min(3, Math.max(0.2, currentScaleOffset + direction * 0.05));

    if (nextScaleOffset === currentScaleOffset) {
      return;
    }

    this.scaleOffset.set(nextScaleOffset);
    this.copyCurrentPositionToClipboard();
    this.bumpInteractionBadge();
    event.preventDefault();
  }

  private bumpInteractionBadge(): void {
    this.showInteractionBadge.set(true);
    this.clearInteractionBadgeTimer();
    this.interactionBadgeTimeoutId = window.setTimeout(() => {
      this.showInteractionBadge.set(false);
      this.interactionBadgeTimeoutId = null;
    }, 1600);
  }

  private clearInteractionBadgeTimer(): void {
    if (this.interactionBadgeTimeoutId === null) {
      return;
    }

    window.clearTimeout(this.interactionBadgeTimeoutId);
    this.interactionBadgeTimeoutId = null;
  }

  private copyCurrentPositionToClipboard(): void {
    const config = this.overlay();
    const drag = this.dragOffset();
    const scaleOffset = this.scaleOffset();
    const viewport = this.viewportSize();
    const effectiveBottomPx =
      (config.offsetBottomPercent !== undefined
        ? (config.offsetBottomPercent / 100) * viewport.height
        : config.offsetBottomPx) + drag.bottomPx;

    const payload = {
      id: config.id,
      offsetXPercent: Number((config.offsetXPercent + drag.xPercent).toFixed(2)),
      offsetBottomPx: Math.round(effectiveBottomPx),
      offsetBottomPercent: Number(((effectiveBottomPx / viewport.height) * 100).toFixed(2)),
      scale: Number((config.scale * scaleOffset).toFixed(3)),
    };

    const text = JSON.stringify(payload, null, 2);
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      console.info('Character position update:', text);
      return;
    }

    navigator.clipboard.writeText(text).catch(() => {
      console.info('Character position update:', text);
    });
  }
}
