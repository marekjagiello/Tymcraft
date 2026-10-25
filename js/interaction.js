import * as THREE from 'three';
import { BLOCK_DEF } from './textures.js?v=water_2';
import { playSwingSound, playHitSound, playEatSound, playDrinkSound, playBowShootSound, playBowDrawSound, playExplosionSound, playRainbowChimeSound, playCyberTeleportSound, playPigGruntSound, startBossRobotMusic } from './audio.js';
import { getItem, getItemDamage, isFood, isPlaceableBlock, isBow, isMagicWand } from './items.js?v=pig_kingdom_dialogue_stage2_v8';

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
        this.magicWandCooldown = 0.0;

        // Magic Wand spells (Błyskawica ⚡, Kula Ognia 🔥, Skamienienie 🪨)
        this.wandSpells = [
            { id: 'lightning', name: 'Błyskawica ⚡', desc: 'Rażenie piorunem (16 DMG)' },
            { id: 'fireball', name: 'Kula Ognia 🔥', desc: 'Wybuch ognia (14 DMG)' },
            { id: 'stone', name: 'Skamienienie 🪨', desc: 'Zamiana w kamień na 5 sek.' }
        ];
        this.currentWandSpellIdx = 0;

        this.buildFirstPersonHand();
        this.initEvents();
    }

    raycastAnimal(maxDist = 5.5) {
        if (!this.animals || !this.animals.animals) return null;

        const origin = this.camera.position;
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);

        let closestAnimal = null;
        let closestDist = maxDist;

        for (const animal of this.animals.animals) {
            if (animal.isDead) continue;

            const isBoss = (animal.type === 'boss_robot' || animal.type === 'boss_pig_king');
            const effectiveMaxDist = isBoss ? Math.max(maxDist, 8.5) : maxDist;

            const height = (animal.type === 'boss_robot') ? 7.5 :
                           ((animal.type === 'boss_pig_king') ? 4.5 :
                           ((animal.type === 'robot') ? 2.0 :
                           ((animal.type === 'mini_robot') ? 0.95 :
                           ((animal.type === 'red_eyed_pig') ? 1.1 :
                           ((animal.type === 'zombie' || animal.type === 'skeleton') ? 1.85 :
                           ((animal.type === 'creeper') ? 1.6 :
                           ((animal.type === 'bear') ? 1.4 :
                           ((animal.type === 'dirtik') ? 1.05 :
                           ((animal.type === 'snake') ? 0.35 : 0.85)))))))));

            const hitRadius = (animal.type === 'boss_robot') ? 3.6 :
                              ((animal.type === 'boss_pig_king') ? 3.2 :
                              ((animal.type === 'robot') ? 1.15 :
                              ((animal.type === 'mini_robot') ? 0.75 :
                              ((animal.type === 'red_eyed_pig') ? 1.05 :
                              ((animal.type === 'bear') ? 1.25 :
                              ((animal.type === 'snake') ? 0.80 : 0.95))))));

            // Center of animal vertical capsule
            const center = animal.position.clone().add(new THREE.Vector3(0, height * 0.5, 0));
            const toCenter = center.clone().sub(origin);
            const proj = toCenter.dot(dir);

            if (proj > 0 && proj < effectiveMaxDist && proj < closestDist) {
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
                // If using Magiczna Różdżka (ID: 50) with Left Click: Cast current spell!
                if (activeItemId === 50) {
                    this.castMagicWand();
                    return;
                }

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
                    if (activeItemId === 23 && typeof animal.interactWithApple === 'function') {
                        // Clicking with apple feeds it instead: hearts appear!
                        animal.interactWithApple();
                        eventBus.emit('item:consume');
                        eventBus.emit('ui:popup', '❤️ Nakarmiono zwierzątko! Pojawiły się serca! 🐍');
                        if (this.onItemConsumed) this.onItemConsumed(23);
                        if (this.ui && !this.ui._handledByEvent) this.ui.showPopup('❤️ Nakarmiono zwierzątko! Pojawiły się serca! 🐍');
                        return;
                    } else {
                        const damage = getItemDamage(activeItemId, 2.0);

                        const isBossPhase2Immune = (animal.type === 'boss_robot' && animal.isPhase2 && activeItemId === 54);
                        if (activeItemId === 54 && !isBossPhase2Immune) {
                            playRainbowChimeSound();
                            const msg = '🌈🗡️ POTĘŻNE CIĘCIE KOLOROWYM MIECZEM! (25 OBRAŻEŃ!) 🌈';
                            eventBus.emit('ui:popup', msg);
                            if (this.ui) this.ui.showPopup(msg);
                        } else if (activeItemId !== 54) {
                            playHitSound();
                        }
                        const hitPos = animal.position.clone().add(new THREE.Vector3(0, 0.9, 0));
                        this.spawnHitParticles(hitPos);

                        const wasAlive = animal.health > 0;
                        animal.onAttacked(damage, this.player.position, activeItemId);

                        if (wasAlive && animal.health <= 0) {
                            let name = 'zwierzę';
                            if (animal.type === 'boss_robot') name = animal.isPhase2 ? 'Bossa Robota (Faza 2)' : 'Bossa Robota';
                            else if (animal.type === 'mini_robot') name = 'małego robocika';
                            else if (animal.type === 'snake') name = 'węża';
                            else if (animal.type === 'zombie') name = 'Zombie';
                            else if (animal.type === 'skeleton') name = 'Szkieleta';
                            else if (animal.type === 'creeper') name = 'Creepera';
                            else if (animal.type === 'dirtik') name = 'Dirtika';
                            else if (animal.type === 'robot') name = 'Robota Transformera';
                            else if (animal.type === 'pig') name = 'świnię';
                            else if (animal.type === 'sheep') name = 'owcę';

                            const msg = `💥 Pokonano ${name}!`;
                            eventBus.emit('ui:popup', msg);
                            if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(msg);
                        } else if (!isBossPhase2Immune && (animal.type === 'boss_robot' || animal.type === 'robot' || animal.type === 'mini_robot' || animal.type === 'zombie' || animal.type === 'skeleton' || animal.type === 'creeper' || animal.type === 'dirtik')) {
                            const enemyName = animal.type === 'boss_robot' ? (animal.isPhase2 ? 'Bossa Robota (Faza 2)' : 'Bossa Robota') : (animal.type === 'mini_robot' ? 'Małego Robocika' : (animal.type === 'robot' ? 'Robota Transformera' : (animal.type === 'skeleton' ? 'Szkieleta' : (animal.type === 'creeper' ? 'Creepera' : (animal.type === 'dirtik' ? 'Dirtika' : 'Zombie')))));
                            const msg = `⚔️ Trafiono ${enemyName}! (${Math.max(0, animal.health)}/${animal.maxHealth} HP)`;
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

                // Check if using Magiczna Różdżka (ID: 50) with Right Click (PPM): cycle spells!
                if (activeItemId === 50) {
                    this.cycleWandSpell();
                    return;
                }

                if (isBow(activeItemId)) {
                    if (this.ui && !this.ui.hasItem(28) && !this.ui.hasItem(56)) {
                        const msg = '⚠️ Brak strzał w ekwipunku! Zdobądź zwykłe strzały (28) lub Magiczną Kolorową Strzałę (56)!';
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

                // Check if opening Mystery Box (ID: 44) with Right Click (PPM)
                if (activeItemId === 44) {
                    this.openMysteryBox();
                    return;
                }

                // Check if right-clicking ozdobna brama powrotu pod ścianą (na życzenie Tymka!)
                const victoryPortal = this.scene ? this.scene.getObjectByName('victoryPortal') : null;
                if (victoryPortal && this.player && this.player.position.x > 800) {
                    const portalPos = victoryPortal.position;
                    const distToPortal = Math.hypot(this.player.position.x - portalPos.x, this.player.position.z - portalPos.z);
                    if (distToPortal <= 6.5) {
                        playCyberTeleportSound?.();
                        const returnMsg = '🌟 Wracasz do bezpiecznego świata ze zdobytymi skarbami! 🏰✨';
                        eventBus.emit('ui:popup', returnMsg);
                        if (this.ui) this.ui.showPopup(returnMsg);
                        eventBus.emit('dimension:return_to_overworld');
                        return;
                    }
                }

                // Check if right-clicking disguised Dirtik
                const targetAnimal = this.raycastAnimal();
                if (targetAnimal && targetAnimal.type === 'dirtik' && !targetAnimal.isAwakened) {
                    targetAnimal.awaken();
                    return;
                }

                // Check if right-clicking Robot -> cyber-promień i podróż do Mrocznego Wymiaru
                if (targetAnimal && targetAnimal.type === 'robot') {
                    if (typeof targetAnimal.triggerKidnap === 'function') {
                        targetAnimal.triggerKidnap();
                        return;
                    }
                }

                // Check if interacting with a Bear (feeding or mounting with PPM!)
                if (targetAnimal && targetAnimal.type === 'bear') {
                    // Jeśli gracz trzyma jedzenie (zgniłe mięso, jabłko lub surowe mięso: schab, baranina, wołowina) i miś jest ranny -> nakarm misia!
                    const isBearFood = activeItemId === 26 || activeItemId === 23 || activeItemId === 38 || activeItemId === 39 || activeItemId === 40;
                    if (isBearFood && targetAnimal.health < targetAnimal.maxHealth) {
                        if (targetAnimal.feedWithRottenFlesh) {
                            targetAnimal.feedWithRottenFlesh();
                        } else if (targetAnimal.interactWithApple) {
                            targetAnimal.interactWithApple();
                        }
                        eventBus.emit('item:consume');
                        if (this.onItemConsumed) this.onItemConsumed(activeItemId);
                        return;
                    }

                    // Wsiadanie na niedźwiedzia Prawym Przyciskiem Myszy (PPM)!
                    if (this.player) {
                        if (this.player.mountedBear) {
                            this.player.dismountBear();
                            return;
                        }

                        // Groźny Biały Niedźwiedź Polarny (polar) — zbyt dziki, zrzuca gracza!
                        if (targetAnimal.variant === 'polar') {
                            playHitSound();
                            targetAnimal.flashRed();
                            const polarMsg = '🐻‍❄️ Biały Niedźwiedź Polarny jest zbyt dziki i groźny, by na niego wsiąść!';
                            eventBus.emit('ui:popup', polarMsg);
                            if (this.ui) this.ui.showPopup(polarMsg);

                            // Odepchnięcie gracza
                            const kb = this.player.position.clone().sub(targetAnimal.position).setY(0);
                            if (kb.lengthSq() > 0.001) {
                                kb.normalize();
                                this.player.velocity.x += kb.x * 5.5;
                                this.player.velocity.z += kb.z * 5.5;
                            }
                            return;
                        }

                        // Wszystkie pozostałe niedźwiedzie (brunatny, grizzly, czarny, panda itp.): 99% szans na ujeżdżenie!
                        const success = Math.random() < 0.99;
                        if (success) {
                            targetAnimal.spawnHeartParticles?.(0.9);
                            this.player.mountBear(targetAnimal);
                        } else {
                            eventBus.emit('ui:popup', '🐾 Miś się lekko poruszył! Spróbuj wsiąść jeszcze raz (PPM)');
                        }
                        return;
                    }
                }

                // Check if feeding sheep, pig or cow with flowers (ID 17: Rose, ID 18: Dandelion)
                if (targetAnimal && (targetAnimal.type === 'sheep' || targetAnimal.type === 'pig' || targetAnimal.type === 'cow') && (activeItemId === 17 || activeItemId === 18)) {
                    if (targetAnimal.feedWithFlower) {
                        targetAnimal.feedWithFlower(activeItemId);
                    } else if (targetAnimal.interactWithApple) {
                        targetAnimal.interactWithApple();
                    }
                    eventBus.emit('item:consume');
                    const flowerName = (activeItemId === 17) ? 'Czerwoną Różą 🌹' : 'Żółtym Mleczem 🌼';
                    const animalName = (targetAnimal.type === 'sheep') ? 'owcę 🐑' : (targetAnimal.type === 'pig' ? 'świnkę 🐷' : 'krówkę 🐮');
                    const feedMsg = `❤️ Nakarmiono ${animalName} ${flowerName}! Pojawiły się serca!`;
                    eventBus.emit('ui:popup', feedMsg);
                    if (this.onItemConsumed) this.onItemConsumed(activeItemId);
                    if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(feedMsg);
                    return;
                }

                // Check if feeding other animals with apple (ID 23)
                const animal = targetAnimal;
                if (animal && activeItemId === 23) {
                    animal.interactWithApple();
                    eventBus.emit('item:consume');
                    const mobName = animal.type === 'snake' ? 'węża 🐍' : (animal.type === 'sheep' ? 'owcę 🐑' : (animal.type === 'pig' ? 'świnkę 🐷' : (animal.type === 'cow' ? 'krówkę 🐮' : 'zwierzę 🐾')));
                    const feedMsg = `❤️ Nakarmiono ${mobName}! Pojawiły się serca!`;
                    eventBus.emit('ui:popup', feedMsg);
                    if (this.onItemConsumed) this.onItemConsumed(23);
                    if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(feedMsg);
                    return;
                }

                // Eat Food or Drink Water
                if (isFood(activeItemId)) {
                    const foodDef = getItem(activeItemId);
                    const nutrition = foodDef?.nutrition || 2;
                    const heals = foodDef?.heals || 0;

                    if (activeItemId === 45) {
                        playDrinkSound();
                    } else {
                        playEatSound();
                    }

                    eventBus.emit('player:feed', nutrition);
                    if (heals > 0) eventBus.emit('player:heal', heals);
                    eventBus.emit('item:consume');

                    let msg = `🍖 Zjedzono ${foodDef?.name || 'jedzenie'} (+${nutrition} głód)!`;
                    if (activeItemId === 23) {
                        msg = '🍎 Zjedzono jabłko (+4 głód)!';
                    } else if (activeItemId === 38) {
                        msg = '🥩 Zjedzono soczysty schab (+4 głód, +2 HP)!';
                    } else if (activeItemId === 39) {
                        msg = '🍖 Zjedzono surową baraninę (+3 głód, +1 HP)!';
                    } else if (activeItemId === 40) {
                        msg = '🥩 Zjedzono wyborną wołowinę (+5 głód, +3 HP)!';
                    } else if (activeItemId === 45) {
                        msg = '💧 Napiłeś się orzeźwiającej wody (+2 głód, +2 HP)!';
                        const px = Math.floor(this.player.position.x);
                        const pz = Math.floor(this.player.position.z);
                        const biome = this.world?.getBiome ? this.world.getBiome(px, pz) : 'Plains';
                        eventBus.emit('water:drank', { biome });
                    }


                    eventBus.emit('ui:popup', msg);

                    if (this.survival && !this.survival._handledByEvent) {
                        this.survival.feed(nutrition);
                    }
                    if (this.onItemConsumed) this.onItemConsumed(activeItemId);
                    if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(msg);
                    return;
                }

                // Check if using Krzesiwo (Flint & Steel - ID 52) on Totem or Stone Portal
                if (activeItemId === 52) {
                    if (this.currentTarget && this.currentTarget.hit) {
                        const cx = this.currentTarget.x;
                        const cy = this.currentTarget.y;
                        const cz = this.currentTarget.z;
                        const clickedId = this.world.getBlock(cx, cy, cz);

                        let isTotem = false;
                        let dirtY = cy;
                        let stoneY = cy;

                        // Case 1: Clicked Stone (3) with Dirt (2) below
                        if (clickedId === 3 && this.world.getBlock(cx, cy - 1, cz) === 2) {
                            isTotem = true;
                            stoneY = cy;
                            dirtY = cy - 1;
                        }
                        // Case 2: Clicked Dirt (2) with Stone (3) above
                        else if (clickedId === 2 && this.world.getBlock(cx, cy + 1, cz) === 3) {
                            isTotem = true;
                            dirtY = cy;
                            stoneY = cy + 1;
                        }

                        if (isTotem) {
                            const isDefeated = (typeof localStorage !== 'undefined' && localStorage.getItem('m2_boss_robot_defeated') === 'true');
                            if (isDefeated) {
                                const msg = '🏆 Boss Robot został już pokonany na tej mapie! Zresetuj świat w menu, aby zmierzyć się z nim ponownie!';
                                eventBus.emit('ui:popup', msg);
                                if (this.ui) this.ui.showPopup(msg);
                                return;
                            }

                            // Break both totem blocks
                            this.world.setBlock(cx, dirtY, cz, 0);
                            this.world.setBlock(cx, stoneY, cz, 0);

                            playExplosionSound();

                            // Spawn Boss Robot right here!
                            if (this.animals && this.animals.spawnBossRobot) {
                                this.animals.spawnBossRobot(cx + 0.5, cz + 0.5);
                            }

                            startBossRobotMusic();
                            if (this.ui) {
                                this.ui.showBossBar('👑 BOSS ROBOT', 160, 160);
                            }

                            const msg = '🔥🤖 TOTEM ZAPŁONĄŁ! BUDZI SIĘ POTĘŻNY BOSS ROBOT! 🤖🔥';
                            eventBus.emit('ui:popup', msg);
                            if (this.ui) this.ui.showPopup(msg);
                            return;
                        }

                        // Check if activating Pig Portal (Mięsny Portal ze Świniowego Bloku)
                        if (clickedId === 59) {
                            if (this.checkPigPortal(cx, cy, cz)) {
                                playCyberTeleportSound?.();
                                playPigGruntSound?.(true);
                                eventBus.emit('boss:attack_flash', {
                                    color: 0xff3388,
                                    intensity: 4.8,
                                    x: cx,
                                    y: cy + 1,
                                    z: cz
                                });
                                const msg = '🐷🥩 Mięsny portal zapłonął różową energią! Wkraczasz do Królestwa Króla Świń!';
                                eventBus.emit('ui:popup', msg);
                                if (this.ui) {
                                    this.ui.addChatMessage('Portal', '🐷🥩 Mięsny portal otworzył przejście do Królestwa Świń! Strzeż się Króla Świń i jego świty z czerwonymi oczami! 👑🐷', 'chat-server');
                                    this.ui.showPopup(msg);
                                }
                                setTimeout(() => {
                                    eventBus.emit('dimension:enter_pig_kingdom');
                                }, 350);
                                return;
                            } else {
                                playHitSound();
                                const msg = '🔥 Trzask krzesiwa! Zbuduj ramę portalu ze Świniowych Bloków (co najmniej 4 bloki)! 🐷🧱';
                                eventBus.emit('ui:popup', msg);
                                if (this.ui) this.ui.showPopup(msg);
                                return;
                            }
                        }

                        // Check if activating Stone Portal (Portal z kamienia - np. rama 2x2 lub podpalenie pod sobą)
                        if (this.checkStonePortal(cx, cy, cz)) {
                            playCyberTeleportSound?.();
                            eventBus.emit('boss:attack_flash', {
                                color: 0x38bdf8,
                                intensity: 4.8,
                                x: cx,
                                y: cy + 1,
                                z: cz
                            });
                            const msg = '🌌 Brama z kamienia zapłonęła cyber-energią! Wkraczasz do Mrocznego Wymiaru Bossa!';
                            eventBus.emit('ui:popup', msg);
                            if (this.ui) {
                                this.ui.addChatMessage('Portal', '🌌 Brama z kamienia otworzyła przejście do Mrocznego Wymiaru! Zbuduj Totem (Ziemia + Kamień) na arenie, by wezwać Bossa! 🤖⚡', 'chat-server');
                                this.ui.showPopup(msg);
                            }
                            setTimeout(() => {
                                eventBus.emit('dimension:enter_dark');
                            }, 350);
                            return;
                        }

                        if (clickedId === 3 || clickedId === 11) {
                            playHitSound?.();
                            const msg = '🔥 Trzask krzesiwa! Zbuduj ramę portalu z kamienia na 2x2 kratki (co najmniej 4 bloki kamienia)!';
                            eventBus.emit('ui:popup', msg);
                            if (this.ui) this.ui.showPopup(msg);
                            return;
                        }

                        playHitSound?.();
                        const msg = '🔥 Trzask krzesiwa! Zrób portal z kamienia na 2x2 kratki, wejdź do środka i zapal pod sobą, albo zbuduj Totem!';
                        eventBus.emit('ui:popup', msg);
                        if (this.ui) this.ui.showPopup(msg);
                        return;
                    }
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

        // Keyboard shortcut for cycling wand spells and targeting
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyX' || e.code === 'KeyZ' || e.code === 'KeyR') {
                const activeId = this.getActiveBlockId ? this.getActiveBlockId() : 0;
                if (activeId === 50) {
                    this.cycleWandSpell();
                }
            }
            if (e.code === 'KeyT') {
                this.cycleHomingTarget();
            }
        });

        // Nasłuchiwanie zdarzenia przełączania czaru różdżki
        eventBus.on('wand:cycle_spell', () => {
            const activeId = this.getActiveBlockId ? this.getActiveBlockId() : 0;
            if (activeId === 50) {
                this.cycleWandSpell();
            }
        });

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

        const activeItemId = this.getActiveBlockId ? this.getActiveBlockId() : 0;
        const isRainbowBow = activeItemId === 55;

        if (this.bowCharge >= 0.15) {
            const hasRainbowArrow = this.ui ? this.ui.hasItem(56) : false;
            let shotRainbowArrow = false;

            if (hasRainbowArrow) {
                if (this.ui) {
                    this.ui.consumeItem(56, 1);
                } else {
                    eventBus.emit('item:consume_specific', { id: 56, amount: 1 });
                }
                shotRainbowArrow = true;
            } else {
                let consumed = false;
                if (this.ui) {
                    consumed = this.ui.consumeItem(28, 1);
                } else {
                    eventBus.emit('item:consume_specific', { id: 28, amount: 1 });
                    consumed = true;
                }
                if (!consumed) {
                    const msg = '⚠️ Brak strzał w ekwipunku!';
                    eventBus.emit('ui:popup', msg);
                    if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(msg);
                    this.cancelBowDraw();
                    return;
                }
            }

            playBowShootSound();
            const dir = new THREE.Vector3();
            this.camera.getWorldDirection(dir);
            const origin = this.camera.position.clone().addScaledVector(dir, 0.4);

            if (shotRainbowArrow) {
                playRainbowChimeSound();
                if (this.animals && typeof this.animals.spawnHomingRainbowArrow === 'function') {
                    this.animals.spawnHomingRainbowArrow(origin, dir, this.lockedTargetMob);
                }
                this.bowRecoil = 0.20;
                const msg = '🌈🎯 Wystrzelono Samonaprowadzającą Kolorową Strzałę! (Nigdy nie pudłuje i powraca!)';
                eventBus.emit('ui:popup', msg);
                if (this.ui) this.ui.showPopup(msg);
            } else {
                const baseDmg = isRainbowBow ? 12 : 4;
                const extraDmg = isRainbowBow ? 12 : 6;
                const damage = Math.round(baseDmg + this.bowCharge * extraDmg);
                const speed = 20.0 + this.bowCharge * 20.0;

                if (this.animals && this.animals.spawnArrow) {
                    const arrow = this.animals.spawnArrow(origin, dir, 'player', damage);
                    if (arrow) {
                        arrow.velocity = dir.clone().multiplyScalar(speed);
                        arrow.sourceBowId = isRainbowBow ? 55 : 29;
                    }
                }
                this.bowRecoil = 0.14;

                if (this.bowCharge >= 0.9) {
                    const msg = isRainbowBow ? '🌈🏹 Potężny strzał z Kolorowego Łuku! (24 obrażenia)' : '🏹 Maksymalny strzał z łuku! (10 obrażeń)';
                    eventBus.emit('ui:popup', msg);
                    if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(msg);
                }
            }
        }

        this.cancelBowDraw();
    }

    cycleHomingTarget() {
        if (!this.animals || !Array.isArray(this.animals.animals)) return;
        const monsters = this.animals.animals.filter(m => {
            if (!m || m.isDead || !m.position) return false;
            return m.type === 'boss_robot' || m.type === 'robot' || m.type === 'zombie' || m.type === 'skeleton' || m.type === 'creeper' || m.type === 'dirtik';
        });

        if (monsters.length === 0) {
            const msg = '🔍 Skaner: Brak wrogich potworów na świecie! Świat jest bezpieczny! 🌸';
            eventBus.emit('ui:popup', msg);
            if (this.ui) this.ui.showPopup(msg);
            this.lockedTargetMob = null;
            return;
        }

        if (this.lockedTargetIdx === undefined) this.lockedTargetIdx = -1;
        this.lockedTargetIdx = (this.lockedTargetIdx + 1) % monsters.length;
        this.lockedTargetMob = monsters[this.lockedTargetIdx];

        const dist = this.player ? Math.round(this.player.position.distanceTo(this.lockedTargetMob.position)) : 0;
        let enemyName = this.lockedTargetMob.type;
        if (this.lockedTargetMob.type === 'boss_robot') enemyName = '👑 Mega Boss Robot (4 ramiona)';
        else if (this.lockedTargetMob.type === 'robot') enemyName = '🤖 Robot Transformer';
        else if (this.lockedTargetMob.type === 'zombie') enemyName = '🧟 Zombie';
        else if (this.lockedTargetMob.type === 'skeleton') enemyName = '🏹 Szkielet';
        else if (this.lockedTargetMob.type === 'creeper') enemyName = '💥 Creeper';
        else if (this.lockedTargetMob.type === 'dirtik') enemyName = '🐗 Dirtik';

        playRainbowChimeSound();
        const msg = `🎯 NAMIERZONO [${this.lockedTargetIdx + 1}/${monsters.length}]: ${enemyName} | HP: ${this.lockedTargetMob.health}/${this.lockedTargetMob.maxHealth} | ${dist}m [Naciśnij T by zmienić cel]`;
        eventBus.emit('ui:popup', msg);
        if (this.ui) this.ui.showPopup(msg);
    }

    openMysteryBox() {
        eventBus.emit('item:consume');
        eventBus.emit('mystery_box:opened');
        if (this.onItemConsumed) this.onItemConsumed(44);


        // Sound effect: joyful C5-E5-G5-C6 arpeggio chime!
        try {
            const audioCtx = window._audioCtx || new (window.AudioContext || window.webkitAudioContext)();
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.08);
                gain.gain.setValueAtTime(0.25, audioCtx.currentTime + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.08 + 0.35);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(audioCtx.currentTime + idx * 0.08);
                osc.stop(audioCtx.currentTime + idx * 0.08 + 0.35);
            });
        } catch (e) {}

        // Surprise Loot Table
        const lootTable = [
            { id: 34, name: 'Rubin', count: 3, icon: '🔴', rarity: 'Legendarny!' },
            { id: 35, name: 'Rubinowy Miecz', count: 1, icon: '🗡️', rarity: 'Mityczny Jackpot!' },
            { id: 30, name: 'Diament', count: 5, icon: '💎', rarity: 'Epicki!' },
            { id: 31, name: 'Diamentowy Miecz', count: 1, icon: '⚔️', rarity: 'Epicki!' },
            { id: 32, name: 'Diamentowa Zbroja', count: 1, icon: '🛡️', rarity: 'Epicki!' },
            { id: 33, name: 'Diamentowy Kilof', count: 1, icon: '⛏️', rarity: 'Rzadki!' },
            { id: 43, name: 'Kamienna Zbroja', count: 1, icon: '🛡️', rarity: 'Fajny!' },
            { id: 23, name: 'Jabłko', count: 8, icon: '🍎', rarity: 'Pyszny!' },
            { id: 40, name: 'Surowa Wołowina', count: 6, icon: '🥩', rarity: 'Pyszny!' }
        ];

        const prize = lootTable[Math.floor(Math.random() * lootTable.length)];

        // Add to inventory
        if (this.ui) {
            this.ui.addItem(prize.id, prize.name, prize.count);
        } else {
            eventBus.emit('item:add', { id: prize.id, name: prize.name, count: prize.count });
        }

        const msg = `🎁 Otwarto Mystery Boxa! Zdobyto: +${prize.count}x ${prize.name} ${prize.icon} (${prize.rarity})`;
        eventBus.emit('ui:popup', msg);
        if (this.ui) {
            this.ui.showPopup(msg);
            if (this.ui.addChatMessage) {
                this.ui.addChatMessage('Mystery Box', `🎉 Wylosowano: +${prize.count}x ${prize.name} ${prize.icon} [${prize.rarity}]`, 'chat-success');
            }
        }
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

    cycleWandSpell() {
        this.currentWandSpellIdx = (this.currentWandSpellIdx + 1) % this.wandSpells.length;
        const spell = this.wandSpells[this.currentWandSpellIdx];
        playSwingSound();
        const msg = `🪄 Czar Różdżki: ${spell.name}! (${spell.desc}) [LPM: rzuć, PPM / V / X: zmiana]`;
        eventBus.emit('ui:popup', msg);
        if (this.ui) this.ui.showPopup(msg);
    }

    castMagicWand() {
        const activeItemId = this.getActiveBlockId ? this.getActiveBlockId() : 0;
        if (activeItemId !== 50) return;

        if (this.magicWandCooldown > 0) return;
        this.magicWandCooldown = 0.35;

        this.triggerSwing();

        const origin = this.camera.position.clone();
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        origin.addScaledVector(dir, 0.4);

        const currentSpell = this.wandSpells[this.currentWandSpellIdx];

        if (this.animals && typeof this.animals.shootMagicStoneSpell === 'function') {
            this.animals.shootMagicStoneSpell(origin, dir, currentSpell.id, this.player);
        }

        eventBus.emit('wand:spell_cast', { type: currentSpell.id });

        const msg = `🪄 Rzucono czar: ${currentSpell.name}!`;
        eventBus.emit('ui:popup', msg);
        if (this.ui && !this.ui._handledByEvent) {
            this.ui.showPopup(msg);
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
        // Piorunowe bloki (53), Bedrock (14) oraz całe areny Bossów są niezniszczalne na życzenie Tymka!
        const isArenaBlock = (x >= 980 && x <= 1020 && z >= 980 && z <= 1020);
        const isArenaStructure = isArenaBlock && (blockId === 14 || blockId === 53 || blockId === 51 || blockId === 12 || y <= 11 || y >= 20 || Math.hypot(x - 1000, z - 1000) >= 13.5);
        const isPigArenaBlock = (x >= 1980 && x <= 2020 && z >= 1980 && z <= 2020);
        const isPigArenaStructure = isPigArenaBlock && (blockId === 14 || blockId === 59 || y <= 11 || y >= 20 || Math.hypot(x - 2000, z - 2000) >= 13.5);
        if (blockId === 14 || blockId === 53 || isArenaStructure || isPigArenaStructure) {
            playHitSound();
            const msg = '🛡️ Bloki w królestwach bossów oraz bloki piorunowe są niezniszczalne!';
            eventBus.emit('ui:popup', msg);
            if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(msg);
            return;
        }

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

        if (blockId === 17) {
            const msg = '🌹 Zerwano Czerwoną Różę!';
            eventBus.emit('ui:popup', msg);
            if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(msg);
        } else if (blockId === 18) {
            const msg = '🌼 Zerwano Żółtego Mlecza!';
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

        // Flower planting check: only on grass (1) or dirt (2)
        const isFlower = (activeItemId === 17 || activeItemId === 18);
        if (isFlower) {
            const blockBelow = this.world.getBlock(placeX, placeY - 1, placeZ);
            if (blockBelow !== 1 && blockBelow !== 2) {
                const msg = '🌸 Kwiaty można sadzić tylko na trawie lub ziemi!';
                eventBus.emit('ui:popup', msg);
                if (this.ui && !this.ui._handledByEvent) this.ui.showPopup(msg);
                return;
            }
        }

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

        if (intersectsPlayer && !isFlower) {
            return; // Don't place solid blocks inside player
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

        // Tymek: "jednym blokiem i jak go położysz to od razu cię teleportuje do Króla Świń!"
        if (activeItemId === 59) {
            playCyberTeleportSound?.();
            playPigGruntSound?.(true);
            eventBus.emit('boss:attack_flash', {
                color: 0xf472b6,
                intensity: 4.8,
                x: placeX,
                y: placeY + 1,
                z: placeZ
            });
            eventBus.emit('ui:popup', '🐷👑 Świniowy Blok zapłonął magią! Teleportacja do Króla Świń! 🌀');
            if (this.ui) {
                this.ui.showPopup('🐷👑 Świniowy Blok zapłonął magią! Teleportacja do Króla Świń! 🌀');
            }
            setTimeout(() => {
                eventBus.emit('dimension:enter_pig_kingdom');
            }, 300);
        }

        eventBus.emit('item:consume');
        if (this.onBlockPlaced) {
            this.onBlockPlaced(activeItemId);
        }

        this.currentTarget = this.raycastVoxels();
        this.updateHighlight();
    }

    checkStonePortal(cx, cy, cz) {
        if (!this.world) return false;
        const isStone = (id) => id === 3 || id === 11;
        const centerId = this.world.getBlock(cx, cy, cz);

        // Count stone/cobblestone blocks in 5x5x6 neighborhood around clicked position
        let stoneCount = 0;
        for (let ox = -2; ox <= 2; ox++) {
            for (let oy = -1; oy <= 3; oy++) {
                for (let oz = -2; oz <= 2; oz++) {
                    if (isStone(this.world.getBlock(cx + ox, cy + oy, cz + oz))) {
                        stoneCount++;
                    }
                }
            }
        }

        // Case 1: Clicked directly on a stone/cobblestone block with at least 4 stone blocks around
        if (isStone(centerId) && stoneCount >= 4) {
            return true;
        }

        // Case 2: Clicked floor inside portal opening ("zapal pod sobą krzesiwem")
        // Check if there is air above the clicked floor block for the player to enter (cy+1 and cy+2)
        const airAbove1 = this.world.getBlock(cx, cy + 1, cz) === 0;
        const airAbove2 = this.world.getBlock(cx, cy + 2, cz) === 0;
        if (airAbove1 && airAbove2 && stoneCount >= 4) {
            return true;
        }

        // Case 3: Player standing inside portal opening and clicked nearby ground/frame
        if (this.player && this.player.camera) {
            const px = Math.floor(this.player.camera.position.x);
            const py = Math.floor(this.player.camera.position.y);
            const pz = Math.floor(this.player.camera.position.z);
            let pStoneCount = 0;
            for (let ox = -2; ox <= 2; ox++) {
                for (let oy = -2; oy <= 2; oy++) {
                    for (let oz = -2; oz <= 2; oz++) {
                        if (isStone(this.world.getBlock(px + ox, py + oy, pz + oz))) {
                            pStoneCount++;
                        }
                    }
                }
            }
            if (pStoneCount >= 4) {
                return true;
            }
        }

        return false;
    }

    checkPigPortal(cx, cy, cz) {
        if (!this.world) return false;
        const isPigBlock = (id) => id === 59;
        const centerId = this.world.getBlock(cx, cy, cz);
        if (!isPigBlock(centerId)) return false;

        // Count pig blocks in 5x5x5 neighborhood around clicked position
        let pigCount = 0;
        for (let ox = -2; ox <= 2; ox++) {
            for (let oy = -2; oy <= 3; oy++) {
                for (let oz = -2; oz <= 2; oz++) {
                    if (isPigBlock(this.world.getBlock(cx + ox, cy + oy, cz + oz))) {
                        pigCount++;
                    }
                }
            }
        }
        // A doorway / frame needs at least 4 pig blocks
        return pigCount >= 4;
    }

    spawnBreakParticles(x, y, z, blockId) {
        let pColor = 0x866043;
        if (blockId === 1) pColor = 0x588c34;
        if (blockId === 3) pColor = 0x808080;
        if (blockId === 4) pColor = 0x6c5333;
        if (blockId === 5) pColor = 0x365e1d;
        if (blockId === 6) pColor = 0xdbcd98;
        if (blockId === 7) pColor = 0xf0f5f5;
        if (blockId === 59) pColor = 0xf0809b;

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
                const activeItemId = this.getActiveBlockId ? this.getActiveBlockId() : 0;
                const chargeDuration = (activeItemId === 55) ? 0.35 : 0.70;
                this.bowDrawTime += dt;
                this.bowCharge = Math.min(1.0, this.bowDrawTime / chargeDuration);

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

        if (this.magicWandCooldown > 0) {
            this.magicWandCooldown -= dt;
        }

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
