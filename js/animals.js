import { Pig, Sheep, Snake, Bear, Cow, createPixelHeartMesh } from './entities/mobs/passive.js?v=village_golem_2';
import { Zombie, Skeleton, Creeper, Dirtik, Robot, BossRobot, MiniRobot, PigKing, RedEyedPig, GiantPigGuard } from './entities/mobs/hostile.js?v=village_golem_2';
import { Villager } from './entities/mobs/villager.js?v=village_golem_2';
import { IronGolem } from './entities/mobs/iron-golem.js?v=village_golem_2';
import { FlyingArrow, ThrownGunpowder, MagicStoneSpell } from './entities/projectile.js?v=village_golem_2';
import { EntityManager } from './entities/entity-manager.js?v=village_golem_2';

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
    PigKing,
    RedEyedPig,
    Villager,
    IronGolem,
    EntityManager
};

// Animal factory preserving full backward compatibility with legacy new Animal(...) calls
export class Animal {
    constructor(scene, world, type = 'pig', x = 32, z = 32, manager = null, isBaby = false, hasHelmet = false) {
        switch (type) {
            case 'villager':
                return new Villager(scene, world, x, z, manager);
            case 'iron_golem':
                return new IronGolem(scene, world, x, z, manager);
            case 'boss_pig_king':
                return new PigKing(scene, world, x, z, manager);
            case 'red_eyed_pig':
                return new RedEyedPig(scene, world, x, z, manager);
            case 'boss_robot':
                return new BossRobot(scene, world, x, z, manager);
            case 'boss_robot_phase2':
                return new BossRobot(scene, world, x, z, manager, true);
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
