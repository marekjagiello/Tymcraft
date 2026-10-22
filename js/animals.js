// Backward compatibility adapter and unified export facade for entities
import { Pig, Sheep, Snake, Bear, createPixelHeartMesh } from './entities/mobs/passive.js?v=bear_ride_1';
import { Zombie, Skeleton, Creeper, Dirtik } from './entities/mobs/hostile.js?v=bear_ride_1';
import { FlyingArrow, ThrownGunpowder } from './entities/projectile.js?v=bear_ride_1';
import { EntityManager } from './entities/entity-manager.js?v=bear_ride_1';

export {
    createPixelHeartMesh,
    FlyingArrow,
    ThrownGunpowder,
    Pig,
    Sheep,
    Snake,
    Bear,
    Zombie,
    Skeleton,
    Creeper,
    Dirtik,
    EntityManager
};

// Animal factory preserving full backward compatibility with legacy new Animal(...) calls
export class Animal {
    constructor(scene, world, type = 'pig', x = 32, z = 32, manager = null, isBaby = false, hasHelmet = false) {
        switch (type) {
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
