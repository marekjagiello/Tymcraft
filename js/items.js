// Central item & tool registry with data-driven attributes

export const ITEM_TYPES = {
    BLOCK: 'block',
    TOOL: 'tool',
    WEAPON: 'weapon',
    FOOD: 'food',
    MATERIAL: 'material'
};

export const ITEMS = {
    // Blocks (IDs 1-14)
    GRASS: { id: 1, name: 'Trawa', type: ITEM_TYPES.BLOCK, placeable: true },
    DIRT: { id: 2, name: 'Ziemia', type: ITEM_TYPES.BLOCK, placeable: true },
    STONE: { id: 3, name: 'Kamień', type: ITEM_TYPES.BLOCK, placeable: true },
    WOOD_LOG: { id: 4, name: 'Drewno', type: ITEM_TYPES.BLOCK, placeable: true },
    LEAVES: { id: 5, name: 'Liście', type: ITEM_TYPES.BLOCK, placeable: true },
    SAND: { id: 6, name: 'Piasek', type: ITEM_TYPES.BLOCK, placeable: true },
    SNOW: { id: 7, name: 'Śnieg', type: ITEM_TYPES.BLOCK, placeable: true },
    PLANKS: { id: 8, name: 'Deski', type: ITEM_TYPES.BLOCK, placeable: true },
    GLASS: { id: 9, name: 'Szkło', type: ITEM_TYPES.BLOCK, placeable: true },
    WATER: { id: 10, name: 'Woda', type: ITEM_TYPES.BLOCK, placeable: false },
    COBBLESTONE: { id: 11, name: 'Bruk', type: ITEM_TYPES.BLOCK, placeable: true },
    GRAVEL: { id: 12, name: 'Żwir', type: ITEM_TYPES.BLOCK, placeable: true },
    COAL_ORE: { id: 13, name: 'Ruda Węgla', type: ITEM_TYPES.BLOCK, placeable: true },
    BEDROCK: { id: 14, name: 'Skała Macierzysta', type: ITEM_TYPES.BLOCK, placeable: false },
    DIAMOND_ORE: { id: 15, name: 'Ruda Diamentu', type: ITEM_TYPES.BLOCK, placeable: true },
    RUBY_ORE: { id: 16, name: 'Ruda Rubinu', type: ITEM_TYPES.BLOCK, placeable: true },

    // Craftable materials & drops (IDs 20+)
    STICK: { id: 20, name: 'Patyk', type: ITEM_TYPES.MATERIAL, icon: 'stick' },
    WOOD_PICKAXE: { id: 21, name: 'Drewniany Kilof', type: ITEM_TYPES.TOOL, efficiency: 3.0, damage: 3.5, icon: 'wood_pick' },
    STONE_PICKAXE: { id: 22, name: 'Kamienny Kilof', type: ITEM_TYPES.TOOL, efficiency: 5.5, damage: 3.5, icon: 'stone_pick' },
    APPLE: { id: 23, name: 'Jabłko', type: ITEM_TYPES.FOOD, nutrition: 4, heals: 2, canFeedAnimals: true, icon: 'apple' },
    WOOD_SWORD: { id: 24, name: 'Drewniany Miecz', type: ITEM_TYPES.WEAPON, damage: 5.0, efficiency: 1.0, icon: 'wood_sword' },
    STONE_SWORD: { id: 25, name: 'Kamienny Miecz', type: ITEM_TYPES.WEAPON, damage: 8.0, efficiency: 1.0, icon: 'stone_sword' },
    ROTTEN_FLESH: { id: 26, name: 'Zgniłe Mięso', type: ITEM_TYPES.FOOD, nutrition: 2, heals: 0, icon: 'flesh' },
    BONE: { id: 27, name: 'Kość', type: ITEM_TYPES.MATERIAL, icon: 'bone' },
    ARROW: { id: 28, name: 'Strzała', type: ITEM_TYPES.MATERIAL, icon: 'arrow' },
    BOW: { id: 29, name: 'Łuk', type: ITEM_TYPES.WEAPON, damage: 7.0, efficiency: 1.0, icon: 'bow' },
    DIAMOND: { id: 30, name: 'Diament', type: ITEM_TYPES.MATERIAL, icon: 'diamond' },
    DIAMOND_SWORD: { id: 31, name: 'Diamentowy Miecz', type: ITEM_TYPES.WEAPON, damage: 14.0, efficiency: 1.0, icon: 'diamond_sword' },
    DIAMOND_ARMOR: { id: 32, name: 'Diamentowa Zbroja', type: ITEM_TYPES.MATERIAL, icon: 'diamond_armor' },
    DIAMOND_PICKAXE: { id: 33, name: 'Diamentowy Kilof', type: ITEM_TYPES.TOOL, efficiency: 10.0, damage: 6.0, icon: 'diamond_pick' },
    RUBY: { id: 34, name: 'Rubin', type: ITEM_TYPES.MATERIAL, icon: 'ruby' },
    RUBY_SWORD: { id: 35, name: 'Rubinowy Miecz', type: ITEM_TYPES.WEAPON, damage: 20.0, efficiency: 1.0, icon: 'ruby_sword' },
    GUNPOWDER: { id: 36, name: 'Proch Strzelniczy', type: ITEM_TYPES.MATERIAL, icon: 'gunpowder' }
};

// Fast lookup map by ID
const ITEMS_BY_ID = new Map();
for (const item of Object.values(ITEMS)) {
    ITEMS_BY_ID.set(item.id, item);
}

export function getItem(id) {
    return ITEMS_BY_ID.get(id) || null;
}

export function getItemDamage(id, defaultDamage = 2.0) {
    const item = getItem(id);
    return item?.damage ?? defaultDamage;
}

export function getItemEfficiency(id, defaultEff = 1.0) {
    const item = getItem(id);
    return item?.efficiency ?? defaultEff;
}

export function isFood(id) {
    const item = getItem(id);
    return item?.type === ITEM_TYPES.FOOD;
}

export function isWeapon(id) {
    const item = getItem(id);
    return item?.type === ITEM_TYPES.WEAPON;
}

export function isTool(id) {
    const item = getItem(id);
    return item?.type === ITEM_TYPES.TOOL;
}

export function isPlaceableBlock(id) {
    if (id < 1 || id > 16) return false;
    const item = getItem(id);
    return item ? Boolean(item.placeable) : false;
}

export function isArmor(id) {
    return id === 32;
}

export function isBow(id) {
    return id === 29;
}

export function isArrow(id) {
    return id === 28;
}

