import * as THREE from 'three';
import { Mob } from '../mob.js';
import { playHitSound } from '../../audio.js';
import { eventBus } from '../../events.js';

export class IronGolem extends Mob {
    constructor(scene, world, x = 100, z = 100, manager = null) {
        super(scene, world, 'iron_golem', x, z, manager);
        this.maxHealth = 100;
        this.health = 100;
        this.walkSpeed = 2.2;
        this.chaseSpeed = 5.2;

        this.isEnraged = false;
        this.targetPlayer = null;
        this.attackCooldown = 0;
        this.attackAnimTimer = 0;
        this.roseMesh = null;
        this.arms = [];
        this.eyeMeshLeft = null;
        this.eyeMeshRight = null;

        this.buildModel();
        this.snapToGround();
        this.scene.add(this.group);

        // Listen for player attacking any villager! (Tymek: "a Golem jak walniesz wieśniaka...")
        this.onVillagerAttacked = ({ villager, position }) => {
            const dist = this.position.distanceTo(position);
            if (dist <= 40) {
                this.enrageAtPlayer();
            }
        };
        eventBus.on('villager:attacked', this.onVillagerAttacked);
    }

    buildModel() {
        const ironMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
        const darkIronMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
        const vineMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });
        const noseMat = new THREE.MeshLambertMaterial({ color: 0xcb997e });
        const calmEyeMat = new THREE.MeshBasicMaterial({ color: 0x475569 });
        const redRoseMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });

        // 1. Massive Torso
        const bodyGeo = new THREE.BoxGeometry(1.25, 1.15, 0.75);
        const body = new THREE.Mesh(bodyGeo, ironMat);
        body.position.set(0, 1.65, 0);
        this.group.add(body);

        // Green moss / vine patches on iron chest
        const vineGeo = new THREE.BoxGeometry(0.35, 0.65, 0.77);
        const vine = new THREE.Mesh(vineGeo, vineMat);
        vine.position.set(0.28, 1.65, 0);
        this.group.add(vine);

        // Waist / Lower pelvic girdle
        const waistGeo = new THREE.BoxGeometry(0.75, 0.40, 0.55);
        const waist = new THREE.Mesh(waistGeo, darkIronMat);
        waist.position.set(0, 0.95, 0);
        this.group.add(waist);

        // 2. Head
        const headGeo = new THREE.BoxGeometry(0.48, 0.58, 0.48);
        this.head = new THREE.Mesh(headGeo, ironMat);
        this.head.position.set(0, 2.50, 0);

        // Eyes (start calm dark, turns glowing red when enraged)
        this.eyeMat = calmEyeMat;
        const eyeGeo = new THREE.BoxGeometry(0.09, 0.09, 0.06);
        this.eyeMeshLeft = new THREE.Mesh(eyeGeo, this.eyeMat);
        this.eyeMeshLeft.position.set(-0.13, 0.08, 0.25);
        this.eyeMeshRight = new THREE.Mesh(eyeGeo, this.eyeMat);
        this.eyeMeshRight.position.set(0.13, 0.08, 0.25);
        this.head.add(this.eyeMeshLeft, this.eyeMeshRight);

        // Big Iron Nose
        const noseGeo = new THREE.BoxGeometry(0.13, 0.24, 0.15);
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, -0.06, 0.31);
        this.head.add(nose);
        this.noseMesh = nose;

        this.group.add(this.head);

        // 3. Long Powerful Swinging Arms
        const armGeo = new THREE.BoxGeometry(0.32, 1.45, 0.32);
        const armOffsets = [-0.78, 0.78];

        for (let i = 0; i < 2; i++) {
            const shoulderPivot = new THREE.Group();
            shoulderPivot.position.set(armOffsets[i], 2.15, 0);

            const armMesh = new THREE.Mesh(armGeo, ironMat);
            armMesh.position.set(0, -0.65, 0);
            shoulderPivot.add(armMesh);

            // Right hand holds a red flower!
            if (i === 1) {
                const flowerGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
                this.roseMesh = new THREE.Mesh(flowerGeo, redRoseMat);
                this.roseMesh.position.set(0, -1.30, 0.22);
                shoulderPivot.add(this.roseMesh);
            }

            this.group.add(shoulderPivot);
            this.arms.push(shoulderPivot);
        }

        // 4. Sturdy Heavy Legs
        const legGeo = new THREE.BoxGeometry(0.38, 0.85, 0.38);
        const legOffsets = [-0.25, 0.25];

        for (let i = 0; i < 2; i++) {
            const pivot = new THREE.Group();
            pivot.position.set(legOffsets[i], 0.85, 0);
            const legMesh = new THREE.Mesh(legGeo, darkIronMat);
            legMesh.position.set(0, -0.42, 0);
            pivot.add(legMesh);
            this.group.add(pivot);
            this.legs.push(pivot);
        }

        this.buildHealthBar(2.95);
    }

    enrageAtPlayer() {
        if (this.isEnraged) return;
        this.isEnraged = true;
        this.walkSpeed = this.chaseSpeed;

        // Red glowing eyes!
        const enrageEyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        if (this.eyeMeshLeft) this.eyeMeshLeft.material = enrageEyeMat;
        if (this.eyeMeshRight) this.eyeMeshRight.material = enrageEyeMat;

        // Heavy metallic roar / gong
        playHitSound();

        const alertMsg = '🤖💥 Żelazny Golem wpadł w szał! Broni wieśniaków!';
        eventBus.emit('ui:popup', alertMsg);
    }

    onAttacked(damage = 2, attackerPos = null, sourceItem = null) {
        super.onAttacked(damage, attackerPos);
        playHitSound();
        this.enrageAtPlayer();
    }

    attackTarget(targetPlayer) {
        this.attackCooldown = 1.6;
        this.attackAnimTimer = 0.45;

        playHitSound();
        eventBus.emit('camera:shake', 0.45);

        // Deal direct damage
        if (this.manager && this.manager.survival) {
            this.manager.survival.takeDamage(4, 'Potężny cios Żelaznego Golema! 🤖💥');
        }

        // TYMEK'S CORE MECHANIC: "będzie cię podrzucać, a potem będziesz spadał!"
        // Launch player high into the sky!
        if (targetPlayer && targetPlayer.velocity) {
            const pushDir = targetPlayer.position.clone().sub(this.position).setY(0);
            if (pushDir.lengthSq() > 0.001) {
                pushDir.normalize();
            } else {
                pushDir.set(0, 0, 1);
            }

            // High upward velocity
            targetPlayer.velocity.y = 15.5;
            targetPlayer.velocity.x += pushDir.x * 6.5;
            targetPlayer.velocity.z += pushDir.z * 6.5;
            targetPlayer.onGround = false;

            const msg = '🤖🚀 Żelazny Golem podrzucił Cię wysoko w powietrze!';
            eventBus.emit('ui:popup', msg);
        }
    }

    moveForward(dt, speed = this.walkSpeed) {
        const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
        const nextX = this.position.x + fwd.x * speed * dt;
        const nextZ = this.position.z + fwd.z * speed * dt;
        const groundAtTarget = this.getGroundHeight(nextX, nextZ);
        if (groundAtTarget - this.position.y <= 1.25) {
            this.position.x = nextX;
            this.position.z = nextZ;
        }
    }

    animateLegs(dt, speedMult = 2.0) {
        this.animTime += dt * 5.0 * speedMult;
        const swing = Math.sin(this.animTime) * 0.45;
        if (this.legs[0]) this.legs[0].rotation.x = swing;
        if (this.legs[1]) this.legs[1].rotation.x = -swing;
    }

    update(dt) {
        if (this.isDead) return;

        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        // Arm swing upward animation
        if (this.attackAnimTimer > 0) {
            this.attackAnimTimer -= dt;
            const t = this.attackAnimTimer / 0.45;
            const swingAngle = -Math.sin(t * Math.PI) * Math.PI * 0.85;
            for (const arm of this.arms) {
                arm.rotation.x = swingAngle;
            }
        } else {
            // Calm natural arm swing during walk
            if (this.state === 'walk') {
                const legSwing = Math.sin(this.animTime || 0) * 0.45;
                if (this.arms[0]) this.arms[0].rotation.x = -legSwing;
                if (this.arms[1]) this.arms[1].rotation.x = legSwing;
            } else {
                for (const arm of this.arms) arm.rotation.x = 0;
            }
        }

        const player = this.manager ? this.manager.player : null;

        // When enraged, hunt and chase the player!
        if (this.isEnraged && player) {
            const distToPlayer = this.position.distanceTo(player.position);
            const dx = player.position.x - this.position.x;
            const dz = player.position.z - this.position.z;

            this.targetRotationY = Math.atan2(dx, dz);
            this.rotationY = this.targetRotationY;
            this.group.rotation.y = this.rotationY;

            if (distToPlayer > 2.2) {
                this.walkSpeed = this.chaseSpeed;
                this.moveForward(dt, this.chaseSpeed);
                this.animateLegs(dt, 3.2);
            } else {
                // In melee range: execute launch attack!
                if (this.attackCooldown <= 0) {
                    this.attackTarget(player);
                }
            }
            this.updateFooting(dt);
            return;
        }

        // Village Guardian: check if any hostile monster is nearby (Zombie, Skeleton, Creeper)
        if (this.manager && this.manager.animals) {
            let closestMonster = null;
            let closestDist = 16.0;

            for (const mob of this.manager.animals) {
                if (mob && !mob.isDead && (mob.type === 'zombie' || mob.type === 'skeleton' || mob.type === 'creeper')) {
                    const d = this.position.distanceTo(mob.position);
                    if (d < closestDist) {
                        closestDist = d;
                        closestMonster = mob;
                    }
                }
            }

            if (closestMonster) {
                const dx = closestMonster.position.x - this.position.x;
                const dz = closestMonster.position.z - this.position.z;
                this.targetRotationY = Math.atan2(dx, dz);
                this.rotationY = this.targetRotationY;
                this.group.rotation.y = this.rotationY;

                if (closestDist > 2.0) {
                    this.walkSpeed = 3.6;
                    this.moveForward(dt, 3.6);
                    this.animateLegs(dt, 2.5);
                } else if (this.attackCooldown <= 0) {
                    this.attackCooldown = 1.4;
                    this.attackAnimTimer = 0.45;
                    closestMonster.onAttacked(15, this.position);
                    closestMonster.position.y += 1.8;
                }
                this.updateFooting(dt);
                return;
            }
        }

        // Calm patrol: wander around village center (x: 100, z: 100)
        const distFromCenter = Math.hypot(this.position.x - 100, this.position.z - 100);
        if (distFromCenter > 22) {
            const dirX = 100 - this.position.x;
            const dirZ = 100 - this.position.z;
            this.targetRotationY = Math.atan2(dirX, dirZ);
            this.state = 'walk';
            this.stateTimer = 5.0;
        } else {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.state = (this.state === 'idle') ? 'walk' : 'idle';
                this.stateTimer = 3.0 + Math.random() * 5.0;
                if (this.state === 'walk') {
                    this.targetRotationY = Math.random() * Math.PI * 2;
                }
            }
        }

        let diff = this.targetRotationY - this.rotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.rotationY += diff * 3 * dt;
        this.group.rotation.y = this.rotationY;

        if (this.state === 'walk') {
            this.moveForward(dt, 2.0);
            this.animateLegs(dt, 1.0);
        } else {
            if (this.legs[0]) this.legs[0].rotation.x *= 0.8;
            if (this.legs[1]) this.legs[1].rotation.x *= 0.8;
        }

        this.updateFooting(dt);
    }

    die() {
        if (this.onVillagerAttacked) {
            eventBus.off('villager:attacked', this.onVillagerAttacked);
        }
        // Iron Golem drops Iron Ingots (58) and a Red Rose (17)!
        if (this.manager && this.manager.drops) {
            this.manager.drops.spawnItemDrop?.(this.position.x, this.position.y, this.position.z, 58, 'Żelazo');
            this.manager.drops.spawnItemDrop?.(this.position.x + 0.3, this.position.y, this.position.z + 0.3, 58, 'Żelazo');
            this.manager.drops.spawnItemDrop?.(this.position.x - 0.3, this.position.y, this.position.z - 0.3, 17, 'Czerwona Róża');
        }
        super.die();
    }
}
