import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { WORLD_SIZE_X, WORLD_SIZE_Z, WORLD_HEIGHT } from './world.js';
import { eventBus } from './events.js';
import { playFreezeShiverSound } from './audio.js';


export class Player {
    constructor(camera, domElement, world, savedPosition = null) {
        this.camera = camera;
        this.domElement = domElement;
        this.world = world;

        this.controls = new PointerLockControls(this.camera, this.domElement);

        // Physics constants
        this.width = 0.6;
        this.height = 1.8;
        this.eyeHeight = 1.6;

        this.position = new THREE.Vector3(32.5, 20, 32.5);
        this.velocity = new THREE.Vector3();
        this.onGround = false;
        this.onFallLanding = null;

        this.walkSpeed = 5.2;
        this.sprintSpeed = 8.5;
        this.jumpForce = 9.0;
        this.gravity = 30.0;
        this.stepHeight = 1.05;

        // Input state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            sprint: false
        };

        this.cameraMode = 0; // 0 = first person, 1 = third person back
        this.walkCycle = 0;
        this.mountedBear = null;
        this.currentArmorType = 0;
        this.isInWater = false;
        this.isHeadUnderwater = false;
        this.bubbleParticles = [];
        this.bubbleSpawnTimer = 0;
        this.underwaterOverlayEl = null;
        this.freezeOverlayEl = document.getElementById('freeze-overlay');
        this.heatOverlayEl = document.getElementById('heat-overlay');
        this.warningBannerEl = document.getElementById('warning-banner');
        this.isFreezing = false;
        this.isHydrated = false;
        this.hydrateTimer = 0;
        this.freezeTimer = 0;
        this.desertTimer = 0;
        this.freezeDamageTimer = 0;
        this.heatDamageTimer = 0;
        this.screenShakeIntensity = 0;

        eventBus.on('camera:shake', (intensity = 0.2) => {
            this.screenShakeIntensity = Math.max(this.screenShakeIntensity, intensity);
        });
        this.questManager = null;


        eventBus.on('water:drank', () => {
            this.isHydrated = true;
            this.hydrateTimer = 60.0;
        });

        this.buildPlayerMesh();


        this.initControls();
        if (savedPosition && typeof savedPosition.x === 'number' && typeof savedPosition.y === 'number' && typeof savedPosition.z === 'number' && !isNaN(savedPosition.x) && !isNaN(savedPosition.y) && !isNaN(savedPosition.z)) {
            this.position.set(savedPosition.x, savedPosition.y, savedPosition.z);
            // Verify player is not trapped inside solid terrain
            if (this.checkVoxelCollision(this.getAABB())) {
                let freed = false;
                for (let nudge = 0.5; nudge <= 8.0; nudge += 0.5) {
                    const testPos = this.position.clone().add(new THREE.Vector3(0, nudge, 0));
                    if (!this.checkVoxelCollision(this.getAABB(testPos))) {
                        this.position.copy(testPos);
                        freed = true;
                        break;
                    }
                }
                if (!freed) {
                    this.spawnOnSurface();
                }
            }
            this.camera.position.set(this.position.x, this.position.y + this.eyeHeight, this.position.z);
        } else {
            this.spawnOnSurface();
        }
    }

    spawnOnSurface() {
        const x = Math.floor(WORLD_SIZE_X / 2);
        const z = Math.floor(WORLD_SIZE_Z / 2);
        let groundY = 15;
        for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
            if (this.world.isSolid(x, y, z)) {
                groundY = y + 1;
                break;
            }
        }
        this.position.set(x + 0.5, groundY + 0.1, z + 0.5);
        this.camera.position.set(this.position.x, this.position.y + this.eyeHeight, this.position.z);
    }

    initControls() {
        const onKeyDown = (e) => {
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                return;
            }

            switch (e.code) {
                case 'KeyW': this.keys.forward = true; break;
                case 'KeyS': this.keys.backward = true; break;
                case 'KeyA': this.keys.left = true; break;
                case 'KeyD': this.keys.right = true; break;
                case 'Space': this.keys.jump = true; break;
                case 'ShiftLeft':
                case 'ControlLeft':
                    this.keys.sprint = true;
                    break;
                case 'KeyV':
                    this.toggleCameraMode();
                    break;
                case 'KeyP':
                    eventBus.emit('player:toggle_mount');
                    break;
                case 'F5':
                    if (this.controls.isLocked) {
                        e.preventDefault();
                        this.toggleCameraMode();
                    }
                    break;
            }
        };

        const onKeyUp = (e) => {
            switch (e.code) {
                case 'KeyW': this.keys.forward = false; break;
                case 'KeyS': this.keys.backward = false; break;
                case 'KeyA': this.keys.left = false; break;
                case 'KeyD': this.keys.right = false; break;
                case 'Space': this.keys.jump = false; break;
                case 'ShiftLeft':
                case 'ControlLeft':
                    this.keys.sprint = false;
                    break;
            }
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', () => this.resetKeys());
        this.controls.addEventListener('lock', () => this.resetKeys());
        this.controls.addEventListener('unlock', () => this.resetKeys());
    }

    resetKeys() {
        this.keys.forward = false;
        this.keys.backward = false;
        this.keys.left = false;
        this.keys.right = false;
        this.keys.jump = false;
        this.keys.sprint = false;
    }

    toggleCameraMode() {
        this.cameraMode = (this.cameraMode + 1) % 2;
        if (this.cameraMode === 0) {
            if (this.playerGroup) this.playerGroup.visible = false;
            eventBus.emit('ui:popup', '🎥 Widok z 1. osoby');
        } else {
            if (this.playerGroup) this.playerGroup.visible = true;
            eventBus.emit('ui:popup', '🎒 Widok z 3. osoby (Plecak widoczny!)');
        }
    }

    buildPlayerMesh() {
        this.playerGroup = new THREE.Group();

        // 1. Torso (blue shirt)
        const torsoGeo = new THREE.BoxGeometry(0.42, 0.65, 0.22);
        const torsoMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
        this.torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
        this.torsoMesh.position.set(0, 1.05, 0);
        this.playerGroup.add(this.torsoMesh);

        // 2. Head (skin & hair)
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.50, 0);

        const headGeo = new THREE.BoxGeometry(0.36, 0.36, 0.36);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
        const headMesh = new THREE.Mesh(headGeo, headMat);
        headGroup.add(headMesh);

        // Hair on top of head
        const hairGeo = new THREE.BoxGeometry(0.38, 0.12, 0.38);
        const hairMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
        const hairMesh = new THREE.Mesh(hairGeo, hairMat);
        hairMesh.position.set(0, 0.14, 0);
        headGroup.add(hairMesh);

        // Armor Helmet overlay (Ruby or Diamond)
        this.armorHelmetMat = new THREE.MeshLambertMaterial({ color: 0xef4444, emissive: 0x330000 });
        this.armorHelmetMesh = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.40, 0.40), this.armorHelmetMat);
        this.armorHelmetMesh.visible = false;
        headGroup.add(this.armorHelmetMesh);

        this.torsoMesh.add(headGroup);
        this.headGroup = headGroup;

        // Armor Chestplate overlay (Ruby or Diamond)
        this.armorChestMat = new THREE.MeshLambertMaterial({ color: 0xef4444, emissive: 0x330000 });
        this.armorChestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.68, 0.26), this.armorChestMat);
        this.armorChestMesh.visible = false;
        this.torsoMesh.add(this.armorChestMesh);

        // 3. Arms
        const armGeo = new THREE.BoxGeometry(0.14, 0.62, 0.14);
        const armMat = new THREE.MeshLambertMaterial({ color: 0xd9a066 });

        this.leftArm = new THREE.Mesh(armGeo, armMat);
        this.leftArm.position.set(-0.29, 0, 0);
        this.torsoMesh.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeo, armMat);
        this.rightArm.position.set(0.29, 0, 0);
        this.torsoMesh.add(this.rightArm);

        // 3D Bow in 3rd person attached to right arm
        const tpBowGroup = new THREE.Group();
        tpBowGroup.position.set(0, -0.28, 0.10);
        tpBowGroup.rotation.set(Math.PI / 4, 0, 0);

        const tpBowWoodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
        const tpBowHandleMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
        const tpBowStringMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

        const tpHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.04), tpBowHandleMat);
        tpBowGroup.add(tpHandle);

        const tpUpper = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.035), tpBowWoodMat);
        tpUpper.position.set(0, 0.16, -0.06);
        tpUpper.rotation.x = -Math.PI / 6;
        tpBowGroup.add(tpUpper);

        const tpLower = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.035), tpBowWoodMat);
        tpLower.position.set(0, -0.16, -0.06);
        tpLower.rotation.x = Math.PI / 6;
        tpBowGroup.add(tpLower);

        const tpString = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.52, 0.012), tpBowStringMat);
        tpString.position.set(0, 0, -0.12);
        tpBowGroup.add(tpString);

        tpBowGroup.visible = false;
        this.rightArm.add(tpBowGroup);
        this.thirdPersonBow = tpBowGroup;

        // 4. Legs
        const legGeo = new THREE.BoxGeometry(0.16, 0.68, 0.16);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });

        this.leftLeg = new THREE.Mesh(legGeo, legMat);
        this.leftLeg.position.set(-0.11, 0.34, 0);
        this.playerGroup.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeo, legMat);
        this.rightLeg.position.set(0.11, 0.34, 0);
        this.playerGroup.add(this.rightLeg);

        // 5. 3D BACKPACK (Plecak na plecach gracza)
        const backpackGroup = new THREE.Group();
        backpackGroup.position.set(0, 0.04, -0.16);

        // Main brown leather compartment
        const bagGeo = new THREE.BoxGeometry(0.36, 0.44, 0.18);
        const bagMat = new THREE.MeshLambertMaterial({ color: 0x854d0e });
        const bagMesh = new THREE.Mesh(bagGeo, bagMat);
        backpackGroup.add(bagMesh);

        // Backpack top flap (darker leather)
        const flapGeo = new THREE.BoxGeometry(0.38, 0.12, 0.20);
        const flapMat = new THREE.MeshLambertMaterial({ color: 0x713f12 });
        const flapMesh = new THREE.Mesh(flapGeo, flapMat);
        flapMesh.position.set(0, 0.22, 0);
        backpackGroup.add(flapMesh);

        // Gold buckle on flap
        const buckleGeo = new THREE.BoxGeometry(0.08, 0.06, 0.03);
        const buckleMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
        const buckleMesh = new THREE.Mesh(buckleGeo, buckleMat);
        buckleMesh.position.set(0, 0.16, -0.10);
        backpackGroup.add(buckleMesh);

        // Front pocket
        const pocketGeo = new THREE.BoxGeometry(0.24, 0.18, 0.08);
        const pocketMat = new THREE.MeshLambertMaterial({ color: 0xa16207 });
        const pocketMesh = new THREE.Mesh(pocketGeo, pocketMat);
        pocketMesh.position.set(0, -0.09, -0.12);
        backpackGroup.add(pocketMesh);

        // Pocket gold button
        const pBtnGeo = new THREE.BoxGeometry(0.04, 0.04, 0.02);
        const pBtnMesh = new THREE.Mesh(pBtnGeo, buckleMat);
        pBtnMesh.position.set(0, -0.06, -0.17);
        backpackGroup.add(pBtnMesh);

        // Green sleeping bedroll rolled under the backpack
        const rollGeo = new THREE.BoxGeometry(0.40, 0.10, 0.10);
        const rollMat = new THREE.MeshLambertMaterial({ color: 0x166534 });
        const rollMesh = new THREE.Mesh(rollGeo, rollMat);
        rollMesh.position.set(0, -0.25, 0);
        backpackGroup.add(rollMesh);

        // Shoulder straps going over shoulders
        const strapGeo = new THREE.BoxGeometry(0.045, 0.52, 0.02);
        const strapMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
        const leftStrap = new THREE.Mesh(strapGeo, strapMat);
        leftStrap.position.set(-0.12, 0.06, 0.12);
        this.torsoMesh.add(leftStrap);

        const rightStrap = new THREE.Mesh(strapGeo, strapMat);
        rightStrap.position.set(0.12, 0.06, 0.12);
        this.torsoMesh.add(rightStrap);

        this.torsoMesh.add(backpackGroup);
        this.backpackMesh = backpackGroup;

        // Hidden initially in 1st person
        this.playerGroup.visible = false;
        if (this.world && this.world.scene) {
            this.world.scene.add(this.playerGroup);
        }
    }

    setArmorVisual(type) {
        this.currentArmorType = type;
        if (!this.armorChestMesh || !this.armorHelmetMesh) return;
        if (type === 37) {
            // Ruby Armor: Glowing Ruby Red
            this.armorChestMat.color.setHex(0xef4444);
            this.armorChestMat.emissive.setHex(0x550011);
            this.armorHelmetMat.color.setHex(0xef4444);
            this.armorHelmetMat.emissive.setHex(0x550011);
            this.armorChestMesh.visible = true;
            this.armorHelmetMesh.visible = true;
        } else if (type === 32) {
            // Diamond Armor: Bright Diamond Cyan
            this.armorChestMat.color.setHex(0x38bdf8);
            this.armorChestMat.emissive.setHex(0x002244);
            this.armorHelmetMat.color.setHex(0x38bdf8);
            this.armorHelmetMat.emissive.setHex(0x002244);
            this.armorChestMesh.visible = true;
            this.armorHelmetMesh.visible = true;
        } else if (type === 43) {
            // Stone Armor: Solid slate-grey stone armor
            this.armorChestMat.color.setHex(0x78716c);
            this.armorChestMat.emissive.setHex(0x1c1917);
            this.armorHelmetMat.color.setHex(0x78716c);
            this.armorHelmetMat.emissive.setHex(0x1c1917);
            this.armorChestMesh.visible = true;
            this.armorHelmetMesh.visible = true;
        } else {
            this.armorChestMesh.visible = false;
            this.armorHelmetMesh.visible = false;
        }
    }

    mountBear(bear) {
        if (!bear) return;
        this.mountedBear = bear;
        bear.isMounted = true;
        bear.rider = this;
        this.position.x = bear.position.x;
        this.position.z = bear.position.z;
        this.position.y = bear.position.y + 1.25;
        this.velocity.set(0, 0, 0);

        if (this.cameraMode === 0) {
            this.toggleCameraMode();
        }
        eventBus.emit('ui:popup', `🐻 Wsiadłeś na: ${bear.variantName}! [P: zejdź, LPM: atak łapą]`);
    }

    dismountBear() {
        if (!this.mountedBear) return;
        const bear = this.mountedBear;
        bear.isMounted = false;
        bear.rider = null;
        this.mountedBear = null;
        this.position.x = bear.position.x + 1.2;
        this.position.z = bear.position.z;
        this.position.y = bear.position.y;
        this.velocity.set(0, 0, 0);
        eventBus.emit('ui:popup', '🐾 Zszedłeś z Niedźwiedzia!');
    }

    getAABB(pos = this.position) {
        const halfW = this.width / 2;
        return {
            minX: pos.x - halfW,
            maxX: pos.x + halfW,
            minY: pos.y,
            maxY: pos.y + this.height,
            minZ: pos.z - halfW,
            maxZ: pos.z + halfW
        };
    }

    // Check collision with world voxels
    checkVoxelCollision(aabb) {
        const minBx = Math.floor(aabb.minX);
        const maxBx = Math.floor(aabb.maxX - 0.0001);
        const minBy = Math.floor(aabb.minY);
        const maxBy = Math.floor(aabb.maxY - 0.0001);
        const minBz = Math.floor(aabb.minZ);
        const maxBz = Math.floor(aabb.maxZ - 0.0001);

        for (let bx = minBx; bx <= maxBx; bx++) {
            for (let by = minBy; by <= maxBy; by++) {
                for (let bz = minBz; bz <= maxBz; bz++) {
                    if (this.world.isSolid(bx, by, bz)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    update(dt, activeItemId = 0, isDrawingBow = false) {
        if (!this.controls.isLocked) return;

        // Cap dt to prevent tunneling on lag spikes
        dt = Math.min(dt, 0.05);

        // If riding a Bear, movement is driven through the Bear!
        if (this.mountedBear) {
            const bear = this.mountedBear;
            if (bear.isDead) {
                this.dismountBear();
                return;
            }

            const cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
            cameraEuler.setFromQuaternion(this.camera.quaternion);
            cameraEuler.x = 0;
            cameraEuler.z = 0;

            const forward = new THREE.Vector3(0, 0, -1).applyEuler(cameraEuler);
            const right = new THREE.Vector3(1, 0, 0).applyEuler(cameraEuler);

            const moveVector = new THREE.Vector3();
            if (this.keys.forward) moveVector.z -= 1;
            if (this.keys.backward) moveVector.z += 1;
            if (this.keys.left) moveVector.x -= 1;
            if (this.keys.right) moveVector.x += 1;

            const isMoving = moveVector.lengthSq() > 0;
            if (isMoving) moveVector.normalize();

            const speed = bear.walkSpeed * (this.keys.sprint ? 1.45 : 1.0);
            const targetVelX = (forward.x * -moveVector.z + right.x * moveVector.x) * speed;
            const targetVelZ = (forward.z * -moveVector.z + right.z * moveVector.x) * speed;

            // Bear physics: grounded jumping (NO flying!) & downward gravity
            bear.velocityY = bear.velocityY || 0;
            const currentGround = bear.getGroundHeight(bear.position.x, bear.position.z);
            const isOnGround = Math.abs(bear.position.y - currentGround) <= 0.25 && bear.velocityY <= 0.05;
            bear.isGrounded = isOnGround;

            // Only jump when firmly on the ground!
            if (this.keys.jump && isOnGround) {
                bear.velocityY = 7.8; // High leap (~1.3 blocks)
                bear.isGrounded = false;
            }

            if (isMoving) {
                bear.targetRotationY = Math.atan2(targetVelX, targetVelZ);
                const nextX = bear.position.x + targetVelX * dt;
                const nextZ = bear.position.z + targetVelZ * dt;

                const groundAtTarget = bear.getGroundHeight(nextX, nextZ);
                const stepDiff = groundAtTarget - bear.position.y;

                if (isOnGround) {
                    // Smoothly climb steps up to 1.15 block
                    if (stepDiff <= 1.15 && stepDiff >= -1.5) {
                        bear.position.x = nextX;
                        bear.position.z = nextZ;
                        bear.position.y = groundAtTarget;
                    } else if (stepDiff < -1.5) {
                        // Walk off a ledge: begin falling
                        bear.position.x = nextX;
                        bear.position.z = nextZ;
                        bear.isGrounded = false;
                    }
                } else {
                    // Mid-air movement: allow moving forward if not blocked by high wall
                    if (groundAtTarget <= bear.position.y + 0.3) {
                        bear.position.x = nextX;
                        bear.position.z = nextZ;
                    }
                }
                bear.state = 'walk';
            } else {
                bear.state = 'idle';
            }

            // Apply gravity and vertical motion
            if (!bear.isGrounded || bear.position.y > currentGround + 0.05 || bear.velocityY > 0) {
                bear.velocityY -= 22.0 * dt; // Gravity
                bear.position.y += bear.velocityY * dt;

                if (bear.position.y <= currentGround) {
                    bear.position.y = currentGround;
                    bear.velocityY = 0;
                    bear.isGrounded = true;
                }
            } else {
                bear.position.y = currentGround;
                bear.velocityY = 0;
                bear.isGrounded = true;
            }

            bear.group.position.copy(bear.position);
            bear.rotationY += (bear.targetRotationY - bear.rotationY) * Math.min(1, dt * 8);
            bear.group.rotation.y = bear.rotationY;

            // Player position locked on bear's back
            this.position.x = bear.position.x;
            this.position.z = bear.position.z;
            this.position.y = bear.position.y + 1.25;
            this.velocity.set(0, 0, 0);

            // Seated riding leg pose
            if (this.leftLeg && this.rightLeg) {
                this.leftLeg.rotation.x = -Math.PI / 3;
                this.leftLeg.rotation.z = -0.35;
                this.rightLeg.rotation.x = -Math.PI / 3;
                this.rightLeg.rotation.z = 0.35;
            }

            bear.updateRidingAnimation(dt, isMoving);

            // Sync player 3D mesh position and rotation
            if (this.playerGroup) {
                this.playerGroup.position.set(this.position.x, this.position.y, this.position.z);
                this.playerGroup.rotation.y = bear.rotationY;
            }

            // Sync 3rd person camera behind the bear
            if (this.cameraMode === 0) {
                this.camera.position.set(this.position.x, this.position.y + this.eyeHeight, this.position.z);
                if (this.playerGroup) this.playerGroup.visible = false;
            } else {
                if (this.playerGroup) this.playerGroup.visible = true;
                const eyePos = new THREE.Vector3(this.position.x, this.position.y + this.eyeHeight + 0.3, this.position.z);
                const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
                let dist = 4.2;
                for (let d = 0.5; d <= 4.2; d += 0.3) {
                    const checkPos = eyePos.clone().addScaledVector(camForward, -d);
                    if (this.world && this.world.isSolid(Math.floor(checkPos.x), Math.floor(checkPos.y), Math.floor(checkPos.z))) {
                        dist = Math.max(0.5, d - 0.3);
                        break;
                    }
                }
                const camPos = eyePos.clone().addScaledVector(camForward, -dist).add(new THREE.Vector3(0, 0.3, 0));
                this.camera.position.copy(camPos);
            }
            return;
        }

        // Movement directions relative to camera yaw
        const moveVector = new THREE.Vector3();
        if (this.keys.forward) moveVector.z -= 1;
        if (this.keys.backward) moveVector.z += 1;
        if (this.keys.left) moveVector.x -= 1;
        if (this.keys.right) moveVector.x += 1;

        if (moveVector.lengthSq() > 0) {
            moveVector.normalize();
        }

        // Camera direction on horizontal plane
        const cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
        cameraEuler.setFromQuaternion(this.camera.quaternion);
        cameraEuler.x = 0; // Ignore pitch for ground movement
        cameraEuler.z = 0;

        const forward = new THREE.Vector3(0, 0, -1).applyEuler(cameraEuler);
        const right = new THREE.Vector3(1, 0, 0).applyEuler(cameraEuler);

        // Check if player is submerged or wading in water (ID 10)
        const feetY = Math.floor(this.position.y + 0.1);
        const waistY = Math.floor(this.position.y + 0.8);
        const eyesY = Math.floor(this.position.y + this.eyeHeight);
        const px = Math.floor(this.position.x);
        const pz = Math.floor(this.position.z);
        const inWater = (this.world.getBlock(px, feetY, pz) === 10 || this.world.getBlock(px, waistY, pz) === 10);
        this.isInWater = inWater;
        this.isHeadUnderwater = (this.world.getBlock(px, eyesY, pz) === 10);

        const baseSpeed = this.keys.sprint ? this.sprintSpeed : this.walkSpeed;
        const speed = inWater ? baseSpeed * 0.65 : baseSpeed;
        const targetVelX = (forward.x * -moveVector.z + right.x * moveVector.x) * speed;
        const targetVelZ = (forward.z * -moveVector.z + right.z * moveVector.x) * speed;

        // Inertia damping & responsive air control
        const accelRate = inWater ? 12 : (this.onGround ? 16 : 10);
        this.velocity.x += (targetVelX - this.velocity.x) * accelRate * dt;
        this.velocity.z += (targetVelZ - this.velocity.z) * accelRate * dt;

        // Gravity & Jump / Swimming
        if (inWater) {
            this.onGround = false;
            if (this.keys.jump) {
                // Pływanie w górę ku powierzchni (Swim upwards!)
                this.velocity.y = 3.6;
            } else {
                // Łagodne opadanie i unoszenie się w wodzie
                this.velocity.y = Math.max(-2.5, this.velocity.y - 8.0 * dt);
            }
        } else {
            if (this.keys.jump && this.onGround) {
                this.velocity.y = this.jumpForce;
                this.onGround = false;
            }
            this.velocity.y -= this.gravity * dt;
            this.velocity.y = Math.max(this.velocity.y, -40); // terminal velocity
        }

        const halfW = this.width / 2;

        // Helper for vertical Y movement and collision
        const moveVertical = () => {
            let newY = this.position.y + this.velocity.y * dt;
            let testBoxY = {
                minX: this.position.x - halfW, maxX: this.position.x + halfW,
                minY: newY, maxY: newY + this.height,
                minZ: this.position.z - halfW, maxZ: this.position.z + halfW
            };

            if (this.checkVoxelCollision(testBoxY)) {
                if (this.velocity.y < 0) {
                    // Landing on ground - find exact top surface of highest solid block
                    let highestSolidY = -Infinity;
                    const minBx = Math.floor(testBoxY.minX);
                    const maxBx = Math.floor(testBoxY.maxX - 0.0001);
                    const minBz = Math.floor(testBoxY.minZ);
                    const maxBz = Math.floor(testBoxY.maxZ - 0.0001);
                    const checkFromY = Math.floor(this.position.y);
                    const checkToY = Math.floor(newY);

                    for (let by = checkFromY; by >= checkToY; by--) {
                        for (let bx = minBx; bx <= maxBx; bx++) {
                            for (let bz = minBz; bz <= maxBz; bz++) {
                                if (this.world.isSolid(bx, by, bz)) {
                                    if (by + 1.0 > highestSolidY) {
                                        highestSolidY = by + 1.0;
                                    }
                                }
                            }
                        }
                        if (highestSolidY > -Infinity) break;
                    }

                    newY = highestSolidY > -Infinity ? highestSolidY : (Math.floor(testBoxY.minY) + 1.0);
                    if (this.onFallLanding) {
                        this.onFallLanding(this.velocity.y);
                    }
                    this.onGround = true;
                    this.velocity.y = 0;
                } else if (this.velocity.y > 0) {
                    // Hitting head on ceiling
                    newY = Math.floor(testBoxY.maxY - 0.0001) - this.height - 0.001;
                    this.velocity.y = 0;
                }
            } else {
                if (this.velocity.y < 0) {
                    this.onGround = false;
                }
            }
            this.position.y = newY;
        };

        // Helper for horizontal movement with smooth step-up
        const moveHorizontal = () => {
            const dx = this.velocity.x * dt;
            const dz = this.velocity.z * dt;
            if (dx === 0 && dz === 0) return;

            const nextX = this.position.x + dx;
            const nextZ = this.position.z + dz;

            // 1. Try direct full horizontal move
            const testBoxFlat = {
                minX: nextX - halfW, maxX: nextX + halfW,
                minY: this.position.y, maxY: this.position.y + this.height,
                minZ: nextZ - halfW, maxZ: nextZ + halfW
            };

            if (!this.checkVoxelCollision(testBoxFlat)) {
                this.position.x = nextX;
                this.position.z = nextZ;
                return;
            }

            // 2. Step-up logic: if walking against a 1-block terrain ledge, step up smoothly!
            if (this.onGround) {
                const stepUpY = this.position.y + this.stepHeight;
                // Verify overhead headroom at current position
                const testBoxCeiling = {
                    minX: this.position.x - halfW, maxX: this.position.x + halfW,
                    minY: this.position.y, maxY: stepUpY + this.height,
                    minZ: this.position.z - halfW, maxZ: this.position.z + halfW
                };

                if (!this.checkVoxelCollision(testBoxCeiling)) {
                    // Verify clearance at elevated height
                    const testBoxElevated = {
                        minX: nextX - halfW, maxX: nextX + halfW,
                        minY: stepUpY, maxY: stepUpY + this.height,
                        minZ: nextZ - halfW, maxZ: nextZ + halfW
                    };

                    if (!this.checkVoxelCollision(testBoxElevated)) {
                        // Find step landing height (top of obstacle)
                        const targetStepY = Math.floor(this.position.y) + 1.0;
                        if (targetStepY <= this.position.y + this.stepHeight + 0.001) {
                            const testBoxStepLanding = {
                                minX: nextX - halfW, maxX: nextX + halfW,
                                minY: targetStepY, maxY: targetStepY + this.height,
                                minZ: nextZ - halfW, maxZ: nextZ + halfW
                            };
                            if (!this.checkVoxelCollision(testBoxStepLanding)) {
                                this.position.x = nextX;
                                this.position.z = nextZ;
                                this.position.y = targetStepY;
                                this.onGround = true;
                                return;
                            }
                        }
                    }
                }
            }

            // 3. Fallback: slide along X and Z separately
            // Move X
            let testBoxX = {
                minX: nextX - halfW, maxX: nextX + halfW,
                minY: this.position.y, maxY: this.position.y + this.height,
                minZ: this.position.z - halfW, maxZ: this.position.z + halfW
            };
            if (!this.checkVoxelCollision(testBoxX)) {
                this.position.x = nextX;
            } else {
                if (this.velocity.x > 0) {
                    this.position.x = Math.floor(testBoxX.maxX - 0.0001) - halfW - 0.001;
                } else if (this.velocity.x < 0) {
                    this.position.x = Math.floor(testBoxX.minX) + 1 + halfW + 0.001;
                }
                this.velocity.x = 0;
            }

            // Move Z
            let testBoxZ = {
                minX: this.position.x - halfW, maxX: this.position.x + halfW,
                minY: this.position.y, maxY: this.position.y + this.height,
                minZ: nextZ - halfW, maxZ: nextZ + halfW
            };
            if (!this.checkVoxelCollision(testBoxZ)) {
                this.position.z = nextZ;
            } else {
                if (this.velocity.z > 0) {
                    this.position.z = Math.floor(testBoxZ.maxZ - 0.0001) - halfW - 0.001;
                } else if (this.velocity.z < 0) {
                    this.position.z = Math.floor(testBoxZ.minZ) + 1 + halfW + 0.001;
                }
                this.velocity.z = 0;
            }
        };

        // When jumping upwards, integrate vertical movement first so player clears ledges cleanly
        if (this.velocity.y > 0) {
            moveVertical();
            moveHorizontal();
        } else {
            moveHorizontal();
            moveVertical();
        }

        // Fall reset
        if (this.position.y < -10) {
            this.spawnOnSurface();
        }

        // Animate legs and arms walking swing
        const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
        if (this.onGround && horizSpeed > 0.5) {
            this.walkCycle += dt * 10.0;
        } else {
            this.walkCycle = 0;
        }

        if (this.leftLeg && this.rightLeg && this.leftArm && this.rightArm) {
            const swing = Math.sin(this.walkCycle) * 0.45;
            this.leftLeg.rotation.x = swing;
            this.rightLeg.rotation.x = -swing;

            if (this.thirdPersonBow) {
                this.thirdPersonBow.visible = (activeItemId === 29);
            }

            if (activeItemId === 29 && isDrawingBow) {
                // Archery aiming stance in 3rd person
                this.rightArm.rotation.x = -Math.PI / 2 + 0.15;
                this.leftArm.rotation.x = -Math.PI / 2 + 0.35;
            } else {
                this.leftArm.rotation.x = -swing;
                this.rightArm.rotation.x = swing;
            }
        }

        // Sync player 3D mesh position and horizontal yaw rotation
        if (this.playerGroup) {
            this.playerGroup.position.set(this.position.x, this.position.y, this.position.z);
            const cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
            cameraEuler.setFromQuaternion(this.camera.quaternion);
            this.playerGroup.rotation.y = cameraEuler.y;
        }

        // Camera position handling: 1st person vs 3rd person
        if (this.cameraMode === 0) {
            // First Person: Camera placed at player eye height
            this.camera.position.set(this.position.x, this.position.y + this.eyeHeight, this.position.z);
            if (this.playerGroup) this.playerGroup.visible = false;
        } else {
            // Third Person (Back): Camera behind and slightly above player looking forward
            if (this.playerGroup) this.playerGroup.visible = true;
            const eyePos = new THREE.Vector3(this.position.x, this.position.y + this.eyeHeight, this.position.z);
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            let dist = 3.2;
            for (let d = 0.5; d <= 3.2; d += 0.3) {
                const checkPos = eyePos.clone().addScaledVector(forward, -d);
                if (this.world && this.world.isSolid(Math.floor(checkPos.x), Math.floor(checkPos.y), Math.floor(checkPos.z))) {
                    dist = Math.max(0.5, d - 0.3);
                    break;
                }
            }
            const camPos = eyePos.clone().addScaledVector(forward, -dist).add(new THREE.Vector3(0, 0.2, 0));
            this.camera.position.copy(camPos);
        }

        // Heavy Stomp / Explosion camera shake
        if (this.screenShakeIntensity > 0.001) {
            this.camera.position.x += (Math.random() - 0.5) * this.screenShakeIntensity;
            this.camera.position.y += (Math.random() - 0.5) * this.screenShakeIntensity;
            this.camera.position.z += (Math.random() - 0.5) * this.screenShakeIntensity;
            this.screenShakeIntensity = Math.max(0, this.screenShakeIntensity - dt * 2.0);
        }

        // Hydration countdown
        if (this.isHydrated) {
            this.hydrateTimer -= dt;
            if (this.hydrateTimer <= 0) {
                this.isHydrated = false;
            }
        }

        // Shivering on high snowy mountains & Desert heat
        const biome = this.world?.getBiome ? this.world.getBiome(Math.floor(this.position.x), Math.floor(this.position.z)) : 'Plains';
        const underBlock = this.world?.getBlock ? this.world.getBlock(Math.floor(this.position.x), Math.floor(this.position.y - 0.5), Math.floor(this.position.z)) : 0;
        const isSnowyPeak = (biome === 'Mountains' && this.position.y >= 14) || underBlock === 7;
        const hasJacket = this.ui && (this.ui.hasItem(46) || this.hasWarmJacket);

        let activeWarning = null;

        // 1. Cold mountain hazard (freezing & shivering & damage)
        if (isSnowyPeak && !hasJacket) {
            this.isFreezing = true;
            // Shiver / shake camera
            const t = performance.now() * 0.045;
            const shiverX = Math.sin(t * 1.8) * 0.035;
            const shiverY = Math.cos(t * 2.4) * 0.02;
            this.camera.position.x += shiverX;
            this.camera.position.y += shiverY;

            this.freezeTimer = (this.freezeTimer || 0) + dt;
            if (this.freezeTimer >= 3.5) {
                this.freezeTimer = 0;
                playFreezeShiverSound();
            }

            // Damage player every 2.5s from extreme cold
            this.freezeDamageTimer = (this.freezeDamageTimer || 0) + dt;
            if (this.freezeDamageTimer >= 2.5) {
                this.freezeDamageTimer = 0;
                eventBus.emit('player:damage', { amount: 1, reason: 'Odmrożenie z zimna na szczycie góry! ❄️' });
            }

            activeWarning = {
                type: 'freeze',
                text: '❄️ UWAGA! UWAGA! NIE MASZ CIEPŁEGO UBRANIA! 🥶'
            };

            if (this.freezeOverlayEl) this.freezeOverlayEl.style.opacity = '0.55';
        } else {
            this.isFreezing = false;
            this.freezeDamageTimer = 0;
            if (this.freezeOverlayEl) this.freezeOverlayEl.style.opacity = '0';
        }

        // 2. Desert heat hazard (extreme heat & thirst damage)
        if (biome === 'Desert') {
            if (this.heatOverlayEl) {
                this.heatOverlayEl.style.opacity = this.isHydrated ? '0.08' : '0.45';
            }

            if (!this.isHydrated) {
                // Damage player every 2.5s from dehydration
                this.heatDamageTimer = (this.heatDamageTimer || 0) + dt;
                if (this.heatDamageTimer >= 2.5) {
                    this.heatDamageTimer = 0;
                    eventBus.emit('player:damage', { amount: 1, reason: 'Odwodnienie i udar słoneczny na pustyni! ☀️💧' });
                }

                if (!activeWarning) {
                    activeWarning = {
                        type: 'heat',
                        text: '☀️ UWAGA! UWAGA! NIE MASZ WODY! PIJ Z BUTELKI (KOD "GRAT")! 💧'
                    };
                }
            } else {
                this.heatDamageTimer = 0;
            }
        } else {
            this.heatDamageTimer = 0;
            if (this.heatOverlayEl) this.heatOverlayEl.style.opacity = '0';
        }

        // Update full-screen warning banner
        if (this.warningBannerEl) {
            if (activeWarning) {
                this.warningBannerEl.className = activeWarning.type === 'freeze' ? 'banner-freeze' : 'banner-heat';
                this.warningBannerEl.innerHTML = activeWarning.text;
                this.warningBannerEl.style.display = 'block';
            } else {
                this.warningBannerEl.style.display = 'none';
            }
        }

        // Quest Manager position tracking
        if (this.questManager) {
            this.questManager.checkPlayerLocation(this.position.x, this.position.y, this.position.z, biome, hasJacket);
        }


        // Underwater bubble particles & visual tint

        if (this.isInWater && (horizSpeed > 0.3 || this.keys.jump)) {
            this.bubbleSpawnTimer = (this.bubbleSpawnTimer || 0) + dt;
            if (this.bubbleSpawnTimer >= 0.12) {
                this.bubbleSpawnTimer = 0;
                this.spawnWaterBubble();
            }
        }
        this.updateWaterBubbles(dt);
        this.updateUnderwaterVisuals(dt);
    }

    spawnWaterBubble() {
        if (!this.world || !this.world.scene) return;
        const bubbleGeo = new THREE.SphereGeometry(0.045, 6, 6);
        const bubbleMat = new THREE.MeshBasicMaterial({
            color: 0xbfeaff,
            transparent: true,
            opacity: 0.85
        });
        const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
        const offsetX = (Math.random() - 0.5) * 0.7;
        const offsetZ = (Math.random() - 0.5) * 0.7;
        const offsetY = 0.2 + Math.random() * 0.9;
        bubble.position.set(this.position.x + offsetX, this.position.y + offsetY, this.position.z + offsetZ);
        this.world.scene.add(bubble);

        this.bubbleParticles.push({
            mesh: bubble,
            vy: 1.6 + Math.random() * 0.8,
            vx: (Math.random() - 0.5) * 0.25,
            vz: (Math.random() - 0.5) * 0.25,
            life: 1.2,
            maxLife: 1.2
        });
    }

    updateWaterBubbles(dt) {
        if (!this.bubbleParticles) return;
        for (let i = this.bubbleParticles.length - 1; i >= 0; i--) {
            const p = this.bubbleParticles[i];
            p.life -= dt;
            if (p.life <= 0) {
                if (p.mesh && p.mesh.parent) {
                    p.mesh.parent.remove(p.mesh);
                }
                this.bubbleParticles.splice(i, 1);
            } else {
                p.mesh.position.y += p.vy * dt;
                p.mesh.position.x += p.vx * dt;
                p.mesh.position.z += p.vz * dt;
                const scale = Math.max(0.15, p.life / p.maxLife);
                p.mesh.scale.set(scale, scale, scale);
                // Pop bubble if it reaches the surface / air
                const bx = Math.floor(p.mesh.position.x);
                const by = Math.floor(p.mesh.position.y);
                const bz = Math.floor(p.mesh.position.z);
                if (this.world.getBlock(bx, by, bz) !== 10) {
                    p.life = 0;
                }
            }
        }
    }

    updateUnderwaterVisuals(dt) {
        if (!this.underwaterOverlayEl) {
            this.underwaterOverlayEl = document.getElementById('underwater-overlay');
        }
        if (this.underwaterOverlayEl) {
            this.underwaterOverlayEl.style.opacity = this.isHeadUnderwater ? '1' : '0';
        }
        if (this.world && this.world.scene && this.world.scene.fog) {
            if (this.isHeadUnderwater) {
                this.world.scene.fog.color.setHex(0x0a528a);
                this.world.scene.fog.density = 0.04;
            } else {
                this.world.scene.fog.color.setHex(0x78a7ff);
                this.world.scene.fog.density = 0.016;
            }
        }
    }

    // Obrót gracza tyłem (180 stopni) - wywoływane przy uderzeniu Bossa Fazy 2 (na życzenie Tymka!)
    turnAround() {
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(this.camera.quaternion);
        euler.y += Math.PI;
        this.camera.quaternion.setFromEuler(euler);
        if (this.playerGroup) {
            this.playerGroup.rotation.y = euler.y;
        }
    }
}
