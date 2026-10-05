import * as THREE from 'three';
import { BLOCK_DEF, AtlasMaterial, getTileUV } from './textures.js';

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

export class DroppedItem {
    constructor(scene, world, id, name, x, y, z) {
        this.scene = scene;
        this.world = world;
        this.id = id;
        this.name = name;

        this.position = new THREE.Vector3(x, y, z);
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2.0,
            2.2 + Math.random() * 0.8,
            (Math.random() - 0.5) * 2.0
        );

        this.onGround = false;
        this.lifespan = 60.0; // 1 minute (60 seconds)
        this.timeAlive = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.baseGroundY = y;

        if (this.id === 23) {
            this.mesh = createAppleMesh();
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

        // Falling physics until ground contact
        if (!this.onGround) {
            this.velocity.y -= 14.0 * dt;
            this.position.x += this.velocity.x * dt;
            this.position.z += this.velocity.z * dt;
            this.position.y += this.velocity.y * dt;

            // Check voxel ground collision
            const bx = Math.floor(this.position.x);
            const by = Math.floor(this.position.y);
            const bz = Math.floor(this.position.z);

            if (this.world.isSolid(bx, by, bz) || by <= 0) {
                this.onGround = true;
                this.baseGroundY = by + 1.0;
                this.position.y = this.baseGroundY + 0.14;
                this.velocity.set(0, 0, 0);
            }
        } else {
            // Floating & Spinning animation
            this.mesh.rotation.y += 2.2 * dt;
            const bob = Math.sin(this.timeAlive * 3.5 + this.bobOffset) * 0.05;
            this.mesh.position.y = this.baseGroundY + 0.16 + bob;
        }

        this.mesh.position.x = this.position.x;
        this.mesh.position.z = this.position.z;

        // Player proximity and pickup check
        // Player center is around position.y + 0.9
        const playerCenter = playerPosition.clone().add(new THREE.Vector3(0, 0.9, 0));
        const dist = this.mesh.position.distanceTo(playerCenter);

        // Attraction / Magnet within 2.2 units
        if (dist < 2.2 && dist > 0.45) {
            const pullDir = playerCenter.clone().sub(this.mesh.position).normalize();
            this.position.addScaledVector(pullDir, 7.5 * dt);
            this.mesh.position.copy(this.position);
        }

        // Collected within 0.55 units
        if (dist <= 0.55) {
            onCollect(this.id, this.name);
            this.destroy();
            return false;
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

    // Called when a block is mined
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
        // Stone (3) drops Cobblestone (15)
        else if (blockId === 3) {
            dropId = 15;
            dropName = 'Bruk';
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
