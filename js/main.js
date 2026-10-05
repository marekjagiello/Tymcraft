import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { World, WORLD_SIZE_X, WORLD_SIZE_Z } from './world.js';
import { Player } from './player.js';
import { Interaction } from './interaction.js';
import { AnimalManager } from './animals.js';
import { UI } from './ui.js';

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

        // Game Systems
        this.world = new World(this.scene);
        this.player = new Player(this.camera, this.renderer.domElement, this.world);
        this.ui = new UI(this.player, this.world);
        this.animals = new AnimalManager(this.scene, this.world);
        this.interaction = new Interaction(
            this.scene,
            this.camera,
            this.world,
            this.player,
            () => this.ui.getActiveBlockId()
        );

        this.clock = new THREE.Clock();
        this.dayTime = 0.2; // 0 to 1 cycle
        this.dayDuration = 180; // 3 minutes full day-night cycle

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
        this.animals.update(dt);
        this.world.update();
        this.ui.update();
        this.updateDayNight(dt);

        this.renderer.render(this.scene, this.camera);
    }
}

// Start game on load
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
