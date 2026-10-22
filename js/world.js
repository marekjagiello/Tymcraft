import * as THREE from 'three';
import { SimplexNoise } from './simplex-noise.js?v=world_gen4';
import { BLOCK_DEF, AtlasMaterial, getTileUV } from './textures.js?v=world_gen4';

export const CHUNK_SIZE = 16;
export const CHUNKS_X = 4;
export const CHUNKS_Z = 4;
export const WORLD_SIZE_X = CHUNKS_X * CHUNK_SIZE; // 64 (spawn reference)
export const WORLD_SIZE_Z = CHUNKS_Z * CHUNK_SIZE; // 64 (spawn reference)
export const WORLD_HEIGHT = 32;
export const SEA_LEVEL = 6;
export const RENDER_RADIUS = 4; // 9x9 chunks around player

export class World {
    constructor(scene, seed = 4242, storageManager = null) {
        this.scene = scene;
        this.seed = seed;
        this.storage = storageManager;

        // Procedural noise generators
        this.noise = new SimplexNoise(seed);
        this.biomeNoise = new SimplexNoise(seed + 9999);
        this.caveNoise = new SimplexNoise(seed + 55555);
        this.treeNoise = new SimplexNoise(seed + 77777);

        // Dynamic Chunks Map: key = `${cx},${cz}`, value = { cx, cz, voxels, mesh, dirty, generated }
        this.chunks = new Map();

        // Queue for progressive background chunk meshing
        this.chunkBuildQueue = [];
        this.lastPlayerChunk = { cx: null, cz: null };

        // Fast synchronous initialization of 5x5 spawn area (cx = 0..4, cz = 0..4)
        const spawnCx = 2;
        const spawnCz = 2;
        const INIT_RADIUS = 2;

        // Step 1: Pre-generate voxels for spawn and surrounding area
        for (let cx = spawnCx - INIT_RADIUS - 1; cx <= spawnCx + INIT_RADIUS + 1; cx++) {
            for (let cz = spawnCz - INIT_RADIUS - 1; cz <= spawnCz + INIT_RADIUS + 1; cz++) {
                this.getOrCreateChunk(cx, cz);
            }
        }

        // Step 2: Mesh initial area
        for (let cx = spawnCx - INIT_RADIUS; cx <= spawnCx + INIT_RADIUS; cx++) {
            for (let cz = spawnCz - INIT_RADIUS; cz <= spawnCz + INIT_RADIUS; cz++) {
                this.buildChunk(cx, cz);
            }
        }
    }

    localIndex(lx, y, lz) {
        return lx + lz * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
    }

    getChunkKey(cx, cz) {
        return `${cx},${cz}`;
    }

    getOrCreateChunk(cx, cz) {
        const key = this.getChunkKey(cx, cz);
        let chunk = this.chunks.get(key);
        if (!chunk) {
            chunk = {
                cx,
                cz,
                voxels: new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT),
                mesh: null,
                dirty: false,
                generated: false
            };
            this.chunks.set(key, chunk);
            this.generateChunk(chunk);
        } else if (!chunk.generated) {
            this.generateChunk(chunk);
        }
        return chunk;
    }

    applyChunkStorageDelta(chunk) {
        if (!this.storage || !this.storage.blockDelta) return;
        const startX = chunk.cx * CHUNK_SIZE;
        const startZ = chunk.cz * CHUNK_SIZE;
        const endX = startX + CHUNK_SIZE;
        const endZ = startZ + CHUNK_SIZE;

        for (const [coord, blockId] of Object.entries(this.storage.blockDelta)) {
            const [x, y, z] = coord.split(',').map(Number);
            if (x >= startX && x < endX && z >= startZ && z < endZ && y >= 0 && y < WORLD_HEIGHT) {
                const lx = x - startX;
                const lz = z - startZ;
                chunk.voxels[this.localIndex(lx, y, lz)] = blockId;
                chunk.hasPlayerBlocks = true;
            }
        }
    }

    getBlock(x, y, z) {
        if (y < 0 || y >= WORLD_HEIGHT) return 0;
        const cx = Math.floor(x / CHUNK_SIZE);
        const cz = Math.floor(z / CHUNK_SIZE);
        const chunk = this.getOrCreateChunk(cx, cz);
        const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        return chunk.voxels[this.localIndex(lx, y, lz)];
    }

    // Fast non-generating read for procedural decorators to prevent recursion
    getBlockFast(x, y, z) {
        if (y < 0 || y >= WORLD_HEIGHT) return 0;
        const cx = Math.floor(x / CHUNK_SIZE);
        const cz = Math.floor(z / CHUNK_SIZE);
        const chunk = this.chunks.get(this.getChunkKey(cx, cz));
        if (!chunk) return 0;
        const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        return chunk.voxels[this.localIndex(lx, y, lz)];
    }

    setBlock(x, y, z, id) {
        if (y < 0 || y >= WORLD_HEIGHT) return false;
        const cx = Math.floor(x / CHUNK_SIZE);
        const cz = Math.floor(z / CHUNK_SIZE);
        const chunk = this.getOrCreateChunk(cx, cz);
        const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

        chunk.voxels[this.localIndex(lx, y, lz)] = id;
        chunk.hasPlayerBlocks = true;
        if (this.storage) {
            this.storage.saveBlock(x, y, z, id);
        }

        chunk.dirty = true;

        // If block is on chunk border, mark neighbor dirty too for seamless face culling
        if (lx === 0) this.markChunkDirty(cx - 1, cz);
        if (lx === CHUNK_SIZE - 1) this.markChunkDirty(cx + 1, cz);
        if (lz === 0) this.markChunkDirty(cx, cz - 1);
        if (lz === CHUNK_SIZE - 1) this.markChunkDirty(cx, cz + 1);

        return true;
    }

    // Fast non-recursive raw block setter for procedural tree placement
    setBlockRaw(x, y, z, id) {
        if (y < 0 || y >= WORLD_HEIGHT) return;
        const cx = Math.floor(x / CHUNK_SIZE);
        const cz = Math.floor(z / CHUNK_SIZE);
        const key = this.getChunkKey(cx, cz);
        let chunk = this.chunks.get(key);
        if (!chunk) {
            chunk = {
                cx,
                cz,
                voxels: new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT),
                mesh: null,
                dirty: false,
                generated: false
            };
            this.chunks.set(key, chunk);
        }
        const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        chunk.voxels[this.localIndex(lx, y, lz)] = id;
    }

    markChunkDirty(cx, cz) {
        const key = this.getChunkKey(cx, cz);
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
        if (temp < -0.22) return 'Mountains';
        if (moisture > 0.12) return 'Forest';
        return 'Plains';
    }

    // Procedural generation of a single chunk (Terrain, Biomes, Underground Caves, Trees)
    generateChunk(chunk) {
        if (chunk.generated) return;
        chunk.generated = true;

        const startX = chunk.cx * CHUNK_SIZE;
        const startZ = chunk.cz * CHUNK_SIZE;
        const treesToPlant = [];
        const cactiToPlant = [];

        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                const x = startX + lx;
                const z = startZ + lz;
                const biome = this.getBiome(x, z);

                // Multi-octave natural elevation
                let h = 0;
                if (biome === 'Desert') {
                    h = 7 + Math.floor(this.noise.fbm2D(x * 0.03, z * 0.03, 3) * 3);
                } else if (biome === 'Mountains') {
                    const rawH = this.noise.fbm2D(x * 0.035, z * 0.035, 4);
                    h = 14 + Math.floor(rawH * 12);
                } else if (biome === 'Forest') {
                    h = 9 + Math.floor(this.noise.fbm2D(x * 0.04, z * 0.04, 3) * 4);
                } else { // Plains
                    h = 8 + Math.floor(this.noise.fbm2D(x * 0.035, z * 0.035, 3) * 3);
                }

                h = Math.max(2, Math.min(WORLD_HEIGHT - 6, h));

                // Bedrock at absolute bottom y = 0, mix at y = 1
                chunk.voxels[this.localIndex(lx, 0, lz)] = 14;
                const isBedrock1 = Math.abs(this.noise.noise2D(x * 0.5, z * 0.5)) > 0.4;
                if (isBedrock1) {
                    chunk.voxels[this.localIndex(lx, 1, lz)] = 14;
                }

                // Fill layers
                for (let y = 1; y <= h; y++) {
                    const lIdx = this.localIndex(lx, y, lz);
                    if (y === 1 && isBedrock1) continue; // Keep bedrock at y=1

                    if (y === h) {
                        // Surface
                        if (biome === 'Desert') {
                            chunk.voxels[lIdx] = 6; // Sand
                        } else if (biome === 'Mountains') {
                            chunk.voxels[lIdx] = (y >= 16) ? 7 : (y >= 13 ? 3 : 1); // Snow, Stone, or Grass
                        } else {
                            chunk.voxels[lIdx] = 1; // Grass
                        }
                    } else if (y >= h - 3) {
                        // Subsurface
                        if (biome === 'Desert') {
                            chunk.voxels[lIdx] = 6; // Sand
                        } else if (biome === 'Mountains' && y >= 13) {
                            chunk.voxels[lIdx] = 3; // Stone
                        } else {
                            chunk.voxels[lIdx] = 2; // Dirt
                        }
                    } else {
                        // Deep rock
                        chunk.voxels[lIdx] = 3; // Stone
                    }
                }

                // Water fill up to SEA_LEVEL
                for (let y = h + 1; y <= SEA_LEVEL; y++) {
                    const lIdx = this.localIndex(lx, y, lz);
                    if (chunk.voxels[lIdx] === 0) {
                        chunk.voxels[lIdx] = 10; // Water
                    }
                }

                // Underground Caves & Surface Entrances ("i pod ziemia czl jaskińe")
                // 3D procedural noise carves natural winding tunnels, chambers and ravines
                const isNearSpawn = (Math.abs(x - 32) <= 8 && Math.abs(z - 32) <= 8);
                for (let y = 2; y <= Math.min(h, WORLD_HEIGHT - 3); y++) {
                    const c1 = this.caveNoise.noise3D(x * 0.045, y * 0.07, z * 0.045);
                    const c2 = this.caveNoise.noise3D((x + 100) * 0.045, (y + 50) * 0.07, (z + 100) * 0.045);
                    const tubeDist = c1 * c1 + c2 * c2;

                    // Continuous 3D cylindrical tunnels (~3-4 blocks wide)
                    const isTunnel = tubeDist < 0.045;

                    // Large cavern rooms
                    const isCavern = c1 > 0.38 && y >= 3 && y <= 16;

                    // Natural cave mouths and ravines breaching surface (large visible tunnels on grass)
                    const isSurfaceOpening = !isNearSpawn && (tubeDist < 0.035) && (y >= h - 4) && (h > SEA_LEVEL + 1);

                    if (isTunnel || isCavern) {
                        if (y <= h - 2 || isSurfaceOpening) {
                            const lIdx = this.localIndex(lx, y, lz);
                            const cur = chunk.voxels[lIdx];
                            if (cur === 3 || cur === 2 || (isSurfaceOpening && (cur === 1 || cur === 6 || cur === 7))) {
                                chunk.voxels[lIdx] = 0; // Air: cave carved out!

                                // Decorate cave floor with Cobblestone (12)
                                if (y > 2) {
                                    const floorIdx = this.localIndex(lx, y - 1, lz);
                                    if (chunk.voxels[floorIdx] === 3 && Math.abs(c2) < 0.25) {
                                        chunk.voxels[floorIdx] = 12; // Cobblestone
                                    }
                                }
                            }
                        }
                    }
                }

                // Diamond Ore generation (mega głęboko pod ziemią, y <= 10, dokładnie 20% szansy)
                for (let y = 2; y <= 10; y++) {
                    const lIdx = this.localIndex(lx, y, lz);
                    if (chunk.voxels[lIdx] === 3) { // Stone
                        const dVein = this.caveNoise.noise3D((x + 777) * 0.18, y * 0.25, (z + 777) * 0.18);
                        if (dVein > 0.48) {
                            const hash = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
                            const prob = hash - Math.floor(hash);
                            if (prob < 0.20) { // Dokładnie 20% szansy na diament
                                chunk.voxels[lIdx] = 15; // Diamond Ore!
                            }
                        }
                    }
                }

                // Ruby Ore generation (mega głęboko tuż nad bedrockiem, y <= 7, dokładnie 10% szansy)
                for (let y = 2; y <= 7; y++) {
                    const lIdx = this.localIndex(lx, y, lz);
                    if (chunk.voxels[lIdx] === 3) { // Stone
                        const rVein = this.caveNoise.noise3D((x + 1337) * 0.19, y * 0.26, (z + 1337) * 0.19);
                        if (rVein > 0.48) {
                            const hash = Math.sin(x * 39.346 + y * 11.135 + z * 83.185) * 43758.5453;
                            const prob = hash - Math.floor(hash);
                            if (prob < 0.10) { // Dokładnie 10% szansy na rubin
                                chunk.voxels[lIdx] = 16; // Ruby Ore!
                            }
                        }
                    }
                }

                // Trees / Cacti planning on solid surface
                if (h > SEA_LEVEL) {
                    const surfBlock = chunk.voxels[this.localIndex(lx, h, lz)];
                    const mod5X = ((x % 5) + 5) % 5;
                    const mod5Z = ((z % 5) + 5) % 5;
                    const mod9X = ((x % 9) + 9) % 9;
                    const mod9Z = ((z % 9) + 9) % 9;
                    const mod8X = ((x % 8) + 8) % 8;
                    const mod8Z = ((z % 8) + 8) % 8;

                    if (surfBlock === 1) { // Grass
                        if (biome === 'Forest' && mod5X === 2 && mod5Z === 3) {
                            treesToPlant.push({ x, y: h + 1, z });
                        } else if (biome === 'Plains' && mod9X === 4 && mod9Z === 5) {
                            treesToPlant.push({ x, y: h + 1, z });
                        }
                    } else if (surfBlock === 6 && biome === 'Desert' && mod8X === 3 && mod8Z === 4) {
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

        // Apply any saved localStorage modifications for this chunk
        this.applyChunkStorageDelta(chunk);
    }

    plantTree(x, startY, z) {
        // Natural trunk height between 4 and 6 blocks
        const noiseVal = Math.abs(this.treeNoise.noise2D(x * 0.45, z * 0.45));
        const height = 4 + Math.floor(noiseVal * 3);
        if (startY + height + 3 >= WORLD_HEIGHT) return;

        // Wood trunk
        for (let y = 0; y < height; y++) {
            this.setBlockRaw(x, startY + y, z, 4); // Wood
        }

        // Beautiful layered canopy (4 vertical layers with rounded crown)
        const leafBottom = startY + height - 2;
        const leafTop = startY + height + 1;

        for (let ly = leafBottom; ly <= leafTop; ly++) {
            const isTopLayer = (ly === leafTop);
            const radius = isTopLayer ? 1 : 2;

            for (let lx = -radius; lx <= radius; lx++) {
                for (let lz = -radius; lz <= radius; lz++) {
                    const distSq = lx * lx + lz * lz;
                    // Cut out outer sharp corners for natural rounded canopy
                    if (radius === 2 && distSq > 5) continue;
                    if (isTopLayer && distSq > 1) continue; // cross shape on very top

                    const curX = x + lx;
                    const curZ = z + lz;
                    if (this.getBlockFast(curX, ly, curZ) === 0) {
                        this.setBlockRaw(curX, ly, curZ, 5); // Leaves
                    }
                }
            }
        }

        // Extra crown cap block at the very peak
        if (this.getBlockFast(x, leafTop + 1, z) === 0) {
            this.setBlockRaw(x, leafTop + 1, z, 5);
        }
    }

    plantCactus(x, startY, z) {
        const height = 2 + Math.floor(Math.abs(this.noise.noise2D(x * 0.5, z * 0.5)) * 2);
        for (let y = 0; y < height; y++) {
            if (startY + y < WORLD_HEIGHT) {
                this.setBlockRaw(x, startY + y, z, 11); // Cactus
            }
        }
    }

    // Build or rebuild single chunk mesh with face culling
    buildChunk(cx, cz) {
        const key = this.getChunkKey(cx, cz);
        let chunk = this.chunks.get(key);
        if (!chunk) {
            chunk = this.getOrCreateChunk(cx, cz);
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

                        // Face culling condition
                        const renderFace = (neighborId === 0) ||
                            (neighborDef?.transparent && (neighborId !== blockId || blockId === 5));

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

            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();

            const mesh = new THREE.Mesh(geometry, AtlasMaterial);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            chunk.mesh = mesh;
        }

        chunk.dirty = false;
    }

    // Dynamic update loop: streams chunks around player as they walk
    update(playerPosition = null) {
        // 1. Rebuild any modified dirty chunks
        for (const chunk of this.chunks.values()) {
            if (chunk.dirty) {
                this.buildChunk(chunk.cx, chunk.cz);
            }
        }

        // 2. Dynamic generation around moving player
        if (playerPosition) {
            const pcx = Math.floor(playerPosition.x / CHUNK_SIZE);
            const pcz = Math.floor(playerPosition.z / CHUNK_SIZE);

            // If player entered a new chunk, proactively prepare surrounding chunks
            if (pcx !== this.lastPlayerChunk.cx || pcz !== this.lastPlayerChunk.cz) {
                this.lastPlayerChunk.cx = pcx;
                this.lastPlayerChunk.cz = pcz;

                // Step A: Pre-generate voxel data in a wide radius (radius 4 = 9x9 chunks)
                // This guarantees solid ground for physics and prevents void falling
                const VOXEL_RADIUS = RENDER_RADIUS + 1;
                for (let cx = pcx - VOXEL_RADIUS; cx <= pcx + VOXEL_RADIUS; cx++) {
                    for (let cz = pcz - VOXEL_RADIUS; cz <= pcz + VOXEL_RADIUS; cz++) {
                        this.getOrCreateChunk(cx, cz);
                    }
                }

                // Step B: Collect unmeshed chunks in render radius
                const neededChunks = [];
                for (let cx = pcx - RENDER_RADIUS; cx <= pcx + RENDER_RADIUS; cx++) {
                    for (let cz = pcz - RENDER_RADIUS; cz <= pcz + RENDER_RADIUS; cz++) {
                        const key = this.getChunkKey(cx, cz);
                        const chunk = this.chunks.get(key);
                        if (!chunk || !chunk.mesh) {
                            const distSq = (cx - pcx) * (cx - pcx) + (cz - pcz) * (cz - pcz);
                            neededChunks.push({ cx, cz, distSq });
                        }
                    }
                }

                // Sort closest chunks first so terrain under/near player meshes immediately
                neededChunks.sort((a, b) => a.distSq - b.distSq);
                this.chunkBuildQueue = neededChunks;

                // Synchronously mesh immediately adjacent chunks (distSq <= 2: 5x5 chunks)
                while (this.chunkBuildQueue.length > 0 && this.chunkBuildQueue[0].distSq <= 2) {
                    const item = this.chunkBuildQueue.shift();
                    this.buildChunk(item.cx, item.cz);
                }

                // Unload meshes of very distant chunks to keep memory and draw calls optimized
                // But NEVER unload chunks that have player modifications (player house/structures)!
                const unloadDist = RENDER_RADIUS + 3;
                for (const chunk of this.chunks.values()) {
                    if (chunk.mesh) {
                        if (chunk.hasPlayerBlocks) continue;
                        const dx = Math.abs(chunk.cx - pcx);
                        const dz = Math.abs(chunk.cz - pcz);
                        if (dx > unloadDist || dz > unloadDist) {
                            this.scene.remove(chunk.mesh);
                            chunk.mesh.geometry.dispose();
                            chunk.mesh = null;
                        }
                    }
                }
            }

            // Build up to 4 remaining queued chunks per frame
            let builtCount = 0;
            while (this.chunkBuildQueue.length > 0 && builtCount < 4) {
                const item = this.chunkBuildQueue.shift();
                this.buildChunk(item.cx, item.cz);
                builtCount++;
            }

            // Continuous catch-up: ensure any missing chunk in render radius is queued
            if (this.chunkBuildQueue.length === 0) {
                for (let cx = pcx - RENDER_RADIUS; cx <= pcx + RENDER_RADIUS; cx++) {
                    for (let cz = pcz - RENDER_RADIUS; cz <= pcz + RENDER_RADIUS; cz++) {
                        const key = this.getChunkKey(cx, cz);
                        const chunk = this.chunks.get(key);
                        if (!chunk || !chunk.mesh) {
                            const distSq = (cx - pcx) * (cx - pcx) + (cz - pcz) * (cz - pcz);
                            this.chunkBuildQueue.push({ cx, cz, distSq });
                        }
                    }
                }
                if (this.chunkBuildQueue.length > 0) {
                    this.chunkBuildQueue.sort((a, b) => a.distSq - b.distSq);
                }
            }
        }
    }
}
