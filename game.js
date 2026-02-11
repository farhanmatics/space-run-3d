/**
 * SPACE RUNNER 3D - GAME ENGINE
 * Uses Three.js for rendering
 */

// --- AUDIO SYSTEM ---
const SFX = {
    ctx: null,
    bgMusic: null,
    init: function() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
    },
    playMusic: function() {
        if (this.bgMusic) return;
        // Reuse the existing soundtrack file from the source runner.
        this.bgMusic = new Audio('audio.mp3');
        this.bgMusic.loop = true;
        this.bgMusic.volume = 0.2;
        this.bgMusic.play().catch(e => console.log("Music wait for interaction"));
    },
    play: function(type) {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        const now = this.ctx.currentTime;

        if (type === 'jump') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'coin') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(900, now);
            osc.frequency.exponentialRampToValueAtTime(1600, now + 0.1);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'jetpack') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.linearRampToValueAtTime(400, now + 1.5);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 1.5);
            osc.start(now); osc.stop(now + 1.5);
        } else if (type === 'crash') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        } else if (type === 'roll') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.15);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.15);
            osc.start(now); osc.stop(now + 0.15);
        } else if (type === 'powerup') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        } else if (type === 'hover_start') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(600, now + 0.4);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.4);
            osc.start(now); osc.stop(now + 0.4);
        } else if (type === 'mystery') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.5);
            osc.start(now); osc.stop(now + 0.5);
        }
    },
    stopAll: function() {
        if (this.bgMusic) {
            this.bgMusic.pause();
            this.bgMusic = null;
        }
    }
};

// --- CONFIGURATION ---
const CONFIG = {
    laneWidth: 3.5,     // Keep exact lane spacing for same controls
    pathWidth: 12,
    playerSpeed: 35,    // Base speed
    maxSpeed: 59,       // Max speed
    acceleration: 0.01, // Speed multiplier increase per second
    jumpForce: 18,
    gravity: -45,
    laneSwitchSpeed: 15,
    jetpackDuration: 6, // Seconds
    jetpackHeight: 8,
    magnetDuration: 10,
    magnetRange: 15,
    superSneakersDuration: 12,
    jumpForceSuper: 28, // Higher jump to clear large obstacles
    hoverboardDuration: 30,
    cruiserHeight: 4,
    colors: {
        skyTop: 0x020612,
        skyBottom: 0x000000,
        ground: 0x060a14,
        rails: 0x1a2c4a,
        fog: 0x060a14,
        building: [0x121a2b, 0x17243a, 0x101522, 0x1f2a44],
        buildingDay: [0x364f7a, 0x4a6899, 0x2a3f66, 0x1d2f4f, 0x5d79ab]
    }
};

// --- GLOBAL VARIABLES ---
let scene, camera, renderer;
let player;
let worldChunkManager;
let gameActive = false;
let score = 0;
let coins = 0; // Coins collected in current run
let totalCoins = 0; // Total bank balance
let highScore = 0;
let speedMultiplier = 1.0;
let clock = new THREE.Clock();
let frameId;
let selectedCharColor = 0xff4757;
let upgrades = { magnet: 1, jetpack: 1, sneakers: 1 };
let inventory = { headstart: 0 };

// Assets
const materials = {};
const geometries = {};

// --- INIT ---
window.addEventListener('load', init);

function init() {
    setupCharacterSelection();
    loadSaveData();
    document.getElementById('loading').style.display = 'none';
    setupThreeJS();
    createAssets();
    createPlayer();
    setupInputs();
    
    // Loop for idle animation in menu
    animate();

    document.getElementById('start-btn').addEventListener('click', () => {
        SFX.init(); // Ensure audio context starts on click
        SFX.playMusic();
        startGame();
    });
    document.getElementById('restart-btn').addEventListener('click', resetGame);
    
    document.getElementById('shop-btn').addEventListener('click', openShop);
    document.getElementById('shop-close-btn').addEventListener('click', closeShop);
    document.getElementById('headstart-btn').addEventListener('click', activateHeadstart);
}

function setupCharacterSelection() {
    const colors = [0xff4757, 0x2ecc71, 0x3498db, 0x9b59b6, 0xf1c40f, 0x34495e]; // Red, Green, Blue, Purple, Yellow, Dark Blue
    const container = document.getElementById('char-select-container');
    
    let saved = null;
    try { saved = localStorage.getItem('spaceRunCharColor'); } catch(e) {}
    if (saved) selectedCharColor = parseInt(saved);

    colors.forEach(col => {
        const btn = document.createElement('div');
        btn.className = 'char-btn';
        btn.style.backgroundColor = '#' + col.toString(16).padStart(6, '0');
        if (col === selectedCharColor) btn.classList.add('selected');
        
        btn.onclick = () => {
            selectedCharColor = col;
            try { localStorage.setItem('spaceRunCharColor', col); } catch(e) {}
            
            document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            
            if (materials.player) {
                materials.player.color.setHex(col);
            }
        };
        container.appendChild(btn);
    });
}

function setupThreeJS() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040814);
    scene.fog = new THREE.FogExp2(0x08101e, 0.008); 

    // Camera (Perspective)
    // Use min horizontal FOV so character isn't cut off on mobile portrait (narrow aspect)
    const aspect = window.innerWidth / window.innerHeight;
    const MIN_HORIZONTAL_FOV_DEG = 72; // Enough to show left/right lanes + margin
    const baseFov = 60;
    const vFovRad = 2 * Math.atan(Math.tan((MIN_HORIZONTAL_FOV_DEG * Math.PI) / 360) / aspect);
    const vFovDeg = Math.min(95, (vFovRad * 180) / Math.PI); // Cap to avoid fish-eye
    camera = new THREE.PerspectiveCamera(Math.max(baseFov, vFovDeg), aspect, 0.1, 200);
    camera.position.set(0, 5, 8);
    camera.lookAt(0, 2, -15);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Lighting (Cinematic Realism)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);

    // Space void below (no solid ground - just open space)
    // Faint star-field plane far below to give depth
    const voidCanvas = document.createElement('canvas');
    voidCanvas.width = 256; voidCanvas.height = 256;
    const vCtx = voidCanvas.getContext('2d');
    vCtx.fillStyle = '#010208';
    vCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 120; i++) {
        vCtx.fillStyle = ['#6688cc', '#aabbee', '#ffffff', '#5577aa'][Math.floor(Math.random() * 4)];
        vCtx.globalAlpha = 0.15 + Math.random() * 0.35;
        const sz = Math.random() * 1.8;
        vCtx.fillRect(Math.random() * 256, Math.random() * 256, sz, sz);
    }
    vCtx.globalAlpha = 1;
    const voidTex = new THREE.CanvasTexture(voidCanvas);
    voidTex.wrapS = THREE.RepeatWrapping;
    voidTex.wrapT = THREE.RepeatWrapping;
    voidTex.repeat.set(12, 24);
    window.groundTex = voidTex;

    const voidGeo = new THREE.PlaneGeometry(200, 400);
    const voidMat = new THREE.MeshBasicMaterial({
        map: voidTex,
        transparent: true,
        opacity: 0.4,
        depthWrite: false
    });
    const voidPlane = new THREE.Mesh(voidGeo, voidMat);
    voidPlane.rotation.x = -Math.PI / 2;
    voidPlane.position.set(0, -8, -80);
    scene.add(voidPlane);

    // --- Star streak particles (speed lines rushing past) ---
    const streakCount = 200;
    const streakGeo = new THREE.BufferGeometry();
    const streakPositions = new Float32Array(streakCount * 3);
    for (let i = 0; i < streakCount; i++) {
        streakPositions[i * 3] = (Math.random() - 0.5) * 60;       // x: wide spread
        streakPositions[i * 3 + 1] = Math.random() * 20 - 2;       // y: mostly above
        streakPositions[i * 3 + 2] = Math.random() * -160;          // z: spread along depth
    }
    streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));
    const streakMat = new THREE.PointsMaterial({
        color: 0xaaccff,
        size: 0.12,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const streakPoints = new THREE.Points(streakGeo, streakMat);
    scene.add(streakPoints);
    window.starStreaks = streakPoints;

    // === RICH SPACE SKYBOX ===
    const skyCanvas = document.createElement('canvas');
    const skySize = 1024;
    skyCanvas.width = skySize; skyCanvas.height = skySize;
    const sCtx = skyCanvas.getContext('2d');

    // Deep space gradient
    const skyGrad = sCtx.createLinearGradient(0, 0, 0, skySize);
    skyGrad.addColorStop(0, '#010308');
    skyGrad.addColorStop(0.3, '#040a1a');
    skyGrad.addColorStop(0.6, '#060e22');
    skyGrad.addColorStop(1, '#08122e');
    sCtx.fillStyle = skyGrad;
    sCtx.fillRect(0, 0, skySize, skySize);

    // --- Nebula clouds (large, colorful gas regions) ---
    const nebulaColors = [
        'rgba(120, 60, 200, 0.08)',   // purple
        'rgba(60, 100, 220, 0.07)',   // blue
        'rgba(200, 50, 120, 0.06)',   // pink
        'rgba(40, 160, 200, 0.06)',   // teal
        'rgba(180, 80, 255, 0.05)',   // violet
        'rgba(255, 100, 80, 0.04)',   // warm red
        'rgba(60, 200, 160, 0.05)'    // cyan-green
    ];
    for (let n = 0; n < 35; n++) {
        const nx = Math.random() * skySize;
        const ny = Math.random() * skySize;
        const nr = 60 + Math.random() * 180;
        const grad = sCtx.createRadialGradient(nx, ny, 0, nx, ny, nr);
        const col = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
        grad.addColorStop(0, col);
        grad.addColorStop(0.5, col.replace(/[\d.]+\)$/, (parseFloat(col.match(/[\d.]+\)$/)[0]) * 0.5) + ')'));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        sCtx.fillStyle = grad;
        sCtx.fillRect(0, 0, skySize, skySize);
    }

    // Layered nebula wisps (elongated ellipses)
    for (let w = 0; w < 12; w++) {
        sCtx.save();
        sCtx.translate(Math.random() * skySize, Math.random() * skySize);
        sCtx.rotate(Math.random() * Math.PI);
        sCtx.scale(1 + Math.random() * 2, 0.3 + Math.random() * 0.5);
        const wGrad = sCtx.createRadialGradient(0, 0, 0, 0, 0, 50 + Math.random() * 80);
        const wCol = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
        wGrad.addColorStop(0, wCol);
        wGrad.addColorStop(1, 'rgba(0,0,0,0)');
        sCtx.fillStyle = wGrad;
        sCtx.fillRect(-150, -150, 300, 300);
        sCtx.restore();
    }

    // --- Dense star field (multiple layers for depth) ---
    // Dim distant stars
    for (let i = 0; i < 600; i++) {
        sCtx.fillStyle = ['#8899bb', '#667799', '#99aacc', '#7788aa'][Math.floor(Math.random() * 4)];
        sCtx.globalAlpha = 0.15 + Math.random() * 0.3;
        const sz = Math.random() * 1.2;
        sCtx.fillRect(Math.random() * skySize, Math.random() * skySize, sz, sz);
    }
    // Medium stars
    for (let i = 0; i < 300; i++) {
        sCtx.fillStyle = ['#c9d9ff', '#aabbee', '#ffffff', '#bbccff'][Math.floor(Math.random() * 4)];
        sCtx.globalAlpha = 0.4 + Math.random() * 0.5;
        const sz = 0.8 + Math.random() * 1.5;
        sCtx.fillRect(Math.random() * skySize, Math.random() * skySize, sz, sz);
    }
    // Bright stars (with subtle glow)
    for (let i = 0; i < 80; i++) {
        const sx = Math.random() * skySize;
        const sy = Math.random() * skySize;
        // Glow
        sCtx.globalAlpha = 0.15;
        sCtx.fillStyle = '#aaccff';
        sCtx.beginPath();
        sCtx.arc(sx, sy, 3 + Math.random() * 3, 0, Math.PI * 2);
        sCtx.fill();
        // Core
        sCtx.globalAlpha = 0.7 + Math.random() * 0.3;
        sCtx.fillStyle = '#ffffff';
        const coreSize = 1 + Math.random() * 1.5;
        sCtx.fillRect(sx - coreSize / 2, sy - coreSize / 2, coreSize, coreSize);
    }
    sCtx.globalAlpha = 1;

    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.wrapS = THREE.RepeatWrapping;
    skyTex.wrapT = THREE.RepeatWrapping;
    skyTex.repeat.set(3, 1);

    const skyGeo = new THREE.SphereGeometry(150, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);
    window.skyMesh = skyMesh;

    // === DISTANT PLANET (horizon object) ===
    const planetGroup = new THREE.Group();
    // Planet body
    const planetGeo = new THREE.SphereGeometry(18, 32, 32);
    const planetMat = new THREE.MeshStandardMaterial({
        color: 0x334477,
        roughness: 0.7,
        metalness: 0.1,
        emissive: 0x112244,
        emissiveIntensity: 0.2
    });
    const planet = new THREE.Mesh(planetGeo, planetMat);
    planetGroup.add(planet);

    // Atmosphere rim glow
    const atmosGeo = new THREE.SphereGeometry(18.5, 32, 32);
    const atmosMat = new THREE.MeshBasicMaterial({
        color: 0x4488cc,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const atmos = new THREE.Mesh(atmosGeo, atmosMat);
    planetGroup.add(atmos);

    // Planet ring
    const ringGeo = new THREE.TorusGeometry(28, 1.5, 2, 64);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x6699bb,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const planetRing = new THREE.Mesh(ringGeo, ringMat);
    planetRing.rotation.x = Math.PI / 2.5;
    planetGroup.add(planetRing);

    planetGroup.position.set(-60, 25, -130);
    scene.add(planetGroup);
    window.distantPlanet = planetGroup;

    // === PARALLAX ASTEROID FIELD (distant floating rocks) ===
    const asteroidField = new THREE.Group();
    const asteroidMat = new THREE.MeshStandardMaterial({
        color: 0x3a3a44,
        roughness: 0.8,
        metalness: 0.3,
        emissive: 0x111115,
        emissiveIntensity: 0.1
    });
    for (let a = 0; a < 40; a++) {
        const aGeo = new THREE.OctahedronGeometry(0.5 + Math.random() * 1.5, 0);
        const asteroid = new THREE.Mesh(aGeo, asteroidMat);
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 60;
        const height = (Math.random() - 0.5) * 40;
        asteroid.position.set(
            Math.cos(angle) * dist,
            height,
            Math.sin(angle) * dist - 60
        );
        asteroid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        asteroid.userData.spinSpeed = 0.1 + Math.random() * 0.3;
        asteroid.userData.spinAxis = Math.random() > 0.5 ? 'x' : 'y';
        asteroidField.add(asteroid);
    }
    scene.add(asteroidField);
    window.asteroidField = asteroidField;

    // === SHOOTING STAR SYSTEM ===
    const shootingStars = [];
    for (let ss = 0; ss < 3; ss++) {
        const ssGroup = new THREE.Group();

        // Head (bright point)
        const headGeo = new THREE.SphereGeometry(0.15, 6, 6);
        const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const head = new THREE.Mesh(headGeo, headMat);
        ssGroup.add(head);

        // Trail (stretched glow)
        const trailGeo = new THREE.ConeGeometry(0.08, 3.5, 6);
        const trailMat = new THREE.MeshBasicMaterial({
            color: 0xaaccff,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        const trail = new THREE.Mesh(trailGeo, trailMat);
        trail.rotation.x = Math.PI / 2;
        trail.position.z = 1.8;
        ssGroup.add(trail);

        // Start hidden off-screen
        ssGroup.visible = false;
        ssGroup.userData = {
            active: false,
            timer: 5 + Math.random() * 15, // delay before first appearance
            speed: 80 + Math.random() * 60,
            dirX: 0, dirY: 0, dirZ: 0
        };
        scene.add(ssGroup);
        shootingStars.push(ssGroup);
    }
    window.shootingStars = shootingStars;

    // === NEON HORIZON ARCH (half-circle over the road) — COMMENTED OUT FOR NOW ===
    /*
    const neonRingGroup = new THREE.Group();

    const archRadius = 8;
    const tubeRadius = 0.2;
    const halfArc = Math.PI; // semicircle

    function makeArchMesh(radius, tube, mat) {
        const geo = new THREE.TorusGeometry(radius, tube, 24, 64, halfArc);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.y = Math.PI / 2;
        mesh.rotation.z = -Math.PI / 2;
        return mesh;
    }

    const neonRingMat = new THREE.MeshBasicMaterial({
        color: 0x00ddff, transparent: true, opacity: 0.95, depthWrite: false
    });
    neonRingGroup.add(makeArchMesh(archRadius, tubeRadius, neonRingMat));

    const bloomMat1 = new THREE.MeshBasicMaterial({
        color: 0x00ccff, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending
    });
    neonRingGroup.add(makeArchMesh(archRadius, tubeRadius * 4, bloomMat1));

    const bloomMat2 = new THREE.MeshBasicMaterial({
        color: 0x0088cc, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending
    });
    neonRingGroup.add(makeArchMesh(archRadius, tubeRadius * 10, bloomMat2));

    const footGeo = new THREE.SphereGeometry(0.4, 12, 12);
    const footMat = new THREE.MeshBasicMaterial({
        color: 0x00eeff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending
    });
    const footL = new THREE.Mesh(footGeo, footMat);
    footL.position.set(-archRadius, 0, 0);
    neonRingGroup.add(footL);
    const footR = new THREE.Mesh(footGeo, footMat);
    footR.position.set(archRadius, 0, 0);
    neonRingGroup.add(footR);

    neonRingGroup.position.set(0, 0, -75);
    scene.add(neonRingGroup);
    window.neonRingGroup = neonRingGroup;
    window.neonRingMat = neonRingMat;
    window.neonBloomMat1 = bloomMat1;
    */

    // Handle Resize + keep character visible on mobile (no horizontal clipping)
    function updateCameraViewport() {
        const aspect = window.innerWidth / window.innerHeight;
        const MIN_HORIZONTAL_FOV_DEG = 72;
        const baseFov = 60;
        const vFovRad = 2 * Math.atan(Math.tan((MIN_HORIZONTAL_FOV_DEG * Math.PI) / 360) / aspect);
        const vFovDeg = Math.min(95, (vFovRad * 180) / Math.PI);
        camera.aspect = aspect;
        camera.fov = Math.max(baseFov, vFovDeg);
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', updateCameraViewport);
    window.updateCameraViewport = updateCameraViewport; // Call once after first paint if needed
}

function createAssets() {
    // Reusable Geometries
    geometries.box = new THREE.BoxGeometry(1, 1, 1);
    geometries.cylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
    // Energy Orb geometries (replaces old coins)
    geometries.orbCore = new THREE.BoxGeometry(0.3, 0.3, 0.3);       // inner plasma cube
    geometries.orbShell = new THREE.OctahedronGeometry(0.4, 1);       // translucent energy shell
    geometries.orbGlow = new THREE.SphereGeometry(0.55, 16, 16);      // outer glow sphere
    geometries.orbRing = new THREE.TorusGeometry(0.38, 0.03, 8, 24);  // orbiting ring
    geometries.rail = new THREE.BoxGeometry(0.2, 0.1, 100);
    geometries.railBar = new THREE.BoxGeometry(0.14, 0.07, 200); // 3D rail on track
    geometries.jetpack = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8);
    geometries.magnet = new THREE.TorusGeometry(0.3, 0.1, 8, 16, Math.PI); // U-shape
    geometries.crystalShard = new THREE.OctahedronGeometry(0.65, 0);
    geometries.crystalRing = new THREE.TorusGeometry(0.72, 0.08, 10, 28);

    // Energy bridge grid texture (transparent with neon lines)
    const rCanvas = document.createElement('canvas');
    const rW = 256, rH = 256;
    rCanvas.width = rW; rCanvas.height = rH;
    const rCtx = rCanvas.getContext('2d');

    // Transparent base
    rCtx.clearRect(0, 0, rW, rH);

    // Faint base tint
    rCtx.fillStyle = 'rgba(8, 20, 40, 0.25)';
    rCtx.fillRect(0, 0, rW, rH);

    // Horizontal grid lines
    for (let y = 0; y < rH; y += 32) {
        rCtx.strokeStyle = 'rgba(80, 200, 255, 0.3)';
        rCtx.lineWidth = 1;
        rCtx.beginPath();
        rCtx.moveTo(0, y);
        rCtx.lineTo(rW, y);
        rCtx.stroke();
    }

    // Vertical grid lines
    for (let x = 0; x < rW; x += 32) {
        rCtx.strokeStyle = 'rgba(80, 200, 255, 0.2)';
        rCtx.lineWidth = 1;
        rCtx.beginPath();
        rCtx.moveTo(x, 0);
        rCtx.lineTo(x, rH);
        rCtx.stroke();
    }

    // Bright center lane lines
    [96, 128, 160].forEach(lx => {
        rCtx.strokeStyle = 'rgba(100, 220, 255, 0.5)';
        rCtx.lineWidth = 2;
        rCtx.beginPath();
        rCtx.moveTo(lx, 0);
        rCtx.lineTo(lx, rH);
        rCtx.stroke();
    });

    // Edge glow lines
    [4, rW - 4].forEach(ex => {
        rCtx.strokeStyle = 'rgba(80, 180, 255, 0.6)';
        rCtx.lineWidth = 3;
        rCtx.beginPath();
        rCtx.moveTo(ex, 0);
        rCtx.lineTo(ex, rH);
        rCtx.stroke();
    });

    const railTex = new THREE.CanvasTexture(rCanvas);
    railTex.wrapS = THREE.RepeatWrapping;
    railTex.wrapT = THREE.RepeatWrapping;
    railTex.magFilter = THREE.LinearFilter;
    railTex.minFilter = THREE.LinearMipmapLinearFilter;
    railTex.anisotropy = 4;
    railTex.repeat.set(1, 18);
    railTex.needsUpdate = true;
    if (typeof renderer !== 'undefined' && renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function')
        railTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    window.railTex = railTex;

    // --- Player ship materials (PBR) ---
    materials.player = new THREE.MeshPhysicalMaterial({
        color: selectedCharColor,
        roughness: 0.25,
        metalness: 0.6,
        clearcoat: 0.7,
        clearcoatRoughness: 0.15
    });
    materials.playerDark = new THREE.MeshStandardMaterial({
        color: 0x111824,
        roughness: 0.35,
        metalness: 0.7,
        emissive: 0x080e18,
        emissiveIntensity: 0.1
    });
    materials.playerAccent = new THREE.MeshStandardMaterial({
        color: 0x2a3a55,
        roughness: 0.3,
        metalness: 0.65,
        emissive: 0x121e30,
        emissiveIntensity: 0.08
    });
    materials.playerCockpit = new THREE.MeshPhysicalMaterial({
        color: 0x66ddff,
        roughness: 0.05,
        metalness: 0.02,
        transmission: 0.65,
        transparent: true,
        emissive: 0x44bbee,
        emissiveIntensity: 0.4
    });
    materials.playerEngineGlow = new THREE.MeshBasicMaterial({
        color: 0x55ccff,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    materials.playerEngineCore = new THREE.MeshBasicMaterial({
        color: 0xddf4ff,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    materials.playerNozzle = new THREE.MeshStandardMaterial({
        color: 0x555e6e,
        roughness: 0.3,
        metalness: 0.8
    });
    materials.playerWingTrim = new THREE.MeshStandardMaterial({
        color: 0x55ddff,
        emissive: 0x44ccff,
        emissiveIntensity: 1.0,
        roughness: 0.1,
        metalness: 0.1
    });

    // Power-up / pickup materials
    materials.shoes = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
    materials.jetpack = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.6, roughness: 0.3 });
    materials.magnet = new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.5, roughness: 0.2 });
    materials.superSneaker = new THREE.MeshStandardMaterial({ color: 0x39ff14, emissive: 0x39ff14, emissiveIntensity: 0.5 }); 
    materials.hoverboard = new THREE.MeshStandardMaterial({ color: 0xff00cc, metalness: 0.8, roughness: 0.1 }); 
    materials.mysteryBox = new THREE.MeshStandardMaterial({ color: 0x9b59b6, metalness: 0.4, roughness: 0.2 }); 
    
    // --- Cruiser materials (space-realistic) ---
    materials.cruiserHull = new THREE.MeshPhysicalMaterial({
        color: 0x1a2844,
        roughness: 0.3,
        metalness: 0.7,
        clearcoat: 0.6,
        emissive: 0x0a1428,
        emissiveIntensity: 0.08
    });
    materials.cruiserHullAccent = new THREE.MeshPhysicalMaterial({
        color: 0x283c5e,
        roughness: 0.28,
        metalness: 0.65,
        clearcoat: 0.4,
        emissive: 0x101e38,
        emissiveIntensity: 0.1
    });
    materials.cruiserArmor = new THREE.MeshStandardMaterial({
        color: 0x3a4a66,
        roughness: 0.45,
        metalness: 0.55,
        emissive: 0x1a2240,
        emissiveIntensity: 0.05
    });
    materials.cruiserCanopy = new THREE.MeshPhysicalMaterial({
        color: 0x66ccff,
        roughness: 0.08,
        metalness: 0.05,
        transmission: 0.6,
        transparent: true,
        emissive: 0x44aaee,
        emissiveIntensity: 0.35
    });
    materials.cruiserEngine = new THREE.MeshStandardMaterial({
        color: 0x222838,
        roughness: 0.35,
        metalness: 0.8,
        emissive: 0x111522,
        emissiveIntensity: 0.05
    });
    materials.cruiserThrustGlow = new THREE.MeshBasicMaterial({
        color: 0x55ccff,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    materials.cruiserThrustCore = new THREE.MeshBasicMaterial({
        color: 0xccf0ff,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    materials.cruiserRunningLight = new THREE.MeshStandardMaterial({
        color: 0x55ddff,
        emissive: 0x44ccff,
        emissiveIntensity: 1.3,
        roughness: 0.1,
        metalness: 0.1
    });
    materials.cruiserRedLight = new THREE.MeshStandardMaterial({
        color: 0xff3344,
        emissive: 0xff2233,
        emissiveIntensity: 1.2,
        roughness: 0.1,
        metalness: 0.1
    });
    materials.cruiserCargoPanel = new THREE.MeshStandardMaterial({
        color: 0x2a3652,
        roughness: 0.5,
        metalness: 0.5,
        emissive: 0x141e30,
        emissiveIntensity: 0.06
    });
    
    materials.barrierRed = new THREE.MeshStandardMaterial({ color: 0x8855ff, emissive: 0x220044, emissiveIntensity: 0.2, roughness: 0.35 });
    materials.barrierWhite = new THREE.MeshStandardMaterial({ color: 0xb6d9ff, roughness: 0.4, metalness: 0.2 });

    // --- Asteroid chunk materials ---
    materials.asteroidRock = new THREE.MeshStandardMaterial({
        color: 0x5a504a,
        roughness: 0.85,
        metalness: 0.15,
        emissive: 0x1a1510,
        emissiveIntensity: 0.1
    });
    materials.asteroidRockLight = new THREE.MeshStandardMaterial({
        color: 0x7a6e60,
        roughness: 0.9,
        metalness: 0.1,
        emissive: 0x201a12,
        emissiveIntensity: 0.1
    });
    materials.asteroidCrack = new THREE.MeshBasicMaterial({
        color: 0xff6633,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    materials.asteroidGlow = new THREE.MeshBasicMaterial({
        color: 0xff4422,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    // --- Plasma pillar / laser gate materials ---
    materials.plasmaPillarBase = new THREE.MeshStandardMaterial({
        color: 0x1a1e2e,
        roughness: 0.35,
        metalness: 0.7,
        emissive: 0x0a0e18,
        emissiveIntensity: 0.1
    });
    materials.plasmaPillarRing = new THREE.MeshStandardMaterial({
        color: 0xcc44ff,
        emissive: 0xaa22ee,
        emissiveIntensity: 1.2,
        roughness: 0.1,
        metalness: 0.1
    });
    materials.plasmaTubeOuter = new THREE.MeshPhysicalMaterial({
        color: 0xdd66ff,
        emissive: 0xbb44ee,
        emissiveIntensity: 0.8,
        roughness: 0.05,
        metalness: 0.02,
        transmission: 0.5,
        transparent: true
    });
    materials.plasmaTubeInner = new THREE.MeshBasicMaterial({
        color: 0xeeccff,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    materials.plasmaGlow = new THREE.MeshBasicMaterial({
        color: 0xcc55ff,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    materials.plasmaBeam = new THREE.MeshBasicMaterial({
        color: 0xff44cc,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    materials.plasmaBeamCore = new THREE.MeshBasicMaterial({
        color: 0xffccee,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    
    // Energy Orb materials (replaces old coins)
    materials.orbCore = new THREE.MeshBasicMaterial({
        color: 0x00ffcc,
        transparent: true,
        opacity: 0.95
    });
    materials.orbShell = new THREE.MeshPhysicalMaterial({
        color: 0x00ddff,
        metalness: 0.2,
        roughness: 0.1,
        transparent: true,
        opacity: 0.35,
        emissive: 0x00aacc,
        emissiveIntensity: 0.6,
        depthWrite: false
    });
    materials.orbGlow = new THREE.MeshBasicMaterial({
        color: 0x00ccff,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    materials.orbRing = new THREE.MeshBasicMaterial({
        color: 0x00ffdd,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    materials.rail = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.5, roughness: 0.35 });
    materials.railMetal = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, metalness: 0.7, roughness: 0.25 });
    // Space center building materials
    materials.spaceHull = new THREE.MeshStandardMaterial({
        color: 0x0a1628,
        roughness: 0.4,
        metalness: 0.7,
        emissive: 0x050d1a,
        emissiveIntensity: 0.1
    });
    materials.spaceHullLight = new THREE.MeshStandardMaterial({
        color: 0x122240,
        roughness: 0.35,
        metalness: 0.6,
        emissive: 0x0a1830,
        emissiveIntensity: 0.15
    });
    materials.neonTrimCyan = new THREE.MeshStandardMaterial({
        color: 0x55ddff,
        emissive: 0x44ccff,
        emissiveIntensity: 1.2,
        roughness: 0.1,
        metalness: 0.1
    });
    materials.neonTrimPurple = new THREE.MeshStandardMaterial({
        color: 0xbb66ff,
        emissive: 0x9944ff,
        emissiveIntensity: 1.0,
        roughness: 0.1,
        metalness: 0.1
    });
    materials.neonTrimBlue = new THREE.MeshStandardMaterial({
        color: 0x3388ff,
        emissive: 0x2266dd,
        emissiveIntensity: 0.9,
        roughness: 0.15,
        metalness: 0.1
    });
    materials.spaceDome = new THREE.MeshPhysicalMaterial({
        color: 0x66ccff,
        roughness: 0.08,
        metalness: 0.05,
        transmission: 0.55,
        transparent: true,
        emissive: 0x3399cc,
        emissiveIntensity: 0.35
    });
    materials.spaceAntenna = new THREE.MeshStandardMaterial({
        color: 0x8899aa,
        roughness: 0.3,
        metalness: 0.8
    });
    materials.spaceGlowPanel = new THREE.MeshStandardMaterial({
        color: 0x44aaff,
        emissive: 0x2288dd,
        emissiveIntensity: 0.7,
        roughness: 0.15,
        metalness: 0.2,
        transparent: true,
        opacity: 0.9
    });
    materials.spaceRingGlow = new THREE.MeshBasicMaterial({
        color: 0x55ddff,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    materials.treeTrunk = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
    materials.treeFoliage = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.75, emissive: 0x1b5e20, emissiveIntensity: 0.08 });
    materials.treeFoliageLight = new THREE.MeshStandardMaterial({ color: 0x4CAF50, roughness: 0.7, emissive: 0x2e7d32, emissiveIntensity: 0.12 });
    materials.treeFoliageDark = new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.8 });
    materials.crystalPurple = new THREE.MeshPhysicalMaterial({
        color: 0xc48bff,
        emissive: 0xb05cff,
        emissiveIntensity: 0.42,
        roughness: 0.12,
        metalness: 0.02,
        transmission: 0.45,
        transparent: true
    });
    materials.crystalCyan = new THREE.MeshPhysicalMaterial({
        color: 0x8ce8ff,
        emissive: 0x55d3ff,
        emissiveIntensity: 0.45,
        roughness: 0.08,
        metalness: 0.02,
        transmission: 0.52,
        transparent: true
    });
    materials.crystalGreen = new THREE.MeshPhysicalMaterial({
        color: 0x9cff8e,
        emissive: 0x53ff7d,
        emissiveIntensity: 0.36,
        roughness: 0.1,
        metalness: 0.02,
        transmission: 0.4,
        transparent: true
    });
    materials.track = new THREE.MeshBasicMaterial({
        map: railTex,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    materials.runwayPost = new THREE.MeshStandardMaterial({ color: 0x5b6f93, roughness: 0.45, metalness: 0.25 });
    materials.runwayBulb = new THREE.MeshStandardMaterial({
        color: 0xb0f3ff,
        emissive: 0x78ddff,
        emissiveIntensity: 0.95,
        roughness: 0.2,
        metalness: 0.1
    });
    materials.runwayBulbGlow = new THREE.MeshBasicMaterial({
        color: 0x79dfff,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
}

// --- PLAYER SYSTEM ---
class Player {
    constructor() {
        this.mesh = new THREE.Group();
        this.animTime = 0;
        this.targetBankZ = 0;
        this.baseScaleY = 1;

        // === SPACE FIGHTER MODEL ===

        // --- Main fuselage (player color, elongated & sleek) ---
        const fuselage = new THREE.Mesh(geometries.box, materials.player);
        fuselage.scale.set(0.9, 0.42, 2.2);
        fuselage.position.y = 1.15;
        fuselage.castShadow = true;
        this.mesh.add(fuselage);

        // Upper spine plate (darker accent for layered depth)
        const spine = new THREE.Mesh(geometries.box, materials.playerAccent);
        spine.scale.set(0.5, 0.16, 1.8);
        spine.position.set(0, 1.46, -0.1);
        spine.castShadow = true;
        this.mesh.add(spine);

        // Lower ventral plate
        const ventral = new THREE.Mesh(geometries.box, materials.playerDark);
        ventral.scale.set(0.6, 0.14, 1.6);
        ventral.position.set(0, 0.86, 0.0);
        this.mesh.add(ventral);

        // --- Nose section (tapered, aggressive) ---
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.3, 4), materials.player);
        nose.rotation.x = Math.PI / 2;
        nose.rotation.y = Math.PI / 4;
        nose.position.set(0, 1.15, 1.72);
        nose.castShadow = true;
        this.mesh.add(nose);

        // Nose accent stripe
        const noseStripe = new THREE.Mesh(geometries.box, materials.playerWingTrim);
        noseStripe.scale.set(0.04, 0.04, 0.7);
        noseStripe.position.set(0, 1.38, 1.3);
        this.mesh.add(noseStripe);

        // --- Cockpit (translucent canopy with frame) ---
        const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), materials.playerCockpit);
        cockpit.scale.set(1.1, 0.65, 1.3);
        cockpit.position.set(0, 1.62, 0.6);
        this.mesh.add(cockpit);

        // Cockpit frame rails
        [-0.18, 0.18].forEach(px => {
            const rail = new THREE.Mesh(geometries.box, materials.playerDark);
            rail.scale.set(0.03, 0.04, 0.7);
            rail.position.set(px, 1.78, 0.6);
            this.mesh.add(rail);
        });
        const frameArc = new THREE.Mesh(geometries.box, materials.playerDark);
        frameArc.scale.set(0.38, 0.03, 0.04);
        frameArc.position.set(0, 1.8, 0.6);
        this.mesh.add(frameArc);

        // --- Swept-back delta wings (triangle shaped) ---
        [-1, 1].forEach(side => {
            // Triangle wing shape: root at fuselage, sweeps back to tip
            const wingShape = new THREE.Shape();
            // Points in local XZ: root leading edge, root trailing edge, tip
            wingShape.moveTo(0, 0);                    // root leading edge (fuselage side)
            wingShape.lineTo(0, -0.95);                // root trailing edge
            wingShape.lineTo(side * 0.95, -0.7);      // wing tip (swept back)
            wingShape.lineTo(0, 0);                    // close

            const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.06, bevelEnabled: false });
            const wing = new THREE.Mesh(wingGeo, materials.player);
            wing.rotation.x = -Math.PI / 2;
            wing.position.set(side * 0.4, 1.05, 0.5);
            wing.castShadow = true;
            this.mesh.add(wing);

            // Thin accent stripe along trailing edge
            const trailShape = new THREE.Shape();
            trailShape.moveTo(0, -0.85);
            trailShape.lineTo(side * 0.9, -0.65);
            trailShape.lineTo(side * 0.95, -0.7);
            trailShape.lineTo(0, -0.95);
            trailShape.lineTo(0, -0.85);
            const trailGeo = new THREE.ExtrudeGeometry(trailShape, { depth: 0.07, bevelEnabled: false });
            const trailAccent = new THREE.Mesh(trailGeo, materials.playerAccent);
            trailAccent.rotation.x = -Math.PI / 2;
            trailAccent.position.set(side * 0.4, 1.04, 0.5);
            this.mesh.add(trailAccent);

            // Wing-edge neon trim (along the swept leading edge)
            const trimLen = Math.sqrt(0.95 * 0.95 + 0.7 * 0.7);
            const trimAngle = Math.atan2(0.7, 0.95 * side);
            const wingTrim = new THREE.Mesh(geometries.box, materials.playerWingTrim);
            wingTrim.scale.set(trimLen, 0.02, 0.025);
            wingTrim.position.set(side * 0.4 + side * 0.45, 1.09, 0.15);
            wingTrim.rotation.y = -trimAngle;
            this.mesh.add(wingTrim);

            // Wing-tip nav light (red port, green starboard)
            const navColor = side === -1 ? 0xff3344 : 0x33ff55;
            const navEmissive = side === -1 ? 0xff2233 : 0x22dd44;
            const navLight = new THREE.Mesh(
                new THREE.SphereGeometry(0.04, 8, 8),
                new THREE.MeshStandardMaterial({ color: navColor, emissive: navEmissive, emissiveIntensity: 1.3, roughness: 0.1 })
            );
            navLight.position.set(side * 0.4 + side * 0.95, 1.05, -0.2);
            this.mesh.add(navLight);
        });

        // --- Dorsal fin (vertical stabilizer) ---
        const dorsalFin = new THREE.Mesh(geometries.box, materials.playerAccent);
        dorsalFin.scale.set(0.08, 0.55, 0.5);
        dorsalFin.position.set(0, 1.8, -0.65);
        dorsalFin.castShadow = true;
        this.mesh.add(dorsalFin);

        // Fin tip light
        const finTip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), materials.playerWingTrim);
        finTip.position.set(0, 2.08, -0.65);
        this.mesh.add(finTip);

        // --- Ventral fins (small, angled down from rear) ---
        [-1, 1].forEach(side => {
            const vFin = new THREE.Mesh(geometries.box, materials.playerDark);
            vFin.scale.set(0.06, 0.25, 0.3);
            vFin.position.set(side * 0.35, 0.75, -0.7);
            vFin.rotation.z = side * -0.2;
            this.mesh.add(vFin);
        });

        // --- Side intake vents ---
        [-1, 1].forEach(side => {
            const intake = new THREE.Mesh(geometries.box, materials.playerDark);
            intake.scale.set(0.12, 0.22, 0.5);
            intake.position.set(side * 0.52, 1.0, 0.5);
            this.mesh.add(intake);

            // Intake glow slit
            const intakeGlow = new THREE.Mesh(geometries.box, materials.playerWingTrim);
            intakeGlow.scale.set(0.02, 0.08, 0.45);
            intakeGlow.position.set(side * 0.53, 1.12, 0.5);
            this.mesh.add(intakeGlow);
        });

        // --- Running light strips (along hull sides) ---
        [-1, 1].forEach(side => {
            const strip = new THREE.Mesh(geometries.box, materials.playerWingTrim);
            strip.scale.set(0.02, 0.02, 1.8);
            strip.position.set(side * 0.46, 1.35, -0.1);
            this.mesh.add(strip);
        });

        // --- Engine nacelles (flanking the rear hull) ---
        [-1, 1].forEach(side => {
            // Nacelle body
            const nacelle = new THREE.Mesh(geometries.cylinder, materials.playerDark);
            nacelle.scale.set(0.2, 0.8, 0.2);
            nacelle.rotation.x = Math.PI / 2;
            nacelle.position.set(side * 0.48, 0.95, -0.95);
            nacelle.castShadow = true;
            this.mesh.add(nacelle);

            // Nozzle ring
            const nozzleRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 16), materials.playerWingTrim);
            nozzleRing.rotation.y = Math.PI / 2;
            nozzleRing.position.set(side * 0.48, 0.95, -1.35);
            this.mesh.add(nozzleRing);
        });

        // Engine nozzles (referenced by super-sneaker visual swap)
        const nozzleL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.4, 12), materials.playerNozzle);
        nozzleL.rotation.x = Math.PI / 2;
        nozzleL.scale.set(1, 1, 1);
        nozzleL.position.set(-0.48, 0.95, -1.2);
        nozzleL.castShadow = true;
        this.mesh.add(nozzleL);
        this.shoeL = nozzleL;

        const nozzleR = nozzleL.clone();
        nozzleR.position.x = 0.48;
        this.mesh.add(nozzleR);
        this.shoeR = nozzleR;

        // --- Thruster glow cones (animated via update) ---
        const glowL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 10), materials.playerEngineGlow);
        glowL.rotation.x = -Math.PI / 2;
        glowL.position.set(-0.48, 0.95, -1.55);
        this.mesh.add(glowL);
        this.thrusterGlowL = glowL;

        const glowR = glowL.clone();
        glowR.position.x = 0.48;
        this.mesh.add(glowR);
        this.thrusterGlowR = glowR;

        // Inner bright exhaust cores
        const coreL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 8), materials.playerEngineCore);
        coreL.rotation.x = -Math.PI / 2;
        coreL.position.set(-0.48, 0.95, -1.45);
        this.mesh.add(coreL);
        this.thrustCoreL = coreL;

        const coreR = coreL.clone();
        coreR.position.x = 0.48;
        this.mesh.add(coreR);
        this.thrustCoreR = coreR;

        // --- Boost FX group (hidden by default, shown during jetpack) ---
        const jpGroup = new THREE.Group();
        const boostL = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.5, 10), materials.playerEngineGlow);
        boostL.rotation.x = -Math.PI / 2;
        boostL.position.set(-0.48, 0, -0.5);
        jpGroup.add(boostL);
        const boostR = boostL.clone();
        boostR.position.x = 0.48;
        jpGroup.add(boostR);
        // Boost core
        const boostCoreL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 1.2, 8), materials.playerEngineCore);
        boostCoreL.rotation.x = -Math.PI / 2;
        boostCoreL.position.set(-0.48, 0, -0.4);
        jpGroup.add(boostCoreL);
        const boostCoreR = boostCoreL.clone();
        boostCoreR.position.x = 0.48;
        jpGroup.add(boostCoreR);
        jpGroup.position.set(0, 0.95, -1.0);
        jpGroup.visible = false;
        this.mesh.add(jpGroup);
        this.jetpackMesh = jpGroup;

        // --- Magnet Visual (energy ring, hidden by default) ---
        const magGeo = new THREE.TorusGeometry(0.8, 0.04, 8, 32);
        const magMesh = new THREE.Mesh(magGeo, materials.magnet);
        magMesh.rotation.x = Math.PI / 2;
        magMesh.position.y = 1.2;
        magMesh.visible = false;
        this.mesh.add(magMesh);
        this.magnetMesh = magMesh;

        // --- Hoverboard / Shield plate (hidden by default) ---
        const boardGeo = new THREE.BoxGeometry(1.6, 0.08, 2.8);
        const boardMesh = new THREE.Mesh(boardGeo, materials.hoverboard);
        boardMesh.position.set(0, 0.25, 0);
        boardMesh.visible = false;
        this.mesh.add(boardMesh);
        this.hoverboardMesh = boardMesh;

        // Physics/Logic
        this.lane = 0; // -1 (Left), 0 (Center), 1 (Right)
        this.targetX = 0;
        this.currentX = 0;
        this.yVelocity = 0;
        this.isJumping = false;
        this.isRolling = false;
        this.rollTimer = 0;
        this.isFlying = false;
        this.flyTimer = 0;
        this.isMagnetActive = false;
        this.magnetTimer = 0;
        this.isSuperSneakersActive = false;
        this.superSneakersTimer = 0;
        this.groundY = 0;
        this.isHovering = false;
        this.hoverTimer = 0;
        this.invincibleTimer = 0;
        this.mesh.rotation.y = Math.PI;

        scene.add(this.mesh);
    }

    reset() {
        this.lane = 0;
        this.targetX = 0;
        this.currentX = 0;
        this.mesh.position.set(0, 0, 0);
        this.mesh.scale.set(1, 1, 1);
        this.yVelocity = 0;
        this.isJumping = false;
        this.isRolling = false;
        this.mesh.rotation.y = Math.PI;
        this.mesh.rotation.x = 0;
        this.mesh.rotation.z = 0;
        this.targetBankZ = 0;
        this.mesh.visible = true;
        this.isFlying = false;
        this.jetpackMesh.visible = false;
        this.isMagnetActive = false;
        this.magnetMesh.visible = false;
        this.deactivateSuperSneakers();
        this.deactivateHoverboard();
    }

    changeLane(dir) {
        if (this.lane + dir > 1 || this.lane + dir < -1) return;
        this.lane += dir;
        this.targetX = this.lane * CONFIG.laneWidth;
        
        // Slight tilt effect
        this.targetBankZ = -dir * 0.24;
        setTimeout(() => { this.targetBankZ = 0; }, 260);
    }

    jump() {
        if (!this.isJumping && !this.isRolling && !this.isFlying && !this.isHovering) {
            this.yVelocity = this.isSuperSneakersActive ? CONFIG.jumpForceSuper : CONFIG.jumpForce;
            this.isJumping = true;
            SFX.play('jump');
        }
    }

    roll() {
        if (!this.isRolling && !this.isFlying && !this.isHovering) {
            this.isRolling = true;
            this.rollTimer = 0.6; // Duration
            
            if (this.isJumping) {
                this.yVelocity = -20; // Fast drop
            }

            // Visual dive
            this.mesh.scale.y = 0.72;
            SFX.play('roll');
        }
    }

    activateJetpack() {
        this.isFlying = true;
        this.jetpackMesh.visible = true;
        this.deactivateHoverboard(); // Can't hover and fly
        this.flyTimer = CONFIG.jetpackDuration;
        this.yVelocity = 0;
        this.isJumping = false;
        this.isRolling = false;
        this.mesh.scale.y = 1; // Reset roll scale
        this.mesh.rotation.x = -0.2;
        SFX.play('jetpack');
    }

    activateMagnet() {
        this.isMagnetActive = true;
        this.magnetTimer = CONFIG.magnetDuration;
        this.magnetMesh.visible = true;
        SFX.play('powerup');
    }

    activateSuperSneakers() {
        this.isSuperSneakersActive = true;
        this.superSneakersTimer = CONFIG.superSneakersDuration;
        // Visuals: Overcharge thrusters
        this.shoeL.material = materials.superSneaker;
        this.shoeR.material = materials.superSneaker;
        this.shoeL.scale.set(1.2, 1.2, 1.55);
        this.shoeR.scale.set(1.2, 1.2, 1.55);
        SFX.play('powerup');
    }

    deactivateSuperSneakers() {
        this.isSuperSneakersActive = false;
        this.shoeL.material = materials.shoes;
        this.shoeR.material = materials.shoes;
        this.shoeL.scale.set(1, 1, 1);
        this.shoeR.scale.set(1, 1, 1);
    }

    activateHoverboard() {
        if (this.isFlying || this.isHovering) return;
        this.isHovering = true;
        this.hoverTimer = CONFIG.hoverboardDuration;
        this.hoverboardMesh.visible = true;
        this.isJumping = false;
        this.isRolling = false;
        this.mesh.scale.y = 1;
        SFX.play('hover_start');
    }

    deactivateHoverboard() {
        this.isHovering = false;
        this.hoverboardMesh.visible = false;
    }

    handleCollision() {
        if (this.isHovering) {
            this.deactivateHoverboard();
            this.invincibleTimer = 1.0; // 1 second invincibility
            SFX.play('crash'); // Break sound
            // Visual feedback for break could go here
            return true; // Saved!
        }
        return false; // Dead
    }

    update(dt, speedMultiplier) {
        // Update ground height based on world state
        if (worldChunkManager) {
            this.groundY = worldChunkManager.getGroundHeight(this);
        }

        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
            this.mesh.visible = Math.floor(this.invincibleTimer * 20) % 2 === 0; // Flicker
        } else {
            this.mesh.visible = true;
        }

        // X Movement (Lerp for smooth lane switch)
        this.currentX += (this.targetX - this.currentX) * CONFIG.laneSwitchSpeed * dt;
        this.mesh.position.x = this.currentX;

        // Y Movement
        if (this.isFlying) {
            this.flyTimer -= dt;
            // Smoothly rise to jetpack height
            this.mesh.position.y += (CONFIG.jetpackHeight - this.mesh.position.y) * 5 * dt;
            if (this.flyTimer <= 0) this.isFlying = false; // Drop
        } else if (this.isHovering) {
            this.hoverTimer -= dt;
            if (this.hoverTimer <= 0) this.deactivateHoverboard();
            
            // Hover physics (float above ground)
            const hoverY = this.groundY + 0.5 + Math.sin(clock.getElapsedTime() * 10) * 0.1;
            this.mesh.position.y += (hoverY - this.mesh.position.y) * 10 * dt;
            this.yVelocity = 0;
        } else if (this.isJumping) {
            // Jumping Physics
            this.yVelocity += CONFIG.gravity * dt;
            this.mesh.position.y += this.yVelocity * dt;

            if (this.mesh.position.y <= this.groundY) {
                this.mesh.position.y = this.groundY;
                this.isJumping = false;
                this.yVelocity = 0;
            }
        } else {
            // Ground / Falling Logic
            if (this.mesh.position.y > this.groundY) {
                // Falling (e.g. walked off train)
                this.yVelocity += CONFIG.gravity * dt;
                this.mesh.position.y += this.yVelocity * dt;
                if (this.mesh.position.y <= this.groundY) {
                    this.mesh.position.y = this.groundY;
                    this.yVelocity = 0;
                }
            } else if (this.mesh.position.y < this.groundY) {
                // Snap up if ground rises (ramp)
                this.mesh.position.y = this.groundY;
                this.yVelocity = 0;
            }
        }

        // Magnet Timer
        if (this.isMagnetActive) {
            this.magnetTimer -= dt;
            this.magnetMesh.rotation.z += 5 * dt; // Spin halo
            if (this.magnetTimer <= 0) {
                this.isMagnetActive = false;
                this.magnetMesh.visible = false;
            }
        }

        // Super Sneakers Timer
        if (this.isSuperSneakersActive) {
            this.superSneakersTimer -= dt;
            if (this.superSneakersTimer <= 0) {
                this.deactivateSuperSneakers();
            }
        }

        // Rolling logic
        if (this.isRolling) {
            this.rollTimer -= dt;
            if (this.rollTimer <= 0) {
                this.isRolling = false;
                this.mesh.scale.y = 1;
                if(this.mesh.position.y <= this.groundY) this.mesh.position.y = this.groundY;
            }
        }

        // Thruster pulse (glow cones + exhaust cores flicker)
        const elapsed = clock.getElapsedTime();
        const thrusterPulse = 1 + Math.sin(elapsed * 22) * 0.2;
        const corePulse = 1 + Math.sin(elapsed * 30 + 1.5) * 0.25;
        this.thrusterGlowL.scale.set(1, 1, thrusterPulse);
        this.thrusterGlowR.scale.set(1, 1, thrusterPulse);
        if (this.thrustCoreL) {
            this.thrustCoreL.scale.set(corePulse, corePulse, thrusterPulse * 0.9);
            this.thrustCoreR.scale.set(corePulse, corePulse, thrusterPulse * 0.9);
        }

        // Ship animation states
        if (!this.isJumping && !this.isRolling && !this.isFlying && !this.isHovering) {
            this.animTime += dt * 15 * speedMultiplier;
            const t = this.animTime;
            this.mesh.position.y = this.groundY + Math.abs(Math.sin(t * 2)) * 0.08;
            this.mesh.rotation.x += (-0.05 - this.mesh.rotation.x) * 0.12;
            const bankTarget = this.targetBankZ + Math.sin(t) * 0.03;
            this.mesh.rotation.z += (bankTarget - this.mesh.rotation.z) * 0.18;
        } else {
            const statePitch = this.isRolling ? -0.5 : (this.isFlying ? -0.22 : -0.12);
            this.mesh.rotation.x += (statePitch - this.mesh.rotation.x) * 0.16;
            this.mesh.rotation.z += (this.targetBankZ * 0.6 - this.mesh.rotation.z) * 0.12;
        }
    }

    getHitbox() {
        // Returns a simplified box for collision
        return new THREE.Box3().setFromObject(this.mesh);
    }
}

function createPlayer() {
    player = new Player();
}

// --- WORLD GENERATION SYSTEM ---
class WorldManager {
    constructor() {
        this.obstacles = [];
        this.coins = [];
        this.powerups = [];
        this.decorations = [];
        this.buildings = [];
        this.trees = [];
        this.bushes = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.5; // Seconds
        this.railLines = [];
        this.runwayLights = [];
        this.runwayLightStartZ = -160;
        this.runwayLightEndZ = 20;
        this.runwayLightSpacing = 12;
        this.runwayLightLoopDistance = (this.runwayLightEndZ - this.runwayLightStartZ) + this.runwayLightSpacing;
        
        this.createRails();
        this.createRunwayLights();
    }

    createRails() {
        const railPlaneGeo = new THREE.PlaneGeometry(CONFIG.pathWidth, 200);
        railPlaneGeo.rotateX(-Math.PI/2);

        const trackPlane = new THREE.Mesh(railPlaneGeo, materials.track);
        trackPlane.position.set(0, 0.02, -50);
        trackPlane.receiveShadow = true;
        scene.add(trackPlane);
        this.railLines.push(trackPlane);
    }

    createRunwayLights() {
        const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8);
        const bulbGeo = new THREE.SphereGeometry(0.07, 12, 10);
        const glowGeo = new THREE.SphereGeometry(0.16, 12, 10);
        const sideX = CONFIG.pathWidth / 2 + 0.55;

        for (let z = this.runwayLightStartZ; z <= this.runwayLightEndZ; z += this.runwayLightSpacing) {
            [-sideX, sideX].forEach((x, sideIdx) => {
                const group = new THREE.Group();

                const post = new THREE.Mesh(postGeo, materials.runwayPost);
                post.position.y = 0.12;
                group.add(post);

                const bulb = new THREE.Mesh(bulbGeo, materials.runwayBulb);
                bulb.position.y = 0.25;
                group.add(bulb);

                const glow = new THREE.Mesh(glowGeo, materials.runwayBulbGlow);
                glow.position.y = 0.25;
                group.add(glow);

                group.position.set(x, 0.02, z);
                group.userData.phase = (Math.abs(z) * 0.12) + (sideIdx * 0.8);
                group.userData.bulb = bulb;
                group.userData.glow = glow;

                scene.add(group);
                this.runwayLights.push(group);
            });
        }
    }

    resetRunwayLights() {
        let idx = 0;
        const sideX = CONFIG.pathWidth / 2 + 0.55;
        for (let z = this.runwayLightStartZ; z <= this.runwayLightEndZ; z += this.runwayLightSpacing) {
            const left = this.runwayLights[idx++];
            const right = this.runwayLights[idx++];
            if (left) left.position.set(-sideX, 0.02, z);
            if (right) right.position.set(sideX, 0.02, z);
        }
    }

    reset() {
        this.obstacles.forEach(o => scene.remove(o.mesh));
        this.coins.forEach(c => scene.remove(c.mesh));
        this.powerups.forEach(p => scene.remove(p.mesh));
        this.buildings.forEach(b => scene.remove(b));
        this.trees.forEach(t => scene.remove(t));
        this.bushes.forEach(b => scene.remove(b));
        this.obstacles = [];
        this.coins = [];
        this.powerups = [];
        this.buildings = [];
        this.trees = [];
        this.bushes = [];
        this.mysteryBoxes = [];
        this.spawnTimer = 0;
        this.resetRunwayLights();
    }

    update(dt, speed) {
        // Move Environment towards player (Scroll Z)
        const moveDist = speed * dt;

        // Runway side bulbs (airport-style approach lights)
        const t = clock.getElapsedTime();
        for (let i = 0; i < this.runwayLights.length; i++) {
            const light = this.runwayLights[i];
            light.position.z += moveDist;
            if (light.position.z > this.runwayLightEndZ) {
                light.position.z -= this.runwayLightLoopDistance;
            }
            const pulse = 0.65 + Math.abs(Math.sin((t * 5) + light.userData.phase)) * 0.7;
            light.userData.bulb.material.emissiveIntensity = 0.55 + pulse * 0.9;
            light.userData.glow.material.opacity = 0.22 + pulse * 0.32;
            const glowScale = 0.92 + pulse * 0.28;
            light.userData.glow.scale.set(glowScale, glowScale, glowScale);
        }

        // Spawn Buildings (increased frequency for more city feel)
        if (Math.random() < 0.12) this.spawnBuilding();
        // Spawn Trees beside left/right area
        if (Math.random() < 0.1) this.spawnTree();

        // Spawn Obstacles
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnPattern();
            // Interval decreases as speed increases
            this.spawnInterval = Math.max(0.4, 1.1 - (speedMultiplier - 1) * 0.45); 
            this.spawnTimer = this.spawnInterval;
        }

        // Update Obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            let obs = this.obstacles[i];
            obs.mesh.position.z += moveDist;

            // Animate tumbling asteroid chunks
            if (obs.mesh.userData.isMinefield) {
                const astT = clock.getElapsedTime();
                obs.mesh.children.forEach(chunk => {
                    if (chunk.userData.spinX !== undefined) {
                        chunk.rotation.x += chunk.userData.spinX * dt;
                        chunk.rotation.y += chunk.userData.spinY * dt;
                        chunk.position.y = chunk.userData.baseY + Math.sin(astT * 2.0 + chunk.userData.bobPhase) * chunk.userData.bobAmp;
                        // Animate orbiting debris
                        chunk.children.forEach(child => {
                            if (child.userData.isDebris) {
                                child.userData.orbitAngle += child.userData.orbitSpeed * dt;
                                child.position.x = Math.cos(child.userData.orbitAngle) * child.userData.orbitRadius;
                                child.position.z = Math.sin(child.userData.orbitAngle) * child.userData.orbitRadius;
                            }
                        });
                    }
                });
            }

            // Cleanup
            if (obs.mesh.position.z > 10) {
                scene.remove(obs.mesh);
                this.obstacles.splice(i, 1);
                continue;
            }

            // Collision Check
            if (this.checkCollision(player, obs)) {
                if (player.invincibleTimer > 0) {
                    // Invincible, ignore
                } else if (!player.handleCollision()) {
                    triggerGameOver();
                }
            }
        }

        // Update Mystery Boxes
        for (let i = this.mysteryBoxes.length - 1; i >= 0; i--) {
            let box = this.mysteryBoxes[i];
            box.mesh.position.z += moveDist;
            box.mesh.rotation.y += 2 * dt;
            if (box.mesh.position.z > 5) {
                scene.remove(box.mesh);
                this.mysteryBoxes.splice(i, 1);
            } else if (this.checkPowerupCollision(player, box)) {
                scene.remove(box.mesh);
                this.mysteryBoxes.splice(i, 1);
                collectMysteryBox();
            }
        }

        // Update Powerups
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            let p = this.powerups[i];
            p.mesh.position.z += moveDist;
            p.mesh.rotation.y += 2 * dt;

            if (p.mesh.position.z > 5) {
                scene.remove(p.mesh);
                this.powerups.splice(i, 1);
                continue;
            }

            if (this.checkPowerupCollision(player, p)) {
                scene.remove(p.mesh);
                this.powerups.splice(i, 1);
                
                if (p.type === 'JETPACK') player.activateJetpack();
                else if (p.type === 'MAGNET') player.activateMagnet();
                else if (p.type === 'SNEAKERS') player.activateSuperSneakers();
            }
        }

        // Update Buildings
        for (let i = this.buildings.length - 1; i >= 0; i--) {
            let b = this.buildings[i];
            b.position.z += moveDist;
            if (b.position.z > 20) {
                scene.remove(b);
                this.buildings.splice(i, 1);
            }
        }

        // Update Trees
        for (let i = this.trees.length - 1; i >= 0; i--) {
            const treeObj = this.trees[i];
            treeObj.position.z += moveDist;

            if (treeObj.userData && treeObj.userData.isFloatingCrystal) {
                const shimmerT = clock.getElapsedTime();
                treeObj.position.y = treeObj.userData.baseY + Math.sin(shimmerT * treeObj.userData.bobSpeed + treeObj.userData.phase) * treeObj.userData.bobAmp;
                treeObj.rotation.y += dt * treeObj.userData.spinSpeed;
                treeObj.userData.shards.forEach((s, idx) => {
                    s.mesh.rotation.y += dt * (0.45 + idx * 0.08);
                    if (s.mesh.material && s.mesh.material.emissiveIntensity !== undefined) {
                        s.mesh.material.emissiveIntensity = s.baseEmissive + Math.sin(shimmerT * s.shimmerSpeed + s.phase) * s.shimmerAmp;
                    }
                    if (s.glow && s.glow.material) {
                        s.glow.material.opacity = 0.16 + Math.abs(Math.sin(shimmerT * s.shimmerSpeed + s.phase)) * 0.22;
                    }
                });
            }

            if (treeObj.position.z > 20) {
                scene.remove(treeObj);
                this.trees.splice(i, 1);
            }
        }


        // Update Energy Orbs (coins)
        const elapsed = clock.getElapsedTime();
        for (let i = this.coins.length - 1; i >= 0; i--) {
            let coin = this.coins[i];
            coin.mesh.position.z += moveDist;

            if (coin.mesh.position.z > 5) {
                scene.remove(coin.mesh);
                this.coins.splice(i, 1);
                continue;
            }

            // Animate energy orb: spin core, rotate ring, bob, pulse glow
            const ud = coin.mesh.userData;
            if (ud.orbCore) {
                ud.orbCore.rotation.x += 3.0 * dt;
                ud.orbCore.rotation.y += 2.2 * dt;
            }
            if (ud.orbShell) {
                ud.orbShell.rotation.y -= 1.0 * dt;
                ud.orbShell.rotation.z += 0.6 * dt;
            }
            if (ud.orbRing) {
                ud.orbRing.rotation.z += 2.5 * dt;
                ud.orbRing.rotation.x += 0.8 * dt;
            }
            if (ud.orbGlow && ud.orbGlow.material) {
                ud.orbGlow.material.opacity = 0.14 + Math.sin(elapsed * 4 + (ud.bobPhase || 0)) * 0.06;
            }
            // Gentle bobbing
            if (ud.baseY !== undefined) {
                coin.mesh.position.y = ud.baseY + Math.sin(elapsed * 3 + (ud.bobPhase || 0)) * 0.15;
            }

            // Magnet Attraction
            if (player.isMagnetActive) {
                const pPos = player.mesh.position.clone();
                pPos.y += 1; // Center
                if (coin.mesh.position.distanceTo(pPos) < CONFIG.magnetRange) {
                    const dir = new THREE.Vector3().subVectors(pPos, coin.mesh.position).normalize();
                    coin.mesh.position.add(dir.multiplyScalar(40 * dt));
                }
            }

            // Simple distance check for coins
            if (Math.abs(coin.mesh.position.z - player.mesh.position.z) < 1.5 &&
                Math.abs(coin.mesh.position.x - player.currentX) < 1.0 &&
                Math.abs(coin.mesh.position.y - player.mesh.position.y) < 1.5) {
                
                // Collect
                scene.remove(coin.mesh);
                this.coins.splice(i, 1);
                addCoin();
                SFX.play('coin');
            }
        }
    }

    getGroundHeight(player) { // Rewritten for clarity and correctness
        let groundY = 0;
        const playerX = player.currentX;
        const playerZ = 0; // Player is at a fixed Z

        for (const obs of this.obstacles) {
            if (obs.type !== 'CRUISER' || !obs.mesh) continue;

            // Check if player is horizontally aligned with the obstacle
            if (Math.abs(obs.mesh.position.x - playerX) > obs.width / 2) {
                continue;
            }

            const obsZ = obs.mesh.position.z;
            const cruiserHeight = obs.height;
            const cruiserDepth = obs.depth;

            // Relative Z distance of the player (at z=0) to the obstacle's center (at obsZ)
            const relZ = playerZ - obsZ;

            // Check if player is on the cruiser roof
            if (relZ <= cruiserDepth / 2 && relZ >= -cruiserDepth / 2) {
                groundY = Math.max(groundY, cruiserHeight);
            }
        }
        return groundY;
    }

    spawnPattern() {
        // Decide random lane
        const lanes = [-1, 0, 1];
        const type = Math.random();

        // 12% Chance for Powerup or Mystery Box
        if (Math.random() < 0.12) {
            const lane = lanes[Math.floor(Math.random() * lanes.length)];
            const r = Math.random();
            if (r < 0.25) {
                this.spawnJetpackItem(lane);
            } else if (r < 0.5) {
                this.spawnMysteryBox(lane);
            } else if (r < 0.75) {
                this.spawnMagnetItem(lane);
            } else {
                this.spawnSneakersItem(lane);
            }
            return; // Skip obstacle spawn if lucky
        }

        // 35% chance for lane cruiser
        if (type < 0.35) {
            const lane = lanes[Math.floor(Math.random() * lanes.length)];
            this.spawnCruiser(lane);
        } else {
            // Hazard gates
            // Pick 1 or 2 lanes to block
            const numBlock = Math.floor(Math.random() * 2) + 1;
            const blockedLanes = [];
            
            for(let i=0; i<numBlock; i++) {
                let lane = lanes[Math.floor(Math.random() * lanes.length)];
                if(!blockedLanes.includes(lane)) {
                    blockedLanes.push(lane);
                    
                    if (Math.random() > 0.5) this.spawnAsteroidCluster(lane);
                    else this.spawnLaserGate(lane);
                }
            }

            // Spawn coins in the free lane
            const freeLanes = lanes.filter(l => !blockedLanes.includes(l));
            if (freeLanes.length > 0) {
                if (player.isFlying) {
                    this.spawnCoins(freeLanes[0], CONFIG.jetpackHeight);
                } else {
                    this.spawnCoins(freeLanes[0], 1);
                }
            }
        }
    }

    spawnCruiser(lane, zPos = -100) {
        const group = new THREE.Group();
        const x = lane * CONFIG.laneWidth;

        // === MAIN HULL (tapered front, wider rear) ===
        // Central fuselage
        const fuselage = new THREE.Mesh(geometries.box, materials.cruiserHull);
        fuselage.scale.set(2.2, 2.0, 14);
        fuselage.position.y = 2.0;
        fuselage.castShadow = true;
        group.add(fuselage);

        // Upper hull plating (slightly narrower, gives layered look)
        const upperHull = new THREE.Mesh(geometries.box, materials.cruiserHullAccent);
        upperHull.scale.set(1.8, 0.8, 12);
        upperHull.position.set(0, 3.4, 0);
        upperHull.castShadow = true;
        group.add(upperHull);

        // Lower keel (under-hull spine)
        const keel = new THREE.Mesh(geometries.box, materials.cruiserArmor);
        keel.scale.set(0.8, 0.5, 13);
        keel.position.set(0, 0.75, 0);
        keel.castShadow = true;
        group.add(keel);

        // === NOSE SECTION (tapered front, kept within hull bounds) ===
        const nose = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3.0, 4), materials.cruiserHull);
        nose.rotation.x = Math.PI / 2;
        nose.rotation.y = Math.PI / 4;
        nose.position.set(0, 2.0, 8.0);
        nose.castShadow = true;
        group.add(nose);

        // Nose accent plate
        const noseAccent = new THREE.Mesh(geometries.box, materials.cruiserArmor);
        noseAccent.scale.set(1.6, 0.35, 1.8);
        noseAccent.position.set(0, 2.8, 7.2);
        group.add(noseAccent);

        // === COCKPIT / BRIDGE ===
        const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), materials.cruiserCanopy);
        cockpit.scale.set(1.4, 0.7, 1.6);
        cockpit.position.set(0, 3.55, 5.0);
        group.add(cockpit);

        // Bridge frame around cockpit
        const bridgeFrame = new THREE.Mesh(geometries.box, materials.cruiserArmor);
        bridgeFrame.scale.set(1.6, 0.12, 1.8);
        bridgeFrame.position.set(0, 3.85, 5.0);
        group.add(bridgeFrame);

        // === SIDE ARMOR PANELS ===
        [-1, 1].forEach(side => {
            // Main side panel
            const sidePanel = new THREE.Mesh(geometries.box, materials.cruiserArmor);
            sidePanel.scale.set(0.2, 1.8, 10);
            sidePanel.position.set(side * 1.2, 2.0, -0.5);
            sidePanel.castShadow = true;
            group.add(sidePanel);

            // Upper side ridge
            const ridge = new THREE.Mesh(geometries.box, materials.cruiserHullAccent);
            ridge.scale.set(0.15, 0.4, 9);
            ridge.position.set(side * 1.15, 3.2, -0.5);
            group.add(ridge);
        });

        // === CARGO BAY SECTIONS (mid-body) ===
        [-1, 1].forEach(side => {
            for (let i = 0; i < 3; i++) {
                const cargo = new THREE.Mesh(geometries.box, materials.cruiserCargoPanel);
                cargo.scale.set(0.25, 1.2, 2.2);
                cargo.position.set(side * 1.35, 1.8, -3.5 + i * 3);
                group.add(cargo);

                // Cargo seam line
                const seam = new THREE.Mesh(geometries.box, materials.cruiserRunningLight);
                seam.scale.set(0.04, 0.04, 2.2);
                seam.position.set(side * 1.36, 2.45, -3.5 + i * 3);
                group.add(seam);
            }
        });

        // === ENGINE NACELLES (rear, flanking the hull) ===
        [-1, 1].forEach(side => {
            const nacelle = new THREE.Mesh(geometries.cylinder, materials.cruiserEngine);
            nacelle.scale.set(0.5, 4.0, 0.5);
            nacelle.rotation.x = Math.PI / 2;
            nacelle.position.set(side * 1.4, 1.5, -5.5);
            nacelle.castShadow = true;
            group.add(nacelle);

            // Engine housing / cowling
            const cowl = new THREE.Mesh(geometries.cylinder, materials.cruiserArmor);
            cowl.scale.set(0.6, 1.0, 0.6);
            cowl.rotation.x = Math.PI / 2;
            cowl.position.set(side * 1.4, 1.5, -7.0);
            group.add(cowl);

            // Thruster glow cone (visible from behind)
            const thrustGlow = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.8, 10), materials.cruiserThrustGlow);
            thrustGlow.rotation.x = -Math.PI / 2;
            thrustGlow.position.set(side * 1.4, 1.5, -8.0);
            group.add(thrustGlow);

            // Inner bright core
            const thrustCore = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.2, 8), materials.cruiserThrustCore);
            thrustCore.rotation.x = -Math.PI / 2;
            thrustCore.position.set(side * 1.4, 1.5, -7.8);
            group.add(thrustCore);

            // Engine nozzle ring
            const nozzleRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 8, 16), materials.cruiserRunningLight);
            nozzleRing.rotation.y = Math.PI / 2;
            nozzleRing.position.set(side * 1.4, 1.5, -7.5);
            group.add(nozzleRing);
        });

        // === RUNNING LIGHTS (neon strips along hull edges) ===
        // Top spine light
        const spineLight = new THREE.Mesh(geometries.box, materials.cruiserRunningLight);
        spineLight.scale.set(0.06, 0.06, 11);
        spineLight.position.set(0, 3.82, -0.5);
        group.add(spineLight);

        // Bottom keel light
        const keelLight = new THREE.Mesh(geometries.box, materials.cruiserRunningLight);
        keelLight.scale.set(0.06, 0.06, 10);
        keelLight.position.set(0, 0.5, -0.5);
        group.add(keelLight);

        // Side running lights (horizontal strips)
        [-1, 1].forEach(side => {
            const sideStrip = new THREE.Mesh(geometries.box, materials.cruiserRunningLight);
            sideStrip.scale.set(0.04, 0.04, 12);
            sideStrip.position.set(side * 1.12, 2.9, -0.5);
            group.add(sideStrip);
        });

        // === NAVIGATION LIGHTS (wing tips) ===
        // Port = red, Starboard = green (space convention nod)
        const navRed = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), materials.cruiserRedLight);
        navRed.position.set(-1.4, 2.0, 5.5);
        group.add(navRed);

        const navGreen = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshStandardMaterial({
            color: 0x33ff55, emissive: 0x22dd44, emissiveIntensity: 1.2, roughness: 0.1
        }));
        navGreen.position.set(1.4, 2.0, 5.5);
        group.add(navGreen);

        // === REAR FIN / STABILIZER ===
        const fin = new THREE.Mesh(geometries.box, materials.cruiserHullAccent);
        fin.scale.set(0.1, 1.8, 2.5);
        fin.position.set(0, 3.8, -5.5);
        fin.castShadow = true;
        group.add(fin);

        // Fin tip light
        const finLight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), materials.cruiserRunningLight);
        finLight.position.set(0, 4.7, -5.5);
        group.add(finLight);

        // === SENSOR ARRAY (top, behind cockpit) ===
        const sensorBase = new THREE.Mesh(geometries.cylinder, materials.cruiserArmor);
        sensorBase.scale.set(0.15, 0.4, 0.15);
        sensorBase.position.set(0, 4.0, 2.5);
        group.add(sensorBase);

        const sensorDish = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), materials.cruiserArmor);
        sensorDish.position.set(0, 4.2, 2.5);
        sensorDish.rotation.x = 0.2;
        group.add(sensorDish);

        // === FRONT HEADLIGHTS (flush-mounted on nose) ===
        [-0.5, 0.5].forEach(px => {
            const headlight = new THREE.Mesh(geometries.box, materials.cruiserRunningLight);
            headlight.scale.set(0.2, 0.12, 0.12);
            headlight.position.set(px, 2.0, 7.0);
            group.add(headlight);
        });

        group.position.set(x, 0, zPos);
        scene.add(group);

        this.obstacles.push({
            mesh: group,
            type: 'CRUISER',
            lane: lane,
            width: 2.5,
            height: 4,
            depth: 15
        });

        // Coins above cruiser
        if (Math.random() > 0.5) {
            for (let i = 0; i < 5; i++) {
                this.createCoin(x, 5.5, zPos + (i * 2.5));
            }
        }
    }

    spawnAsteroidCluster(lane) {
        // Tumbling asteroid chunk (jump over to avoid)
        const group = new THREE.Group();
        const x = lane * CONFIG.laneWidth;

        const asteroid = new THREE.Group();

        // Main rock body — irregular shape from merged geometry
        const rockMats = [materials.asteroidRock, materials.asteroidRockLight];

        // Large primary chunk (dodecahedron for a craggy look)
        const mainRock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.85, 1),
            rockMats[0]
        );
        mainRock.scale.set(1.3, 0.85, 0.95);
        // Deform vertices slightly for organic feel
        const pos = mainRock.geometry.attributes.position;
        for (let v = 0; v < pos.count; v++) {
            pos.setXYZ(v,
                pos.getX(v) * (0.85 + Math.random() * 0.3),
                pos.getY(v) * (0.85 + Math.random() * 0.3),
                pos.getZ(v) * (0.85 + Math.random() * 0.3)
            );
        }
        pos.needsUpdate = true;
        mainRock.geometry.computeVertexNormals();
        mainRock.castShadow = true;
        asteroid.add(mainRock);

        // Secondary chunk fused to the side
        const chunk2 = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.5, 0),
            rockMats[1]
        );
        chunk2.position.set(0.6, 0.3, 0.2);
        chunk2.rotation.set(0.5, 0.8, 0.3);
        chunk2.scale.set(1.1, 0.8, 0.9);
        asteroid.add(chunk2);

        // Third small chunk on other side
        const chunk3 = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.35, 0),
            rockMats[0]
        );
        chunk3.position.set(-0.5, -0.2, -0.3);
        chunk3.rotation.set(1.2, 0.4, 0.7);
        asteroid.add(chunk3);

        // Glowing crack lines (thin emissive strips on surface)
        const crackGeo = new THREE.BoxGeometry(0.04, 0.5, 0.04);
        for (let c = 0; c < 5; c++) {
            const crack = new THREE.Mesh(crackGeo, materials.asteroidCrack);
            const angle = (c / 5) * Math.PI * 2 + Math.random() * 0.5;
            const r = 0.6 + Math.random() * 0.3;
            crack.position.set(
                Math.cos(angle) * r * 0.7,
                (Math.random() - 0.5) * 0.8,
                Math.sin(angle) * r * 0.7
            );
            crack.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            crack.scale.y = 0.5 + Math.random() * 1.0;
            asteroid.add(crack);
        }

        // Faint outer heat glow (from re-entry / energy)
        const glowMesh = new THREE.Mesh(
            new THREE.SphereGeometry(1.2, 12, 12),
            materials.asteroidGlow
        );
        asteroid.add(glowMesh);

        // Small orbiting debris (tiny rocks circling)
        for (let d = 0; d < 3; d++) {
            const debris = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.08 + Math.random() * 0.08, 0),
                rockMats[Math.floor(Math.random() * 2)]
            );
            const da = (d / 3) * Math.PI * 2;
            const dr = 1.1 + Math.random() * 0.3;
            debris.position.set(Math.cos(da) * dr, (Math.random() - 0.5) * 0.4, Math.sin(da) * dr);
            debris.userData.orbitAngle = da;
            debris.userData.orbitRadius = dr;
            debris.userData.orbitSpeed = 1.5 + Math.random() * 1.0;
            debris.userData.orbitY = debris.position.y;
            debris.userData.isDebris = true;
            asteroid.add(debris);
        }

        asteroid.position.set(0, 0.85, 0);

        // Tumble data for animation
        asteroid.userData.spinX = (0.4 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1);
        asteroid.userData.spinY = (0.5 + Math.random() * 0.6) * (Math.random() > 0.5 ? 1 : -1);
        asteroid.userData.bobPhase = Math.random() * Math.PI * 2;
        asteroid.userData.bobAmp = 0.1;
        asteroid.userData.baseY = asteroid.position.y;

        group.add(asteroid);

        // Tag for rotation animation in update loop
        group.userData.isMinefield = true;

        group.position.set(x, 0, -100);
        scene.add(group);

        this.obstacles.push({
            mesh: group,
            type: 'ASTEROID',
            lane: lane,
            width: 2.5,
            height: 1.0,
            depth: 0.5
        });
    }

    spawnLaserGate(lane) {
        // Plasma Pillar Gate (Must Roll to slide under the beam)
        const group = new THREE.Group();
        const x = lane * CONFIG.laneWidth;
        const pillarSpacing = 1.25;
        const pillarH = 3.2;

        // --- Build two plasma pillars ---
        [-pillarSpacing, pillarSpacing].forEach(px => {
            // Armored base pedestal
            const base = new THREE.Mesh(geometries.cylinder, materials.plasmaPillarBase);
            base.scale.set(0.32, 0.25, 0.32);
            base.position.set(px, 0.12, 0);
            base.castShadow = true;
            group.add(base);

            // Main pillar tube (translucent plasma outer shell)
            const tubeOuter = new THREE.Mesh(geometries.cylinder, materials.plasmaTubeOuter);
            tubeOuter.scale.set(0.18, pillarH, 0.18);
            tubeOuter.position.set(px, pillarH / 2, 0);
            group.add(tubeOuter);

            // Inner plasma core (bright, additive)
            const tubeInner = new THREE.Mesh(geometries.cylinder, materials.plasmaTubeInner);
            tubeInner.scale.set(0.08, pillarH, 0.08);
            tubeInner.position.set(px, pillarH / 2, 0);
            group.add(tubeInner);

            // Pillar ambient glow (larger soft halo)
            const glow = new THREE.Mesh(geometries.cylinder, materials.plasmaGlow);
            glow.scale.set(0.35, pillarH * 0.9, 0.35);
            glow.position.set(px, pillarH / 2, 0);
            group.add(glow);

            // Neon rings along the pillar (3 rings)
            for (let r = 0; r < 3; r++) {
                const ringY = 0.6 + r * (pillarH - 0.8) / 2;
                const ring = new THREE.Mesh(
                    new THREE.TorusGeometry(0.22, 0.025, 8, 20),
                    materials.plasmaPillarRing
                );
                ring.rotation.x = Math.PI / 2;
                ring.position.set(px, ringY, 0);
                group.add(ring);
            }

            // Top cap emitter
            const cap = new THREE.Mesh(geometries.cylinder, materials.plasmaPillarBase);
            cap.scale.set(0.28, 0.18, 0.28);
            cap.position.set(px, pillarH + 0.09, 0);
            group.add(cap);

            // Top emitter glow orb
            const topOrb = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 10, 10),
                materials.plasmaPillarRing
            );
            topOrb.position.set(px, pillarH + 0.22, 0);
            group.add(topOrb);
        });

        // --- Horizontal plasma beam connecting the two pillars ---
        const beamY = 2.5; // Height of the beam (player must roll under)
        const beamLen = pillarSpacing * 2;

        // Outer beam glow
        const beam = new THREE.Mesh(geometries.box, materials.plasmaBeam);
        beam.scale.set(beamLen, 0.22, 0.22);
        beam.position.y = beamY;
        group.add(beam);

        // Inner bright beam core
        const beamCore = new THREE.Mesh(geometries.box, materials.plasmaBeamCore);
        beamCore.scale.set(beamLen, 0.08, 0.08);
        beamCore.position.y = beamY;
        group.add(beamCore);

        // Beam halo (larger soft glow)
        const beamHalo = new THREE.Mesh(geometries.box, materials.plasmaGlow);
        beamHalo.scale.set(beamLen + 0.2, 0.5, 0.5);
        beamHalo.position.y = beamY;
        group.add(beamHalo);

        // Small energy sparks at beam-pillar junctions
        [-pillarSpacing, pillarSpacing].forEach(px => {
            const spark = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 8, 8),
                materials.plasmaBeamCore
            );
            spark.position.set(px, beamY, 0);
            group.add(spark);
        });

        group.position.set(x, 0, -100);
        scene.add(group);

        this.obstacles.push({
            mesh: group,
            type: 'LASER_GATE',
            lane: lane,
            width: 2.5,
            height: 3.0,
            bottomGap: 2.0, // Can slide under
            depth: 0.2
        });
    }

    spawnCoins(lane, y = 1) {
        const x = lane * CONFIG.laneWidth;
        for(let i=0; i<5; i++) {
            this.createCoin(x, y, -100 - (i * 3));
        }
    }

    createCoin(x, y, z) {
        const group = new THREE.Group();

        // Outer glow sphere
        const glow = new THREE.Mesh(geometries.orbGlow, materials.orbGlow);
        group.add(glow);

        // Translucent energy shell (octahedron)
        const shell = new THREE.Mesh(geometries.orbShell, materials.orbShell);
        group.add(shell);

        // Inner plasma cube core
        const core = new THREE.Mesh(geometries.orbCore, materials.orbCore);
        group.add(core);

        // Orbiting ring
        const ring = new THREE.Mesh(geometries.orbRing, materials.orbRing);
        ring.rotation.x = Math.PI / 3;
        group.add(ring);

        group.position.set(x, y, z);
        // Store refs for animation
        group.userData.orbCore = core;
        group.userData.orbShell = shell;
        group.userData.orbRing = ring;
        group.userData.orbGlow = glow;
        group.userData.bobPhase = Math.random() * Math.PI * 2;
        group.userData.baseY = y;
        scene.add(group);
        this.coins.push({ mesh: group });
    }

    spawnJetpackItem(lane) {
        const x = lane * CONFIG.laneWidth;
        const group = new THREE.Group();
        
        // Visual representation of pickup
        const jp = new THREE.Mesh(geometries.jetpack, materials.jetpack);
        jp.rotation.z = Math.PI / 4;
        group.add(jp);

        group.position.set(x, 1.5, -100);
        scene.add(group);
        
        this.powerups.push({ mesh: group, type: 'JETPACK' });
    }

    spawnMagnetItem(lane) {
        const x = lane * CONFIG.laneWidth;
        const group = new THREE.Group();
        
        // Visual representation (tractor ring)
        const mag = new THREE.Mesh(geometries.magnet, materials.magnet);
        mag.rotation.z = Math.PI; // U shape up
        group.add(mag);

        group.position.set(x, 1.5, -100);
        scene.add(group);
        
        this.powerups.push({ mesh: group, type: 'MAGNET' });
    }

    spawnSneakersItem(lane) {
        const x = lane * CONFIG.laneWidth;
        const group = new THREE.Group();
        
        // Visual representation (booster core)
        const core = new THREE.Mesh(geometries.box, materials.superSneaker);
        core.scale.set(0.65, 0.65, 0.65);
        core.rotation.y = -Math.PI / 4;
        group.add(core);

        group.position.set(x, 1.5, -100);
        scene.add(group);
        
        this.powerups.push({ mesh: group, type: 'SNEAKERS' });
    }

    spawnMysteryBox(lane) {
        const x = lane * CONFIG.laneWidth;
        const group = new THREE.Group();
        
        const box = new THREE.Mesh(geometries.box, materials.mysteryBox);
        box.scale.set(0.8, 0.8, 0.8);
        box.rotation.y = Math.PI / 4;
        group.add(box);

        group.position.set(x, 1.5, -100);
        scene.add(group);
        this.mysteryBoxes.push({ mesh: group });
    }

    spawnBuilding() {
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = side * (15 + Math.random() * 10);
        const group = new THREE.Group();

        // Pick a random space center variant
        const variant = Math.floor(Math.random() * 4);

        if (variant === 0) {
            // --- TIERED TOWER: stepped layers with neon trim ---
            const tiers = 3 + Math.floor(Math.random() * 3);
            let curY = 0;
            let curW = 5 + Math.random() * 3;
            let curD = 5 + Math.random() * 3;
            const trimMats = [materials.neonTrimCyan, materials.neonTrimPurple, materials.neonTrimBlue];

            for (let t = 0; t < tiers; t++) {
                const tierH = 3 + Math.random() * 4;
                const hullMat = t % 2 === 0 ? materials.spaceHull : materials.spaceHullLight;
                const tier = new THREE.Mesh(geometries.box, hullMat);
                tier.scale.set(curW, tierH, curD);
                tier.position.y = curY + tierH / 2;
                tier.castShadow = true;
                group.add(tier);

                // Neon trim ring at top of tier
                const trim = new THREE.Mesh(geometries.box, trimMats[t % trimMats.length]);
                trim.scale.set(curW + 0.3, 0.15, curD + 0.3);
                trim.position.y = curY + tierH;
                group.add(trim);

                // Glow panels on front face
                const panelCount = Math.max(1, Math.floor(curW / 2));
                const panelGeo = new THREE.BoxGeometry(0.6, tierH * 0.5, 0.08);
                for (let p = 0; p < panelCount; p++) {
                    const panel = new THREE.Mesh(panelGeo, materials.spaceGlowPanel);
                    const px = -curW / 2 + (p + 0.5) * (curW / panelCount);
                    panel.position.set(px, curY + tierH / 2, curD / 2 + 0.05);
                    group.add(panel);
                }

                curY += tierH;
                curW *= (0.65 + Math.random() * 0.15);
                curD *= (0.65 + Math.random() * 0.15);
            }

            // Antenna spire on top
            const spireH = 3 + Math.random() * 4;
            const spire = new THREE.Mesh(geometries.cylinder, materials.spaceAntenna);
            spire.scale.set(0.12, spireH, 0.12);
            spire.position.y = curY + spireH / 2;
            group.add(spire);

            // Beacon light at tip
            const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), materials.neonTrimCyan);
            beacon.position.y = curY + spireH;
            group.add(beacon);

            group.position.set(x, 0, -100);

        } else if (variant === 1) {
            // --- CYLINDRICAL TOWER with ring platforms ---
            const baseR = 2.5 + Math.random() * 1.5;
            const totalH = 12 + Math.random() * 15;
            const body = new THREE.Mesh(geometries.cylinder, materials.spaceHull);
            body.scale.set(baseR, totalH, baseR);
            body.position.y = totalH / 2;
            body.castShadow = true;
            group.add(body);

            // Glowing rings around the cylinder
            const ringCount = 2 + Math.floor(Math.random() * 3);
            for (let r = 0; r < ringCount; r++) {
                const ringY = (totalH / (ringCount + 1)) * (r + 1);
                const ringGeo = new THREE.TorusGeometry(baseR + 0.6, 0.12, 8, 32);
                const ringMat = r % 2 === 0 ? materials.neonTrimCyan : materials.neonTrimPurple;
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.rotation.x = Math.PI / 2;
                ring.position.y = ringY;
                group.add(ring);

                // Glow halo
                const glowRingGeo = new THREE.TorusGeometry(baseR + 0.6, 0.35, 8, 32);
                const glowRing = new THREE.Mesh(glowRingGeo, materials.spaceRingGlow);
                glowRing.rotation.x = Math.PI / 2;
                glowRing.position.y = ringY;
                group.add(glowRing);
            }

            // Dome on top
            const dome = new THREE.Mesh(new THREE.SphereGeometry(baseR * 0.85, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), materials.spaceDome);
            dome.position.y = totalH;
            group.add(dome);

            // Antenna
            const spireH = 2 + Math.random() * 3;
            const spire = new THREE.Mesh(geometries.cylinder, materials.spaceAntenna);
            spire.scale.set(0.08, spireH, 0.08);
            spire.position.y = totalH + spireH / 2;
            group.add(spire);

            group.position.set(x, 0, -100);

        } else if (variant === 2) {
            // --- CONTROL TOWER: tall narrow tower with wide observation deck ---
            const towerW = 2 + Math.random() * 1.5;
            const towerD = 2 + Math.random() * 1.5;
            const shaftH = 10 + Math.random() * 12;

            // Shaft
            const shaft = new THREE.Mesh(geometries.box, materials.spaceHull);
            shaft.scale.set(towerW, shaftH, towerD);
            shaft.position.y = shaftH / 2;
            shaft.castShadow = true;
            group.add(shaft);

            // Neon trim lines up the shaft
            const lineCount = Math.floor(shaftH / 3);
            for (let l = 0; l < lineCount; l++) {
                const lineY = (l + 1) * (shaftH / (lineCount + 1));
                const trim = new THREE.Mesh(geometries.box, materials.neonTrimBlue);
                trim.scale.set(towerW + 0.2, 0.1, towerD + 0.2);
                trim.position.y = lineY;
                group.add(trim);
            }

            // Wide observation deck
            const deckW = towerW * 2.8;
            const deckD = towerD * 2.8;
            const deckH = 2.5 + Math.random() * 1.5;
            const deck = new THREE.Mesh(geometries.box, materials.spaceHullLight);
            deck.scale.set(deckW, deckH, deckD);
            deck.position.y = shaftH + deckH / 2;
            deck.castShadow = true;
            group.add(deck);

            // Cyan trim around the deck
            const deckTrim = new THREE.Mesh(geometries.box, materials.neonTrimCyan);
            deckTrim.scale.set(deckW + 0.3, 0.15, deckD + 0.3);
            deckTrim.position.y = shaftH;
            group.add(deckTrim);
            const deckTrimTop = new THREE.Mesh(geometries.box, materials.neonTrimPurple);
            deckTrimTop.scale.set(deckW + 0.3, 0.15, deckD + 0.3);
            deckTrimTop.position.y = shaftH + deckH;
            group.add(deckTrimTop);

            // Observation windows (front)
            const winCount = Math.max(2, Math.floor(deckW / 1.8));
            const winGeo = new THREE.BoxGeometry(0.8, deckH * 0.6, 0.08);
            for (let w = 0; w < winCount; w++) {
                const win = new THREE.Mesh(winGeo, materials.spaceDome);
                const wx = -deckW / 2 + (w + 0.5) * (deckW / winCount);
                win.position.set(wx, shaftH + deckH / 2, deckD / 2 + 0.05);
                group.add(win);
            }

            // Small dome on top of deck
            const topDome = new THREE.Mesh(new THREE.SphereGeometry(towerW * 0.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), materials.spaceDome);
            topDome.position.y = shaftH + deckH;
            group.add(topDome);

            // Antenna
            const antH = 2 + Math.random() * 2;
            const ant = new THREE.Mesh(geometries.cylinder, materials.spaceAntenna);
            ant.scale.set(0.06, antH, 0.06);
            ant.position.y = shaftH + deckH + antH / 2;
            group.add(ant);

            const tip = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), materials.neonTrimCyan);
            tip.position.y = shaftH + deckH + antH;
            group.add(tip);

            group.position.set(x, 0, -100);

        } else {
            // --- HANGAR / PLATFORM: wide low structure with glowing bay doors ---
            const baseW = 7 + Math.random() * 5;
            const baseD = 6 + Math.random() * 4;
            const baseH = 5 + Math.random() * 4;

            const base = new THREE.Mesh(geometries.box, materials.spaceHull);
            base.scale.set(baseW, baseH, baseD);
            base.position.y = baseH / 2;
            base.castShadow = true;
            group.add(base);

            // Neon trim at base and top
            const trimBot = new THREE.Mesh(geometries.box, materials.neonTrimCyan);
            trimBot.scale.set(baseW + 0.3, 0.15, baseD + 0.3);
            trimBot.position.y = 0.1;
            group.add(trimBot);
            const trimTop = new THREE.Mesh(geometries.box, materials.neonTrimPurple);
            trimTop.scale.set(baseW + 0.3, 0.15, baseD + 0.3);
            trimTop.position.y = baseH;
            group.add(trimTop);

            // Glowing bay doors on front
            const doorCount = 2 + Math.floor(Math.random() * 2);
            const doorW = (baseW * 0.8) / doorCount;
            const doorH = baseH * 0.65;
            const doorGeo = new THREE.BoxGeometry(doorW * 0.85, doorH, 0.1);
            for (let d = 0; d < doorCount; d++) {
                const door = new THREE.Mesh(doorGeo, materials.spaceGlowPanel);
                const dx = -baseW * 0.4 + (d + 0.5) * (baseW * 0.8 / doorCount);
                door.position.set(dx, doorH / 2 + 0.3, baseD / 2 + 0.06);
                group.add(door);
            }

            // Rooftop detail: small tower or dish
            if (Math.random() > 0.5) {
                // Small tower
                const tH = 3 + Math.random() * 3;
                const tower = new THREE.Mesh(geometries.box, materials.spaceHullLight);
                tower.scale.set(1.5, tH, 1.5);
                tower.position.set(0, baseH + tH / 2, 0);
                tower.castShadow = true;
                group.add(tower);

                const tTrim = new THREE.Mesh(geometries.box, materials.neonTrimBlue);
                tTrim.scale.set(1.8, 0.12, 1.8);
                tTrim.position.y = baseH + tH;
                group.add(tTrim);

                const ant = new THREE.Mesh(geometries.cylinder, materials.spaceAntenna);
                ant.scale.set(0.06, 2, 0.06);
                ant.position.y = baseH + tH + 1;
                group.add(ant);
            } else {
                // Satellite dish
                const dish = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), materials.spaceAntenna);
                dish.position.y = baseH + 0.1;
                dish.rotation.x = 0.3;
                group.add(dish);

                const dishRod = new THREE.Mesh(geometries.cylinder, materials.spaceAntenna);
                dishRod.scale.set(0.05, 1.8, 0.05);
                dishRod.position.set(0, baseH + 1.2, -0.5);
                dishRod.rotation.x = -0.3;
                group.add(dishRod);
            }

            group.position.set(x, 0, -100);
        }

        scene.add(group);
        this.buildings.push(group);
    }

    spawnTree() {
        // Floating space nav beacon / buoy
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = side * (6 + Math.random() * 5);
        const beacon = new THREE.Group();
        const shardData = [];

        // Pick a color theme
        const themes = [
            { body: 0x2244aa, ring: 0x55ccff, glow: 0x44bbff, emCol: 0x3399ee },
            { body: 0x5522aa, ring: 0xcc66ff, glow: 0xbb55ff, emCol: 0x9944ee },
            { body: 0x226644, ring: 0x55ffaa, glow: 0x44ee88, emCol: 0x33cc77 }
        ];
        const theme = themes[Math.floor(Math.random() * themes.length)];

        const bodyMat = new THREE.MeshStandardMaterial({
            color: theme.body, roughness: 0.3, metalness: 0.7, emissive: theme.body, emissiveIntensity: 0.15
        });
        const ringMat = new THREE.MeshStandardMaterial({
            color: theme.ring, emissive: theme.emCol, emissiveIntensity: 1.0, roughness: 0.1, metalness: 0.1
        });
        const glowMat = new THREE.MeshBasicMaterial({
            color: theme.glow, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending
        });

        // --- Central body (octahedron core) ---
        const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), bodyMat);
        body.castShadow = true;
        beacon.add(body);
        shardData.push({
            mesh: body,
            glow: null,
            baseEmissive: 0.15,
            shimmerAmp: 0.1,
            shimmerSpeed: 2.0 + Math.random() * 1.5,
            phase: Math.random() * Math.PI * 2
        });

        // --- Orbiting ring 1 (horizontal) ---
        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.03, 8, 32), ringMat.clone());
        ring1.rotation.x = Math.PI / 2;
        beacon.add(ring1);
        const ring1Glow = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.1, 8, 32), glowMat.clone());
        ring1Glow.rotation.x = Math.PI / 2;
        beacon.add(ring1Glow);
        shardData.push({
            mesh: ring1,
            glow: ring1Glow,
            baseEmissive: 1.0,
            shimmerAmp: 0.4,
            shimmerSpeed: 2.5 + Math.random() * 1.5,
            phase: Math.random() * Math.PI * 2
        });

        // --- Orbiting ring 2 (tilted) ---
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.025, 8, 28), ringMat.clone());
        ring2.rotation.x = Math.PI / 3;
        ring2.rotation.z = Math.PI / 4;
        beacon.add(ring2);
        const ring2Glow = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 8, 28), glowMat.clone());
        ring2Glow.rotation.copy(ring2.rotation);
        beacon.add(ring2Glow);
        shardData.push({
            mesh: ring2,
            glow: ring2Glow,
            baseEmissive: 1.0,
            shimmerAmp: 0.35,
            shimmerSpeed: 1.8 + Math.random() * 1.2,
            phase: Math.random() * Math.PI * 2
        });

        // --- Top antenna spike ---
        const antenna = new THREE.Mesh(geometries.cylinder, bodyMat);
        antenna.scale.set(0.03, 0.5, 0.03);
        antenna.position.y = 0.55;
        beacon.add(antenna);

        // Antenna tip light
        const tipLight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), ringMat.clone());
        tipLight.position.y = 0.82;
        beacon.add(tipLight);
        const tipGlow = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), glowMat.clone());
        tipGlow.position.y = 0.82;
        beacon.add(tipGlow);
        shardData.push({
            mesh: tipLight,
            glow: tipGlow,
            baseEmissive: 1.0,
            shimmerAmp: 0.6,
            shimmerSpeed: 3.5 + Math.random() * 2.0,
            phase: Math.random() * Math.PI * 2
        });

        // --- Bottom spike ---
        const bottomSpike = new THREE.Mesh(geometries.cylinder, bodyMat);
        bottomSpike.scale.set(0.03, 0.35, 0.03);
        bottomSpike.position.y = -0.42;
        beacon.add(bottomSpike);

        // --- Central glow orb ---
        const coreGlow = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), glowMat.clone());
        beacon.add(coreGlow);

        beacon.position.set(x, 2.0 + Math.random() * 2.5, -100);
        beacon.userData = {
            isFloatingCrystal: true,
            baseY: beacon.position.y,
            bobAmp: 0.2 + Math.random() * 0.2,
            bobSpeed: 1.2 + Math.random() * 1.4,
            spinSpeed: 0.2 + Math.random() * 0.25,
            phase: Math.random() * Math.PI * 2,
            shards: shardData
        };
        scene.add(beacon);
        this.trees.push(beacon);
    }


    checkPowerupCollision(player, powerup) {
        const pPos = player.mesh.position;
        const oPos = powerup.mesh.position;
        return Math.abs(oPos.z - pPos.z) < 1.5 &&
               Math.abs(oPos.x - player.currentX) < 1.0;
    }

    checkCollision(player, obstacle) { // Rewritten for clarity and correctness
        const pPos = player.mesh.position;
        const oPos = obstacle.mesh.position;

        // Use bounding boxes for a more reliable intersection test
        const playerBox = new THREE.Box3().setFromObject(player.mesh);
        const obstacleBox = new THREE.Box3().setFromObject(obstacle.mesh);

        if (!playerBox.intersectsBox(obstacleBox)) {
            return false; // No collision
        }

        // If boxes intersect, apply game logic to see if it's a "real" crash

        // For cruisers, you are safe if you are on top of them.
        if (obstacle.type === 'CRUISER') {
            // Safe if on roof
            if (pPos.y >= 3.5) {
                return false;
            }
        }

        // For laser gates, you are safe if you are rolling.
        if (obstacle.type === 'LASER_GATE' && player.isRolling) {
            return false;
        }

        // For asteroid clusters, you are safe if you are jumping high enough.
        if (obstacle.type === 'ASTEROID' && pPos.y > obstacle.height) {
            return false;
        }

        // If none of the above exceptions apply, it's a game-ending collision.
        return true;
    }
}

// --- GAME LOGIC ---
function startGame() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    gameActive = true;
    score = 0;
    coins = 0;
    speedMultiplier = 1.0;
    updateHUD();

    if (!worldChunkManager) worldChunkManager = new WorldManager();
    worldChunkManager.reset();
    player.reset();
}

function loadSaveData() {
    try {
        const savedScore = localStorage.getItem('spaceRunHighScore');
        if (savedScore) highScore = parseInt(savedScore) || 0;
        document.getElementById('menu-highscore').innerText = Math.floor(highScore);
        document.getElementById('final-best').innerText = Math.floor(highScore);

        const savedCoins = localStorage.getItem('spaceRunCoins');
        if (savedCoins === null) {
            totalCoins = 5000; // Starting gift
        } else {
            totalCoins = parseInt(savedCoins);
        }
        document.getElementById('menu-headstarts').innerText = inventory.headstart;

        const savedUpgrades = localStorage.getItem('spaceRunUpgrades');
        if (savedUpgrades) {
            const parsedUpgrades = JSON.parse(savedUpgrades);
            upgrades = { ...upgrades, ...parsedUpgrades };
        }

        const savedInv = localStorage.getItem('spaceRunInventory');
        if (savedInv) {
            const parsedInv = JSON.parse(savedInv);
            inventory = { ...inventory, ...parsedInv };
        }
    } catch (e) { console.warn("Save data load failed", e); }

    // Apply upgrades to config
    CONFIG.magnetDuration = 10 + (upgrades.magnet - 1) * 5;
    CONFIG.jetpackDuration = 6 + (upgrades.jetpack - 1) * 2;
    CONFIG.superSneakersDuration = 12 + (upgrades.sneakers - 1) * 3;
}

function saveData() {
    try {
        localStorage.setItem('spaceRunHighScore', Math.floor(highScore));
        localStorage.setItem('spaceRunCoins', totalCoins);
        localStorage.setItem('spaceRunUpgrades', JSON.stringify(upgrades));
        localStorage.setItem('spaceRunInventory', JSON.stringify(inventory));
    } catch (e) { console.warn("Save data save failed", e); }
}

function resetGame() {
    startGame();
    SFX.playMusic();
}

function triggerGameOver() {
    gameActive = false;
    
    SFX.stopAll();


    // Save High Score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('spaceRunHighScore', Math.floor(highScore));
    }


    //Game score submission logic
    (async () => {
        function getCookie(name) {
            const value = document.cookie
                .split("; ")
                .find(row => row.startsWith(name + "="))
                ?.split("=")[1];
            return value ? decodeURIComponent(value) : null;
        }


        localStorage.setItem('ad_status', 'running')
        const token = getCookie("accessToken");
        const baseUrl = localStorage.getItem("api_base_url")
        const game_id = localStorage.getItem('game_id')
        const campaign_id = localStorage.getItem('campaign_id')


        const addScore = async () => {
            try {
                const response = await fetch(`${baseUrl}/api/gameservice/${game_id}/score-reg`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        score,
                        campaign_id
                    }),
                });

                if (!response.ok) {
                    throw new Error("Score addition failed.");
                }

                localStorage.setItem('game_state', 'score-added');
            } catch (err) {
                console.error("Error adding score:", err);
                localStorage.setItem('game_state', 'error-score');
            }
        };

        await addScore();
    })();


    // Visual feedback
    const overlay = document.getElementById('damage-overlay');
    overlay.style.opacity = 0.8;
    setTimeout(() => { overlay.style.opacity = 0; }, 200);
    SFX.play('crash');

    // Screen Shake
    const shakeInterval = setInterval(() => {
        camera.position.x = (Math.random() - 0.5) * 0.5;
        camera.position.y = 7 + (Math.random() - 0.5) * 0.5;
    }, 16);

    setTimeout(() => {
        clearInterval(shakeInterval);
        camera.position.set(0, 5, 8); // Reset Cam
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('game-over').classList.remove('hidden');
        document.getElementById('final-score').innerText = Math.floor(score);
        document.getElementById('final-best').innerText = Math.floor(highScore);
    }, 500);
}

function addCoin() {
    coins++;
    score += 50; // Bonus score
    
    // Pop effect on coin display (use coins-val; HUD may be hidden during game over)
    const el = document.getElementById('coins-val');
    if (el) {
        el.style.transform = "scale(1.5)";
        setTimeout(() => { if (el) el.style.transform = "scale(1)"; }, 100);
    }
    updateHUD();
}

function updateHUD() {
    document.getElementById('score-val').innerText = Math.floor(score).toString().padStart(6, '0');
    document.getElementById('coins-val').innerText = coins;
}

// --- SHOP & FEATURES ---
function openShop() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('shop-menu').classList.remove('hidden');
    renderShop();
}

function closeShop() {
    document.getElementById('shop-menu').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
}

function renderShop() {
    const container = document.getElementById('shop-container');
    container.innerHTML = `<div style="text-align:center; margin-bottom:10px; font-size:18px; color:rgba(0,200,255,0.5); letter-spacing:2px;">ENERGY CREDITS <span style="color:#00ffcc; font-size:22px; font-weight:bold;">${totalCoins}</span></div>`;

    const items = [
        { id: 'magnet', name: 'Magnet Duration', type: 'upgrade', max: 6 },
        { id: 'jetpack', name: 'Jetpack Duration', type: 'upgrade', max: 6 },
        { id: 'sneakers', name: 'Sneakers Duration', type: 'upgrade', max: 6 },
        { id: 'headstart', name: 'Headstart', type: 'consumable', cost: 2000 }
    ];

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'shop-item';
        
        let infoHtml = '';
        let btnHtml = '';

        if (item.type === 'upgrade') {
            const level = upgrades[item.id];
            const cost = level * 500;
            const isMax = level >= item.max;
            infoHtml = `<div class="shop-info">${item.name}<br><span style="font-size:12px; opacity:0.8">Lvl ${level}/${item.max}</span></div>`;
            btnHtml = isMax ? `<button class="shop-btn" disabled style="background:#7f8c8d; border-color:#2c3e50">MAX</button>` : 
                              `<button class="shop-btn" onclick="buyItem('${item.id}', ${cost}, 'upgrade')">${cost}</button>`;
        } else {
            const count = inventory[item.id];
            infoHtml = `<div class="shop-info">${item.name}<br><span style="font-size:12px; opacity:0.8">Owned: ${count}</span></div>`;
            btnHtml = `<button class="shop-btn" onclick="buyItem('${item.id}', ${item.cost}, 'consumable')">${item.cost}</button>`;
        }

        div.innerHTML = infoHtml + btnHtml;
        container.appendChild(div);
    });
}

window.buyItem = function(id, cost, type) {
    if (totalCoins >= cost) {
        totalCoins -= cost;
        if (type === 'upgrade') {
            upgrades[id]++;
        } else {
            inventory[id]++;
        }
        saveData();
        renderShop();
        loadSaveData(); // Update menu text
    } else {
        alert("Not enough coins!");
    }
};

function updateHeadstartBtn() {
    const btn = document.getElementById('headstart-btn');
    const count = inventory.headstart;
    document.getElementById('hs-count').innerText = count;
    if (count > 0 && gameActive && score < 500) { // Only available at start
        btn.classList.remove('hidden');
    } else {
        btn.classList.add('hidden');
    }
}

function activateHeadstart() {
    if (inventory.headstart > 0 && gameActive) {
        inventory.headstart--;
        saveData();
        updateHeadstartBtn();
        
        // Headstart Logic: Jetpack + temporary speed boost
        player.activateJetpack();
        const maxMultiplier = CONFIG.maxSpeed / CONFIG.playerSpeed;
        speedMultiplier = Math.min(speedMultiplier + 0.5, maxMultiplier);
        setTimeout(() => {
            speedMultiplier = Math.max(1.0, speedMultiplier - 0.5);
        }, CONFIG.jetpackDuration * 1000);
    }
}

function collectMysteryBox() {
    SFX.play('mystery');
    const r = Math.random();
    let msg = "";
    if (r < 0.5) {
        const amount = 500 + Math.floor(Math.random() * 1000);
        coins += amount;
        msg = `+${amount} Coins!`;
    } else if (r < 0.8) {
        inventory.headstart++;
        msg = "+1 Headstart!";
    } else {
        score += 5000;
        msg = "+5000 Score!";
    }
    saveData();
    updateHUD();
    
    // Visual Text Popup
    const popup = document.createElement('div');
    popup.style.position = 'absolute';
    popup.style.top = '30%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.color = '#FFD700';
    popup.style.fontSize = '40px';
    popup.style.fontWeight = 'bold';
    popup.style.textShadow = '2px 2px 0 #000';
    popup.innerText = msg;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1500);
}

// --- INPUT HANDLING ---
function setupInputs() {
    let lastTapTime = 0;
    function handleDoubleTap() {
        if (!gameActive) return;
        const now = Date.now();
        if (now - lastTapTime < 300) {
            player.activateHoverboard();
        }
        lastTapTime = now;
    }

    // Keyboard
    window.addEventListener('keydown', (e) => {
        SFX.init(); // Init audio on first interaction
        if (!gameActive) return;
        
        switch(e.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                player.changeLane(-1);
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                player.changeLane(1);
                break;
            case 'ArrowUp':
            case 'w':
            case 'W':
            case ' ':
                player.jump();
                break;
            case 'e': // Alternative for desktop
                player.activateHoverboard();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                player.roll();
                break;
        }
    });

    // Touch (Swipe)
    let touchStartX = 0;
    let touchStartY = 0;

    window.addEventListener('touchstart', (e) => {
        SFX.init();
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        handleDoubleTap();
    }, {passive: false});

    window.addEventListener('touchend', (e) => {
        if (!gameActive) return;
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        
        handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
    }, {passive: false});
}

function handleSwipe(startX, startY, endX, endY) {
    const diffX = endX - startX;
    const diffY = endY - startY;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    if (Math.max(absX, absY) < 30) return; // Tap, not swipe

    if (absX > absY) {
        // Horizontal
        if (diffX > 0) player.changeLane(1);
        else player.changeLane(-1);
    } else {
        // Vertical
        if (diffY > 0) player.roll(); // Down
        else player.jump(); // Up
    }
}

// --- MAIN LOOP ---
function animate() {
    frameId = requestAnimationFrame(animate);

    const dt = clock.getDelta();

    if (gameActive) {
        // Game Mechanics
        const maxMultiplier = CONFIG.maxSpeed / CONFIG.playerSpeed;
        const currentSpeed = Math.min(CONFIG.maxSpeed, CONFIG.playerSpeed * speedMultiplier);
        
        // Ground & FOV Logic
        player.update(dt, speedMultiplier);
        
        // Base FOV respects viewport (mobile portrait needs higher FOV so character isn't cut off)
        const aspect = window.innerWidth / window.innerHeight;
        const minHFov = 72;
        const baseFovRad = 2 * Math.atan(Math.tan((minHFov * Math.PI) / 360) / aspect);
        const baseFov = Math.max(60, Math.min(95, (baseFovRad * 180) / Math.PI));
        const targetFov = baseFov + (player.mesh.position.y * 1.5);
        camera.fov += (targetFov - camera.fov) * 0.1;
        camera.updateProjectionMatrix();

        worldChunkManager.update(dt, currentSpeed);

        // Scroll Textures for speed illusion
        if (window.groundTex) window.groundTex.offset.y -= currentSpeed * 0.0003;
        if (window.railTex) window.railTex.offset.y -= currentSpeed * 0.005;

        // Rotate skybox slowly
        if (window.skyMesh) window.skyMesh.rotation.y += 0.01 * dt;

        // Animate star streak particles (rush toward player)
        if (window.starStreaks) {
            const positions = window.starStreaks.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 2] += currentSpeed * dt;
                if (positions[i + 2] > 15) {
                    positions[i] = (Math.random() - 0.5) * 60;
                    positions[i + 1] = Math.random() * 20 - 2;
                    positions[i + 2] = -120 - Math.random() * 40;
                }
            }
            window.starStreaks.geometry.attributes.position.needsUpdate = true;
        }

        // Distant planet slow drift + gentle rotation
        if (window.distantPlanet) {
            window.distantPlanet.rotation.y += 0.003 * dt;
            // subtle bobbing
            window.distantPlanet.position.y = 25 + Math.sin(clock.getElapsedTime() * 0.1) * 0.5;
        }

        // Parallax asteroid field - slow counter-rotation for depth
        if (window.asteroidField) {
            window.asteroidField.rotation.y += 0.004 * dt;
            window.asteroidField.children.forEach(a => {
                a.rotation[a.userData.spinAxis] += a.userData.spinSpeed * dt;
            });
        }

        // Neon horizon arch pulse — COMMENTED OUT FOR NOW
        /*
        if (window.neonRingGroup) {
            const t = clock.getElapsedTime();
            const pulse = 0.85 + Math.sin(t * 1.8) * 0.15;
            if (window.neonRingMat) window.neonRingMat.opacity = pulse;
            if (window.neonBloomMat1) window.neonBloomMat1.opacity = 0.18 + Math.sin(t * 1.8 + 0.5) * 0.08;
        }
        */

        // Shooting stars
        if (window.shootingStars) {
            window.shootingStars.forEach(ss => {
                const ud = ss.userData;
                if (!ud.active) {
                    ud.timer -= dt;
                    if (ud.timer <= 0) {
                        // Launch a new shooting star from a random edge
                        ud.active = true;
                        ss.visible = true;
                        const side = Math.random() > 0.5 ? 1 : -1;
                        ss.position.set(
                            side * (40 + Math.random() * 30),
                            15 + Math.random() * 30,
                            -60 - Math.random() * 40
                        );
                        ud.dirX = -side * (0.6 + Math.random() * 0.4);
                        ud.dirY = -(0.3 + Math.random() * 0.3);
                        ud.dirZ = (Math.random() - 0.5) * 0.3;
                        ud.speed = 80 + Math.random() * 60;
                        // Point the trail in the direction of travel
                        ss.lookAt(
                            ss.position.x + ud.dirX * 10,
                            ss.position.y + ud.dirY * 10,
                            ss.position.z + ud.dirZ * 10
                        );
                    }
                } else {
                    ss.position.x += ud.dirX * ud.speed * dt;
                    ss.position.y += ud.dirY * ud.speed * dt;
                    ss.position.z += ud.dirZ * ud.speed * dt;
                    // Fade tail
                    const trail = ss.children[1];
                    if (trail && trail.material) {
                        trail.material.opacity = Math.max(0, trail.material.opacity - 0.3 * dt);
                    }
                    // Reset when out of view
                    if (ss.position.y < -20 || Math.abs(ss.position.x) > 120 || ss.position.z > 30) {
                        ud.active = false;
                        ss.visible = false;
                        ud.timer = 8 + Math.random() * 20; // next delay
                        if (trail && trail.material) trail.material.opacity = 0.5;
                    }
                }
            });
        }

        // Progression
        if (score < 550) {
            updateHeadstartBtn();
        }
        score += (currentSpeed * dt) / 2;
        speedMultiplier += CONFIG.acceleration * dt; // Gradually get faster
        speedMultiplier = Math.min(speedMultiplier, maxMultiplier);

        updateHUD();
    } else {
        // Menu Idle Animation
        if(player) player.mesh.rotation.y = Math.PI + Math.sin(clock.getElapsedTime()) * 0.1;
    }

    renderer.render(scene, camera);
}
