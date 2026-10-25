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
    ROSE: { id: 17, name: 'Czerwona Róża', type: ITEM_TYPES.BLOCK, placeable: true, icon: 'rose' },
    DANDELION: { id: 18, name: 'Żółty Mlecz', type: ITEM_TYPES.BLOCK, placeable: true, icon: 'dandelion' },
    LILY_PAD: { id: 19, name: 'Lilia Wodna', type: ITEM_TYPES.BLOCK, placeable: true, icon: 'lily_pad' },

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
    GUNPOWDER: { id: 36, name: 'Proch Strzelniczy', type: ITEM_TYPES.MATERIAL, icon: 'gunpowder' },
    RUBY_ARMOR: { id: 37, name: 'Rubinowa Zbroja', type: ITEM_TYPES.MATERIAL, icon: 'ruby_armor' },

    // Animal drops (meat, leather, wool)
    PORKCHOP: { id: 38, name: 'Surowy Schab', type: ITEM_TYPES.FOOD, nutrition: 4, heals: 2, icon: 'porkchop' },
    MUTTON: { id: 39, name: 'Surowa Baranina', type: ITEM_TYPES.FOOD, nutrition: 3, heals: 1, icon: 'mutton' },
    BEEF: { id: 40, name: 'Surowa Wołowina', type: ITEM_TYPES.FOOD, nutrition: 5, heals: 3, icon: 'beef' },
    LEATHER: { id: 41, name: 'Skóra', type: ITEM_TYPES.MATERIAL, icon: 'leather' },
    WOOL: { id: 42, name: 'Biała Wełna', type: ITEM_TYPES.MATERIAL, icon: 'wool' },
    STONE_ARMOR: { id: 43, name: 'Kamienna Zbroja', type: ITEM_TYPES.MATERIAL, icon: 'stone_armor' },
    MYSTERY_BOX: { id: 44, name: 'Mystery Box', type: ITEM_TYPES.MATERIAL, icon: 'mystery_box' },
    WATER_BOTTLE: { id: 45, name: 'Butelka Wody', type: ITEM_TYPES.FOOD, nutrition: 2, heals: 2, icon: 'water_bottle' },
    WARM_JACKET: { id: 46, name: 'Ciepła Kurtka', type: ITEM_TYPES.MATERIAL, icon: 'warm_jacket' },
    LASER_SWORD: { id: 47, name: 'Laserowy Miecz', type: ITEM_TYPES.WEAPON, damage: 18.0, efficiency: 1.0, icon: 'laser_sword' },
    BEDROCK_SWORD: { id: 48, name: 'Miecz Bedrockowy', type: ITEM_TYPES.WEAPON, damage: 20.0, efficiency: 1.0, icon: 'bedrock_sword' },
    BLUE_ELEMENT: { id: 49, name: 'Niebieski Pierwiastek', type: ITEM_TYPES.MATERIAL, icon: 'blue_element' },
    MAGIC_WAND: { id: 50, name: 'Magiczna Różdżka', type: ITEM_TYPES.TOOL, damage: 8.0, efficiency: 1.0, icon: 'magic_wand' },
    COLOR_BLOCK_626: { id: 51, name: 'Kolorowy Blok 626', type: ITEM_TYPES.BLOCK, placeable: true, icon: 'color_block_626' },
    FLINT_AND_STEEL: { id: 52, name: 'Krzesiwo', type: ITEM_TYPES.TOOL, damage: 2.0, efficiency: 1.0, icon: 'flint_and_steel' },
    CHARGED_BLOCK_626: { id: 53, name: 'Napiorunowany Kolorowy Blok', type: ITEM_TYPES.BLOCK, placeable: true, icon: 'charged_block_626' },
    COLOR_SWORD: { id: 54, name: 'Kolorowy Miecz', type: ITEM_TYPES.WEAPON, damage: 25.0, efficiency: 1.0, icon: 'color_sword' },
    COLOR_BOW: { id: 55, name: 'Kolorowy Łuk', type: ITEM_TYPES.WEAPON, damage: 16.0, efficiency: 1.0, icon: 'color_bow' },
    COLOR_ARROW: { id: 56, name: 'Magiczna Kolorowa Strzała', type: ITEM_TYPES.MATERIAL, icon: 'color_arrow' },
    STRING: { id: 57, name: 'Linka', type: ITEM_TYPES.MATERIAL, icon: 'string' },
    IRON_INGOT: { id: 58, name: 'Żelazo', type: ITEM_TYPES.MATERIAL, icon: 'iron_ingot' },
    PIG_BLOCK: { id: 59, name: 'Świniowy Blok', type: ITEM_TYPES.BLOCK, placeable: true, icon: 'pig_block' },
    MONSTER_REPELLENT: { id: 60, name: 'Odstraszacz Potworów', type: ITEM_TYPES.TOOL, damage: 4.0, icon: 'monster_repellent' }
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
    if (id === 51 || id === 53 || id === 59) return true;
    const item = getItem(id);
    if (item && item.placeable !== undefined) return Boolean(item.placeable);
    return id >= 1 && id <= 19;
}

export function isArmor(id) {
    return id === 32 || id === 37 || id === 43;
}

export function isBow(id) {
    return id === 29 || id === 55;
}

export function isArrow(id) {
    return id === 28 || id === 56;
}

export function isMagicWand(id) {
    return id === 50;
}

