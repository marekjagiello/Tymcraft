import * as THREE from 'three';
import { Pig, Sheep, Snake } from './mobs/passive.js?v=throw_gunpowder_1';
import { Zombie, Skeleton, Creeper, Dirtik } from './mobs/hostile.js?v=throw_gunpowder_1';
import { FlyingArrow, ThrownGunpowder } from './projectile.js?v=throw_gunpowder_1';
import { WORLD_SIZE_X, WORLD_SIZE_Z } from '../world.js';
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
            const animal = data.type === 'pig'
                ? new Pig(this.scene, this.world, data.x, data.z, this)
                : new Sheep(this.scene, this.world, data.x, data.z, this);
            this.animals.push(animal);
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

        // 3. Początkowy Creeper wędrujący po świecie
        const creeper = new Creeper(this.scene, this.world, 40, 25, this);
        this.animals.push(creeper);

        // 4. Początkowe Dirtiki ukryte jako klocki ziemi
        const dirtik1 = new Dirtik(this.scene, this.world, 34, 32, this);
        this.animals.push(dirtik1);
        const dirtik2 = new Dirtik(this.scene, this.world, 24, 38, this);
        this.animals.push(dirtik2);
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

    spawnThrownGunpowder(origin, direction) {
        const bomb = new ThrownGunpowder(this.scene, this.world, origin, direction, this);
        this.thrownProjectiles.push(bomb);
        return bomb;
    }

    update(dt, playerPosition = null, isDay = true) {
        // Automatyczne utrzymywanie maksymalnie 1 węża na świecie
        const snakes = this.animals.filter(a => a.type === 'snake');
        if (snakes.length > 1) {
            this.killSnakesExceptOne();
        }

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

        // Update all entities
        for (let i = this.animals.length - 1; i >= 0; i--) {
            this.animals[i].update(dt, playerPosition, isDay);
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
