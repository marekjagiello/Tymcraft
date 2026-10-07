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

export class FlyingArrow {
    constructor(scene, world, origin, direction, shooter = 'skeleton') {
        this.scene = scene;
        this.world = world;
        this.shooter = shooter;
        this.isStuck = false;
        this.stuckTimer = 0;
        this.isDead = false;
        this.lifetime = 0;

        this.position = origin.clone();
        const speed = 21.0;
        this.velocity = direction.clone().normalize().multiplyScalar(speed);
        this.velocity.y += 1.8; // subtle ballistic arc

        this.group = new THREE.Group();
        this.buildMesh();
        this.group.position.copy(this.position);
        this.updateRotation();
        this.scene.add(this.group);
    }

    buildMesh() {
        const shaftMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
        const shaftGeo = new THREE.BoxGeometry(0.04, 0.04, 0.5);
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        this.group.add(shaft);

        const tipMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
        const tipGeo = new THREE.BoxGeometry(0.08, 0.08, 0.12);
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.set(0, 0, 0.26);
        this.group.add(tip);

        const featherMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
        const featherGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        const feather = new THREE.Mesh(featherGeo, featherMat);
        feather.position.set(0, 0, -0.22);
        this.group.add(feather);
    }

    updateRotation() {
        if (this.velocity.lengthSq() > 0.001) {
            const dir = this.velocity.clone().normalize();
            const targetPos = this.position.clone().add(dir);
            this.group.lookAt(targetPos);
        }
    }

    update(dt, player = null, survival = null, ui = null) {
        if (this.isDead) return;

        if (this.isStuck) {
            this.stuckTimer += dt;
            if (this.stuckTimer >= 5.0) {
                this.destroy();
            }
            return;
        }

        this.lifetime += dt;
        if (this.lifetime > 8.0) {
            this.destroy();
            return;
        }

        // Apply gravity
        this.velocity.y -= 9.8 * dt;

        const prevPos = this.position.clone();
        this.position.addScaledVector(this.velocity, dt);
        this.group.position.copy(this.position);
        this.updateRotation();

        // Check player collision
        if (player && player.position) {
            const playerCenter = player.position.clone().add(new THREE.Vector3(0, 0.9, 0));
            const distToPlayer = this.position.distanceTo(playerCenter);
            if (distToPlayer < 0.85) {
                if (survival) {
                    survival.takeDamage(2, 'Szkielet');
                    if (ui) ui.showPopup("🏹 Szkielet trafił Cię strzałą! (-1 serce)");
                }
                this.destroy();
                return;
            }
        }

        // Check solid block collision
        const bx = Math.floor(this.position.x);
        const by = Math.floor(this.position.y);
        const bz = Math.floor(this.position.z);

        if (this.world.isSolid(bx, by, bz)) {
            this.isStuck = true;
            this.position.copy(prevPos);
            this.group.position.copy(this.position);
        }
    }

    destroy() {
        if (this.isDead) return;
        this.isDead = true;
        if (this.group && this.group.parent) {
            this.scene.remove(this.group);
        }
    }
}

export class Animal {
    constructor(scene, world, type = 'pig', x = 32, z = 32, manager = null, isBaby = false, hasHelmet = false) {
        this.scene = scene;
        this.world = world;
        this.type = type;
        this.manager = manager;
        this.isBaby = isBaby;
        this.hasHelmet = hasHelmet;

        this.group = new THREE.Group();
        this.legs = [];
        this.segments = [];
        this.head = null;
        this.tongue = null;
        this.arms = [];
        this.activeHearts = [];
        this.maxHealth = (this.type === 'snake') ? 4 : ((this.type === 'zombie' || this.type === 'skeleton') ? 10 : 8);
        this.health = this.maxHealth;
        this.isDead = false;
        this.attackCooldown = 0;
        this.shootCooldown = 1.0 + Math.random() * 1.5;
        this.burnTimer = 0;

        this.position = new THREE.Vector3(x, 15, z);
        this.rotationY = Math.random() * Math.PI * 2;
        this.targetRotationY = this.rotationY;

        this.state = 'idle'; // 'idle' | 'walk' | 'walk_back'
        this.stateTimer = 1 + Math.random() * 3;
        this.walkSpeed = (this.type === 'snake') ? 1.8 : (this.type === 'zombie' ? 1.35 : (this.type === 'skeleton' ? 1.45 : 1.6));
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
        } else if (this.type === 'skeleton') {
            this.buildSkeletonModel();
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

        // Helmet (protects zombie from sunlight burning)
        if (this.hasHelmet) {
            const helmetMat = new THREE.MeshLambertMaterial({ color: 0x52525b }); // Stone/slate dark helmet
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

        // 3D Floating Health Bar above zombie head
        this.healthBarGroup = new THREE.Group();
        this.healthBarGroup.position.set(0, 1.95, 0);

        const barBgGeo = new THREE.BoxGeometry(0.72, 0.09, 0.02);
        const barBgMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
        const barBg = new THREE.Mesh(barBgGeo, barBgMat);
        this.healthBarGroup.add(barBg);

        const barFillGeo = new THREE.BoxGeometry(0.70, 0.07, 0.025);
        this.barFillMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        this.healthBarFill = new THREE.Mesh(barFillGeo, this.barFillMat);
        this.healthBarGroup.add(this.healthBarFill);

        this.group.add(this.healthBarGroup);
    }

    buildSkeletonModel() {
        const boneMat = new THREE.MeshLambertMaterial({ color: 0xe4e4e7 });     // Bone off-white
        const socketMat = new THREE.MeshBasicMaterial({ color: 0x18181b });     // Dark hollow sockets
        const bowMat = new THREE.MeshLambertMaterial({ color: 0x78350f });      // Dark wood bow
        const stringMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });     // Bowstring

        // 1. Skull (0.4 x 0.4 x 0.4)
        const skullGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        this.head = new THREE.Mesh(skullGeo, boneMat);
        this.head.position.set(0, 1.45, 0);
        this.head.castShadow = true;
        this.group.add(this.head);

        // Dark hollow eye sockets
        const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
        const lEye = new THREE.Mesh(eyeGeo, socketMat);
        lEye.position.set(-0.1, 0.04, 0.201);
        const rEye = new THREE.Mesh(eyeGeo, socketMat);
        rEye.position.set(0.1, 0.04, 0.201);
        this.head.add(lEye, rEye);

        // Nose socket notch
        const noseGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
        const nose = new THREE.Mesh(noseGeo, socketMat);
        nose.position.set(0, -0.04, 0.201);
        this.head.add(nose);

        // Mouth / teeth notch
        const mouthGeo = new THREE.BoxGeometry(0.16, 0.03, 0.04);
        const mouth = new THREE.Mesh(mouthGeo, socketMat);
        mouth.position.set(0, -0.11, 0.201);
        this.head.add(mouth);

        // Helmet (protects skeleton from sunlight burning)
        if (this.hasHelmet) {
            const helmetMat = new THREE.MeshLambertMaterial({ color: 0x52525b });
            const helmetGeo = new THREE.BoxGeometry(0.44, 0.22, 0.44);
            const helmet = new THREE.Mesh(helmetGeo, helmetMat);
            helmet.position.set(0, 0.12, 0);
            this.head.add(helmet);
        }

        // 2. Torso (Spine + Ribs)
        // Central spine
        const spineGeo = new THREE.BoxGeometry(0.12, 0.62, 0.12);
        const spine = new THREE.Mesh(spineGeo, boneMat);
        spine.position.set(0, 0.94, 0);
        this.group.add(spine);

        // Ribs attached to spine
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

        // 3. Thin Bone Arms holding Bow
        const armGeo = new THREE.BoxGeometry(0.10, 0.10, 0.50);
        const lArm = new THREE.Mesh(armGeo, boneMat);
        lArm.position.set(-0.24, 1.05, 0.24);
        const rArm = new THREE.Mesh(armGeo, boneMat);
        rArm.position.set(0.24, 1.05, 0.24);
        this.group.add(lArm, rArm);
        this.arms = [lArm, rArm];

        // 4. Wooden Bow held in hands
        const bowGroup = new THREE.Group();
        bowGroup.position.set(0, 1.05, 0.48);

        // Bow main handle and curved limbs
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

        // Bowstring
        const stringGeo = new THREE.BoxGeometry(0.015, 0.46, 0.015);
        const stringMesh = new THREE.Mesh(stringGeo, stringMat);
        stringMesh.position.set(0, 0, -0.12);
        bowGroup.add(stringMesh);

        this.group.add(bowGroup);

        // 5. Thin Bone Legs
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

        // 6. 3D Floating Health Bar above skull
        this.healthBarGroup = new THREE.Group();
        this.healthBarGroup.position.set(0, 1.95, 0);

        const barBgGeo = new THREE.BoxGeometry(0.72, 0.09, 0.02);
        const barBgMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
        const barBg = new THREE.Mesh(barBgGeo, barBgMat);
        this.healthBarGroup.add(barBg);

        const barFillGeo = new THREE.BoxGeometry(0.70, 0.07, 0.025);
        this.barFillMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        this.healthBarFill = new THREE.Mesh(barFillGeo, this.barFillMat);
        this.healthBarGroup.add(this.healthBarFill);

        this.group.add(this.healthBarGroup);
    }

    getGroundHeight(x, z) {
        const bx = Math.floor(x);
        const bz = Math.floor(z);
        for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
            const block = this.world.getBlock(bx, y, bz);
            if (block === 5) continue; // Skip tree leaves so we don't spawn/walk on top of leaves
            if (this.world.isSolid(bx, y, bz)) {
                return y + 1;
            }
        }
        return 10;
    }

    snapToGround() {
        this.position.y = this.getGroundHeight(this.position.x, this.position.z);
        this.group.position.copy(this.position);
    }

    // Called when the player clicks on the animal while holding an Apple (ID 23)
    interactWithApple() {
        this.isTamed = true;
        this.spawnHeartParticles();
        console.log(`[Animal] ${this.type} został nakarmiony jabłkiem! Pojawiły się serca ❤️`);
    }

    flashRed() {
        const mats = new Set();
        this.group.traverse((child) => {
            if (child.isMesh && child.material && child.material.color) {
                mats.add(child.material);
            }
        });
        for (const mat of mats) {
            if (!mat._origColor) {
                mat._origColor = mat.color.clone();
            }
            mat.color.setHex(0xef4444);
        }
        setTimeout(() => {
            if (this.isDead) return;
            for (const mat of mats) {
                if (mat._origColor) {
                    mat.color.copy(mat._origColor);
                }
            }
        }, 180);
    }

    onAttacked(damage = 2, attackerPos = null) {
        if (this.isDead) return;
        this.health -= damage;
        this.flashRed();

        // Knockback away from attacker
        if (attackerPos) {
            const kb = this.position.clone().sub(attackerPos).setY(0);
            if (kb.lengthSq() > 0.001) {
                kb.normalize();
                this.position.addScaledVector(kb, 0.7);
            }
        }
        this.position.y += 0.2;

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

        // Drop Bones (ID 27) and Arrows (ID 28) if skeleton
        if (this.type === 'skeleton' && this.manager && this.manager.drops) {
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

        // Zombie & Skeleton logic: Hostile AI & Daylight Burning
        if (this.type === 'zombie' || this.type === 'skeleton') {
            if (this.attackCooldown > 0) this.attackCooldown -= dt;
            if (this.shootCooldown > 0) this.shootCooldown -= dt;

            // Daytime burning in direct sunlight (only if exposed and WITHOUT helmet)
            if (isDay && !this.isDead && !this.hasHelmet) {
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
                    if (this.burnTimer >= 2.5) {
                        this.burnTimer = 0;
                        this.flashRed();
                        this.onAttacked(1); // 1 damage per 2.5s
                    }
                }
            }

            // Target player
            if (playerPosition && !this.isDead) {
                const distToPlayer = this.position.distanceTo(playerPosition);
                if (distToPlayer < 24.0) {
                    this.targetRotationY = Math.atan2(playerPosition.x - this.position.x, playerPosition.z - this.position.z);

                    if (this.type === 'zombie') {
                        if (distToPlayer <= 1.4) {
                            this.state = 'idle';
                            // Melee attack player
                            if (this.attackCooldown <= 0) {
                                this.attackCooldown = 1.2;
                                if (this.manager && this.manager.survival) {
                                    this.manager.survival.takeDamage(2, 'Zombie');
                                    if (this.manager.ui) this.manager.ui.showPopup("⚠️ Zombie Cię zaatakował! (-1 serce)");
                                }
                            }
                        } else {
                            this.state = 'walk';
                        }
                    } else if (this.type === 'skeleton') {
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
                }
            }

            // Update 3D Floating Health Bar
            if (this.healthBarGroup && playerPosition) {
                const angleToPlayer = Math.atan2(playerPosition.x - this.position.x, playerPosition.z - this.position.z);
                this.healthBarGroup.rotation.y = -this.rotationY + angleToPlayer + Math.PI;

                const hpRatio = Math.max(0, this.health / this.maxHealth);
                this.healthBarFill.scale.x = hpRatio;
                this.healthBarFill.position.x = -0.35 * (1 - hpRatio);

                if (hpRatio < 0.35) {
                    this.barFillMat.color.setHex(0xef4444); // Red
                } else if (hpRatio < 0.65) {
                    this.barFillMat.color.setHex(0xeab308); // Yellow
                } else {
                    this.barFillMat.color.setHex(0x22c55e); // Green
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
                // Ground check at target position
                const groundAtTarget = this.getGroundHeight(nextX, nextZ);
                const heightDiff = groundAtTarget - this.position.y;

                if (heightDiff > 1.15) {
                    // Blocked by tall wall - slide slightly
                    this.targetRotationY += (Math.random() < 0.5 ? 0.75 : -0.75);
                } else {
                    this.position.x = nextX;
                    this.position.z = nextZ;
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
        } else if (this.state === 'walk_back') {
            this.animTime += dt * 8.0;

            // Move backward away from target
            const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
            const nextX = this.position.x - fwd.x * (this.walkSpeed * 0.85) * dt;
            const nextZ = this.position.z - fwd.z * (this.walkSpeed * 0.85) * dt;

            if (nextX >= 2 && nextX <= WORLD_SIZE_X - 2 && nextZ >= 2 && nextZ <= WORLD_SIZE_Z - 2) {
                const groundAtTarget = this.getGroundHeight(nextX, nextZ);
                const heightDiff = groundAtTarget - this.position.y;
                if (Math.abs(heightDiff) <= 1.15) {
                    this.position.x = nextX;
                    this.position.z = nextZ;
                }
            }

            if (this.legs.length === 2) {
                const swing = Math.sin(this.animTime) * 0.65;
                this.legs[0].rotation.x = -swing;
                this.legs[1].rotation.x = swing;
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

        // Maintain solid footing on terrain
        const targetGroundY = this.getGroundHeight(this.position.x, this.position.z);
        if (this.position.y < targetGroundY) {
            this.position.y = targetGroundY;
        } else if (this.position.y > targetGroundY + 0.05) {
            this.position.y = Math.max(targetGroundY, this.position.y - dt * 10.0);
        } else {
            this.position.y = targetGroundY;
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
        this.arrows = [];

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

        // 3. POCZĄTKOWY ZOMBIE (wprost przed oczami gracza z kamiennym hełmem chroniącym przed słońcem)
        if (this.player && this.player.position) {
            this.spawnZombieInFrontOfPlayer(this.player, 5.0, true);
        } else {
            const initialZombie = new Animal(this.scene, this.world, 'zombie', 32, 27, this, false, true);
            this.animals.push(initialZombie);
        }

        // 4. POCZĄTKOWY SZKIELET (w zasięgu wzroku gracza z łukiem i kamiennym hełmem)
        if (this.player && this.player.position) {
            this.spawnSkeletonInFrontOfPlayer(this.player, 7.5, true);
        } else {
            const initialSkeleton = new Animal(this.scene, this.world, 'skeleton', 34, 25, this, false, true);
            this.animals.push(initialSkeleton);
        }
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

    spawnZombieInFrontOfPlayer(player = this.player, distance = 5.0, hasHelmet = true) {
        if (!player || !player.position) return null;
        let dirX = 0;
        let dirZ = -1;
        if (player.camera) {
            const forward = new THREE.Vector3();
            player.camera.getWorldDirection(forward);
            forward.y = 0;
            if (forward.lengthSq() > 0.01) {
                forward.normalize();
                dirX = forward.x;
                dirZ = forward.z;
            }
        }
        const px = THREE.MathUtils.clamp(player.position.x + dirX * distance, 3, WORLD_SIZE_X - 3);
        const pz = THREE.MathUtils.clamp(player.position.z + dirZ * distance, 3, WORLD_SIZE_Z - 3);
        const zombie = new Animal(this.scene, this.world, 'zombie', px, pz, this, false, hasHelmet);
        this.animals.push(zombie);
        console.log(`[AnimalManager] Zespawnowano Zombie na wprost gracza na (${px.toFixed(1)}, ${pz.toFixed(1)}) z hełmem=${hasHelmet}`);
        return zombie;
    }

    spawnSkeletonInFrontOfPlayer(player = this.player, distance = 7.5, hasHelmet = true) {
        if (!player || !player.position) return null;
        let dirX = 0;
        let dirZ = -1;
        if (player.camera) {
            const forward = new THREE.Vector3();
            player.camera.getWorldDirection(forward);
            forward.y = 0;
            if (forward.lengthSq() > 0.01) {
                forward.normalize();
                dirX = forward.x;
                dirZ = forward.z;
            }
        }
        const px = THREE.MathUtils.clamp(player.position.x + dirX * distance, 3, WORLD_SIZE_X - 3);
        const pz = THREE.MathUtils.clamp(player.position.z + dirZ * distance, 3, WORLD_SIZE_Z - 3);
        const skeleton = new Animal(this.scene, this.world, 'skeleton', px, pz, this, false, hasHelmet);
        this.animals.push(skeleton);
        console.log(`[AnimalManager] Zespawnowano Szkieleta na wprost gracza na (${px.toFixed(1)}, ${pz.toFixed(1)}) z hełmem=${hasHelmet}`);
        return skeleton;
    }

    spawnArrow(origin, direction) {
        const arrow = new FlyingArrow(this.scene, this.world, origin, direction, 'skeleton');
        this.arrows.push(arrow);
        return arrow;
    }

    update(dt, playerPosition = null, isDay = true) {
        // Automatyczne zabijanie nadmiarowych węży (utrzymywanie maksymalnie 1 węża na świecie bez żadnego przycisku)
        const snakes = this.animals.filter(a => a.type === 'snake');
        if (snakes.length > 1) {
            this.killSnakesExceptOne();
        }

        // Zarządzanie populacją Zombie
        const zombieCount = this.animals.filter(a => a.type === 'zombie' && !a.isDead).length;
        this.zombieSpawnTimer = (this.zombieSpawnTimer || 0) + dt;

        // Jeśli na świecie nie ma żadnego Zombie, odlicz chwilę i zespawnuj nowego (w dzień z hełmem, w nocy bez)
        if (zombieCount === 0 && this.zombieSpawnTimer >= 8.0 && playerPosition) {
            this.zombieSpawnTimer = 0;
            const angle = Math.random() * Math.PI * 2;
            const dist = 10 + Math.random() * 5;
            const zx = THREE.MathUtils.clamp(playerPosition.x + Math.cos(angle) * dist, 3, WORLD_SIZE_X - 3);
            const zz = THREE.MathUtils.clamp(playerPosition.z + Math.sin(angle) * dist, 3, WORLD_SIZE_Z - 3);
            const zombie = new Animal(this.scene, this.world, 'zombie', zx, zz, this, false, isDay);
            this.animals.push(zombie);
            console.log(`[Monster] Nowy Zombie pojawił się na (${zx.toFixed(1)}, ${zz.toFixed(1)}) (hełm=${isDay})!`);
        } else if (!isDay && playerPosition && zombieCount < 3 && this.zombieSpawnTimer >= 15.0) {
            // W nocy spawnuje się do 3 Zombie
            this.zombieSpawnTimer = 0;
            const angle = Math.random() * Math.PI * 2;
            const dist = 14 + Math.random() * 8;
            const zx = THREE.MathUtils.clamp(playerPosition.x + Math.cos(angle) * dist, 3, WORLD_SIZE_X - 3);
            const zz = THREE.MathUtils.clamp(playerPosition.z + Math.sin(angle) * dist, 3, WORLD_SIZE_Z - 3);
            const zombie = new Animal(this.scene, this.world, 'zombie', zx, zz, this, false, false);
            this.animals.push(zombie);
            console.log(`[Monster] Nocny Zombie pojawił się na (${zx.toFixed(1)}, ${zz.toFixed(1)})!`);
            if (this.ui) this.ui.showPopup("🧟 W ciemności nocy pojawił się Zombie!");
        }

        // Zarządzanie populacją Szkieletów
        const skeletonCount = this.animals.filter(a => a.type === 'skeleton' && !a.isDead).length;
        this.skeletonSpawnTimer = (this.skeletonSpawnTimer || 0) + dt;

        if (skeletonCount === 0 && this.skeletonSpawnTimer >= 10.0 && playerPosition) {
            this.skeletonSpawnTimer = 0;
            const angle = Math.random() * Math.PI * 2;
            const dist = 12 + Math.random() * 5;
            const sx = THREE.MathUtils.clamp(playerPosition.x + Math.cos(angle) * dist, 3, WORLD_SIZE_X - 3);
            const sz = THREE.MathUtils.clamp(playerPosition.z + Math.sin(angle) * dist, 3, WORLD_SIZE_Z - 3);
            const skeleton = new Animal(this.scene, this.world, 'skeleton', sx, sz, this, false, isDay);
            this.animals.push(skeleton);
            console.log(`[Monster] Nowy Szkielet pojawił się na (${sx.toFixed(1)}, ${sz.toFixed(1)}) (hełm=${isDay})!`);
        } else if (!isDay && playerPosition && skeletonCount < 2 && this.skeletonSpawnTimer >= 18.0) {
            this.skeletonSpawnTimer = 0;
            const angle = Math.random() * Math.PI * 2;
            const dist = 15 + Math.random() * 8;
            const sx = THREE.MathUtils.clamp(playerPosition.x + Math.cos(angle) * dist, 3, WORLD_SIZE_X - 3);
            const sz = THREE.MathUtils.clamp(playerPosition.z + Math.sin(angle) * dist, 3, WORLD_SIZE_Z - 3);
            const skeleton = new Animal(this.scene, this.world, 'skeleton', sx, sz, this, false, false);
            this.animals.push(skeleton);
            console.log(`[Monster] Nocny Szkielet pojawił się na (${sx.toFixed(1)}, ${sz.toFixed(1)})!`);
            if (this.ui) this.ui.showPopup("🏹 W ciemności nocy pojawił się Szkielet z łukiem!");
        }

        // Update all animals
        for (let i = this.animals.length - 1; i >= 0; i--) {
            this.animals[i].update(dt, playerPosition, isDay);
        }

        // Update flying arrows
        for (let i = this.arrows.length - 1; i >= 0; i--) {
            const arrow = this.arrows[i];
            arrow.update(dt, this.player, this.survival, this.ui);
            if (arrow.isDead) {
                this.arrows.splice(i, 1);
            }
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
