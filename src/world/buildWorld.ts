import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const advertLift = new URL("../resources/advert-lift.jpg", import.meta.url).href;
const woodFloorLobby = new URL("../resources/wood-floor-lobby.svg", import.meta.url).href;
const wallSubtleTexture = new URL("../resources/wall-subtle-texture.svg", import.meta.url).href;
const woodPanelRich = new URL("../resources/wood-panel-rich.svg", import.meta.url).href;
const carpetOrnate = new URL("../resources/carpet-ornate.svg", import.meta.url).href;
const brassPatina = new URL("../resources/brass-patina.svg", import.meta.url).href;
const fabricWeave = new URL("../resources/fabric-weave.svg", import.meta.url).href;
const plasterAged = new URL("../resources/plaster-aged.svg", import.meta.url).href;
const stoneTileWorn = new URL("../resources/stone-tile-worn.svg", import.meta.url).href;
const lobby1 = new URL("../resources/lobby1.jpg", import.meta.url).href;
const lobby2 = new URL("../resources/lobby2.jpg", import.meta.url).href;
const lobby3 = new URL("../resources/lobby3.jpg", import.meta.url).href;
const liftWoodPanel = new URL("../resources/lift-wood-panel.svg", import.meta.url).href;
const liftWoodInlay = new URL("../resources/lift-wood-inlay.svg", import.meta.url).href;
const sofaModel = new URL("../resources/sofa.glb", import.meta.url).href;
const tableModel = new URL("../resources/table.glb", import.meta.url).href;
const lampModel = new URL("../resources/lamp.glb", import.meta.url).href;
const manequinModel = new URL("../resources/manequin.glb", import.meta.url).href;
const receptionDeskModel = new URL("../resources/reception-desk.glb", import.meta.url).href;
const womanModel = new URL("../resources/woman.glb", import.meta.url).href;

export interface WorldHandles {
  entranceGroup: THREE.Group;
  liftGroup: THREE.Group;
  shopGroup: THREE.Group;
  clickableLiftMeshes: THREE.Mesh[];
  clickableShopLiftMeshes: THREE.Mesh[];
  clickableLiftControlMeshes: THREE.Mesh[];
  updateLiftScreen: (level: number) => void;
  setLiftMotion: (moving: boolean, direction?: 1 | -1) => void;
  setLiftHintActive: (active: boolean) => void;
  triggerLiftArrivalGlow: () => void;
  getLiftEntranceWoman: () => THREE.Object3D | null;
  setLiftEntranceSpeechVisible: (visible: boolean) => void;
  updateStorefrontSign: (floorNum: number) => void;
  animate: (elapsed: number) => void;
}

export function buildWorld(scene: THREE.Scene, textureLoader: THREE.TextureLoader): WorldHandles {
  const gltfLoader = new GLTFLoader();
  const sceneRoot = new THREE.Group();
  sceneRoot.name = "World Root";
  scene.add(sceneRoot);

  const entranceGroup = new THREE.Group();
  entranceGroup.name = "Entrance Scene";
  const liftGroup = new THREE.Group();
  liftGroup.name = "Lift Scene";
  const shopGroup = new THREE.Group();
  shopGroup.name = "Shop Scene";
  sceneRoot.add(entranceGroup, liftGroup, shopGroup);

  function makeTiledTexture(url: string, repeatX: number, repeatY: number, asColorMap = true) {
    const tx = textureLoader.load(url);
    tx.wrapS = THREE.RepeatWrapping;
    tx.wrapT = THREE.RepeatWrapping;
    tx.repeat.set(repeatX, repeatY);
    if (asColorMap) {
      tx.colorSpace = THREE.SRGBColorSpace;
    }
    return tx;
  }

  const woodPanelTexture = makeTiledTexture(woodPanelRich, 3.2, 2.3);
  const woodPanelTextureFine = makeTiledTexture(woodPanelRich, 5.4, 4.8);
  const carpetTexture = makeTiledTexture(carpetOrnate, 2.2, 5.6);
  const brassTexture = makeTiledTexture(brassPatina, 4.4, 3.4);
  const fabricTexture = makeTiledTexture(fabricWeave, 7.2, 7.2);
  const plasterTexture = makeTiledTexture(plasterAged, 3.6, 2.8);
  const wallNoiseTexture = makeTiledTexture(wallSubtleTexture, 8.2, 6.2, false);
  const stoneTexture = makeTiledTexture(stoneTileWorn, 3.4, 2.8);
  const mannequinTexture = plasterTexture.clone();
  mannequinTexture.repeat.set(2.8, 3.4);

  const metalMaterial = new THREE.MeshStandardMaterial({ color: "#c79d64", metalness: 0.78, roughness: 0.28 });
  const brassMaterial = new THREE.MeshStandardMaterial({ color: "#d3ac72", metalness: 0.82, roughness: 0.24 });
  const walnutMaterial = new THREE.MeshStandardMaterial({ color: "#4c2f24", roughness: 0.66, metalness: 0.08 });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: "#6b3537", roughness: 0.75, metalness: 0.12 });
  metalMaterial.map = brassTexture;
  metalMaterial.roughnessMap = brassTexture;
  brassMaterial.map = brassTexture;
  brassMaterial.roughnessMap = brassTexture;
  walnutMaterial.map = woodPanelTextureFine;
  walnutMaterial.bumpMap = wallNoiseTexture;
  walnutMaterial.bumpScale = 0.03;
  wallMaterial.map = plasterTexture;
  wallMaterial.bumpMap = wallNoiseTexture;
  wallMaterial.bumpScale = 0.09;
  wallMaterial.roughnessMap = wallNoiseTexture;
  wallMaterial.roughness = 0.84;

  const liftDoorMaterial = new THREE.MeshStandardMaterial({
    color: "#896341",
    roughness: 0.38,
    metalness: 0.62,
    map: woodPanelTexture,
    roughnessMap: woodPanelTexture
  });
  const liftDoorLeft = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 3.9, 0.08),
    liftDoorMaterial
  );
  liftDoorLeft.name = "Entrance Lift Door Left";
  const liftDoorRight = liftDoorLeft.clone();
  liftDoorRight.name = "Entrance Lift Door Right";
  const entranceShaftCars: THREE.Mesh[] = [];
  let liftEntranceWoman: THREE.Object3D | null = null;
  let liftEntranceSpeechBubble: THREE.Sprite | null = null;

  const objectNameCounters: Record<string, number> = {};

  function nextObjectName(baseName: string) {
    const nextCount = (objectNameCounters[baseName] ?? 0) + 1;
    objectNameCounters[baseName] = nextCount;
    return `${baseName} ${nextCount}`;
  }

  function getObjectRole(object3D: THREE.Object3D) {
    if (object3D instanceof THREE.Group) {
      return "Cluster";
    }
    if (object3D instanceof THREE.PointLight) {
      return "Accent Light";
    }
    if (object3D instanceof THREE.SpotLight) {
      return "Spot Light";
    }
    if (object3D instanceof THREE.HemisphereLight) {
      return "Ambient Sky Light";
    }
    if (!(object3D instanceof THREE.Mesh)) {
      return "Object";
    }

    const geometryType = object3D.geometry?.type ?? "Mesh";
    const roleByGeometry: Record<string, string> = {
      PlaneGeometry: "Surface Panel",
      BoxGeometry: "Structure Block",
      SphereGeometry: "Lamp Globe",
      TorusGeometry: "Decor Ring",
      CircleGeometry: "Control Disc",
      CylinderGeometry: "Support Column",
      CapsuleGeometry: "Figure Segment",
      ConeGeometry: "Spot Cone",
      RingGeometry: "Trim Ring"
    };

    return roleByGeometry[geometryType] ?? "Mesh Detail";
  }

  function assignSceneObjectNames(root: THREE.Object3D, sceneLabel: string) {
    root.traverse((object3D) => {
      if (object3D.name.trim()) {
        return;
      }

      const parentName = object3D.parent?.name?.trim();
      const objectRole = getObjectRole(object3D);

      let baseName = `${sceneLabel} ${objectRole}`;
      if (parentName) {
        baseName = `${sceneLabel} ${parentName} ${objectRole}`;
      }

      baseName = baseName
        .replace(/\s+/g, " ")
        .replace(/(Entrance|Lift|Shop) Scene /g, "")
        .trim();

      object3D.name = nextObjectName(baseName);
    });
  }

  function removeNamedObject(root: THREE.Object3D, targetName: string) {
    const matches: THREE.Object3D[] = [];
    root.traverse((object3D) => {
      if (object3D.name === targetName) {
        matches.push(object3D);
      }
    });

    for (const object3D of matches) {
      object3D.parent?.remove(object3D);
    }
  }

  function removeObjectsByNamePrefix(root: THREE.Object3D, prefix: string) {
    const matches: THREE.Object3D[] = [];
    root.traverse((object3D) => {
      if (object3D.name === prefix || object3D.name.startsWith(`${prefix} `)) {
        matches.push(object3D);
      }
    });

    // Remove deepest nodes first to avoid parent removal races while iterating.
    matches.sort((a, b) => b.children.length - a.children.length);
    for (const object3D of matches) {
      object3D.parent?.remove(object3D);
    }
  }

  function replaceObjectByNamePrefixWithModel(
    root: THREE.Object3D,
    prefix: string,
    modelUrl: string,
    replacementName: string,
    replacementScale = 1,
    meshStyler?: (mesh: THREE.Mesh) => void
  ) {
    const matches: THREE.Object3D[] = [];
    root.traverse((object3D) => {
      if (object3D.name === prefix || object3D.name.startsWith(`${prefix} `)) {
        matches.push(object3D);
      }
    });

    if (matches.length === 0) {
      return;
    }

    const primaryTarget = matches[0];
    const worldPosition = new THREE.Vector3();
    const worldQuaternion = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    primaryTarget.updateWorldMatrix(true, false);
    primaryTarget.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);
    const targetBounds = new THREE.Box3().setFromObject(primaryTarget);
    const targetBaseY = targetBounds.min.y;

    matches.sort((a, b) => b.children.length - a.children.length);
    for (const object3D of matches) {
      object3D.parent?.remove(object3D);
    }

    gltfLoader.load(modelUrl, (gltf) => {
      const replacement = gltf.scene;
      replacement.name = replacementName;

      const localPosition = root.worldToLocal(worldPosition.clone());
      const rootWorldQuaternion = new THREE.Quaternion();
      root.getWorldQuaternion(rootWorldQuaternion);
      const localQuaternion = rootWorldQuaternion.clone().invert().multiply(worldQuaternion);

      replacement.position.copy(localPosition);
      replacement.quaternion.copy(localQuaternion);
      replacement.scale.copy(worldScale.multiplyScalar(replacementScale));

      replacement.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          meshStyler?.(child);
        }
      });

      root.add(replacement);

      // Snap replacement's lowest point to the original object's floor contact height.
      replacement.updateWorldMatrix(true, true);
      const replacementBounds = new THREE.Box3().setFromObject(replacement);
      const deltaY = targetBaseY - replacementBounds.min.y;
      if (Math.abs(deltaY) > 1e-4) {
        const liftedWorldPosition = replacement.getWorldPosition(new THREE.Vector3());
        liftedWorldPosition.y += deltaY;
        replacement.position.copy(root.worldToLocal(liftedWorldPosition));
      }
    });
  }

  function createSpeechBubbleSprite(text: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bubbleX = 26;
    const bubbleY = 22;
    const bubbleW = canvas.width - 52;
    const bubbleH = 260;
    const radius = 34;

    ctx.fillStyle = "rgba(255, 246, 233, 0.96)";
    ctx.strokeStyle = "rgba(128, 76, 42, 0.95)";
    ctx.lineWidth = 12;

    ctx.beginPath();
    ctx.moveTo(bubbleX + radius, bubbleY);
    ctx.lineTo(bubbleX + bubbleW - radius, bubbleY);
    ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + radius);
    ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - radius);
    ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - radius, bubbleY + bubbleH);
    ctx.lineTo(bubbleX + 510, bubbleY + bubbleH);
    ctx.lineTo(bubbleX + 470, bubbleY + bubbleH + 56);
    ctx.lineTo(bubbleX + 420, bubbleY + bubbleH);
    ctx.lineTo(bubbleX + radius, bubbleY + bubbleH);
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - radius);
    ctx.lineTo(bubbleX, bubbleY + radius);
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#4b2c1d";
    ctx.font = "700 42px 'Georgia', serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const maxWidth = bubbleW - 80;
    const lineHeight = 56;
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    lines.forEach((line, index) => {
      ctx.fillText(line, bubbleX + 40, bubbleY + 38 + index * lineHeight);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.6, 1.05, 1);
    sprite.visible = false;
    sprite.renderOrder = 999;
    sprite.name = "Lift Entrance Speech Bubble";
    return sprite;
  }

  function getLiftEntranceWoman() {
    return liftEntranceWoman;
  }

  function setLiftEntranceSpeechVisible(visible: boolean) {
    if (!liftEntranceSpeechBubble) {
      return;
    }
    liftEntranceSpeechBubble.visible = visible;
  }

  function addEntranceRoom() {
    const hallWallHeight = 12.8;
    const domeBaseY = 12.8;
    const domeRadius = 10.8;

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.72,
      metalness: 0.03,
      emissive: "#2b2620",
      emissiveIntensity: 0.35
    });
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 40),
      floorMaterial
    );
    floor.rotation.x = -Math.PI / 2;
    entranceGroup.add(floor);

    textureLoader.load(woodFloorLobby, (tx) => {
      tx.colorSpace = THREE.SRGBColorSpace;
      tx.wrapS = THREE.RepeatWrapping;
      tx.wrapT = THREE.RepeatWrapping;
      tx.repeat.set(4, 5);
      floorMaterial.map = tx;
      floorMaterial.emissiveMap = tx;
      floorMaterial.needsUpdate = true;
    });

    const domeShell = new THREE.Mesh(
      new THREE.SphereGeometry(domeRadius, 56, 32, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: "#4a302a", roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide, map: plasterTexture, bumpMap: wallNoiseTexture, bumpScale: 0.04 })
    );
    domeShell.position.set(0, domeBaseY, -1.2);
    entranceGroup.add(domeShell);

    for (let i = 0; i < 3; i += 1) {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(9.8 - i * 1.8, 0.06, 12, 56),
        new THREE.MeshStandardMaterial({ color: "#9a7449", roughness: 0.4, metalness: 0.6, map: brassTexture, roughnessMap: brassTexture })
      );
      band.rotation.x = Math.PI / 2;
      band.position.set(0, domeBaseY + 1.7 + i * 2.05, -1.2);
      entranceGroup.add(band);
    }

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(24, hallWallHeight, 0.5), wallMaterial);
    backWall.position.set(0, hallWallHeight / 2, -14.2);
    entranceGroup.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, hallWallHeight, 24), wallMaterial);
    leftWall.position.set(-12, hallWallHeight / 2, -0.4);
    entranceGroup.add(leftWall);

    const rightWall = leftWall.clone();
    rightWall.position.x = 12;
    entranceGroup.add(rightWall);

    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(24, hallWallHeight, 0.5), wallMaterial);
    frontWall.position.set(0, hallWallHeight / 2, 12.1);
    entranceGroup.add(frontWall);

    const exitDoor = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 4.6, 0.18),
      new THREE.MeshStandardMaterial({ color: "#5a3a2b", roughness: 0.56, metalness: 0.18, map: woodPanelTexture, bumpMap: wallNoiseTexture, bumpScale: 0.03 })
    );
    exitDoor.position.set(0, 2.3, 11.9);
    entranceGroup.add(exitDoor);

    const exitSignCanvas = document.createElement("canvas");
    exitSignCanvas.width = 512;
    exitSignCanvas.height = 196;
    const exitSignCtx = exitSignCanvas.getContext("2d");
    if (exitSignCtx) {
      exitSignCtx.fillStyle = "#0f5f34";
      exitSignCtx.fillRect(0, 0, exitSignCanvas.width, exitSignCanvas.height);
      exitSignCtx.strokeStyle = "#d9f5dc";
      exitSignCtx.lineWidth = 14;
      exitSignCtx.strokeRect(12, 12, exitSignCanvas.width - 24, exitSignCanvas.height - 24);
      exitSignCtx.fillStyle = "#effff2";
      exitSignCtx.font = "700 108px sans-serif";
      exitSignCtx.textAlign = "center";
      exitSignCtx.textBaseline = "middle";
      exitSignCtx.fillText("EXIT", exitSignCanvas.width / 2, exitSignCanvas.height / 2 + 4);

      const exitTexture = new THREE.CanvasTexture(exitSignCanvas);
      exitTexture.colorSpace = THREE.SRGBColorSpace;
      const exitSign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.85, 0.72),
        new THREE.MeshBasicMaterial({ map: exitTexture, toneMapped: false, side: THREE.DoubleSide })
      );
      exitSign.position.set(0, 5.1, 11.82);
      entranceGroup.add(exitSign);
    }

    const frontTrim = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.4, 0.5),
      new THREE.MeshStandardMaterial({ color: "#8a5c3a", roughness: 0.45, metalness: 0.25, map: woodPanelTextureFine })
    );
    frontTrim.position.set(0, 0.2, 11.8);
    entranceGroup.add(frontTrim);

    const carpet = new THREE.Mesh(
      new THREE.PlaneGeometry(6.8, 20),
      new THREE.MeshStandardMaterial({ color: "#7f2f3b", roughness: 0.86, metalness: 0, map: carpetTexture, bumpMap: fabricTexture, bumpScale: 0.02 })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.01, -0.8);
    entranceGroup.add(carpet);

    const clerestoryGroup = new THREE.Group();
    for (let i = 0; i < 12; i += 1) {
      const arc = (Math.PI * 2 * i) / 12;
      const wx = Math.cos(arc) * 10.45;
      const wz = -1.2 + Math.sin(arc) * 10.45;
      const window = new THREE.Mesh(
        new THREE.PlaneGeometry(1.05, 1.85),
        new THREE.MeshStandardMaterial({ color: "#bda583", emissive: "#6b5534", emissiveIntensity: 0.3, transparent: true, opacity: 0.42 })
      );
      window.position.set(wx, domeBaseY - 0.15, wz);
      window.lookAt(0, domeBaseY - 0.15, -1.2);
      clerestoryGroup.add(window);
    }
    entranceGroup.add(clerestoryGroup);

    const chandelierRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.08, 16, 60), brassMaterial);
    chandelierRing.rotation.x = Math.PI / 2;
    chandelierRing.position.set(0, 12.7, -1.2);
    entranceGroup.add(chandelierRing);

    const chandelierCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 24, 24),
      new THREE.MeshStandardMaterial({ color: "#e3bf82", emissive: "#896133", emissiveIntensity: 0.35 })
    );
    chandelierCore.position.set(0, 12.7, -1.2);
    entranceGroup.add(chandelierCore);

    const trimMaterial = new THREE.MeshStandardMaterial({ color: "#8f623f", roughness: 0.42, metalness: 0.22, map: woodPanelTextureFine, bumpMap: wallNoiseTexture, bumpScale: 0.02 });
    const posterFrameMaterial = new THREE.MeshStandardMaterial({ color: "#b58a54", roughness: 0.34, metalness: 0.72, map: brassTexture, roughnessMap: brassTexture });
    const fabricPalette = ["#b78656", "#7f2f3b", "#3b4a62", "#d8c39a", "#5f7f66"];

    function addLobbyTable(position: THREE.Vector3, rotationY = 0, scale = 1) {
      gltfLoader.load(tableModel, (gltf) => {
        const table = gltf.scene;
        table.name = "Lobby Table";
        table.position.copy(position);
        table.rotation.y = rotationY;
        table.scale.setScalar(scale);

        table.traverse((object3D) => {
          if (!(object3D instanceof THREE.Mesh)) {
            return;
          }

          object3D.castShadow = true;
          object3D.receiveShadow = true;

          const partName = object3D.name.toLowerCase();
          if (/metal|brass|frame|leg|base|foot/.test(partName)) {
            object3D.material = new THREE.MeshStandardMaterial({
              color: "#c89a61",
              roughness: 0.36,
              metalness: 0.78,
              map: brassTexture,
              roughnessMap: brassTexture
            });
            return;
          }

          object3D.material = new THREE.MeshStandardMaterial({
            color: "#5c3a2c",
            roughness: 0.56,
            metalness: 0.1,
            map: woodPanelTextureFine,
            bumpMap: wallNoiseTexture,
            bumpScale: 0.015
          });
        });

        entranceGroup.add(table);

        const tableBounds = new THREE.Box3().setFromObject(table);
        const tableCenter = tableBounds.getCenter(new THREE.Vector3());

        gltfLoader.load(lampModel, (lampGltf) => {
          const lamp = lampGltf.scene;
          lamp.name = "Lobby Table Lamp";
          lamp.position.set(tableCenter.x, tableBounds.max.y + 0.02, tableCenter.z);
          lamp.rotation.y = rotationY;
          lamp.scale.setScalar(scale * 0.65);

          lamp.traverse((object3D) => {
            if (!(object3D instanceof THREE.Mesh)) {
              return;
            }

            object3D.castShadow = true;
            object3D.receiveShadow = true;
          });

          entranceGroup.add(lamp);
        });
      });
    }

    function addClothingRack(x: number, z: number, width: number) {
      const rackGroup = new THREE.Group();

      const postLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), brassMaterial);
      postLeft.position.set(-width / 2, 0.75, 0);
      rackGroup.add(postLeft);

      const postRight = postLeft.clone();
      postRight.position.x = width / 2;
      rackGroup.add(postRight);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, 0.08), brassMaterial);
      rail.position.y = 1.42;
      rackGroup.add(rail);

      const baseBar = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.36, 0.06, 0.36),
        new THREE.MeshStandardMaterial({ color: "#5a3b2e", roughness: 0.64, metalness: 0.1, map: woodPanelTextureFine })
      );
      baseBar.position.y = 0.03;
      rackGroup.add(baseBar);

      const garmentCount = Math.max(6, Math.floor(width / 0.26));
      for (let i = 0; i < garmentCount; i += 1) {
        const garment = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.62, 0.08),
          new THREE.MeshStandardMaterial({ color: fabricPalette[i % fabricPalette.length], roughness: 0.9, metalness: 0 })
        );
        const t = garmentCount <= 1 ? 0.5 : i / (garmentCount - 1);
        garment.position.set(-width / 2 + t * width, 1.03, 0);
        garment.rotation.y = ((i % 3) - 1) * 0.04;
        rackGroup.add(garment);
      }

      rackGroup.position.set(x, 0, z);
      entranceGroup.add(rackGroup);
    }

    function addMannequinCluster(x: number, z: number, count: number) {
      for (let i = 0; i < count; i += 1) {
        const mannequin = new THREE.Group();

        const stand = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.08, 0.4),
          new THREE.MeshStandardMaterial({ color: "#3e2b24", roughness: 0.72, metalness: 0.08 })
        );
        stand.position.y = 0.04;
        mannequin.add(stand);

        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.78, 0.1),
          new THREE.MeshStandardMaterial({ color: "#e2d6c8", roughness: 0.68, metalness: 0.02 })
        );
        leg.position.y = 0.45;
        mannequin.add(leg);

        const torso = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.16, 0.58, 5, 10),
          new THREE.MeshStandardMaterial({ color: "#f1e8da", roughness: 0.66, metalness: 0.02 })
        );
        torso.position.y = 1.16;
        mannequin.add(torso);

        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 16, 16),
          new THREE.MeshStandardMaterial({ color: "#efe1d3", roughness: 0.6, metalness: 0.03 })
        );
        head.position.y = 1.56;
        mannequin.add(head);

        const scarf = new THREE.Mesh(
          new THREE.TorusGeometry(0.15, 0.03, 10, 24),
          new THREE.MeshStandardMaterial({ color: fabricPalette[(i + 2) % fabricPalette.length], roughness: 0.84, metalness: 0 })
        );
        scarf.rotation.x = Math.PI / 2;
        scarf.position.y = 1.35;
        mannequin.add(scarf);

        mannequin.position.set(x + (i - (count - 1) / 2) * 0.62, 0, z + Math.sin(i * 1.4) * 0.22);
        entranceGroup.add(mannequin);
      }
    }

    function addShelfWall(x: number, z: number, side: number) {
      const shelfGroup = new THREE.Group();
      shelfGroup.position.set(x, 0, z);
      shelfGroup.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.1, 5.2), trimMaterial);
      back.position.set(0, 1.55, 0);
      shelfGroup.add(back);

      for (let i = 0; i < 4; i += 1) {
        const plank = new THREE.Mesh(
          new THREE.BoxGeometry(0.62, 0.08, 5.1),
          new THREE.MeshStandardMaterial({ color: "#6a4633", roughness: 0.58, metalness: 0.1, map: woodPanelTextureFine })
        );
        plank.position.set(0.2, 0.54 + i * 0.62, 0);
        shelfGroup.add(plank);

        for (let j = 0; j < 8; j += 1) {
          const item = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.23, 0.24),
            new THREE.MeshStandardMaterial({
              color: fabricPalette[(i + j) % fabricPalette.length],
              roughness: 0.8,
              metalness: 0.03
            })
          );
          item.position.set(0.33, 0.72 + i * 0.62, -2.18 + j * 0.62);
          shelfGroup.add(item);
        }
      }

      entranceGroup.add(shelfGroup);
    }

    function addFrontDisplayPlinth(x: number, z: number) {
      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(1.12, 0.72, 1.12),
        new THREE.MeshStandardMaterial({ color: "#674233", roughness: 0.56, metalness: 0.12, map: woodPanelTexture })
      );
      plinth.position.set(x, 0.36, z);
      entranceGroup.add(plinth);

      const spotlight = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.42, 18),
        new THREE.MeshStandardMaterial({ color: "#e2b879", emissive: "#7b5628", emissiveIntensity: 0.28 })
      );
      spotlight.position.set(x, 1.05, z);
      spotlight.rotation.x = Math.PI;
      entranceGroup.add(spotlight);

      const bag = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.44, 0.2),
        new THREE.MeshStandardMaterial({ color: "#8a2331", roughness: 0.7, metalness: 0.04, map: fabricTexture, bumpMap: fabricTexture, bumpScale: 0.01 })
      );
      bag.position.set(x, 0.84, z - 0.06);
      entranceGroup.add(bag);

      const handle = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.016, 10, 24),
        new THREE.MeshStandardMaterial({ color: "#d6b27a", roughness: 0.45, metalness: 0.58, map: brassTexture, roughnessMap: brassTexture })
      );
      handle.position.set(x, 1.09, z - 0.06);
      handle.rotation.x = Math.PI / 2;
      entranceGroup.add(handle);
    }

    function addLobbySofa(position: THREE.Vector3, rotationY: number, scale = 1) {
      gltfLoader.load(sofaModel, (gltf) => {
        const sofa = gltf.scene;
        sofa.name = "Lobby Sofa";
        sofa.position.copy(position);
        sofa.rotation.y = rotationY;
        sofa.scale.setScalar(scale);

        const upholsteryMaterial = new THREE.MeshStandardMaterial({
          color: "#6e2f39",
          roughness: 0.84,
          metalness: 0.05,
          map: fabricTexture,
          bumpMap: fabricTexture,
          bumpScale: 0.01
        });
        const trimMaterial = new THREE.MeshStandardMaterial({
          color: "#5f3a2d",
          roughness: 0.64,
          metalness: 0.1,
          map: woodPanelTextureFine,
          bumpMap: wallNoiseTexture,
          bumpScale: 0.015
        });
        const metalAccentMaterial = new THREE.MeshStandardMaterial({
          color: "#c89a61",
          roughness: 0.36,
          metalness: 0.78,
          map: brassTexture,
          roughnessMap: brassTexture
        });

        sofa.traverse((object3D) => {
          if (!(object3D instanceof THREE.Mesh)) {
            return;
          }

          const partName = object3D.name.toLowerCase();
          const useMetal = /metal|leg|frame|trim|base|foot|chrome|gold|brass/.test(partName);
          const useUpholstery = /seat|cushion|pillow|sofa|fabric|upholster|back/.test(partName);
          const replacementMaterial = useMetal ? metalAccentMaterial : useUpholstery ? upholsteryMaterial : trimMaterial;

          object3D.material = replacementMaterial;
          object3D.castShadow = true;
          object3D.receiveShadow = true;
        });

        entranceGroup.add(sofa);
      });
    }

    function addLobbyWoman(position: THREE.Vector3, rotationY: number, scale = 1) {
      gltfLoader.load(womanModel, (gltf) => {
        const woman = gltf.scene;
        woman.name = "Lift Entrance Woman";
        woman.position.copy(position);
        woman.rotation.y = rotationY;
        woman.scale.setScalar(scale);

        woman.traverse((object3D) => {
          if (!(object3D instanceof THREE.Mesh)) {
            return;
          }

          if (!object3D.name.trim()) {
            object3D.name = nextObjectName("Lift Entrance Woman Detail");
          }
          object3D.castShadow = true;
          object3D.receiveShadow = true;
        });

        liftEntranceSpeechBubble = createSpeechBubbleSprite("Hey David, great to see you again. What are you looking for today?");
        if (liftEntranceSpeechBubble) {
          liftEntranceSpeechBubble.position.set(0, 2.4, 0.22);
          woman.add(liftEntranceSpeechBubble);
        }

        liftEntranceWoman = woman;

        entranceGroup.add(woman);
      });
    }

    function addReceptionDesk(position: THREE.Vector3, rotationY: number, scale = 1) {
      gltfLoader.load(receptionDeskModel, (gltf) => {
        const desk = gltf.scene;
        desk.name = "Entrance Reception Desk";
        desk.position.copy(position);
        desk.rotation.y = rotationY;
        desk.scale.setScalar(scale);

        const deskWoodMaterial = new THREE.MeshStandardMaterial({
          color: "#5a382c",
          roughness: 0.58,
          metalness: 0.12,
          map: woodPanelTextureFine,
          bumpMap: wallNoiseTexture,
          bumpScale: 0.014
        });
        const deskTopMaterial = new THREE.MeshStandardMaterial({
          color: "#6d4a3a",
          roughness: 0.48,
          metalness: 0.18,
          map: woodPanelTexture,
          bumpMap: wallNoiseTexture,
          bumpScale: 0.012
        });
        const deskMetalMaterial = new THREE.MeshStandardMaterial({
          color: "#c89d63",
          roughness: 0.34,
          metalness: 0.8,
          map: brassTexture,
          roughnessMap: brassTexture
        });

        desk.traverse((object3D) => {
          if (!(object3D instanceof THREE.Mesh)) {
            return;
          }

          const partName = object3D.name.toLowerCase();
          if (/metal|brass|steel|chrome|leg|base|frame/.test(partName)) {
            object3D.material = deskMetalMaterial;
          } else if (/top|counter|surface|board/.test(partName)) {
            object3D.material = deskTopMaterial;
          } else {
            object3D.material = deskWoodMaterial;
          }

          object3D.castShadow = true;
          object3D.receiveShadow = true;
        });

        entranceGroup.add(desk);

        desk.updateWorldMatrix(true, true);
        const deskBounds = new THREE.Box3().setFromObject(desk);
        const floorOffset = -deskBounds.min.y;
        if (Math.abs(floorOffset) > 1e-4) {
          desk.position.y += floorOffset;
        }
      });
    }

    function addEntrancePoster(
      imageUrl: string,
      position: THREE.Vector3,
      rotationY: number,
      width: number,
      height: number
    ) {
      const forwardOffset = new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY)).multiplyScalar(0.12);
      const posterPos = position.clone().add(forwardOffset);
      const posterGroup = new THREE.Group();
      posterGroup.position.copy(posterPos);
      posterGroup.rotation.y = rotationY;
      entranceGroup.add(posterGroup);

      const frameDepth = 0.06;
      const frameBorder = 0.1;

      const topBar = new THREE.Mesh(
        new THREE.BoxGeometry(width + frameBorder * 2, frameBorder, frameDepth),
        posterFrameMaterial
      );
      topBar.position.set(0, height / 2 + frameBorder / 2, 0);
      posterGroup.add(topBar);

      const bottomBar = topBar.clone();
      bottomBar.position.y = -(height / 2 + frameBorder / 2);
      posterGroup.add(bottomBar);

      const leftBar = new THREE.Mesh(
        new THREE.BoxGeometry(frameBorder, height, frameDepth),
        posterFrameMaterial
      );
      leftBar.position.set(-(width / 2 + frameBorder / 2), 0, 0);
      posterGroup.add(leftBar);

      const rightBar = leftBar.clone();
      rightBar.position.x = width / 2 + frameBorder / 2;
      posterGroup.add(rightBar);

      const poster = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshStandardMaterial({ color: "#2a2020", roughness: 0.78, metalness: 0.06, side: THREE.DoubleSide })
      );
      poster.position.set(0, 0, frameDepth / 2 + 0.02);
      posterGroup.add(poster);

      textureLoader.load(imageUrl, (tx) => {
        tx.colorSpace = THREE.SRGBColorSpace;
        poster.material = new THREE.MeshBasicMaterial({ map: tx, toneMapped: false, side: THREE.DoubleSide });
      });
    }

    const entryArch = new THREE.Mesh(
      new THREE.BoxGeometry(13.2, 0.36, 0.46),
      new THREE.MeshStandardMaterial({ color: "#8e633f", roughness: 0.42, metalness: 0.24, map: woodPanelTexture })
    );
    entryArch.position.set(0, 7.9, 8.0);
    entranceGroup.add(entryArch);

    const signPanel = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 1.05, 0.2),
      new THREE.MeshStandardMaterial({ color: "#412925", roughness: 0.5, metalness: 0.16, map: woodPanelTextureFine })
    );
    signPanel.position.set(0, 7.05, 7.9);
    entranceGroup.add(signPanel);

    const signLetterMaterial = new THREE.MeshStandardMaterial({ color: "#e7c68c", emissive: "#6e4c29", emissiveIntensity: 0.2, map: brassTexture, roughnessMap: brassTexture });
    for (let i = 0; i < 11; i += 1) {
      const letterBlock = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.06), signLetterMaterial);
      letterBlock.position.set(-1.7 + i * 0.34, 7.08, 7.8);
      entranceGroup.add(letterBlock);
    }

    addLobbyTable(new THREE.Vector3(-3.35, 0, 0.75), 0, 1.2);
    addLobbyTable(new THREE.Vector3(3.35, 0, 0.75), 0, 1.2);
    addLobbyTable(new THREE.Vector3(-3.2, 0, -3.25), 0, 1.28);
    addLobbyTable(new THREE.Vector3(3.2, 0, -3.25), 0, 1.28);

    addClothingRack(-5.1, -0.8, 2.6);
    addClothingRack(5.1, -0.8, 2.6);
    addClothingRack(-5.25, 2.25, 2.2);
    addClothingRack(5.25, 2.25, 2.2);

    addShelfWall(-7.0, -1.2, -1);
    addShelfWall(7.0, -1.2, 1);

    addFrontDisplayPlinth(-2.25, 6.9);
    addFrontDisplayPlinth(2.25, 6.9);
    addLobbySofa(new THREE.Vector3(-8.35, 0, 5.7), Math.PI / 2, 1.35);
    addLobbyWoman(new THREE.Vector3(0.95, 0, -10.6), 0, 1.3);

    for (let i = 0; i < 5; i += 1) {
      const pendant = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 16, 16),
        new THREE.MeshStandardMaterial({ color: "#f2d39f", emissive: "#7d592f", emissiveIntensity: 0.34 })
      );
      pendant.position.set(-5 + i * 2.5, 11.1, 2.2);
      entranceGroup.add(pendant);
    }

    addEntrancePoster(lobby1, new THREE.Vector3(-11.72, 3.35, 1.8), Math.PI / 2, 2.5, 3.2);
    addEntrancePoster(lobby2, new THREE.Vector3(11.72, 3.35, 1.4), -Math.PI / 2, 2.5, 3.2);
    addEntrancePoster(lobby3, new THREE.Vector3(0, 4.9, -13.86), 0, 3.8, 2.8);
  }

  function addLiftPortalInEntrance() {
    const portalFrame = new THREE.Mesh(
      new THREE.BoxGeometry(4.3, 4.6, 0.3),
      new THREE.MeshStandardMaterial({ color: "#a67d4d", roughness: 0.28, metalness: 0.75, map: brassTexture, roughnessMap: brassTexture })
    );
    portalFrame.position.set(0, 2.25, -12.25);
    entranceGroup.add(portalFrame);

    liftDoorLeft.position.set(-0.95, 2.0, -12.05);
    liftDoorRight.position.set(0.95, 2.0, -12.05);
    entranceGroup.add(liftDoorLeft, liftDoorRight);

    const callPanel = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.84, 0.08), metalMaterial);
    callPanel.position.set(2.44, 1.8, -12.08);
    entranceGroup.add(callPanel);

    const callGlow = new THREE.Mesh(
      new THREE.CircleGeometry(0.08, 18),
      new THREE.MeshBasicMaterial({ color: "#f6cf87" })
    );
    callGlow.position.set(2.44, 1.88, -12.03);
    entranceGroup.add(callGlow);

    const displayLeft = new THREE.Mesh(
      new THREE.PlaneGeometry(1.95, 5.8),
      new THREE.MeshStandardMaterial({ color: "#3d3a4c", emissive: "#1d1c24", emissiveIntensity: 0.35, metalness: 0.72, roughness: 0.12, transparent: true, opacity: 0.2 })
    );
    displayLeft.position.set(-3.95, 3.95, -12.08);
    entranceGroup.add(displayLeft);

    const displayRight = displayLeft.clone();
    displayRight.position.x = 3.95;
    entranceGroup.add(displayRight);

    for (const shaftX of [-3.95, 3.95]) {
      const shaftWall = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 13.8, 0.9),
        new THREE.MeshStandardMaterial({ color: "#27232d", roughness: 0.8, metalness: 0.15, map: stoneTexture, bumpMap: wallNoiseTexture, bumpScale: 0.03 })
      );
      shaftWall.position.set(shaftX, 6.9, -13.0);
      entranceGroup.add(shaftWall);

      for (let i = 0; i < 3; i += 1) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 13.4, 0.08),
          new THREE.MeshStandardMaterial({ color: "#8b6a44", roughness: 0.36, metalness: 0.7, map: brassTexture, roughnessMap: brassTexture })
        );
        rail.position.set(shaftX - 0.56 + i * 0.56, 6.9, -12.64);
        entranceGroup.add(rail);
      }

      for (let i = 0; i < 3; i += 1) {
        const car = new THREE.Mesh(
          new THREE.BoxGeometry(1.32, 1.0, 0.58),
          new THREE.MeshStandardMaterial({ color: "#b98a55", emissive: "#31251a", emissiveIntensity: 0.2, roughness: 0.34, metalness: 0.62, map: brassTexture, roughnessMap: brassTexture })
        );
        car.position.set(shaftX, 1.5 + i * 3.9, -12.75);
        car.userData.phase = i / 3 + (shaftX > 0 ? 0.25 : 0);
        car.userData.speed = i % 2 === 0 ? 0.1 : -0.13;
        entranceGroup.add(car);
        entranceShaftCars.push(car);
      }
    }

    const shaftHeader = new THREE.Mesh(
      new THREE.BoxGeometry(10.2, 0.3, 0.26),
      new THREE.MeshStandardMaterial({ color: "#a0784a", roughness: 0.38, metalness: 0.7, map: brassTexture, roughnessMap: brassTexture })
    );
    shaftHeader.position.set(0, 6.95, -12.1);
    entranceGroup.add(shaftHeader);
  }

  const liftCabin = new THREE.Group();
  liftCabin.name = "Lift Cabin";
  const clickableShopLiftMeshes: THREE.Mesh[] = [];
  const clickableLiftControlMeshes: THREE.Mesh[] = [];
  let liftDisplayTexture: THREE.CanvasTexture | null = null;
  let liftDisplayCtx: CanvasRenderingContext2D | null = null;
  let liftDisplayNeedsUpdate = false;
  let liftMotionActive = false;
  let liftMotionDirection: 1 | -1 = 1;
  let liftHintActive = false;
  let liftShaftTexture: THREE.CanvasTexture | null = null;
  let liftShaftViewMaterial: THREE.MeshBasicMaterial | null = null;
  let liftPanelBeacon: THREE.Mesh | null = null;
  let liftPanelBeaconMaterial: THREE.MeshBasicMaterial | null = null;
  const liftHintDotMaterials: THREE.MeshBasicMaterial[] = [];
  let liftArrivalLampMaterial: THREE.MeshStandardMaterial | null = null;
  let liftArrivalHaloMaterial: THREE.MeshBasicMaterial | null = null;
  let liftArrivalPointLight: THREE.PointLight | null = null;
  let shopLiftSignMaterial: THREE.MeshBasicMaterial | null = null;
  let shopLiftSignPulseBaseOpacity = 0.86;
  const LIFT_DISPLAY_WIDTH = 256;
  const LIFT_DISPLAY_HEIGHT = 128;

  function setLiftArrivalLampState(arrived: boolean) {
    if (!liftArrivalLampMaterial || !liftArrivalHaloMaterial || !liftArrivalPointLight) {
      return;
    }

    if (arrived) {
      liftArrivalLampMaterial.color.set("#f2f5ff");
      liftArrivalLampMaterial.emissive.set("#ffffff");
      liftArrivalLampMaterial.emissiveIntensity = 2.2;
      liftArrivalHaloMaterial.color.set("#f4f8ff");
      liftArrivalHaloMaterial.opacity = 0.9;
      liftArrivalPointLight.color.set("#ffffff");
      liftArrivalPointLight.intensity = 2.2;
      return;
    }

    liftArrivalLampMaterial.color.set("#f2d2a1");
    liftArrivalLampMaterial.emissive.set("#7e562c");
    liftArrivalLampMaterial.emissiveIntensity = 0.42;
    liftArrivalHaloMaterial.color.set("#f2d7aa");
    liftArrivalHaloMaterial.opacity = 0.18;
    liftArrivalPointLight.color.set("#ffd39d");
    liftArrivalPointLight.intensity = 0.2;
  }

  function buildLiftShaftTexture() {
    const shaftCanvas = document.createElement("canvas");
    shaftCanvas.width = 256;
    shaftCanvas.height = 512;
    const shaftCtx = shaftCanvas.getContext("2d");
    if (!shaftCtx) {
      return;
    }

    shaftCtx.fillStyle = "#17161b";
    shaftCtx.fillRect(0, 0, shaftCanvas.width, shaftCanvas.height);

    for (let i = 0; i < 8; i += 1) {
      const y = i * 64;
      shaftCtx.fillStyle = i % 2 === 0 ? "#2b2630" : "#231f29";
      shaftCtx.fillRect(0, y, shaftCanvas.width, 64);

      shaftCtx.fillStyle = "#5f4a34";
      shaftCtx.fillRect(20, y + 5, shaftCanvas.width - 40, 4);
      shaftCtx.fillRect(20, y + 55, shaftCanvas.width - 40, 4);

      shaftCtx.fillStyle = "#3b2f26";
      shaftCtx.fillRect(34, y + 18, shaftCanvas.width - 68, 28);

      shaftCtx.fillStyle = "#baa078";
      shaftCtx.font = "600 18px serif";
      shaftCtx.textAlign = "right";
      shaftCtx.textBaseline = "middle";
      shaftCtx.fillText(String(i * 5 + 5), shaftCanvas.width - 30, y + 32);
    }

    liftShaftTexture = new THREE.CanvasTexture(shaftCanvas);
    liftShaftTexture.colorSpace = THREE.SRGBColorSpace;
    liftShaftTexture.wrapS = THREE.ClampToEdgeWrapping;
    liftShaftTexture.wrapT = THREE.RepeatWrapping;
    liftShaftTexture.repeat.set(1, 1);
    liftShaftTexture.offset.set(0, 0);
  }

  function setLiftMotion(moving: boolean, direction: 1 | -1 = 1) {
    liftMotionActive = moving;
    liftMotionDirection = direction;
    if (moving) {
      setLiftArrivalLampState(false);
    }
    if (!moving && liftShaftTexture) {
      liftShaftTexture.offset.y = 0;
    }
    if (liftShaftViewMaterial) {
      liftShaftViewMaterial.opacity = moving ? 0.98 : 0.42;
    }
  }

  function setLiftHintActive(active: boolean) {
    liftHintActive = active;
    if (!active && liftPanelBeacon && liftPanelBeaconMaterial) {
      liftPanelBeacon.scale.set(1, 1, 1);
      liftPanelBeaconMaterial.color.set("#ef9173");
      for (const mat of liftHintDotMaterials) {
        mat.opacity = 0.16;
      }
    }
  }

  function triggerLiftArrivalGlow() {
    setLiftArrivalLampState(true);
  }

  function updateLiftScreen(level: number) {
    if (!liftDisplayCtx || !liftDisplayTexture) {
      return;
    }

    const text = String(level);

    liftDisplayCtx.fillStyle = "#0a0a0d";
    liftDisplayCtx.fillRect(0, 0, LIFT_DISPLAY_WIDTH, LIFT_DISPLAY_HEIGHT);
    liftDisplayCtx.strokeStyle = "#94683b";
    liftDisplayCtx.lineWidth = 6;
    liftDisplayCtx.strokeRect(10, 10, LIFT_DISPLAY_WIDTH - 20, LIFT_DISPLAY_HEIGHT - 20);

    liftDisplayCtx.fillStyle = "#e8c486";
    liftDisplayCtx.font = text.length >= 3 ? "700 62px sans-serif" : "700 72px sans-serif";
    liftDisplayCtx.textAlign = "center";
    liftDisplayCtx.textBaseline = "middle";
    liftDisplayCtx.fillText(text, LIFT_DISPLAY_WIDTH / 2, LIFT_DISPLAY_HEIGHT / 2 + 1);

    liftDisplayNeedsUpdate = true;
  }

  function buildLiftDisplayTexture() {
    const canvas2d = document.createElement("canvas");
    canvas2d.width = LIFT_DISPLAY_WIDTH;
    canvas2d.height = LIFT_DISPLAY_HEIGHT;
    liftDisplayCtx = canvas2d.getContext("2d");
    liftDisplayTexture = new THREE.CanvasTexture(canvas2d);
    liftDisplayTexture.colorSpace = THREE.SRGBColorSpace;
    liftDisplayTexture.needsUpdate = true;
    updateLiftScreen(0);
  }

  function addLiftInterior() {
    const liftTrimMaterial = new THREE.MeshStandardMaterial({ color: "#b98a56", roughness: 0.36, metalness: 0.74, map: brassTexture, roughnessMap: brassTexture });
    const liftWallMaterial = new THREE.MeshStandardMaterial({ color: "#7a5641", roughness: 0.52, metalness: 0.18, map: woodPanelTexture, bumpMap: wallNoiseTexture, bumpScale: 0.035 });
    const liftInlayMaterial = new THREE.MeshStandardMaterial({ color: "#6a2e32", roughness: 0.72, metalness: 0.1, map: fabricTexture, bumpMap: fabricTexture, bumpScale: 0.012 });
    const mirrorMaterial = new THREE.MeshStandardMaterial({ color: "#9a8666", roughness: 0.06, metalness: 0.92, opacity: 0.38, transparent: true, roughnessMap: brassTexture });
    const lampMaterial = new THREE.MeshStandardMaterial({ color: "#f2d2a1", emissive: "#7e562c", emissiveIntensity: 0.45 });

    textureLoader.load(liftWoodPanel, (tx) => {
      tx.colorSpace = THREE.SRGBColorSpace;
      tx.wrapS = THREE.RepeatWrapping;
      tx.wrapT = THREE.RepeatWrapping;
      tx.repeat.set(2.8, 1.4);
      liftWallMaterial.map = tx;
      liftWallMaterial.needsUpdate = true;
    });

    textureLoader.load(liftWoodInlay, (tx) => {
      tx.colorSpace = THREE.SRGBColorSpace;
      tx.wrapS = THREE.RepeatWrapping;
      tx.wrapT = THREE.RepeatWrapping;
      tx.repeat.set(2.2, 2.0);
      liftInlayMaterial.map = tx;
      liftInlayMaterial.emissive = new THREE.Color("#2f1112");
      liftInlayMaterial.emissiveMap = tx;
      liftInlayMaterial.emissiveIntensity = 0.22;
      liftInlayMaterial.needsUpdate = true;
    });

    const cabinFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 4.8),
      new THREE.MeshStandardMaterial({ color: "#241715", roughness: 0.78, metalness: 0.12, map: carpetTexture, bumpMap: fabricTexture, bumpScale: 0.018 })
    );
    cabinFloor.rotation.x = -Math.PI / 2;
    liftCabin.add(cabinFloor);

    const cabinCeiling = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 4.8),
      new THREE.MeshStandardMaterial({ color: "#2d2321", roughness: 0.66, metalness: 0.18, map: plasterTexture, bumpMap: wallNoiseTexture, bumpScale: 0.02 })
    );
    cabinCeiling.rotation.x = Math.PI / 2;
    cabinCeiling.position.y = 3.5;
    liftCabin.add(cabinCeiling);

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 3.5, 0.2),
      liftWallMaterial
    );
    backWall.position.set(0, 1.75, -2.4);
    liftCabin.add(backWall);

    const sideWallLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 3.5, 4.8),
      liftWallMaterial
    );
    sideWallLeft.position.set(-2.2, 1.75, 0);
    liftCabin.add(sideWallLeft);

    const sideWallRight = sideWallLeft.clone();
    sideWallRight.position.x = 2.2;
    liftCabin.add(sideWallRight);

    const rearWall = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 3.5, 0.2),
      liftWallMaterial
    );
    rearWall.position.set(0, 1.75, 2.4);
    liftCabin.add(rearWall);

    const rearPosterFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 2.6, 0.08),
      new THREE.MeshStandardMaterial({ color: "#b89056", roughness: 0.34, metalness: 0.72, map: brassTexture, roughnessMap: brassTexture })
    );
    rearPosterFrame.position.set(0, 1.95, 2.29);
    liftCabin.add(rearPosterFrame);

    const rearPosterBase = new THREE.Mesh(
      new THREE.PlaneGeometry(1.74, 2.44),
      new THREE.MeshStandardMaterial({ color: "#1f1a22", roughness: 0.84, metalness: 0.06 })
    );
    rearPosterBase.position.set(0, 1.95, 2.16);
    rearPosterBase.rotation.y = Math.PI;
    liftCabin.add(rearPosterBase);

    textureLoader.load(advertLift, (tx) => {
      tx.colorSpace = THREE.SRGBColorSpace;
      rearPosterBase.material = new THREE.MeshBasicMaterial({ map: tx, toneMapped: false });
    });

    const floorCenterInlay = new THREE.Mesh(
      new THREE.CircleGeometry(1.05, 36),
      new THREE.MeshStandardMaterial({ color: "#603335", roughness: 0.78, metalness: 0.08, map: carpetTexture, bumpMap: fabricTexture, bumpScale: 0.012 })
    );
    floorCenterInlay.rotation.x = -Math.PI / 2;
    floorCenterInlay.position.set(0, 0.012, -0.25);
    liftCabin.add(floorCenterInlay);

    const floorInlayRing = new THREE.Mesh(
      new THREE.RingGeometry(0.98, 1.08, 42),
      new THREE.MeshStandardMaterial({ color: "#b38854", roughness: 0.34, metalness: 0.78 })
    );
    floorInlayRing.rotation.x = -Math.PI / 2;
    floorInlayRing.position.set(0, 0.014, -0.25);
    liftCabin.add(floorInlayRing);

    const interiorDoorLeft = liftDoorLeft.clone();
    const interiorDoorRight = liftDoorRight.clone();
    interiorDoorLeft.scale.set(1.04, 0.95, 1);
    interiorDoorRight.scale.set(1.04, 0.95, 1);
    interiorDoorLeft.position.set(-0.95, 1.9, -2.32);
    interiorDoorRight.position.set(0.95, 1.9, -2.32);
    liftCabin.add(interiorDoorLeft, interiorDoorRight);

    const doorGrillMaterial = new THREE.MeshStandardMaterial({ color: "#c59a62", roughness: 0.33, metalness: 0.8, map: brassTexture, roughnessMap: brassTexture });
    const doorEtchMaterial = new THREE.MeshStandardMaterial({ color: "#845335", roughness: 0.48, metalness: 0.32, map: woodPanelTextureFine });

    function addDoorOrnament(doorCenterX: number) {
      const medallion = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.02, 12, 28), doorGrillMaterial);
      medallion.position.set(doorCenterX, 2.02, -2.275);
      liftCabin.add(medallion);

      const medallionCore = new THREE.Mesh(new THREE.CircleGeometry(0.11, 20), doorEtchMaterial);
      medallionCore.position.set(doorCenterX, 2.02, -2.274);
      liftCabin.add(medallionCore);

      for (let i = 0; i < 4; i += 1) {
        const petal = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.11, 4, 8), doorGrillMaterial);
        petal.position.set(doorCenterX, 2.02, -2.273);
        petal.rotation.z = (Math.PI / 2) * i;
        liftCabin.add(petal);
      }

      for (let i = 0; i < 3; i += 1) {
        const y = 1.18 + i * 0.48;
        const groove = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.035, 0.01), doorEtchMaterial);
        groove.position.set(doorCenterX, y, -2.274);
        liftCabin.add(groove);

        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.016, 0.01), doorGrillMaterial);
        trim.position.set(doorCenterX, y + 0.052, -2.273);
        liftCabin.add(trim);
      }

      for (const side of [-1, 1]) {
        const verticalTrim = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.22, 0.01), doorGrillMaterial);
        verticalTrim.position.set(doorCenterX + side * 0.36, 1.92, -2.273);
        liftCabin.add(verticalTrim);
      }
    }

    addDoorOrnament(-0.95);
    addDoorOrnament(0.95);

    const doorTopFrieze = new THREE.Mesh(
      new THREE.BoxGeometry(2.9, 0.24, 0.12),
      new THREE.MeshStandardMaterial({ color: "#9f7547", roughness: 0.35, metalness: 0.66, map: brassTexture, roughnessMap: brassTexture })
    );
    doorTopFrieze.position.set(0, 3.06, -2.24);
    liftCabin.add(doorTopFrieze);

    const friezeCrestRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 10, 26), doorGrillMaterial);
    friezeCrestRing.rotation.x = Math.PI / 2;
    friezeCrestRing.position.set(0, 3.08, -2.175);
    liftCabin.add(friezeCrestRing);

    const friezeCrestCore = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), doorGrillMaterial);
    friezeCrestCore.position.set(0, 3.08, -2.175);
    liftCabin.add(friezeCrestCore);

    buildLiftShaftTexture();

    const shaftSlotFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 1.08, 0.08),
      new THREE.MeshStandardMaterial({ color: "#b58a57", roughness: 0.36, metalness: 0.74, map: brassTexture, roughnessMap: brassTexture })
    );
    shaftSlotFrame.position.set(0, 2.12, -2.24);
    liftCabin.add(shaftSlotFrame);

    const shaftSlotInset = new THREE.Mesh(
      new THREE.BoxGeometry(0.47, 0.9, 0.04),
      new THREE.MeshStandardMaterial({ color: "#1d1618", roughness: 0.84, metalness: 0.06, map: stoneTexture, bumpMap: wallNoiseTexture, bumpScale: 0.01 })
    );
    shaftSlotInset.position.set(0, 2.12, -2.265);
    liftCabin.add(shaftSlotInset);

    liftShaftViewMaterial = new THREE.MeshBasicMaterial({
      map: liftShaftTexture,
      toneMapped: false,
      transparent: true,
      opacity: 0.42
    });

    const shaftSlotView = new THREE.Mesh(new THREE.PlaneGeometry(0.41, 0.82), liftShaftViewMaterial);
    shaftSlotView.position.set(0, 2.12, -2.275);
    liftCabin.add(shaftSlotView);

    for (let i = 0; i < 4; i += 1) {
      const slotCrossbar = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.012, 0.008), doorGrillMaterial);
      slotCrossbar.position.set(0, 1.82 + i * 0.2, -2.268);
      liftCabin.add(slotCrossbar);
    }

    const corniceBack = new THREE.Mesh(new THREE.BoxGeometry(4.28, 0.14, 0.2), liftTrimMaterial);
    corniceBack.position.set(0, 3.36, -2.28);
    liftCabin.add(corniceBack);

    const corniceLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 4.66), liftTrimMaterial);
    corniceLeft.position.set(-2.08, 3.36, 0);
    liftCabin.add(corniceLeft);

    const corniceRight = corniceLeft.clone();
    corniceRight.position.x = 2.08;
    liftCabin.add(corniceRight);

    const chairRailBack = new THREE.Mesh(new THREE.BoxGeometry(4.16, 0.1, 0.12), liftTrimMaterial);
    chairRailBack.position.set(0, 1.24, -2.29);
    liftCabin.add(chairRailBack);

    const chairRailLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 4.42), liftTrimMaterial);
    chairRailLeft.position.set(-2.09, 1.24, 0);
    liftCabin.add(chairRailLeft);

    const chairRailRight = chairRailLeft.clone();
    chairRailRight.position.x = 2.09;
    liftCabin.add(chairRailRight);

    for (const side of [-1, 1]) {
      const mirrorPanel = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.6), mirrorMaterial);
      mirrorPanel.position.set(side * 2.02, 2.03, -0.35);
      mirrorPanel.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      liftCabin.add(mirrorPanel);

      for (let i = 0; i < 5; i += 1) {
        const latticeVertical = new THREE.Mesh(new THREE.BoxGeometry(0.014, 1.48, 0.02), doorGrillMaterial);
        latticeVertical.position.set(side * 2.005, 2.03, -0.89 + i * 0.27);
        latticeVertical.rotation.y = mirrorPanel.rotation.y;
        liftCabin.add(latticeVertical);
      }

      for (let i = 0; i < 4; i += 1) {
        const latticeHorizontal = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.02, 1.28), doorGrillMaterial);
        latticeHorizontal.position.set(side * 2.005, 1.47 + i * 0.33, -0.35);
        latticeHorizontal.rotation.y = mirrorPanel.rotation.y;
        liftCabin.add(latticeHorizontal);
      }

      const mirrorFrameTop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 1.48), liftTrimMaterial);
      mirrorFrameTop.position.set(side * 2.0, 2.86, -0.35);
      mirrorFrameTop.rotation.y = mirrorPanel.rotation.y;
      liftCabin.add(mirrorFrameTop);

      const mirrorFrameBottom = mirrorFrameTop.clone();
      mirrorFrameBottom.position.y = 1.2;
      liftCabin.add(mirrorFrameBottom);

      const mirrorFrameInner = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.62, 0.08), liftTrimMaterial);
      mirrorFrameInner.position.set(side * 2.0, 2.03, -1.08);
      mirrorFrameInner.rotation.y = mirrorPanel.rotation.y;
      liftCabin.add(mirrorFrameInner);

      const mirrorFrameOuter = mirrorFrameInner.clone();
      mirrorFrameOuter.position.z = 0.38;
      liftCabin.add(mirrorFrameOuter);

      const inlayColumn = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.0, 0.8), liftInlayMaterial);
      inlayColumn.position.set(side * 2.01, 1.55, 1.35);
      inlayColumn.rotation.y = mirrorPanel.rotation.y;
      liftCabin.add(inlayColumn);

      const handrail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.7, 18), liftTrimMaterial);
      handrail.rotation.z = Math.PI / 2;
      handrail.position.set(side * 1.95, 1.08, 0.12);
      handrail.rotation.y = mirrorPanel.rotation.y;
      liftCabin.add(handrail);

      const sconceTop = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), lampMaterial);
      sconceTop.position.set(side * 1.98, 2.83, 0.95);
      liftCabin.add(sconceTop);

      const sconceBottom = sconceTop.clone();
      sconceBottom.position.y = 1.88;
      liftCabin.add(sconceBottom);
    }

    for (let i = 0; i < 3; i += 1) {
      const backInlay = new THREE.Mesh(new THREE.BoxGeometry(1.06, 1.9, 0.03), liftInlayMaterial);
      backInlay.position.set(-1.06 + i * 1.06, 1.86, -2.28);
      liftCabin.add(backInlay);

      const backFrame = new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.96, 0.05), liftTrimMaterial);
      backFrame.position.set(-1.06 + i * 1.06, 1.86, -2.27);
      liftCabin.add(backFrame);
    }

    const ceilingMedallion = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.06, 14, 40),
      new THREE.MeshStandardMaterial({ color: "#c0955f", roughness: 0.34, metalness: 0.78, map: brassTexture, roughnessMap: brassTexture })
    );
    ceilingMedallion.rotation.x = Math.PI / 2;
    ceilingMedallion.position.set(0, 3.44, -0.22);
    liftCabin.add(ceilingMedallion);

    const chandelierStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "#c8a16c", roughness: 0.35, metalness: 0.8, map: brassTexture, roughnessMap: brassTexture })
    );
    chandelierStem.position.set(0, 3.29, -0.22);
    liftCabin.add(chandelierStem);

    const chandelierGlow = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), lampMaterial);
    chandelierGlow.position.set(0, 3.09, -0.22);
    liftCabin.add(chandelierGlow);

    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.7, 0.1), metalMaterial);
    panel.position.set(1.86, 1.42, -1.35);
    liftCabin.add(panel);
    clickableLiftControlMeshes.push(panel);

    liftPanelBeaconMaterial = new THREE.MeshBasicMaterial({ color: "#ef9173", transparent: true, opacity: 0.95 });
    const panelBeacon = new THREE.Mesh(
      new THREE.CircleGeometry(0.08, 20),
      liftPanelBeaconMaterial
    );
    panelBeacon.position.set(1.86, 2.28, -1.28);
    panelBeacon.rotation.y = -Math.PI / 2;
    liftCabin.add(panelBeacon);
    clickableLiftControlMeshes.push(panelBeacon);
    liftPanelBeacon = panelBeacon;

    for (let i = 0; i < 3; i += 1) {
      const dotMaterial = new THREE.MeshBasicMaterial({ color: "#ffdcb1", transparent: true, opacity: 0.16, toneMapped: false });
      const hintDot = new THREE.Mesh(new THREE.CircleGeometry(0.028, 14), dotMaterial);
      hintDot.position.set(1.855, 2.1 - i * 0.11, -1.28);
      hintDot.rotation.y = -Math.PI / 2;
      liftCabin.add(hintDot);
      liftHintDotMaterials.push(dotMaterial);
    }

    buildLiftDisplayTexture();

    const headerLevelDisplay = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.24),
      new THREE.MeshBasicMaterial({ map: liftDisplayTexture, toneMapped: false })
    );
    headerLevelDisplay.position.set(0, 2.92, -2.17);
    liftCabin.add(headerLevelDisplay);

    liftArrivalLampMaterial = new THREE.MeshStandardMaterial({ color: "#f2d2a1", emissive: "#7e562c", emissiveIntensity: 0.42 });
    const headerArrivalLamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), liftArrivalLampMaterial);
    headerArrivalLamp.position.set(0, 3.21, -2.16);
    liftCabin.add(headerArrivalLamp);

    liftArrivalHaloMaterial = new THREE.MeshBasicMaterial({
      color: "#f2d7aa",
      transparent: true,
      opacity: 0.18,
      toneMapped: false,
      side: THREE.DoubleSide
    });
    const headerArrivalHalo = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), liftArrivalHaloMaterial);
    headerArrivalHalo.position.set(0, 3.21, -2.155);
    liftCabin.add(headerArrivalHalo);

    liftArrivalPointLight = new THREE.PointLight("#ffd39d", 0.2, 3.4, 2);
    liftArrivalPointLight.position.set(0, 3.21, -2.0);
    liftCabin.add(liftArrivalPointLight);

    setLiftArrivalLampState(false);

    for (let i = 0; i < 6; i += 1) {
      const button = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.025, 18),
        new THREE.MeshStandardMaterial({ color: i === 0 ? "#deb06f" : "#6f4f35", metalness: 0.78, roughness: 0.25, map: brassTexture, roughnessMap: brassTexture })
      );
      const row = Math.floor(i / 2);
      const col = i % 2;
      button.rotation.x = Math.PI / 2;
      button.position.set(1.86, 1.73 - row * 0.22, -1.21 + col * 0.15);
      button.rotation.y = -Math.PI / 2;
      liftCabin.add(button);
    }

    const topLight = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.2),
      new THREE.MeshStandardMaterial({ color: "#f1cb8e", emissive: "#7d562a", emissiveIntensity: 0.35 })
    );
    topLight.rotation.x = Math.PI / 2;
    topLight.position.set(0, 3.46, 0.2);
    liftCabin.add(topLight);

    liftGroup.add(liftCabin);
  }

  let storefrontSignTexture: THREE.CanvasTexture | null = null;
  let storefrontSignCtx: CanvasRenderingContext2D | null = null;
  let storefrontSignNeedsUpdate = false;

  function updateStorefrontSign(floorNum: number) {
    if (!storefrontSignCtx || !storefrontSignTexture) {
      return;
    }

    storefrontSignCtx.fillStyle = "#2f1618";
    storefrontSignCtx.fillRect(0, 0, 1024, 256);
    storefrontSignCtx.strokeStyle = "#b89056";
    storefrontSignCtx.lineWidth = 10;
    storefrontSignCtx.strokeRect(12, 12, 1000, 232);

    storefrontSignCtx.fillStyle = "#eed09c";
    storefrontSignCtx.font = "700 92px serif";
    storefrontSignCtx.textAlign = "center";
    storefrontSignCtx.textBaseline = "middle";
    storefrontSignCtx.fillText(`Britannic Floor ${floorNum}`, 512, 128);

    storefrontSignNeedsUpdate = true;
  }

  function makeStorefrontSignTexture() {
    const canvas2d = document.createElement("canvas");
    canvas2d.width = 1024;
    canvas2d.height = 256;
    storefrontSignCtx = canvas2d.getContext("2d");
    storefrontSignTexture = new THREE.CanvasTexture(canvas2d);
    storefrontSignTexture.colorSpace = THREE.SRGBColorSpace;
    updateStorefrontSign(1);
  }

  function addShopfrontRoom() {
    const shopTrimMaterial = new THREE.MeshStandardMaterial({
      color: "#7a5738",
      roughness: 0.46,
      metalness: 0.22,
      map: woodPanelTextureFine,
      bumpMap: wallNoiseTexture,
      bumpScale: 0.02
    });
    const shopBrassMaterial = new THREE.MeshStandardMaterial({
      color: "#c59a62",
      roughness: 0.34,
      metalness: 0.76,
      map: brassTexture,
      roughnessMap: brassTexture
    });
    const shopFabricMaterial = new THREE.MeshStandardMaterial({
      color: "#7a2b3a",
      roughness: 0.84,
      metalness: 0.03,
      map: fabricTexture,
      bumpMap: fabricTexture,
      bumpScale: 0.015
    });
    const shopGlassMaterial = new THREE.MeshStandardMaterial({
      color: "#b89966",
      metalness: 0.9,
      roughness: 0.08,
      transparent: true,
      opacity: 0.24
    });
    const shopWallMaterial = new THREE.MeshStandardMaterial({
      color: "#4f2f26",
      roughness: 0.62,
      metalness: 0.16,
      map: woodPanelTexture,
      bumpMap: wallNoiseTexture,
      bumpScale: 0.03
    });
    const shopSideWallMaterial = new THREE.MeshStandardMaterial({
      color: "#6a4434",
      roughness: 0.66,
      metalness: 0.12,
      map: woodPanelTextureFine,
      bumpMap: wallNoiseTexture,
      bumpScale: 0.03
    });

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 20),
      new THREE.MeshStandardMaterial({ color: "#2f2219", roughness: 0.84, metalness: 0.1, map: stoneTexture, bumpMap: wallNoiseTexture, bumpScale: 0.015 })
    );
    floor.rotation.x = -Math.PI / 2;
    shopGroup.add(floor);

    const entranceRunner = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 6.6),
      new THREE.MeshStandardMaterial({ color: "#7a2b3a", roughness: 0.86, metalness: 0, map: carpetTexture, bumpMap: fabricTexture, bumpScale: 0.015 })
    );
    entranceRunner.rotation.x = -Math.PI / 2;
    entranceRunner.position.set(0, 0.012, -2.2);
    shopGroup.add(entranceRunner);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(13.5, 5.2, 0.42), shopWallMaterial);
    backWall.position.set(0, 2.6, -11.6);
    shopGroup.add(backWall);

    const sideLeft = new THREE.Mesh(new THREE.BoxGeometry(0.45, 5.2, 15.4), shopSideWallMaterial);
    sideLeft.position.set(-6.8, 2.6, -4.0);
    shopGroup.add(sideLeft);

    const sideRight = sideLeft.clone();
    sideRight.position.x = 6.8;
    shopGroup.add(sideRight);

    const rearWall = new THREE.Mesh(new THREE.BoxGeometry(13.5, 5.2, 0.42), shopWallMaterial);
    rearWall.position.set(0, 2.6, 11.9);
    shopGroup.add(rearWall);

    const rearLiftFrame = new THREE.Mesh(new THREE.BoxGeometry(3.3, 4.3, 0.14), shopBrassMaterial);
    rearLiftFrame.position.set(0, 2.18, 11.74);
    shopGroup.add(rearLiftFrame);

    const rearLiftDoor = new THREE.Mesh(
      new THREE.BoxGeometry(2.7, 3.9, 0.12),
      new THREE.MeshStandardMaterial({ color: "#5a3b2c", roughness: 0.44, metalness: 0.2, map: woodPanelTextureFine })
    );
    rearLiftDoor.position.set(0, 1.95, 11.7);
    shopGroup.add(rearLiftDoor);
    clickableShopLiftMeshes.push(rearLiftDoor);

    const rearLiftSignCanvas = document.createElement("canvas");
    rearLiftSignCanvas.width = 512;
    rearLiftSignCanvas.height = 128;
    const rearLiftSignCtx = rearLiftSignCanvas.getContext("2d");
    if (rearLiftSignCtx) {
      rearLiftSignCtx.fillStyle = "#2a1616";
      rearLiftSignCtx.fillRect(0, 0, rearLiftSignCanvas.width, rearLiftSignCanvas.height);
      rearLiftSignCtx.strokeStyle = "#c79a61";
      rearLiftSignCtx.lineWidth = 8;
      rearLiftSignCtx.strokeRect(8, 8, rearLiftSignCanvas.width - 16, rearLiftSignCanvas.height - 16);
      rearLiftSignCtx.fillStyle = "#edd0a0";
      rearLiftSignCtx.font = "700 52px serif";
      rearLiftSignCtx.textAlign = "center";
      rearLiftSignCtx.textBaseline = "middle";
      rearLiftSignCtx.fillText("LIFT", rearLiftSignCanvas.width / 2, rearLiftSignCanvas.height / 2 + 2);

      const rearLiftSignTexture = new THREE.CanvasTexture(rearLiftSignCanvas);
      rearLiftSignTexture.colorSpace = THREE.SRGBColorSpace;
      const rearLiftSignMat = new THREE.MeshBasicMaterial({ map: rearLiftSignTexture, toneMapped: false, transparent: true, opacity: shopLiftSignPulseBaseOpacity, side: THREE.DoubleSide });
      const rearLiftSign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 0.38),
        rearLiftSignMat
      );
      rearLiftSign.position.set(0, 4.2, 11.66);
      rearLiftSign.rotation.y = Math.PI;
      shopGroup.add(rearLiftSign);
      clickableShopLiftMeshes.push(rearLiftSign);
      shopLiftSignMaterial = rearLiftSignMat;

      const rearLiftSignGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.0, 0.52),
        new THREE.MeshBasicMaterial({ color: "#ffd8a0", transparent: true, opacity: 0.24, toneMapped: false, side: THREE.DoubleSide })
      );
      rearLiftSignGlow.position.set(0, 4.2, 11.63);
      rearLiftSignGlow.rotation.y = Math.PI;
      shopGroup.add(rearLiftSignGlow);

      const rearLiftSignLight = new THREE.PointLight("#ffe2b2", 1.1, 5.2, 2);
      rearLiftSignLight.position.set(0, 4.1, 11.2);
      shopGroup.add(rearLiftSignLight);
    }

    const facadeTop = new THREE.Mesh(new THREE.BoxGeometry(10.8, 1.0, 0.58), shopTrimMaterial);
    facadeTop.position.set(0, 4.1, -4.9);
    shopGroup.add(facadeTop);

    const facadePlinth = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.86, 0.58), shopTrimMaterial);
    facadePlinth.position.set(0, 0.43, -4.9);
    shopGroup.add(facadePlinth);

    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(10.4, 0.42, 2.3),
      new THREE.MeshStandardMaterial({ color: "#6b1e2a", roughness: 0.62, metalness: 0.08, map: fabricTexture, bumpMap: fabricTexture, bumpScale: 0.02 })
    );
    awning.position.set(0, 3.8, -4.25);
    shopGroup.add(awning);

    const awningTrim = new THREE.Mesh(new THREE.BoxGeometry(10.42, 0.1, 0.2), shopBrassMaterial);
    awningTrim.position.set(0, 3.56, -3.2);
    shopGroup.add(awningTrim);

    for (const x of [-4.9, -1.55, 1.55, 4.9]) {
      const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.34, 0.56), shopTrimMaterial);
      pilaster.position.set(x, 1.74, -4.92);
      shopGroup.add(pilaster);
    }

    const centralDoor = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 3.24, 0.22),
      new THREE.MeshStandardMaterial({ color: "#4c2d21", roughness: 0.48, metalness: 0.2, map: woodPanelTextureFine })
    );
    centralDoor.position.set(0, 1.62, -5.0);
    shopGroup.add(centralDoor);

    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.42, 3.52, 0.1), shopBrassMaterial);
    doorFrame.position.set(0, 1.76, -4.72);
    shopGroup.add(doorFrame);

    const transom = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 0.44), shopGlassMaterial);
    transom.position.set(0, 3.18, -4.66);
    shopGroup.add(transom);

    for (const bayX of [-3.2, 3.2]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.85, 2.65, 0.1), shopBrassMaterial);
      frame.position.set(bayX, 2.2, -4.72);
      shopGroup.add(frame);

      const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.4), shopGlassMaterial);
      glass.position.set(bayX, 2.2, -4.59);
      shopGroup.add(glass);

      for (let i = 0; i < 3; i += 1) {
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.38, 0.04), shopBrassMaterial);
        mullion.position.set(bayX - 0.78 + i * 0.78, 2.2, -4.69);
        shopGroup.add(mullion);
      }

      const windowPlinth = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.14, 1.8),
        new THREE.MeshStandardMaterial({ color: "#5e3f2f", roughness: 0.56, metalness: 0.1, map: woodPanelTextureFine })
      );
      windowPlinth.position.set(bayX, 0.98, -6.0);
      shopGroup.add(windowPlinth);
    }

    const logoCanvas = document.createElement("canvas");
    logoCanvas.width = 1024;
    logoCanvas.height = 240;
    const logoCtx = logoCanvas.getContext("2d");
    if (logoCtx) {
      logoCtx.fillStyle = "#2f1618";
      logoCtx.fillRect(0, 0, logoCanvas.width, logoCanvas.height);
      logoCtx.strokeStyle = "#c69a61";
      logoCtx.lineWidth = 14;
      logoCtx.strokeRect(14, 14, logoCanvas.width - 28, logoCanvas.height - 28);
      logoCtx.fillStyle = "#e9cf9f";
      logoCtx.font = "700 84px serif";
      logoCtx.textAlign = "center";
      logoCtx.textBaseline = "middle";
      logoCtx.fillText("HARRINGTON & FINCH", logoCanvas.width / 2, 118);
      logoCtx.font = "600 28px serif";
      logoCtx.fillText("MAYFAIR OUTFITTERS", logoCanvas.width / 2, 184);

      const logoTexture = new THREE.CanvasTexture(logoCanvas);
      logoTexture.colorSpace = THREE.SRGBColorSpace;
      const logoPanel = new THREE.Mesh(
        new THREE.PlaneGeometry(7.8, 1.18),
        new THREE.MeshBasicMaterial({ map: logoTexture, toneMapped: false })
      );
      logoPanel.position.set(0, 4.42, -4.58);
      shopGroup.add(logoPanel);
    }

    makeStorefrontSignTexture();
    updateStorefrontSign(3);
    const floorPlaque = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 0.42),
      new THREE.MeshBasicMaterial({ map: storefrontSignTexture, toneMapped: false, transparent: true, opacity: 0.72 })
    );
    floorPlaque.position.set(0, 1.03, -5.95);
    shopGroup.add(floorPlaque);

    const kiosk = new THREE.Group();
    kiosk.position.set(0, 0, -2.45);

    const kioskBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 1.15, 0.9),
      new THREE.MeshStandardMaterial({ color: "#5e3f2f", roughness: 0.54, metalness: 0.12, map: woodPanelTextureFine })
    );
    kioskBase.position.y = 0.58;
    kiosk.add(kioskBase);

    const kioskTop = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.08, 1.02), shopBrassMaterial);
    kioskTop.position.y = 1.18;
    kiosk.add(kioskTop);

    const register = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.28, 0.28),
      new THREE.MeshStandardMaterial({ color: "#3d2a22", roughness: 0.48, metalness: 0.22, map: woodPanelTextureFine })
    );
    register.position.set(0.56, 1.36, -0.08);
    kiosk.add(register);

    const registerScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.26, 0.14),
      new THREE.MeshBasicMaterial({ color: "#77c5ff", toneMapped: false })
    );
    registerScreen.position.set(0.56, 1.38, -0.23);
    kiosk.add(registerScreen);

    const assistant = new THREE.Group();
    assistant.position.set(-0.52, 1.2, 0.16);

    const assistantTorso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 0.48, 5, 10),
      new THREE.MeshStandardMaterial({ color: "#eadccf", roughness: 0.66, metalness: 0.02 })
    );
    assistantTorso.position.y = 0.42;
    assistant.add(assistantTorso);

    const assistantHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 14, 14),
      new THREE.MeshStandardMaterial({ color: "#e4d3c2", roughness: 0.62, metalness: 0.02 })
    );
    assistantHead.position.y = 0.86;
    assistant.add(assistantHead);

    const assistantJacket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.24, 0.54, 18),
      new THREE.MeshStandardMaterial({ color: "#2f3f58", roughness: 0.82, metalness: 0.02, map: fabricTexture, bumpMap: fabricTexture, bumpScale: 0.008 })
    );
    assistantJacket.position.y = 0.32;
    assistant.add(assistantJacket);

    const assistantArmLeft = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.045, 0.28, 4, 8),
      new THREE.MeshStandardMaterial({ color: "#2f3f58", roughness: 0.82, metalness: 0.02, map: fabricTexture })
    );
    assistantArmLeft.position.set(-0.22, 0.36, -0.02);
    assistantArmLeft.rotation.z = 0.48;
    assistant.add(assistantArmLeft);

    const assistantArmRight = assistantArmLeft.clone();
    assistantArmRight.position.x = 0.22;
    assistantArmRight.rotation.z = -0.48;
    assistant.add(assistantArmRight);

    kiosk.add(assistant);
    shopGroup.add(kiosk);

    const wardrobe = new THREE.Group();
    wardrobe.position.set(5.35, 0, -2.0);

    const wardrobeBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 3.2, 0.9),
      new THREE.MeshStandardMaterial({ color: "#593c2d", roughness: 0.5, metalness: 0.15, map: woodPanelTextureFine })
    );
    wardrobeBody.position.y = 1.6;
    wardrobe.add(wardrobeBody);

    const wardrobeCrown = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.16, 1.0), shopBrassMaterial);
    wardrobeCrown.position.y = 3.28;
    wardrobe.add(wardrobeCrown);

    const wardrobeDoorLeft = new THREE.Mesh(new THREE.BoxGeometry(0.86, 2.72, 0.06), shopTrimMaterial);
    wardrobeDoorLeft.position.set(-0.45, 1.58, 0.48);
    wardrobe.add(wardrobeDoorLeft);

    const wardrobeDoorRight = wardrobeDoorLeft.clone();
    wardrobeDoorRight.position.x = 0.45;
    wardrobe.add(wardrobeDoorRight);

    for (const x of [-0.2, 0.2]) {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.26, 14), shopBrassMaterial);
      handle.position.set(x, 1.58, 0.54);
      wardrobe.add(handle);
    }

    const tryOnCanvas = document.createElement("canvas");
    tryOnCanvas.width = 320;
    tryOnCanvas.height = 96;
    const tryOnCtx = tryOnCanvas.getContext("2d");
    if (tryOnCtx) {
      tryOnCtx.fillStyle = "#2a1616";
      tryOnCtx.fillRect(0, 0, tryOnCanvas.width, tryOnCanvas.height);
      tryOnCtx.strokeStyle = "#c79a61";
      tryOnCtx.lineWidth = 6;
      tryOnCtx.strokeRect(6, 6, tryOnCanvas.width - 12, tryOnCanvas.height - 12);
      tryOnCtx.fillStyle = "#ffe0b5";
      tryOnCtx.font = "700 42px serif";
      tryOnCtx.textAlign = "center";
      tryOnCtx.textBaseline = "middle";
      tryOnCtx.fillText("TRY ON", tryOnCanvas.width / 2, tryOnCanvas.height / 2 + 1);

      const tryOnTexture = new THREE.CanvasTexture(tryOnCanvas);
      tryOnTexture.colorSpace = THREE.SRGBColorSpace;

      const tryOnSign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.06, 0.3),
        new THREE.MeshBasicMaterial({ map: tryOnTexture, toneMapped: false, transparent: true, opacity: 0.92, side: THREE.DoubleSide })
      );
      tryOnSign.position.set(0, 3.72, 0.56);
      wardrobe.add(tryOnSign);

      const tryOnGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.24, 0.4),
        new THREE.MeshBasicMaterial({ color: "#ffd8a8", transparent: true, opacity: 0.24, toneMapped: false, side: THREE.DoubleSide })
      );
      tryOnGlow.position.set(0, 3.72, 0.53);
      wardrobe.add(tryOnGlow);
    }

    shopGroup.add(wardrobe);

    const wardrobeLeft = wardrobe.clone();
    wardrobeLeft.position.x = -5.35;
    shopGroup.add(wardrobeLeft);

    const interiorWoodFloorTexture = makeTiledTexture(woodFloorLobby, 2.8, 2.6);

    const interiorFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(12.4, 11.2),
      new THREE.MeshStandardMaterial({ color: "#3b2b22", roughness: 0.72, metalness: 0.08, map: interiorWoodFloorTexture })
    );
    interiorFloor.rotation.x = -Math.PI / 2;
    interiorFloor.position.set(0, 0.02, -8.0);
    shopGroup.add(interiorFloor);

    const interiorCeiling = new THREE.Mesh(
      new THREE.PlaneGeometry(12.4, 11.2),
      new THREE.MeshStandardMaterial({ color: "#5a4538", roughness: 0.64, metalness: 0.1, map: plasterTexture, bumpMap: wallNoiseTexture, bumpScale: 0.02 })
    );
    interiorCeiling.rotation.x = Math.PI / 2;
    interiorCeiling.position.set(0, 4.7, -8.0);
    shopGroup.add(interiorCeiling);

    for (let i = 0; i < 4; i += 1) {
      const brightPanel = new THREE.Mesh(
        new THREE.PlaneGeometry(1.9, 0.46),
        new THREE.MeshStandardMaterial({ color: "#f5d9ad", emissive: "#f4ddb8", emissiveIntensity: 0.72, roughness: 0.2, metalness: 0 })
      );
      brightPanel.rotation.x = Math.PI / 2;
      brightPanel.position.set(-4.2 + i * 2.8, 4.66, -8.0);
      shopGroup.add(brightPanel);

      const light = new THREE.PointLight("#ffe6be", 1.6, 11, 2);
      light.position.set(-4.2 + i * 2.8, 4.35, -8.0);
      shopGroup.add(light);
    }

    function addClothingRun(z: number, width: number, garmentColorA: string, garmentColorB: string) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, width, 16), shopBrassMaterial);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, 2.8, z);
      shopGroup.add(rail);

      const supportLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 12), shopBrassMaterial);
      supportLeft.position.set(-width / 2, 1.3, z);
      shopGroup.add(supportLeft);

      const supportRight = supportLeft.clone();
      supportRight.position.x = width / 2;
      shopGroup.add(supportRight);

      const garmentCount = 13;
      for (let i = 0; i < garmentCount; i += 1) {
        const garment = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.72, 0.12),
          new THREE.MeshStandardMaterial({
            color: i % 2 === 0 ? garmentColorA : garmentColorB,
            roughness: 0.9,
            metalness: 0,
            map: fabricTexture,
            bumpMap: fabricTexture,
            bumpScale: 0.012
          })
        );
        const t = garmentCount <= 1 ? 0.5 : i / (garmentCount - 1);
        garment.position.set(-width / 2 + t * width, 2.25, z + ((i % 3) - 1) * 0.03);
        shopGroup.add(garment);
      }
    }

    addClothingRun(-7.0, 8.8, "#234864", "#7f2b39");
    addClothingRun(-9.3, 8.8, "#556b3a", "#6f3d77");

    for (const x of [-5.6, 5.6]) {
      const wallCabinet = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 3.2, 4.6),
        new THREE.MeshStandardMaterial({ color: "#5b3e2f", roughness: 0.56, metalness: 0.14, map: woodPanelTextureFine })
      );
      wallCabinet.position.set(x, 1.6, -8.0);
      shopGroup.add(wallCabinet);

      for (let i = 0; i < 5; i += 1) {
        const folded = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.08, 0.34),
          new THREE.MeshStandardMaterial({
            color: i % 2 === 0 ? "#c09a6b" : "#3f5f89",
            roughness: 0.84,
            metalness: 0.02,
            map: fabricTexture
          })
        );
        folded.position.set(x + (x > 0 ? -0.2 : 0.2), 0.74 + i * 0.52, -9.7 + (i % 3) * 0.84);
        shopGroup.add(folded);
      }
    }
  }

  addEntranceRoom();
  addLiftPortalInEntrance();
  addLiftInterior();
  addShopfrontRoom();

  assignSceneObjectNames(entranceGroup, "Entrance");
  assignSceneObjectNames(liftGroup, "Lift");
  assignSceneObjectNames(shopGroup, "Shop");

  replaceObjectByNamePrefixWithModel(
    entranceGroup,
    "Entrance Entrance Cluster 6",
    manequinModel,
    "Entrance Cluster 6 Manequin",
    1,
    (mesh) => {
      mesh.material = new THREE.MeshStandardMaterial({
        color: "#d7c5ad",
        roughness: 0.74,
        metalness: 0.06,
        map: mannequinTexture,
        bumpMap: wallNoiseTexture,
        bumpScale: 0.01
      });
    }
  );

  removeObjectsByNamePrefix(entranceGroup, "Entrance Structure Block 22");
  removeObjectsByNamePrefix(entranceGroup, "Entrance Structure Block 23");
  removeObjectsByNamePrefix(entranceGroup, "Entrance Structure Block 20");
  removeObjectsByNamePrefix(entranceGroup, "Entrance Structure Block 21");
  removeObjectsByNamePrefix(entranceGroup, "Entrance Spot Cone 1");
  removeObjectsByNamePrefix(entranceGroup, "Entrance Spot Cone 2");
  removeObjectsByNamePrefix(entranceGroup, "Entrance Entrance Cluster 5");
  removeObjectsByNamePrefix(entranceGroup, "Entrance Entrance Cluster 7");
  removeObjectsByNamePrefix(entranceGroup, "Entrance Entrance Cluster 3");
  removeObjectsByNamePrefix(entranceGroup, "Entrance Entrance Cluster 4");
  removeObjectsByNamePrefix(entranceGroup, "Entrance Entrance Cluster 2");

  function animate(elapsed: number) {
    if (liftDisplayNeedsUpdate && liftDisplayTexture) {
      liftDisplayTexture.needsUpdate = true;
      liftDisplayNeedsUpdate = false;
    }

    if (storefrontSignNeedsUpdate && storefrontSignTexture) {
      storefrontSignTexture.needsUpdate = true;
      storefrontSignNeedsUpdate = false;
    }

    if (liftShaftTexture) {
      if (liftMotionActive) {
        const directionFactor = liftMotionDirection > 0 ? -1 : 1;
        liftShaftTexture.offset.y = (elapsed * 1.18 * directionFactor) % 1;
      } else {
        liftShaftTexture.offset.y *= 0.9;
      }
    }

    if (liftPanelBeacon && liftPanelBeaconMaterial) {
      if (liftHintActive) {
        const pulse = (Math.sin(elapsed * 5.6) + 1) * 0.5;
        liftPanelBeacon.scale.setScalar(0.92 + pulse * 0.16);
        liftPanelBeaconMaterial.color.setRGB(0.88 + pulse * 0.12, 0.53 + pulse * 0.32, 0.43 + pulse * 0.45);

        for (let i = 0; i < liftHintDotMaterials.length; i += 1) {
          const phase = (elapsed * 4.8 - i * 0.45) % (Math.PI * 2);
          const glow = (Math.sin(phase) + 1) * 0.5;
          liftHintDotMaterials[i].opacity = 0.16 + glow * 0.76;
        }
      } else {
        liftPanelBeacon.scale.set(1, 1, 1);
      }
    }

    for (const car of entranceShaftCars) {
      const phase = Number(car.userData.phase ?? 0);
      const speed = Number(car.userData.speed ?? 0.1);
      const wrapped = (elapsed * Math.abs(speed) + phase) % 1;
      const travel = speed >= 0 ? wrapped : 1 - wrapped;
      car.position.y = 1.5 + travel * 10.5;
    }

    if (shopLiftSignMaterial) {
      const pulse = (Math.sin(elapsed * 3.8) + 1) * 0.5;
      shopLiftSignMaterial.opacity = shopLiftSignPulseBaseOpacity + pulse * 0.18;
    }

    void elapsed;
  }

  return {
    entranceGroup,
    liftGroup,
    shopGroup,
    clickableLiftMeshes: [liftDoorLeft, liftDoorRight],
    clickableShopLiftMeshes,
    clickableLiftControlMeshes,
    updateLiftScreen,
    setLiftMotion,
    setLiftHintActive,
    triggerLiftArrivalGlow,
    getLiftEntranceWoman,
    setLiftEntranceSpeechVisible,
    updateStorefrontSign,
    animate
  };
}
