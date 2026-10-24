import * as THREE from 'three';
import { Mob } from '../mob.js';
import { WORLD_SIZE_X, WORLD_SIZE_Z, WORLD_HEIGHT } from '../../world.js';
import { DroppedItem } from '../../drops.js';
import { eventBus } from '../../events.js';
import { playHitSound, playHissSound, playExplosionSound, playDirtikVoiceSound, playRobotWakeSound, playLaserSwordSound, playCyberTeleportSound, playMiniRobotZapSound, playReactorChargeSound, playBossStompSound } from '../../audio.js';
import { BLOCK_DEF, AtlasMaterial, getTileUV } from '../../textures.js?v=water_2';


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
        this.attackDamage = 5; // 5 HP (2.5 serduszka)
        this.isAwakened = false;
        this.attackCooldown = 0;
        this.swingTime = 0;

        this.buildModels();
        this.buildHealthBar(1.4);
        if (this.healthBarGroup) {
            this.healthBarGroup.visible = false; // Hidden while disguised
        }
        this.snapToGround();
        // Strict 0 rotation while disguised so it is 1:1 aligned with voxel grid
        this.rotationY = 0;
        this.targetRotationY = 0;
        this.group.rotation.set(0, 0, 0);
        this.scene.add(this.group);
    }

    buildModels() {
        // --- 1. Disguised Mode: standard dirt cube (1x1x1) sitting on the ground ---
        this.disguisedGroup = new THREE.Group();

        const dirtGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
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
        const disguiseMat = AtlasMaterial.clone();
        disguiseMat.name = 'DirtikDisguiseMaterial';
        const dirtMesh = new THREE.Mesh(dirtGeo, disguiseMat);
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
        playDirtikVoiceSound();

        // Little hop
        this.position.y += 0.3;

        // Battle cry on screen!
        const msg = '🗣️ „Wiem, że to ty chcesz mnie zabić!” 🗡️🟫';
        eventBus.emit('ui:popup', msg);
        if (this.manager?.ui) {
            this.manager.ui.showPopup(msg);
        }
        console.log('[Dirtik] Obudził się z okrzykiem: Wiem, że to ty chcesz mnie zabić!');
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
            // Strict 0 rotation while disguised so it stays 1:1 aligned with the voxel world
            this.rotationY = 0;
            this.targetRotationY = 0;
            this.group.rotation.set(0, 0, 0);
            if (playerPosition) {
                const distToPlayer = this.position.distanceTo(playerPosition);
                if (distToPlayer <= 2.5) {
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

                    // Deal 5 HP (2.5 serduszka)
                    if (this.manager?.survival) {
                        this.manager.survival.takeDamage(this.attackDamage, 'Cios Dirtika diamentowym mieczem! 🗡️');
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

// -------------------------------------------------------------
// Robot Transformer Mob (Disguised metallic cube -> Mecha Robot with laser sword)
// Attacks for 10 DMG (5 hearts!), 40 HP, wakes within 5 blocks!
// -------------------------------------------------------------
export class Robot extends Mob {
    constructor(scene, world, x = 32, z = 32, manager = null) {
        const blockX = Math.floor(x) + 0.5;
        const blockZ = Math.floor(z) + 0.5;
        super(scene, world, 'robot', blockX, blockZ, manager);
        this.maxHealth = 40;
        this.health = 40;
        this.walkSpeed = 1.4;
        this.attackDamage = 7; // Exactly 3 hits without armor (7 * 3 = 21 DMG vs 20 HP)!
        this.isAwakened = false;

        this.awakenDistance = 5.0;
        this.attackCooldown = 0;
        this.swingTime = 0;

        this.buildModels();
        this.buildHealthBar(2.2);
        if (this.healthBarGroup) {
            this.healthBarGroup.visible = false;
        }
        this.snapToGround();
        this.rotationY = 0;
        this.targetRotationY = 0;
        this.group.rotation.set(0, 0, 0);
        this.scene.add(this.group);
    }

    buildModels() {
        // --- 1. Disguised Mode: metallic high-tech cube (1x1x1) with glowing red sensor ---
        this.disguisedGroup = new THREE.Group();
        const steelMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
        const trimMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
        const ledMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        const cubeGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
        const cubeMesh = new THREE.Mesh(cubeGeo, steelMat);
        cubeMesh.position.set(0, 0.5, 0);
        cubeMesh.castShadow = true;
        this.disguisedGroup.add(cubeMesh);

        // Tech trims on cube
        const trimTop = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.08, 1.02), trimMat);
        trimTop.position.set(0, 0.96, 0);
        this.disguisedGroup.add(trimTop);

        // Glowing red diode in center of front face
        const diode = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.04), ledMat);
        diode.position.set(0, 0.5, 0.51);
        this.disguisedGroup.add(diode);

        this.group.add(this.disguisedGroup);

        // --- 2. Awakened Mode: Standing Mecha Robot with Laser Sword ---
        this.awakenedGroup = new THREE.Group();
        this.awakenedGroup.visible = false;

        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
        const armorMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
        const yellowMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 }); // Hazard stripes
        const visorMat = new THREE.MeshBasicMaterial({ color: 0xff2222 }); // Red visor
        const laserMat = new THREE.MeshLambertMaterial({
            color: 0x38bdf8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.8
        });

        // Head (0.44 x 0.40 x 0.40)
        const headGeo = new THREE.BoxGeometry(0.44, 0.40, 0.40);
        this.head = new THREE.Mesh(headGeo, armorMat);
        this.head.position.set(0, 1.48, 0);
        this.head.castShadow = true;
        this.awakenedGroup.add(this.head);

        // Antenna
        const ant = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.04), yellowMat);
        ant.position.set(0, 0.3, 0);
        this.head.add(ant);

        // Visor
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.10, 0.03), visorMat);
        visor.position.set(0, 0.02, 0.21);
        this.head.add(visor);

        // Torso / Chest (0.56 x 0.66 x 0.36)
        const torsoGeo = new THREE.BoxGeometry(0.56, 0.66, 0.36);
        this.body = new THREE.Mesh(torsoGeo, bodyMat);
        this.body.position.set(0, 0.95, 0);
        this.body.castShadow = true;
        this.awakenedGroup.add(this.body);

        // Glowing reactor core in chest
        const coreMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const core = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.04), coreMat);
        core.position.set(0, 0.05, 0.19);
        this.body.add(core);

        // Left Arm (pivot at shoulder)
        const armGeo = new THREE.BoxGeometry(0.16, 0.60, 0.16);
        this.lArmPivot = new THREE.Group();
        this.lArmPivot.position.set(-0.38, 1.22, 0);
        const lArmMesh = new THREE.Mesh(armGeo, armorMat);
        lArmMesh.position.set(0, -0.28, 0);
        lArmMesh.castShadow = true;
        this.lArmPivot.add(lArmMesh);
        this.awakenedGroup.add(this.lArmPivot);

        // Right Arm (holds Laser Sword)
        this.rArmPivot = new THREE.Group();
        this.rArmPivot.position.set(0.38, 1.22, 0);
        const rArmMesh = new THREE.Mesh(armGeo, armorMat);
        rArmMesh.position.set(0, -0.28, 0);
        rArmMesh.castShadow = true;
        this.rArmPivot.add(rArmMesh);

        // Laser Cyber-Sword
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), bodyMat);
        handle.position.set(0, -0.56, 0.15);
        this.rArmPivot.add(handle);

        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.85, 0.04), laserMat);
        blade.position.set(0, 0.44, 0);
        handle.add(blade);

        this.awakenedGroup.add(this.rArmPivot);

        // 2 Legs
        const legGeo = new THREE.BoxGeometry(0.20, 0.62, 0.20);
        this.lLegPivot = new THREE.Group();
        this.lLegPivot.position.set(-0.16, 0.62, 0);
        const lLeg = new THREE.Mesh(legGeo, armorMat);
        lLeg.position.set(0, -0.31, 0);
        lLeg.castShadow = true;
        this.lLegPivot.add(lLeg);

        this.rLegPivot = new THREE.Group();
        this.rLegPivot.position.set(0.16, 0.62, 0);
        const rLeg = new THREE.Mesh(legGeo, armorMat);
        rLeg.position.set(0, -0.31, 0);
        rLeg.castShadow = true;
        this.rLegPivot.add(rLeg);

        this.awakenedGroup.add(this.lLegPivot, this.rLegPivot);
        this.legs = [this.lLegPivot, this.rLegPivot];

        this.group.add(this.awakenedGroup);
    }

    awaken() {
        if (this.isAwakened) return;
        this.isAwakened = true;
        this.disguisedGroup.visible = false;
        this.awakenedGroup.visible = true;
        if (this.healthBarGroup) {
            this.healthBarGroup.visible = true;
        }

        playRobotWakeSound();
        eventBus.emit('ui:popup', '🤖 UWAGA! Robot Transformer obudził się z mieczem!');
        if (this.manager?.ui) {
            this.manager.ui.addChatMessage('Serwer', '🤖 Bzzzt! Bojowy Robot powstał do walki! Uważaj na potężne ciosy za 5 serduszek!', 'chat-warning');
        }
    }

    die() {
        if (this.isDead) return;
        super.die();
        eventBus.emit('mob:killed', { type: 'robot' });

        // Drops: Only Niebieski Pierwiastek (ID 49) as requested by player!
        if (this.manager && this.manager.drops) {
            const blueCount = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < blueCount; i++) {
                const blueDrop = new DroppedItem(
                    this.scene,
                    this.world,
                    49,
                    'Niebieski Pierwiastek',
                    this.position.x + (Math.random() - 0.5) * 0.6,
                    this.position.y + 0.6,
                    this.position.z + (Math.random() - 0.5) * 0.6
                );
                this.manager.drops.add(blueDrop);
            }
        }

        if (this.manager?.ui) {
            this.manager.ui.addChatMessage('Serwer', '🏆 Zwycięstwo! Pokonałeś Robota Transformera! Zdobyłeś Niebieski Pierwiastek 💠!', 'chat-success');
        }
    }

    update(dt, playerPosition) {
        if (this.isDead || !playerPosition) return;

        // Disguised mode: check proximity to wake up
        if (!this.isAwakened) {
            const dist = this.group.position.distanceTo(playerPosition);
            if (dist <= this.awakenDistance) {
                this.awaken();
            } else {
                return;
            }
        }

        // Awakened combat AI
        const dx = playerPosition.x - this.position.x;
        const dz = playerPosition.z - this.position.z;
        const dist = Math.hypot(dx, dz);

        this.targetRotationY = Math.atan2(dx, dz);

        // Move towards player if not in melee range
        if (dist > 1.8 && dist < 35.0) {
            this.state = 'walk';
        } else if (dist <= 2.2) {
            this.state = 'idle';
            if (this.attackCooldown <= 0) {
                this.attackCooldown = 1.4;
                this.swingTime = 0.35;
                playLaserSwordSound();
                playHitSound();

                if (this.manager?.survival) {
                    this.manager.survival.takeDamage(this.attackDamage, 'Cios Laserowym Mieczem Robota! 🤖⚡');
                }
                eventBus.emit('ui:popup', '💥 Robot trafił Cię mieczem! (3 hity do zgonu bez zbroi!)');
            }

        } else {
            this.state = 'idle';
        }

        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        // Sword swing animation
        if (this.swingTime > 0) {
            this.swingTime -= dt;
            this.rArmPivot.rotation.x = -1.4 + Math.sin(this.swingTime * 14) * 1.0;
        } else {
            this.rArmPivot.rotation.x = -0.3;
        }

        // Smooth rotation
        let diff = this.targetRotationY - this.rotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.rotationY += diff * 4 * dt;
        this.group.rotation.y = this.rotationY;

        // Walking animation & movement
        if (this.state === 'walk') {
            this.animTime += dt * 7.5;
            const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
            const nextX = this.position.x + fwd.x * this.walkSpeed * dt;
            const nextZ = this.position.z + fwd.z * this.walkSpeed * dt;

            const groundAtTarget = this.getGroundHeight(nextX, nextZ);
            if (groundAtTarget - this.position.y <= 1.2) {
                this.position.x = nextX;
                this.position.z = nextZ;
            }

            const swing = Math.sin(this.animTime) * 0.6;
            this.legs[0].rotation.x = swing;
            this.legs[1].rotation.x = -swing;
            this.lArmPivot.rotation.x = -swing;
        } else {
            this.legs[0].rotation.x *= 0.8;
            this.legs[1].rotation.x *= 0.8;
            this.lArmPivot.rotation.x *= 0.8;
        }

        this.updateFooting(dt);
    }
}

// -------------------------------------------------------------
// Boss Robot Mob (Spawned via Totem: Dirt + Stone + Krzesiwo!)
// Has 4 arms, starts small and grows GIANT (scale 3.5), smashes trees, 160 HP!
// Dual industrial exhaust smokestacks emitting smoke particles, hydraulic pistons,
// heavy stomping footsteps and camera shake!
// -------------------------------------------------------------
export class BossRobot extends Mob {
    constructor(scene, world, x = 32, z = 32, manager = null) {
        const blockX = Math.floor(x) + 0.5;
        const blockZ = Math.floor(z) + 0.5;
        super(scene, world, 'boss_robot', blockX, blockZ, manager);
        this.maxHealth = 160;
        this.health = 160;
        this.walkSpeed = 1.9;
        this.attackDamage = 5; // Potężny atak 4-ramiennego kolosa!
        this.isAwakening = true;
        this.awakenTimer = 0;
        this.targetScale = 3.5;
        this.attackCooldown = 0;
        this.swingTime = 0;
        this.treeSmashCooldown = 0;
        this.smokeParticles = [];
        this.smokeTimer = 0;
        this.stompTimer = 0;

        this.buildModel();
        this.buildHealthBar(3.5);
        this.group.scale.set(0.35, 0.35, 0.35); // Starts small, then grows!

        this.snapToGround();
        this.rotationY = 0;
        this.targetRotationY = 0;
        this.group.rotation.set(0, 0, 0);
        this.scene.add(this.group);

        if (this.manager?.ui) {
            this.manager.ui.showBossBar('👑 BOSS ROBOT', this.health, this.maxHealth);
        }

        playRobotWakeSound();
    }

    buildModel() {
        this.modelGroup = new THREE.Group();

        const darkSteelMat = new THREE.MeshLambertMaterial({ color: 0x0f172a }); // Dark Obsidian Steel
        const armorGoldMat = new THREE.MeshLambertMaterial({ color: 0xd97706 }); // Hazard Gold
        const redCoreMat = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Fiery glowing core
        const cyanLaserMat = new THREE.MeshLambertMaterial({
            color: 0x38bdf8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.9
        });
        const redLaserMat = new THREE.MeshLambertMaterial({
            color: 0xf43f5e,
            emissive: 0xbe123c,
            emissiveIntensity: 0.9
        });

        // Massive Torso / Chest
        const chestGeo = new THREE.BoxGeometry(0.95, 1.05, 0.65);
        this.body = new THREE.Mesh(chestGeo, darkSteelMat);
        this.body.position.set(0, 1.35, 0);
        this.body.castShadow = true;
        this.modelGroup.add(this.body);

        // Gold Shoulder Plates
        const leftPauldrons = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.35, 0.75), armorGoldMat);
        leftPauldrons.position.set(-0.62, 0.45, 0);
        this.body.add(leftPauldrons);

        const rightPauldrons = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.35, 0.75), armorGoldMat);
        rightPauldrons.position.set(0.62, 0.45, 0);
        this.body.add(rightPauldrons);

        // Giant Reactor Core in center
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), redCoreMat);
        core.position.set(0, 0.12, 0.35);
        this.body.add(core);

        // Dual industrial exhaust chimneys on back
        const pipeGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.85, 8);
        const pipeTipGeo = new THREE.CylinderGeometry(0.13, 0.12, 0.10, 8);
        const pipeMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
        const tipMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

        this.leftExhaust = new THREE.Group();
        this.leftExhaust.position.set(-0.30, 0.50, -0.38);
        this.leftExhaust.rotation.x = -0.25;
        this.leftExhaust.rotation.z = -0.12;
        const lPipe = new THREE.Mesh(pipeGeo, pipeMat);
        this.leftExhaust.add(lPipe);
        const lTip = new THREE.Mesh(pipeTipGeo, tipMat);
        lTip.position.y = 0.42;
        this.leftExhaust.add(lTip);
        this.body.add(this.leftExhaust);

        this.rightExhaust = new THREE.Group();
        this.rightExhaust.position.set(0.30, 0.50, -0.38);
        this.rightExhaust.rotation.x = -0.25;
        this.rightExhaust.rotation.z = 0.12;
        const rPipe = new THREE.Mesh(pipeGeo, pipeMat);
        this.rightExhaust.add(rPipe);
        const rTip = new THREE.Mesh(pipeTipGeo, tipMat);
        rTip.position.y = 0.42;
        this.rightExhaust.add(rTip);
        this.body.add(this.rightExhaust);

        // Head with dual horns
        const headGeo = new THREE.BoxGeometry(0.58, 0.50, 0.52);
        this.head = new THREE.Mesh(headGeo, armorGoldMat);
        this.head.position.set(0, 2.20, 0);
        this.head.castShadow = true;
        this.modelGroup.add(this.head);

        // Glowing red visor
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.15, 0.05), redCoreMat);
        visor.position.set(0, 0.04, 0.28);
        this.head.add(visor);

        // Mecha Horns
        const hornGeo = new THREE.BoxGeometry(0.08, 0.35, 0.08);
        const lHorn = new THREE.Mesh(hornGeo, darkSteelMat);
        lHorn.position.set(-0.26, 0.35, 0);
        lHorn.rotation.z = 0.3;
        this.head.add(lHorn);

        const rHorn = new THREE.Mesh(hornGeo, darkSteelMat);
        rHorn.position.set(0.26, 0.35, 0);
        rHorn.rotation.z = -0.3;
        this.head.add(rHorn);

        // --- 4 MECHANICZNE RĘCE (4 ARMS) ---
        const armGeo = new THREE.BoxGeometry(0.20, 0.75, 0.20);

        // 1. Upper Left Arm (holds Red Laser Blade)
        this.upperLArm = new THREE.Group();
        this.upperLArm.position.set(-0.64, 1.75, 0);
        const uLMesh = new THREE.Mesh(armGeo, darkSteelMat);
        uLMesh.position.set(0, -0.34, 0);
        this.upperLArm.add(uLMesh);
        const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.05, 0.06), redLaserMat);
        blade1.position.set(0, -0.72, 0.22);
        this.upperLArm.add(blade1);
        this.modelGroup.add(this.upperLArm);

        // 2. Upper Right Arm (holds Red Laser Blade)
        this.upperRArm = new THREE.Group();
        this.upperRArm.position.set(0.64, 1.75, 0);
        const uRMesh = new THREE.Mesh(armGeo, darkSteelMat);
        uRMesh.position.set(0, -0.34, 0);
        this.upperRArm.add(uRMesh);
        const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.05, 0.06), redLaserMat);
        blade2.position.set(0, -0.72, 0.22);
        this.upperRArm.add(blade2);
        this.modelGroup.add(this.upperRArm);

        // 3. Lower Left Arm (holds Cyan Laser Blade)
        this.lowerLArm = new THREE.Group();
        this.lowerLArm.position.set(-0.56, 1.20, 0);
        const lLMesh = new THREE.Mesh(armGeo, armorGoldMat);
        lLMesh.position.set(0, -0.34, 0);
        this.lowerLArm.add(lLMesh);
        const blade3 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.95, 0.06), cyanLaserMat);
        blade3.position.set(0, -0.72, 0.22);
        this.lowerLArm.add(blade3);
        this.modelGroup.add(this.lowerLArm);

        // 4. Lower Right Arm (holds Cyan Laser Blade)
        this.lowerRArm = new THREE.Group();
        this.lowerRArm.position.set(0.56, 1.20, 0);
        const lRMesh = new THREE.Mesh(armGeo, armorGoldMat);
        lRMesh.position.set(0, -0.34, 0);
        this.lowerRArm.add(lRMesh);
        const blade4 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.95, 0.06), cyanLaserMat);
        blade4.position.set(0, -0.72, 0.22);
        this.lowerRArm.add(blade4);
        this.modelGroup.add(this.lowerRArm);

        // 2 Heavy Mecha Legs with hydraulic pistons
        const legGeo = new THREE.BoxGeometry(0.32, 0.90, 0.32);
        const pistonGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.55, 8);
        const chromeMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
        this.legs = [];

        const lLegPivot = new THREE.Group();
        lLegPivot.position.set(-0.28, 0.85, 0);
        const lLegMesh = new THREE.Mesh(legGeo, darkSteelMat);
        lLegMesh.position.set(0, -0.45, 0);
        lLegPivot.add(lLegMesh);
        const lPiston = new THREE.Mesh(pistonGeo, chromeMat);
        lPiston.position.set(0.14, -0.40, 0.14);
        lLegPivot.add(lPiston);
        this.modelGroup.add(lLegPivot);
        this.legs.push(lLegPivot);

        const rLegPivot = new THREE.Group();
        rLegPivot.position.set(0.28, 0.85, 0);
        const rLegMesh = new THREE.Mesh(legGeo, darkSteelMat);
        rLegMesh.position.set(0, -0.45, 0);
        rLegPivot.add(rLegMesh);
        const rPiston = new THREE.Mesh(pistonGeo, chromeMat);
        rPiston.position.set(-0.14, -0.40, 0.14);
        rLegPivot.add(rPiston);
        this.modelGroup.add(rLegPivot);
        this.legs.push(rLegPivot);

        this.group.add(this.modelGroup);
    }

    emitSmoke() {
        if (!this.scene) return;
        const pos = new THREE.Vector3();
        const exhausts = [this.leftExhaust, this.rightExhaust];
        for (const ex of exhausts) {
            if (!ex) continue;
            ex.getWorldPosition(pos);
            pos.y += 0.5;
            const geo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
            const mat = new THREE.MeshBasicMaterial({
                color: (Math.random() > 0.4 ? 0x334155 : 0x1e293b),
                transparent: true,
                opacity: 0.75
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            this.scene.add(mesh);
            this.smokeParticles.push({
                mesh,
                mat,
                geo,
                life: 0,
                maxLife: 1.2 + Math.random() * 0.4,
                vx: (Math.random() - 0.5) * 0.4,
                vy: 0.9 + Math.random() * 0.5,
                vz: (Math.random() - 0.5) * 0.4
            });
        }
    }

    updateSmoke(dt) {
        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const p = this.smokeParticles[i];
            p.life += dt;
            if (p.life >= p.maxLife) {
                if (p.mesh && p.mesh.parent) this.scene.remove(p.mesh);
                p.geo?.dispose();
                p.mat?.dispose();
                this.smokeParticles.splice(i, 1);
                continue;
            }
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;
            const progress = p.life / p.maxLife;
            p.mat.opacity = 0.75 * (1 - progress);
            const s = 1.0 + progress * 1.6;
            p.mesh.scale.set(s, s, s);
        }
    }

    takeDamage(amount, source = '') {
        if (this.isAwakening) return; // Invulnerable while waking up!
        super.takeDamage(amount, source);
    }

    die() {
        super.die();
        eventBus.emit('mob:killed', { type: 'boss_robot' });
        eventBus.emit('boss_robot:defeated');

        // Cleanup smoke particles
        if (this.smokeParticles) {
            for (const p of this.smokeParticles) {
                if (p.mesh && p.mesh.parent) this.scene.remove(p.mesh);
                p.geo?.dispose();
                p.mat?.dispose();
            }
            this.smokeParticles = [];
        }

        // Boss Drops: 4x Blue Element, 8x Diamonds, 1x Laser Sword, 1x Mystery Box!
        if (this.manager && this.manager.drops) {
            // 4 Blue Elements
            for (let i = 0; i < 4; i++) {
                const drop = new DroppedItem(
                    this.scene,
                    this.world,
                    49,
                    'Niebieski Pierwiastek',
                    this.position.x + (Math.random() - 0.5) * 1.2,
                    this.position.y + 1.2,
                    this.position.z + (Math.random() - 0.5) * 1.2
                );
                this.manager.drops.add(drop);
            }

            // 8 Diamonds
            for (let i = 0; i < 8; i++) {
                const drop = new DroppedItem(
                    this.scene,
                    this.world,
                    30,
                    'Diament',
                    this.position.x + (Math.random() - 0.5) * 1.5,
                    this.position.y + 1.0,
                    this.position.z + (Math.random() - 0.5) * 1.5
                );
                this.manager.drops.add(drop);
            }

            // 1 Laser Sword
            const sword = new DroppedItem(
                this.scene,
                this.world,
                47,
                'Laserowy Miecz',
                this.position.x,
                this.position.y + 1.2,
                this.position.z
            );
            this.manager.drops.add(sword);

            // 1 Mystery Box
            const box = new DroppedItem(
                this.scene,
                this.world,
                44,
                'Mystery Box',
                this.position.x + 0.4,
                this.position.y + 1.2,
                this.position.z - 0.4
            );
            this.manager.drops.add(box);

            // 4 Rubies
            for (let i = 0; i < 4; i++) {
                const drop = new DroppedItem(
                    this.scene,
                    this.world,
                    35,
                    'Rubin',
                    this.position.x + (Math.random() - 0.5) * 1.5,
                    this.position.y + 1.2,
                    this.position.z + (Math.random() - 0.5) * 1.5
                );
                this.manager.drops.add(drop);
            }

            // 1 Kolorowy Blok 626
            const block626 = new DroppedItem(
                this.scene,
                this.world,
                51,
                'Kolorowy Blok 626',
                this.position.x - 0.4,
                this.position.y + 1.2,
                this.position.z + 0.4
            );
            this.manager.drops.add(block626);
        }

        // Zapisanie pokonania Bossa na zawsze w pamięci gry ("bossa możesz zrobić tylko raz")
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('m2_boss_robot_defeated', 'true');
        }

        // Likwidacja wszystkich pozostałych małych robocików
        if (this.manager && this.manager.animals) {
            const minis = this.manager.animals.filter(a => a.type === 'mini_robot' && !a.isDead);
            minis.forEach(m => m.die());
        }

        if (this.manager?.ui) {
            this.manager.ui.addChatMessage('Serwer', '👑 Zwycięstwo! Pokonałeś potężnego 4-ramiennego Bossa Robota! Zgarnij Niebieskie Pierwiastki 💠, Diamenty 💎, Rubiny 🔴 i Laserowy Miecz ⚡!', 'chat-success');
            this.manager.ui.showPopup('👑 BOSS ROBOT POKONANY NA ZAWSZE! Gratulacje! 🏆');
            this.manager.ui.hideBossBar();
        }

        // Złoty portal powrotny do normalnego świata
        this.spawnVictoryPortal();
    }

    destroy() {
        if (this.manager?.ui) {
            this.manager.ui.hideBossBar();
        }
        if (this.smokeParticles) {
            for (const p of this.smokeParticles) {
                if (p.mesh && p.mesh.parent) this.scene.remove(p.mesh);
                p.geo?.dispose();
                p.mat?.dispose();
            }
            this.smokeParticles = [];
        }
        super.destroy();
    }

    spawnVictoryPortal() {
        if (!this.scene) return;
        const portalGroup = new THREE.Group();
        portalGroup.position.set(1000, 11, 1000);

        // Złoty promienisty cylinder portalu
        const portalGeo = new THREE.CylinderGeometry(1.6, 1.6, 6.0, 16, 1, true);
        const portalMat = new THREE.MeshBasicMaterial({
            color: 0xfbbf24,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        const beamMesh = new THREE.Mesh(portalGeo, portalMat);
        beamMesh.position.y = 3.0;
        portalGroup.add(beamMesh);

        // Górna korona portalu
        const ringGeo = new THREE.TorusGeometry(1.6, 0.15, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.y = 5.8;
        portalGroup.add(ringMesh);

        this.scene.add(portalGroup);

        if (this.manager?.ui) {
            this.manager.ui.addChatMessage('Serwer', '🌟 Złoty Portal otwarty! Wejdź do niego w centrum areny, aby bezpiecznie powrócić do swojego świata ze skarbami!', 'chat-server');
        }

        const checkReturnInterval = setInterval(() => {
            if (this.manager?.player && this.manager.player.position) {
                const distToPortal = Math.hypot(this.manager.player.position.x - 1000, this.manager.player.position.z - 1000);
                if (distToPortal <= 2.2) {
                    clearInterval(checkReturnInterval);
                    clearTimeout(autoReturnTimeout);
                    this.scene.remove(portalGroup);
                    eventBus.emit('dimension:return_to_overworld');
                }
            }
        }, 200);

        const autoReturnTimeout = setTimeout(() => {
            clearInterval(checkReturnInterval);
            this.scene.remove(portalGroup);
            eventBus.emit('dimension:return_to_overworld');
        }, 12000);
    }

    summonMiniRobots() {
        if (!this.manager || this.isDead) return;
        eventBus.emit('boss:attack_flash', {
            color: 0xef4444,
            intensity: 4.5,
            x: this.position.x,
            y: this.position.y + 2,
            z: this.position.z
        });
        playRobotWakeSound();
        eventBus.emit('ui:popup', '🤖🚨 Boss Robot wezwał małe robociki! (-2 HP!) 🚨🤖');
        if (this.manager.ui) {
            this.manager.ui.showPopup('🤖🚨 Boss Robot wezwał małe robociki! (-2 HP!)');
        }

        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const rx = this.position.x + Math.cos(angle) * 2.8;
            const rz = this.position.z + Math.sin(angle) * 2.8;
            this.manager.spawnMiniRobot(rx, rz);
        }
    }

    smashNearbyTrees() {
        if (!this.world) return;
        const bx = Math.floor(this.position.x);
        const by = Math.floor(this.position.y);
        const bz = Math.floor(this.position.z);

        for (let ox = -1; ox <= 1; ox++) {
            for (let oz = -1; oz <= 1; oz++) {
                for (let oy = 0; oy <= 3; oy++) {
                    const blockId = this.world.getBlock(bx + ox, by + oy, bz + oz);
                    if (blockId === 4 || blockId === 5) { // Wood or Leaves
                        this.world.setBlock(bx + ox, by + oy, bz + oz, 0);
                        if (this.manager?.drops) {
                            const dropName = blockId === 4 ? 'Drewno' : 'Liście';
                            const drop = new DroppedItem(
                                this.scene,
                                this.world,
                                blockId,
                                dropName,
                                bx + ox + 0.5,
                                by + oy + 0.5,
                                bz + oz + 0.5
                            );
                            this.manager.drops.add(drop);
                        }
                    }
                }
            }
        }
    }

    update(dt, playerPosition) {
        if (this.isDead || !playerPosition) return;

        if (this.manager?.ui) {
            this.manager.ui.updateBossBar(this.health, this.maxHealth);
        }

        // Smoke emission from dual exhaust pipes
        this.smokeTimer += dt;
        if (this.smokeTimer >= 0.12) {
            this.smokeTimer = 0;
            this.emitSmoke();
        }
        this.updateSmoke(dt);

        // 1. Awaken and Growth Animation: Starts small (0.35), then grows GIANT COLOSSUS (scale 3.5)!
        if (this.isAwakening) {
            this.awakenTimer += dt;
            const progress = Math.min(1.0, this.awakenTimer / 2.5);
            const currentScale = 0.35 + (this.targetScale - 0.35) * progress;
            this.group.scale.set(currentScale, currentScale, currentScale);

            // Shaking vibration effect while growing
            this.group.position.x += (Math.random() - 0.5) * 0.08;
            this.group.position.z += (Math.random() - 0.5) * 0.08;

            if (progress >= 1.0) {
                this.isAwakening = false;
                eventBus.emit('ui:popup', '🤖⚠️ POTĘŻNY BOSS ROBOT PRZEBUDZIŁ SIĘ! UWAŻAJ NA 4 RAMIONA! ⚠️🤖');
                if (this.manager?.ui) {
                    this.manager.ui.showPopup('🤖⚠️ POTĘŻNY BOSS ROBOT PRZEBUDZIŁ SIĘ! ⚠️🤖');
                }
            }
            return;
        }

        // 2. Boss Combat AI
        const dx = playerPosition.x - this.position.x;
        const dz = playerPosition.z - this.position.z;
        const dist = Math.hypot(dx, dz);

        this.targetRotationY = Math.atan2(dx, dz);

        // Move towards player
        if (dist > 2.2) {
            const moveStep = this.walkSpeed * dt;
            this.position.x += (dx / dist) * moveStep;
            this.position.z += (dz / dist) * moveStep;
            this.group.position.x = this.position.x;
            this.group.position.z = this.position.z;

            // Heavy Footstep Stomping sound and camera shake
            this.stompTimer += dt;
            if (this.stompTimer >= 0.52) {
                this.stompTimer = 0;
                if (dist < 32.0) {
                    playBossStompSound();
                    const shake = Math.max(0.04, (1 - dist / 32.0) * 0.28);
                    eventBus.emit('camera:shake', shake);
                }
            }

            // Smash trees on way!
            this.treeSmashCooldown += dt;
            if (this.treeSmashCooldown >= 0.3) {
                this.treeSmashCooldown = 0;
                this.smashNearbyTrees();
            }
        } else {
            this.stompTimer = 0.4;
        }

        // 3. Melee Attack: 4 arms swinging rapidly!
        this.attackCooldown -= dt;
        if (dist <= 3.2 && this.attackCooldown <= 0) {
            this.attackCooldown = 1.0; // Fast hits: every 1 second
            this.swingTime = 0.6;
            playLaserSwordSound();

            // Ataki Bossa rozświetlają ciemną mapę błyskami laserów! ("I tylko jak atakuje to ci rozświetla ten ciemny świat")
            eventBus.emit('boss:attack_flash', {
                color: (Math.random() > 0.5 ? 0x38bdf8 : 0xf43f5e),
                intensity: 4.8,
                x: this.position.x,
                y: this.position.y + 2.5,
                z: this.position.z
            });

            if (this.manager?.survival) {
                // If player has armor: 2 hearts (4 HP); without armor: 3 hearts (6 HP)
                const hasArmor = Boolean(this.manager.survival.hasArmor || this.manager.survival.hasRubyArmor || this.manager.survival.hasStoneArmor);
                const actualDamage = hasArmor ? 4 : 6;
                this.manager.survival.takeDamage(actualDamage, 'Cios 4-ramiennego Kolosa Bossa Robota! 🤖💥');
            }
        }

        // 3b. Przywoływanie małych robocików w Mrocznym Wymiarze
        this.summonTimer = (this.summonTimer || 0) + dt;
        if (this.summonTimer >= 10.0) {
            const miniRobots = this.manager ? this.manager.animals.filter(a => a.type === 'mini_robot' && !a.isDead) : [];
            if (miniRobots.length < 3) {
                this.summonTimer = 0;
                this.summonMiniRobots();
            }
        }

        // 4. Arm animations
        this.animTime += dt * 6;
        if (this.swingTime > 0) {
            this.swingTime -= dt;
            const swingPhase = Math.sin((0.6 - this.swingTime) * 18);
            this.upperLArm.rotation.x = -swingPhase * 1.5;
            this.upperRArm.rotation.x = swingPhase * 1.5;
            this.lowerLArm.rotation.x = swingPhase * 1.2;
            this.lowerRArm.rotation.x = -swingPhase * 1.2;
        } else if (dist > 2.2) {
            const legSwing = Math.sin(this.animTime) * 0.5;
            this.legs[0].rotation.x = legSwing;
            this.legs[1].rotation.x = -legSwing;

            // 4 arms alternating walk swing
            this.upperLArm.rotation.x = -legSwing * 0.8;
            this.upperRArm.rotation.x = legSwing * 0.8;
            this.lowerLArm.rotation.x = legSwing * 0.7;
            this.lowerRArm.rotation.x = -legSwing * 0.7;
        } else {
            this.legs[0].rotation.x *= 0.8;
            this.legs[1].rotation.x *= 0.8;
            this.upperLArm.rotation.x *= 0.8;
            this.upperRArm.rotation.x *= 0.8;
            this.lowerLArm.rotation.x *= 0.8;
            this.lowerRArm.rotation.x *= 0.8;
        }

        this.updateFooting(dt);
    }
}

// -------------------------------------------------------------
// MiniRobot Mob (Przywoływany przez Bossa Robota w Mrocznym Wymiarze)
// Zadaje dokładnie 2 HP (1 serduszko), szybki bieg, 12 HP!
// -------------------------------------------------------------
export class MiniRobot extends Mob {
    constructor(scene, world, x = 1000, z = 1000, manager = null) {
        super(scene, world, 'mini_robot', x, z, manager);
        this.maxHealth = 12;
        this.health = 12;
        this.walkSpeed = 2.4;
        this.attackDamage = 2; // DOKŁADNIE 2 HP na życzenie Tymka!
        this.attackCooldown = 0;
        this.swingTime = 0;

        this.buildModel();
        this.buildHealthBar(1.2);
        this.group.scale.set(0.55, 0.55, 0.55);

        this.snapToGround();
        this.scene.add(this.group);
    }

    buildModel() {
        this.modelGroup = new THREE.Group();

        const slateMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
        const redLedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const cyanLaserMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

        // Kompaktowy korpus mini-robocika
        const bodyGeo = new THREE.BoxGeometry(0.50, 0.45, 0.38);
        this.body = new THREE.Mesh(bodyGeo, slateMat);
        this.body.position.set(0, 0.55, 0);
        this.modelGroup.add(this.body);

        // Świecące czerwone oko sensora
        const eyeGeo = new THREE.BoxGeometry(0.28, 0.10, 0.05);
        const eye = new THREE.Mesh(eyeGeo, redLedMat);
        eye.position.set(0, 0.08, 0.20);
        this.body.add(eye);

        // Dwie małe cyber-antenki
        const antGeo = new THREE.BoxGeometry(0.04, 0.22, 0.04);
        const lAnt = new THREE.Mesh(antGeo, slateMat);
        lAnt.position.set(-0.14, 0.32, 0);
        this.body.add(lAnt);
        const lAntTip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), cyanLaserMat);
        lAntTip.position.set(0, 0.12, 0);
        lAnt.add(lAntTip);

        const rAnt = new THREE.Mesh(antGeo, slateMat);
        rAnt.position.set(0.14, 0.32, 0);
        this.body.add(rAnt);
        const rAntTip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), cyanLaserMat);
        rAntTip.position.set(0, 0.12, 0);
        rAnt.add(rAntTip);

        // 2 mechaniczne ramiona z mini-ostrzami cybernetycznymi
        const armGeo = new THREE.BoxGeometry(0.10, 0.35, 0.10);
        this.lArmPivot = new THREE.Group();
        this.lArmPivot.position.set(-0.32, 0.65, 0);
        const lArm = new THREE.Mesh(armGeo, slateMat);
        lArm.position.set(0, -0.16, 0);
        this.lArmPivot.add(lArm);
        const bladeL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.02), cyanLaserMat);
        bladeL.position.set(0, -0.28, 0.08);
        this.lArmPivot.add(bladeL);
        this.modelGroup.add(this.lArmPivot);

        this.rArmPivot = new THREE.Group();
        this.rArmPivot.position.set(0.32, 0.65, 0);
        const rArm = new THREE.Mesh(armGeo, slateMat);
        rArm.position.set(0, -0.16, 0);
        this.rArmPivot.add(rArm);
        const bladeR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.02), cyanLaserMat);
        bladeR.position.set(0, -0.28, 0.08);
        this.rArmPivot.add(bladeR);
        this.modelGroup.add(this.rArmPivot);

        // 2 szybkie nóżki
        const legGeo = new THREE.BoxGeometry(0.12, 0.35, 0.12);
        this.legs = [];
        const lLeg = new THREE.Mesh(legGeo, slateMat);
        lLeg.position.set(-0.14, 0.18, 0);
        this.modelGroup.add(lLeg);
        this.legs.push(lLeg);

        const rLeg = new THREE.Mesh(legGeo, slateMat);
        rLeg.position.set(0.14, 0.18, 0);
        this.modelGroup.add(rLeg);
        this.legs.push(rLeg);

        this.group.add(this.modelGroup);
    }

    die() {
        super.die();
        eventBus.emit('mob:killed', { type: 'mini_robot' });

        if (this.manager && this.manager.drops) {
            // Drop Niebieskiego Pierwiastka lub Jabłka
            const dropId = Math.random() < 0.6 ? 49 : 23;
            const dropName = dropId === 49 ? 'Niebieski Pierwiastek' : 'Jabłko';
            const drop = new DroppedItem(
                this.scene,
                this.world,
                dropId,
                dropName,
                this.position.x,
                this.position.y + 0.6,
                this.position.z
            );
            this.manager.drops.add(drop);
        }
    }

    update(dt, playerPosition) {
        if (this.isDead || !playerPosition) return;

        const dx = playerPosition.x - this.position.x;
        const dz = playerPosition.z - this.position.z;
        const dist = Math.hypot(dx, dz);

        this.targetRotationY = Math.atan2(dx, dz);

        // Bieg w stronę gracza
        if (dist > 1.2 && dist < 32.0) {
            const moveStep = this.walkSpeed * dt;
            this.position.x += (dx / dist) * moveStep;
            this.position.z += (dz / dist) * moveStep;
            this.group.position.x = this.position.x;
            this.group.position.z = this.position.z;

            this.animTime += dt * 12;
            const legSwing = Math.sin(this.animTime) * 0.6;
            this.legs[0].rotation.x = legSwing;
            this.legs[1].rotation.x = -legSwing;
            this.lArmPivot.rotation.x = -legSwing * 0.6;
            this.rArmPivot.rotation.x = legSwing * 0.6;
        }

        // Atak mecha: dokładnie 2 HP (1 serduszko)!
        this.attackCooldown -= dt;
        if (dist <= 1.6 && this.attackCooldown <= 0) {
            this.attackCooldown = 1.1;
            this.swingTime = 0.3;
            playMiniRobotZapSound();

            eventBus.emit('boss:attack_flash', {
                color: 0x38bdf8,
                intensity: 1.8,
                x: this.position.x,
                y: this.position.y + 1,
                z: this.position.z
            });

            if (this.manager?.survival) {
                this.manager.survival.takeDamage(this.attackDamage, 'Cios małego robocika! 🤖⚡');
            }
        }

        if (this.swingTime > 0) {
            this.swingTime -= dt;
            this.rArmPivot.rotation.x = -1.2 + Math.sin(this.swingTime * 18) * 0.8;
            this.lArmPivot.rotation.x = -1.2 - Math.sin(this.swingTime * 18) * 0.8;
        }

        this.updateFooting(dt);
    }
}



