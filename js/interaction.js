import * as THREE from 'three';
import { BLOCK_DEF } from './textures.js';
import { playSwingSound, playHitSound, playEatSound, playBowShootSound, playBowDrawSound } from './audio.js';
import { getItem, getItemDamage, isFood, isPlaceableBlock, isBow } from './items.js';
import { eventBus } from './events.js';

// Re-export audio helpers for backward compatibility
export { playSwingSound, playHitSound, playBowShootSound };

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
        this.survival = null;
        this.onItemConsumed = null;
        this.onBlockPlaced = null;

        // Bow mechanics state
        this.isDrawingBow = false;
        this.bowCharge = 0.0;
        this.bowDrawTime = 0.0;
        this.bowRecoil = 0.0;

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

            const height = (animal.type === 'zombie' || animal.type === 'skeleton') ? 1.85 : ((animal.type === 'creeper') ? 1.6 : ((animal.type === 'dirtik') ? 1.05 : ((animal.type === 'snake') ? 0.35 : 0.85)));
            const hitRadius = (animal.type === 'snake') ? 0.80 : 0.95;

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

            const activeItemId = this.getActiveBlockId ? this.getActiveBlockId() : 0;

            if (e.button === 0) {
                // If riding a bear, left click triggers bear paw attack!
                if (this.player && this.player.mountedBear) {
                    this.player.mountedBear.performPawAttack();
                    return;
                }

                this.triggerSwing();

                // Left Click: Check if aimed at an animal (snake, sheep, pig, zombie, skeleton, creeper, dirtik)
                const animal = this.raycastAnimal();
                if (animal) {
                    if (animal.type === 'dirtik' && !animal.isAwakened) {
                        animal.awaken();
                        return;
                    }
                    if (activeItemId === 23) {
                        // Clicking with apple feeds it instead: hearts appear!
                        animal.interactWithApple();
                        eventBus.emit('item:consume');
                        eventBus.emit('ui:popup', '❤️ Nakarmiono węża! Pojawiły się serca! 🐍');
                        if (this.onItemConsumed) this.onItemConsumed(23);
                        if (this.ui && !this.ui._handledByEvent) this.ui.showPopup('❤️ Nakarmiono węża! Pojawiły się serca! 🐍');
                        return;
                    } else {
                        const damage = getItemDamage(activeItemId, 2.0);

                        playHitSound();
                        const hitPos = animal.position.clone().add(new THREE.Vector3(0, 0.9, 0));
                        this.spawnHitParticles(hitPos);

                        const wasAlive = animal.health > 0;
                        animal.onAttacked(damage, this.player.position);

                        if (wasAlive && animal.health <= 0) {
                            let name = 'zwierzę';
                            if (animal.type === 'snake') name = 'węża';
                            else if (animal.type === 'zombie') name = 'Zombie';
                            else if (animal.type === 'skeleton') name = 'Szkieleta';
                            else if (animal.type === 'creeper') name = 'Creepera';
                            else if (animal.type === 'dirtik') name = 'Dirtika';
                            else if (animal.type === 'pig') name = 'świnię';
                            else if (animal.type === 'sheep') name = 'owcę';

                            const msg = `💥 Pokonano ${name}!`;
                            eventBus.emit('ui:popup', msg);
                            if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(msg);
                        } else if ((animal.type === 'zombie' || animal.type === 'skeleton' || animal.type === 'creeper' || animal.type === 'dirtik')) {
                            const enemyName = animal.type === 'skeleton' ? 'Szkieleta' : (animal.type === 'creeper' ? 'Creepera' : (animal.type === 'dirtik' ? 'Dirtika' : 'Zombie'));
                            const msg = `⚔️ Trafiono ${enemyName}! (${animal.health}/${animal.maxHealth} HP)`;
                            eventBus.emit('ui:popup', msg);
                            if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(msg);
                        }
                        return;
                    }
                }

                // Otherwise Break Block
                this.breakBlock();
            } else if (e.button === 2) {
                // Right Click: Check if shooting bow
                e.preventDefault();

                if (isBow(activeItemId)) {
                    if (this.ui && !this.ui.hasItem(28)) {
                        const msg = '⚠️ Brak strzał w ekwipunku! Stwórz je w craftingu (R) z patyka i kamienia/kości.';
                        eventBus.emit('ui:popup', msg);
                        if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(msg);
                        return;
                    }
                    this.startBowDraw();
                    return;
                }

                // Check if throwing Gunpowder (ID: 36)
                if (activeItemId === 36) {
                    this.throwGunpowder();
                    return;
                }

                // Check if right-clicking disguised Dirtik
                const targetAnimal = this.raycastAnimal();
                if (targetAnimal && targetAnimal.type === 'dirtik' && !targetAnimal.isAwakened) {
                    targetAnimal.awaken();
                    return;
                }

                // Check if feeding animal with apple
                const animal = targetAnimal;
                if (animal && activeItemId === 23) {
                    animal.interactWithApple();
                    eventBus.emit('item:consume');
                    eventBus.emit('ui:popup', '❤️ Nakarmiono węża! Pojawiły się serca! 🐍');
                    if (this.onItemConsumed) this.onItemConsumed(23);
                    if (this.ui && !this.ui._handledByEvent) this.ui.showPopup('❤️ Nakarmiono węża! Pojawiły się serca! 🐍');
                    return;
                }

                // Eat Food (Apple or Rotten Flesh, or any food in registry)
                if (isFood(activeItemId)) {
                    const foodDef = getItem(activeItemId);
                    const nutrition = foodDef?.nutrition || 2;
                    const heals = foodDef?.heals || 0;

                    playEatSound();
                    eventBus.emit('player:feed', nutrition);
                    if (heals > 0) eventBus.emit('player:heal', heals);
                    eventBus.emit('item:consume');

                    const msg = activeItemId === 23
                        ? '🍎 Zjedzono jabłko (+4 głód)!'
                        : `🍖 Zjedzono ${foodDef?.name || 'jedzenie'} (+${nutrition} głód)!`;

                    eventBus.emit('ui:popup', msg);

                    if (this.survival && !this.survival._handledByEvent) {
                        this.survival.feed(nutrition);
                    }
                    if (this.onItemConsumed) this.onItemConsumed(activeItemId);
                    if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(msg);
                    return;
                }

                this.placeBlock();
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 2 && this.isDrawingBow) {
                this.releaseBow();
            }
        });

        if (this.player && this.player.controls) {
            this.player.controls.addEventListener('unlock', () => {
                this.cancelBowDraw();
            });
        }

        // Prevent context menu in game
        window.addEventListener('contextmenu', (e) => {
            if (this.player.controls.isLocked) {
                e.preventDefault();
            }
        });
    }

    startBowDraw() {
        this.isDrawingBow = true;
        this.bowDrawTime = 0.0;
        this.bowCharge = 0.0;
        playBowDrawSound();
    }

    releaseBow() {
        if (!this.isDrawingBow) return;

        if (this.bowCharge >= 0.15) {
            let consumed = false;
            if (this.ui) {
                consumed = this.ui.consumeItem(28, 1);
            } else {
                eventBus.emit('item:consume_specific', { id: 28, amount: 1 });
                consumed = true;
            }

            if (consumed) {
                playBowShootSound();
                const dir = new THREE.Vector3();
                this.camera.getWorldDirection(dir);
                const origin = this.camera.position.clone().addScaledVector(dir, 0.4);

                const damage = Math.round(4 + this.bowCharge * 6); // 4 do 10 obrażeń
                const speed = 18.0 + this.bowCharge * 18.0; // 18 do 36 m/s

                if (this.animals && this.animals.spawnArrow) {
                    const arrow = this.animals.spawnArrow(origin, dir, 'player', damage);
                    if (arrow) {
                        arrow.velocity = dir.clone().multiplyScalar(speed);
                    }
                }

                // Odskok łuku po wystrzale (recoil kick)
                this.bowRecoil = 0.14;

                if (this.bowCharge >= 0.9) {
                    eventBus.emit('ui:popup', '🏹 Maksymalny strzał z łuku! (10 obrażeń)');
                    if (this.ui && !this.ui._handledByEvent) this.ui.showPopup('🏹 Maksymalny strzał z łuku! (10 obrażeń)');
                }
            } else {
                const msg = '⚠️ Brak strzał w ekwipunku!';
                eventBus.emit('ui:popup', msg);
                if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(msg);
            }
        }

        this.cancelBowDraw();
    }

    cancelBowDraw() {
        this.isDrawingBow = false;
        this.bowCharge = 0.0;
        this.bowDrawTime = 0.0;
        if (this.camera) {
            this.camera.fov = 75;
            this.camera.updateProjectionMatrix();
        }
    }

    throwGunpowder() {
        const activeItemId = this.getActiveBlockId ? this.getActiveBlockId() : 0;
        if (activeItemId !== 36) return;

        eventBus.emit('item:consume');
        if (this.onItemConsumed) {
            this.onItemConsumed(36);
        }

        this.triggerSwing();

        const origin = this.camera.position.clone();
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        origin.addScaledVector(dir, 0.4);

        if (this.animals && this.animals.spawnThrownGunpowder) {
            this.animals.spawnThrownGunpowder(origin, dir);
        }

        eventBus.emit('ui:popup', '🧨 Rzucono ładunek prochu!');
        if (this.ui && !this.ui._handledByEvent) {
            this.ui.showPopup('🧨 Rzucono ładunek prochu!');
        }
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
            if (blockId !== 0 && blockId !== 10) { // Solid non-water block
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

        // If target is a disguised Dirtik
        if (this.currentTarget.isDisguisedDirtik && this.currentTarget.dirtik) {
            this.currentTarget.dirtik.awaken();
            return;
        }

        const { x, y, z, blockId } = this.currentTarget;
        if (blockId === 14) return; // Cannot break bedrock

        // Check if breaking near/under disguised Dirtik
        if (this.animals && this.animals.animals) {
            for (const a of this.animals.animals) {
                if (a.type === 'dirtik' && !a.isAwakened) {
                    const blockCenter = new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5);
                    const dirtikCenter = a.position.clone().add(new THREE.Vector3(0, 0.5, 0));
                    const dist = dirtikCenter.distanceTo(blockCenter);
                    if (dist < 1.6) {
                        a.awaken();
                        return;
                    }
                }
            }
        }

        const activeItemId = this.getActiveBlockId ? this.getActiveBlockId() : 0;

        // Ruda Diamentu (15) wymaga co najmniej Kamiennego Kilofa (22) lub Diamentowego Kilofa (33)
        if (blockId === 15 && activeItemId !== 22 && activeItemId !== 33) {
            playHitSound();
            const msg = '⚠️ Rudę Diamentu można wykopać tylko Kamiennym lub Diamentowym Kilofem! ⛏️';
            eventBus.emit('ui:popup', msg);
            if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(msg);
            return;
        }

        // Ruda Rubinu (16) wymaga Diamentowego Kilofa (33)
        if (blockId === 16 && activeItemId !== 33) {
            playHitSound();
            const msg = '⚠️ Rudę Rubinu można wykopać tylko Diamentowym Kilofem! ⛏️💎';
            eventBus.emit('ui:popup', msg);
            if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(msg);
            return;
        }

        this.spawnBreakParticles(x + 0.5, y + 0.5, z + 0.5, blockId);
        this.world.setBlock(x, y, z, 0);

        if (this.drops) {
            this.drops.spawnBlockDrop(x, y, z, blockId);
        }

        if (blockId === 15) {
            const msg = '💎 Wykopano cenny Diament! ✨';
            eventBus.emit('ui:popup', msg);
            if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(msg);
        }

        if (blockId === 16) {
            const msg = '🔴 Wykopano potężny Rubin! ✨';
            eventBus.emit('ui:popup', msg);
            if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(msg);
        }

        this.currentTarget = this.raycastVoxels();
        this.updateHighlight();
    }

    placeBlock() {
        const activeItemId = this.getActiveBlockId ? this.getActiveBlockId() : 0;

        // Guard: check if placeable block using Item Registry
        if (!isPlaceableBlock(activeItemId)) {
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

        // Check if placing a block on a disguised Dirtik
        if (this.animals && this.animals.animals) {
            for (const a of this.animals.animals) {
                if (a.type === 'dirtik' && !a.isAwakened) {
                    const dirtikCenter = a.position.clone().add(new THREE.Vector3(0, 0.5, 0));
                    const distPlaced = dirtikCenter.distanceTo(new THREE.Vector3(placeX + 0.5, placeY + 0.5, placeZ + 0.5));
                    const distClicked = dirtikCenter.distanceTo(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5));
                    if (distPlaced < 1.6 || distClicked < 1.6) {
                        a.awaken();
                        return;
                    }
                }
            }
        }

        this.world.setBlock(placeX, placeY, placeZ, activeItemId);

        eventBus.emit('item:consume');
        if (this.onBlockPlaced) {
            this.onBlockPlaced(activeItemId);
        }

        this.currentTarget = this.raycastVoxels();
        this.updateHighlight();
    }

    spawnBreakParticles(x, y, z, blockId) {
        let pColor = 0x866043;
        if (blockId === 1) pColor = 0x588c34;
        if (blockId === 3) pColor = 0x808080;
        if (blockId === 4) pColor = 0x6c5333;
        if (blockId === 5) pColor = 0x365e1d;
        if (blockId === 6) pColor = 0xdbcd98;
        if (blockId === 7) pColor = 0xf0f5f5;

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
            p.life = 0.5;
            this.scene.add(p);
            this.particles.push(p);
        }
    }

    spawnHitParticles(pos) {
        const pMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
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

        const armGeo = new THREE.BoxGeometry(0.11, 0.13, 0.38);
        const armMat = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
        this.armMesh = new THREE.Mesh(armGeo, armMat);
        this.armMesh.rotation.set(-0.25, 0.18, 0);
        this.handGroup.add(this.armMesh);

        this.swordGroup = new THREE.Group();
        this.swordGroup.position.set(0, 0.12, -0.16);

        const bladeGeo = new THREE.BoxGeometry(0.05, 0.48, 0.035);
        this.bladeMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
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

        // 3D FIRST-PERSON BOW MODEL
        this.bowGroup = new THREE.Group();
        this.bowGroup.position.set(-0.06, 0.12, -0.16);
        this.bowGroup.rotation.set(-0.25, 0.35, -0.12);

        const bowWoodMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
        const bowHandleMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
        const bowStringMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

        // Center handle grip
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.05), bowHandleMat);
        this.bowGroup.add(handle);

        // Upper stave
        const upperStave = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.035), bowWoodMat);
        upperStave.position.set(0, 0.16, -0.06);
        upperStave.rotation.x = -Math.PI / 6;
        this.bowGroup.add(upperStave);

        const upperTip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.10, 0.03), bowWoodMat);
        upperTip.position.set(0, 0.29, -0.14);
        upperTip.rotation.x = -Math.PI / 3;
        this.bowGroup.add(upperTip);

        // Lower stave
        const lowerStave = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.035), bowWoodMat);
        lowerStave.position.set(0, -0.16, -0.06);
        lowerStave.rotation.x = Math.PI / 6;
        this.bowGroup.add(lowerStave);

        const lowerTip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.10, 0.03), bowWoodMat);
        lowerTip.position.set(0, -0.29, -0.14);
        lowerTip.rotation.x = Math.PI / 3;
        this.bowGroup.add(lowerTip);

        // Bowstring (upper and lower segments meeting at arrow notch)
        this.bowStringUpper = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.34, 0.012), bowStringMat);
        this.bowStringUpper.position.set(0, 0.16, -0.12);
        this.bowGroup.add(this.bowStringUpper);

        this.bowStringLower = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.34, 0.012), bowStringMat);
        this.bowStringLower.position.set(0, -0.16, -0.12);
        this.bowGroup.add(this.bowStringLower);

        // First-person arrow loaded in bow
        this.fpArrowGroup = new THREE.Group();
        const fpShaft = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.55), new THREE.MeshLambertMaterial({ color: 0xd97706 }));
        this.fpArrowGroup.add(fpShaft);

        const fpTip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.08), new THREE.MeshLambertMaterial({ color: 0x334155 }));
        fpTip.position.set(0, 0, -0.29);
        this.fpArrowGroup.add(fpTip);

        const fpFletch = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.08), new THREE.MeshLambertMaterial({ color: 0xf8fafc }));
        fpFletch.position.set(0, 0, 0.24);
        this.fpArrowGroup.add(fpFletch);

        this.fpArrowGroup.position.set(0, 0, -0.06);
        this.bowGroup.add(this.fpArrowGroup);

        this.bowGroup.visible = false;
        this.handGroup.add(this.bowGroup);

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

        if (this.player && this.player.cameraMode === 1) {
            this.handGroup.visible = false;
            return;
        } else {
            this.handGroup.visible = true;
        }

        const activeItemId = this.getActiveBlockId ? this.getActiveBlockId() : 0;
        const isSword = (activeItemId === 24 || activeItemId === 25);
        const isHoldingBow = (activeItemId === 29);

        if (this.swordGroup) {
            this.swordGroup.visible = isSword;
            if (activeItemId === 25) {
                this.bladeMat.color.setHex(0x78716c);
            } else if (activeItemId === 24) {
                this.bladeMat.color.setHex(0x92400e);
            }
        }

        if (this.bowGroup) {
            this.bowGroup.visible = isHoldingBow;
        }

        if (this.bowRecoil > 0) {
            this.bowRecoil = Math.max(0, this.bowRecoil - dt * 1.5);
        }

        if (isHoldingBow) {
            if (this.isDrawingBow) {
                this.bowDrawTime += dt;
                this.bowCharge = Math.min(1.0, this.bowDrawTime / 0.70);

                // Dynamic FOV zoom when aiming (Minecraft style)
                const targetFov = 75 - 12 * this.bowCharge;
                this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 12);
                this.camera.updateProjectionMatrix();

                // Pull back bowstring and arrow
                const pull = -0.16 * this.bowCharge;
                this.fpArrowGroup.position.z = -0.06 + pull;
                this.bowStringUpper.position.z = -0.12 + pull * 0.7;
                this.bowStringUpper.rotation.x = -0.22 * this.bowCharge;
                this.bowStringLower.position.z = -0.12 + pull * 0.7;
                this.bowStringLower.rotation.x = 0.22 * this.bowCharge;

                // Center hand into archery stance
                this.handGroup.position.set(
                    0.32 - 0.22 * this.bowCharge,
                    -0.26 + 0.10 * this.bowCharge,
                    -0.48 + this.bowRecoil
                );
                this.handGroup.rotation.set(
                    -0.12 * this.bowCharge,
                    0.20 * this.bowCharge,
                    -0.08 * this.bowCharge
                );
                return;
            } else {
                // Holding bow in relaxed stance
                this.fpArrowGroup.position.z = -0.06;
                this.bowStringUpper.position.z = -0.12;
                this.bowStringUpper.rotation.x = 0;
                this.bowStringLower.position.z = -0.12;
                this.bowStringLower.rotation.x = 0;

                this.handGroup.position.set(0.32, -0.26, -0.48 + this.bowRecoil);

                // Smoothly restore default FOV
                if (Math.abs(this.camera.fov - 75) > 0.05) {
                    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, 75, dt * 14);
                    this.camera.updateProjectionMatrix();
                }
            }
        } else {
            if (this.isDrawingBow) {
                this.cancelBowDraw();
            }
            this.handGroup.position.set(0.32, -0.26, -0.48);
            if (Math.abs(this.camera.fov - 75) > 0.05) {
                this.camera.fov = 75;
                this.camera.updateProjectionMatrix();
            }
        }

        if (this.isSwinging) {
            this.swingTime += dt * 16.0;
            if (this.swingTime >= Math.PI) {
                this.swingTime = 0;
                this.isSwinging = false;
            }
            const swingAngle = Math.sin(this.swingTime) * 0.75;
            this.handGroup.rotation.x = -swingAngle * 1.1;
            this.handGroup.rotation.y = swingAngle * 0.6;
            this.handGroup.rotation.z = -swingAngle * 0.4;
        } else if (!isHoldingBow || !this.isDrawingBow) {
            this.handGroup.rotation.set(0, 0, 0);
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
        this.currentTarget = this.raycastVoxels();

        // Check if looking directly at a disguised Dirtik within reach distance
        const aimedAnimal = this.raycastAnimal(this.reachDistance);
        if (aimedAnimal && aimedAnimal.type === 'dirtik' && !aimedAnimal.isAwakened) {
            const bx = Math.floor(aimedAnimal.position.x);
            const by = Math.floor(aimedAnimal.position.y);
            const bz = Math.floor(aimedAnimal.position.z);
            const distToDirtik = this.camera.position.distanceTo(aimedAnimal.position.clone().add(new THREE.Vector3(0, 0.5, 0)));
            const voxelHitDist = (this.currentTarget && this.currentTarget.hit)
                ? this.camera.position.distanceTo(new THREE.Vector3(this.currentTarget.x + 0.5, this.currentTarget.y + 0.5, this.currentTarget.z + 0.5))
                : 999;
            if (distToDirtik <= voxelHitDist) {
                this.currentTarget = {
                    hit: true,
                    x: bx,
                    y: by,
                    z: bz,
                    blockId: 2,
                    isDisguisedDirtik: true,
                    dirtik: aimedAnimal
                };
            }
        }

        this.updateHighlight();
        this.updateHand(dt);

        // Update block break & hit particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.scene.remove(p);
                this.particles.splice(i, 1);
            } else {
                p.position.addScaledVector(p.velocity, dt);
                p.velocity.y -= 14.0 * dt; // gravity
            }
        }
    }
}
