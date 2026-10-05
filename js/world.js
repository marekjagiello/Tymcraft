import * as THREE from 'three';
import { SimplexNoise } from './simplex-noise.js';
import { BLOCK_DEF, AtlasMaterial, getTileUV } from './textures.js';

export const CHUNK_SIZE = 16;
export const CHUNKS_X = 4;
export const CHUNKS_Z = 4;
export const WORLD_SIZE_X = CHUNKS_X * CHUNK_SIZE; // 64
export const WORLD_SIZE_Z = CHUNKS_Z * CHUNK_SIZE; // 64
export const WORLD_HEIGHT = 32;
export const SEA_LEVEL = 6;

export class World {
    constructor(scene, seed = 4242, storageManager = null) {
        this.scene = scene;
        this.seed = seed;
        this.storage = storageManager;
        this.noise = new SimplexNoise(seed);
        this.biomeNoise = new SimplexNoise(seed + 9999);

        // 3D Voxel Array: index = x + z * WORLD_SIZE_X + y * WORLD_SIZE_X * WORLD_SIZE_Z
        this.voxels = new Uint8Array(WORLD_SIZE_X * WORLD_SIZE_Z * WORLD_HEIGHT);

        // Chunks map: key = `${cx},${cz}`, value = { mesh, dirty }
        this.chunks = new Map();

        this.generateWorld();
        this.applyStorageDelta();
        this.buildAllChunks();
    }

    applyStorageDelta() {
        if (!this.storage) return;
        const delta = this.storage.loadBlockDelta();
        const entries = Object.entries(delta);
        if (entries.length > 0) {
            console.log(`[World] Applying ${entries.length} saved block modifications from localStorage.`);
            for (const [coord, blockId] of entries) {
                const [x, y, z] = coord.split(',').map(Number);
                const idx = this.getIndex(x, y, z);
                if (idx !== -1) {
                    this.voxels[idx] = blockId;
                }
            }
        }
    }

    getIndex(x, y, z) {
        if (x < 0 || x >= WORLD_SIZE_X || y < 0 || y >= WORLD_HEIGHT || z < 0 || z >= WORLD_SIZE_Z) {
            return -1;
        }
        return x + z * WORLD_SIZE_X + y * WORLD_SIZE_X * WORLD_SIZE_Z;
    }

    getBlock(x, y, z) {
        const idx = this.getIndex(x, y, z);
        return idx === -1 ? 0 : this.voxels[idx];
    }

    setBlock(x, y, z, id) {
        const idx = this.getIndex(x, y, z);
        if (idx === -1) return false;

        this.voxels[idx] = id;
        if (this.storage) {
            this.storage.saveBlock(x, y, z, id);
        }

        // Mark current chunk dirty
        const cx = Math.floor(x / CHUNK_SIZE);
        const cz = Math.floor(z / CHUNK_SIZE);
        this.markChunkDirty(cx, cz);

        // If on chunk borders, mark adjacent chunks dirty too
        if (x % CHUNK_SIZE === 0 && cx > 0) this.markChunkDirty(cx - 1, cz);
        if (x % CHUNK_SIZE === CHUNK_SIZE - 1 && cx < CHUNKS_X - 1) this.markChunkDirty(cx + 1, cz);
        if (z % CHUNK_SIZE === 0 && cz > 0) this.markChunkDirty(cx, cz - 1);
        if (z % CHUNK_SIZE === CHUNK_SIZE - 1 && cz < CHUNKS_Z - 1) this.markChunkDirty(cx, cz + 1);

        return true;
    }

    markChunkDirty(cx, cz) {
        const key = `${cx},${cz}`;
        const chunk = this.chunks.get(key);
        if (chunk) {
            chunk.dirty = true;
        }
    }

    isSolid(x, y, z) {
        const b = this.getBlock(x, y, z);
        return BLOCK_DEF[b]?.solid ?? false;
    }

    isTransparent(x, y, z) {
        const b = this.getBlock(x, y, z);
        return BLOCK_DEF[b]?.transparent ?? true;
    }

    getBiome(x, z) {
        const scale = 0.02;
        const temp = this.biomeNoise.noise2D(x * scale, z * scale);
        const moisture = this.biomeNoise.noise2D((x + 200) * scale, (z + 200) * scale);

        if (temp > 0.15 && moisture < 0.05) return 'Desert';
        if (temp < -0.2) return 'Mountains';
        if (moisture > 0.15) return 'Forest';
        return 'Plains';
    }

    // World Procedural Generation
    generateWorld() {
        // Bedrock layer at bottom
        for (let x = 0; x < WORLD_SIZE_X; x++) {
            for (let z = 0; z < WORLD_SIZE_Z; z++) {
                this.voxels[this.getIndex(x, 0, z)] = 14; // Bedrock
            }
        }

        // Generate heightmap and biomes
        const treesToPlant = [];
        const cactiToPlant = [];

        for (let x = 0; x < WORLD_SIZE_X; x++) {
            for (let z = 0; z < WORLD_SIZE_Z; z++) {
                const biome = this.getBiome(x, z);

                // Multi-octave elevation
                let h = 0;
                if (biome === 'Desert') {
                    h = 7 + Math.floor(this.noise.fbm2D(x * 0.03, z * 0.03, 3) * 3);
                } else if (biome === 'Mountains') {
                    const rawH = this.noise.fbm2D(x * 0.035, z * 0.035, 4);
                    h = 13 + Math.floor(rawH * 11);
                } else if (biome === 'Forest') {
                    h = 9 + Math.floor(this.noise.fbm2D(x * 0.04, z * 0.04, 3) * 4);
                } else { // Plains
                    h = 8 + Math.floor(this.noise.fbm2D(x * 0.035, z * 0.035, 3) * 3);
                }

                h = Math.max(2, Math.min(WORLD_HEIGHT - 6, h));

                // Fill layers
                for (let y = 1; y <= h; y++) {
                    const idx = this.getIndex(x, y, z);

                    if (y === h) {
                        // Surface
                        if (biome === 'Desert') {
                            this.voxels[idx] = 6; // Sand
                        } else if (biome === 'Mountains') {
                            this.voxels[idx] = (y >= 17) ? 7 : (y >= 14 ? 3 : 1); // Snow, Stone, or Grass
                        } else {
                            this.voxels[idx] = 1; // Grass
                        }
                    } else if (y >= h - 3) {
                        // Subsurface
                        if (biome === 'Desert') {
                            this.voxels[idx] = 6; // Sand
                        } else if (biome === 'Mountains' && y >= 14) {
                            this.voxels[idx] = 3; // Stone
                        } else {
                            this.voxels[idx] = 2; // Dirt
                        }
                    } else {
                        // Deep rock
                        this.voxels[idx] = 3; // Stone
                    }
                }

                // Water fill up to SEA_LEVEL
                for (let y = h + 1; y <= SEA_LEVEL; y++) {
                    this.voxels[this.getIndex(x, y, z)] = 10; // Water
                }

                // Trees / Flora placement
                if (h > SEA_LEVEL) {
                    if (biome === 'Forest' && (x % 4 === 1) && (z % 4 === 2) && Math.random() < 0.75) {
                        treesToPlant.push({ x, y: h + 1, z });
                    } else if (biome === 'Plains' && (x % 7 === 3) && (z % 7 === 4) && Math.random() < 0.5) {
                        treesToPlant.push({ x, y: h + 1, z });
                    } else if (biome === 'Desert' && (x % 6 === 2) && (z % 6 === 3) && Math.random() < 0.4) {
                        cactiToPlant.push({ x, y: h + 1, z });
                    }
                }
            }
        }

        // Plant Trees
        for (const t of treesToPlant) {
            this.plantTree(t.x, t.y, t.z);
        }

        // Plant Cacti
        for (const c of cactiToPlant) {
            this.plantCactus(c.x, c.y, c.z);
        }
    }

    plantTree(x, startY, z) {
        const height = 4 + Math.floor(Math.random() * 2);
        if (startY + height + 2 >= WORLD_HEIGHT) return;

        // Wood trunk
        for (let y = 0; y < height; y++) {
            this.voxels[this.getIndex(x, startY + y, z)] = 4; // Wood
        }

        // Leaves canopy
        const leafBottom = startY + height - 2;
        const leafTop = startY + height + 1;

        for (let ly = leafBottom; ly <= leafTop; ly++) {
            const radius = (ly >= leafTop) ? 1 : 2;
            for (let lx = -radius; lx <= radius; lx++) {
                for (let lz = -radius; lz <= radius; lz++) {
                    if (Math.abs(lx) === radius && Math.abs(lz) === radius && Math.random() < 0.4) continue;
                    const curX = x + lx;
                    const curZ = z + lz;
                    if (curX >= 0 && curX < WORLD_SIZE_X && curZ >= 0 && curZ < WORLD_SIZE_Z) {
                        const idx = this.getIndex(curX, ly, curZ);
                        if (this.voxels[idx] === 0) {
                            this.voxels[idx] = 5; // Leaves
                        }
                    }
                }
            }
        }
    }

    plantCactus(x, startY, z) {
        const height = 2 + Math.floor(Math.random() * 2);
        for (let y = 0; y < height; y++) {
            if (startY + y < WORLD_HEIGHT) {
                this.voxels[this.getIndex(x, startY + y, z)] = 11; // Cactus
            }
        }
    }

    // Build all chunk meshes
    buildAllChunks() {
        for (let cx = 0; cx < CHUNKS_X; cx++) {
            for (let cz = 0; cz < CHUNKS_Z; cz++) {
                this.buildChunk(cx, cz);
            }
        }
    }

    // Build or rebuild single chunk mesh
    buildChunk(cx, cz) {
        const key = `${cx},${cz}`;
        let chunk = this.chunks.get(key);

        if (!chunk) {
            chunk = { mesh: null, dirty: false };
            this.chunks.set(key, chunk);
        }

        if (chunk.mesh) {
            this.scene.remove(chunk.mesh);
            chunk.mesh.geometry.dispose();
            chunk.mesh = null;
        }

        const startX = cx * CHUNK_SIZE;
        const startZ = cz * CHUNK_SIZE;
        const endX = startX + CHUNK_SIZE;
        const endZ = startZ + CHUNK_SIZE;

        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        let vertexCount = 0;

        // Quad Face definitions: [Top(+Y), Bottom(-Y), Front(+Z), Back(-Z), Left(-X), Right(+X)]
        const FACE_DIRS = [
            { dir: [0, 1, 0], faceIdx: 0, corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
            { dir: [0, -1, 0], faceIdx: 1, corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
            { dir: [0, 0, 1], faceIdx: 2, corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
            { dir: [0, 0, -1], faceIdx: 3, corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
            { dir: [-1, 0, 0], faceIdx: 4, corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
            { dir: [1, 0, 0], faceIdx: 5, corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] }
        ];

        for (let x = startX; x < endX; x++) {
            for (let z = startZ; z < endZ; z++) {
                for (let y = 0; y < WORLD_HEIGHT; y++) {
                    const blockId = this.getBlock(x, y, z);
                    if (blockId === 0) continue; // Air

                    const def = BLOCK_DEF[blockId];
                    if (!def || !def.tiles) continue;

                    for (const face of FACE_DIRS) {
                        const nx = x + face.dir[0];
                        const ny = y + face.dir[1];
                        const nz = z + face.dir[2];

                        const neighborId = this.getBlock(nx, ny, nz);
                        const neighborDef = BLOCK_DEF[neighborId];

                        // Face culling condition: render face if neighbor is transparent or air
                        // Don't render internal water or glass faces if neighbor is same
                        const renderFace = (neighborId === 0) ||
                            (neighborDef?.transparent && (neighborId !== blockId || blockId === 5)); // Leaves still show internal

                        if (renderFace) {
                            const tileIndex = def.tiles[face.faceIdx];
                            const { u0, v0, u1, v1 } = getTileUV(tileIndex);

                            // 4 Vertices
                            for (let c = 0; c < 4; c++) {
                                const corner = face.corners[c];
                                positions.push(x + corner[0], y + corner[1], z + corner[2]);
                                normals.push(face.dir[0], face.dir[1], face.dir[2]);
                            }

                            // UVs: [0,0], [1,0], [1,1], [0,1]
                            uvs.push(
                                u0, v0,
                                u1, v0,
                                u1, v1,
                                u0, v1
                            );

                            // Two triangles per quad
                            indices.push(
                                vertexCount, vertexCount + 1, vertexCount + 2,
                                vertexCount, vertexCount + 2, vertexCount + 3
                            );

                            vertexCount += 4;
                        }
                    }
                }
            }
        }

        if (positions.length > 0) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geometry.setIndex(indices);

            const mesh = new THREE.Mesh(geometry, AtlasMaterial);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            chunk.mesh = mesh;
        }

        chunk.dirty = false;
    }

    // Called once per frame to update any chunk modified by player
    update() {
        for (const [key, chunk] of this.chunks.entries()) {
            if (chunk.dirty) {
                const [cx, cz] = key.split(',').map(Number);
                this.buildChunk(cx, cz);
            }
        }
    }
}
