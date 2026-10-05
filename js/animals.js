import * as THREE from 'three';
import { WORLD_SIZE_X, WORLD_SIZE_Z, WORLD_HEIGHT, SEA_LEVEL } from './world.js';

// Helper to create a 3D pixel heart mesh (Minecraft-style voxel heart)
export function createPixelHeartMesh() {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
    const s = 0.055;

    // 5x5 heart pixel pattern
    const pixels = [
        [0, 1], [0, 3],
        [1, 0], [1, 1], [1, 2], [1, 3], [1, 4],
        [2, 0], [2, 1], [2, 2], [2, 3], [2, 4],
        [3, 1], [3, 2], [3, 3],
        [4, 2]
    ];

    const geo = new THREE.BoxGeometry(s, s, s * 0.8);
    for (const [r, c] of pixels) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set((c - 2) * s, (2 - r) * s, 0);
        group.add(m);
    }
    return group;
}

export class Animal {
    constructor(scene, world, type = 'pig', x = 32, z = 32, manager = null, isBaby = false) {
        this.scene = scene;
        this.world = world;
        this.type = type;
        this.manager = manager;
        this.isBaby = isBaby;

        this.group = new THREE.Group();
        this.legs = [];
        this.segments = [];
        this.head = null;
        this.tongue = null;
        this.activeHearts = [];

        this.position = new THREE.Vector3(x, 15, z);
        this.rotationY = Math.random() * Math.PI * 2;
        this.targetRotationY = this.rotationY;

        this.state = 'idle'; // 'idle' | 'walk'
        this.stateTimer = 1 + Math.random() * 3;
        this.walkSpeed = (this.type === 'snake') ? 1.8 : 1.6;
        this.animTime = Math.random() * 10;
        this.isTamed = false;

        this.buildModel();
        this.snapToGround();
        this.scene.add(this.group);
    }

    buildModel() {
        if (this.type === 'pig') {
            this.buildPigModel();
        } else if (this.type === 'sheep') {
            this.buildSheepModel();
        } else if (this.type === 'snake') {
            this.buildSnakeModel(this.isBaby);
        }
    }

    buildSnakeModel(isBaby = false) {
        // Vibrant pixel orange base, darker burnt orange spots, black eye pixels
        const orangeMat = new THREE.MeshLambertMaterial({ color: 0xf97316 });       // Main bright orange
        const darkOrangeMat = new THREE.MeshLambertMaterial({ color: 0x9a3412 });   // Darker orange spot markings
        const bellyMat = new THREE.MeshLambertMaterial({ color: 0xfdba74 });        // Light creamy orange belly
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });            // Pitch black eye pixels
        const whiteEyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });       // Tiny eye specular dot
        const tongueMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });       // Forked red tongue

        this.segments = [];

        // --- Head (Segment 0) ---
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.12, 0.6);

        // Head box: 0.32 wide, 0.18 high, 0.36 long
        const headGeo = new THREE.BoxGeometry(0.32, 0.18, 0.36);
        const headMesh = new THREE.Mesh(headGeo, orangeMat);
        headMesh.castShadow = true;
        headGroup.add(headMesh);

        // Darker orange spot on top of head
        const headSpotGeo = new THREE.BoxGeometry(0.18, 0.03, 0.20);
        const headSpot = new THREE.Mesh(headSpotGeo, darkOrangeMat);
        headSpot.position.set(0, 0.095, 0.02);
        headGroup.add(headSpot);

        // Light belly underneath head
        const headBellyGeo = new THREE.BoxGeometry(0.24, 0.02, 0.30);
        const headBelly = new THREE.Mesh(headBellyGeo, bellyMat);
        headBelly.position.set(0, -0.095, 0);
        headGroup.add(headBelly);

        // Black pixel eyes on left & right
        const eyeGeo = new THREE.BoxGeometry(0.06, 0.07, 0.07);
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.165, 0.03, 0.08);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.165, 0.03, 0.08);
        headGroup.add(leftEye, rightEye);

        // White specular eye dots
        const dotGeo = new THREE.BoxGeometry(0.02, 0.03, 0.03);
        const leftDot = new THREE.Mesh(dotGeo, whiteEyeMat);
        leftDot.position.set(-0.17, 0.05, 0.10);
        const rightDot = new THREE.Mesh(dotGeo, whiteEyeMat);
        rightDot.position.set(0.17, 0.05, 0.10);
        headGroup.add(leftDot, rightDot);

        // Red flicking tongue at front
        const tongueGeo = new THREE.BoxGeometry(0.06, 0.02, 0.16);
        this.tongue = new THREE.Mesh(tongueGeo, tongueMat);
        this.tongue.position.set(0, -0.03, 0.25);
        headGroup.add(this.tongue);

        this.head = headGroup;
        this.group.add(headGroup);
        this.segments.push(headGroup);

        // --- Body Segments (1 to 6) ---
        const numBodySegments = 6;
        for (let i = 0; i < numBodySegments; i++) {
            const segGroup = new THREE.Group();
            const zOffset = 0.6 - (i + 1) * 0.25;
            segGroup.position.set(0, 0.11, zOffset);

            const width = 0.28 - i * 0.012;
            const height = 0.16 - i * 0.006;
            const length = 0.24;

            // Main body block
            const segGeo = new THREE.BoxGeometry(width, height, length);
            const segMesh = new THREE.Mesh(segGeo, orangeMat);
            segMesh.castShadow = true;
            segGroup.add(segMesh);

            // Darker orange diamond spots on top of back
            const spotWidth = width * 0.62;
            const spotLength = length * 0.6;
            const spotGeo = new THREE.BoxGeometry(spotWidth, 0.025, spotLength);
            const spotMesh = new THREE.Mesh(spotGeo, darkOrangeMat);
            spotMesh.position.set(0, height * 0.5 + 0.013, 0);
            segGroup.add(spotMesh);

            // Belly scale
            const bGeo = new THREE.BoxGeometry(width * 0.75, 0.02, length * 0.85);
            const bMesh = new THREE.Mesh(bGeo, bellyMat);
            bMesh.position.set(0, -height * 0.5 - 0.01, 0);
            segGroup.add(bMesh);

            this.group.add(segGroup);
            this.segments.push(segGroup);
        }

        // --- Tapered Tail (Segment 7) ---
        const tailGroup = new THREE.Group();
        tailGroup.position.set(0, 0.08, 0.6 - (numBodySegments + 1) * 0.23);

        const tailGeo = new THREE.BoxGeometry(0.14, 0.11, 0.24);
        const tailMesh = new THREE.Mesh(tailGeo, orangeMat);
        tailGroup.add(tailMesh);

        // Dark tail rattle/tip
        const tipGeo = new THREE.BoxGeometry(0.08, 0.08, 0.12);
        const tipMesh = new THREE.Mesh(tipGeo, darkOrangeMat);
        tipMesh.position.set(0, 0, -0.16);
        tailGroup.add(tipMesh);

        this.group.add(tailGroup);
        this.segments.push(tailGroup);

        if (isBaby) {
            this.group.scale.set(0.5, 0.5, 0.5);
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

    // Called when the player clicks on the animal while holding an Apple (ID 23)
    interactWithApple() {
        this.isTamed = true;
        this.spawnHeartParticles();

        // Spawn a cute baby snake partner if adult snake
        if (this.manager && this.type === 'snake' && !this.isBaby) {
            this.manager.spawnBabySnake(
                this.position.x + (Math.random() - 0.5) * 0.8,
                this.position.z + (Math.random() - 0.5) * 0.8
            );
        }

        console.log(`[Animal] ${this.type} został nakarmiony jabłkiem! Pojawiły się serca ❤️`);
    }

    onAttacked() {
        // Hop or hiss/turn away
        this.state = 'walk';
        this.stateTimer = 2.0;
        this.targetRotationY += Math.PI * 0.6;
    }

    spawnHeartParticles() {
        const heartCount = 6;
        for (let i = 0; i < heartCount; i++) {
            const heart = createPixelHeartMesh();
            heart.position.set(
                this.position.x + (Math.random() - 0.5) * 0.7,
                this.position.y + 0.6 + Math.random() * 0.5,
                this.position.z + (Math.random() - 0.5) * 0.7
            );
            this.scene.add(heart);
            this.activeHearts.push({
                mesh: heart,
                vy: 1.2 + Math.random() * 0.6,
                vx: (Math.random() - 0.5) * 0.4,
                vz: (Math.random() - 0.5) * 0.4,
                life: 1.8,
                maxLife: 1.8
            });
        }
    }

    updateHearts(dt) {
        for (let i = this.activeHearts.length - 1; i >= 0; i--) {
            const h = this.activeHearts[i];
            h.life -= dt;
            if (h.life <= 0) {
                this.scene.remove(h.mesh);
                this.activeHearts.splice(i, 1);
            } else {
                h.mesh.position.y += h.vy * dt;
                h.mesh.position.x += h.vx * dt;
                h.mesh.position.z += h.vz * dt;
                h.mesh.rotation.y += 2.5 * dt;
                const scale = Math.max(0.1, h.life / h.maxLife);
                h.mesh.scale.set(scale, scale, scale);
            }
        }
    }

    update(dt, playerPosition = null) {
        this.updateHearts(dt);

        this.stateTimer -= dt;

        // If tamed and player is nearby, follow player!
        if (this.isTamed && playerPosition) {
            const distToPlayer = this.position.distanceTo(playerPosition);
            if (distToPlayer > 2.2 && distToPlayer < 12.0) {
                this.state = 'walk';
                this.targetRotationY = Math.atan2(playerPosition.x - this.position.x, playerPosition.z - this.position.z);
            } else if (distToPlayer <= 2.2) {
                this.state = 'idle';
            }
        } else if (this.stateTimer <= 0) {
            // Random state switch
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
            this.animTime += dt * (this.type === 'snake' ? 6.5 : 8.0);

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

                const obstacle = this.world.isSolid(targetBX, currentBY, targetBZ);
                const obstacleHigh = this.world.isSolid(targetBX, currentBY + 1, targetBZ);

                if (obstacle && !obstacleHigh) {
                    // Hop up 1 block
                    this.position.y += 1.0;
                    this.position.x = nextX;
                    this.position.z = nextZ;
                } else if (!obstacle) {
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
                        this.targetRotationY += Math.PI * 0.8;
                    }
                } else {
                    this.targetRotationY += Math.PI * 0.75;
                }
            }

            // Animate movement
            if (this.type === 'snake') {
                // S-curve undulating slithering wave animation across segments
                for (let i = 0; i < this.segments.length; i++) {
                    const seg = this.segments[i];
                    const wave = Math.sin(this.animTime - i * 0.75);
                    seg.rotation.y = wave * 0.40;
                    seg.position.x = wave * 0.085;
                }
            } else if (this.legs.length === 4) {
                const swing = Math.sin(this.animTime) * 0.6;
                this.legs[0].rotation.x = swing;
                this.legs[1].rotation.x = -swing;
                this.legs[2].rotation.x = -swing;
                this.legs[3].rotation.x = swing;
            }
        } else {
            // Idle state
            if (this.type === 'snake') {
                // Gentle breathing / coiling
                for (let i = 0; i < this.segments.length; i++) {
                    const seg = this.segments[i];
                    seg.rotation.y = Math.sin(Date.now() * 0.0025 - i * 0.4) * 0.12;
                    seg.position.x = Math.sin(Date.now() * 0.0025 - i * 0.4) * 0.02;
                }
            } else {
                for (const leg of this.legs) {
                    leg.rotation.x *= 0.8;
                }
                if (this.head) {
                    this.head.rotation.y = Math.sin(Date.now() * 0.002) * 0.15;
                }
            }
        }

        // Snake tongue flicking animation
        if (this.tongue) {
            const flick = Math.sin(Date.now() * 0.016);
            if (flick > 0.4) {
                this.tongue.position.z = 0.25 + (flick - 0.4) * 0.14;
                this.tongue.visible = true;
            } else {
                this.tongue.visible = false;
            }
        }

        this.group.position.copy(this.position);
    }
}

// Manager to handle all animals (Pigs, Sheep, Orange Snakes)
export class AnimalManager {
    constructor(scene, world, player = null) {
        this.scene = scene;
        this.world = world;
        this.player = player;
        this.animals = [];
        this.spawnInitialAnimals();
    }

    spawnInitialAnimals() {
        // 1. Fixed world spawns in diverse biomes
        const spawnData = [
            { x: 30, z: 30, type: 'snake' },
            { x: 34, z: 27, type: 'snake' },
            { x: 16, z: 22, type: 'snake' },
            { x: 48, z: 46, type: 'snake' },
            { x: 22, z: 44, type: 'snake' },
            { x: 42, z: 18, type: 'snake' },
            { x: 28, z: 28, type: 'pig' },
            { x: 36, z: 25, type: 'sheep' },
            { x: 44, z: 36, type: 'snake' },
            { x: 20, z: 35, type: 'pig' },
            { x: 38, z: 45, type: 'sheep' },
            { x: 24, z: 42, type: 'snake' },
            { x: 32, z: 18, type: 'pig' }
        ];

        for (const data of spawnData) {
            const animal = new Animal(this.scene, this.world, data.type, data.x, data.z, this);
            this.animals.push(animal);
        }

        // 2. ALWAYS spawn an orange snake 3-4 blocks right in front of the player's current location!
        if (this.player && this.player.position) {
            this.spawnSnakeNearPlayer(this.player, 3.5, 1.5);
        }
    }

    spawnSnakeNearPlayer(player = this.player, offsetX = 3.0, offsetZ = 2.0) {
        if (!player || !player.position) return null;
        const px = THREE.MathUtils.clamp(player.position.x + offsetX, 3, WORLD_SIZE_X - 3);
        const pz = THREE.MathUtils.clamp(player.position.z + offsetZ, 3, WORLD_SIZE_Z - 3);
        const snake = new Animal(this.scene, this.world, 'snake', px, pz, this);
        this.animals.push(snake);
        console.log(`[AnimalManager] Zespawnowano pomarańczowego węża obok gracza na (${px.toFixed(1)}, ${pz.toFixed(1)})`);
        return snake;
    }

    spawnBabySnake(x, z) {
        const baby = new Animal(this.scene, this.world, 'snake', x, z, this, true);
        baby.isTamed = true;
        this.animals.push(baby);
        console.log(`[AnimalManager] Pojawił się mały wąż (Baby Snake) na (${x.toFixed(1)}, ${z.toFixed(1)})!`);
        return baby;
    }

    update(dt, playerPosition = null) {
        for (const animal of this.animals) {
            animal.update(dt, playerPosition);
        }
    }
}
