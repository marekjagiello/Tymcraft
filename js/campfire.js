import * as THREE from 'three';
import { eventBus } from './events.js';
import { playHitSound } from './audio.js';

export class CampfireManager {
    constructor(scene, world, player = null, survival = null, ui = null) {
        this.scene = scene;
        this.world = world;
        this.player = player;
        this.survival = survival;
        this.ui = ui;

        // Known campfire locations (x, y, z keys)
        this.campfires = new Map();

        // Active smoke particles
        this.smokeParticles = [];
        this.smokeGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
        this.smokeMat = new THREE.MeshBasicMaterial({
            color: 0xd1d5db,
            transparent: true,
            opacity: 0.65
        });

        // Fire spark particles
        this.sparkGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        this.sparkMat = new THREE.MeshBasicMaterial({
            color: 0xfef08a,
            transparent: true,
            opacity: 0.95
        });

        // Dynamic warm campfire light near player
        this.campfireLight = new THREE.PointLight(0xff7700, 1.8, 14);
        this.campfireLight.visible = false;
        this.scene.add(this.campfireLight);

        this.scanTimer = 0;
        this.emitTimer = 0;
        this.burnTimer = 0;

        // Listen for block changes
        eventBus.on('block:set', ({ x, y, z, id }) => {
            if (id === 61) {
                this.register(x, y, z);
            } else {
                this.unregister(x, y, z);
            }
        });

        eventBus.on('block:broken', ({ x, y, z, blockId }) => {
            if (blockId === 61) {
                this.unregister(x, y, z);
            }
        });
    }

    key(x, y, z) {
        return `${x},${y},${z}`;
    }

    register(x, y, z) {
        const k = this.key(x, y, z);
        if (!this.campfires.has(k)) {
            this.campfires.set(k, { x, y, z });
        }
    }

    unregister(x, y, z) {
        const k = this.key(x, y, z);
        this.campfires.delete(k);
    }

    // Cook raw meat if right-clicked on campfire
    tryCookMeat(activeItemId, blockX, blockY, blockZ) {
        const blockId = this.world ? this.world.getBlock(blockX, blockY, blockZ) : 0;
        if (blockId !== 61) return false;

        // Raw meats: 38 (Porkchop), 39 (Mutton), 40 (Beef)
        if (activeItemId === 38 || activeItemId === 39 || activeItemId === 40) {
            const isBeef = (activeItemId === 40);
            const cookedId = isBeef ? 64 : 63;
            const cookedName = isBeef ? 'Pieczona Wołowina' : 'Pieczony Schab';

            playHitSound?.();
            eventBus.emit('item:consume');
            if (this.ui) {
                this.ui.consumeActiveItem?.();
                this.ui.addItem(cookedId, cookedName, 1);
                const cookMsg = `🔥 Upieczono pyszne mięso na ognisku: ${cookedName}! 🍖`;
                this.ui.showPopup(cookMsg);
                eventBus.emit('ui:popup', cookMsg);
            }
            return true;
        }
        return false;
    }

    // Scan area around player for campfire blocks (ID 61)
    scanNearbyCampfires() {
        if (!this.player || !this.world) return;
        const px = Math.floor(this.player.position.x);
        const py = Math.floor(this.player.position.y);
        const pz = Math.floor(this.player.position.z);
        const radius = 18;

        for (let ox = -radius; ox <= radius; ox += 2) {
            for (let oz = -radius; oz <= radius; oz += 2) {
                for (let oy = -6; oy <= 6; oy++) {
                    const bx = px + ox;
                    const by = py + oy;
                    const bz = pz + oz;
                    if (by >= 1 && by < 31) {
                        if (this.world.getBlock(bx, by, bz) === 61) {
                            this.register(bx, by, bz);
                        }
                    }
                }
            }
        }
    }

    emitSmokeFor(cx, cy, cz) {
        // Emit 1-2 smoke particles
        const puff = new THREE.Mesh(this.smokeGeo, this.smokeMat.clone());
        puff.position.set(
            cx + 0.5 + (Math.random() - 0.5) * 0.28,
            cy + 0.45,
            cz + 0.5 + (Math.random() - 0.5) * 0.28
        );
        puff.scale.set(0.6, 0.6, 0.6);
        this.scene.add(puff);

        this.smokeParticles.push({
            mesh: puff,
            vx: (Math.random() - 0.5) * 0.15,
            vy: 1.35 + Math.random() * 0.65,
            vz: (Math.random() - 0.5) * 0.15,
            scale: 0.6,
            maxScale: 1.6 + Math.random() * 0.6,
            life: 0,
            maxLife: 2.8 + Math.random() * 0.8
        });

        // 35% chance to emit a tiny flying fire spark
        if (Math.random() < 0.35) {
            const spark = new THREE.Mesh(this.sparkGeo, this.sparkMat.clone());
            spark.position.set(
                cx + 0.5 + (Math.random() - 0.5) * 0.35,
                cy + 0.5,
                cz + 0.5 + (Math.random() - 0.5) * 0.35
            );
            this.scene.add(spark);
            this.smokeParticles.push({
                mesh: spark,
                vx: (Math.random() - 0.5) * 0.4,
                vy: 2.2 + Math.random() * 1.0,
                vz: (Math.random() - 0.5) * 0.4,
                scale: 1.0,
                maxScale: 0.2,
                life: 0,
                maxLife: 0.7 + Math.random() * 0.4
            });
        }
    }

    update(dt) {
        if (!this.player) return;

        // Periodic area scan
        this.scanTimer += dt;
        if (this.scanTimer >= 1.5) {
            this.scanTimer = 0;
            this.scanNearbyCampfires();
        }

        // Emit smoke from all known campfires within range
        this.emitTimer += dt;
        if (this.emitTimer >= 0.14) {
            this.emitTimer = 0;
            const px = this.player.position.x;
            const pz = this.player.position.z;

            let closestDistSq = Infinity;
            let closestCampfire = null;

            for (const [key, cf] of this.campfires.entries()) {
                // Verify block is still campfire
                if (this.world.getBlock(cf.x, cf.y, cf.z) !== 61) {
                    this.campfires.delete(key);
                    continue;
                }

                const distSq = (cf.x + 0.5 - px) ** 2 + (cf.z + 0.5 - pz) ** 2;
                if (distSq < closestDistSq) {
                    closestDistSq = distSq;
                    closestCampfire = cf;
                }

                if (distSq <= 40 * 40) {
                    this.emitSmokeFor(cf.x, cf.y, cf.z);
                }
            }

            // Campfire lighting near player
            if (closestCampfire && closestDistSq <= 24 * 24) {
                this.campfireLight.position.set(
                    closestCampfire.x + 0.5,
                    closestCampfire.y + 0.8,
                    closestCampfire.z + 0.5
                );
                this.campfireLight.visible = true;
                const time = performance.now() * 0.008;
                this.campfireLight.intensity = 1.6 + Math.sin(time) * 0.35 + Math.cos(time * 2.3) * 0.2;
            } else {
                this.campfireLight.visible = false;
            }
        }

        // Animate and update active smoke particles
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const p = this.smokeParticles[i];
            p.life += dt;
            if (p.life >= p.maxLife) {
                if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
                if (p.mesh.geometry && p.mesh.geometry !== this.smokeGeo && p.mesh.geometry !== this.sparkGeo) p.mesh.geometry.dispose();
                this.smokeParticles.splice(i, 1);
                continue;
            }

            const progress = p.life / p.maxLife;
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;

            // Slight gentle drift
            p.mesh.position.x += Math.sin(p.life * 2.5) * 0.008;

            const curScale = p.scale + (p.maxScale - p.scale) * progress;
            p.mesh.scale.set(curScale, curScale, curScale);

            if (p.mesh.material) {
                p.mesh.material.opacity = Math.max(0, 0.65 * (1 - progress));
            }
        }

        // Campfire burn damage when standing inside
        this.burnTimer += dt;
        if (this.burnTimer >= 0.8) {
            this.burnTimer = 0;
            const px = Math.floor(this.player.position.x);
            const py = Math.floor(this.player.position.y);
            const pz = Math.floor(this.player.position.z);

            // Check feet and legs
            const onCampfire = (this.world.getBlock(px, py, pz) === 61) ||
                               (this.world.getBlock(px, py - 1, pz) === 61);

            if (onCampfire && this.survival) {
                this.survival.takeDamage(1, 'Oparzenie od ogniska! 🔥');
                playHitSound?.();
                eventBus.emit('ui:popup', '🔥 Oparzyłeś się o ognisko!');
            }
        }
    }
}
