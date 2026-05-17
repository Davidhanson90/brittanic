export interface UIElements {
  app: HTMLDivElement;
  canvas: HTMLCanvasElement;
  sceneButtons: HTMLButtonElement[];
  transitionMask: HTMLDivElement;
  transitionLabel: HTMLParagraphElement;
  primaryAction: HTMLButtonElement;
  levelSelector: HTMLElement;
  levelGrid: HTMLDivElement;
  selectorCurrentLevel: HTMLSpanElement;
  goLobby: HTMLButtonElement;
  brightnessInput: HTMLInputElement;
  brightnessValue: HTMLSpanElement;
  zoneEyebrow: HTMLParagraphElement;
  zoneTitle: HTMLHeadingElement;
  zoneCopy: HTMLParagraphElement;
  assistantQuote: HTMLParagraphElement;
  aiToggle: HTMLButtonElement;
  aiToggleLabel: HTMLSpanElement;
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element as T;
}

export function getUIElements(): UIElements {
  return {
    app: requireElement<HTMLDivElement>("#app"),
    canvas: requireElement<HTMLCanvasElement>("#world"),
    sceneButtons: [...document.querySelectorAll<HTMLButtonElement>(".zone-chip")],
    transitionMask: requireElement<HTMLDivElement>("#transition-mask"),
    transitionLabel: requireElement<HTMLParagraphElement>("#transition-label"),
    primaryAction: requireElement<HTMLButtonElement>("#primary-action"),
    levelSelector: requireElement<HTMLElement>("#level-selector"),
    levelGrid: requireElement<HTMLDivElement>("#level-grid"),
    selectorCurrentLevel: requireElement<HTMLSpanElement>("#selector-current-level"),
    goLobby: requireElement<HTMLButtonElement>("#go-lobby"),
    brightnessInput: requireElement<HTMLInputElement>("#room-brightness"),
    brightnessValue: requireElement<HTMLSpanElement>("#room-brightness-value"),
    zoneEyebrow: requireElement<HTMLParagraphElement>("#zone-eyebrow"),
    zoneTitle: requireElement<HTMLHeadingElement>("#zone-title"),
    zoneCopy: requireElement<HTMLParagraphElement>("#zone-copy"),
    assistantQuote: requireElement<HTMLParagraphElement>("#assistant-quote"),
    aiToggle: requireElement<HTMLButtonElement>("#ai-toggle"),
    aiToggleLabel: requireElement<HTMLSpanElement>("#ai-toggle-label")
  };
}
