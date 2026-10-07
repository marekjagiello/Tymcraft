import * as THREE from 'three';
import { WORLD_SIZE_X, WORLD_SIZE_Z, WORLD_HEIGHT, SEA_LEVEL } from './world.js';
import { DroppedItem } from './drops.js';

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
        this.arms = [];
        this.activeHearts = [];
        this.maxHealth = (this.type === 'snake') ? 4 : (this.type === 'zombie' ? 10 : 8);
        this.health = this.maxHealth;
        this.isDead = false;
        this.attackCooldown = 0;
        this.burnTimer = 0;

        this.position = new THREE.Vector3(x, 15, z);
        this.rotationY = Math.random() * Math.PI * 2;
        this.targetRotationY = this.rotationY;

        this.state = 'idle'; // 'idle' | 'walk'
        this.stateTimer = 1 + Math.random() * 3;
        this.walkSpeed = (this.type === 'snake') ? 1.8 : (this.type === 'zombie' ? 1.35 : 1.6);
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
        } else if (this.type === 'zombie') {
            this.buildZombieModel();
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

    buildZombieModel() {
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

        // Black eyes
        const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
        const lEye = new THREE.Mesh(eyeGeo, eyeMat);
        lEye.position.set(-0.1, 0.04, 0.2);
        const rEye = new THREE.Mesh(eyeGeo, eyeMat);
        rEye.position.set(0.1, 0.04, 0.2);
        this.head.add(lEye, rEye);

        // Torso / Body (0.44 x 0.62 x 0.26)
        const bodyGeo = new THREE.BoxGeometry(0.44, 0.62, 0.26);
        const body = new THREE.Mesh(bodyGeo, shirtMat);
        body.position.set(0, 0.94, 0);
        body.castShadow = true;
        this.group.add(body);

        // Arms stretched forward (classic Minecraft zombie pose)
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
        console.log(`[Animal] ${this.type} został nakarmiony jabłkiem! Pojawiły się serca ❤️`);
    }

    flashRed() {
        this.group.traverse((child) => {
            if (child.isMesh && child.material) {
                if (!child._origColor && child.material.color) {
                    child._origColor = child.material.color.clone();
                }
                if (child.material.color) {
                    child.material.color.setHex(0xef4444);
                }
            }
        });
        setTimeout(() => {
            if (this.isDead) return;
            this.group.traverse((child) => {
                if (child.isMesh && child._origColor && child.material && child.material.color) {
                    child.material.color.copy(child._origColor);
                }
            });
        }, 180);
    }

    onAttacked(damage = 2) {
        if (this.isDead) return;
        this.health -= damage;
        this.flashRed();

        // Recoil / hop
        this.state = 'walk';
        this.stateTimer = 1.8;
        this.targetRotationY += Math.PI * (0.6 + Math.random() * 0.4);
        this.position.y += 0.25;

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;

        // Clear any floating hearts
        for (const h of this.activeHearts) {
            if (h.mesh && h.mesh.parent) {
                this.scene.remove(h.mesh);
            }
        }
        this.activeHearts = [];

        // Spawn death poof particles (smoke puff)
        if (this.manager && this.manager.spawnDeathPoof) {
            this.manager.spawnDeathPoof(this.position.clone().add(new THREE.Vector3(0, 0.2, 0)));
        }

        // Drop Rotten Flesh (ID 26) if zombie
        if (this.type === 'zombie' && this.manager && this.manager.drops) {
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

        // Remove from scene
        if (this.group && this.group.parent) {
            this.scene.remove(this.group);
        }

        // Remove from manager list
        if (this.manager) {
            this.manager.removeAnimal(this);
        }
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

    update(dt, playerPosition = null, isDay = true) {
        this.updateHearts(dt);

        this.stateTimer -= dt;

        // Zombie logic: Hostile AI & Daylight Burning
        if (this.type === 'zombie') {
            if (this.attackCooldown > 0) this.attackCooldown -= dt;

            // Daytime burning in direct sunlight
            if (isDay && !this.isDead) {
                const bx = Math.floor(this.position.x);
                const bz = Math.floor(this.position.z);
                const by = Math.floor(this.position.y);
                let exposed = true;
                for (let y = by + 2; y < WORLD_HEIGHT; y++) {
                    if (this.world.isSolid(bx, y, bz)) {
                        exposed = false;
                        break;
                    }
                }
                if (exposed) {
                    this.burnTimer = (this.burnTimer || 0) + dt;
                    this.flashRed();
                    if (this.burnTimer >= 1.0) {
                        this.burnTimer = 0;
                        this.onAttacked(2); // Sunlight fire damage
                    }
                }
            }

            // Target player
            if (playerPosition && !this.isDead) {
                const distToPlayer = this.position.distanceTo(playerPosition);
                if (distToPlayer < 22.0) {
                    this.state = 'walk';
                    this.targetRotationY = Math.atan2(playerPosition.x - this.position.x, playerPosition.z - this.position.z);

                    // Melee attack player
                    if (distToPlayer <= 1.35 && this.attackCooldown <= 0) {
                        this.attackCooldown = 1.2;
                        if (this.manager && this.manager.survival) {
                            this.manager.survival.takeDamage(2, 'Zombie');
                            if (this.manager.ui) this.manager.ui.showPopup("⚠️ Zombie Cię zaatakował! (-1 serce)");
                        }
                    }
                }
            }
        } else if (this.isTamed && playerPosition) {
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
            } else if (this.legs.length === 2) {
                const swing = Math.sin(this.animTime) * 0.65;
                this.legs[0].rotation.x = swing;
                this.legs[1].rotation.x = -swing;
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

        // Death poof particles
        this.deathParticles = [];
        this.deathGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        this.deathMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });

        this.spawnInitialAnimals();

        // Expose globally for convenience
        if (typeof window !== 'undefined') {
            window.killSnakesExceptOne = () => this.killSnakesExceptOne();
        }
    }

    spawnInitialAnimals() {
        // 1. Standardowe zwierzęta (świnie, owce)
        const spawnData = [
            { x: 28, z: 28, type: 'pig' },
            { x: 36, z: 25, type: 'sheep' },
            { x: 20, z: 35, type: 'pig' },
            { x: 38, z: 45, type: 'sheep' },
            { x: 32, z: 18, type: 'pig' }
        ];

        for (const data of spawnData) {
            const animal = new Animal(this.scene, this.world, data.type, data.x, data.z, this);
            this.animals.push(animal);
        }

        // 2. DOKŁADNIE 1 WĄŻ w całym świecie (obok gracza lub w bazie)
        if (this.player && this.player.position) {
            this.spawnSnakeNearPlayer(this.player, 3.5, 1.5);
        } else {
            const singleSnake = new Animal(this.scene, this.world, 'snake', 30, 30, this);
            this.animals.push(singleSnake);
        }

        // Gwarancja: jeśli z jakiegokolwiek powodu jest więcej niż 1 wąż, zabij wszystkie oprócz 1
        this.killSnakesExceptOne();
    }

    removeAnimal(animal) {
        const idx = this.animals.indexOf(animal);
        if (idx !== -1) {
            this.animals.splice(idx, 1);
        }
    }

    // Zabija / usuwa wszystkie węże poza pierwszym (pozostawiając dokładnie 1 węża na świecie)
    killSnakesExceptOne() {
        const snakes = this.animals.filter(a => a.type === 'snake');
        let killedCount = 0;
        // Zostawiamy pierwszego węża (indeks 0), wszystkie pozostałe likwidujemy
        for (let i = 1; i < snakes.length; i++) {
            snakes[i].die();
            killedCount++;
        }
        console.log(`[AnimalManager] Zabito/usunięto ${killedCount} nadmiarowych węży. W świecie pozostał dokładnie 1 wąż.`);
        return killedCount;
    }

    spawnDeathPoof(position) {
        for (let i = 0; i < 14; i++) {
            const m = new THREE.Mesh(this.deathGeo, this.deathMat);
            m.position.copy(position).add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.4,
                Math.random() * 0.3,
                (Math.random() - 0.5) * 0.4
            ));
            this.scene.add(m);
            this.deathParticles.push({
                mesh: m,
                vx: (Math.random() - 0.5) * 1.6,
                vy: 0.8 + Math.random() * 1.4,
                vz: (Math.random() - 0.5) * 1.6,
                life: 0.55,
                maxLife: 0.55
            });
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

    update(dt, playerPosition = null, isDay = true) {
        // Automatyczne zabijanie nadmiarowych węży (utrzymywanie maksymalnie 1 węża na świecie bez żadnego przycisku)
        const snakes = this.animals.filter(a => a.type === 'snake');
        if (snakes.length > 1) {
            this.killSnakesExceptOne();
        }

        // Nocny spawn Zombie
        if (!isDay && playerPosition) {
            this.nightSpawnTimer = (this.nightSpawnTimer || 0) + dt;
            const zombieCount = this.animals.filter(a => a.type === 'zombie').length;
            if (this.nightSpawnTimer >= 10.0 && zombieCount < 3) {
                this.nightSpawnTimer = 0;
                const angle = Math.random() * Math.PI * 2;
                const dist = 14 + Math.random() * 8;
                const zx = THREE.MathUtils.clamp(playerPosition.x + Math.cos(angle) * dist, 3, WORLD_SIZE_X - 3);
                const zz = THREE.MathUtils.clamp(playerPosition.z + Math.sin(angle) * dist, 3, WORLD_SIZE_Z - 3);
                const zombie = new Animal(this.scene, this.world, 'zombie', zx, zz, this);
                this.animals.push(zombie);
                console.log(`[Monster] Pojawił się Zombie w nocy na (${zx.toFixed(1)}, ${zz.toFixed(1)})!`);
                if (this.ui) this.ui.showPopup("🧟 W ciemności nocy pojawił się Zombie!");
            }
        }

        // Update all animals
        for (let i = this.animals.length - 1; i >= 0; i--) {
            this.animals[i].update(dt, playerPosition, isDay);
        }

        // Update death poof particles
        for (let i = this.deathParticles.length - 1; i >= 0; i--) {
            const p = this.deathParticles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.deathParticles.splice(i, 1);
            } else {
                p.mesh.position.x += p.vx * dt;
                p.mesh.position.y += p.vy * dt;
                p.mesh.position.z += p.vz * dt;
                const scale = Math.max(0.05, p.life / p.maxLife);
                p.mesh.scale.set(scale, scale, scale);
            }
        }
    }
}
