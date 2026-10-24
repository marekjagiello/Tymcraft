import * as THREE from 'three';
import { WORLD_HEIGHT } from '../world.js';

export class Entity {
    constructor(scene, world, x = 32, y = 15, z = 32) {
        this.scene = scene;
        this.world = world;
        this.position = new THREE.Vector3(x, y, z);
        this.group = new THREE.Group();
        this.isDead = false;
    }

    getGroundHeight(x, z) {
        const bx = Math.floor(x);
        const bz = Math.floor(z);
        // Areny Bossów posiadają dach na y=20 (Mroczny Wymiar x: 980..1020, Królestwo Świń x: 1980..2020)
        // Podłoga areny jest na y=11 (mob stoi na y=12). Skanujemy poniżej dachu (y=18)!
        const inRoofArena = (bx >= 980 && bx <= 1020 && bz >= 980 && bz <= 1020) ||
                            (bx >= 1980 && bx <= 2020 && bz >= 1980 && bz <= 2020);
        const startScanY = inRoofArena ? 18 : (WORLD_HEIGHT - 1);

        for (let y = startScanY; y >= 0; y--) {
            const block = this.world.getBlock(bx, y, bz);
            if (block === 5) continue; // Skip tree leaves
            if (this.world.isSolid(bx, y, bz)) {
                return y + 1;
            }
        }
        return inRoofArena ? 12 : 10;
    }

    snapToGround() {
        this.position.y = this.getGroundHeight(this.position.x, this.position.z);
        this.group.position.copy(this.position);
    }

    destroy() {
        if (this.isDead) return;
        this.isDead = true;
        if (this.group && this.group.parent) {
            this.scene.remove(this.group);
        }
    }
}
