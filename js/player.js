import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { WORLD_SIZE_X, WORLD_SIZE_Z, WORLD_HEIGHT } from './world.js';

export class Player {
    constructor(camera, domElement, world) {
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

        this.walkSpeed = 6.0;
        this.sprintSpeed = 9.5;
        this.jumpForce = 8.5;
        this.gravity = 24.0;

        // Input state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            sprint: false
        };

        this.initControls();
        this.spawnOnSurface();
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
                case 'ShiftLeft': case 'ShiftRight': this.keys.sprint = true; break;
            }
        };

        const onKeyUp = (e) => {
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
                case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
                case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
                case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
                case 'Space': this.keys.jump = false; break;
                case 'ShiftLeft': case 'ShiftRight': this.keys.sprint = false; break;
            }
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
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
        const maxBx = Math.floor(aabb.maxX);
        const minBy = Math.floor(aabb.minY);
        const maxBy = Math.floor(aabb.maxY);
        const minBz = Math.floor(aabb.minZ);
        const maxBz = Math.floor(aabb.maxZ);

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

    update(dt) {
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

        // Inertia damping
        this.velocity.x += (targetVelX - this.velocity.x) * (this.onGround ? 15 : 6) * dt;
        this.velocity.z += (targetVelZ - this.velocity.z) * (this.onGround ? 15 : 6) * dt;

        // Gravity & Jump
        if (this.keys.jump && this.onGround) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }

        this.velocity.y -= this.gravity * dt;
        this.velocity.y = Math.max(this.velocity.y, -40); // terminal velocity

        // Collision & Position Integration
        const halfW = this.width / 2;

        // 1. Move X
        let newX = this.position.x + this.velocity.x * dt;
        let testBoxX = {
            minX: newX - halfW, maxX: newX + halfW,
            minY: this.position.y, maxY: this.position.y + this.height,
            minZ: this.position.z - halfW, maxZ: this.position.z + halfW
        };
        if (this.checkVoxelCollision(testBoxX)) {
            // Collision on X: snap to block boundary
            if (this.velocity.x > 0) {
                newX = Math.floor(testBoxX.maxX) - halfW - 0.001;
            } else if (this.velocity.x < 0) {
                newX = Math.floor(testBoxX.minX) + 1 + halfW + 0.001;
            }
            this.velocity.x = 0;
        }
        this.position.x = newX;

        // 2. Move Z
        let newZ = this.position.z + this.velocity.z * dt;
        let testBoxZ = {
            minX: this.position.x - halfW, maxX: this.position.x + halfW,
            minY: this.position.y, maxY: this.position.y + this.height,
            minZ: newZ - halfW, maxZ: newZ + halfW
        };
        if (this.checkVoxelCollision(testBoxZ)) {
            // Collision on Z: snap to block boundary
            if (this.velocity.z > 0) {
                newZ = Math.floor(testBoxZ.maxZ) - halfW - 0.001;
            } else if (this.velocity.z < 0) {
                newZ = Math.floor(testBoxZ.minZ) + 1 + halfW + 0.001;
            }
            this.velocity.z = 0;
        }
        this.position.z = newZ;

        // 3. Move Y
        let newY = this.position.y + this.velocity.y * dt;
        this.onGround = false;

        let testBoxY = {
            minX: this.position.x - halfW, maxX: this.position.x + halfW,
            minY: newY, maxY: newY + this.height,
            minZ: this.position.z - halfW, maxZ: this.position.z + halfW
        };

        if (this.checkVoxelCollision(testBoxY)) {
            if (this.velocity.y < 0) {
                // Landing on ground
                newY = Math.floor(testBoxY.minY) + 1.0;
                this.onGround = true;
                this.velocity.y = 0;
            } else if (this.velocity.y > 0) {
                // Hitting head
                newY = Math.floor(testBoxY.maxY) - this.height - 0.001;
                this.velocity.y = 0;
            }
        }
        this.position.y = newY;

        // Fall reset
        if (this.position.y < -10) {
            this.spawnOnSurface();
        }

        // Clamp to world boundaries
        this.position.x = Math.max(1, Math.min(WORLD_SIZE_X - 1, this.position.x));
        this.position.z = Math.max(1, Math.min(WORLD_SIZE_Z - 1, this.position.z));

        // Sync camera position with player eye height
        this.camera.position.set(this.position.x, this.position.y + this.eyeHeight, this.position.z);
    }
}
