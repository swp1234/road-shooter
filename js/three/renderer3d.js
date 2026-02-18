// Road Shooter - Three.js 3D Rendering Engine
// Standalone rendering layer: reads game state, maps entities to 3D meshes.
// Requires THREE global (r128 CDN). No ES modules.

class Renderer3D {
  constructor(container) {
    // --- Constants ---
    this.SCALE = 0.05;
    this.SQUAD_Y = CONFIG.CANVAS_HEIGHT * 0.85; // 595
    this.GAME_CX = CONFIG.CANVAS_WIDTH / 2;     // 200
    this.ROAD_LEFT = (CONFIG.CANVAS_WIDTH - CONFIG.CANVAS_WIDTH * CONFIG.ROAD_WIDTH_RATIO) / 2; // 60
    this.ROAD_RIGHT = this.ROAD_LEFT + CONFIG.CANVAS_WIDTH * CONFIG.ROAD_WIDTH_RATIO;           // 340
    this.ROAD_W_3D = (this.ROAD_RIGHT - this.ROAD_LEFT) * this.SCALE; // ~14
    this.ROAD_LEN = 80;

    // --- Renderer ---
    this._renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.setClearColor(0x87CEEB, 1);
    container.appendChild(this._renderer.domElement);

    // --- Scene ---
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87CEEB, 25, 45);

    // --- Camera ---
    const w = container.clientWidth || CONFIG.CANVAS_WIDTH;
    const h = container.clientHeight || CONFIG.CANVAS_HEIGHT;
    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200);
    this.camera.position.set(0, 8, 5);
    this.camera.lookAt(0, 0, -6);

    // --- Lighting ---
    this._setupLights();

    // --- Static environment ---
    this._buildRoad();
    this._buildGround();
    this._buildSky();

    // --- Entity maps ---
    this._charMeshes = new Map();
    this._enemyMeshes = new Map();
    this._bossMesh = null;
    this._bossEntity = null;
    this._itemMeshes = new Map();
    this._gateMeshes = new Map();

    // --- Bullet pool ---
    this._bulletPoolSize = 200;
    this._bulletMeshes = [];
    this._bulletActiveCount = 0;
    this._buildBulletPool();

    // --- Effect meshes ---
    this._shieldMesh = null;
    this._magnetMesh = null;
    this._shockwaveMesh = null;
    this._bossHpBar = null;

    this._buildEffects();

    // --- Animation clock ---
    this._clock = new THREE.Clock();
    this._elapsed = 0;

    // Initial size
    this.resize(w, h);
  }

  get domElement() {
    return this._renderer.domElement;
  }

  // ===================================================================
  //  PUBLIC API
  // ===================================================================

  render(state) {
    const dt = this._clock.getDelta();
    this._elapsed += dt;

    // Sync entities
    this._syncSquad(state.squad, state.buffs);
    this._syncEnemies(state.enemies);
    this._syncBoss(state.boss);
    this._syncItems(state.items);
    this._syncGates(state.gates);
    this._syncBullets(state.bulletPool);
    this._syncEffects(state);

    // Animate road scroll
    if (state.road) {
      this._roadTexture.offset.y = state.road.scrollY * 0.005;
    }

    // Camera shake
    const baseX = 0, baseY = 8, baseZ = 5;
    const sx = (state.shakeX || 0) * this.SCALE * 0.5;
    const sy = (state.shakeY || 0) * this.SCALE * 0.5;
    this.camera.position.set(baseX + sx, baseY + sy, baseZ);

    this._renderer.render(this.scene, this.camera);
  }

  resize(w, h) {
    this._renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    // Remove all entity meshes
    for (const [, m] of this._charMeshes) this.scene.remove(m);
    for (const [, m] of this._enemyMeshes) this.scene.remove(m);
    for (const [, m] of this._itemMeshes) this.scene.remove(m);
    for (const [, m] of this._gateMeshes) this.scene.remove(m);
    if (this._bossMesh) this.scene.remove(this._bossMesh);
    this._charMeshes.clear();
    this._enemyMeshes.clear();
    this._itemMeshes.clear();
    this._gateMeshes.clear();
    this._bossMesh = null;
    this._bossEntity = null;

    this._renderer.dispose();
  }

  // ===================================================================
  //  COORDINATE CONVERSION
  // ===================================================================

  gameToWorld(gx, gy) {
    return {
      x: (gx - this.GAME_CX) * this.SCALE,
      z: (gy - this.SQUAD_Y) * this.SCALE
    };
  }

  // ===================================================================
  //  LIGHTING
  // ===================================================================

  _setupLights() {
    // Directional (sun)
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 20, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(512, 512);
    dir.shadow.camera.left = -20;
    dir.shadow.camera.right = 20;
    dir.shadow.camera.top = 20;
    dir.shadow.camera.bottom = -40;
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 60;
    this.scene.add(dir);

    // Ambient
    this.scene.add(new THREE.AmbientLight(0x8899aa, 0.5));

    // Hemisphere (sky blue / ground green)
    this.scene.add(new THREE.HemisphereLight(0x87CEEB, 0x556633, 0.3));
  }

  // ===================================================================
  //  STATIC ENVIRONMENT
  // ===================================================================

  _buildRoad() {
    // Create a procedural road texture on canvas
    const texW = 256, texH = 512;
    const c = document.createElement('canvas');
    c.width = texW;
    c.height = texH;
    const ctx = c.getContext('2d');

    // Road surface: light gray
    ctx.fillStyle = '#AAB4C0';
    ctx.fillRect(0, 0, texW, texH);

    // Edge lines (solid white)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 6, texH);
    ctx.fillRect(texW - 6, 0, 6, texH);

    // Center dashed line
    const dashLen = 40, gapLen = 30;
    ctx.fillStyle = '#FFFFFF';
    for (let yy = 0; yy < texH; yy += dashLen + gapLen) {
      ctx.fillRect(texW / 2 - 2, yy, 4, dashLen);
    }

    // Lane dashes (quarter markers)
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const frac of [0.25, 0.75]) {
      for (let yy = 0; yy < texH; yy += dashLen + gapLen) {
        ctx.fillRect(texW * frac - 1.5, yy, 3, dashLen * 0.6);
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, this.ROAD_LEN / 10);
    this._roadTexture = tex;

    const roadGeo = new THREE.PlaneGeometry(this.ROAD_W_3D, this.ROAD_LEN);
    const roadMat = new THREE.MeshLambertMaterial({ map: tex });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, -0.01, -this.ROAD_LEN / 2 + 5);
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);
  }

  _buildGround() {
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x88CC88 });
    const gw = 40;
    const gl = this.ROAD_LEN + 20;
    const halfRoad = this.ROAD_W_3D / 2;

    // Left ground (overlap road edge by 0.2 to prevent seam)
    const leftGeo = new THREE.PlaneGeometry(gw, gl);
    const leftMesh = new THREE.Mesh(leftGeo, groundMat);
    leftMesh.rotation.x = -Math.PI / 2;
    leftMesh.position.set(-halfRoad - gw / 2 + 0.2, -0.03, -this.ROAD_LEN / 2 + 5);
    leftMesh.receiveShadow = true;
    this.scene.add(leftMesh);

    // Right ground (overlap road edge by 0.2)
    const rightMesh = new THREE.Mesh(leftGeo, groundMat);
    rightMesh.rotation.x = -Math.PI / 2;
    rightMesh.position.set(halfRoad + gw / 2 - 0.2, -0.03, -this.ROAD_LEN / 2 + 5);
    rightMesh.receiveShadow = true;
    this.scene.add(rightMesh);
  }

  _buildSky() {
    // Large sky dome (half sphere) with gradient
    const skyC = document.createElement('canvas');
    skyC.width = 2;
    skyC.height = 256;
    const skyCtx = skyC.getContext('2d');
    const grad = skyCtx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#E0F0FF');
    grad.addColorStop(0.4, '#87CEEB');
    grad.addColorStop(1, '#5BA3D9');
    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, 2, 256);

    const skyTex = new THREE.CanvasTexture(skyC);
    const skyGeo = new THREE.SphereGeometry(90, 16, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }

  // ===================================================================
  //  BULLET POOL
  // ===================================================================

  _buildBulletPool() {
    const playerMat = new THREE.MeshBasicMaterial({ color: 0x00E5FF });
    const enemyMat = new THREE.MeshBasicMaterial({ color: 0xFF3333 });
    const geo = new THREE.SphereGeometry(0.12, 6, 4);

    for (let i = 0; i < this._bulletPoolSize; i++) {
      const mesh = new THREE.Mesh(geo, playerMat.clone());
      mesh.visible = false;
      mesh.userData = { isEnemy: false, mat: mesh.material };
      this.scene.add(mesh);
      this._bulletMeshes.push(mesh);
    }
    this._enemyBulletMat = enemyMat;
    this._playerBulletMat = playerMat;
  }

  // ===================================================================
  //  EFFECTS
  // ===================================================================

  _buildEffects() {
    // Shield bubble
    const shieldGeo = new THREE.SphereGeometry(2.5, 16, 12);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x60A5FA,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    this._shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this._shieldMesh.visible = false;
    this.scene.add(this._shieldMesh);

    // Magnet ring
    const magnetGeo = new THREE.RingGeometry(2.5, 3.0, 24);
    const magnetMat = new THREE.MeshBasicMaterial({
      color: 0xA855F7,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    this._magnetMesh = new THREE.Mesh(magnetGeo, magnetMat);
    this._magnetMesh.rotation.x = -Math.PI / 2;
    this._magnetMesh.visible = false;
    this.scene.add(this._magnetMesh);

    // Boss shockwave ring
    const shockGeo = new THREE.RingGeometry(0.5, 0.8, 32);
    const shockMat = new THREE.MeshBasicMaterial({
      color: 0xFF4444,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    this._shockwaveMesh = new THREE.Mesh(shockGeo, shockMat);
    this._shockwaveMesh.rotation.x = -Math.PI / 2;
    this._shockwaveMesh.visible = false;
    this.scene.add(this._shockwaveMesh);

    // Boss HP bar: a thin plane floating above
    const hpGeo = new THREE.PlaneGeometry(4, 0.3);
    const hpMat = new THREE.MeshBasicMaterial({ color: 0xFF3333, side: THREE.DoubleSide });
    this._bossHpBar = new THREE.Mesh(hpGeo, hpMat);
    this._bossHpBar.visible = false;
    this.scene.add(this._bossHpBar);

    // Boss HP bar background
    const hpBgGeo = new THREE.PlaneGeometry(4.1, 0.35);
    const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
    this._bossHpBg = new THREE.Mesh(hpBgGeo, hpBgMat);
    this._bossHpBg.visible = false;
    this.scene.add(this._bossHpBg);
  }

  // ===================================================================
  //  MESH FACTORIES
  // ===================================================================

  _createCharMesh(char) {
    const group = new THREE.Group();
    const type = char.type;

    // Color mapping
    const colors = {
      rifleman: 0x22CC66,
      tanker:   0x4488FF,
      sniper:   0xAA66FF,
      bomber:   0xFF8833
    };
    const color = colors[type] || 0x22CC66;
    const mat = new THREE.MeshLambertMaterial({ color });

    // Body dimensions
    const bodyR = type === 'tanker' ? 0.28 : 0.2;
    const bodyRBot = type === 'tanker' ? 0.25 : 0.18;
    const bodyH = 0.7;

    // Body
    const bodyGeo = new THREE.CylinderGeometry(bodyR, bodyRBot, bodyH, 8);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = bodyH / 2;
    body.castShadow = true;
    group.add(body);

    // Head
    const headR = 0.18;
    const headGeo = new THREE.SphereGeometry(headR, 8, 6);
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xE8C49A });
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = bodyH + headR * 0.8;
    head.castShadow = true;
    group.add(head);

    // Helmet (same color as body, slightly larger)
    const helmGeo = new THREE.SphereGeometry(headR * 1.15, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    const helmMat = new THREE.MeshLambertMaterial({ color });
    const helm = new THREE.Mesh(helmGeo, helmMat);
    helm.position.y = bodyH + headR * 0.85;
    helm.castShadow = true;
    group.add(helm);

    // Weapon: thin barrel
    const barrelGeo = new THREE.BoxGeometry(0.04, 0.04, 0.5);
    const gunMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const barrel = new THREE.Mesh(barrelGeo, gunMat);
    barrel.position.set(bodyR + 0.05, bodyH * 0.6, -0.15);
    group.add(barrel);

    // Tanker gets a shield disc in front
    if (type === 'tanker') {
      const shieldGeo = new THREE.BoxGeometry(0.5, 0.55, 0.04);
      const shieldMat = new THREE.MeshLambertMaterial({
        color: 0x60A5FA,
        transparent: true,
        opacity: 0.5
      });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.set(0, bodyH * 0.5, -bodyR - 0.08);
      group.add(shield);
    }

    // Sniper gets a longer barrel
    if (type === 'sniper') {
      barrel.scale.z = 1.8;
      barrel.position.z = -0.3;
      // Scope
      const scopeGeo = new THREE.SphereGeometry(0.04, 6, 4);
      const scopeMat = new THREE.MeshLambertMaterial({ color: 0xAA66FF });
      const scope = new THREE.Mesh(scopeGeo, scopeMat);
      scope.position.set(bodyR + 0.05, bodyH * 0.65, -0.4);
      group.add(scope);
    }

    // Bomber gets a wider barrel (grenade launcher)
    if (type === 'bomber') {
      barrel.scale.set(2, 2, 0.8);
      barrel.position.z = -0.1;
      // Warning stripe as colored ring
      const ringGeo = new THREE.RingGeometry(bodyR - 0.02, bodyR + 0.02, 8);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xFBBF24, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = bodyH * 0.3;
      group.add(ring);
    }

    group.userData = {
      baseY: 0,
      type: type,
      animOffset: Math.random() * Math.PI * 2
    };

    return group;
  }

  _createEnemyMesh(enemy) {
    const group = new THREE.Group();
    const type = enemy.type;

    // Color mapping
    const colors = {
      rusher:    0xFF3333,
      shooter:   0xFF6633,
      mortar:    0xCC4400,
      detonator: 0xFF0000,
      thief:     0x333333,
      flanker:   0x991111,
      elite:     0x8844FF
    };
    const color = colors[type] || 0xFF3333;
    const mat = new THREE.MeshLambertMaterial({ color });

    // Size factor from config
    const sizeFactor = (enemy.size || 14) * 0.07;

    // Body
    const bodyR = 0.2;
    const bodyH = 0.65;
    const bodyGeo = new THREE.CylinderGeometry(bodyR, bodyR * 0.9, bodyH, 8);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = bodyH / 2;
    body.castShadow = true;
    group.add(body);

    // Head
    const headR = 0.16;
    const headGeo = new THREE.SphereGeometry(headR, 8, 6);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xCC8866 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = bodyH + headR * 0.6;
    head.castShadow = true;
    group.add(head);

    // Type-specific decoration
    switch (type) {
      case 'rusher':
        // Lean forward
        group.rotation.x = 0.2;
        break;

      case 'shooter': {
        // Cube turret on top
        const turretGeo = new THREE.BoxGeometry(0.18, 0.12, 0.18);
        const turretMat = new THREE.MeshLambertMaterial({ color: 0x884422 });
        const turret = new THREE.Mesh(turretGeo, turretMat);
        turret.position.y = bodyH + headR * 2 + 0.06;
        group.add(turret);
        break;
      }

      case 'mortar': {
        // Wider body
        body.scale.set(1.3, 1, 1.3);
        // Mortar tube
        const tubeGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.4, 6);
        const tubeMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.position.set(0, bodyH + 0.15, -0.15);
        tube.rotation.x = -0.5;
        group.add(tube);
        break;
      }

      case 'detonator': {
        // Smaller body
        body.scale.setScalar(0.8);
        head.scale.setScalar(0.85);
        // Blinking sphere on top
        const bombGeo = new THREE.SphereGeometry(0.12, 8, 6);
        const bombMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        const bomb = new THREE.Mesh(bombGeo, bombMat);
        bomb.position.y = bodyH + headR * 2 + 0.1;
        bomb.userData.isBlinker = true;
        group.add(bomb);
        break;
      }

      case 'thief': {
        // Slim body
        body.scale.set(0.8, 1.1, 0.8);
        break;
      }

      case 'flanker': {
        // Small propeller disc on top
        const discGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.03, 8);
        const discMat = new THREE.MeshLambertMaterial({ color: 0xBB3333 });
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.position.y = bodyH + headR * 2 + 0.08;
        disc.userData.isPropeller = true;
        group.add(disc);
        break;
      }

      case 'elite': {
        // Much larger, purple, with shield disc in front
        const eliteScale = 2.0;
        body.scale.setScalar(eliteScale);
        body.position.y = bodyH * eliteScale / 2;
        head.scale.setScalar(eliteScale);
        head.position.y = bodyH * eliteScale + headR * eliteScale * 0.6;
        // Shield disc
        const shieldGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.05, 12);
        const shieldMat = new THREE.MeshLambertMaterial({
          color: 0xAA88FF,
          transparent: true,
          opacity: 0.6
        });
        const shield = new THREE.Mesh(shieldGeo, shieldMat);
        shield.rotation.x = Math.PI / 2;
        shield.position.set(0, bodyH * eliteScale * 0.5, -0.5 * eliteScale);
        shield.userData.isShield = true;
        group.add(shield);
        break;
      }
    }

    // Apply size scaling
    group.scale.setScalar(sizeFactor);

    // Enemies face toward squad (+z direction)
    group.rotation.y = Math.PI;

    group.userData = {
      baseY: 0,
      type: type,
      animOffset: Math.random() * Math.PI * 2,
      sizeFactor: sizeFactor
    };

    return group;
  }

  _createBossMesh(boss) {
    const group = new THREE.Group();
    const type = boss.type;
    const bossScale = (boss.size || 40) * 0.05; // ~2x character scale

    switch (type) {
      case 'zombieTitan': {
        // Red/brown, boxy body, thick arms
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0xAA3322 });

        // Boxy body
        const bodyGeo = new THREE.BoxGeometry(1.2, 1.8, 0.9);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.2;
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.7, 0.6, 0.6);
        const headMat = new THREE.MeshLambertMaterial({ color: 0x884433 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2.4;
        head.castShadow = true;
        group.add(head);

        // Eyes (glowing red)
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        const eyeGeo = new THREE.SphereGeometry(0.08, 6, 4);
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.15, 2.45, -0.3);
        group.add(eyeL);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.15, 2.45, -0.3);
        group.add(eyeR);

        // Left arm
        const armGeo = new THREE.BoxGeometry(0.4, 1.2, 0.35);
        const armL = new THREE.Mesh(armGeo, bodyMat);
        armL.position.set(-0.85, 1.3, 0);
        armL.castShadow = true;
        group.add(armL);

        // Right arm
        const armR = new THREE.Mesh(armGeo, bodyMat);
        armR.position.set(0.85, 1.3, 0);
        armR.castShadow = true;
        group.add(armR);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.35, 0.8, 0.35);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x663322 });
        const legL = new THREE.Mesh(legGeo, legMat);
        legL.position.set(-0.3, 0.4, 0);
        group.add(legL);
        const legR = new THREE.Mesh(legGeo, legMat);
        legR.position.set(0.3, 0.4, 0);
        group.add(legR);

        break;
      }

      case 'warMachine': {
        // Gray/steel, rectangular body, cylinder turrets
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x778899 });

        // Rectangular body (tank-like)
        const bodyGeo = new THREE.BoxGeometry(1.6, 1.2, 1.2);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.9;
        body.castShadow = true;
        group.add(body);

        // Upper turret housing
        const upperGeo = new THREE.BoxGeometry(1.0, 0.6, 0.8);
        const upper = new THREE.Mesh(upperGeo, bodyMat);
        upper.position.y = 1.8;
        upper.castShadow = true;
        group.add(upper);

        // Viewport (dark slit)
        const viewGeo = new THREE.BoxGeometry(0.6, 0.1, 0.05);
        const viewMat = new THREE.MeshBasicMaterial({ color: 0x223344 });
        const viewport = new THREE.Mesh(viewGeo, viewMat);
        viewport.position.set(0, 1.85, -0.42);
        group.add(viewport);

        // Left turret cylinder
        const turretGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8);
        const turretMat = new THREE.MeshLambertMaterial({ color: 0x556677 });
        const turretL = new THREE.Mesh(turretGeo, turretMat);
        turretL.rotation.x = Math.PI / 2;
        turretL.position.set(-0.55, 1.8, -0.7);
        group.add(turretL);

        // Right turret cylinder
        const turretR = new THREE.Mesh(turretGeo, turretMat);
        turretR.rotation.x = Math.PI / 2;
        turretR.position.set(0.55, 1.8, -0.7);
        group.add(turretR);

        // Treads (boxes on sides)
        const treadGeo = new THREE.BoxGeometry(0.2, 0.5, 1.4);
        const treadMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const treadL = new THREE.Mesh(treadGeo, treadMat);
        treadL.position.set(-0.9, 0.3, 0);
        group.add(treadL);
        const treadR = new THREE.Mesh(treadGeo, treadMat);
        treadR.position.set(0.9, 0.3, 0);
        group.add(treadR);

        break;
      }

      case 'stormColossus': {
        // Purple/electric, sphere body, lightning effects
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x7C3AED });

        // Sphere body
        const bodyGeo = new THREE.SphereGeometry(0.9, 12, 10);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.4;
        body.castShadow = true;
        group.add(body);

        // Inner glow sphere
        const glowGeo = new THREE.SphereGeometry(0.5, 10, 8);
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0xBB88FF,
          transparent: true,
          opacity: 0.4
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.y = 1.4;
        glow.userData.isGlow = true;
        group.add(glow);

        // Crown / top spire
        const spireGeo = new THREE.ConeGeometry(0.2, 0.6, 6);
        const spireMat = new THREE.MeshLambertMaterial({ color: 0x9955FF });
        const spire = new THREE.Mesh(spireGeo, spireMat);
        spire.position.y = 2.5;
        group.add(spire);

        // Floating ring (electric aura)
        const ringGeo = new THREE.TorusGeometry(1.1, 0.06, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xAA77FF,
          transparent: true,
          opacity: 0.5
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 1.4;
        ring.rotation.x = Math.PI / 2;
        ring.userData.isAura = true;
        group.add(ring);

        // Legs (energy pillars)
        const legGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.8, 6);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x5522AA });
        const legL = new THREE.Mesh(legGeo, legMat);
        legL.position.set(-0.35, 0.4, 0);
        group.add(legL);
        const legR = new THREE.Mesh(legGeo, legMat);
        legR.position.set(0.35, 0.4, 0);
        group.add(legR);

        break;
      }
    }

    group.scale.setScalar(bossScale);

    // Boss faces toward squad (+z direction)
    group.rotation.y = Math.PI;

    group.userData = {
      baseY: 0,
      type: type,
      animOffset: 0,
      bossScale: bossScale
    };

    return group;
  }

  _createItemMesh(item) {
    const group = new THREE.Group();
    const cfg = CONFIG.ITEMS[item.type];
    if (!cfg) return group;

    const color = new THREE.Color(cfg.color);
    const mat = new THREE.MeshLambertMaterial({ color });

    let mesh;
    if (cfg.isBuff) {
      // Power-ups: diamond / octahedron
      const geo = new THREE.IcosahedronGeometry(0.15, 0);
      mesh = new THREE.Mesh(geo, mat);
    } else {
      // Squad growth items: cubes or spheres based on type
      if (item.type === 'scoutToken' || item.type === 'mercenary') {
        const geo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
        mesh = new THREE.Mesh(geo, mat);
      } else if (item.type === 'clonePod') {
        const geo = new THREE.SphereGeometry(0.12, 8, 6);
        mesh = new THREE.Mesh(geo, mat);
      } else {
        // rallyFlag, conscription, etc.
        const geo = new THREE.IcosahedronGeometry(0.12, 0);
        mesh = new THREE.Mesh(geo, mat);
      }
    }

    mesh.castShadow = true;
    group.add(mesh);

    // Glow aura
    const auraMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15
    });
    const auraGeo = new THREE.SphereGeometry(0.22, 8, 6);
    const aura = new THREE.Mesh(auraGeo, auraMat);
    group.add(aura);

    group.userData = {
      baseY: 0.3,
      animOffset: Math.random() * Math.PI * 2
    };

    return group;
  }

  _createGateMesh(gate) {
    const group = new THREE.Group();

    // Gate dimensions in 3D
    const gateH = 2.2;
    const columnR = 0.15;
    const leftColor = new THREE.Color(gate.left.color);
    const rightColor = new THREE.Color(gate.right.color);

    // Calculate 3D positions for left and right edges of the road
    const leftEdge3D = (this.ROAD_LEFT - this.GAME_CX) * this.SCALE;
    const rightEdge3D = (this.ROAD_RIGHT - this.GAME_CX) * this.SCALE;
    const midX3D = 0; // center of road
    const halfWidth = (rightEdge3D - leftEdge3D) / 2;

    // --- Left half ---
    // Left column
    const colGeo = new THREE.CylinderGeometry(columnR, columnR, gateH, 8);
    const leftMat = new THREE.MeshLambertMaterial({ color: leftColor });
    const colL1 = new THREE.Mesh(colGeo, leftMat);
    colL1.position.set(leftEdge3D, gateH / 2, 0);
    colL1.castShadow = true;
    group.add(colL1);

    // Center column (shared border)
    const colCenter = new THREE.Mesh(colGeo, new THREE.MeshLambertMaterial({ color: 0xDDDDDD }));
    colCenter.position.set(midX3D, gateH / 2, 0);
    colCenter.castShadow = true;
    group.add(colCenter);

    // Right column
    const rightMat = new THREE.MeshLambertMaterial({ color: rightColor });
    const colR1 = new THREE.Mesh(colGeo, rightMat);
    colR1.position.set(rightEdge3D, gateH / 2, 0);
    colR1.castShadow = true;
    group.add(colR1);

    // Top beams
    const beamGeo = new THREE.BoxGeometry(halfWidth - columnR * 2, 0.15, 0.15);

    const beamL = new THREE.Mesh(beamGeo, leftMat);
    beamL.position.set(leftEdge3D / 2, gateH - 0.1, 0);
    group.add(beamL);

    const beamR = new THREE.Mesh(beamGeo, rightMat);
    beamR.position.set(rightEdge3D / 2, gateH - 0.1, 0);
    group.add(beamR);

    // Translucent panels
    const panelGeo = new THREE.PlaneGeometry(halfWidth - columnR * 2, gateH - 0.3);

    const leftPanelMat = new THREE.MeshBasicMaterial({
      color: leftColor,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const leftPanel = new THREE.Mesh(panelGeo, leftPanelMat);
    leftPanel.position.set(leftEdge3D / 2, gateH / 2, 0);
    group.add(leftPanel);

    const rightPanelMat = new THREE.MeshBasicMaterial({
      color: rightColor,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const rightPanel = new THREE.Mesh(panelGeo, rightPanelMat);
    rightPanel.position.set(rightEdge3D / 2, gateH / 2, 0);
    group.add(rightPanel);

    // Text labels (Sprite with CanvasTexture)
    const leftSprite = this._createTextSprite(gate.left.label, gate.left.color);
    leftSprite.position.set(leftEdge3D / 2, gateH / 2 + 0.2, -0.15);
    leftSprite.scale.set(3.2, 1.6, 1);
    group.add(leftSprite);

    const rightSprite = this._createTextSprite(gate.right.label, gate.right.color);
    rightSprite.position.set(rightEdge3D / 2, gateH / 2 + 0.2, -0.15);
    rightSprite.scale.set(3.2, 1.6, 1);
    group.add(rightSprite);

    group.userData = { baseY: 0 };

    return group;
  }

  _createTextSprite(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Background with slight tint
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(8, 8, 240, 112, 16);
    } else {
      ctx.rect(8, 8, 240, 112);
    }
    ctx.fill();

    // Text
    ctx.fillStyle = color || '#FFFFFF';
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false
    });
    return new THREE.Sprite(spriteMat);
  }

  // ===================================================================
  //  ENTITY SYNC
  // ===================================================================

  _syncSquad(squad, buffs) {
    if (!squad) return;
    const alive = squad.alive || [];
    const seen = new Set();

    for (let i = 0; i < alive.length; i++) {
      const char = alive[i];
      if (!char.active) continue;
      seen.add(char);

      let mesh = this._charMeshes.get(char);
      if (!mesh) {
        mesh = this._createCharMesh(char);
        this._charMeshes.set(char, mesh);
        this.scene.add(mesh);
      }

      // Position
      const pos = this.gameToWorld(char.x, char.y);
      mesh.position.x = pos.x;
      mesh.position.z = pos.z;

      // Running bounce animation
      const bounceT = this._elapsed * 8 + (mesh.userData.animOffset || 0);
      mesh.position.y = Math.abs(Math.sin(bounceT)) * 0.08;

      // Visibility and death scale
      if (char.dying) {
        const t = Math.max(0.01, char.deathTimer / 0.2);
        mesh.scale.setScalar(t);
        mesh.visible = t > 0.01;
      } else {
        mesh.scale.setScalar(1);
        mesh.visible = true;
      }

      // Flash on damage (turn mesh white briefly)
      if (char.flashTimer > 0) {
        mesh.traverse(child => {
          if (child.isMesh && child.material && !child.material._origColor) {
            child.material._origColor = child.material.color.getHex();
            child.material.color.setHex(0xFFFFFF);
          }
        });
      } else {
        mesh.traverse(child => {
          if (child.isMesh && child.material && child.material._origColor !== undefined) {
            child.material.color.setHex(child.material._origColor);
            delete child.material._origColor;
          }
        });
      }
    }

    // Remove stale
    for (const [entity, mesh] of this._charMeshes) {
      if (!seen.has(entity)) {
        this.scene.remove(mesh);
        this._charMeshes.delete(entity);
      }
    }
  }

  _syncEnemies(enemies) {
    if (!enemies) return;
    const seen = new Set();

    for (const enemy of enemies) {
      if (!enemy.active) continue;
      seen.add(enemy);

      let mesh = this._enemyMeshes.get(enemy);
      if (!mesh) {
        mesh = this._createEnemyMesh(enemy);
        this._enemyMeshes.set(enemy, mesh);
        this.scene.add(mesh);
      }

      // Position
      const pos = this.gameToWorld(enemy.x, enemy.y);
      mesh.position.x = pos.x;
      mesh.position.z = pos.z;

      // Bounce animation
      const bounceT = this._elapsed * 6 + (mesh.userData.animOffset || 0);
      mesh.position.y = Math.abs(Math.sin(bounceT)) * 0.04;

      // Dying
      if (enemy.dying) {
        const t = Math.max(0.01, enemy.deathTimer / 0.2);
        mesh.scale.setScalar(mesh.userData.sizeFactor * t);
        mesh.visible = t > 0.01;
      } else {
        mesh.scale.setScalar(mesh.userData.sizeFactor);
        mesh.visible = true;
      }

      // Flash on damage
      if (enemy.flashTimer > 0) {
        mesh.traverse(child => {
          if (child.isMesh && child.material && !child.material._origColor) {
            child.material._origColor = child.material.color.getHex();
            child.material.color.setHex(0xFFFFFF);
          }
        });
      } else {
        mesh.traverse(child => {
          if (child.isMesh && child.material && child.material._origColor !== undefined) {
            child.material.color.setHex(child.material._origColor);
            delete child.material._origColor;
          }
        });
      }

      // Animate detonator blinker
      if (enemy.type === 'detonator') {
        mesh.traverse(child => {
          if (child.userData && child.userData.isBlinker) {
            const blink = Math.sin(this._elapsed * 12) > 0;
            child.material.color.setHex(blink ? 0xFF0000 : 0xFF8800);
          }
        });
      }

      // Animate flanker propeller
      if (enemy.type === 'flanker') {
        mesh.traverse(child => {
          if (child.userData && child.userData.isPropeller) {
            child.rotation.y = this._elapsed * 15;
          }
        });
      }

      // Elite shield visibility
      if (enemy.type === 'elite') {
        mesh.traverse(child => {
          if (child.userData && child.userData.isShield) {
            child.visible = enemy.shieldActive;
            if (enemy.shieldActive && enemy.shieldMaxHp > 0) {
              child.material.opacity = 0.2 + 0.4 * (enemy.shieldHp / enemy.shieldMaxHp);
            }
          }
        });
      }
    }

    // Remove stale
    for (const [entity, mesh] of this._enemyMeshes) {
      if (!seen.has(entity)) {
        this.scene.remove(mesh);
        this._enemyMeshes.delete(entity);
      }
    }
  }

  _syncBoss(boss) {
    if (!boss || !boss.active) {
      if (this._bossMesh) {
        this.scene.remove(this._bossMesh);
        this._bossMesh = null;
        this._bossEntity = null;
      }
      if (this._bossHpBar) this._bossHpBar.visible = false;
      if (this._bossHpBg) this._bossHpBg.visible = false;
      return;
    }

    // Create mesh if needed or boss type changed
    if (!this._bossMesh || this._bossEntity !== boss) {
      if (this._bossMesh) this.scene.remove(this._bossMesh);
      this._bossMesh = this._createBossMesh(boss);
      this._bossEntity = boss;
      this.scene.add(this._bossMesh);
    }

    const mesh = this._bossMesh;
    const pos = this.gameToWorld(boss.x, boss.y);
    mesh.position.x = pos.x;
    mesh.position.z = pos.z;

    // Idle sway
    mesh.position.y = Math.sin(this._elapsed * 2) * 0.1;

    // Dying
    if (boss.dying) {
      const t = Math.max(0.01, boss.deathTimer / 0.2);
      mesh.scale.setScalar(mesh.userData.bossScale * t);
      mesh.visible = t > 0.01;
      this._bossHpBar.visible = false;
      this._bossHpBg.visible = false;
    } else {
      mesh.scale.setScalar(mesh.userData.bossScale);
      mesh.visible = true;

      // HP bar
      const hpPct = boss.hp / boss.maxHp;
      this._bossHpBar.visible = true;
      this._bossHpBg.visible = true;

      const hpBarY = mesh.position.y + mesh.userData.bossScale * 3.5;
      this._bossHpBg.position.set(pos.x, hpBarY, pos.z);
      this._bossHpBg.lookAt(this.camera.position);

      this._bossHpBar.position.set(pos.x - (1 - hpPct) * 2, hpBarY, pos.z);
      this._bossHpBar.scale.x = Math.max(0.01, hpPct);
      this._bossHpBar.lookAt(this.camera.position);

      // Color based on hp
      if (hpPct > 0.5) {
        this._bossHpBar.material.color.setHex(0x22CC66);
      } else if (hpPct > 0.25) {
        this._bossHpBar.material.color.setHex(0xFBBF24);
      } else {
        this._bossHpBar.material.color.setHex(0xFF3333);
      }
    }

    // Flash on damage
    if (boss.flashTimer > 0) {
      mesh.traverse(child => {
        if (child.isMesh && child.material && !child.material._origColor) {
          child.material._origColor = child.material.color.getHex();
          child.material.color.setHex(0xFFFFFF);
        }
      });
    } else {
      mesh.traverse(child => {
        if (child.isMesh && child.material && child.material._origColor !== undefined) {
          child.material.color.setHex(child.material._origColor);
          delete child.material._origColor;
        }
      });
    }

    // Storm Colossus glow pulse
    if (boss.type === 'stormColossus') {
      mesh.traverse(child => {
        if (child.userData && child.userData.isGlow) {
          child.material.opacity = 0.2 + 0.2 * Math.sin(this._elapsed * 4);
          child.scale.setScalar(1 + 0.1 * Math.sin(this._elapsed * 3));
        }
        if (child.userData && child.userData.isAura) {
          child.rotation.z = this._elapsed * 1.5;
        }
      });
    }

    // Shockwave
    if (boss.shockwaveActive && boss.shockwaveRadius > 0) {
      this._shockwaveMesh.visible = true;
      this._shockwaveMesh.position.set(pos.x, 0.1, pos.z);
      const r3d = boss.shockwaveRadius * this.SCALE;
      this._shockwaveMesh.scale.setScalar(r3d);
      this._shockwaveMesh.material.opacity = Math.max(0, 0.5 - r3d * 0.05);
    } else {
      this._shockwaveMesh.visible = false;
    }
  }

  _syncItems(items) {
    if (!items) return;
    const seen = new Set();

    for (const item of items) {
      if (!item.active) continue;
      seen.add(item);

      let mesh = this._itemMeshes.get(item);
      if (!mesh) {
        mesh = this._createItemMesh(item);
        this._itemMeshes.set(item, mesh);
        this.scene.add(mesh);
      }

      // Position
      const pos = this.gameToWorld(item.x, item.y);
      mesh.position.x = pos.x;
      mesh.position.z = pos.z;

      // Floating bob
      const bobT = this._elapsed * 3 + (mesh.userData.animOffset || 0);
      mesh.position.y = (mesh.userData.baseY || 0.6) + Math.sin(bobT) * 0.15;

      // Spin on Y
      mesh.rotation.y = this._elapsed * 2 + (mesh.userData.animOffset || 0);

      // Collected: shrink and fade
      if (item.collected) {
        const t = Math.max(0.01, item.collectTimer / 0.3);
        mesh.scale.setScalar(t);
        mesh.visible = t > 0.01;
      } else {
        mesh.scale.setScalar(1);
        mesh.visible = true;
      }
    }

    // Remove stale
    for (const [entity, mesh] of this._itemMeshes) {
      if (!seen.has(entity)) {
        this.scene.remove(mesh);
        this._itemMeshes.delete(entity);
      }
    }
  }

  _syncGates(gates) {
    if (!gates) return;
    const seen = new Set();

    for (const gate of gates) {
      if (!gate.active) continue;
      seen.add(gate);

      let mesh = this._gateMeshes.get(gate);
      if (!mesh) {
        mesh = this._createGateMesh(gate);
        this._gateMeshes.set(gate, mesh);
        this.scene.add(mesh);
      }

      // Position: use gate.y mapped to 3D z
      const pos = this.gameToWorld(this.GAME_CX, gate.y);
      mesh.position.x = 0; // centered on road
      mesh.position.z = pos.z;
      mesh.position.y = 0;

      // Chosen: fade out
      if (gate.chosen) {
        const t = Math.max(0.01, gate.chosenTimer / 0.5);
        mesh.scale.y = t;
        mesh.visible = t > 0.01;
        mesh.traverse(child => {
          if (child.isMesh && child.material && child.material.transparent) {
            child.material.opacity = child.material._baseOpacity
              ? child.material._baseOpacity * t
              : 0.25 * t;
          }
        });
      } else {
        mesh.scale.y = 1;
        mesh.visible = true;
        // Subtle pulse on panels
        const pulse = 0.2 + 0.08 * Math.sin(this._elapsed * 3);
        mesh.traverse(child => {
          if (child.isMesh && child.material && child.material.transparent && !child.material._baseOpacity) {
            child.material._baseOpacity = child.material.opacity;
          }
          if (child.isMesh && child.material && child.material._baseOpacity) {
            child.material.opacity = child.material._baseOpacity + 0.05 * Math.sin(this._elapsed * 3);
          }
        });
      }
    }

    // Remove stale
    for (const [entity, mesh] of this._gateMeshes) {
      if (!seen.has(entity)) {
        this.scene.remove(mesh);
        this._gateMeshes.delete(entity);
      }
    }
  }

  _syncBullets(bulletPool) {
    if (!bulletPool) {
      // Hide all
      for (let i = 0; i < this._bulletPoolSize; i++) {
        this._bulletMeshes[i].visible = false;
      }
      return;
    }

    const activeBullets = bulletPool.active || [];
    const count = Math.min(activeBullets.length, this._bulletPoolSize);

    for (let i = 0; i < count; i++) {
      const b = activeBullets[i];
      const mesh = this._bulletMeshes[i];

      if (!b.active) {
        mesh.visible = false;
        continue;
      }

      mesh.visible = true;
      const pos = this.gameToWorld(b.x, b.y);
      mesh.position.set(pos.x, 0.4, pos.z);

      // Color based on isEnemy
      if (b.isEnemy && mesh.userData.isEnemy !== true) {
        mesh.material.color.setHex(0xFF3333);
        mesh.userData.isEnemy = true;
      } else if (!b.isEnemy && mesh.userData.isEnemy !== false) {
        mesh.material.color.setHex(0x00E5FF);
        mesh.userData.isEnemy = false;
      }
    }

    // Hide remaining
    for (let i = count; i < this._bulletPoolSize; i++) {
      this._bulletMeshes[i].visible = false;
    }
  }

  // ===================================================================
  //  EFFECTS SYNC
  // ===================================================================

  _syncEffects(state) {
    const buffs = state.buffs || {};
    const squad = state.squad;

    // Shield bubble around squad
    if (buffs.shield > 0 && squad) {
      this._shieldMesh.visible = true;
      const pos = this.gameToWorld(squad.x, squad.y);
      this._shieldMesh.position.set(pos.x, 1.2, pos.z);
      // Pulse
      const scale = 1 + 0.05 * Math.sin(this._elapsed * 4);
      this._shieldMesh.scale.setScalar(scale);
      this._shieldMesh.material.opacity = 0.1 + 0.05 * Math.sin(this._elapsed * 6);
    } else {
      this._shieldMesh.visible = false;
    }

    // Magnet ring around squad
    if (buffs.magnet > 0 && squad) {
      this._magnetMesh.visible = true;
      const pos = this.gameToWorld(squad.x, squad.y);
      this._magnetMesh.position.set(pos.x, 0.1, pos.z);
      this._magnetMesh.rotation.z = this._elapsed * 2;
      const magnetScale = 1 + 0.1 * Math.sin(this._elapsed * 3);
      this._magnetMesh.scale.setScalar(magnetScale);
    } else {
      this._magnetMesh.visible = false;
    }
  }
}
