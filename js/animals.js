import { Pig, Sheep, Snake, Bear, Cow, createPixelHeartMesh } from './entities/mobs/passive.js?v=drops_1';
import { Zombie, Skeleton, Creeper, Dirtik, Robot, BossRobot, MiniRobot } from './entities/mobs/hostile.js?v=dark_dimension_v2';
import { FlyingArrow, ThrownGunpowder, MagicStoneSpell } from './entities/projectile.js?v=wand_1';
import { EntityManager } from './entities/entity-manager.js?v=dark_dimension_v2';

export {
    createPixelHeartMesh,
    FlyingArrow,
    ThrownGunpowder,
    MagicStoneSpell,
    Pig,
    Sheep,
    Cow,
    Snake,
    Bear,
    Zombie,
    Skeleton,
    Creeper,
    Dirtik,
    Robot,
    BossRobot,
    MiniRobot,
    EntityManager
};

// Animal factory preserving full backward compatibility with legacy new Animal(...) calls
export class Animal {
    constructor(scene, world, type = 'pig', x = 32, z = 32, manager = null, isBaby = false, hasHelmet = false) {
        switch (type) {
            case 'boss_robot':
                return new BossRobot(scene, world, x, z, manager);
            case 'mini_robot':
                return new MiniRobot(scene, world, x, z, manager);
            case 'robot':
                return new Robot(scene, world, x, z, manager);
            case 'snake':
                return new Snake(scene, world, x, z, manager, isBaby);
            case 'creeper':
                return new Creeper(scene, world, x, z, manager);
            case 'dirtik':
                return new Dirtik(scene, world, x, z, manager);

            case 'zombie':
                return new Zombie(scene, world, x, z, manager, hasHelmet);
            case 'skeleton':
                return new Skeleton(scene, world, x, z, manager, hasHelmet);
            case 'sheep':
                return new Sheep(scene, world, x, z, manager);
            case 'cow':
                return new Cow(scene, world, x, z, manager);
            case 'bear':
                return new Bear(scene, world, x, z, manager, 'polar');
            case 'pig':
            default:
                return new Pig(scene, world, x, z, manager);
        }
    }
}

// Alias EntityManager as AnimalManager for existing imports and tests
export const AnimalManager = EntityManager;
