import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { SCENES } from "./config/scenes";
import type { SceneName } from "./types";
import { getUIElements } from "./ui/elements";
import { buildWorld } from "./world/buildWorld";

const ui = getUIElements();

const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.32;
ui.canvas.style.filter = "saturate(1.32) contrast(1.1)";

const scene = new THREE.Scene();
scene.background = new THREE.Color("#0d0f14");
scene.fog = null;

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.copy(SCENES.entrance.cam);
camera.lookAt(SCENES.entrance.target);

const ambientLight = new THREE.AmbientLight("#ffe8bf", SCENES.entrance.ambient);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight("#ffe9c8", "#6a3426", 0.6);
scene.add(hemisphereLight);

const keyLight = new THREE.SpotLight("#ffd28a", 3.4, 52, Math.PI / 4, 0.26, 1.08);
keyLight.position.set(0, 8.3, 2.8);
keyLight.target.position.set(0, 1.6, -3.9);
scene.add(keyLight, keyLight.target);

const fillLight = new THREE.PointLight("#d49768", 2.0, 42, 1.7);
fillLight.position.set(-7, 3.2, -3.4);
scene.add(fillLight);

const rimLight = new THREE.PointLight("#ffe3b2", 1.35, 34, 2);
rimLight.position.set(7, 4.1, -5.5);
scene.add(rimLight);

const textureLoader = new THREE.TextureLoader();
const world = buildWorld(scene, textureLoader);
world.liftGroup.visible = false;
world.shopGroup.visible = false;

const debugSearchParams = new URLSearchParams(window.location.search);

function isTruthyFlagValue(value: string | null) {
  if (value === null) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "" || normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isEnabledBySearchParam(params: URLSearchParams, key: string) {
  return isTruthyFlagValue(params.get(key));
}

function isEnabledByLocalStorage(key: string) {
  return isTruthyFlagValue(window.localStorage.getItem(key));
}

const DEBUG_LABELS_ENABLED =
  isEnabledBySearchParam(debugSearchParams, "debug") ||
  isEnabledBySearchParam(debugSearchParams, "debugLabels") ||
  isEnabledByLocalStorage("debugLabels");

const debugLabelRenderer = DEBUG_LABELS_ENABLED ? new CSS2DRenderer() : null;
const speechRenderer = new CSS2DRenderer();

speechRenderer.setSize(window.innerWidth, window.innerHeight);
speechRenderer.domElement.className = "speech-layer";
ui.app.appendChild(speechRenderer.domElement);

if (debugLabelRenderer) {
  debugLabelRenderer.setSize(window.innerWidth, window.innerHeight);
  debugLabelRenderer.domElement.className = "debug-label-layer";
  ui.app.appendChild(debugLabelRenderer.domElement);
}

const objectNameToast = document.createElement("div");
objectNameToast.className = "object-name-toast";
ui.app.appendChild(objectNameToast);
let objectNameToastTimer: number | null = null;
let ctrlModifierActive = false;
const ctrlClickSelectionNames: string[] = [];
const ctrlClickSelectionHighlights = new Map<string, THREE.BoxHelper>();

function showObjectNameToast(message: string) {
  objectNameToast.textContent = message;
  objectNameToast.classList.add("visible");

  if (objectNameToastTimer !== null) {
    window.clearTimeout(objectNameToastTimer);
  }

  objectNameToastTimer = window.setTimeout(() => {
    objectNameToast.classList.remove("visible");
  }, 1700);
}

function showObjectHighlight(object3D: THREE.Object3D) {
  const existingHighlight = ctrlClickSelectionHighlights.get(object3D.uuid);
  if (existingHighlight) {
    existingHighlight.visible = true;
    existingHighlight.setFromObject(object3D);
    return;
  }

  const highlight = new THREE.BoxHelper(object3D, 0xffd17a);
  const highlightMaterial = highlight.material as THREE.LineBasicMaterial;
  highlightMaterial.depthTest = false;
  highlightMaterial.transparent = true;
  highlightMaterial.opacity = 0.96;
  scene.add(highlight);
  ctrlClickSelectionHighlights.set(object3D.uuid, highlight);
}

function clearCtrlClickSelections() {
  ctrlClickSelectionNames.length = 0;
  for (const highlight of ctrlClickSelectionHighlights.values()) {
    scene.remove(highlight);
  }
  ctrlClickSelectionHighlights.clear();
}

async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const helperInput = document.createElement("textarea");
    helperInput.value = text;
    helperInput.setAttribute("readonly", "true");
    helperInput.style.position = "fixed";
    helperInput.style.opacity = "0";
    helperInput.style.pointerEvents = "none";
    document.body.appendChild(helperInput);
    helperInput.focus();
    helperInput.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(helperInput);
    return copied;
  }
}

function getCurrentSceneRoot() {
  if (currentScene === "lift") {
    return world.liftGroup;
  }
  if (currentScene === "shop") {
    return world.shopGroup;
  }
  return world.entranceGroup;
}

function getInspectableObjectRoot(mesh: THREE.Mesh, sceneRoot: THREE.Object3D) {
  let root: THREE.Object3D = mesh;
  while (root.parent && root.parent !== sceneRoot) {
    root = root.parent;
  }
  return root;
}

function getInspectableObjectName(object3D: THREE.Object3D) {
  const fallbackName =
    object3D instanceof THREE.Mesh
      ? object3D.geometry?.type?.replace("Geometry", "") || "Object"
      : "Object";
  const genericNamePattern = /^(Mesh|Box|Plane|Sphere|Torus|Cylinder|Capsule|Cone|Ring)\s\d+$/;

  if (object3D.name.trim() && !genericNamePattern.test(object3D.name.trim())) {
    return object3D.name.trim();
  }

  let parent: THREE.Object3D | null = object3D.parent;
  while (parent) {
    const parentName = parent.name.trim();
    if (parentName && !genericNamePattern.test(parentName)) {
      return parentName;
    }
    parent = parent.parent;
  }

  return fallbackName;
}

async function handleCtrlClickObjectInspect(event: PointerEvent) {
  const ctrlPressed =
    event.ctrlKey ||
    event.metaKey ||
    event.getModifierState("Control") ||
    event.getModifierState("Meta") ||
    ctrlModifierActive;

  if (!ctrlPressed) {
    return false;
  }

  const sceneRoot = getCurrentSceneRoot();
  const pickableMeshes: THREE.Mesh[] = [];
  sceneRoot.traverse((object3D) => {
    if (object3D instanceof THREE.Mesh && object3D.visible) {
      pickableMeshes.push(object3D);
    }
  });

  if (pickableMeshes.length === 0) {
    return false;
  }

  pointerToNDC(event);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickableMeshes, false)[0];
  if (!hit || !(hit.object instanceof THREE.Mesh)) {
    return false;
  }

  const selectedObjectRoot = getInspectableObjectRoot(hit.object, sceneRoot);
  const selectedName = getInspectableObjectName(selectedObjectRoot);
  if (!ctrlClickSelectionNames.includes(selectedName)) {
    ctrlClickSelectionNames.push(selectedName);
  }

  showObjectHighlight(selectedObjectRoot);
  showObjectNameToast(
    `Selected ${ctrlClickSelectionNames.length} item${ctrlClickSelectionNames.length === 1 ? "" : "s"}: ${selectedName}`
  );
  return true;
}

async function copyCtrlClickSelectionList() {
  if (ctrlClickSelectionNames.length === 0) {
    return;
  }

  const copied = await copyTextToClipboard(ctrlClickSelectionNames.join("\n"));
  showObjectNameToast(
    `${copied ? "Copied" : "Selected"} ${ctrlClickSelectionNames.length} item${ctrlClickSelectionNames.length === 1 ? "" : "s"} to clipboard`
  );
  clearCtrlClickSelections();
}

const meshTypeCounters: Record<string, number> = {};
type DebugLabelEntry = {
  mesh: THREE.Mesh;
  labelElement: HTMLDivElement;
  scope: THREE.Object3D;
};

const debugLabelEntries: DebugLabelEntry[] = [];
let isolatedDebugLabelScope: THREE.Object3D | null = null;

function getMeshDebugName(mesh: THREE.Mesh): string {
  if (mesh.name.trim()) {
    return mesh.name;
  }

  const baseType = mesh.geometry?.type?.replace("Geometry", "") || "Mesh";
  const nextIndex = (meshTypeCounters[baseType] || 0) + 1;
  meshTypeCounters[baseType] = nextIndex;

  return `${baseType} ${nextIndex}`;
}

function getMeshLabelOffset(mesh: THREE.Mesh): THREE.Vector3 {
  const geometry = mesh.geometry;
  if (!geometry || !(geometry instanceof THREE.BufferGeometry)) {
    return new THREE.Vector3(0.2, 0.2, 0);
  }

  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }

  const bounds = geometry.boundingBox;
  if (!bounds) {
    return new THREE.Vector3(0.2, 0.2, 0);
  }

  return new THREE.Vector3(bounds.max.x + 0.08, bounds.max.y + 0.08, 0);
}

function attachDebugLabels(root: THREE.Object3D) {
  root.traverse((object3D) => {
    if (!(object3D instanceof THREE.Mesh)) {
      return;
    }

    const labelText = getMeshDebugName(object3D);
    object3D.name = labelText;

    const labelElement = document.createElement("div");
    labelElement.className = "debug-object-label";
    labelElement.textContent = labelText;

    const labelObject = new CSS2DObject(labelElement);
    labelObject.position.copy(getMeshLabelOffset(object3D));
    object3D.add(labelObject);

    let scope: THREE.Object3D = object3D;
    while (
      scope.parent &&
      scope.parent !== world.entranceGroup &&
      scope.parent !== world.liftGroup &&
      scope.parent !== world.shopGroup
    ) {
      scope = scope.parent;
    }

    debugLabelEntries.push({ mesh: object3D, labelElement, scope });
  });
}

function applyDebugLabelIsolation() {
  const isolatedScope = isolatedDebugLabelScope;
  for (const entry of debugLabelEntries) {
    if (!isolatedScope) {
      entry.labelElement.style.display = "";
      continue;
    }

    entry.labelElement.style.display = entry.scope === isolatedScope ? "" : "none";
  }
}

function handleDebugLabelClick(event: PointerEvent) {
  pointerToNDC(event);
  raycaster.setFromCamera(pointer, camera);
  const meshes = debugLabelEntries.map((entry) => entry.mesh);
  const hit = raycaster.intersectObjects(meshes, false)[0];
  if (!hit || !(hit.object instanceof THREE.Mesh)) {
    return false;
  }

  const clickedEntry = debugLabelEntries.find((entry) => entry.mesh === hit.object);
  if (!clickedEntry) {
    return false;
  }

  if (isolatedDebugLabelScope === clickedEntry.scope) {
    isolatedDebugLabelScope = null;
  } else {
    isolatedDebugLabelScope = clickedEntry.scope;
  }

  applyDebugLabelIsolation();
  return true;
}

if (debugLabelRenderer) {
  attachDebugLabels(world.entranceGroup);
  attachDebugLabels(world.liftGroup);
  attachDebugLabels(world.shopGroup);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();

let currentScene: SceneName = "entrance";
let inTransition = false;
let liftMoving = false;
let liftLevel = 0;
let shopFloor = 1;
let levelSelectorOpen = false;
let levelSelectorAnimating = false;
let liftDisplayFocusActive = false;

let entranceYaw = 0;
let entrancePitch = -0.08;
let liftYaw = 0;
let liftPitch = -0.02;
let shopYaw = 0;
let shopPitch = -0.05;

const movementState = {
  forward: false,
  back: false,
  left: false,
  right: false
};

const WALK_SPEED = 4.1;
const SHOP_WALK_SPEED = 3.7;
const entranceLookDirection = new THREE.Vector3();
const liftLookDirection = new THREE.Vector3();
const shopLookDirection = new THREE.Vector3();
const entranceForward = new THREE.Vector3();
const entranceRight = new THREE.Vector3();
const shopForward = new THREE.Vector3();
const shopRight = new THREE.Vector3();
const liftNormalPosition = new THREE.Vector3();
const liftNormalTarget = new THREE.Vector3();
const liftDisplayFocusPosition = new THREE.Vector3(0, 1.88, -0.42);
const liftDisplayFocusTarget = new THREE.Vector3(0, 2.92, -2.17);
const liftEntranceWomanWorldPos = new THREE.Vector3();
const WOMAN_GREETING_DISTANCE = 6.2;
let womanChatBubble: CSS2DObject | null = null;
let womanChatMounted = false;
let appReady = true;
let aiBypassEnabled = true;
let modelBootstrapInProgress = false;
let promptSession: {
  prompt: (input: string) => Promise<string>;
} | null = null;
let promptApiProvider: {
  availability?: (options?: unknown) => Promise<string>;
  create: (options?: unknown) => Promise<{ prompt: (input: string) => Promise<string> }>;
} | null = null;

const SALES_PERSONA_PROMPT = [
  "You are a luxury department store sales assistant in a Mayfair lobby.",
  "Be warm, concise, and practical.",
  "Help with any shopping ask and offer one useful follow-up question when needed.",
  "Avoid repeating prior lines unless asked."
].join(" ");

const SALES_ASSISTANT_FALLBACK_REPLY =
  "Welcome in. I can still help without AI mode. Tell me what you are shopping for today, and I can guide you to items, sizing, and recommendations.";

const promptApiOptions = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }]
} as const;

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

function setAiToggleState(mode: "off" | "loading" | "on", title: string) {
  ui.aiToggle.classList.toggle("enabled", mode === "on");
  ui.aiToggle.classList.toggle("loading", mode === "loading");
  ui.aiToggle.disabled = mode === "loading";
  ui.aiToggle.setAttribute("aria-pressed", mode === "on" ? "true" : "false");
  ui.aiToggle.title = title;
  ui.aiToggleLabel.textContent = mode === "on" ? "AI On" : mode === "loading" ? "AI..." : "AI Off";
}

async function bootstrapPromptAssistant(userActivated: boolean) {
  if (aiBypassEnabled) {
    modelBootstrapInProgress = false;
    setAiToggleState("off", "Enable AI assistant");
    return;
  }

  if (modelBootstrapInProgress) {
    return;
  }

  modelBootstrapInProgress = true;
  setAiToggleState("loading", "Preparing AI assistant...");

  const promptApi =
    (window as Window & { LanguageModel?: any }).LanguageModel ??
    (window as Window & { ai?: { languageModel?: any } }).ai?.languageModel;
  if (!promptApi) {
    aiBypassEnabled = true;
    setAiToggleState("off", "Prompt API unavailable in this browser build");
    ui.assistantQuote.textContent = SALES_ASSISTANT_FALLBACK_REPLY;
    modelBootstrapInProgress = false;
    return;
  }

  promptApiProvider = promptApi;

  try {
    const availability = promptApi.availability
      ? await promptApi.availability(promptApiOptions)
      : "available";
    if (availability === "unavailable") {
      aiBypassEnabled = true;
      setAiToggleState("off", "Prompt API unavailable on this device");
      ui.assistantQuote.textContent = SALES_ASSISTANT_FALLBACK_REPLY;
      modelBootstrapInProgress = false;
      return;
    }

    const monitor = {
      monitor(m: EventTarget) {
        m.addEventListener("downloadprogress", (event: Event) => {
          const loaded = Number((event as Event & { loaded?: number }).loaded ?? 0);
          const percent = Math.round(Math.max(0, Math.min(1, loaded)) * 100);
          ui.aiToggleLabel.textContent = `AI ${percent}%`;
        });
      }
    };

    try {
      promptSession = await promptApi.create({
        ...promptApiOptions,
        initialPrompts: [{ role: "system", content: SALES_PERSONA_PROMPT }],
        ...monitor
      });
    } catch {
      // Older Prompt API variants may reject expectedInputs/expectedOutputs.
      promptSession = await promptApi.create({
        initialPrompts: [{ role: "system", content: SALES_PERSONA_PROMPT }],
        ...monitor
      });
    }

    setAiToggleState("on", "Disable AI assistant");
    ui.assistantQuote.textContent = "AI assistant enabled. Ask for styles, sizes, or recommendations.";
  } catch {
    if (!userActivated) {
      setAiToggleState("off", "Enable AI assistant");
      modelBootstrapInProgress = false;
      return;
    }

    aiBypassEnabled = true;
    setAiToggleState("off", "Enable AI assistant");
    ui.assistantQuote.textContent = "AI setup failed. Using non-AI assistant responses for now.";
    promptSession = null;
  }

  modelBootstrapInProgress = false;
}

async function getSalesAssistantReply(message: string, conversation: ChatTurn[]) {
  if (aiBypassEnabled) {
    return SALES_ASSISTANT_FALLBACK_REPLY;
  }

  if (!promptSession && !modelBootstrapInProgress) {
    await bootstrapPromptAssistant(true);
  }

  if (!promptSession && promptApiProvider) {
    try {
      promptSession = await promptApiProvider.create({
        initialPrompts: [{ role: "system", content: SALES_PERSONA_PROMPT }]
      });
    } catch {
      promptSession = null;
    }
  }

  if (promptSession) {
    try {
      const recentConversation = conversation
        .slice(-8)
        .map((turn) => `${turn.role === "user" ? "Customer" : "Sales assistant"}: ${turn.content}`)
        .join("\n");

      const promptWithHistory = [
        "Use the conversation context below and reply as the sales assistant with a helpful follow-up.",
        recentConversation ? `Conversation so far:\n${recentConversation}` : "Conversation so far: (none)",
        `Customer: ${message}`,
        "Sales assistant:"
      ].join("\n\n");

      const response = await promptSession.prompt(promptWithHistory);
      return response.trim();
    } catch {
      return "I can help with that. Are you shopping for a specific item, size, or occasion today?";
    }
  }

  return "AI is currently off. Use the top-right AI toggle to enable richer assistant replies.";
}

function mountWomanChatBubble(womanRoot: THREE.Object3D) {
  const bubbleRoot = document.createElement("div");
  bubbleRoot.className = "woman-chat-bubble";

  const greeting = document.createElement("p");
  greeting.className = "woman-chat-greeting";
  greeting.textContent = "Hey David, great to see you again. What are you looking for today?";

  const responses = document.createElement("div");
  responses.className = "woman-chat-history";
  const conversation: ChatTurn[] = [];

  function keepLatestMessageVisible() {
    requestAnimationFrame(() => {
      const latest = responses.lastElementChild;
      if (latest instanceof HTMLElement) {
        latest.scrollIntoView({ block: "end" });
      }
      responses.scrollTop = responses.scrollHeight;
    });
  }

  const input = document.createElement("input");
  input.className = "woman-chat-input";
  input.type = "text";
  input.placeholder = "Reply to her...";

  function appendMessage(text: string, className: string) {
    const item = document.createElement("p");
    item.className = className;
    item.textContent = text;
    responses.appendChild(item);
    keepLatestMessageVisible();
  }

  input.addEventListener("keydown", async (event) => {
    event.stopPropagation();

    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    const message = input.value.trim();
    if (!message) {
      return;
    }

    appendMessage(message, "woman-chat-user-message");
    conversation.push({ role: "user", content: message });
    input.value = "";
    input.disabled = true;

    const pendingText = "Thinking...";
    appendMessage(pendingText, "woman-chat-assistant-message woman-chat-assistant-pending");
    const pendingNode = responses.lastElementChild;

    const assistantReply = await getSalesAssistantReply(message, conversation);
    conversation.push({ role: "assistant", content: assistantReply });
    if (pendingNode instanceof HTMLParagraphElement) {
      pendingNode.className = "woman-chat-assistant-message";
      pendingNode.textContent = assistantReply;
      keepLatestMessageVisible();
    } else {
      appendMessage(assistantReply, "woman-chat-assistant-message");
    }

    input.disabled = false;
    input.focus();
  });

  bubbleRoot.append(greeting, responses, input);

  womanChatBubble = new CSS2DObject(bubbleRoot);
  womanChatBubble.position.set(0, 2.4, 0.2);
  womanChatBubble.visible = false;
  womanRoot.add(womanChatBubble);
  womanChatMounted = true;
}

const brightnessByScene: Record<SceneName, number> = {
  entrance: 2.3,
  lift: 2.2,
  shop: 2.35
};

const BASE_KEY_INTENSITY = 5.8;
const BASE_FILL_INTENSITY = 3.45;
const BASE_HEMISPHERE_INTENSITY = 1.24;
const BASE_RIM_INTENSITY = 2.28;

function applyBrightness(sceneName: SceneName) {
  const brightness = brightnessByScene[sceneName];
  const cfg = SCENES[sceneName];

  ambientLight.intensity = cfg.ambient * brightness;
  keyLight.intensity = BASE_KEY_INTENSITY * brightness;
  fillLight.intensity = BASE_FILL_INTENSITY * brightness;
  hemisphereLight.intensity = BASE_HEMISPHERE_INTENSITY * brightness;
  rimLight.intensity = BASE_RIM_INTENSITY * brightness;
}

function syncBrightnessControl(sceneName: SceneName) {
  const value = brightnessByScene[sceneName];
  ui.brightnessInput.value = value.toFixed(2);
  ui.brightnessValue.textContent = `${value.toFixed(2)}x`;
}

function setLevelSelectorVisible(visible: boolean) {
  levelSelectorOpen = visible;
  ui.levelSelector.hidden = !visible;
  if (visible) {
    ui.selectorCurrentLevel.textContent = String(liftLevel);
  }
}

function buildLevelSelectorGrid() {
  if (ui.levelGrid.childElementCount > 0) {
    return;
  }

  for (let level = 1; level <= 100; level += 1) {
    const row = document.createElement("div");
    row.className = "level-item";

    const number = document.createElement("span");
    number.className = "level-number";
    number.textContent = String(level);

    const button = document.createElement("button");
    button.className = "level-call";
    button.type = "button";
    button.setAttribute("aria-label", `Go to level ${level}`);

    const logo = document.createElement("span");
    logo.className = "level-logo";
    logo.textContent = "B";

    button.addEventListener("click", () => {
      if (levelSelectorAnimating || liftMoving || currentScene !== "lift") {
        return;
      }
      runLiftTravel(level);
    });

    row.append(number, button, logo);
    ui.levelGrid.appendChild(row);
  }
}

function runLiftTravel(targetFloor: number) {
  if (liftMoving || levelSelectorAnimating || currentScene !== "lift") {
    return;
  }

  const normalizedTarget = Math.max(0, Math.min(99, Math.round(targetFloor)));
  setLevelSelectorVisible(false);

  if (normalizedTarget === liftLevel) {
    world.setLiftMotion(false);
    world.triggerLiftArrivalGlow();
    if (normalizedTarget === 0) {
      transitionToScene("entrance", "Lobby | Entrance Hall");
    } else {
      shopFloor = normalizedTarget;
      world.updateStorefrontSign(shopFloor);
      transitionToScene("shop", `Floor ${shopFloor} | Shopfront`);
    }
    return;
  }

  levelSelectorAnimating = true;
  liftMoving = true;
  liftDisplayFocusActive = true;

  const startLevel = liftLevel;
  const travelDirection: 1 | -1 = normalizedTarget > startLevel ? 1 : -1;
  world.setLiftMotion(true, travelDirection);
  const duration = 950 + Math.abs(normalizedTarget - startLevel) * 85;
  const started = performance.now();

  function frame(now: number) {
    const raw = Math.min((now - started) / duration, 1);
    const t = easeInOutCubic(raw);
    const displayLevel = Math.round(THREE.MathUtils.lerp(startLevel, normalizedTarget, t));

    if (displayLevel !== liftLevel) {
      liftLevel = displayLevel;
      ui.selectorCurrentLevel.textContent = String(liftLevel);
      world.updateLiftScreen(liftLevel);
    }

    if (raw < 1) {
      requestAnimationFrame(frame);
      return;
    }

    liftLevel = normalizedTarget;
    ui.selectorCurrentLevel.textContent = String(liftLevel);
    world.updateLiftScreen(liftLevel);

    levelSelectorAnimating = false;
    liftMoving = false;
    liftDisplayFocusActive = false;
    world.setLiftMotion(false);
    world.triggerLiftArrivalGlow();

    setTimeout(() => {
      if (liftLevel === 0) {
        transitionToScene("entrance", "Lobby | Entrance Hall");
      } else {
        shopFloor = liftLevel;
        world.updateStorefrontSign(shopFloor);
        transitionToScene("shop", `Floor ${shopFloor} | Shopfront`);
      }
    }, 300);
  }

  requestAnimationFrame(frame);
}

function setSceneVisibility(sceneName: SceneName) {
  world.entranceGroup.visible = sceneName === "entrance";
  world.liftGroup.visible = sceneName === "lift";
  world.shopGroup.visible = sceneName === "shop";
}

function setOverlayForScene(sceneName: SceneName) {
  const cfg = SCENES[sceneName];
  ui.app.dataset.zone = sceneName;
  ui.zoneEyebrow.textContent = cfg.eyebrow;
  ui.zoneTitle.textContent = sceneName === "shop" ? `Mayfair Shop Front | Floor ${shopFloor}` : cfg.title;
  ui.zoneCopy.textContent = cfg.copy;
  ui.assistantQuote.textContent = cfg.assistant;
  ui.primaryAction.textContent = cfg.action;

  ui.sceneButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.scene === sceneName);
  });

  if (sceneName !== "lift") {
    setLevelSelectorVisible(false);
  }

  syncBrightnessControl(sceneName);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function transitionToScene(sceneName: SceneName, maskTitle: string | null = null) {
  if (inTransition || currentScene === sceneName) {
    return;
  }

  inTransition = true;

  const fromCfg = SCENES[currentScene];
  const toCfg = SCENES[sceneName];
  const startPos = camera.position.clone();
  const endPos = toCfg.cam.clone();
  const fromTarget = fromCfg.target.clone();
  const toTarget = toCfg.target.clone();
  const startAmbient = ambientLight.intensity;
  const startKey = keyLight.intensity;
  const startFill = fillLight.intensity;
  const startHemi = hemisphereLight.intensity;
  const startRim = rimLight.intensity;

  const endBrightness = brightnessByScene[sceneName];
  const endAmbient = toCfg.ambient * endBrightness;
  const endKey = BASE_KEY_INTENSITY * endBrightness;
  const endFill = BASE_FILL_INTENSITY * endBrightness;
  const endHemi = BASE_HEMISPHERE_INTENSITY * endBrightness;
  const endRim = BASE_RIM_INTENSITY * endBrightness;

  ui.transitionLabel.textContent = maskTitle || toCfg.label;
  ui.transitionMask.classList.add("visible");

  const duration = 1450;
  const started = performance.now();

  function frame(now: number) {
    const raw = Math.min((now - started) / duration, 1);
    const t = easeInOutCubic(raw);

    camera.position.lerpVectors(startPos, endPos, t);
    const target = new THREE.Vector3().lerpVectors(fromTarget, toTarget, t);
    camera.lookAt(target);

    ambientLight.intensity = THREE.MathUtils.lerp(startAmbient, endAmbient, t);
    keyLight.intensity = THREE.MathUtils.lerp(startKey, endKey, t);
    fillLight.intensity = THREE.MathUtils.lerp(startFill, endFill, t);
    hemisphereLight.intensity = THREE.MathUtils.lerp(startHemi, endHemi, t);
    rimLight.intensity = THREE.MathUtils.lerp(startRim, endRim, t);
    keyLight.color.copy(fromCfg.accent.clone().lerp(toCfg.accent, t));

    if (raw < 0.5 && currentScene !== sceneName) {
      setSceneVisibility(sceneName);
    }

    if (raw < 1) {
      requestAnimationFrame(frame);
      return;
    }

    currentScene = sceneName;
    setOverlayForScene(sceneName);
    applyBrightness(sceneName);
    inTransition = false;

    setTimeout(() => {
      ui.transitionMask.classList.remove("visible");
    }, 220);
  }

  requestAnimationFrame(frame);
}

function pointerToNDC(event: PointerEvent) {
  const rect = ui.canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

ui.canvas.addEventListener("pointerdown", async (event: PointerEvent) => {
  if (!appReady) {
    return;
  }

  if (await handleCtrlClickObjectInspect(event)) {
    return;
  }

  if (debugLabelRenderer && handleDebugLabelClick(event)) {
    return;
  }

  if (inTransition || liftMoving || levelSelectorAnimating) {
    return;
  }

  if (currentScene === "entrance") {
    pointerToNDC(event);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(world.clickableLiftMeshes, false);

    if (hit.length > 0) {
      transitionToScene("lift", "Entering Lift");
    }
    return;
  }

  if (currentScene === "lift") {
    pointerToNDC(event);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(world.clickableLiftControlMeshes, false);
    if (hit.length > 0) {
      setLevelSelectorVisible(true);
    }
    return;
  }

  if (currentScene === "shop") {
    pointerToNDC(event);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(world.clickableShopLiftMeshes, false);
    if (hit.length > 0) {
      transitionToScene("lift", "Returning To Lift");
    }
  }
});

ui.canvas.addEventListener("pointermove", (event: PointerEvent) => {
  if (!appReady) {
    ui.canvas.style.cursor = "default";
    return;
  }

  if (currentScene === "entrance") {
    pointerToNDC(event);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(world.clickableLiftMeshes, false);
    ui.canvas.style.cursor = hit.length > 0 ? "pointer" : "default";
    return;
  }

  if (currentScene === "lift" && !levelSelectorOpen) {
    pointerToNDC(event);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(world.clickableLiftControlMeshes, false);
    ui.canvas.style.cursor = hit.length > 0 ? "pointer" : "default";
    return;
  }

  if (currentScene === "shop") {
    pointerToNDC(event);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(world.clickableShopLiftMeshes, false);
    ui.canvas.style.cursor = hit.length > 0 ? "pointer" : "default";
    return;
  }

  ui.canvas.style.cursor = "default";
});

window.addEventListener("pointermove", (event: PointerEvent) => {
  if (!appReady) {
    return;
  }

  if (inTransition) {
    return;
  }

  const nx = event.clientX / window.innerWidth - 0.5;
  const ny = event.clientY / window.innerHeight - 0.5;

  if (currentScene === "entrance") {
    entranceYaw = nx * Math.PI * 2;
    entrancePitch = THREE.MathUtils.clamp(-ny * 1.0, -0.78, 0.62);
    return;
  }

  if (currentScene === "lift") {
    liftYaw = nx * Math.PI * 2;
    liftPitch = THREE.MathUtils.clamp(-ny * 1.05, -0.75, 0.58);
    return;
  }

  if (currentScene === "shop") {
    shopYaw = nx * Math.PI * 2;
    shopPitch = THREE.MathUtils.clamp(-ny * 0.9, -0.62, 0.5);
  }
});

function setMovementKeyState(key: string, active: boolean) {
  if (key === "w" || key === "arrowup") {
    movementState.forward = active;
  }
  if (key === "s" || key === "arrowdown") {
    movementState.back = active;
  }
  if (key === "a" || key === "arrowleft") {
    movementState.left = active;
  }
  if (key === "d" || key === "arrowright") {
    movementState.right = active;
  }
}

window.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key === "Control" || event.key === "Meta") {
    if (!ctrlModifierActive) {
      clearCtrlClickSelections();
    }
    ctrlModifierActive = true;
  }

  if (!appReady) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key === "w" || key === "a" || key === "s" || key === "d" || key === "arrowup" || key === "arrowdown" || key === "arrowleft" || key === "arrowright") {
    event.preventDefault();
  }
  setMovementKeyState(key, true);
});

window.addEventListener("keyup", (event: KeyboardEvent) => {
  if (event.key === "Control" || event.key === "Meta") {
    if (ctrlModifierActive && !event.ctrlKey && !event.metaKey) {
      void copyCtrlClickSelectionList();
    }
    ctrlModifierActive = false;
  }

  if (!appReady) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key === "w" || key === "a" || key === "s" || key === "d" || key === "arrowup" || key === "arrowdown" || key === "arrowleft" || key === "arrowright") {
    event.preventDefault();
  }
  setMovementKeyState(key, false);
});

ui.sceneButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!appReady) {
      return;
    }

    const target = btn.dataset.scene as SceneName | undefined;
    if (!target || inTransition || liftMoving) {
      return;
    }

    if (target === "shop") {
      if (liftLevel > 0) {
        shopFloor = liftLevel;
        world.updateStorefrontSign(shopFloor);
      }
      if (shopFloor === 0) {
        shopFloor = 1;
      }
      transitionToScene("shop", `Floor ${shopFloor} | Shopfront`);
      return;
    }

    transitionToScene(target);
  });
});

ui.primaryAction.addEventListener("click", () => {
  if (!appReady) {
    return;
  }

  if (currentScene === "entrance") {
    transitionToScene("lift", "Entering Lift");
    return;
  }

  if (currentScene === "lift") {
    transitionToScene("entrance", "Returning to Entrance");
    return;
  }

  transitionToScene("lift", "Return to Lift");
});

ui.goLobby.addEventListener("click", () => {
  if (!appReady) {
    return;
  }

  if (currentScene !== "lift" || levelSelectorAnimating || liftMoving) {
    return;
  }
  runLiftTravel(0);
});

ui.brightnessInput.addEventListener("input", () => {
  if (!appReady) {
    return;
  }

  const value = Number(ui.brightnessInput.value);
  if (Number.isNaN(value)) {
    return;
  }

  brightnessByScene[currentScene] = value;
  ui.brightnessValue.textContent = `${value.toFixed(2)}x`;
  applyBrightness(currentScene);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  speechRenderer.setSize(window.innerWidth, window.innerHeight);

  if (debugLabelRenderer) {
    debugLabelRenderer.setSize(window.innerWidth, window.innerHeight);
  }
});

setOverlayForScene("entrance");
applyBrightness("entrance");
world.updateLiftScreen(liftLevel);
buildLevelSelectorGrid();
setLevelSelectorVisible(false);
setAiToggleState("off", "Enable AI assistant");

ui.aiToggle.addEventListener("click", async () => {
  if (modelBootstrapInProgress) {
    return;
  }

  if (aiBypassEnabled) {
    aiBypassEnabled = false;
    await bootstrapPromptAssistant(true);
    return;
  }

  aiBypassEnabled = true;
  promptSession = null;
  setAiToggleState("off", "Enable AI assistant");
  ui.assistantQuote.textContent = SALES_ASSISTANT_FALLBACK_REPLY;
});

function tick() {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  if (currentScene === "entrance" && !inTransition && appReady) {
    entranceLookDirection.set(
      Math.sin(entranceYaw) * Math.cos(entrancePitch),
      Math.sin(entrancePitch),
      -Math.cos(entranceYaw) * Math.cos(entrancePitch)
    ).normalize();

    entranceForward.set(Math.sin(entranceYaw), 0, -Math.cos(entranceYaw)).normalize();
    entranceRight.set(Math.cos(entranceYaw), 0, Math.sin(entranceYaw)).normalize();

    const moveZ = Number(movementState.forward) - Number(movementState.back);
    const moveX = Number(movementState.right) - Number(movementState.left);

    if (moveX !== 0 || moveZ !== 0) {
      const movement = new THREE.Vector3();
      movement.addScaledVector(entranceForward, moveZ);
      movement.addScaledVector(entranceRight, moveX);
      movement.normalize().multiplyScalar(WALK_SPEED * delta);
      camera.position.add(movement);

      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -10.8, 10.8);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -11.2, 11.35);
      camera.position.y = SCENES.entrance.cam.y;
    }

    const lookTarget = camera.position.clone().addScaledVector(entranceLookDirection, 6.5);
    camera.lookAt(lookTarget);
  }

  if (currentScene === "lift" && !inTransition && appReady) {
    const sway = Math.sin(elapsed * 0.8) * 0.06;
    liftLookDirection.set(
      Math.sin(liftYaw) * Math.cos(liftPitch),
      Math.sin(liftPitch),
      -Math.cos(liftYaw) * Math.cos(liftPitch)
    ).normalize();

    liftNormalPosition.set(
      SCENES.lift.cam.x + sway,
      SCENES.lift.cam.y + Math.sin(elapsed * 1.2) * 0.02,
      SCENES.lift.cam.z
    );
    liftNormalTarget.copy(liftNormalPosition).addScaledVector(liftLookDirection, 5.5);

    if (liftDisplayFocusActive) {
      camera.position.lerp(liftDisplayFocusPosition, 0.16);
      camera.lookAt(liftDisplayFocusTarget);
    } else {
      camera.position.copy(liftNormalPosition);
      camera.lookAt(liftNormalTarget);
    }
  }

  if (currentScene === "shop" && !inTransition && appReady) {
    shopLookDirection.set(
      Math.sin(shopYaw) * Math.cos(shopPitch),
      Math.sin(shopPitch),
      -Math.cos(shopYaw) * Math.cos(shopPitch)
    ).normalize();

    shopForward.set(Math.sin(shopYaw), 0, -Math.cos(shopYaw)).normalize();
    shopRight.set(Math.cos(shopYaw), 0, Math.sin(shopYaw)).normalize();

    const moveZ = Number(movementState.forward) - Number(movementState.back);
    const moveX = Number(movementState.right) - Number(movementState.left);

    if (moveX !== 0 || moveZ !== 0) {
      const movement = new THREE.Vector3();
      movement.addScaledVector(shopForward, moveZ);
      movement.addScaledVector(shopRight, moveX);
      movement.normalize().multiplyScalar(SHOP_WALK_SPEED * delta);
      camera.position.add(movement);

      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -8.2, 8.2);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -12.4, 11.7);
      camera.position.y = SCENES.shop.cam.y;
    }

    if (
      camera.position.z > 10.9 &&
      Math.abs(camera.position.x) < 1.7 &&
      (movementState.forward || movementState.back) &&
      !liftMoving &&
      !levelSelectorAnimating
    ) {
      transitionToScene("lift", "Returning To Lift");
      movementState.forward = false;
      movementState.back = false;
      movementState.left = false;
      movementState.right = false;
      return;
    }

    const lookTarget = camera.position.clone().addScaledVector(shopLookDirection, 6.5);
    camera.lookAt(lookTarget);
  }

  const showLiftHint =
    currentScene === "lift" &&
    !inTransition &&
    !liftMoving &&
    !levelSelectorAnimating &&
    !levelSelectorOpen;
  world.setLiftHintActive(showLiftHint);

  const liftEntranceWoman = world.getLiftEntranceWoman();
  if (liftEntranceWoman && !womanChatMounted) {
    mountWomanChatBubble(liftEntranceWoman);
  }

  const shouldShowWomanGreeting =
    appReady &&
    currentScene === "entrance" &&
    !inTransition &&
    Boolean(liftEntranceWoman) &&
    camera.position.distanceTo(
      (liftEntranceWoman ?? world.entranceGroup).getWorldPosition(liftEntranceWomanWorldPos)
    ) <= WOMAN_GREETING_DISTANCE;
  if (womanChatBubble) {
    womanChatBubble.visible = shouldShowWomanGreeting;
  }

  world.animate(elapsed);

  renderer.render(scene, camera);
  speechRenderer.render(scene, camera);
  if (debugLabelRenderer) {
    debugLabelRenderer.render(scene, camera);
  }
  requestAnimationFrame(tick);
}

tick();
