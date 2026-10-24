import * as THREE from 'three';
import { BLOCK_DEF, AtlasMaterial, getTileUV } from './textures.js?v=water_2';

// Helper to create a textured mini-cube (0.28 x 0.28 x 0.28)
function createMiniBlockMesh(blockId) {
    const geo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    const def = BLOCK_DEF[blockId] || BLOCK_DEF[2]; // fallback dirt

    // Face mapping: [Right (+X), Left (-X), Top (+Y), Bottom (-Y), Front (+Z), Back (-Z)]
    // In our BLOCK_DEF: [Top(0), Bottom(1), Front(2), Back(3), Left(4), Right(5)]
    const faceTileIndices = [
        def.tiles[5], // Right
        def.tiles[4], // Left
        def.tiles[0], // Top
        def.tiles[1], // Bottom
        def.tiles[2], // Front
        def.tiles[3]  // Back
    ];

    const uvs = [];
    for (let f = 0; f < 6; f++) {
        const tileIdx = faceTileIndices[f];
        const { u0, v0, u1, v1 } = getTileUV(tileIdx);
        // Quad UVs for BoxGeometry
        uvs.push(
            u0, v1,
            u1, v1,
            u0, v0,
            u1, v0
        );
    }

    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    const mesh = new THREE.Mesh(geo, AtlasMaterial);
    mesh.castShadow = true;
    return mesh;
}

// Helper to create a miniature 3D Apple mesh
function createAppleMesh() {
    const group = new THREE.Group();

    // Red Apple body
    const appleGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    const appleMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
    const apple = new THREE.Mesh(appleGeo, appleMat);
    group.add(apple);

    // Green stem / leaf on top
    const stemGeo = new THREE.BoxGeometry(0.04, 0.08, 0.04);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(0, 0.13, 0);
    group.add(stem);

    return group;
}

// Helper to create a miniature 3D square voxel Stick mesh
function createStickMesh() {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(0.045, 0.045, 0.045);
    const lightMat = new THREE.MeshLambertMaterial({ color: 0xaa824a });
    const midMat = new THREE.MeshLambertMaterial({ color: 0x785328 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x4e3518 });

    // 8 stepped square pixel cubes running diagonally
    for (let i = 0; i < 8; i++) {
        const offset = (i - 3.5) * 0.042;
        const mat = (i === 0 || i === 7) ? darkMat : (i % 2 === 0 ? midMat : lightMat);
        const cube = new THREE.Mesh(geo, mat);
        cube.position.set(offset, offset, 0);
        cube.castShadow = true;
        group.add(cube);
    }
    return group;
}

// Helper to create a miniature 3D Rotten Flesh mesh
function createRottenFleshMesh() {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(0.22, 0.08, 0.16);
    const mat = new THREE.MeshLambertMaterial({ color: 0x8b3a2b });
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    group.add(m);

    const decayGeo = new THREE.BoxGeometry(0.1, 0.09, 0.08);
    const decayMat = new THREE.MeshLambertMaterial({ color: 0x3d5a2b });
    const decay = new THREE.Mesh(decayGeo, decayMat);
    decay.position.set(0.04, 0.01, 0);
    group.add(decay);

    return group;
}

function createBoneMesh() {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xe4e4e7 });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.06), mat);
    group.add(shaft);
    const knob1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.08), mat);
    knob1.position.set(0, 0.12, 0);
    const knob2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.08), mat);
    knob2.position.set(0, -0.12, 0);
    group.add(knob1, knob2);
    group.rotation.z = Math.PI / 4;
    return group;
}

function createArrowDropMesh() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
    const tipMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const fletchMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });

    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.03), woodMat);
    group.add(shaft);

    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), tipMat);
    tip.position.set(0, 0.14, 0);
    group.add(tip);

    const fletch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), fletchMat);
    fletch.position.set(0, -0.12, 0);
    group.add(fletch);

    group.rotation.z = Math.PI / 4;
    return group;
}

// Helper to create a glowing 3D Diamond drop mesh
function createDiamondMesh() {
    const group = new THREE.Group();
    const geo = new THREE.OctahedronGeometry(0.14, 0);
    const mat = new THREE.MeshLambertMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.35
    });
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    group.add(m);
    return group;
}

// Helper to create a glowing 3D Ruby drop mesh
function createRubyMesh() {
    const group = new THREE.Group();
    const geo = new THREE.OctahedronGeometry(0.14, 0);
    const mat = new THREE.MeshLambertMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 0.45
    });
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    group.add(m);
    return group;
}

// Helper to create a 3D Gunpowder pouch/pile drop mesh
function createGunpowderMesh() {
    const group = new THREE.Group();
    const bagMat = new THREE.MeshLambertMaterial({ color: 0x374151 });
    const stringMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });

    // Main pouch body
    const baseGeo = new THREE.BoxGeometry(0.18, 0.16, 0.18);
    const base = new THREE.Mesh(baseGeo, bagMat);
    base.castShadow = true;
    group.add(base);

    // Tied neck
    const neckGeo = new THREE.BoxGeometry(0.10, 0.08, 0.10);
    const neck = new THREE.Mesh(neckGeo, bagMat);
    neck.position.y = 0.11;
    group.add(neck);

    // Red fuse/string tie
    const stringGeo = new THREE.BoxGeometry(0.13, 0.03, 0.13);
    const string = new THREE.Mesh(stringGeo, stringMat);
    string.position.y = 0.08;
    group.add(string);

    return group;
}

// Helper to create a 3D Flower drop mesh (miniature flower with stem and petals)
function createFlowerDropMesh(colorHex) {
    const group = new THREE.Group();
    // Green stem
    const stemGeo = new THREE.BoxGeometry(0.04, 0.22, 0.04);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x38a169 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(0, 0, 0);
    group.add(stem);

    // Leaves on stem
    const leafGeo = new THREE.BoxGeometry(0.12, 0.03, 0.04);
    const leaf = new THREE.Mesh(leafGeo, stemMat);
    leaf.position.set(0, -0.03, 0);
    group.add(leaf);

    // Blossom petals
    const blossomGeo = new THREE.BoxGeometry(0.16, 0.12, 0.16);
    const blossomMat = new THREE.MeshLambertMaterial({ color: colorHex });
    const blossom = new THREE.Mesh(blossomGeo, blossomMat);
    blossom.position.set(0, 0.12, 0);
    group.add(blossom);

    return group;
}

// Helper to create a 3D Lily Pad drop mesh (green disk with small lotus blossom)
function createLilyPadDropMesh() {
    const group = new THREE.Group();
    const padGeo = new THREE.BoxGeometry(0.24, 0.03, 0.24);
    const padMat = new THREE.MeshLambertMaterial({ color: 0x2d6a4f });
    const pad = new THREE.Mesh(padGeo, padMat);
    group.add(pad);

    const flowerGeo = new THREE.BoxGeometry(0.08, 0.05, 0.08);
    const flowerMat = new THREE.MeshLambertMaterial({ color: 0xf472b6 });
    const flower = new THREE.Mesh(flowerGeo, flowerMat);
    flower.position.y = 0.035;
    group.add(flower);

    return group;
}

// Helper to create a miniature 3D Raw Porkchop mesh
function createPorkchopMesh() {
    const group = new THREE.Group();
    const meatMat = new THREE.MeshLambertMaterial({ color: 0xef7a7a });
    const fatMat = new THREE.MeshLambertMaterial({ color: 0xffe4e6 });
    const boneMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });

    const meat = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.08, 0.16), meatMat);
    meat.castShadow = true;
    group.add(meat);

    const fat = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.08, 0.04), fatMat);
    fat.position.set(0, 0, 0.07);
    group.add(fat);

    const bone = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), boneMat);
    bone.position.set(-0.11, 0, 0);
    group.add(bone);

    return group;
}

// Helper to create a miniature 3D Raw Mutton mesh
function createMuttonMesh() {
    const group = new THREE.Group();
    const meatMat = new THREE.MeshLambertMaterial({ color: 0xbe123c });
    const boneMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });

    const meat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.14), meatMat);
    meat.castShadow = true;
    group.add(meat);

    const bone = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.08), boneMat);
    bone.position.set(0, 0, -0.09);
    group.add(bone);

    return group;
}

// Helper to create a miniature 3D Raw Beef steak mesh
function createBeefMesh() {
    const group = new THREE.Group();
    const steakMat = new THREE.MeshLambertMaterial({ color: 0xb91c1c });
    const marblingMat = new THREE.MeshLambertMaterial({ color: 0xfecdd3 });

    const steak = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.18), steakMat);
    steak.castShadow = true;
    group.add(steak);

    const streak = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.082, 0.04), marblingMat);
    streak.position.set(0.02, 0, 0.02);
    group.add(streak);

    return group;
}

// Helper to create a miniature 3D Leather drop mesh
function createLeatherMesh() {
    const group = new THREE.Group();
    const leatherMat = new THREE.MeshLambertMaterial({ color: 0x854d0e });
    const pelt = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.20), leatherMat);
    pelt.castShadow = true;
    group.add(pelt);

    const cornerMat = new THREE.MeshLambertMaterial({ color: 0xa16207 });
    const corner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.035, 0.08), cornerMat);
    corner.position.set(0.07, 0, 0.06);
    group.add(corner);

    return group;
}

// Helper to create a miniature 3D White Wool drop mesh
function createWoolMesh() {
    const group = new THREE.Group();
    const woolMat = new THREE.MeshLambertMaterial({ color: 0xf4f4f5 });
    const wool = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), woolMat);
    wool.castShadow = true;
    group.add(wool);
    return group;
}

// Helper to create a miniature 3D Armor drop mesh (chestplate & helm)
function createArmorDropMesh(colorHex) {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: colorHex });
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.12), mat);
    group.add(chest);
    const helm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), mat);
    helm.position.y = 0.18;
    group.add(helm);
    return group;
}

// Helper to create a vibrant 3D Mystery Box drop mesh (golden/purple gift box with ribbon)
function createMysteryBoxMesh() {
    const group = new THREE.Group();
    const boxMat = new THREE.MeshLambertMaterial({ color: 0x9333ea }); // Royal purple
    const ribbonMat = new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0x854d0e }); // Golden ribbon
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), boxMat);
    box.castShadow = true;
    group.add(box);
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.06), ribbonMat);
    group.add(r1);
    const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.25), ribbonMat);
    group.add(r2);
    const bow = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.10), ribbonMat);
    bow.position.y = 0.14;
    group.add(bow);
    return group;
}

// Helper to create a miniature 3D Water Bottle drop mesh

function createWaterBottleMesh() {
    const group = new THREE.Group();
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.75 });
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 });
    const corkMat = new THREE.MeshLambertMaterial({ color: 0xd97706 }); // Wooden cork

    // Bottle body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.20, 0.14), glassMat);
    group.add(body);
    // Water inside
    const water = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 0.12), waterMat);
    water.position.y = -0.02;
    group.add(water);
    // Neck
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), glassMat);
    neck.position.y = 0.13;
    group.add(neck);
    // Cork
    const cork = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.07), corkMat);
    cork.position.y = 0.17;
    group.add(cork);

    return group;
}

// Helper to create a miniature 3D Warm Jacket drop mesh
function createWarmJacketMesh() {
    const group = new THREE.Group();
    const coatMat = new THREE.MeshLambertMaterial({ color: 0xb45309 }); // Warm leather amber
    const furMat = new THREE.MeshLambertMaterial({ color: 0xfef3c7 });  // Fluffy white fur collar

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.14), coatMat);
    group.add(body);
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.16), furMat);
    collar.position.y = 0.13;
    group.add(collar);
    return group;
}

// Helper to create a miniature 3D Laser Sword drop mesh
function createLaserSwordMesh() {
    const group = new THREE.Group();
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const laserMat = new THREE.MeshLambertMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.85
    });

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.04), handleMat);
    group.add(handle);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 0.03), laserMat);
    blade.position.y = 0.28;
    group.add(blade);

    group.rotation.z = Math.PI / 4;
    return group;
}

// Helper to create a miniature 3D Bedrock Sword drop mesh
function createBedrockSwordMesh() {
    const group = new THREE.Group();
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x18181b });
    const bedrockBladeMat = new THREE.MeshLambertMaterial({
        color: 0x27272a,
        emissive: 0x581c87,
        emissiveIntensity: 0.5
    });

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.04), handleMat);
    group.add(handle);
    const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.04), handleMat);
    crossguard.position.y = 0.08;
    group.add(crossguard);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.46, 0.03), bedrockBladeMat);
    blade.position.y = 0.32;
    group.add(blade);

    group.rotation.z = Math.PI / 4;
    return group;
}

// Helper to create a miniature 3D Niebieski Pierwiastek drop mesh (ID 49)
function createBlueElementMesh() {
    const group = new THREE.Group();
    // Glowing cyan crystal cluster
    const coreGeo = new THREE.OctahedronGeometry(0.16, 0);
    const coreMat = new THREE.MeshLambertMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.75
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    const orbitGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
    for (let i = 0; i < 4; i++) {
        const orbit = new THREE.Mesh(orbitGeo, orbitMat);
        const ang = (i / 4) * Math.PI * 2;
        orbit.position.set(Math.cos(ang) * 0.22, Math.sin(ang) * 0.12, Math.sin(ang) * 0.22);
        group.add(orbit);
    }
    return group;
}

// Helper to create a miniature 3D Magiczna Różdżka drop mesh (ID 50)
function createMagicWandMesh() {
    const group = new THREE.Group();
    // Obsidian / Bedrock shaft
    const shaftMat = new THREE.MeshLambertMaterial({ color: 0x18181b });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.44, 0.035), shaftMat);
    group.add(shaft);

    // Gold collar ring
    const goldMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
    const ring = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.06), goldMat);
    ring.position.y = 0.18;
    group.add(ring);

    // Glowing cyan magic orb on top
    const orbMat = new THREE.MeshLambertMaterial({
        color: 0x38bdf8,
        emissive: 0x7c3aed,
        emissiveIntensity: 0.8
    });
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), orbMat);
    orb.position.y = 0.26;
    group.add(orb);

    group.rotation.z = Math.PI / 4;
    return group;
}

// Helper to create a miniature 3D Krzesiwo drop mesh (ID 52)
function createFlintAndSteelMesh() {
    const group = new THREE.Group();
    // Steel striker arc
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const striker = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.16), steelMat);
    striker.position.set(-0.04, 0, 0);
    group.add(striker);

    // Dark Flint piece
    const flintMat = new THREE.MeshLambertMaterial({ color: 0x27272a });
    const flint = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), flintMat);
    flint.position.set(0.06, -0.02, 0);
    group.add(flint);

    // Tiny glowing orange spark
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const spark = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), sparkMat);
    spark.position.set(0.02, 0.08, 0.04);
    group.add(spark);

    group.rotation.z = Math.PI / 6;
    return group;
}

export class DroppedItem {



    constructor(scene, world, id, name, x, y, z) {
        this.scene = scene;
        this.world = world;
        this.id = id;
        this.name = name;

        this.position = new THREE.Vector3(x, y, z);
        
        // Apples falling from trees fall DOWNWARDS (-Y); normal mined blocks have a tiny pop
        if (this.id === 23) {
            this.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.8,
                -0.8 - Math.random() * 0.4,
                (Math.random() - 0.5) * 0.8
            );
        } else {
            this.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 1.2,
                1.2 + Math.random() * 0.4,
                (Math.random() - 0.5) * 1.2
            );
        }

        this.onGround = false;
        this.lifespan = 60.0; // 1 minute (60 seconds)
        this.timeAlive = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.baseGroundY = y;

        if (this.id === 17) {
            this.mesh = createFlowerDropMesh(0xef4444); // Red Rose
        } else if (this.id === 18) {
            this.mesh = createFlowerDropMesh(0xfbbf24); // Yellow Dandelion
        } else if (this.id === 19) {
            this.mesh = createLilyPadDropMesh(); // Lily Pad
        } else if (this.id === 23) {
            this.mesh = createAppleMesh();
        } else if (this.id === 20) {
            this.mesh = createStickMesh();
        } else if (this.id === 26) {
            this.mesh = createRottenFleshMesh();
        } else if (this.id === 27) {
            this.mesh = createBoneMesh();
        } else if (this.id === 28) {
            this.mesh = createArrowDropMesh();
        } else if (this.id === 30) {
            this.mesh = createDiamondMesh();
        } else if (this.id === 32) {
            this.mesh = createArmorDropMesh(0x38bdf8);
        } else if (this.id === 34) {
            this.mesh = createRubyMesh();
        } else if (this.id === 36) {
            this.mesh = createGunpowderMesh();
        } else if (this.id === 37) {
            this.mesh = createArmorDropMesh(0xef4444);
        } else if (this.id === 38) {
            this.mesh = createPorkchopMesh();
        } else if (this.id === 39) {
            this.mesh = createMuttonMesh();
        } else if (this.id === 40) {
            this.mesh = createBeefMesh();
        } else if (this.id === 41) {
            this.mesh = createLeatherMesh();
        } else if (this.id === 42) {
            this.mesh = createWoolMesh();
        } else if (this.id === 43) {
            this.mesh = createArmorDropMesh(0x78716c);
        } else if (this.id === 44) {
            this.mesh = createMysteryBoxMesh();
        } else if (this.id === 45) {
            this.mesh = createWaterBottleMesh();
        } else if (this.id === 46) {
            this.mesh = createWarmJacketMesh();
        } else if (this.id === 47) {
            this.mesh = createLaserSwordMesh();
        } else if (this.id === 48) {
            this.mesh = createBedrockSwordMesh();
        } else if (this.id === 49) {
            this.mesh = createBlueElementMesh();
        } else if (this.id === 50) {
            this.mesh = createMagicWandMesh();
        } else if (this.id === 52) {
            this.mesh = createFlintAndSteelMesh();
        } else {
            this.mesh = createMiniBlockMesh(this.id);
        }




        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    update(dt, playerPosition, onCollect) {
        this.timeAlive += dt;
        this.lifespan -= dt;

        if (this.lifespan <= 0) {
            this.destroy();
            return false; // Despawn
        }

        // Target point around player waist/chest
        const playerTarget = playerPosition.clone().add(new THREE.Vector3(0, 0.7, 0));
        const dist = this.position.distanceTo(playerTarget);

        // 1. Pickup collection (within 1.25m of player)
        if (dist <= 1.25) {
            onCollect(this.id, this.name);
            this.destroy();
            return false;
        }

        // 2. Magnetic attraction towards player when nearby (< 2.8m)
        let beingPulled = false;
        if (dist < 2.8) {
            beingPulled = true;
            this.onGround = false;
            const pullDir = playerTarget.clone().sub(this.position).normalize();
            this.position.addScaledVector(pullDir, 9.0 * dt);
            this.mesh.position.copy(this.position);
        }

        // 3. Falling & Ground physics when not pulled by magnet
        if (!beingPulled) {
            if (!this.onGround) {
                this.velocity.y -= 16.0 * dt; // gravity
                this.velocity.x *= 0.95;
                this.velocity.z *= 0.95;
                this.position.x += this.velocity.x * dt;
                this.position.z += this.velocity.z * dt;
                this.position.y += this.velocity.y * dt;

                // Ground collision: ONLY check when falling downwards!
                if (this.velocity.y <= 0) {
                    const checkX = Math.floor(this.position.x);
                    const checkY = Math.floor(this.position.y);
                    const checkZ = Math.floor(this.position.z);
                    const blockBelow = this.world.getBlock(checkX, checkY, checkZ);

                    // Drops fall through air (0), leaves (5), and water (10)
                    const isSolidGround = (blockBelow !== 0 && blockBelow !== 5 && blockBelow !== 10 && this.world.isSolid(checkX, checkY, checkZ));

                    if (isSolidGround || checkY <= 0) {
                        this.onGround = true;
                        this.baseGroundY = Math.max(0, checkY) + 1.0;
                        this.position.y = this.baseGroundY + 0.14;
                        this.velocity.set(0, 0, 0);
                    }
                }

                this.mesh.position.copy(this.position);
                this.mesh.rotation.x += 3.5 * dt;
                this.mesh.rotation.y += 3.0 * dt;
            } else {
                // Check if ground block below was destroyed
                const checkX = Math.floor(this.position.x);
                const checkGroundY = Math.floor(this.baseGroundY - 0.5);
                const checkZ = Math.floor(this.position.z);
                if (!this.world.isSolid(checkX, checkGroundY, checkZ) && this.baseGroundY > 1) {
                    this.onGround = false;
                } else {
                    this.mesh.rotation.x = 0;
                    this.mesh.rotation.z = 0;
                    this.mesh.rotation.y += 2.0 * dt;
                    const bob = Math.sin(this.timeAlive * 3.5 + this.bobOffset) * 0.04;
                    this.mesh.position.set(this.position.x, this.baseGroundY + 0.14 + bob, this.position.z);
                }
            }
        }

        return true;
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
    }
}

export class DropsManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.items = [];
    }

    add(item) {
        if (item) {
            this.items.push(item);
        }
    }

    // Called when a block is mined or exploded
    spawn(x, y, z, blockId) {
        return this.spawnBlockDrop(x, y, z, blockId);
    }

    spawnBlockDrop(x, y, z, blockId) {
        // Water (10), Bedrock (14), Air (0) don't drop
        if (blockId === 0 || blockId === 10 || blockId === 14) return;

        // 1. Leaves (5): DO NOT drop block, but 40% chance to drop Apple (23)!
        if (blockId === 5) {
            if (Math.random() < 0.4) {
                const drop = new DroppedItem(this.scene, this.world, 23, 'Jabłko', x + 0.5, y + 0.5, z + 0.5);
                this.items.push(drop);
                console.log("[Drops] Wypadło Jabłko z liści!");
            }
            return;
        }

        // 2. Normal solid blocks drop a mini-block
        let dropId = blockId;
        let dropName = BLOCK_DEF[blockId]?.name || 'Blok';

        // Authentic drops:
        // Grass (1) drops Dirt (2)
        if (blockId === 1) {
            dropId = 2;
            dropName = 'Ziemia';
        }
        // Stone (3) drops Stone (3) - remains the exact same realistic stone
        else if (blockId === 3) {
            dropId = 3;
            dropName = 'Kamień';
        }
        // Diamond Ore (15) drops glowing Diamond (30)!
        else if (blockId === 15) {
            dropId = 30;
            dropName = 'Diament';
        }
        // Ruby Ore (16) drops glowing Ruby (34)!
        else if (blockId === 16) {
            dropId = 34;
            dropName = 'Rubin';
        }
        // Gunpowder (36)
        else if (blockId === 36) {
            dropId = 36;
            dropName = 'Proch Strzelniczy';
        }
        // Red Rose (17) drops Red Rose
        else if (blockId === 17) {
            dropId = 17;
            dropName = 'Czerwona Róża';
        }
        // Yellow Dandelion (18) drops Yellow Dandelion
        else if (blockId === 18) {
            dropId = 18;
            dropName = 'Żółty Mlecz';
        }
        // Lily Pad (19) drops Lily Pad
        else if (blockId === 19) {
            dropId = 19;
            dropName = 'Lilia Wodna';
        }

        const drop = new DroppedItem(this.scene, this.world, dropId, dropName, x + 0.5, y + 0.5, z + 0.5);
        this.items.push(drop);
        console.log(`[Drops] Wypadł minibloczek: ${dropName} (ID: ${dropId})`);
    }

    update(dt, playerPosition, onCollect) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const alive = this.items[i].update(dt, playerPosition, onCollect);
            if (!alive) {
                this.items.splice(i, 1);
            }
        }
    }

    clear() {
        for (const item of this.items) {
            item.destroy();
        }
        this.items = [];
    }
}
