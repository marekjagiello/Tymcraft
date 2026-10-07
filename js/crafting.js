// 2x2 Crafting system and tool definitions

export const ITEMS = {
    WOOD_LOG: { id: 4, name: 'Drewno', type: 'block' },
    PLANKS: { id: 8, name: 'Deski', type: 'block' },
    STONE: { id: 3, name: 'Kamień', type: 'block' },
    STICK: { id: 20, name: 'Patyk', type: 'item', icon: 'stick' },
    WOOD_PICKAXE: { id: 21, name: 'Drewniany Kilof', type: 'tool', efficiency: 3.0, icon: 'wood_pick' },
    STONE_PICKAXE: { id: 22, name: 'Kamienny Kilof', type: 'tool', efficiency: 5.5, icon: 'stone_pick' },
    APPLE: { id: 23, name: 'Jabłko', type: 'food', nutrition: 4, icon: 'apple' },
    WOOD_SWORD: { id: 24, name: 'Drewniany Miecz', type: 'weapon', damage: 4, icon: 'wood_sword' },
    STONE_SWORD: { id: 25, name: 'Kamienny Miecz', type: 'weapon', damage: 6, icon: 'stone_sword' },
    ROTTEN_FLESH: { id: 26, name: 'Zgniłe Mięso', type: 'food', nutrition: 2, icon: 'flesh' }
};

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
