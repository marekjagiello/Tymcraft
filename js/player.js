import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { WORLD_SIZE_X, WORLD_SIZE_Z, WORLD_HEIGHT } from './world.js';
import { eventBus } from './events.js';

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
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
                case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
                case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
                case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
                case 'Space': this.keys.jump = true; break;
                case 'ShiftLeft': case 'ShiftRight':
                case 'ControlLeft': case 'ControlRight':
                    this.keys.sprint = true;
                    break;
                case 'KeyV':
                    this.toggleCameraMode();
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
                case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
                case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
                case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
                case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
                case 'Space': this.keys.jump = false; break;
                case 'ShiftLeft': case 'ShiftRight':
                case 'ControlLeft': case 'ControlRight':
                    this.keys.sprint = false;
                    break;
            }
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', () => this.resetKeys());
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

        this.torsoMesh.add(headGroup);
        this.headGroup = headGroup;

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

        const speed = this.keys.sprint ? this.sprintSpeed : this.walkSpeed;
        const targetVelX = (forward.x * -moveVector.z + right.x * moveVector.x) * speed;
        const targetVelZ = (forward.z * -moveVector.z + right.z * moveVector.x) * speed;

        // Inertia damping & responsive air control
        const accelRate = this.onGround ? 16 : 10;
        this.velocity.x += (targetVelX - this.velocity.x) * accelRate * dt;
        this.velocity.z += (targetVelZ - this.velocity.z) * accelRate * dt;

        // Gravity & Jump
        if (this.keys.jump && this.onGround) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }

        this.velocity.y -= this.gravity * dt;
        this.velocity.y = Math.max(this.velocity.y, -40); // terminal velocity

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
    }
}
