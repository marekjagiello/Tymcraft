import * as THREE from 'three';
import { Entity } from './entity.js';
import { WORLD_SIZE_X, WORLD_SIZE_Z } from '../world.js';
import { eventBus } from '../events.js';

export class Mob extends Entity {
    constructor(scene, world, type = 'mob', x = 32, z = 32, manager = null) {
        super(scene, world, x, 15, z);
        this.type = type;
        this.manager = manager;

        this.legs = [];
        this.arms = [];
        this.head = null;

        this.maxHealth = 8;
        this.health = 8;
        this.isDead = false;

        this.rotationY = Math.random() * Math.PI * 2;
        this.targetRotationY = this.rotationY;

        this.state = 'idle'; // 'idle' | 'walk' | 'walk_back'
        this.stateTimer = 1 + Math.random() * 3;
        this.walkSpeed = 1.6;
        this.animTime = Math.random() * 10;

        this.healthBarGroup = null;
        this.healthBarFill = null;
        this.barFillMat = null;
    }

    flashRed() {
        const mats = new Set();
        this.group.traverse((child) => {
            if (child.isMesh && child.material && child.material.color) {
                // NEVER modify shared AtlasMaterial used by the world chunks and drops!
                if (child.material.name === 'AtlasMaterial' || child.material._isSharedAtlas) return;
                mats.add(child.material);
            }
        });
        for (const mat of mats) {
            if (!mat._origColor) {
                mat._origColor = mat.color.clone();
            }
            mat.color.setHex(0xef4444);
        }
        setTimeout(() => {
            // ALWAYS restore colors even if mob is dead so materials never stay red
            for (const mat of mats) {
                if (mat._origColor) {
                    mat.color.copy(mat._origColor);
                }
            }
        }, 180);
    }

    onAttacked(damage = 2, attackerPos = null) {
        if (this.isDead) return;
        this.health -= damage;
        this.flashRed();

        eventBus.emit('entity:damaged', { entity: this, damage, attackerPos });

        // Knockback away from attacker
        if (attackerPos) {
            const kb = this.position.clone().sub(attackerPos).setY(0);
            if (kb.lengthSq() > 0.001) {
                kb.normalize();
                this.position.addScaledVector(kb, 0.7);
            }
        }
        this.position.y += 0.2;

        if (this.health <= 0) {
            this.die();
        }
    }

    buildHealthBar(yOffset = 1.95) {
        this.healthBarGroup = new THREE.Group();
        this.healthBarGroup.position.set(0, yOffset, 0);

        const barBgGeo = new THREE.BoxGeometry(0.72, 0.09, 0.02);
        const barBgMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
        const barBg = new THREE.Mesh(barBgGeo, barBgMat);
        this.healthBarGroup.add(barBg);

        const barFillGeo = new THREE.BoxGeometry(0.70, 0.07, 0.025);
        this.barFillMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        this.healthBarFill = new THREE.Mesh(barFillGeo, this.barFillMat);
        this.healthBarGroup.add(this.healthBarFill);

        this.group.add(this.healthBarGroup);
    }

    updateHealthBar(playerPosition) {
        if (!this.healthBarGroup || !playerPosition) return;

        const angleToPlayer = Math.atan2(playerPosition.x - this.position.x, playerPosition.z - this.position.z);
        this.healthBarGroup.rotation.y = -this.rotationY + angleToPlayer + Math.PI;

        const hpRatio = Math.max(0, this.health / this.maxHealth);
        this.healthBarFill.scale.x = hpRatio;
        this.healthBarFill.position.x = -0.35 * (1 - hpRatio);

        if (hpRatio < 0.35) {
            this.barFillMat.color.setHex(0xef4444); // Red
        } else if (hpRatio < 0.65) {
            this.barFillMat.color.setHex(0xeab308); // Yellow
        } else {
            this.barFillMat.color.setHex(0x22c55e); // Green
        }
    }

    updateFooting(dt) {
        const targetGroundY = this.getGroundHeight(this.position.x, this.position.z);
        if (this.position.y < targetGroundY) {
            this.position.y = targetGroundY;
        } else if (this.position.y > targetGroundY + 0.05) {
            this.position.y = Math.max(targetGroundY, this.position.y - dt * 10.0);
        } else {
            this.position.y = targetGroundY;
        }
        this.group.position.copy(this.position);
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;

        eventBus.emit('entity:died', { entity: this });

        if (this.manager && this.manager.spawnDeathPoof) {
            this.manager.spawnDeathPoof(this.position.clone().add(new THREE.Vector3(0, 0.2, 0)));
        }

        if (this.group && this.group.parent) {
            this.scene.remove(this.group);
        }

        if (this.manager) {
            this.manager.removeAnimal(this);
        }
    }
}
