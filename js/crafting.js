// 2x2 Crafting system using centralized Item Registry
import { ITEMS } from './items.js';

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

        // 7. Bow (Łuk): Any 3 Sticks in 2x2 grid
        if (nonNulls.length === 3 && nonNulls.every(id => id === 20)) {
            this.output = { item: ITEMS.BOW, count: 1 };
            return this.output;
        }

        // 8. Arrows (4 Strzały): 1 Stick + 1 Stone/Cobblestone/Bone
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
