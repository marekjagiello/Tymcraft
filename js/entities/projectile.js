import * as THREE from 'three';
import { Entity } from './entity.js';
import { eventBus } from '../events.js';
import { playHitSound, playExplosionSound } from '../audio.js';
import { WORLD_SIZE_X, WORLD_SIZE_Z, WORLD_HEIGHT } from '../world.js';

export class FlyingArrow extends Entity {
    constructor(scene, world, origin, direction, shooter = 'skeleton', damage = 5) {
        super(scene, world, origin.x, origin.y, origin.z);
        this.shooter = shooter;
        this.damage = damage;
        this.isStuck = false;
        this.stuckTimer = 0;
        this.lifetime = 0;

        const speed = shooter === 'player' ? 28.0 : 21.0;
        this.velocity = direction.clone().normalize().multiplyScalar(speed);
        if (shooter === 'skeleton') {
            this.velocity.y += 1.8; // subtle ballistic arc
        } else {
            this.velocity.y += 0.5; // very slight arc for player arrow
        }

        this.buildMesh();
        this.group.position.copy(this.position);
        this.updateRotation();
        this.scene.add(this.group);
    }

    buildMesh() {
        const shaftMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
        const shaftGeo = new THREE.BoxGeometry(0.04, 0.04, 0.5);
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        this.group.add(shaft);

        const tipMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
        const tipGeo = new THREE.BoxGeometry(0.08, 0.08, 0.12);
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.set(0, 0, 0.26);
        this.group.add(tip);

        const featherMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
        const featherGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        const feather = new THREE.Mesh(featherGeo, featherMat);
        feather.position.set(0, 0, -0.22);
        this.group.add(feather);
    }

    updateRotation() {
        if (this.velocity.lengthSq() > 0.001) {
            const dir = this.velocity.clone().normalize();
            const targetPos = this.position.clone().add(dir);
            this.group.lookAt(targetPos);
        }
    }

    update(dt, player = null, survival = null, ui = null, animals = null) {
        if (this.isDead) return;

        if (this.isStuck) {
            this.stuckTimer += dt;
            if (this.stuckTimer >= 5.0) {
                this.destroy();
            }
            return;
        }

        this.lifetime += dt;
        if (this.lifetime > 8.0) {
            this.destroy();
            return;
        }

        // Apply gravity
        this.velocity.y -= 9.8 * dt;

        const prevPos = this.position.clone();
        this.position.addScaledVector(this.velocity, dt);
        this.group.position.copy(this.position);
        this.updateRotation();

        // Check player collision (when shot by skeleton)
        if (this.shooter === 'skeleton' && player && player.position) {
            const playerCenter = player.position.clone().add(new THREE.Vector3(0, 0.9, 0));
            const distToPlayer = this.position.distanceTo(playerCenter);
            if (distToPlayer < 0.85) {
                // Emit event and support direct survival/ui fallback
                eventBus.emit('player:damage', { amount: 2, reason: 'Szkielet' });
                eventBus.emit('ui:popup', '🏹 Szkielet trafił Cię strzałą! (-1 serce)');

                if (survival && !survival._handledByEvent) {
                    survival.takeDamage(2, 'Szkielet');
                }
                if (ui && !ui._handledByEvent) {
                    ui.showPopup('🏹 Szkielet trafił Cię strzałą! (-1 serce)');
                }
                this.destroy();
                return;
            }
        }

        // Check animal / mob collision (when shot by player)
        if (this.shooter === 'player' && animals && Array.isArray(animals)) {
            for (const mob of animals) {
                if (!mob || mob.isDead) continue;
                const height = (mob.type === 'zombie' || mob.type === 'skeleton') ? 1.85 : ((mob.type === 'snake') ? 0.35 : 0.85);
                const hitRadius = (mob.type === 'snake') ? 0.80 : ((mob.type === 'zombie' || mob.type === 'skeleton') ? 0.95 : 0.85);

                const center = mob.position.clone().add(new THREE.Vector3(0, height * 0.5, 0));
                const dist = this.position.distanceTo(center);

                if (dist < hitRadius) {
                    playHitSound();
                    const wasAlive = mob.health > 0;
                    const knockbackOrigin = this.position.clone().sub(this.velocity.clone().normalize().multiplyScalar(2.0));
                    mob.onAttacked(this.damage, knockbackOrigin);

                    let name = 'zwierzę';
                    if (mob.type === 'snake') name = 'Węża';
                    else if (mob.type === 'zombie') name = 'Zombie';
                    else if (mob.type === 'skeleton') name = 'Szkieleta';
                    else if (mob.type === 'pig') name = 'Świnię';
                    else if (mob.type === 'sheep') name = 'Owcę';

                    if (wasAlive && mob.health <= 0) {
                        const msg = `🏹💥 Trafienie! Pokonano ${name}!`;
                        eventBus.emit('ui:popup', msg);
                        if (ui && !ui._handledByEvent) ui.showPopup(msg);
                    } else if (mob.type === 'zombie' || mob.type === 'skeleton') {
                        const enemyName = mob.type === 'skeleton' ? 'Szkieleta' : 'Zombie';
                        const msg = `🏹 Trafiono ${enemyName}! (${mob.health}/${mob.maxHealth} HP)`;
                        eventBus.emit('ui:popup', msg);
                        if (ui && !ui._handledByEvent) ui.showPopup(msg);
                    } else {
                        const msg = `🏹 Trafiono ${name}! (${mob.health}/${mob.maxHealth} HP)`;
                        eventBus.emit('ui:popup', msg);
                        if (ui && !ui._handledByEvent) ui.showPopup(msg);
                    }
                    this.destroy();
                    return;
                }
            }
        }

        // Check solid block collision
        const bx = Math.floor(this.position.x);
        const by = Math.floor(this.position.y);
        const bz = Math.floor(this.position.z);

        if (this.world.isSolid(bx, by, bz)) {
            this.isStuck = true;
            this.position.copy(prevPos);
            this.group.position.copy(this.position);
        }
    }
}

export class ThrownGunpowder extends Entity {
    constructor(scene, world, origin, direction, manager = null) {
        super(scene, world, origin.x, origin.y, origin.z);
        this.manager = manager;
        this.lifetime = 0;
        this.isExploded = false;

        const speed = 20.0;
        this.velocity = direction.clone().normalize().multiplyScalar(speed);
        this.velocity.y += 2.8; // ballistic arc

        this.buildMesh();
        this.group.position.copy(this.position);
        this.scene.add(this.group);
    }

    buildMesh() {
        const bagMat = new THREE.MeshLambertMaterial({ color: 0x374151 });
        const fuseMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

        const baseGeo = new THREE.BoxGeometry(0.22, 0.20, 0.22);
        const base = new THREE.Mesh(baseGeo, bagMat);
        base.castShadow = true;
        this.group.add(base);

        const neckGeo = new THREE.BoxGeometry(0.12, 0.09, 0.12);
        const neck = new THREE.Mesh(neckGeo, bagMat);
        neck.position.y = 0.12;
        this.group.add(neck);

        const fuseGeo = new THREE.BoxGeometry(0.06, 0.12, 0.06);
        this.fuse = new THREE.Mesh(fuseGeo, fuseMat);
        this.fuse.position.y = 0.18;
        this.group.add(this.fuse);
    }

    explode() {
        if (this.isExploded) return;
        this.isExploded = true;

        playExplosionSound();

        // Explosion particles
        if (this.manager?.spawnDeathPoof) {
            this.manager.spawnDeathPoof(this.position.clone().add(new THREE.Vector3(0, 0.3, 0)));
        }

        // Blast radius ~2.3 blocks
        // Explodes all blocks and ores (Coal Ore 13, Stone, etc.)
        // EXCEPT: Diamond Ore (15), Ruby Ore (16), Bedrock (14)!
        const cx = Math.floor(this.position.x);
        const cy = Math.floor(this.position.y);
        const cz = Math.floor(this.position.z);

        let destroyedCount = 0;
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                for (let dy = -2; dy <= 2; dy++) {
                    const distSq = dx * dx + dy * dy + dz * dz;
                    if (distSq <= 5.5) {
                        const bx = cx + dx;
                        const by = cy + dy;
                        const bz = cz + dz;

                        if (bx < 0 || bx >= WORLD_SIZE_X || bz < 0 || bz >= WORLD_SIZE_Z || by < 1 || by >= WORLD_HEIGHT) {
                            continue;
                        }

                        const blockId = this.world.getBlock(bx, by, bz);
                        if (blockId > 0) {
                            // PROTECTED FROM EXPLOSION: Bedrock (14), Diamond Ore (15), Ruby Ore (16)!
                            if (blockId === 14 || blockId === 15 || blockId === 16) {
                                continue;
                            }

                            // Destroy and spawn drop
                            this.world.setBlock(bx, by, bz, 0);
                            destroyedCount++;

                            if (this.manager && this.manager.drops) {
                                if (typeof this.manager.drops.spawnBlockDrop === 'function') {
                                    this.manager.drops.spawnBlockDrop(bx, by, bz, blockId);
                                } else if (typeof this.manager.drops.spawn === 'function') {
                                    this.manager.drops.spawn(bx, by, bz, blockId);
                                }
                            }
                        }
                    }
                }
            }
        }

        console.log(`[Gunpowder] Wybuch ładunku prochu! Zniszczono ${destroyedCount} bloków (diamenty i rubiny ocalone!).`);

        // Damage nearby monsters
        if (this.manager && this.manager.animals) {
            for (const mob of this.manager.animals) {
                if (mob && !mob.isDead && mob.position) {
                    const dist = this.position.distanceTo(mob.position);
                    if (dist <= 3.2) {
                        mob.onAttacked(15, this.position);
                    }
                }
            }
        }

        eventBus.emit('ui:popup', '💥 BUM! Ładunek prochu eksplodował!');
        if (this.manager?.ui) {
            this.manager.ui.showPopup('💥 BUM! Ładunek prochu eksplodował!');
        }

        this.destroy();
    }

    update(dt, player = null, survival = null, ui = null, animals = null) {
        if (this.isDead || this.isExploded) return;

        this.lifetime += dt;
        if (this.lifetime >= 2.5) {
            this.explode();
            return;
        }

        this.group.rotation.x += 10.0 * dt;
        this.group.rotation.y += 8.0 * dt;

        // Gravity
        this.velocity.y -= 13.0 * dt;

        const prevPos = this.position.clone();
        this.position.addScaledVector(this.velocity, dt);
        this.group.position.copy(this.position);

        // Check mob impact
        if (animals && Array.isArray(animals)) {
            for (const mob of animals) {
                if (!mob || mob.isDead || !mob.position) continue;
                const dist = this.position.distanceTo(mob.position);
                if (dist < 0.95) {
                    this.explode();
                    return;
                }
            }
        }

        // Check solid block impact
        const bx = Math.floor(this.position.x);
        const by = Math.floor(this.position.y);
        const bz = Math.floor(this.position.z);

        if (this.world.isSolid(bx, by, bz)) {
            this.position.copy(prevPos);
            this.explode();
            return;
        }
    }
}

export class MagicStoneSpell extends Entity {
    constructor(scene, world, origin, direction, manager = null, spellType = 'lightning') {
        super(scene, world, origin.x, origin.y, origin.z);
        this.manager = manager;
        this.spellType = spellType;
        this.speed = spellType === 'lightning' ? 36.0 : (spellType === 'fireball' ? 26.0 : 28.0);
        this.velocity = direction.clone().normalize().multiplyScalar(this.speed);
        this.lifetime = 0;
        this.maxLifetime = 3.0;

        this.buildMesh();
        this.group.position.copy(this.position);
        this.scene.add(this.group);
    }

    buildMesh() {
        if (this.spellType === 'lightning') {
            // Electric glowing yellow-cyan lightning orb with crackling sparks
            const coreGeo = new THREE.OctahedronGeometry(0.18, 0);
            const coreMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
            this.group.add(new THREE.Mesh(coreGeo, coreMat));

            const energyGeo = new THREE.SphereGeometry(0.24, 8, 8);
            const energyMat = new THREE.MeshBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.75,
                wireframe: true
            });
            this.group.add(new THREE.Mesh(energyGeo, energyMat));

            const sparkGeo = new THREE.BoxGeometry(0.06, 0.16, 0.06);
            const sparkMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
            for (let i = 0; i < 4; i++) {
                const spark = new THREE.Mesh(sparkGeo, sparkMat);
                spark.rotation.z = (i * Math.PI) / 2;
                this.group.add(spark);
            }
        } else if (this.spellType === 'fireball') {
            // Fiery orange-red burning fireball
            const coreGeo = new THREE.SphereGeometry(0.18, 8, 8);
            const coreMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
            this.group.add(new THREE.Mesh(coreGeo, coreMat));

            const flameGeo = new THREE.SphereGeometry(0.26, 8, 8);
            const flameMat = new THREE.MeshBasicMaterial({
                color: 0xef4444,
                transparent: true,
                opacity: 0.75
            });
            this.group.add(new THREE.Mesh(flameGeo, flameMat));
        } else {
            // Stone Freeze spell (cyan-purple crystal with stone core)
            const stoneCoreGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
            const stoneCoreMat = new THREE.MeshLambertMaterial({ color: 0x52525b });
            const core = new THREE.Mesh(stoneCoreGeo, stoneCoreMat);
            this.group.add(core);

            const energyGeo = new THREE.SphereGeometry(0.22, 8, 8);
            const energyMat = new THREE.MeshBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.75
            });
            this.group.add(new THREE.Mesh(energyGeo, energyMat));

            const haloGeo = new THREE.SphereGeometry(0.30, 8, 8);
            const haloMat = new THREE.MeshBasicMaterial({
                color: 0xa855f7,
                transparent: true,
                opacity: 0.4,
                wireframe: true
            });
            this.group.add(new THREE.Mesh(haloGeo, haloMat));
        }
    }

    update(dt, player = null, survival = null, ui = null, animals = null) {
        if (this.isDead) return;
        this.lifetime += dt;
        if (this.lifetime >= this.maxLifetime) {
            this.destroy();
            return;
        }

        this.group.rotation.x += 12 * dt;
        this.group.rotation.y += 15 * dt;

        const prevPos = this.position.clone();
        this.position.addScaledVector(this.velocity, dt);
        this.group.position.copy(this.position);

        // Check collision with mobs/animals
        if (animals && Array.isArray(animals)) {
            for (const mob of animals) {
                if (!mob || mob.isDead || !mob.position) continue;
                const mobCenter = mob.position.clone().add(new THREE.Vector3(0, (mob.type === 'boss_robot' ? 2.2 : (mob.type === 'robot' ? 1.4 : 0.9)), 0));
                const dist = this.position.distanceTo(mobCenter);
                const hitRadius = mob.type === 'boss_robot' ? 2.4 : (mob.type === 'robot' ? 1.6 : (mob.type === 'bear' ? 1.3 : 1.0));
                if (dist <= hitRadius) {
                    this.onHitMob(mob);
                    return;
                }
            }
        }

        // Check collision with solid block
        const bx = Math.floor(this.position.x);
        const by = Math.floor(this.position.y);
        const bz = Math.floor(this.position.z);

        if (this.world && this.world.isSolid(bx, by, bz)) {
            this.onHitBlock(bx, by, bz, prevPos);
            return;
        }
    }

    onHitMob(mob) {
        if (mob.isDead) return;

        let name = mob.type || 'cel';
        if (mob.type === 'boss_robot') name = 'Bossa Robota';
        else if (mob.type === 'robot') name = 'Robota Transformera';
        else if (mob.type === 'zombie') name = 'Zombie';
        else if (mob.type === 'skeleton') name = 'Szkieleta';
        else if (mob.type === 'creeper') name = 'Creepera';
        else if (mob.type === 'dirtik') name = 'Dirtika';
        else if (mob.type === 'bear') name = 'Niedźwiedzia';

        let msg = '';
        if (this.spellType === 'lightning') {
            mob.onAttacked(16, this.position);
            playExplosionSound();
            msg = `⚡🪄 Piorun z Różdżki uderzył w ${name}! (16 obrażeń!) ⚡`;
        } else if (this.spellType === 'fireball') {
            mob.onAttacked(14, this.position);
            playExplosionSound();
            msg = `🔥🪄 Kula Ognia trafiła ${name}! (14 obrażeń!) 🔥`;
        } else {
            mob.onAttacked(8, this.position);
            if (typeof mob.turnToStone === 'function') {
                mob.turnToStone(5.0);
            }
            playHitSound();
            msg = `🪨🪄 Magiczna Różdżka: ${name} zamieniony w kamień na 5 sekund! 🪨`;
        }

        eventBus.emit('ui:popup', msg);
        if (this.manager?.ui) {
            this.manager.ui.showPopup(msg);
        }
        if (this.manager?.spawnDeathPoof) {
            this.manager.spawnDeathPoof(this.position);
        }
        this.destroy();
    }

    onHitBlock(bx, by, bz, prevPos) {
        const px = Math.floor(prevPos.x);
        const py = Math.floor(prevPos.y);
        const pz = Math.floor(prevPos.z);

        if (this.spellType === 'stone') {
            if (this.world && py >= 1 && py < WORLD_HEIGHT && px >= 0 && px < WORLD_SIZE_X && pz >= 0 && pz < WORLD_SIZE_Z) {
                const currentBlock = this.world.getBlock(px, py, pz);
                if (currentBlock === 0) {
                    this.world.setBlock(px, py, pz, 3); // Kamień!
                    eventBus.emit('ui:popup', '✨🪄 Magiczna Różdżka wyczarowała Kamień! 🪨');
                }
            }
            playHitSound();
        } else if (this.spellType === 'fireball') {
            playExplosionSound();
            eventBus.emit('ui:popup', '🔥🪄 Kula Ognia wybuchła! 🔥');
        } else {
            playExplosionSound();
            eventBus.emit('ui:popup', '⚡🪄 Piorun uderzył w ziemię! ⚡');
        }

        if (this.manager?.spawnDeathPoof) {
            this.manager.spawnDeathPoof(this.position);
        }
        this.destroy();
    }

    destroy() {
        if (this.isDead) return;
        this.isDead = true;
        if (this.group && this.group.parent) {
            this.scene.remove(this.group);
        }
    }
}

