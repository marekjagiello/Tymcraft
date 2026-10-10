import * as THREE from 'three';
import { Mob } from '../mob.js';
import { WORLD_SIZE_X, WORLD_SIZE_Z, WORLD_HEIGHT } from '../../world.js';
import { DroppedItem } from '../../drops.js';
import { eventBus } from '../../events.js';
import { playHitSound, playHissSound, playExplosionSound } from '../../audio.js';
import { BLOCK_DEF, AtlasMaterial, getTileUV } from '../../textures.js';

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

            // Rzadki łup (5% szansy): Diament (ID 30)
            if (Math.random() < 0.05) {
                const diamondDrop = new DroppedItem(
                    this.scene,
                    this.world,
                    30,
                    'Diament',
                    this.position.x,
                    this.position.y + 0.4,
                    this.position.z
                );
                this.manager.drops.items.push(diamondDrop);
                console.log("[Drops] Rzadki Diament wypadł z pokonanego Zombie!");
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

            // Rzadki łup (5% szansy): Diament (ID 30)
            if (Math.random() < 0.05) {
                const diamondDrop = new DroppedItem(
                    this.scene,
                    this.world,
                    30,
                    'Diament',
                    this.position.x,
                    this.position.y + 0.4,
                    this.position.z
                );
                this.manager.drops.items.push(diamondDrop);
                console.log("[Drops] Rzadki Diament wypadł z pokonanego Szkieleta!");
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

export class Creeper extends Mob {
    constructor(scene, world, x = 32, z = 32, manager = null) {
        super(scene, world, 'creeper', x, z, manager);
        this.maxHealth = 10;
        this.health = 10;
        this.walkSpeed = 1.25;
        this.isFusing = false;
        this.fuseTimer = 0;
        this.fuseDuration = 1.0; // 1.0s selected by user!
        this.flashWhiteState = false;
        this.flashTimer = 0;

        this.buildModel();
        this.buildHealthBar(1.65);
        this.snapToGround();
        this.scene.add(this.group);
    }

    buildModel() {
        // Classic Minecraft Creeper Green palette
        this.skinMat = new THREE.MeshLambertMaterial({ color: 0x4ade80 });
        this.darkSkinMat = new THREE.MeshLambertMaterial({ color: 0x16a34a });
        this.faceMat = new THREE.MeshLambertMaterial({ color: 0x111827 });

        // Head (0.42 x 0.42 x 0.42)
        const headGeo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
        this.head = new THREE.Mesh(headGeo, this.skinMat);
        this.head.position.set(0, 1.15, 0);
        this.head.castShadow = true;
        this.group.add(this.head);

        // Face details: eyes, nose, mouth corners
        const eyeGeo = new THREE.BoxGeometry(0.09, 0.09, 0.02);
        const lEye = new THREE.Mesh(eyeGeo, this.faceMat);
        lEye.position.set(-0.11, 0.06, 0.215);
        this.head.add(lEye);

        const rEye = new THREE.Mesh(eyeGeo, this.faceMat);
        rEye.position.set(0.11, 0.06, 0.215);
        this.head.add(rEye);

        const noseGeo = new THREE.BoxGeometry(0.09, 0.09, 0.02);
        const nose = new THREE.Mesh(noseGeo, this.faceMat);
        nose.position.set(0, -0.01, 0.215);
        this.head.add(nose);

        const mouthSideGeo = new THREE.BoxGeometry(0.06, 0.12, 0.02);
        const mouthL = new THREE.Mesh(mouthSideGeo, this.faceMat);
        mouthL.position.set(-0.06, -0.09, 0.215);
        const mouthR = new THREE.Mesh(mouthSideGeo, this.faceMat);
        mouthR.position.set(0.06, -0.09, 0.215);
        this.head.add(mouthL, mouthR);

        const mouthCornerGeo = new THREE.BoxGeometry(0.05, 0.09, 0.02);
        const cornerL = new THREE.Mesh(mouthCornerGeo, this.faceMat);
        cornerL.position.set(-0.12, -0.11, 0.215);
        const cornerR = new THREE.Mesh(mouthCornerGeo, this.faceMat);
        cornerR.position.set(0.12, -0.11, 0.215);
        this.head.add(cornerL, cornerR);

        // Torso / Body (0.38 x 0.62 x 0.26)
        const bodyGeo = new THREE.BoxGeometry(0.38, 0.62, 0.26);
        this.body = new THREE.Mesh(bodyGeo, this.skinMat);
        this.body.position.set(0, 0.64, 0);
        this.body.castShadow = true;
        this.group.add(this.body);

        const bellyGeo = new THREE.BoxGeometry(0.24, 0.44, 0.02);
        const belly = new THREE.Mesh(bellyGeo, this.darkSkinMat);
        belly.position.set(0, 0, 0.135);
        this.body.add(belly);

        // 4 Animated Legs: 2 Front, 2 Back
        const legGeo = new THREE.BoxGeometry(0.16, 0.36, 0.16);
        const legMat = this.skinMat;

        const legConfigs = [
            { x: -0.11, z: 0.11 },
            { x: 0.11, z: 0.11 },
            { x: -0.11, z: -0.11 },
            { x: 0.11, z: -0.11 }
        ];

        this.legs = [];
        for (const cfg of legConfigs) {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(cfg.x, 0.18, cfg.z);
            leg.castShadow = true;
            this.group.add(leg);
            this.legs.push(leg);
        }
    }

    explode() {
        if (this.isDead) return;

        playExplosionSound();

        // 1. Particle burst
        if (this.manager && this.manager.spawnDeathPoof) {
            this.manager.spawnDeathPoof(this.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
        }

        // 2. Destroys 5x5 blocks in the world (as user requested: A1)
        const cx = Math.floor(this.position.x);
        const cy = Math.floor(this.position.y);
        const cz = Math.floor(this.position.z);

        let destroyedBlocksCount = 0;
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                for (let dy = -1; dy <= 2; dy++) {
                    const distSq = dx * dx + (dy * 1.1) * (dy * 1.1) + dz * dz;
                    if (distSq <= 6.8) {
                        const bx = cx + dx;
                        const by = cy + dy;
                        const bz = cz + dz;

                        if (bx < 0 || bx >= WORLD_SIZE_X || bz < 0 || bz >= WORLD_SIZE_Z || by < 1 || by >= WORLD_HEIGHT) {
                            continue;
                        }

                        const blockId = this.world.getBlock(bx, by, bz);
                        // Cannot destroy air (0) or Bedrock (14)
                        if (blockId > 0 && blockId !== 14) {
                            this.world.setBlock(bx, by, bz, 0);
                            destroyedBlocksCount++;

                            // 75% chance to drop block so player can collect the exploded blocks
                            if (this.manager && this.manager.drops && Math.random() < 0.75) {
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

        console.log(`[Creeper] Wybuch na 5x5 kratek! Zniszczono ${destroyedBlocksCount} klocków.`);

        // 3. Deal damage to player (exactly 3 HP damage = 1.5 hearts, as user requested: A2)
        if (this.manager && this.manager.player) {
            const playerPos = this.manager.player.position;
            if (playerPos) {
                const distToPlayer = this.position.distanceTo(playerPos);
                if (distToPlayer <= 3.8) {
                    if (this.manager.survival) {
                        this.manager.survival.takeDamage(3, 'Wybuch Creepera 💥');
                    }
                }
            }
        }

        // 4. Damage nearby mobs in 5x5 area
        if (this.manager && this.manager.animals) {
            for (const other of this.manager.animals) {
                if (other !== this && !other.isDead && other.position) {
                    const dist = this.position.distanceTo(other.position);
                    if (dist <= 3.8) {
                        other.onAttacked(12, this.position);
                    }
                }
            }
        }

        eventBus.emit('ui:popup', '💥 BUM! Wybuch Creepera!');
        if (this.manager?.ui) {
            this.manager.ui.showPopup('💥 BUM! Wybuch Creepera!');
        }

        this.die(true);
    }

    die(exploded = false) {
        if (this.isDead) return;

        // When killed by player sword/arrow BEFORE exploding -> Drop Gunpowder (ID 36)!
        if (!exploded && this.manager && this.manager.drops) {
            const count = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < count; i++) {
                const drop = new DroppedItem(
                    this.scene,
                    this.world,
                    36,
                    'Proch Strzelniczy',
                    this.position.x + (Math.random() - 0.5) * 0.4,
                    this.position.y + 0.3,
                    this.position.z + (Math.random() - 0.5) * 0.4
                );
                this.manager.drops.items.push(drop);
            }
            console.log(`[Drops] Creeper upuścił Proch Strzelniczy (ID: 36) x${count}!`);
        }

        super.die();
    }

    update(dt, playerPosition = null, isDay = true) {
        if (this.isDead) return;

        this.updateHealthBar(playerPosition);

        let distToPlayer = 999;
        if (playerPosition) {
            distToPlayer = this.position.distanceTo(playerPosition);
        }

        const detectRange = 15.0;
        const fuseRange = 3.2;
        const defuseRange = 4.8;

        if (distToPlayer <= detectRange) {
            this.targetRotationY = Math.atan2(playerPosition.x - this.position.x, playerPosition.z - this.position.z);

            if (distToPlayer <= fuseRange) {
                if (!this.isFusing) {
                    this.isFusing = true;
                    this.fuseTimer = 0;
                    playHissSound(1.0);
                    eventBus.emit('ui:popup', '⚠️ Sssss... Creeper zaraz wybuchnie!');
                    if (this.manager?.ui) {
                        this.manager.ui.showPopup('⚠️ Sssss... Creeper zaraz wybuchnie!');
                    }
                }

                this.state = 'idle';
                this.fuseTimer += dt;

                // Visual swelling (scale 1.0 -> 1.28)
                const swell = 1.0 + (this.fuseTimer / this.fuseDuration) * 0.28;
                this.group.scale.set(swell, swell, swell);

                // Flashing white
                this.flashTimer += dt;
                if (this.flashTimer >= 0.12) {
                    this.flashTimer = 0;
                    this.flashWhiteState = !this.flashWhiteState;
                    const c = this.flashWhiteState ? 0xffffff : 0x4ade80;
                    this.skinMat.color.setHex(c);
                }

                if (this.fuseTimer >= this.fuseDuration) {
                    this.explode();
                    return;
                }
            } else if (distToPlayer > defuseRange && this.isFusing) {
                // Defused! Player ran away
                this.isFusing = false;
                this.fuseTimer = 0;
                this.group.scale.set(1.0, 1.0, 1.0);
                this.skinMat.color.setHex(0x4ade80);
                this.state = 'walk';
            } else {
                if (!this.isFusing) {
                    this.state = 'walk';
                }
            }
        } else {
            if (this.isFusing) {
                this.isFusing = false;
                this.fuseTimer = 0;
                this.group.scale.set(1.0, 1.0, 1.0);
                this.skinMat.color.setHex(0x4ade80);
            }

            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.stateTimer = 1.5 + Math.random() * 3.5;
                if (Math.random() < 0.5) {
                    this.state = 'walk';
                    this.targetRotationY = Math.random() * Math.PI * 2;
                } else {
                    this.state = 'idle';
                }
            }
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

            const swing = Math.sin(this.animTime) * 0.6;
            this.legs[0].rotation.x = swing;
            this.legs[1].rotation.x = -swing;
            this.legs[2].rotation.x = -swing;
            this.legs[3].rotation.x = swing;
        } else {
            for (const leg of this.legs) {
                leg.rotation.x *= 0.8;
            }
        }

        this.updateFooting(dt);
    }
}

export class Dirtik extends Mob {
    constructor(scene, world, x = 32, z = 32, manager = null) {
        // Grid alignment: center on voxel block (Math.floor + 0.5)
        const blockX = Math.floor(x) + 0.5;
        const blockZ = Math.floor(z) + 0.5;
        super(scene, world, 'dirtik', blockX, blockZ, manager);
        this.maxHealth = 8;
        this.health = 8;
        this.walkSpeed = 1.45;
        this.isAwakened = false;
        this.attackCooldown = 0;
        this.swingTime = 0;

        this.buildModels();
        this.buildHealthBar(1.4);
        if (this.healthBarGroup) {
            this.healthBarGroup.visible = false; // Hidden while disguised
        }
        this.snapToGround();
        this.scene.add(this.group);
    }

    buildModels() {
        // --- 1. Disguised Mode: standard dirt cube (1x1x1) sitting on the ground ---
        this.disguisedGroup = new THREE.Group();

        const dirtGeo = new THREE.BoxGeometry(0.99, 0.99, 0.99);
        const def = BLOCK_DEF[2]; // Dirt block definition
        const faceTileIndices = [
            def.tiles[5], def.tiles[4], def.tiles[0], def.tiles[1], def.tiles[2], def.tiles[3]
        ];
        const uvs = [];
        for (let f = 0; f < 6; f++) {
            const { u0, v0, u1, v1 } = getTileUV(faceTileIndices[f]);
            uvs.push(u0, v1, u1, v1, u0, v0, u1, v0);
        }
        dirtGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        const dirtMesh = new THREE.Mesh(dirtGeo, AtlasMaterial);
        dirtMesh.position.set(0, 0.5, 0);
        dirtMesh.castShadow = true;
        dirtMesh.receiveShadow = true;
        this.disguisedGroup.add(dirtMesh);

        this.group.add(this.disguisedGroup);

        // --- 2. Awakened Mode: dirt-block creature holding Diamond Sword ---
        this.awakenedGroup = new THREE.Group();
        this.awakenedGroup.visible = false;

        const dirtMat = new THREE.MeshLambertMaterial({ color: 0x854d0e });       // Warm dirt brown
        const darkDirtMat = new THREE.MeshLambertMaterial({ color: 0x713f12 });   // Dark dirt spots
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });          // Curious white eyes
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1c1917 });        // Dark pupils

        // Head (0.36 x 0.36 x 0.36)
        const headGeo = new THREE.BoxGeometry(0.36, 0.36, 0.36);
        this.head = new THREE.Mesh(headGeo, dirtMat);
        this.head.position.set(0, 0.88, 0);
        this.head.castShadow = true;
        this.awakenedGroup.add(this.head);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.02);
        const lEye = new THREE.Mesh(eyeGeo, eyeMat);
        lEye.position.set(-0.09, 0.03, 0.185);
        const rEye = new THREE.Mesh(eyeGeo, eyeMat);
        rEye.position.set(0.09, 0.03, 0.185);
        this.head.add(lEye, rEye);

        const pupilGeo = new THREE.BoxGeometry(0.04, 0.04, 0.025);
        const lPupil = new THREE.Mesh(pupilGeo, pupilMat);
        lPupil.position.set(-0.08, 0.02, 0.19);
        const rPupil = new THREE.Mesh(pupilGeo, pupilMat);
        rPupil.position.set(0.10, 0.02, 0.19);
        this.head.add(lPupil, rPupil);

        // Body / Torso (0.34 x 0.44 x 0.24)
        const bodyGeo = new THREE.BoxGeometry(0.34, 0.44, 0.24);
        this.body = new THREE.Mesh(bodyGeo, darkDirtMat);
        this.body.position.set(0, 0.52, 0);
        this.body.castShadow = true;
        this.awakenedGroup.add(this.body);

        // Left Arm (0.10 x 0.34 x 0.10)
        const armGeo = new THREE.BoxGeometry(0.10, 0.34, 0.10);
        this.lArm = new THREE.Mesh(armGeo, dirtMat);
        this.lArm.position.set(-0.23, 0.52, 0);
        this.awakenedGroup.add(this.lArm);

        // Right Arm (holds the Diamond Sword!)
        this.rArm = new THREE.Mesh(armGeo, dirtMat);
        this.rArm.position.set(0.23, 0.52, 0);
        this.awakenedGroup.add(this.rArm);

        // Diamond Sword in right hand!
        this.swordMesh = new THREE.Group();
        this.swordMesh.position.set(0, -0.14, 0.12);
        this.swordMesh.rotation.set(-0.8, 0, 0);

        // Cyan Glowing Diamond Blade
        const bladeGeo = new THREE.BoxGeometry(0.05, 0.46, 0.035);
        const bladeMat = new THREE.MeshLambertMaterial({
            color: 0x38bdf8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.5
        });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.set(0, 0.20, 0);
        this.swordMesh.add(blade);

        // Crossguard
        const guardGeo = new THREE.BoxGeometry(0.16, 0.03, 0.05);
        const guardMat = new THREE.MeshLambertMaterial({ color: 0x0369a1 });
        const guard = new THREE.Mesh(guardGeo, guardMat);
        guard.position.set(0, -0.04, 0);
        this.swordMesh.add(guard);

        // Handle
        const handleGeo = new THREE.BoxGeometry(0.04, 0.10, 0.04);
        const handleMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(0, -0.09, 0);
        this.swordMesh.add(handle);

        this.rArm.add(this.swordMesh);

        // 2 Legs (0.13 x 0.30 x 0.13)
        const legGeo = new THREE.BoxGeometry(0.13, 0.30, 0.13);
        this.legs = [
            new THREE.Mesh(legGeo, dirtMat),
            new THREE.Mesh(legGeo, dirtMat)
        ];
        this.legs[0].position.set(-0.09, 0.15, 0);
        this.legs[1].position.set(0.09, 0.15, 0);
        this.awakenedGroup.add(this.legs[0]);
        this.awakenedGroup.add(this.legs[1]);

        this.group.add(this.awakenedGroup);
    }

    awaken() {
        if (this.isAwakened || this.isDead) return;
        this.isAwakened = true;

        this.disguisedGroup.visible = false;
        this.awakenedGroup.visible = true;
        if (this.healthBarGroup) {
            this.healthBarGroup.visible = true;
        }

        // Small pop dust
        if (this.manager?.spawnDeathPoof) {
            this.manager.spawnDeathPoof(this.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
        }

        playHitSound();

        // Little hop
        this.position.y += 0.3;

        // Battle cry on screen!
        const msg = '🗣️ „Ja to Dirtik, a tyś chciał mnie zabić!” 🗡️🟫';
        eventBus.emit('ui:popup', msg);
        if (this.manager?.ui) {
            this.manager.ui.showPopup(msg);
        }
        console.log('[Dirtik] Obudził się z okrzykiem: Ja to Dirtik, a tyś chciał mnie zabić!');
    }

    onAttacked(damage = 2, attackerPos = null) {
        if (!this.isAwakened) {
            this.awaken();
        }
        super.onAttacked(damage, attackerPos);
    }

    die() {
        if (this.isDead) return;

        // Slain by player: drop a lot of Dirt blocks (4 to 6)!
        if (this.manager && this.manager.drops) {
            const count = 4 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                const drop = new DroppedItem(
                    this.scene,
                    this.world,
                    2,
                    'Ziemia',
                    this.position.x + (Math.random() - 0.5) * 0.4,
                    this.position.y + 0.3,
                    this.position.z + (Math.random() - 0.5) * 0.4
                );
                this.manager.drops.items.push(drop);
            }
            console.log(`[Drops] Z pokonanego Dirtika wypadło ${count} klocków Ziemi!`);
        }

        super.die();
    }

    update(dt, playerPosition = null, isDay = true) {
        if (this.isDead) return;

        // If still disguised, stay still and keep disguised; surprise ambush if player gets close!
        if (!this.isAwakened) {
            this.updateFooting(dt);
            if (playerPosition) {
                const distToPlayer = this.position.distanceTo(playerPosition);
                if (distToPlayer <= 2.3) {
                    this.awaken();
                }
            }
            return;
        }

        this.updateHealthBar(playerPosition);

        let distToPlayer = 999;
        if (playerPosition) {
            distToPlayer = this.position.distanceTo(playerPosition);
        }

        // Hostile chasing behavior
        if (distToPlayer < 24.0) {
            this.targetRotationY = Math.atan2(playerPosition.x - this.position.x, playerPosition.z - this.position.z);
            this.state = 'walk';

            // Attack with Diamond Sword if close!
            if (distToPlayer <= 2.0) {
                if (this.attackCooldown > 0) {
                    this.attackCooldown -= dt;
                } else {
                    this.attackCooldown = 0.85;
                    this.swingTime = 0.35; // Trigger arm swing

                    playHitSound();

                    // Deal 1 heart (2 HP)
                    if (this.manager?.survival) {
                        this.manager.survival.takeDamage(2, 'Cios Dirtika diamentowym mieczem! 🗡️');
                    }
                }
            } else {
                if (this.attackCooldown > 0) this.attackCooldown -= dt;
            }
        } else {
            this.state = 'idle';
        }

        // Sword swing animation
        if (this.swingTime > 0) {
            this.swingTime -= dt;
            this.rArm.rotation.x = -1.2 + Math.sin(this.swingTime * 15) * 0.8;
        } else {
            this.rArm.rotation.x = -0.3;
        }

        // Smooth rotation
        let diff = this.targetRotationY - this.rotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.rotationY += diff * 4 * dt;
        this.group.rotation.y = this.rotationY;

        // Walking
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
            this.lArm.rotation.x = -swing;
        } else {
            this.legs[0].rotation.x *= 0.8;
            this.legs[1].rotation.x *= 0.8;
            this.lArm.rotation.x *= 0.8;
        }

        this.updateFooting(dt);
    }
}
