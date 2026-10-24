import * as THREE from 'three';
import { Pig, Sheep, Snake, Bear, Cow } from './mobs/passive.js?v=drops_1';
import { Zombie, Skeleton, Creeper, Dirtik, Robot, BossRobot, MiniRobot } from './mobs/hostile.js?v=portal_boss_v5';

import { FlyingArrow, ThrownGunpowder, MagicStoneSpell, HomingRainbowArrow } from './projectile.js?v=epic_rainbow_1';
import { WORLD_SIZE_X, WORLD_SIZE_Z, WORLD_HEIGHT } from '../world.js';
import { eventBus } from '../events.js';

export class EntityManager {
    constructor(scene, world, player = null) {
        this.scene = scene;
        this.world = world;
        this.player = player;
        this.animals = [];
        this.arrows = [];
        this.thrownProjectiles = [];

        // Optional direct references for backward-compatibility
        this.survival = null;
        this.drops = null;
        this.ui = null;

        // Death poof particles
        this.deathParticles = [];
        this.deathGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        this.deathMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });

        this.spawnInitialAnimals();

        // Expose globally for convenience
        if (typeof window !== 'undefined') {
            window.killSnakesExceptOne = () => this.killSnakesExceptOne();
            window.spawnCow = () => this.spawnPassiveNear(this.player?.position?.x || 32, this.player?.position?.z || 32, 'cow', 2, 4);
        }
    }

    spawnInitialAnimals() {
        // 1. Zwierzęta gospodarskie (świnie, owce, krowy)
        const spawnData = [
            { x: 28, z: 28, type: 'pig' },
            { x: 36, z: 25, type: 'sheep' },
            { x: 22, z: 36, type: 'cow' },
            { x: 38, z: 45, type: 'sheep' },
            { x: 34, z: 20, type: 'cow' },
            { x: 42, z: 32, type: 'pig' }
        ];

        for (const data of spawnData) {
            let animal = null;
            if (data.type === 'pig') animal = new Pig(this.scene, this.world, data.x, data.z, this);
            else if (data.type === 'sheep') animal = new Sheep(this.scene, this.world, data.x, data.z, this);
            else if (data.type === 'cow') animal = new Cow(this.scene, this.world, data.x, data.z, this);
            if (animal) this.animals.push(animal);
        }

        // 2. DOKŁADNIE 1 WĄŻ w całym świecie (obok gracza lub w bazie)
        if (this.player && this.player.position) {
            this.spawnSnakeNearPlayer(this.player, 3.5, 1.5);
        } else {
            const singleSnake = new Snake(this.scene, this.world, 30, 30, this);
            this.animals.push(singleSnake);
        }

        // Gwarancja: jeśli z jakiegokolwiek powodu jest więcej niż 1 wąż, zabij wszystkie oprócz 1
        this.killSnakesExceptOne();

        // 3. Początkowy Creeper wędrujący daleko po świecie
        const creeper = new Creeper(this.scene, this.world, 48, 48, this);
        this.animals.push(creeper);

        // 4. Początkowe ukryte Dirtiki (więcej Dirtików na prośbę gracza!)
        const startX = (this.player && this.player.position) ? this.player.position.x : 32;
        const startZ = (this.player && this.player.position) ? this.player.position.z : 32;
        this.spawnDirtikNear(startX, startZ, 18, 32);
        this.spawnDirtikNear(startX, startZ, 25, 42);

        // 4b. Początkowe ukryte Roboty Transformery (więcej Robotów na prośbę gracza!)
        this.spawnRobotNear(startX, startZ, 16, 26);
        this.spawnRobotNear(startX, startZ, 24, 38);


        // 5. Dokładnie 1 oswojony, przyjazny Niedźwiedź Brunatny tuż obok gracza (3-4 bloki) do natychmiastowej jazdy!
        const starterBear = this.spawnBearNear(startX, startZ, 'brown', 3.0, 4.5);
        if (starterBear) {
            starterBear.isTamed = true;
            console.log(`[EntityManager] Zespawnowano startowego oswojonego Niedźwiedzia Brunatnego tuż obok gracza!`);
        }

        // Pozostałe niedźwiedzie rozproszone daleko w świecie (25-50 bloków od gracza)
        const otherBearVariants = ['polar', 'black', 'panda', 'grizzly'];
        for (let i = 0; i < otherBearVariants.length; i++) {
            this.spawnBearNear(startX, startZ, otherBearVariants[i], 26 + i * 5, 42 + i * 5);
        }
    }

    getGroundHeight(x, z) {
        const bx = Math.floor(x);
        const bz = Math.floor(z);
        for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
            const block = this.world.getBlock(bx, y, bz);
            if (block === 5) continue; // Skip tree leaves
            if (this.world.isSolid(bx, y, bz)) {
                return y + 1;
            }
        }
        return 10;
    }

    spawnDirtikNear(centerX, centerZ, minDist = 8, maxDist = 20) {
        for (let attempt = 0; attempt < 25; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = minDist + Math.random() * (maxDist - minDist);
            const bx = Math.floor(centerX + Math.cos(angle) * dist);
            const bz = Math.floor(centerZ + Math.sin(angle) * dist);

            const gy = this.getGroundHeight(bx, bz);
            const groundBlockId = this.world.getBlock(bx, gy - 1, bz);

            // Must be solid land (Grass, Dirt, Stone, Sand, Cobble, etc.), NOT water (10) or leaves (5)
            if (!groundBlockId || groundBlockId === 10 || groundBlockId === 5) continue;
            // Space above ground block must be air
            if (this.world.getBlock(bx, gy, bz) !== 0 || this.world.getBlock(bx, gy + 1, bz) !== 0) continue;

            // Check if too close to another active animal
            const tooClose = this.animals.some(a => !a.isDead && Math.hypot(a.position.x - (bx + 0.5), a.position.z - (bz + 0.5)) < 2.0);
            if (tooClose) continue;

            const dirtik = new Dirtik(this.scene, this.world, bx + 0.5, bz + 0.5, this);
            this.animals.push(dirtik);
            console.log(`[EntityManager] Zespawnowano ukrytego Dirtika na (${(bx + 0.5).toFixed(1)}, gy=${gy}, ${(bz + 0.5).toFixed(1)})`);
            return dirtik;
        }
        return null;
    }

    spawnRobotNear(centerX, centerZ, minDist = 16, maxDist = 32) {
        for (let attempt = 0; attempt < 25; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = minDist + Math.random() * (maxDist - minDist);
            const bx = Math.floor(centerX + Math.cos(angle) * dist);
            const bz = Math.floor(centerZ + Math.sin(angle) * dist);

            const gy = this.getGroundHeight(bx, bz);
            const groundBlockId = this.world.getBlock(bx, gy - 1, bz);
            if (groundBlockId <= 0 || groundBlockId === 10) continue; // Not in water

            const robot = new Robot(this.scene, this.world, bx + 0.5, bz + 0.5, this);
            this.animals.push(robot);
            console.log(`[EntityManager] Zespawnowano ukrytego Robota na (${(bx + 0.5).toFixed(1)}, gy=${gy}, ${(bz + 0.5).toFixed(1)})`);
            return robot;
        }
        return null;
    }

    spawnRobotInFrontOfPlayer(player = this.player, distance = 4.0) {
        if (!player) return null;
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, player.rotation.y, 0, 'YXZ'));
        const px = Math.floor(player.position.x + forward.x * distance) + 0.5;
        const pz = Math.floor(player.position.z + forward.z * distance) + 0.5;
        const robot = new Robot(this.scene, this.world, px, pz, this);
        this.animals.push(robot);
        console.log(`[EntityManager] Zespawnowano ukrytego Robota na wprost gracza na (${px.toFixed(1)}, ${pz.toFixed(1)})`);
        return robot;
    }

    spawnBossRobot(x, z) {
        const boss = new BossRobot(this.scene, this.world, x, z, this);
        this.animals.push(boss);
        console.log(`[EntityManager] Zespawnowano Bossa Robota na (${x.toFixed(1)}, ${z.toFixed(1)})!`);
        return boss;
    }

    spawnMiniRobot(x, z) {
        const mini = new MiniRobot(this.scene, this.world, x, z, this);
        this.animals.push(mini);
        console.log(`[EntityManager] Zespawnowano Małego Robocika na (${x.toFixed(1)}, ${z.toFixed(1)})!`);
        return mini;
    }


    findClosestBear(pos, maxDist = 4.0) {
        if (!pos) return null;
        let closest = null;
        let minDist = maxDist;
        for (const animal of this.animals) {
            if (!animal || animal.isDead || animal.type !== 'bear') continue;
            const dist = animal.position.distanceTo(pos);
            if (dist < minDist) {
                minDist = dist;
                closest = animal;
            }
        }
        return closest;
    }

    spawnBearNear(centerX, centerZ, variant = 'polar', minDist = 6, maxDist = 20) {
        for (let attempt = 0; attempt < 25; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = minDist + Math.random() * (maxDist - minDist);
            const bx = Math.floor(centerX + Math.cos(angle) * dist);
            const bz = Math.floor(centerZ + Math.sin(angle) * dist);

            const gy = this.getGroundHeight(bx, bz);
            const groundBlockId = this.world.getBlock(bx, gy - 1, bz);

            if (!groundBlockId || groundBlockId === 10 || groundBlockId === 5) continue;
            if (this.world.getBlock(bx, gy, bz) !== 0 || this.world.getBlock(bx, gy + 1, bz) !== 0) continue;

            const bear = new Bear(this.scene, this.world, bx + 0.5, bz + 0.5, this, variant);
            this.animals.push(bear);
            console.log(`[EntityManager] Zespawnowano niedźwiedzia (${variant}) na (${(bx + 0.5).toFixed(1)}, gy=${gy}, ${(bz + 0.5).toFixed(1)})`);
            return bear;
        }
        return null;
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
        for (let i = 1; i < snakes.length; i++) {
            snakes[i].die();
            killedCount++;
        }
        console.log(`[EntityManager] Zabito/usunięto ${killedCount} nadmiarowych węży. W świecie pozostał dokładnie 1 wąż.`);
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

    spawnPassiveNear(centerX, centerZ, type = 'cow', minDist = 15, maxDist = 35) {
        for (let attempt = 0; attempt < 25; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = minDist + Math.random() * (maxDist - minDist);
            const bx = Math.floor(centerX + Math.cos(angle) * dist);
            const bz = Math.floor(centerZ + Math.sin(angle) * dist);

            const gy = this.getGroundHeight(bx, bz);
            const groundBlockId = this.world.getBlock(bx, gy - 1, bz);

            if (!groundBlockId || groundBlockId === 10 || groundBlockId === 5) continue;
            if (this.world.getBlock(bx, gy, bz) !== 0) continue;

            let animal = null;
            if (type === 'cow') animal = new Cow(this.scene, this.world, bx + 0.5, bz + 0.5, this);
            else if (type === 'sheep') animal = new Sheep(this.scene, this.world, bx + 0.5, bz + 0.5, this);
            else if (type === 'pig') animal = new Pig(this.scene, this.world, bx + 0.5, bz + 0.5, this);

            if (animal) {
                this.animals.push(animal);
                console.log(`[EntityManager] Zespawnowano ${type} na (${(bx + 0.5).toFixed(1)}, gy=${gy}, ${(bz + 0.5).toFixed(1)})`);
                return animal;
            }
        }
        return null;
    }

    spawnSnakeNearPlayer(player = this.player, offsetX = 3.0, offsetZ = 2.0) {
        if (!player || !player.position) return null;
        const px = player.position.x + offsetX;
        const pz = player.position.z + offsetZ;
        const snake = new Snake(this.scene, this.world, px, pz, this);
        this.animals.push(snake);
        console.log(`[EntityManager] Zespawnowano pomarańczowego węża obok gracza na (${px.toFixed(1)}, ${pz.toFixed(1)})`);
        return snake;
    }

    spawnBabySnake(x, z) {
        const baby = new Snake(this.scene, this.world, x, z, this, true);
        baby.isTamed = true;
        this.animals.push(baby);
        console.log(`[EntityManager] Pojawił się mały wąż (Baby Snake) na (${x.toFixed(1)}, ${z.toFixed(1)})!`);
        return baby;
    }

    spawnZombieInFrontOfPlayer(player = this.player, distance = 5.0, hasHelmet = false) {
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
        const px = player.position.x + dirX * distance;
        const pz = player.position.z + dirZ * distance;
        const zombie = new Zombie(this.scene, this.world, px, pz, this, hasHelmet);
        this.animals.push(zombie);
        console.log(`[EntityManager] Zespawnowano Zombie na wprost gracza na (${px.toFixed(1)}, ${pz.toFixed(1)}) z hełmem=${hasHelmet}`);
        return zombie;
    }

    spawnSkeletonInFrontOfPlayer(player = this.player, distance = 7.5, hasHelmet = false) {
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
        const px = player.position.x + dirX * distance;
        const pz = player.position.z + dirZ * distance;
        const skeleton = new Skeleton(this.scene, this.world, px, pz, this, hasHelmet);
        this.animals.push(skeleton);
        console.log(`[EntityManager] Zespawnowano Szkieleta na wprost gracza na (${px.toFixed(1)}, ${pz.toFixed(1)}) z hełmem=${hasHelmet}`);
        return skeleton;
    }

    spawnCreeperInFrontOfPlayer(player = this.player, distance = 6.0) {
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
        const px = player.position.x + dirX * distance;
        const pz = player.position.z + dirZ * distance;
        const creeper = new Creeper(this.scene, this.world, px, pz, this);
        this.animals.push(creeper);
        console.log(`[EntityManager] Zespawnowano Creepera na wprost gracza na (${px.toFixed(1)}, ${pz.toFixed(1)})`);
        return creeper;
    }

    spawnDirtikInFrontOfPlayer(player = this.player, distance = 4.0) {
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
        const px = player.position.x + dirX * distance;
        const pz = player.position.z + dirZ * distance;
        const dirtik = new Dirtik(this.scene, this.world, px, pz, this);
        this.animals.push(dirtik);
        console.log(`[EntityManager] Zespawnowano ukrytego Dirtika na wprost gracza na (${px.toFixed(1)}, ${pz.toFixed(1)})`);
        return dirtik;
    }

    spawnArrow(origin, direction, shooter = 'skeleton', damage = 5) {
        const arrow = new FlyingArrow(this.scene, this.world, origin, direction, shooter, damage);
        this.arrows.push(arrow);
        return arrow;
    }

    spawnHomingRainbowArrow(origin, direction, targetMob = null) {
        const arrow = new HomingRainbowArrow(this.scene, this.world, origin, direction, targetMob, this);
        this.arrows.push(arrow);
        return arrow;
    }

    spawnThrownGunpowder(origin, direction) {
        const bomb = new ThrownGunpowder(this.scene, this.world, origin, direction, this);
        this.thrownProjectiles.push(bomb);
        return bomb;
    }

    shootMagicStoneSpell(origin, direction, spellType = 'lightning') {
        const spell = new MagicStoneSpell(this.scene, this.world, origin, direction, this, spellType);
        this.thrownProjectiles.push(spell);
        return spell;
    }

    update(dt, playerPosition = null, isDay = true) {
        // Automatyczne utrzymywanie maksymalnie 1 węża na świecie
        const snakes = this.animals.filter(a => a.type === 'snake');
        if (snakes.length > 1) {
            this.killSnakesExceptOne();
        }

        // W Mrocznym Wymiarze Bossa Robota nie spawnują się żadne potwory ani zwierzęta ("Żadne potwory się nie pokazują na tej mapie")
        const inDarkDimension = Boolean(playerPosition && playerPosition.x > 800);

        if (!inDarkDimension) {
            // Zarządzanie populacją Zombie (wyłącznie w nocy)
        if (!isDay && playerPosition) {
            const zombieCount = this.animals.filter(a => a.type === 'zombie' && !a.isDead).length;
            this.zombieSpawnTimer = (this.zombieSpawnTimer || 0) + dt;

            // W nocy spawnuje się do 3 Zombie bez hełmu
            if (zombieCount < 3 && this.zombieSpawnTimer >= 8.0) {
                this.zombieSpawnTimer = 0;
                const angle = Math.random() * Math.PI * 2;
                const dist = 12 + Math.random() * 8;
                const zx = playerPosition.x + Math.cos(angle) * dist;
                const zz = playerPosition.z + Math.sin(angle) * dist;
                const zombie = new Zombie(this.scene, this.world, zx, zz, this, false);
                this.animals.push(zombie);
                console.log(`[Monster] Nocny Zombie pojawił się na (${zx.toFixed(1)}, ${zz.toFixed(1)})!`);
                eventBus.emit('ui:popup', '🧟 W ciemności nocy pojawił się Zombie!');
                if (this.ui) this.ui.showPopup('🧟 W ciemności nocy pojawił się Zombie!');
            }
        } else {
            this.zombieSpawnTimer = 0;
        }

        // Zarządzanie populacją Szkieletów (wyłącznie w nocy)
        if (!isDay && playerPosition) {
            const skeletonCount = this.animals.filter(a => a.type === 'skeleton' && !a.isDead).length;
            this.skeletonSpawnTimer = (this.skeletonSpawnTimer || 0) + dt;

            // W nocy spawnuje się do 2 Szkieletów bez hełmu
            if (skeletonCount < 2 && this.skeletonSpawnTimer >= 10.0) {
                this.skeletonSpawnTimer = 0;
                const angle = Math.random() * Math.PI * 2;
                const dist = 14 + Math.random() * 8;
                const sx = playerPosition.x + Math.cos(angle) * dist;
                const sz = playerPosition.z + Math.sin(angle) * dist;
                const skeleton = new Skeleton(this.scene, this.world, sx, sz, this, false);
                this.animals.push(skeleton);
                console.log(`[Monster] Nocny Szkielet pojawił się na (${sx.toFixed(1)}, ${sz.toFixed(1)})!`);
                eventBus.emit('ui:popup', '🏹 W ciemności nocy pojawił się Szkielet z łukiem!');
                if (this.ui) this.ui.showPopup('🏹 W ciemności nocy pojawił się Szkielet z łukiem!');
            }
        } else {
            this.skeletonSpawnTimer = 0;
        }

        // Zarządzanie populacją Creeperów (wyłącznie w nocy)
        if (!isDay && playerPosition) {
            const creeperCount = this.animals.filter(a => a.type === 'creeper' && !a.isDead).length;
            this.creeperSpawnTimer = (this.creeperSpawnTimer || 0) + dt;

            // W nocy spawnuje się do 2 Creeperów
            if (creeperCount < 2 && this.creeperSpawnTimer >= 12.0) {
                this.creeperSpawnTimer = 0;
                const angle = Math.random() * Math.PI * 2;
                const dist = 14 + Math.random() * 8;
                const cx = playerPosition.x + Math.cos(angle) * dist;
                const cz = playerPosition.z + Math.sin(angle) * dist;
                const creeper = new Creeper(this.scene, this.world, cx, cz, this);
                this.animals.push(creeper);
                console.log(`[Monster] Nocny Creeper pojawił się na (${cx.toFixed(1)}, ${cz.toFixed(1)})!`);
                eventBus.emit('ui:popup', '🟩 W ciemności nocy pojawił się cichy Creeper!');
                if (this.ui) this.ui.showPopup('🟩 W ciemności nocy pojawił się cichy Creeper!');
            }
        } else {
            this.creeperSpawnTimer = 0;
        }

        // Zarządzanie populacją Dirtików (za dnia i w nocy - jako ukryte klocki na powierzchni)
        if (playerPosition) {
            const dirtiks = this.animals.filter(a => a.type === 'dirtik' && !a.isDead);
            // Usuń Dirtiki, które są za daleko od gracza (> 50m), żeby nie blokowały limitu
            for (const d of dirtiks) {
                if (d.position.distanceTo(playerPosition) > 50) {
                    d.die();
                }
            }

            const activeDirtiks = this.animals.filter(a => a.type === 'dirtik' && !a.isDead);
            this.dirtikSpawnTimer = (this.dirtikSpawnTimer || 0) + dt;

            // Utrzymuj do 4 ukrytych Dirtików w świecie, w bezpiecznej odległości (20-45m)
            if (activeDirtiks.length < 4 && this.dirtikSpawnTimer >= 14.0) {
                this.dirtikSpawnTimer = 0;
                this.spawnDirtikNear(playerPosition.x, playerPosition.z, 20, 45);
            }

            // Utrzymuj do 3 ukrytych Robotów Transformerów w świecie (18-38m)
            const activeRobots = this.animals.filter(a => a.type === 'robot' && !a.isDead);
            this.robotSpawnTimer = (this.robotSpawnTimer || 0) + dt;
            if (activeRobots.length < 3 && this.robotSpawnTimer >= 16.0) {
                this.robotSpawnTimer = 0;
                this.spawnRobotNear(playerPosition.x, playerPosition.z, 18, 38);
            }


            // Utrzymuj do 3-4 niedźwiedzi w całym świecie, pojawiających się w oddali (25-50m)
            const activeBears = this.animals.filter(a => a.type === 'bear' && !a.isDead);
            this.bearSpawnTimer = (this.bearSpawnTimer || 0) + dt;
            if (activeBears.length < 3 && this.bearSpawnTimer >= 30.0) {
                this.bearSpawnTimer = 0;
                const pool = ['polar', 'brown', 'black', 'panda', 'grizzly', 'kermode'];
                const chosen = pool[Math.floor(Math.random() * pool.length)];
                this.spawnBearNear(playerPosition.x, playerPosition.z, chosen, 25, 50);
            }

            // Utrzymuj do 5-6 zwierząt gospodarskich (świnie, owce, krowy)
            const passives = this.animals.filter(a => (a.type === 'pig' || a.type === 'sheep' || a.type === 'cow') && !a.isDead);
            this.passiveSpawnTimer = (this.passiveSpawnTimer || 0) + dt;
            if (passives.length < 6 && this.passiveSpawnTimer >= 18.0) {
                this.passiveSpawnTimer = 0;
                const pool = ['pig', 'sheep', 'cow'];
                const chosen = pool[Math.floor(Math.random() * pool.length)];
                this.spawnPassiveNear(playerPosition.x, playerPosition.z, chosen, 18, 38);
            }
        }
        }

        // Update all entities
        for (let i = this.animals.length - 1; i >= 0; i--) {
            const animal = this.animals[i];
            if (!animal) continue;
            if (animal.isStoneFrozen) {
                animal.updateStone(dt, playerPosition);
                continue;
            }
            animal.update(dt, playerPosition, isDay);
        }

        // Update flying arrows
        for (let i = this.arrows.length - 1; i >= 0; i--) {
            const arrow = this.arrows[i];
            arrow.update(dt, this.player, this.survival, this.ui, this.animals);
            if (arrow.isDead) {
                this.arrows.splice(i, 1);
            }
        }

        // Update thrown gunpowder bombs
        for (let i = this.thrownProjectiles.length - 1; i >= 0; i--) {
            const bomb = this.thrownProjectiles[i];
            bomb.update(dt, this.player, this.survival, this.ui, this.animals);
            if (bomb.isDead || bomb.isExploded) {
                this.thrownProjectiles.splice(i, 1);
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
