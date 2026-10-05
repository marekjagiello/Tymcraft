import * as THREE from 'three';
import { WORLD_SIZE_X, WORLD_SIZE_Z, WORLD_HEIGHT, SEA_LEVEL } from './world.js';

export class Animal {
    constructor(scene, world, type = 'pig', x = 32, z = 32) {
        this.scene = scene;
        this.world = world;
        this.type = type;

        this.group = new THREE.Group();
        this.legs = [];
        this.head = null;

        this.position = new THREE.Vector3(x, 15, z);
        this.rotationY = Math.random() * Math.PI * 2;
        this.targetRotationY = this.rotationY;

        this.state = 'idle'; // 'idle' | 'walk'
        this.stateTimer = 1 + Math.random() * 3;
        this.walkSpeed = 1.6;
        this.animTime = 0;

        this.buildModel();
        this.snapToGround();
        this.scene.add(this.group);
    }

    buildModel() {
        if (this.type === 'pig') {
            this.buildPigModel();
        } else {
            this.buildSheepModel();
        }
    }

    buildPigModel() {
        const pinkMat = new THREE.MeshLambertMaterial({ color: 0xf4928e });
        const darkPinkMat = new THREE.MeshLambertMaterial({ color: 0xdb6864 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });

        // Body: 0.9 x 0.6 x 1.2
        const bodyGeo = new THREE.BoxGeometry(0.8, 0.6, 1.1);
        const body = new THREE.Mesh(bodyGeo, pinkMat);
        body.position.set(0, 0.6, 0);
        this.group.add(body);

        // Head: 0.6 x 0.6 x 0.6
        const headGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
        this.head = new THREE.Mesh(headGeo, pinkMat);
        this.head.position.set(0, 0.8, 0.75);

        // Snout
        const snoutGeo = new THREE.BoxGeometry(0.3, 0.2, 0.15);
        const snout = new THREE.Mesh(snoutGeo, darkPinkMat);
        snout.position.set(0, -0.08, 0.32);
        this.head.add(snout);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.05);
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.2, 0.08, 0.28);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.2, 0.08, 0.28);
        this.head.add(leftEye, rightEye);

        this.group.add(this.head);

        // 4 Legs: 0.2 x 0.45 x 0.2
        const legGeo = new THREE.BoxGeometry(0.22, 0.45, 0.22);
        const legOffsets = [
            [-0.25, 0.225, 0.35],
            [0.25, 0.225, 0.35],
            [-0.25, 0.225, -0.35],
            [0.25, 0.225, -0.35]
        ];

        for (let i = 0; i < 4; i++) {
            const pivot = new THREE.Group();
            pivot.position.set(legOffsets[i][0], 0.45, legOffsets[i][2]);

            const legMesh = new THREE.Mesh(legGeo, pinkMat);
            legMesh.position.set(0, -0.225, 0);
            pivot.add(legMesh);

            this.group.add(pivot);
            this.legs.push(pivot);
        }
    }

    buildSheepModel() {
        const woolMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xd9c2a7 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });

        // Body (fluffy wool): 0.9 x 0.8 x 1.3
        const bodyGeo = new THREE.BoxGeometry(0.95, 0.8, 1.25);
        const body = new THREE.Mesh(bodyGeo, woolMat);
        body.position.set(0, 0.8, 0);
        this.group.add(body);

        // Head: 0.5 x 0.5 x 0.5
        const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        this.head = new THREE.Mesh(headGeo, skinMat);
        this.head.position.set(0, 1.05, 0.78);

        // Wool cap on head
        const capGeo = new THREE.BoxGeometry(0.52, 0.25, 0.4);
        const cap = new THREE.Mesh(capGeo, woolMat);
        cap.position.set(0, 0.2, -0.05);
        this.head.add(cap);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.05);
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.2, 0.05, 0.26);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.2, 0.05, 0.26);
        this.head.add(leftEye, rightEye);

        this.group.add(this.head);

        // 4 Legs
        const legGeo = new THREE.BoxGeometry(0.22, 0.55, 0.22);
        const legOffsets = [
            [-0.3, 0.275, 0.38],
            [0.3, 0.275, 0.38],
            [-0.3, 0.275, -0.38],
            [0.3, 0.275, -0.38]
        ];

        for (let i = 0; i < 4; i++) {
            const pivot = new THREE.Group();
            pivot.position.set(legOffsets[i][0], 0.55, legOffsets[i][2]);

            const legMesh = new THREE.Mesh(legGeo, skinMat);
            legMesh.position.set(0, -0.275, 0);
            pivot.add(legMesh);

            this.group.add(pivot);
            this.legs.push(pivot);
        }
    }

    snapToGround() {
        const bx = Math.floor(this.position.x);
        const bz = Math.floor(this.position.z);
        for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
            if (this.world.isSolid(bx, y, bz)) {
                this.position.y = y + 1;
                break;
            }
        }
        this.group.position.copy(this.position);
    }

    update(dt) {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
            // Switch state
            if (this.state === 'idle') {
                this.state = 'walk';
                this.stateTimer = 1.5 + Math.random() * 3.5;
                this.targetRotationY = Math.random() * Math.PI * 2;
            } else {
                this.state = 'idle';
                this.stateTimer = 2 + Math.random() * 4;
            }
        }

        // Smooth rotation
        let diff = this.targetRotationY - this.rotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.rotationY += diff * 4 * dt;
        this.group.rotation.y = this.rotationY;

        if (this.state === 'walk') {
            this.animTime += dt * 8;

            // Move forward
            const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
            const nextX = this.position.x + fwd.x * this.walkSpeed * dt;
            const nextZ = this.position.z + fwd.z * this.walkSpeed * dt;

            // Check world bounds
            if (nextX < 2 || nextX > WORLD_SIZE_X - 2 || nextZ < 2 || nextZ > WORLD_SIZE_Z - 2) {
                this.targetRotationY += Math.PI;
                this.state = 'idle';
                this.stateTimer = 1.5;
            } else {
                // Ground / obstacle check
                const targetBX = Math.floor(nextX);
                const targetBZ = Math.floor(nextZ);
                const currentBY = Math.floor(this.position.y);

                // Check block directly ahead
                const obstacle = this.world.isSolid(targetBX, currentBY, targetBZ);
                const obstacleHigh = this.world.isSolid(targetBX, currentBY + 1, targetBZ);

                if (obstacle && !obstacleHigh) {
                    // Hop up 1 block!
                    this.position.y += 1.0;
                    this.position.x = nextX;
                    this.position.z = nextZ;
                } else if (!obstacle) {
                    // Check if dropping down or water
                    const groundBelow = this.world.isSolid(targetBX, currentBY - 1, targetBZ);
                    const groundBelow2 = this.world.isSolid(targetBX, currentBY - 2, targetBZ);
                    const isWater = (this.world.getBlock(targetBX, currentBY - 1, targetBZ) === 10);

                    if (isWater) {
                        this.targetRotationY += Math.PI * 0.8;
                    } else if (groundBelow) {
                        this.position.x = nextX;
                        this.position.z = nextZ;
                    } else if (groundBelow2) {
                        this.position.x = nextX;
                        this.position.z = nextZ;
                        this.position.y -= 1.0;
                    } else {
                        // Cliff drop too high, turn away
                        this.targetRotationY += Math.PI * 0.8;
                    }
                } else {
                    // Wall too high, turn around
                    this.targetRotationY += Math.PI * 0.75;
                }
            }

            // Animate 4 legs
            const swing = Math.sin(this.animTime) * 0.6;
            if (this.legs.length === 4) {
                this.legs[0].rotation.x = swing;
                this.legs[1].rotation.x = -swing;
                this.legs[2].rotation.x = -swing;
                this.legs[3].rotation.x = swing;
            }
        } else {
            // Idle: legs return to rest
            for (const leg of this.legs) {
                leg.rotation.x *= 0.8;
            }
            if (this.head) {
                this.head.rotation.y = Math.sin(Date.now() * 0.002) * 0.15;
            }
        }

        this.group.position.copy(this.position);
    }
}

// Manager to handle multiple animals
export class AnimalManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.animals = [];
        this.spawnInitialAnimals();
    }

    spawnInitialAnimals() {
        const types = ['pig', 'sheep'];
        const spawnPoints = [
            { x: 28, z: 28 },
            { x: 35, z: 25 },
            { x: 42, z: 38 },
            { x: 20, z: 35 },
            { x: 38, z: 45 },
            { x: 25, z: 42 },
            { x: 32, z: 18 }
        ];

        for (let i = 0; i < spawnPoints.length; i++) {
            const pt = spawnPoints[i];
            const type = types[i % types.length];
            const animal = new Animal(this.scene, this.world, type, pt.x, pt.z);
            this.animals.push(animal);
        }
    }

    update(dt) {
        for (const animal of this.animals) {
            animal.update(dt);
        }
    }
}
