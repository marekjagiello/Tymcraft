import { ITEMS } from './items.js?v=pig_kingdom_dialogue_stage2_v8';

export { ITEMS };

export class CraftingManager {
    constructor(onInventoryChange) {
        this.onInventoryChange = onInventoryChange || (() => {});
        this.grid = [null, null, null, null]; // 2x2 slots: 0, 1, 2, 3
        this.output = null;
    }

    setSlot(index, itemId) {
        this.grid[index] = itemId;
        this.evaluateRecipe();
    }

    clearGrid() {
        this.grid = [null, null, null, null];
        this.output = null;
    }

    // Evaluate 2x2 grid recipes
    evaluateRecipe() {
        const [s0, s1, s2, s3] = this.grid;
        const nonNulls = this.grid.filter(Boolean);

        // 1. Wood -> 4 Planks
        if (nonNulls.length === 1 && nonNulls[0] === 4) {
            this.output = { item: ITEMS.PLANKS, count: 4 };
            return this.output;
        }

        // 2. 2 Planks vertical -> 4 Sticks
        if ((s0 === 8 && s2 === 8 && !s1 && !s3) || (s1 === 8 && s3 === 8 && !s0 && !s2)) {
            this.output = { item: ITEMS.STICK, count: 4 };
            return this.output;
        }

        // 3. Wooden Pickaxe: Top 2 Planks, Bottom 1 Stick
        // [Planks, Planks, Stick, null] OR [Planks, Planks, null, Stick]
        if (s0 === 8 && s1 === 8 && (s2 === 20 || s3 === 20)) {
            this.output = { item: ITEMS.WOOD_PICKAXE, count: 1 };
            return this.output;
        }

        // 4. Stone Pickaxe: Top 2 Stone, Bottom 1 Stick
        if (s0 === 3 && s1 === 3 && (s2 === 20 || s3 === 20)) {
            this.output = { item: ITEMS.STONE_PICKAXE, count: 1 };
            return this.output;
        }

        // 5. Wooden Sword: Top 1 Plank, Bottom 1 Stick (vertical)
        if ((s0 === 8 && s2 === 20 && !s1 && !s3) || (s1 === 8 && s3 === 20 && !s0 && !s2)) {
            this.output = { item: ITEMS.WOOD_SWORD, count: 1 };
            return this.output;
        }

        // 6. Stone Sword: Top 1 Stone, Bottom 1 Stick (vertical)
        if ((s0 === 3 && s2 === 20 && !s1 && !s3) || (s1 === 3 && s3 === 20 && !s0 && !s2)) {
            this.output = { item: ITEMS.STONE_SWORD, count: 1 };
            return this.output;
        }

        // 7. Bow (Łuk): Linka (57) nad Patykiem (20) - na życzenie Tymka!
        const isStringOverStick =
            ((s0 === 57 && s2 === 20 && !s1 && !s3) || (s1 === 57 && s3 === 20 && !s0 && !s2)) ||
            (nonNulls.length === 2 && nonNulls.includes(57) && nonNulls.includes(20));

        if (isStringOverStick) {
            this.output = { item: ITEMS.BOW, count: 1 };
            return this.output;
        }

        // 7b. Flint & Steel (Krzesiwo): Patyk (20) + Kamień/Bruk (3/11) DOKŁADNIE NA SKOS! (Na życzenie Tymka)
        const isStone = (id) => id === 3 || id === 11;
        const isDiagonalStickStone =
            (((s0 === 20 && isStone(s3)) || (isStone(s0) && s3 === 20)) && !s1 && !s2) ||
            (((s1 === 20 && isStone(s2)) || (isStone(s1) && s2 === 20)) && !s0 && !s3);

        if (isDiagonalStickStone) {
            this.output = { item: ITEMS.FLINT_AND_STEEL, count: 1 };
            return this.output;
        }

        // 8. Arrows (4 Strzały): 1 Stick + 1 Stone/Cobblestone/Bone (pionowo lub poziomo)
        if (nonNulls.length === 2 && nonNulls.includes(20) && (nonNulls.includes(3) || nonNulls.includes(11) || nonNulls.includes(27))) {
            this.output = { item: ITEMS.ARROW, count: 4 };
            return this.output;
        }

        // 9. Diamond Sword (Diamentowy Miecz): Top 1 Diamond, Bottom 1 Stick (vertical)
        if ((s0 === 30 && s2 === 20 && !s1 && !s3) || (s1 === 30 && s3 === 20 && !s0 && !s2)) {
            this.output = { item: ITEMS.DIAMOND_SWORD, count: 1 };
            return this.output;
        }

        // 10. Diamond Pickaxe (Diamentowy Kilof): Top 2 Diamonds, Bottom 1 Stick
        if (s0 === 30 && s1 === 30 && (s2 === 20 || s3 === 20)) {
            this.output = { item: ITEMS.DIAMOND_PICKAXE, count: 1 };
            return this.output;
        }

        // 11. Diamond Armor (Diamentowa Zbroja): 3 lub 4 Diamenty w siatce 2x2
        if (nonNulls.length >= 3 && nonNulls.every(id => id === 30)) {
            this.output = { item: ITEMS.DIAMOND_ARMOR, count: 1 };
            return this.output;
        }

        // 12. Ruby Sword (Rubinowy Miecz - One-Hit Kill 20 HP): Top 1 Rubin, Bottom 1 Patyk (pionowo)
        if ((s0 === 34 && s2 === 20 && !s1 && !s3) || (s1 === 34 && s3 === 20 && !s0 && !s2)) {
            this.output = { item: ITEMS.RUBY_SWORD, count: 1 };
            return this.output;
        }

        // 13. Ruby Armor (Rubinowa Zbroja - Najlepsza, niezniszczalna): 3 lub 4 Rubiny w siatce 2x2
        if (nonNulls.length >= 3 && nonNulls.every(id => id === 34)) {
            this.output = { item: ITEMS.RUBY_ARMOR, count: 1 };
            return this.output;
        }

        // 14. Stone Armor (Kamienna Zbroja): 3 lub 4 Bruki/Kamienie w siatce 2x2
        if (nonNulls.length >= 3 && nonNulls.every(id => id === 11 || id === 3)) {
            this.output = { item: ITEMS.STONE_ARMOR, count: 1 };
            return this.output;
        }

        // 15. Bedrock Sword (Miecz Bedrockowy): Bedrock (14) + Patyk (20) lub 2 Bedrocki (14)
        if ((s0 === 14 && s2 === 20 && !s1 && !s3) || (s1 === 14 && s3 === 20 && !s0 && !s2) ||
            (s0 === 14 && s2 === 14 && !s1 && !s3) || (s1 === 14 && s3 === 14 && !s0 && !s2) ||
            (nonNulls.length === 2 && nonNulls.includes(14) && (nonNulls.includes(20) || nonNulls.filter(x => x === 14).length === 2))) {
            this.output = { item: ITEMS.BEDROCK_SWORD, count: 1 };
            return this.output;
        }

        // 16. Magic Wand (Magiczna Różdżka): Bedrock (14) + Niebieski Pierwiastek (49)
        if ((nonNulls.length === 2 && nonNulls.includes(14) && nonNulls.includes(49)) ||
            (nonNulls.length === 3 && nonNulls.includes(14) && nonNulls.includes(49) && nonNulls.includes(20))) {
            this.output = { item: ITEMS.MAGIC_WAND, count: 1 };
            return this.output;
        }



        // 18. Napiorunowany Kolorowy Blok (53): Kolorowy Blok 626 (51) + Miecz Piorunowy/Laserowy (47)
        if (nonNulls.includes(51) && nonNulls.includes(47)) {
            this.output = { item: ITEMS.CHARGED_BLOCK_626, count: 1 };
            return this.output;
        }

        // 19. Magiczna Różdżka z Różnymi Czarami (50): Napiorunowany Kolorowy Blok (53) + Patyk (20)
        if (nonNulls.includes(53) && nonNulls.includes(20)) {
            this.output = { item: ITEMS.MAGIC_WAND, count: 1 };
            return this.output;
        }

        // 20. Kolorowy Miecz (54): Napiorunowany Kolorowy Blok (53) + Laserowy Miecz (47) lub Rubinowy Miecz (35)
        if (nonNulls.includes(53) && (nonNulls.includes(47) || nonNulls.includes(35) || nonNulls.includes(31))) {
            this.output = { item: ITEMS.COLOR_SWORD, count: 1 };
            return this.output;
        }

        // 21. Kolorowy Łuk (55): Napiorunowany Kolorowy Blok (53) + Łuk (29)
        if (nonNulls.includes(53) && nonNulls.includes(29)) {
            this.output = { item: ITEMS.COLOR_BOW, count: 1 };
            return this.output;
        }

        // 22. Magiczna Kolorowa Strzała (56): Napiorunowany Kolorowy Blok (53) + Strzała (28)
        if (nonNulls.includes(53) && nonNulls.includes(28)) {
            this.output = { item: ITEMS.COLOR_ARROW, count: 1 };
            return this.output;
        }

        // 23. Świniowy Blok (59): 1 Mięso daje aż 4 bloki na życzenie Tymka!
        if (nonNulls.length >= 1 && nonNulls.every(id => [26, 38, 39, 40].includes(id))) {
            this.output = { item: ITEMS.PIG_BLOCK, count: 4 };
            return this.output;
        }

        // 24. Odstraszacz Potworów (60): Patyk (20) + Kamień/Bruk (3/11) + Kość/Proch/Róża (27/36/17)
        if (nonNulls.length === 3 &&
            nonNulls.includes(20) &&
            (nonNulls.includes(3) || nonNulls.includes(11)) &&
            (nonNulls.includes(27) || nonNulls.includes(36) || nonNulls.includes(17))) {
            this.output = { item: ITEMS.MONSTER_REPELLENT, count: 1 };
            return this.output;
        }

        // 25. Ognisko (61): 3 Patyki (20) + 1 Drewno (4) lub 1 Węgiel (13) lub 1 Deska (8) (lub 2 patyki + drewno/węgiel)
        const stickCount = nonNulls.filter(id => id === 20).length;
        const hasFuel = nonNulls.includes(4) || nonNulls.includes(13) || nonNulls.includes(8);
        if (stickCount >= 2 && hasFuel && (nonNulls.length === 3 || nonNulls.length === 4)) {
            this.output = { item: ITEMS.CAMPFIRE, count: 1 };
            return this.output;
        }

        // 26. Chleb (65): 2 lub 3 Pszenice (66)
        if (nonNulls.length >= 2 && nonNulls.every(id => id === 66)) {
            this.output = { item: ITEMS.BREAD, count: 1 };
            return this.output;
        }

        this.output = null;
        return null;
    }


    craft() {
        if (!this.output) return null;

        const crafted = { ...this.output };

        // Consume 1 item from each filled grid slot
        this.grid = this.grid.map(() => null);
        this.output = null;

        return crafted;
    }
}

// ==============================================================================
// 📖 TYMCRAFT RECIPE BOOK — Baza Receptur dla Książki Przepisów Tymka
// ==============================================================================
export const RECIPES = [
    {
        id: 'planks',
        name: 'Deski',
        output: { id: 8, name: 'Deski', count: 4, icon: 'planks' },
        category: 'blocks',
        categoryName: '🧱 Bloki',
        description: 'Drewniane deski do budowy i tworzenia patyków',
        ingredients: [
            { id: 4, name: 'Drewno', count: 1 }
        ]
    },
    {
        id: 'stick',
        name: 'Patyk',
        output: { id: 20, name: 'Patyk', count: 4, icon: 'stick' },
        category: 'materials',
        categoryName: '🪵 Surowce',
        description: 'Podstawa do każdego narzędzia i broni',
        ingredients: [
            { id: 8, name: 'Deski', count: 2 }
        ]
    },
    {
        id: 'wood_sword',
        name: 'Drewniany Miecz',
        output: { id: 24, name: 'Drewniany Miecz', count: 1, icon: 'wood_sword' },
        category: 'weapons',
        categoryName: '⚔️ Broń',
        description: 'Podstawowy miecz do obrony przed potworami (5 dmg)',
        ingredients: [
            { id: 8, name: 'Deski', count: 1 },
            { id: 20, name: 'Patyk', count: 1 }
        ]
    },
    {
        id: 'wood_pickaxe',
        name: 'Drewniany Kilof',
        output: { id: 21, name: 'Drewniany Kilof', count: 1, icon: 'wood_pick' },
        category: 'tools',
        categoryName: '⛏️ Narzędzia',
        description: 'Do szybkiego wydobywania skał i węgla',
        ingredients: [
            { id: 8, name: 'Deski', count: 2 },
            { id: 20, name: 'Patyk', count: 1 }
        ]
    },
    {
        id: 'stone_sword',
        name: 'Kamienny Miecz',
        output: { id: 25, name: 'Kamienny Miecz', count: 1, icon: 'stone_sword' },
        category: 'weapons',
        categoryName: '⚔️ Broń',
        description: 'Mocny miecz zadający 8 obrażeń potworom',
        ingredients: [
            { id: 3, name: 'Kamień / Bruk', count: 1, alternatives: [3, 11] },
            { id: 20, name: 'Patyk', count: 1 }
        ]
    },
    {
        id: 'stone_pickaxe',
        name: 'Kamienny Kilof',
        output: { id: 22, name: 'Kamienny Kilof', count: 1, icon: 'stone_pick' },
        category: 'tools',
        categoryName: '⛏️ Narzędzia',
        description: 'Twardy kilof ze skały (szybkie kopanie)',
        ingredients: [
            { id: 3, name: 'Kamień / Bruk', count: 2, alternatives: [3, 11] },
            { id: 20, name: 'Patyk', count: 1 }
        ]
    },
    {
        id: 'bow',
        name: 'Łuk',
        output: { id: 29, name: 'Łuk', count: 1, icon: 'bow' },
        category: 'weapons',
        categoryName: '⚔️ Broń',
        description: 'Broń dystansowa! Wymaga linki z robota i strzał',
        ingredients: [
            { id: 57, name: 'Linka', count: 1 },
            { id: 20, name: 'Patyk', count: 1 }
        ]
    },
    {
        id: 'arrow',
        name: 'Strzała',
        output: { id: 28, name: 'Strzała', count: 4, icon: 'arrow' },
        category: 'weapons',
        categoryName: '⚔️ Broń',
        description: '4x ostre strzały z patyka i kamienia lub kości',
        ingredients: [
            { id: 20, name: 'Patyk', count: 1 },
            { id: 3, name: 'Kamień / Kość', count: 1, alternatives: [3, 11, 27] }
        ]
    },
    {
        id: 'flint_and_steel',
        name: 'Krzesiwo',
        output: { id: 52, name: 'Krzesiwo', count: 1, icon: 'flint_and_steel' },
        category: 'tools',
        categoryName: '⛏️ Narzędzia',
        description: 'Rozpala ogień i aktywuje portal do Mrocznego Wymiaru!',
        ingredients: [
            { id: 20, name: 'Patyk', count: 1 },
            { id: 3, name: 'Kamień / Bruk', count: 1, alternatives: [3, 11] }
        ]
    },
    {
        id: 'monster_repellent',
        name: 'Odstraszacz Potworów',
        output: { id: 60, name: 'Odstraszacz Potworów', count: 1, icon: 'monster_repellent' },
        category: 'special',
        categoryName: '🗿 Specjalne',
        description: '🗿🧟 Odstrasza potwory! Zombie, szkielety i creepery uciekają w popłochu!',
        ingredients: [
            { id: 20, name: 'Patyk', count: 1 },
            { id: 3, name: 'Kamień / Bruk', count: 1, alternatives: [3, 11] },
            { id: 27, name: 'Kość / Proch / Róża', count: 1, alternatives: [27, 36, 17] }
        ]
    },
    {
        id: 'stone_armor',
        name: 'Kamienna Zbroja',
        output: { id: 43, name: 'Kamienna Zbroja', count: 1, icon: 'stone_armor' },
        category: 'armor',
        categoryName: '🛡️ Zbroje',
        description: 'Pancerz ze skał dający aż 13 serc życia (26 HP)!',
        ingredients: [
            { id: 11, name: 'Bruk / Kamień', count: 3, alternatives: [3, 11] }
        ]
    },
    {
        id: 'diamond_sword',
        name: 'Diamentowy Miecz',
        output: { id: 31, name: 'Diamentowy Miecz', count: 1, icon: 'diamond_sword' },
        category: 'weapons',
        categoryName: '⚔️ Broń',
        description: 'Legendarny miecz zadający potężne 14 obrażeń!',
        ingredients: [
            { id: 30, name: 'Diament', count: 1 },
            { id: 20, name: 'Patyk', count: 1 }
        ]
    },
    {
        id: 'diamond_pickaxe',
        name: 'Diamentowy Kilof',
        output: { id: 33, name: 'Diamentowy Kilof', count: 1, icon: 'diamond_pick' },
        category: 'tools',
        categoryName: '⛏️ Narzędzia',
        description: 'Super szybki kilof diamentowy (10.0 efficiency)',
        ingredients: [
            { id: 30, name: 'Diament', count: 2 },
            { id: 20, name: 'Patyk', count: 1 }
        ]
    },
    {
        id: 'diamond_armor',
        name: 'Diamentowa Zbroja',
        output: { id: 32, name: 'Diamentowa Zbroja', count: 1, icon: 'diamond_armor' },
        category: 'armor',
        categoryName: '🛡️ Zbroje',
        description: 'Diamentowa zbroja dająca 15 serc (30 HP)!',
        ingredients: [
            { id: 30, name: 'Diament', count: 3 }
        ]
    },
    {
        id: 'ruby_sword',
        name: 'Rubinowy Miecz',
        output: { id: 35, name: 'Rubinowy Miecz', count: 1, icon: 'ruby_sword' },
        category: 'weapons',
        categoryName: '⚔️ Broń',
        description: 'One-Hit Kill! Likwiduje niemal każdego wroga jednym ciosem (20 dmg)',
        ingredients: [
            { id: 34, name: 'Rubin', count: 1 },
            { id: 20, name: 'Patyk', count: 1 }
        ]
    },
    {
        id: 'ruby_armor',
        name: 'Rubinowa Zbroja',
        output: { id: 37, name: 'Rubinowa Zbroja', count: 1, icon: 'ruby_armor' },
        category: 'armor',
        categoryName: '🛡️ Zbroje',
        description: 'Niezniszczalna zbroja dająca 20 serc (40 HP) i 50 trafień tarczy!',
        ingredients: [
            { id: 34, name: 'Rubin', count: 3 }
        ]
    },
    {
        id: 'pig_block',
        name: 'Świniowy Blok',
        output: { id: 59, name: 'Świniowy Blok', count: 4, icon: 'pig_block' },
        category: 'blocks',
        categoryName: '🧱 Bloki',
        description: 'Magiczny różowy blok teleportujący do Królestwa Świń!',
        ingredients: [
            { id: 26, name: 'Zgniłe Mięso / Schab', count: 1, alternatives: [26, 38, 39, 40] }
        ]
    },
    {
        id: 'magic_wand',
        name: 'Magiczna Różdżka',
        output: { id: 50, name: 'Magiczna Różdżka', count: 1, icon: 'magic_wand' },
        category: 'special',
        categoryName: '🗿 Specjalne',
        description: 'Ciska czarami: ⚡ Piorun, 🔥 Kula Ognia, 🪨 Kamień!',
        ingredients: [
            { id: 14, name: 'Bedrock / Kolorowy Blok', count: 1, alternatives: [14, 51, 53] },
            { id: 49, name: 'Niebieski Pierwiastek / Patyk', count: 1, alternatives: [49, 20] }
        ]
    },
    {
        id: 'color_sword',
        name: 'Kolorowy Miecz',
        output: { id: 54, name: 'Kolorowy Miecz', count: 1, icon: 'color_sword' },
        category: 'weapons',
        categoryName: '⚔️ Broń',
        description: 'Legendarny miecz zadający rekordowe 25 obrażeń!',
        ingredients: [
            { id: 53, name: 'Napiorunowany Blok', count: 1, alternatives: [53, 51] },
            { id: 35, name: 'Miecz', count: 1, alternatives: [35, 31, 25, 47] }
        ]
    },
    {
        id: 'color_bow',
        name: 'Kolorowy Łuk',
        output: { id: 55, name: 'Kolorowy Łuk', count: 1, icon: 'color_bow' },
        category: 'weapons',
        categoryName: '⚔️ Broń',
        description: 'Tęczowy łuk strzelający samonaprowadzającymi strzałami!',
        ingredients: [
            { id: 53, name: 'Napiorunowany Blok', count: 1, alternatives: [53, 51] },
            { id: 29, name: 'Łuk', count: 1 }
        ]
    },
    {
        id: 'color_arrow',
        name: 'Magiczna Kolorowa Strzała',
        output: { id: 56, name: 'Magiczna Kolorowa Strzała', count: 1, icon: 'color_arrow' },
        category: 'weapons',
        categoryName: '⚔️ Broń',
        description: 'Tęczowa amunicja śledząca potwory na odległość!',
        ingredients: [
            { id: 53, name: 'Napiorunowany Blok', count: 1, alternatives: [53, 51] },
            { id: 28, name: 'Strzała', count: 1 }
        ]
    },
    {
        id: 'campfire',
        name: 'Ognisko',
        output: { id: 61, name: 'Ognisko', count: 1, icon: 'campfire' },
        category: 'blocks',
        categoryName: '🧱 Bloki',
        description: 'Dymiące ognisko do oświetlania, pieczenia mięsa i ogrzewania!',
        ingredients: [
            { id: 20, name: 'Patyk', count: 3 },
            { id: 4, name: 'Drewno', count: 1, alternatives: [4, 8, 13] }
        ]
    },
    {
        id: 'bread',
        name: 'Chleb',
        output: { id: 65, name: 'Chleb', count: 1, icon: 'bread' },
        category: 'materials',
        categoryName: '🍞 Jedzenie',
        description: 'Pożywny chleb z wiejskiej pszenicy!',
        ingredients: [
            { id: 66, name: 'Pszenica', count: 2 }
        ]
    }
];

export function canCraftRecipe(recipe, ui) {
    if (!recipe || !ui) return { canCraft: false, missing: [] };
    const missing = [];
    for (const ing of recipe.ingredients) {
        const allowedIds = ing.alternatives || [ing.id];
        let totalCount = 0;
        for (const id of allowedIds) {
            for (const slot of ui.hotbarBlocks) {
                if (slot.id === id && slot.count > 0) totalCount += slot.count;
            }
            for (const slot of ui.backpackSlots) {
                if (slot.id === id && slot.count > 0) totalCount += slot.count;
            }
        }
        if (totalCount < ing.count) {
            missing.push({
                id: ing.id,
                name: ing.name,
                needed: ing.count,
                have: totalCount,
                diff: ing.count - totalCount
            });
        }
    }
    return {
        canCraft: missing.length === 0,
        missing
    };
}

export function craftRecipeDirect(recipe, ui) {
    const check = canCraftRecipe(recipe, ui);
    if (!check.canCraft) return { success: false, missing: check.missing };

    // Consume required ingredients
    for (const ing of recipe.ingredients) {
        let toConsume = ing.count;
        const allowedIds = ing.alternatives || [ing.id];
        for (const id of allowedIds) {
            if (toConsume <= 0) break;
            let avail = 0;
            for (const s of [...ui.hotbarBlocks, ...ui.backpackSlots]) {
                if (s.id === id && s.count > 0) avail += s.count;
            }
            if (avail > 0) {
                const take = Math.min(avail, toConsume);
                ui.consumeItem(id, take);
                toConsume -= take;
            }
        }
    }

    // Add produced item directly to inventory
    ui.addItem(recipe.output.id, recipe.output.name, recipe.output.count);
    return { success: true, item: recipe.output };
}
