import * as THREE from 'three';
import { BLOCK_DEF } from './textures.js';

export class Interaction {
    constructor(scene, camera, world, player, getActiveBlockId) {
        this.scene = scene;
        this.camera = camera;
        this.world = world;
        this.player = player;
        this.getActiveBlockId = getActiveBlockId;

        this.reachDistance = 5.5;

        // Block highlight box wireframe
        const boxGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
        const edges = new THREE.EdgesGeometry(boxGeo);
        this.highlightMesh = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
        );
        this.highlightMesh.visible = false;
        this.scene.add(this.highlightMesh);

        // Particle system for broken blocks
        this.particles = [];
        this.particleGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        this.particleMat = new THREE.MeshLambertMaterial({ color: 0x777777 });

        this.currentTarget = null;
        this.initEvents();
    }

    initEvents() {
        window.addEventListener('mousedown', (e) => {
            if (!this.player.controls.isLocked) return;

            if (e.button === 0) {
                // Left Click: Break Block
                this.breakBlock();
            } else if (e.button === 2) {
                // Right Click: Place Block
                e.preventDefault();
                this.placeBlock();
            }
        });

        // Prevent context menu in game
        window.addEventListener('contextmenu', (e) => {
            if (this.player.controls.isLocked) {
                e.preventDefault();
            }
        });
    }

    // Fast Voxel Traversal algorithm (Amanatides & Woo DDA)
    raycastVoxels(maxDist = this.reachDistance) {
        const origin = this.camera.position.clone();
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);

        let x = Math.floor(origin.x);
        let y = Math.floor(origin.y);
        let z = Math.floor(origin.z);

        const stepX = Math.sign(dir.x);
        const stepY = Math.sign(dir.y);
        const stepZ = Math.sign(dir.z);

        const tDeltaX = (dir.x !== 0) ? Math.abs(1 / dir.x) : Infinity;
        const tDeltaY = (dir.y !== 0) ? Math.abs(1 / dir.y) : Infinity;
        const tDeltaZ = (dir.z !== 0) ? Math.abs(1 / dir.z) : Infinity;

        let tMaxX = (stepX > 0) ? (x + 1 - origin.x) * tDeltaX : (origin.x - x) * tDeltaX;
        let tMaxY = (stepY > 0) ? (y + 1 - origin.y) * tDeltaY : (origin.y - y) * tDeltaY;
        let tMaxZ = (stepZ > 0) ? (z + 1 - origin.z) * tDeltaZ : (origin.z - z) * tDeltaZ;

        let normalX = 0, normalY = 0, normalZ = 0;
        let dist = 0;

        while (dist <= maxDist) {
            const blockId = this.world.getBlock(x, y, z);
            if (blockId !== 0 && blockId !== 10) { // Hit solid non-water block
                return {
                    hit: true,
                    x, y, z,
                    normalX, normalY, normalZ,
                    blockId
                };
            }

            if (tMaxX < tMaxY) {
                if (tMaxX < tMaxZ) {
                    x += stepX;
                    dist = tMaxX;
                    tMaxX += tDeltaX;
                    normalX = -stepX; normalY = 0; normalZ = 0;
                } else {
                    z += stepZ;
                    dist = tMaxZ;
                    tMaxZ += tDeltaZ;
                    normalX = 0; normalY = 0; normalZ = -stepZ;
                }
            } else {
                if (tMaxY < tMaxZ) {
                    y += stepY;
                    dist = tMaxY;
                    tMaxY += tDeltaY;
                    normalX = 0; normalY = -stepY; normalZ = 0;
                } else {
                    z += stepZ;
                    dist = tMaxZ;
                    tMaxZ += tDeltaZ;
                    normalX = 0; normalY = 0; normalZ = -stepZ;
                }
            }
        }

        return { hit: false };
    }

    breakBlock() {
        if (!this.currentTarget || !this.currentTarget.hit) return;

        const { x, y, z, blockId } = this.currentTarget;
        if (blockId === 14) return; // Cannot break bedrock

        // Spawn particles
        this.spawnBreakParticles(x + 0.5, y + 0.5, z + 0.5, blockId);

        // Remove block from world
        this.world.setBlock(x, y, z, 0);

        // Apple drop chance when breaking leaves
        if (blockId === 5 && Math.random() < 0.3) {
            console.log("[Interaction] Znaleziono Jabłko z liści!");
            if (this.onItemObtained) this.onItemObtained(23, 'Jabłko');
        }

        // Re-check target
        this.currentTarget = this.raycastVoxels();
        this.updateHighlight();
    }

    placeBlock() {
        const activeItemId = this.getActiveBlockId();

        // 1. If holding food (Apple: ID 23), eat it!
        if (activeItemId === 23) {
            if (this.survival) {
                this.survival.feed(4);
                console.log("[Interaction] Zjedzono jabłko! (+4 głód)");
                if (this.onItemConsumed) this.onItemConsumed(23);
            }
            return;
        }

        // 2. Tools (Pickaxes, Sticks) cannot be placed as blocks
        if (activeItemId >= 20 && activeItemId <= 22) {
            return;
        }

        if (!this.currentTarget || !this.currentTarget.hit) return;

        const { x, y, z, normalX, normalY, normalZ } = this.currentTarget;
        const placeX = x + normalX;
        const placeY = y + normalY;
        const placeZ = z + normalZ;

        // Player AABB collision check
        const playerAABB = this.player.getAABB();
        const blockAABB = {
            minX: placeX, maxX: placeX + 1,
            minY: placeY, maxY: placeY + 1,
            minZ: placeZ, maxZ: placeZ + 1
        };

        const intersectsPlayer = (
            playerAABB.minX < blockAABB.maxX && playerAABB.maxX > blockAABB.minX &&
            playerAABB.minY < blockAABB.maxY && playerAABB.maxY > blockAABB.minY &&
            playerAABB.minZ < blockAABB.maxZ && playerAABB.maxZ > blockAABB.minZ
        );

        if (intersectsPlayer) {
            return; // Don't place inside player
        }

        this.world.setBlock(placeX, placeY, placeZ, activeItemId);

        // Re-check target
        this.currentTarget = this.raycastVoxels();
        this.updateHighlight();
    }

    spawnBreakParticles(x, y, z, blockId) {
        let pColor = 0x866043; // default brown
        if (blockId === 1) pColor = 0x588c34; // green
        if (blockId === 3) pColor = 0x808080; // stone
        if (blockId === 4) pColor = 0x6c5333; // wood
        if (blockId === 5) pColor = 0x365e1d; // leaves
        if (blockId === 6) pColor = 0xdbcd98; // sand
        if (blockId === 7) pColor = 0xf0f5f5; // snow

        const pMat = new THREE.MeshLambertMaterial({ color: pColor });

        for (let i = 0; i < 8; i++) {
            const p = new THREE.Mesh(this.particleGeo, pMat);
            p.position.set(
                x + (Math.random() - 0.5) * 0.6,
                y + (Math.random() - 0.5) * 0.6,
                z + (Math.random() - 0.5) * 0.6
            );
            p.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                Math.random() * 4 + 1,
                (Math.random() - 0.5) * 4
            );
            p.life = 0.5; // seconds
            this.scene.add(p);
            this.particles.push(p);
        }
    }

    updateHighlight() {
        if (this.currentTarget && this.currentTarget.hit) {
            this.highlightMesh.position.set(
                this.currentTarget.x + 0.5,
                this.currentTarget.y + 0.5,
                this.currentTarget.z + 0.5
            );
            this.highlightMesh.visible = true;
        } else {
            this.highlightMesh.visible = false;
        }
    }

    update(dt) {
        if (this.player.controls.isLocked) {
            this.currentTarget = this.raycastVoxels();
            this.updateHighlight();
        } else {
            this.highlightMesh.visible = false;
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.scene.remove(p);
                p.geometry.dispose();
                this.particles.splice(i, 1);
            } else {
                p.velocity.y -= 15 * dt;
                p.position.addScaledVector(p.velocity, dt);
                p.scale.multiplyScalar(0.96);
            }
        }
    }
}
