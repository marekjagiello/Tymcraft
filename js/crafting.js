import { ITEMS } from './items.js?v=empty_start_bow_string_v10';

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
