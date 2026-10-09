import * as THREE from 'three';
import { Entity } from './entity.js';
import { eventBus } from '../events.js';
import { playHitSound } from '../audio.js';

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
