import * as THREE from 'three';
import { Mob } from '../mob.js';
import { WORLD_SIZE_X, WORLD_SIZE_Z, WORLD_HEIGHT } from '../../world.js';
import { DroppedItem } from '../../drops.js';
import { eventBus } from '../../events.js';

export class Zombie extends Mob {
    constructor(scene, world, x = 32, z = 32, manager = null, hasHelmet = false) {
        super(scene, world, 'zombie', x, z, manager);
        this.hasHelmet = hasHelmet;
        this.maxHealth = 10;
        this.health = 10;
        this.walkSpeed = 1.35;
        this.attackCooldown = 0;
        this.burnTimer = 0;

        this.buildModel();
        this.buildHealthBar(1.95);
        this.snapToGround();
        this.scene.add(this.group);
    }

    buildModel() {
        const skinMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });    // Zombie green skin
        const shirtMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });   // Cyan blue shirt
        const pantsMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });   // Dark indigo pants
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });       // Dark pixel eyes

        // Head (0.4 x 0.4 x 0.4)
        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        this.head = new THREE.Mesh(headGeo, skinMat);
        this.head.position.set(0, 1.45, 0);
        this.head.castShadow = true;
        this.group.add(this.head);

        const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
        const lEye = new THREE.Mesh(eyeGeo, eyeMat);
        lEye.position.set(-0.1, 0.04, 0.2);
        const rEye = new THREE.Mesh(eyeGeo, eyeMat);
        rEye.position.set(0.1, 0.04, 0.2);
        this.head.add(lEye, rEye);

        if (this.hasHelmet) {
            const helmetMat = new THREE.MeshLambertMaterial({ color: 0x52525b });
            const helmetGeo = new THREE.BoxGeometry(0.44, 0.22, 0.44);
            const helmet = new THREE.Mesh(helmetGeo, helmetMat);
            helmet.position.set(0, 0.12, 0);
            this.head.add(helmet);
        }

        // Torso / Body (0.44 x 0.62 x 0.26)
        const bodyGeo = new THREE.BoxGeometry(0.44, 0.62, 0.26);
        const body = new THREE.Mesh(bodyGeo, shirtMat);
        body.position.set(0, 0.94, 0);
        body.castShadow = true;
        this.group.add(body);

        // Arms stretched forward
        const armGeo = new THREE.BoxGeometry(0.16, 0.16, 0.55);
        const lArm = new THREE.Mesh(armGeo, skinMat);
        lArm.position.set(-0.3, 1.1, 0.26);
        lArm.castShadow = true;
        const rArm = new THREE.Mesh(armGeo, skinMat);
        rArm.position.set(0.3, 1.1, 0.26);
        rArm.castShadow = true;
        this.group.add(lArm, rArm);
        this.arms = [lArm, rArm];

        // 2 Legs
        const legGeo = new THREE.BoxGeometry(0.18, 0.64, 0.18);
        const lLegPivot = new THREE.Group();
        lLegPivot.position.set(-0.12, 0.64, 0);
        const lLeg = new THREE.Mesh(legGeo, pantsMat);
        lLeg.position.set(0, -0.32, 0);
        lLeg.castShadow = true;
        lLegPivot.add(lLeg);

        const rLegPivot = new THREE.Group();
        rLegPivot.position.set(0.12, 0.64, 0);
        const rLeg = new THREE.Mesh(legGeo, pantsMat);
        rLeg.position.set(0, -0.32, 0);
        rLeg.castShadow = true;
        rLegPivot.add(rLeg);

        this.group.add(lLegPivot, rLegPivot);
        this.legs = [lLegPivot, rLegPivot];
    }

    die() {
        if (this.isDead) return;

        // Drop Rotten Flesh (ID 26)
        if (this.manager && this.manager.drops) {
            const count = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < count; i++) {
                const drop = new DroppedItem(
                    this.scene,
                    this.world,
                    26,
                    'Zgniłe Mięso',
                    this.position.x + (Math.random() - 0.5) * 0.4,
                    this.position.y + 0.3,
                    this.position.z + (Math.random() - 0.5) * 0.4
                );
                this.manager.drops.items.push(drop);
            }
        }

        super.die();
    }

    update(dt, playerPosition = null, isDay = true) {
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        // Daylight burning - Zombie natychmiast ginie na słońcu (gdy jest dzień i brak osłony od góry)
        if (isDay && !this.isDead) {
            const bx = Math.floor(this.position.x);
            const bz = Math.floor(this.position.z);
            const by = Math.floor(this.position.y);
            let exposed = true;
            if (this.world) {
                for (let y = by + 2; y < WORLD_HEIGHT; y++) {
                    if (this.world.isSolid(bx, y, bz)) {
                        exposed = false;
                        break;
                    }
                }
            }
            if (exposed) {
                eventBus.emit('ui:popup', '☀️ Zombie natychmiast spłonął w promieniach słońca!');
                if (this.manager && this.manager.ui && !this.manager.ui._handledByEvent) {
                    this.manager.ui.showPopup('☀️ Zombie natychmiast spłonął w promieniach słońca!');
                }
                this.die();
                return;
            }
        }

        if (playerPosition && !this.isDead) {
            const distToPlayer = this.position.distanceTo(playerPosition);
            if (distToPlayer < 24.0) {
                this.targetRotationY = Math.atan2(playerPosition.x - this.position.x, playerPosition.z - this.position.z);

                if (distToPlayer <= 1.4) {
                    this.state = 'idle';
                    if (this.attackCooldown <= 0) {
                        this.attackCooldown = 1.2;
                        eventBus.emit('player:damage', { amount: 2, reason: 'Zombie' });
                        eventBus.emit('ui:popup', '⚠️ Zombie Cię zaatakował! (-1 serce)');

                        if (this.manager && this.manager.survival && !this.manager.survival._handledByEvent) {
                            this.manager.survival.takeDamage(2, 'Zombie');
                        }
                        if (this.manager && this.manager.ui && !this.manager.ui._handledByEvent) {
                            this.manager.ui.showPopup('⚠️ Zombie Cię zaatakował! (-1 serce)');
                        }
                    }
                } else {
                    this.state = 'walk';
                }
            } else {
                this.state = 'idle';
            }

            this.updateHealthBar(playerPosition);
        }

        // Smooth rotation
        let diff = this.targetRotationY - this.rotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.rotationY += diff * 4 * dt;
        this.group.rotation.y = this.rotationY;

        if (this.state === 'walk') {
            this.animTime += dt * 8.0;
            const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
            const nextX = this.position.x + fwd.x * this.walkSpeed * dt;
            const nextZ = this.position.z + fwd.z * this.walkSpeed * dt;

            const groundAtTarget = this.getGroundHeight(nextX, nextZ);
            if (groundAtTarget - this.position.y <= 1.15) {
                this.position.x = nextX;
                this.position.z = nextZ;
            }

            const swing = Math.sin(this.animTime) * 0.65;
            this.legs[0].rotation.x = swing;
            this.legs[1].rotation.x = -swing;
        } else {
            this.legs[0].rotation.x *= 0.8;
            this.legs[1].rotation.x *= 0.8;
        }

        this.updateFooting(dt);
    }
}

export class Skeleton extends Mob {
    constructor(scene, world, x = 32, z = 32, manager = null, hasHelmet = false) {
        super(scene, world, 'skeleton', x, z, manager);
        this.hasHelmet = hasHelmet;
        this.maxHealth = 10;
        this.health = 10;
        this.walkSpeed = 1.45;
        this.shootCooldown = 1.0 + Math.random() * 1.5;
        this.burnTimer = 0;

        this.buildModel();
        this.buildHealthBar(1.95);
        this.snapToGround();
        this.scene.add(this.group);
    }

    buildModel() {
        const boneMat = new THREE.MeshLambertMaterial({ color: 0xe4e4e7 });
        const socketMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
        const bowMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
        const stringMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });

        // Skull
        const skullGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        this.head = new THREE.Mesh(skullGeo, boneMat);
        this.head.position.set(0, 1.45, 0);
        this.head.castShadow = true;
        this.group.add(this.head);

        const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
        const lEye = new THREE.Mesh(eyeGeo, socketMat);
        lEye.position.set(-0.1, 0.04, 0.201);
        const rEye = new THREE.Mesh(eyeGeo, socketMat);
        rEye.position.set(0.1, 0.04, 0.201);
        this.head.add(lEye, rEye);

        const noseGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        const nose = new THREE.Mesh(noseGeo, socketMat);
        nose.position.set(0, -0.04, 0.201);
        this.head.add(nose);

        const mouthGeo = new THREE.BoxGeometry(0.16, 0.03, 0.04);
        const mouth = new THREE.Mesh(mouthGeo, socketMat);
        mouth.position.set(0, -0.11, 0.201);
        this.head.add(mouth);

        if (this.hasHelmet) {
            const helmetMat = new THREE.MeshLambertMaterial({ color: 0x52525b });
            const helmetGeo = new THREE.BoxGeometry(0.44, 0.22, 0.44);
            const helmet = new THREE.Mesh(helmetGeo, helmetMat);
            helmet.position.set(0, 0.12, 0);
            this.head.add(helmet);
        }

        // Spine and Ribs
        const spineGeo = new THREE.BoxGeometry(0.12, 0.62, 0.12);
        const spine = new THREE.Mesh(spineGeo, boneMat);
        spine.position.set(0, 0.94, 0);
        this.group.add(spine);

        const rib1Geo = new THREE.BoxGeometry(0.42, 0.07, 0.24);
        const rib1 = new THREE.Mesh(rib1Geo, boneMat);
        rib1.position.set(0, 1.15, 0);
        const rib2Geo = new THREE.BoxGeometry(0.38, 0.07, 0.22);
        const rib2 = new THREE.Mesh(rib2Geo, boneMat);
        rib2.position.set(0, 1.00, 0);
        const rib3Geo = new THREE.BoxGeometry(0.34, 0.07, 0.20);
        const rib3 = new THREE.Mesh(rib3Geo, boneMat);
        rib3.position.set(0, 0.85, 0);
        const pelvisGeo = new THREE.BoxGeometry(0.36, 0.08, 0.18);
        const pelvis = new THREE.Mesh(pelvisGeo, boneMat);
        pelvis.position.set(0, 0.68, 0);
        this.group.add(rib1, rib2, rib3, pelvis);

        // Arms holding bow
        const armGeo = new THREE.BoxGeometry(0.10, 0.10, 0.50);
        const lArm = new THREE.Mesh(armGeo, boneMat);
        lArm.position.set(-0.24, 1.05, 0.24);
        const rArm = new THREE.Mesh(armGeo, boneMat);
        rArm.position.set(0.24, 1.05, 0.24);
        this.group.add(lArm, rArm);
        this.arms = [lArm, rArm];

        // Bow
        const bowGroup = new THREE.Group();
        bowGroup.position.set(0, 1.05, 0.48);

        const bowCenterGeo = new THREE.BoxGeometry(0.04, 0.22, 0.04);
        const bowCenter = new THREE.Mesh(bowCenterGeo, bowMat);
        bowGroup.add(bowCenter);

        const bowTopGeo = new THREE.BoxGeometry(0.04, 0.18, 0.04);
        const bowTop = new THREE.Mesh(bowTopGeo, bowMat);
        bowTop.position.set(0, 0.17, -0.06);
        bowTop.rotation.x = -Math.PI / 6;
        bowGroup.add(bowTop);

        const bowBottomGeo = new THREE.BoxGeometry(0.04, 0.18, 0.04);
        const bowBottom = new THREE.Mesh(bowBottomGeo, bowMat);
        bowBottom.position.set(0, -0.17, -0.06);
        bowBottom.rotation.x = Math.PI / 6;
        bowGroup.add(bowBottom);

        const stringGeo = new THREE.BoxGeometry(0.015, 0.46, 0.015);
        const stringMesh = new THREE.Mesh(stringGeo, stringMat);
        stringMesh.position.set(0, 0, -0.12);
        bowGroup.add(stringMesh);

        this.group.add(bowGroup);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.11, 0.64, 0.11);
        const lLegPivot = new THREE.Group();
        lLegPivot.position.set(-0.11, 0.64, 0);
        const lLeg = new THREE.Mesh(legGeo, boneMat);
        lLeg.position.set(0, -0.32, 0);
        lLegPivot.add(lLeg);

        const rLegPivot = new THREE.Group();
        rLegPivot.position.set(0.11, 0.64, 0);
        const rLeg = new THREE.Mesh(legGeo, boneMat);
        rLeg.position.set(0, -0.32, 0);
        rLegPivot.add(rLeg);

        this.group.add(lLegPivot, rLegPivot);
        this.legs = [lLegPivot, rLegPivot];
    }

    die() {
        if (this.isDead) return;

        // Drop Bones (ID 27) and Arrows (ID 28)
        if (this.manager && this.manager.drops) {
            const boneCount = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < boneCount; i++) {
                const drop = new DroppedItem(
                    this.scene,
                    this.world,
                    27,
                    'Kość',
                    this.position.x + (Math.random() - 0.5) * 0.4,
                    this.position.y + 0.3,
                    this.position.z + (Math.random() - 0.5) * 0.4
                );
                this.manager.drops.items.push(drop);
            }
            const arrowCount = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < arrowCount; i++) {
                const drop = new DroppedItem(
                    this.scene,
                    this.world,
                    28,
                    'Strzała',
                    this.position.x + (Math.random() - 0.5) * 0.4,
                    this.position.y + 0.3,
                    this.position.z + (Math.random() - 0.5) * 0.4
                );
                this.manager.drops.items.push(drop);
            }
        }

        super.die();
    }

    update(dt, playerPosition = null, isDay = true) {
        if (this.shootCooldown > 0) this.shootCooldown -= dt;

        // Daylight burning - Szkielet natychmiast ginie na słońcu (gdy jest dzień i brak osłony od góry)
        if (isDay && !this.isDead) {
            const bx = Math.floor(this.position.x);
            const bz = Math.floor(this.position.z);
            const by = Math.floor(this.position.y);
            let exposed = true;
            if (this.world) {
                for (let y = by + 2; y < WORLD_HEIGHT; y++) {
                    if (this.world.isSolid(bx, y, bz)) {
                        exposed = false;
                        break;
                    }
                }
            }
            if (exposed) {
                eventBus.emit('ui:popup', '☀️ Szkielet natychmiast spłonął w promieniach słońca!');
                if (this.manager && this.manager.ui && !this.manager.ui._handledByEvent) {
                    this.manager.ui.showPopup('☀️ Szkielet natychmiast spłonął w promieniach słońca!');
                }
                this.die();
                return;
            }
        }

        if (playerPosition && !this.isDead) {
            const distToPlayer = this.position.distanceTo(playerPosition);
            if (distToPlayer < 24.0) {
                this.targetRotationY = Math.atan2(playerPosition.x - this.position.x, playerPosition.z - this.position.z);

                // Tactical Ranged AI (kites player & shoots arrows)
                if (distToPlayer < 5.5) {
                    this.state = 'walk_back';
                } else if (distToPlayer > 13.0) {
                    this.state = 'walk';
                } else {
                    this.state = 'idle';
                }

                // Shoot arrows if within range
                if (distToPlayer >= 2.5 && distToPlayer <= 22.0) {
                    if (this.shootCooldown <= 0) {
                        this.shootCooldown = 2.1 + Math.random() * 0.4;
                        const origin = this.position.clone().add(new THREE.Vector3(0, 1.1, 0));
                        const target = playerPosition.clone().add(new THREE.Vector3(0, 0.85, 0));
                        const dir = target.sub(origin).normalize();
                        if (this.manager && this.manager.spawnArrow) {
                            this.manager.spawnArrow(origin, dir);
                        }
                    }
                }
            }

            this.updateHealthBar(playerPosition);
        }

        let diff = this.targetRotationY - this.rotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.rotationY += diff * 4 * dt;
        this.group.rotation.y = this.rotationY;

        if (this.state === 'walk') {
            this.animTime += dt * 8.0;
            const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
            const nextX = this.position.x + fwd.x * this.walkSpeed * dt;
            const nextZ = this.position.z + fwd.z * this.walkSpeed * dt;

            const groundAtTarget = this.getGroundHeight(nextX, nextZ);
            if (groundAtTarget - this.position.y <= 1.15) {
                this.position.x = nextX;
                this.position.z = nextZ;
            }

            const swing = Math.sin(this.animTime) * 0.65;
            this.legs[0].rotation.x = swing;
            this.legs[1].rotation.x = -swing;
        } else if (this.state === 'walk_back') {
            this.animTime += dt * 8.0;
            const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
            const nextX = this.position.x - fwd.x * (this.walkSpeed * 0.85) * dt;
            const nextZ = this.position.z - fwd.z * (this.walkSpeed * 0.85) * dt;

            const groundAtTarget = this.getGroundHeight(nextX, nextZ);
            if (Math.abs(groundAtTarget - this.position.y) <= 1.15) {
                this.position.x = nextX;
                this.position.z = nextZ;
            }

            const swing = Math.sin(this.animTime) * 0.65;
            this.legs[0].rotation.x = -swing;
            this.legs[1].rotation.x = swing;
        } else {
            this.legs[0].rotation.x *= 0.8;
            this.legs[1].rotation.x *= 0.8;
        }

        this.updateFooting(dt);
    }
}
