import * as THREE from 'three';
import { World, WORLD_SIZE_X, WORLD_SIZE_Z } from './world.js';
import { Player } from './player.js';
import { Interaction } from './interaction.js?v=skeleton1';
import { AnimalManager } from './animals.js?v=skeleton1';
import { UI } from './ui.js?v=skeleton1';
import { StorageManager } from './storage.js';
import { SurvivalManager } from './survival.js';
import { CraftingManager } from './crafting.js';
import { DropsManager } from './drops.js';

class Game {
    constructor() {
        this.container = document.getElementById('canvas-container');

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x78a7ff);
        this.scene.fog = new THREE.FogExp2(0x78a7ff, 0.016);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );
        this.scene.add(this.camera);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
        this.scene.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xfffaed, 0.9);
        this.dirLight.position.set(40, 60, 40);
        this.dirLight.castShadow = false; // keep fast 60 fps for POC
        this.scene.add(this.dirLight);

        // Sun & Moon Visual Meshes
        const sunGeo = new THREE.BoxGeometry(6, 6, 6);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff077 });
        this.sun = new THREE.Mesh(sunGeo, sunMat);
        this.scene.add(this.sun);

        const moonGeo = new THREE.BoxGeometry(4, 4, 4);
        const moonMat = new THREE.MeshBasicMaterial({ color: 0xeeeeff });
        this.moon = new THREE.Mesh(moonGeo, moonMat);
        this.scene.add(this.moon);

        // 1. Storage & Saved State
        this.storage = new StorageManager();
        const savedState = this.storage.loadPlayerState();

        // 2. World System (persists placed/broken blocks)
        this.world = new World(this.scene, 4242, this.storage);

        // 3. Player System (restores saved position if present)
        this.player = new Player(this.camera, this.renderer.domElement, this.world, savedState?.position);

        // 4. Survival System (Health, Hunger, Fall Damage)
        this.survival = new SurvivalManager(this.player, (hp, hunger) => {
            if (this.ui) this.ui.renderSurvivalBars(hp, hunger);
        });
        if (savedState) {
            if (typeof savedState.health === 'number') this.survival.health = savedState.health;
            if (typeof savedState.hunger === 'number') this.survival.hunger = savedState.hunger;
        }
        this.player.onFallLanding = (vel) => this.survival.handleFallLanding(vel);

        // 5. Crafting System (2x2 Grid)
        this.crafting = new CraftingManager();

        // 6. UI & HUD (Hearts, Hunger, 2x2 Crafting modal, Reset button)
        this.ui = new UI(this.player, this.world, this.survival, this.crafting, this.storage);
        if (savedState && typeof savedState.selectedSlot === 'number') {
            this.ui.selectSlot(savedState.selectedSlot);
        }

        // 7. Drops System (floating mini-blocks and apples)
        this.drops = new DropsManager(this.scene, this.world);

        // 8. Interaction (Mining, Placing, Tool speed, Food eating)
        this.interaction = new Interaction(
            this.scene,
            this.camera,
            this.world,
            this.player,
            () => this.ui.getActiveBlockId(),
            this.drops
        );
        this.interaction.survival = this.survival;
        this.interaction.onItemConsumed = () => {
            this.ui.consumeActiveItem();
        };
        this.interaction.onBlockPlaced = () => {
            this.ui.consumeActiveItem();
        };

        // 9. Animals
        this.animals = new AnimalManager(this.scene, this.world, this.player);
        this.animals.survival = this.survival;
        this.animals.drops = this.drops;
        this.animals.ui = this.ui;
        this.interaction.animals = this.animals;
        this.interaction.ui = this.ui;
        if (this.ui) this.ui.animals = this.animals;

        this.clock = new THREE.Clock();
        this.dayTime = 0.2; // 0 to 1 cycle
        this.dayDuration = 180; // 3 minutes full day-night cycle
        this.autoSaveTimer = 0;

        window.addEventListener('resize', () => this.onWindowResize());
        this.animate();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateDayNight(dt) {
        this.dayTime = (this.dayTime + dt / this.dayDuration) % 1.0;

        const angle = this.dayTime * Math.PI * 2;
        const radius = 120;
        const centerX = WORLD_SIZE_X / 2;
        const centerZ = WORLD_SIZE_Z / 2;

        const sunY = Math.sin(angle) * radius;
        const sunX = centerX + Math.cos(angle) * radius;
        const sunZ = centerZ;

        this.sun.position.set(sunX, sunY, sunZ);
        this.moon.position.set(centerX - Math.cos(angle) * radius, -sunY, centerZ);

        this.dirLight.position.set(sunX, Math.max(sunY, 10), sunZ);

        // Interpolate colors based on sun height
        const isDay = sunY > 0;
        const dayFactor = Math.max(0, Math.min(1, (sunY + 20) / 60));

        const daySky = new THREE.Color(0x78a7ff);
        const nightSky = new THREE.Color(0x0c1224);
        const currentSky = nightSky.clone().lerp(daySky, dayFactor);

        this.scene.background = currentSky;
        this.scene.fog.color = currentSky;

        this.ambientLight.intensity = 0.2 + 0.5 * dayFactor;
        this.dirLight.intensity = 0.1 + 0.8 * dayFactor;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const dt = Math.min(this.clock.getDelta(), 0.1);

        this.player.update(dt);
        this.interaction.update(dt);
        this.drops.update(dt, this.player.position, (id, name) => {
            this.ui.addItem(id, name, 1);
        });
        const isDay = this.sun ? this.sun.position.y > 0 : true;
        this.animals.update(dt, this.player.position, isDay);
        this.world.update();
        this.survival.update(dt);
        this.ui.update();
        this.updateDayNight(dt);

        // Auto-save player state every 5 seconds
        this.autoSaveTimer += dt;
        if (this.autoSaveTimer >= 5.0) {
            this.storage.savePlayer(this.player, this.survival, this.ui.selectedSlotIndex);
            this.autoSaveTimer = 0;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

function initGame() {
    if (!window.__gameInstance) {
        try {
            window.__gameInstance = new Game();
            console.log("[Game] Initialized successfully");
        } catch (e) {
            console.error("[Game] Failed to initialize:", e);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
