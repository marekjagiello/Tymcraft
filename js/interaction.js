import * as THREE from 'three';
import { BLOCK_DEF } from './textures.js';

// Web Audio API sounds for combat
let audioCtx = null;
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

export function playSwingSound() {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
    } catch (_) {}
}

export function playHitSound() {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
    } catch (_) {}
}

export class Interaction {
    constructor(scene, camera, world, player, getActiveBlockId, drops = null) {
        this.scene = scene;
        this.camera = camera;
        this.world = world;
        this.player = player;
        this.getActiveBlockId = getActiveBlockId;
        this.drops = drops;

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
        this.animals = null;
        this.ui = null;
        this.buildFirstPersonHand();
        this.initEvents();
    }

    raycastAnimal(maxDist = 5.0) {
        if (!this.animals || !this.animals.animals) return null;

        const origin = this.camera.position;
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);

        let closestAnimal = null;
        let closestDist = maxDist;

        for (const animal of this.animals.animals) {
            if (animal.isDead) continue;

            const height = (animal.type === 'zombie') ? 1.85 : ((animal.type === 'snake') ? 0.35 : 0.85);
            const hitRadius = (animal.type === 'snake') ? 0.80 : ((animal.type === 'zombie') ? 0.95 : 0.85);

            // Center of animal vertical capsule
            const center = animal.position.clone().add(new THREE.Vector3(0, height * 0.5, 0));
            const toCenter = center.clone().sub(origin);
            const proj = toCenter.dot(dir);

            if (proj > 0 && proj < closestDist) {
                const rayPoint = origin.clone().addScaledVector(dir, proj);
                const clampedY = THREE.MathUtils.clamp(rayPoint.y, animal.position.y, animal.position.y + height);
                const closestAxisPoint = new THREE.Vector3(animal.position.x, clampedY, animal.position.z);
                const distToAxis = rayPoint.distanceTo(closestAxisPoint);

                if (distToAxis < hitRadius) {
                    closestDist = proj;
                    closestAnimal = animal;
                }
            }
        }

        return closestAnimal;
    }

    initEvents() {
        window.addEventListener('mousedown', (e) => {
            if (!this.player.controls.isLocked) return;

            const activeItemId = this.getActiveBlockId();

            if (e.button === 0) {
                this.triggerSwing();

                // Left Click: Check if aimed at an animal (snake, sheep, pig, zombie)
                const animal = this.raycastAnimal();
                if (animal) {
                    if (activeItemId === 23) {
                        // Clicking with apple as if to attack/destroy feeds it instead: hearts appear!
                        animal.interactWithApple();
                        if (this.onItemConsumed) this.onItemConsumed(23);
                        if (this.ui) this.ui.showPopup("❤️ Nakarmiono węża! Pojawiły się serca! 🐍");
                        return;
                    } else {
                        let damage = 2;
                        if (activeItemId === 24) damage = 5; // Wooden Sword
                        else if (activeItemId === 25) damage = 8; // Stone Sword
                        else if (activeItemId === 21 || activeItemId === 22) damage = 3.5; // Pickaxes

                        playHitSound();
                        const hitPos = animal.position.clone().add(new THREE.Vector3(0, 0.9, 0));
                        this.spawnHitParticles(hitPos);

                        const wasAlive = animal.health > 0;
                        animal.onAttacked(damage, this.player.position);
                        if (wasAlive && animal.health <= 0) {
                            let name = 'zwierzę';
                            if (animal.type === 'snake') name = 'węża';
                            else if (animal.type === 'zombie') name = 'Zombie';
                            else if (animal.type === 'pig') name = 'świnię';
                            else if (animal.type === 'sheep') name = 'owcę';
                            if (this.ui) this.ui.showPopup(`💥 Pokonano ${name}!`);
                        } else if (animal.type === 'zombie' && this.ui) {
                            this.ui.showPopup(`⚔️ Trafiono Zombie! (${animal.health}/${animal.maxHealth} HP)`);
                        }
                        return;
                    }
                }

                // Otherwise Break Block
                this.breakBlock();
            } else if (e.button === 2) {
                // Right Click: Check if feeding animal with apple
                e.preventDefault();
                const animal = this.raycastAnimal();
                if (animal && activeItemId === 23) {
                    animal.interactWithApple();
                    if (this.onItemConsumed) this.onItemConsumed(23);
                    if (this.ui) this.ui.showPopup("❤️ Nakarmiono węża! Pojawiły się serca! 🐍");
                    return;
                }

                // Eat Rotten Flesh (ID 26)
                if (activeItemId === 26 && this.survival) {
                    this.survival.eat(2);
                    if (this.onItemConsumed) this.onItemConsumed(26);
                    if (this.ui) this.ui.showPopup("🍖 Zjedzono zgniłe mięso (+2 głód)!");
                    return;
                }

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

        // Spawn 3D dropped item on the ground (mini-block or Apple from leaves)
        if (this.drops) {
            this.drops.spawnBlockDrop(x, y, z, blockId);
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

        // 2. Tools & Weapons (Pickaxes, Sticks, Swords, Flesh) cannot be placed as blocks
        if ((activeItemId >= 20 && activeItemId <= 22) || activeItemId === 24 || activeItemId === 25 || activeItemId === 26) {
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
        if (this.onBlockPlaced) {
            this.onBlockPlaced(activeItemId);
        }

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

    spawnHitParticles(pos) {
        const pMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 }); // Golden critical spark
        for (let i = 0; i < 8; i++) {
            const p = new THREE.Mesh(this.particleGeo, pMat);
            p.position.copy(pos).add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.4
            ));
            p.scale.set(0.65, 0.65, 0.65);
            p.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 4.0,
                1.5 + Math.random() * 2.5,
                (Math.random() - 0.5) * 4.0
            );
            p.life = 0.35;
            this.scene.add(p);
            this.particles.push(p);
        }
    }

    buildFirstPersonHand() {
        this.handGroup = new THREE.Group();
        this.handGroup.position.set(0.32, -0.26, -0.48);

        // First-person Arm (Skin)
        const armGeo = new THREE.BoxGeometry(0.11, 0.13, 0.38);
        const armMat = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
        this.armMesh = new THREE.Mesh(armGeo, armMat);
        this.armMesh.rotation.set(-0.25, 0.18, 0);
        this.handGroup.add(this.armMesh);

        // First-person Sword model
        this.swordGroup = new THREE.Group();
        this.swordGroup.position.set(0, 0.12, -0.16);

        const bladeGeo = new THREE.BoxGeometry(0.05, 0.48, 0.035);
        this.bladeMat = new THREE.MeshLambertMaterial({ color: 0x92400e }); // Wooden blade
        const blade = new THREE.Mesh(bladeGeo, this.bladeMat);
        blade.position.set(0, 0.18, 0);
        this.swordGroup.add(blade);

        const guardGeo = new THREE.BoxGeometry(0.16, 0.03, 0.05);
        const guardMat = new THREE.MeshLambertMaterial({ color: 0x52525b });
        const guard = new THREE.Mesh(guardGeo, guardMat);
        guard.position.set(0, -0.05, 0);
        this.swordGroup.add(guard);

        this.swordGroup.rotation.set(-0.65, 0.1, 0);
        this.swordGroup.visible = false;
        this.handGroup.add(this.swordGroup);

        this.camera.add(this.handGroup);
        this.swingTime = 0;
        this.isSwinging = false;
    }

    triggerSwing() {
        this.isSwinging = true;
        this.swingTime = 0;
        playSwingSound();
    }

    updateHand(dt) {
        if (!this.handGroup) return;

        const activeItemId = this.getActiveBlockId ? this.getActiveBlockId() : 0;
        const isSword = (activeItemId === 24 || activeItemId === 25);
        if (this.swordGroup) {
            this.swordGroup.visible = isSword;
            if (activeItemId === 25) {
                this.bladeMat.color.setHex(0x78716c); // Stone sword
            } else if (activeItemId === 24) {
                this.bladeMat.color.setHex(0x92400e); // Wood sword
            }
        }

        // Swing animation
        if (this.isSwinging) {
            this.swingTime += dt * 16.0;
            if (this.swingTime >= Math.PI) {
                this.swingTime = 0;
                this.isSwinging = false;
                this.handGroup.rotation.set(0, 0, 0);
            } else {
                const s = Math.sin(this.swingTime);
                this.handGroup.rotation.x = -s * 0.65;
                this.handGroup.rotation.y = s * 0.35;
                this.handGroup.rotation.z = -s * 0.2;
            }
        } else {
            // Gentle breathing bob
            const bob = Math.sin(Date.now() * 0.0035) * 0.008;
            this.handGroup.position.y = -0.26 + bob;
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
        this.updateHand(dt);

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
