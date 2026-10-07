import * as THREE from 'three';
import { Entity } from './entity.js';
import { eventBus } from '../events.js';

export class FlyingArrow extends Entity {
    constructor(scene, world, origin, direction, shooter = 'skeleton') {
        super(scene, world, origin.x, origin.y, origin.z);
        this.shooter = shooter;
        this.isStuck = false;
        this.stuckTimer = 0;
        this.lifetime = 0;

        const speed = 21.0;
        this.velocity = direction.clone().normalize().multiplyScalar(speed);
        this.velocity.y += 1.8; // subtle ballistic arc

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

    update(dt, player = null, survival = null, ui = null) {
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

        // Check player collision
        if (player && player.position) {
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
