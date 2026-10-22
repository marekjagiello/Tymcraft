import * as THREE from 'three';
import { Mob } from '../mob.js';
import { WORLD_SIZE_X, WORLD_SIZE_Z } from '../../world.js';
import { playHitSound, playEatSound } from '../../audio.js';
import { eventBus } from '../../events.js';

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

export class Pig extends Mob {
    constructor(scene, world, x = 32, z = 32, manager = null) {
        super(scene, world, 'pig', x, z, manager);
        this.maxHealth = 8;
        this.health = 8;
        this.walkSpeed = 1.6;

        this.buildModel();
        this.snapToGround();
        this.scene.add(this.group);
    }

    buildModel() {
        const pinkMat = new THREE.MeshLambertMaterial({ color: 0xf4928e });
        const darkPinkMat = new THREE.MeshLambertMaterial({ color: 0xdb6864 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });

        const bodyGeo = new THREE.BoxGeometry(0.8, 0.6, 1.1);
        const body = new THREE.Mesh(bodyGeo, pinkMat);
        body.position.set(0, 0.6, 0);
        this.group.add(body);

        const headGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
        this.head = new THREE.Mesh(headGeo, pinkMat);
        this.head.position.set(0, 0.8, 0.75);

        const snoutGeo = new THREE.BoxGeometry(0.3, 0.2, 0.15);
        const snout = new THREE.Mesh(snoutGeo, darkPinkMat);
        snout.position.set(0, -0.08, 0.32);
        this.head.add(snout);

        const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.05);
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.2, 0.08, 0.28);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.2, 0.08, 0.28);
        this.head.add(leftEye, rightEye);

        this.group.add(this.head);

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

    update(dt) {
        this.updateHearts(dt);
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
            if (this.state === 'idle') {
                this.state = 'walk';
                this.stateTimer = 1.5 + Math.random() * 3.5;
                this.targetRotationY = Math.random() * Math.PI * 2;
            } else {
                this.state = 'idle';
                this.stateTimer = 2 + Math.random() * 4;
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
            if (groundAtTarget - this.position.y > 1.15) {
                this.targetRotationY += (Math.random() < 0.5 ? 0.75 : -0.75);
            } else {
                this.position.x = nextX;
                this.position.z = nextZ;
            }

            const swing = Math.sin(this.animTime) * 0.6;
            this.legs[0].rotation.x = swing;
            this.legs[1].rotation.x = -swing;
            this.legs[2].rotation.x = -swing;
            this.legs[3].rotation.x = swing;
        } else {
            for (const leg of this.legs) leg.rotation.x *= 0.8;
            if (this.head) this.head.rotation.y = Math.sin(Date.now() * 0.002) * 0.15;
        }

        this.updateFooting(dt);
    }
}

export class Sheep extends Mob {
    constructor(scene, world, x = 32, z = 32, manager = null) {
        super(scene, world, 'sheep', x, z, manager);
        this.maxHealth = 8;
        this.health = 8;
        this.walkSpeed = 1.6;

        this.buildModel();
        this.snapToGround();
        this.scene.add(this.group);
    }

    buildModel() {
        const woolMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xd9c2a7 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });

        const bodyGeo = new THREE.BoxGeometry(0.95, 0.8, 1.25);
        const body = new THREE.Mesh(bodyGeo, woolMat);
        body.position.set(0, 0.8, 0);
        this.group.add(body);

        const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        this.head = new THREE.Mesh(headGeo, skinMat);
        this.head.position.set(0, 1.05, 0.78);

        const capGeo = new THREE.BoxGeometry(0.52, 0.25, 0.4);
        const cap = new THREE.Mesh(capGeo, woolMat);
        cap.position.set(0, 0.2, -0.05);
        this.head.add(cap);

        const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.05);
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.2, 0.05, 0.26);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.2, 0.05, 0.26);
        this.head.add(leftEye, rightEye);

        this.group.add(this.head);

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

    update(dt) {
        this.updateHearts(dt);
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
            if (this.state === 'idle') {
                this.state = 'walk';
                this.stateTimer = 1.5 + Math.random() * 3.5;
                this.targetRotationY = Math.random() * Math.PI * 2;
            } else {
                this.state = 'idle';
                this.stateTimer = 2 + Math.random() * 4;
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
            if (groundAtTarget - this.position.y > 1.15) {
                this.targetRotationY += (Math.random() < 0.5 ? 0.75 : -0.75);
            } else {
                this.position.x = nextX;
                this.position.z = nextZ;
            }

            const swing = Math.sin(this.animTime) * 0.6;
            this.legs[0].rotation.x = swing;
            this.legs[1].rotation.x = -swing;
            this.legs[2].rotation.x = -swing;
            this.legs[3].rotation.x = swing;
        } else {
            for (const leg of this.legs) leg.rotation.x *= 0.8;
            if (this.head) this.head.rotation.y = Math.sin(Date.now() * 0.002) * 0.15;
        }

        this.updateFooting(dt);
    }
}

export class Snake extends Mob {
    constructor(scene, world, x = 32, z = 32, manager = null, isBaby = false) {
        super(scene, world, 'snake', x, z, manager);
        this.isBaby = isBaby;
        this.maxHealth = 4;
        this.health = 4;
        this.walkSpeed = 1.8;
        this.segments = [];
        this.tongue = null;
        this.activeHearts = [];
        this.isTamed = false;

        this.buildModel();
        this.snapToGround();
        this.scene.add(this.group);
    }

    buildModel() {
        const orangeMat = new THREE.MeshLambertMaterial({ color: 0xf97316 });
        const darkOrangeMat = new THREE.MeshLambertMaterial({ color: 0x9a3412 });
        const bellyMat = new THREE.MeshLambertMaterial({ color: 0xfdba74 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const whiteEyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const tongueMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });

        this.segments = [];

        // Head (Segment 0)
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.12, 0.6);

        const headGeo = new THREE.BoxGeometry(0.32, 0.18, 0.36);
        const headMesh = new THREE.Mesh(headGeo, orangeMat);
        headMesh.castShadow = true;
        headGroup.add(headMesh);

        const headSpotGeo = new THREE.BoxGeometry(0.18, 0.03, 0.20);
        const headSpot = new THREE.Mesh(headSpotGeo, darkOrangeMat);
        headSpot.position.set(0, 0.095, 0.02);
        headGroup.add(headSpot);

        const headBellyGeo = new THREE.BoxGeometry(0.24, 0.02, 0.30);
        const headBelly = new THREE.Mesh(headBellyGeo, bellyMat);
        headBelly.position.set(0, -0.095, 0);
        headGroup.add(headBelly);

        const eyeGeo = new THREE.BoxGeometry(0.06, 0.07, 0.07);
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.165, 0.03, 0.08);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.165, 0.03, 0.08);
        headGroup.add(leftEye, rightEye);

        const dotGeo = new THREE.BoxGeometry(0.02, 0.03, 0.03);
        const leftDot = new THREE.Mesh(dotGeo, whiteEyeMat);
        leftDot.position.set(-0.17, 0.05, 0.10);
        const rightDot = new THREE.Mesh(dotGeo, whiteEyeMat);
        rightDot.position.set(0.17, 0.05, 0.10);
        headGroup.add(leftDot, rightDot);

        const tongueGeo = new THREE.BoxGeometry(0.06, 0.02, 0.16);
        this.tongue = new THREE.Mesh(tongueGeo, tongueMat);
        this.tongue.position.set(0, -0.03, 0.25);
        headGroup.add(this.tongue);

        this.head = headGroup;
        this.group.add(headGroup);
        this.segments.push(headGroup);

        // Body Segments (1 to 6)
        const numBodySegments = 6;
        for (let i = 0; i < numBodySegments; i++) {
            const segGroup = new THREE.Group();
            const zOffset = 0.6 - (i + 1) * 0.25;
            segGroup.position.set(0, 0.11, zOffset);

            const width = 0.28 - i * 0.012;
            const height = 0.16 - i * 0.006;
            const length = 0.24;

            const segGeo = new THREE.BoxGeometry(width, height, length);
            const segMesh = new THREE.Mesh(segGeo, orangeMat);
            segMesh.castShadow = true;
            segGroup.add(segMesh);

            const spotWidth = width * 0.62;
            const spotLength = length * 0.6;
            const spotGeo = new THREE.BoxGeometry(spotWidth, 0.025, spotLength);
            const spotMesh = new THREE.Mesh(spotGeo, darkOrangeMat);
            spotMesh.position.set(0, height * 0.5 + 0.013, 0);
            segGroup.add(spotMesh);

            const bGeo = new THREE.BoxGeometry(width * 0.75, 0.02, length * 0.85);
            const bMesh = new THREE.Mesh(bGeo, bellyMat);
            bMesh.position.set(0, -height * 0.5 - 0.01, 0);
            segGroup.add(bMesh);

            this.group.add(segGroup);
            this.segments.push(segGroup);
        }

        // Tapered Tail (Segment 7)
        const tailGroup = new THREE.Group();
        tailGroup.position.set(0, 0.08, 0.6 - (numBodySegments + 1) * 0.23);

        const tailGeo = new THREE.BoxGeometry(0.14, 0.11, 0.24);
        const tailMesh = new THREE.Mesh(tailGeo, orangeMat);
        tailGroup.add(tailMesh);

        const tipGeo = new THREE.BoxGeometry(0.08, 0.08, 0.12);
        const tipMesh = new THREE.Mesh(tipGeo, darkOrangeMat);
        tipMesh.position.set(0, 0, -0.16);
        tailGroup.add(tipMesh);

        this.group.add(tailGroup);
        this.segments.push(tailGroup);

        if (this.isBaby) {
            this.group.scale.set(0.5, 0.5, 0.5);
        }
    }

    interactWithApple() {
        this.isTamed = true;
        this.spawnHeartParticles();
        if (this.manager && this.manager.spawnBabySnake) {
            this.manager.spawnBabySnake(this.position.x + 0.5, this.position.z + 0.5);
        }
        console.log(`[Animal] Wąż został nakarmiony jabłkiem! Pojawiły się serca ❤️`);
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

    die() {
        for (const h of this.activeHearts) {
            if (h.mesh && h.mesh.parent) {
                this.scene.remove(h.mesh);
            }
        }
        this.activeHearts = [];
        super.die();
    }

    update(dt, playerPosition = null) {
        this.updateHearts(dt);
        this.stateTimer -= dt;

        if (this.isTamed && playerPosition) {
            const distToPlayer = this.position.distanceTo(playerPosition);
            if (distToPlayer > 2.2 && distToPlayer < 12.0) {
                this.state = 'walk';
                this.targetRotationY = Math.atan2(playerPosition.x - this.position.x, playerPosition.z - this.position.z);
            } else if (distToPlayer <= 2.2) {
                this.state = 'idle';
            }
        } else if (this.stateTimer <= 0) {
            if (this.state === 'idle') {
                this.state = 'walk';
                this.stateTimer = 1.5 + Math.random() * 3.5;
                this.targetRotationY = Math.random() * Math.PI * 2;
            } else {
                this.state = 'idle';
                this.stateTimer = 2 + Math.random() * 4;
            }
        }

        let diff = this.targetRotationY - this.rotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.rotationY += diff * 4 * dt;
        this.group.rotation.y = this.rotationY;

        if (this.state === 'walk') {
            this.animTime += dt * 6.5;
            const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
            const nextX = this.position.x + fwd.x * this.walkSpeed * dt;
            const nextZ = this.position.z + fwd.z * this.walkSpeed * dt;

            const groundAtTarget = this.getGroundHeight(nextX, nextZ);
            if (groundAtTarget - this.position.y > 1.15) {
                this.targetRotationY += (Math.random() < 0.5 ? 0.75 : -0.75);
            } else {
                this.position.x = nextX;
                this.position.z = nextZ;
            }

            for (let i = 0; i < this.segments.length; i++) {
                const seg = this.segments[i];
                const wave = Math.sin(this.animTime - i * 0.75);
                seg.rotation.y = wave * 0.40;
                seg.position.x = wave * 0.085;
            }
        } else {
            for (let i = 0; i < this.segments.length; i++) {
                const seg = this.segments[i];
                seg.rotation.y = Math.sin(Date.now() * 0.0025 - i * 0.4) * 0.12;
                seg.position.x = Math.sin(Date.now() * 0.0025 - i * 0.4) * 0.02;
            }
        }

        if (this.tongue) {
            const flick = Math.sin(Date.now() * 0.016);
            if (flick > 0.4) {
                this.tongue.position.z = 0.25 + (flick - 0.4) * 0.14;
                this.tongue.visible = true;
            } else {
                this.tongue.visible = false;
            }
        }

        this.updateFooting(dt);
    }
}

export class Bear extends Mob {
    constructor(scene, world, x = 32, z = 32, manager = null, variant = 'polar') {
        super(scene, world, 'bear', x, z, manager);
        this.variant = variant; // 'polar', 'brown', 'black', 'panda', 'grizzly', 'kermode'
        this.isMounted = false;
        this.rider = null;
        this.attackCooldown = 0;
        this.swipeTime = 0;
        this.state = 'idle';
        this.stateTimer = 2.0;
        this.walkCycle = 0;
        this.activeHearts = [];

        // Stat configurations based on breed / race:
        // White Polar Bear is the STRONGEST ("biała jest silniejsza")!
        switch (this.variant) {
            case 'polar':
                this.variantName = 'Biały Niedźwiedź Polarny';
                this.maxHealth = 32;
                this.health = 32;
                this.walkSpeed = 3.6; // Fastest!
                this.pawDamage = 12; // Massive swipe damage!
                break;
            case 'brown':
                this.variantName = 'Niedźwiedź Brunatny';
                this.maxHealth = 20;
                this.health = 20;
                this.walkSpeed = 2.5;
                this.pawDamage = 8;
                break;
            case 'black':
                this.variantName = 'Niedźwiedź Czarny (Baribal)';
                this.maxHealth = 18;
                this.health = 18;
                this.walkSpeed = 2.7;
                this.pawDamage = 7;
                break;
            case 'panda':
                this.variantName = 'Wielka Panda';
                this.maxHealth = 18;
                this.health = 18;
                this.walkSpeed = 2.2;
                this.pawDamage = 6;
                break;
            case 'grizzly':
                this.variantName = 'Wielki Grizzly';
                this.maxHealth = 24;
                this.health = 24;
                this.walkSpeed = 2.6;
                this.pawDamage = 9;
                break;
            case 'kermode':
            default:
                this.variantName = 'Złoty Niedźwiedź';
                this.maxHealth = 22;
                this.health = 22;
                this.walkSpeed = 2.6;
                this.pawDamage = 8;
                break;
        }

        this.buildModel();
        this.buildHealthBar(1.6);
        this.snapToGround();
        this.scene.add(this.group);
    }

    buildModel() {
        let furColor = 0x78350f;
        let snoutColor = 0x92400e;
        let legColor = 0x78350f;
        let earColor = 0x78350f;

        if (this.variant === 'polar') {
            furColor = 0xf8fafc;
            snoutColor = 0xe2e8f0;
            legColor = 0xf8fafc;
            earColor = 0xf8fafc;
        } else if (this.variant === 'brown') {
            furColor = 0x6b4226;
            snoutColor = 0x854d0e;
            legColor = 0x6b4226;
            earColor = 0x6b4226;
        } else if (this.variant === 'black') {
            furColor = 0x1e293b;
            snoutColor = 0x78350f;
            legColor = 0x1e293b;
            earColor = 0x1e293b;
        } else if (this.variant === 'panda') {
            furColor = 0xf8fafc;
            snoutColor = 0xf8fafc;
            legColor = 0x0f172a; // Black legs
            earColor = 0x0f172a; // Black ears
        } else if (this.variant === 'grizzly') {
            furColor = 0x451a03;
            snoutColor = 0x78350f;
            legColor = 0x451a03;
            earColor = 0x451a03;
        } else if (this.variant === 'kermode') {
            furColor = 0xfef08a;
            snoutColor = 0xfde047;
            legColor = 0xfef08a;
            earColor = 0xfef08a;
        }

        const furMat = new THREE.MeshLambertMaterial({ color: furColor });
        const snoutMat = new THREE.MeshLambertMaterial({ color: snoutColor });
        const legMat = new THREE.MeshLambertMaterial({ color: legColor });
        const earMat = new THREE.MeshLambertMaterial({ color: earColor });
        const darkMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
        const saddleMat = new THREE.MeshLambertMaterial({ color: 0x9a3412 }); // Leather saddle

        // Main body torso
        const bodyGeo = new THREE.BoxGeometry(1.05, 0.90, 1.55);
        const body = new THREE.Mesh(bodyGeo, furMat);
        body.position.set(0, 0.85, 0);
        this.group.add(body);

        // Saddle / blanket for riding on back
        const saddleGeo = new THREE.BoxGeometry(0.85, 0.08, 0.85);
        const saddle = new THREE.Mesh(saddleGeo, saddleMat);
        saddle.position.set(0, 0.46, -0.05);
        body.add(saddle);

        // Head
        this.head = new THREE.Group();
        this.head.position.set(0, 1.05, 0.90);

        const headGeo = new THREE.BoxGeometry(0.65, 0.60, 0.65);
        const headMesh = new THREE.Mesh(headGeo, furMat);
        this.head.add(headMesh);

        // Snout
        const snoutGeo = new THREE.BoxGeometry(0.40, 0.30, 0.38);
        const snoutMesh = new THREE.Mesh(snoutGeo, snoutMat);
        snoutMesh.position.set(0, -0.08, 0.40);
        this.head.add(snoutMesh);

        // Nose tip
        const noseGeo = new THREE.BoxGeometry(0.14, 0.10, 0.06);
        const noseMesh = new THREE.Mesh(noseGeo, darkMat);
        noseMesh.position.set(0, 0.06, 0.20);
        snoutMesh.add(noseMesh);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
        const leftEye = new THREE.Mesh(eyeGeo, darkMat);
        leftEye.position.set(-0.22, 0.10, 0.33);
        const rightEye = new THREE.Mesh(eyeGeo, darkMat);
        rightEye.position.set(0.22, 0.10, 0.33);
        this.head.add(leftEye, rightEye);

        // Ears
        const earGeo = new THREE.BoxGeometry(0.16, 0.16, 0.08);
        const leftEar = new THREE.Mesh(earGeo, earMat);
        leftEar.position.set(-0.28, 0.34, -0.05);
        const rightEar = new THREE.Mesh(earGeo, earMat);
        rightEar.position.set(0.28, 0.34, -0.05);
        this.head.add(leftEar, rightEar);

        this.group.add(this.head);

        // Tail
        const tailGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
        const tailMesh = new THREE.Mesh(tailGeo, furMat);
        tailMesh.position.set(0, 0.95, -0.85);
        this.group.add(tailMesh);

        // 4 Sturdy Legs
        const legGeo = new THREE.BoxGeometry(0.32, 0.65, 0.32);
        const legOffsets = [
            [-0.36, 0.65, 0.45],  // front left
            [0.36, 0.65, 0.45],   // front right
            [-0.36, 0.65, -0.45], // back left
            [0.36, 0.65, -0.45]   // back right
        ];

        this.legs = [];
        for (let i = 0; i < 4; i++) {
            const pivot = new THREE.Group();
            pivot.position.set(legOffsets[i][0], legOffsets[i][1], legOffsets[i][2]);
            const legMesh = new THREE.Mesh(legGeo, legMat);
            legMesh.position.set(0, -0.325, 0);
            pivot.add(legMesh);
            this.group.add(pivot);
            this.legs.push(pivot);
        }
    }

    performPawAttack() {
        if (this.attackCooldown > 0) return;
        this.attackCooldown = 0.45;
        this.swipeTime = 0.35;
        playHitSound();

        let hitCount = 0;
        if (this.manager && this.manager.animals) {
            for (const mob of this.manager.animals) {
                if (!mob || mob.isDead || mob === this) continue;
                if (mob.type === 'zombie' || mob.type === 'skeleton' || mob.type === 'creeper' || mob.type === 'dirtik') {
                    const dist = this.position.distanceTo(mob.position);
                    if (dist <= 3.2) {
                        mob.onAttacked(this.pawDamage, this.position);
                        hitCount++;
                    }
                }
            }
        }
        const attackMsg = this.variant === 'polar'
            ? `🐾💥 Potężny cios łapą Białego Niedźwiedzia Polarnego (${this.pawDamage} DMG)!`
            : `🐾 Cios łapą Niedźwiedzia (${this.pawDamage} DMG)!`;
        eventBus.emit('ui:popup', attackMsg);
    }

    updateRidingAnimation(dt, isMoving) {
        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        if (isMoving) {
            this.walkCycle += dt * 8.0;
            const swing = Math.sin(this.walkCycle) * 0.45;
            if (this.legs && this.legs.length === 4) {
                this.legs[0].rotation.x = swing;
                this.legs[1].rotation.x = -swing;
                this.legs[2].rotation.x = -swing;
                this.legs[3].rotation.x = swing;
            }
        } else {
            if (this.legs && this.legs.length === 4) {
                for (let i = 0; i < 4; i++) this.legs[i].rotation.x = 0;
            }
        }

        // Paw swipe attack animation
        if (this.swipeTime > 0) {
            this.swipeTime -= dt;
            if (this.legs && this.legs[1]) {
                this.legs[1].rotation.x = -1.2 + Math.sin(this.swipeTime * 15) * 0.8;
            }
        }
    }

    feedWithRottenFlesh() {
        if (this.isDead) return false;
        const healAmount = 8;
        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + healAmount);
        this.spawnHeartParticles();
        playEatSound();
        const healedDiff = this.health - oldHealth;
        const msg = healedDiff > 0
            ? `🐻❤️ Nakarmiono ${this.variantName}! (+${healedDiff} HP, teraz: ${this.health}/${this.maxHealth})`
            : `🐻❤️ Nakarmiono ${this.variantName}! Pełnia zdrowia (${this.health}/${this.maxHealth} HP)!`;
        eventBus.emit('ui:popup', msg);
        console.log(`[Animal] Bear fed with rotten flesh! Health: ${this.health}/${this.maxHealth}`);
        return true;
    }

    interactWithApple() {
        return this.feedWithRottenFlesh();
    }

    spawnHeartParticles() {
        const heartCount = 7;
        for (let i = 0; i < heartCount; i++) {
            const heart = createPixelHeartMesh();
            heart.position.set(
                this.position.x + (Math.random() - 0.5) * 0.9,
                this.position.y + 1.1 + Math.random() * 0.5,
                this.position.z + (Math.random() - 0.5) * 0.9
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
        if (!this.activeHearts) return;
        for (let i = this.activeHearts.length - 1; i >= 0; i--) {
            const h = this.activeHearts[i];
            h.life -= dt;
            if (h.life <= 0) {
                if (h.mesh && h.mesh.parent) {
                    this.scene.remove(h.mesh);
                }
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

    die() {
        if (this.activeHearts) {
            for (const h of this.activeHearts) {
                if (h.mesh && h.mesh.parent) {
                    this.scene.remove(h.mesh);
                }
            }
            this.activeHearts = [];
        }
        super.die();
    }

    update(dt, playerPosition = null, isDay = true) {
        this.updateHearts(dt);
        if (this.isDead) return;

        this.updateHealthBar(playerPosition);

        // When mounted, movement is driven by Player
        if (this.isMounted) {
            return;
        }

        if (this.attackCooldown > 0) this.attackCooldown -= dt;

        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
            if (this.state === 'idle') {
                this.state = 'walk';
                this.stateTimer = 2.0 + Math.random() * 4.0;
                this.targetRotationY = Math.random() * Math.PI * 2;
            } else {
                this.state = 'idle';
                this.stateTimer = 2.5 + Math.random() * 5.0;
            }
        }

        if (this.state === 'walk') {
            this.walkCycle += dt * 6.0;
            const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
            const nextX = this.position.x + fwd.x * (this.walkSpeed * 0.5) * dt;
            const nextZ = this.position.z + fwd.z * (this.walkSpeed * 0.5) * dt;

            const groundAtTarget = this.getGroundHeight(nextX, nextZ);
            if (groundAtTarget - this.position.y > 1.15) {
                this.targetRotationY += (Math.random() < 0.5 ? 1.0 : -1.0);
            } else {
                this.position.x = nextX;
                this.position.z = nextZ;
            }

            const swing = Math.sin(this.walkCycle) * 0.35;
            if (this.legs && this.legs.length === 4) {
                this.legs[0].rotation.x = swing;
                this.legs[1].rotation.x = -swing;
                this.legs[2].rotation.x = -swing;
                this.legs[3].rotation.x = swing;
            }
        } else {
            if (this.legs && this.legs.length === 4) {
                for (let i = 0; i < 4; i++) this.legs[i].rotation.x = 0;
            }
        }

        this.rotationY += (this.targetRotationY - this.rotationY) * Math.min(1, dt * 4);
        this.group.rotation.y = this.rotationY;

        this.updateFooting(dt);
    }
}

