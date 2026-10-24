import * as THREE from 'three';
import { World, WORLD_SIZE_X, WORLD_SIZE_Z } from './world.js?v=dark_dimension_v2';
import { Player } from './player.js?v=dark_dimension_v2';
import { Interaction } from './interaction.js?v=dark_dimension_v2';
import { AnimalManager } from './animals.js?v=dark_dimension_v2';
import { UI, HOTBAR_BLOCKS, BACKPACK_SLOTS } from './ui.js?v=dark_dimension_v2';
import { StorageManager } from './storage.js?v=dark_dimension_v2';
import { SurvivalManager } from './survival.js?v=dark_dimension_v2';
import { CraftingManager } from './crafting.js?v=dark_dimension_v2';
import { DropsManager } from './drops.js?v=dark_dimension_v2';
import { eventBus } from './events.js?v=dark_dimension_v2';
import { updateWaterAnimation } from './textures.js?v=dark_dimension_v2';
import { QuestManager } from './quests.js?v=dark_dimension_v2';



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

        // Dynamiczna neonowa lampa błyskowa rozświetlająca Mroczny Wymiar podczas ataków Bossa Robota
        this.bossFlashIntensity = 0;
        this.bossFlashLight = new THREE.PointLight(0x38bdf8, 0, 45);
        this.bossFlashLight.position.set(1000, 14, 1000);
        this.scene.add(this.bossFlashLight);

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

        // Restore saved inventory/backpack if present
        if (savedState) {
            if (savedState.hotbar && Array.isArray(savedState.hotbar)) {
                savedState.hotbar.forEach((s, idx) => {
                    if (HOTBAR_BLOCKS[idx]) {
                        HOTBAR_BLOCKS[idx].id = s.id ?? HOTBAR_BLOCKS[idx].id;
                        HOTBAR_BLOCKS[idx].name = s.name ?? HOTBAR_BLOCKS[idx].name;
                        HOTBAR_BLOCKS[idx].count = s.count ?? HOTBAR_BLOCKS[idx].count;
                    }
                });
            }
            if (savedState.backpack && Array.isArray(savedState.backpack)) {
                savedState.backpack.forEach((s, idx) => {
                    if (BACKPACK_SLOTS[idx]) {
                        BACKPACK_SLOTS[idx].id = s.id ?? 0;
                        BACKPACK_SLOTS[idx].name = s.name ?? 'Puste';
                        BACKPACK_SLOTS[idx].count = s.count ?? 0;
                    }
                });
            }
        }

        // Guarantee that player has access to Bow (29) and Arrows (28)
        const hasBow = HOTBAR_BLOCKS.some(s => s.id === 29) || BACKPACK_SLOTS.some(s => s.id === 29);
        if (!hasBow) {
            const freeSlot = HOTBAR_BLOCKS.find(s => s.id === 0 || !s.count) || BACKPACK_SLOTS.find(s => s.id === 0 || !s.count);
            if (freeSlot) {
                freeSlot.id = 29;
                freeSlot.name = 'Łuk';
                freeSlot.count = 1;
            }
        }
        const hasArrows = HOTBAR_BLOCKS.some(s => s.id === 28) || BACKPACK_SLOTS.some(s => s.id === 28);
        if (!hasArrows) {
            const freeSlot = HOTBAR_BLOCKS.find(s => s.id === 0 || !s.count) || BACKPACK_SLOTS.find(s => s.id === 0 || !s.count);
            if (freeSlot) {
                freeSlot.id = 28;
                freeSlot.name = 'Strzała';
                freeSlot.count = 64;
            }
        }

        // 2. World System (persists placed/broken blocks)
        this.world = new World(this.scene, 4242, this.storage);

        // 3. Player System (restores saved position if present)
        this.player = new Player(this.camera, this.renderer.domElement, this.world, savedState?.position);

        // 4. Survival System (Health, Hunger, Fall Damage)
        this.survival = new SurvivalManager(this.player, (hp, hunger, maxHp) => {
            if (this.ui) this.ui.renderSurvivalBars(hp, hunger, maxHp);
        });
        if (savedState) {
            if (typeof savedState.health === 'number') this.survival.health = savedState.health > 0 ? savedState.health : 20;
            if (typeof savedState.hunger === 'number') this.survival.hunger = savedState.hunger > 0 ? savedState.hunger : 20;
        }
        this.player.onFallLanding = (vel) => this.survival.handleFallLanding(vel);

        // 5. Crafting System (2x2 Grid)
        this.crafting = new CraftingManager();

        // 6. UI & HUD (Hearts, Hunger, Backpack modal, Reset button)
        this.ui = new UI(this.player, this.world, this.survival, this.crafting, this.storage);
        this.survival.onOxygenChange = (oxygen, maxOxygen, isHeadUnderwater) => {
            if (this.ui) this.ui.updateBubblesBar(oxygen, maxOxygen, isHeadUnderwater);
        };
        this.survival.getArmorType = () => {
            if (!this.ui) return 0;
            if (this.ui.hasItem(37)) return 37; // Ruby Armor (Najlepsza!)
            if (this.ui.hasItem(32)) return 32; // Diamond Armor
            if (this.ui.hasItem(43)) return 43; // Stone Armor (Kamienna Zbroja!)
            return 0;
        };
        this.survival.checkHasArmor = () => (this.survival.getArmorType() > 0);
        if (savedState && typeof savedState.selectedSlot === 'number') {
            this.ui.selectSlot(savedState.selectedSlot);
        }

        // 6b. Quest Manager (Top-Left HUD and 5 Quests as requested by Tymek)
        this.questManager = new QuestManager(this.ui, this.player, this.world);
        this.player.questManager = this.questManager;
        this.ui.questManager = this.questManager;
        this.player.ui = this.ui;

        // 7. Drops System (floating mini-blocks and apples)
        this.drops = new DropsManager(this.scene, this.world);

        // 8. Interaction (Mining, Placing, Combat, Eating)
        this.interaction = new Interaction(
            this.scene,
            this.camera,
            this.world,
            this.player,
            () => this.ui.getActiveBlockId(),
            this.drops
        );
        this.interaction.survival = this.survival;
        this.interaction.ui = this.ui;

        // 9. Entity / Animal System
        this.animals = new AnimalManager(this.scene, this.world, this.player);
        this.animals.survival = this.survival;
        this.animals.drops = this.drops;
        this.animals.ui = this.ui;
        this.interaction.animals = this.animals;
        if (this.ui) this.ui.animals = this.animals;

        this.eventBus = eventBus;

        if (typeof window !== 'undefined') {
            window.game = this;
            window.spawnCreeper = () => this.animals.spawnCreeperInFrontOfPlayer(this.player, 5.0);
            window.spawnDirtik = () => this.animals.spawnDirtikInFrontOfPlayer(this.player, 4.0);
            window.spawnRobot = () => this.animals.spawnRobotInFrontOfPlayer(this.player, 4.0);
            window.spawnBear = (variant = 'polar') => this.animals.spawnBearNear(this.player.position.x, this.player.position.z, variant, 2, 4);
        }


        // Klawisz P: Wsiadanie / zsiadanie z niedźwiedzia
        eventBus.on('player:toggle_mount', () => {
            if (this.player.mountedBear) {
                this.player.dismountBear();
            } else {
                const bear = this.animals.findClosestBear(this.player.position, 4.0);
                if (bear) {
                    if (bear.variant === 'polar') {
                        eventBus.emit('ui:popup', '🐻‍❄️ Biały Niedźwiedź Polarny jest zbyt dziki i groźny, by na niego wsiąść!');
                    } else {
                        const success = Math.random() < 0.99;
                        if (success) {
                            bear.spawnHeartParticles?.(0.9);
                            this.player.mountBear(bear);
                        } else {
                            eventBus.emit('ui:popup', '🐾 Miś się lekko poruszył! Wciśnij P lub kliknij PPM jeszcze raz');
                        }
                    }
                } else {
                    eventBus.emit('ui:popup', '⚠️ Brak oswojonego misia w pobliżu! Podejdź do niedźwiedzia i kliknij PPM 🐻');
                }
            }
        });

        // Obsługa Mrocznego Wymiaru Bossa Robota
        this.isInDarkDimension = false;
        this.savedOverworldPos = new THREE.Vector3(32, 10, 32);

        eventBus.on('boss:attack_flash', (data = {}) => {
            const color = data.color ?? 0x38bdf8;
            const intensity = data.intensity ?? 3.8;
            const x = data.x ?? (this.player ? this.player.position.x : 1000);
            const y = data.y ?? 14;
            const z = data.z ?? (this.player ? this.player.position.z : 1000);
            this.bossFlashLight.color.setHex(color);
            this.bossFlashLight.position.set(x, y, z);
            this.bossFlashIntensity = intensity;
        });

        eventBus.on('dimension:enter_dark', () => {
            this.enterDarkDimension();
        });

        eventBus.on('dimension:return_to_overworld', () => {
            this.exitDarkDimension();
        });

        this.clock = new THREE.Clock();
        this.dayTime = 0.2; // 0 to 1 cycle
        this.dayDuration = 180; // 3 minutes full day-night cycle
        this.autoSaveTimer = 0;

        window.addEventListener('resize', () => this.onWindowResize());
        this.animate();
    }

    enterDarkDimension() {
        if (this.isInDarkDimension) return;
        this.isInDarkDimension = true;

        if (this.player && this.player.position.x < 800) {
            this.savedOverworldPos.copy(this.player.position);
        }

        // Natychmiastowe pre-generowanie i zbudowanie chunków areny wokół gracza (x=1000, z=1000)
        const pcx = Math.floor(1000 / 16);
        const pcz = Math.floor(1000 / 16);
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                this.world.getOrCreateChunk(pcx + dx, pcz + dz);
                this.world.buildChunk(pcx + dx, pcz + dz);
            }
        }

        // Teleportacja gracza na arenę (y=12.5)
        this.player.position.set(1000, 12.5, 992);
        this.player.velocity.set(0, 0, 0);

        // Przywołanie Bossa Robota w Mrocznym Wymiarze, jeśli nie został jeszcze pokonany
        const isDefeated = (typeof localStorage !== 'undefined' && localStorage.getItem('m2_boss_robot_defeated') === 'true');
        if (!isDefeated) {
            let boss = this.animals.animals.find(a => a.type === 'boss_robot' && !a.isDead);
            if (!boss) {
                boss = this.animals.spawnBossRobot(1000, 1008);
            } else {
                boss.position.set(1000, 12, 1008);
                boss.group.position.copy(boss.position);
            }
        }

        if (this.ui) {
            this.ui.addChatMessage('Serwer', '🌌 Wkroczyłeś do Mrocznego Wymiaru Bossa Robota! Ciemność rozświetlają tylko błyski energii mecha! ⚡🤖', 'chat-server');
            this.ui.showPopup('🌌 MROCZNY WYMIAR ROBOTA! ⚡🤖');
        }
    }

    exitDarkDimension() {
        this.isInDarkDimension = false;
        const target = (this.savedOverworldPos && this.savedOverworldPos.x < 800) ? this.savedOverworldPos : new THREE.Vector3(32, 10, 32);
        this.player.position.copy(target);
        this.player.velocity.set(0, 0, 0);

        // Pre-build chunków wokół miejsca powrotu
        const pcx = Math.floor(target.x / 16);
        const pcz = Math.floor(target.z / 16);
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                this.world.getOrCreateChunk(pcx + dx, pcz + dz);
                this.world.buildChunk(pcx + dx, pcz + dz);
            }
        }

        if (this.ui) {
            this.ui.showPopup('🌟 Powrót do bezpiecznego świata!');
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateDayNight(dt) {
        // --- Specjalna atmosfera Mrocznego Wymiaru (Czarne niebo, lekka poświata, błyski laserów) ---
        if (this.isInDarkDimension || (this.player && this.player.position.x > 800)) {
            this.isInDarkDimension = true;
            const darkSky = new THREE.Color(0x06060c);
            this.scene.background = darkSky;
            this.scene.fog.color = darkSky;
            this.scene.fog.density = 0.022;

            // "Ale jest też trochę jasno" - chłodne, delikatne stalowo-niebieskie światło otoczenia
            this.ambientLight.color.setHex(0x384260);
            this.ambientLight.intensity = 0.45;
            this.dirLight.intensity = 0.06;

            // Wygaszanie błysku światła po ataku Bossa ("I tylko jak atakuje to ci rozświetla ten ciemny świat")
            if (this.bossFlashIntensity > 0) {
                this.bossFlashIntensity = Math.max(0, this.bossFlashIntensity - dt * 3.8);
                this.bossFlashLight.intensity = this.bossFlashIntensity;
            } else {
                this.bossFlashLight.intensity = 0;
            }
            return;
        }

        // Standardowy cykl dnia i nocy w normalnym świecie
        this.ambientLight.color.setHex(0xffffff);
        this.dayTime = (this.dayTime + dt / this.dayDuration) % 1.0;

        const angle = this.dayTime * Math.PI * 2;
        const radius = 120;
        const centerX = this.player ? this.player.position.x : WORLD_SIZE_X / 2;
        const centerZ = this.player ? this.player.position.z : WORLD_SIZE_Z / 2;

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

        const activeItemId = this.ui ? this.ui.getActiveBlockId() : 0;
        const isDrawingBow = this.interaction ? this.interaction.isDrawingBow : false;
        this.player.update(dt, activeItemId, isDrawingBow);
        this.interaction.update(dt);
        this.drops.update(dt, this.player.position, (id, name) => {
            this.ui.addItem(id, name, 1);
        });
        const isDay = this.sun ? this.sun.position.y > 0 : true;
        this.animals.update(dt, this.player.position, isDay);

        this.world.update(this.player ? this.player.position : null);
        this.survival.update(dt);
        this.ui.update();
        this.updateDayNight(dt);

        // Dynamic water ripple animation (~12 FPS update for authentic animated water look)
        this.waterAnimTimer = (this.waterAnimTimer || 0) + dt;
        if (this.waterAnimTimer >= 0.08) {
            this.waterAnimTimer = 0;
            updateWaterAnimation(this.clock.getElapsedTime());
        }

        // Auto-save player state every 5 seconds
        this.autoSaveTimer += dt;
        if (this.autoSaveTimer >= 5.0) {
            this.storage.savePlayer(this.player, this.survival, this.ui.selectedSlotIndex, this.ui.hotbarBlocks, this.ui.backpackSlots);
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
            if (window.logToServer) {
                window.logToServer('INFO', '[Game] Initialized successfully in browser');
            }
        } catch (e) {
            console.error("[Game] Failed to initialize:", e);
            if (window.logToServer) {
                window.logToServer('ERROR', '[Game] Failed to initialize: ' + (e ? e.message : e), e ? e.stack : '');
            }
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
