import { BLOCK_DEF, AtlasCanvas, TILE_SIZE, ATLAS_COLS } from './textures.js';
import { ITEMS } from './crafting.js';
import { getItem } from './items.js';
import { eventBus } from './events.js';

export const HOTBAR_BLOCKS = [
    { slot: 1, id: 1, name: 'Trawa', count: 64 },
    { slot: 2, id: 2, name: 'Ziemia', count: 64 },
    { slot: 3, id: 3, name: 'Kamień', count: 64 },
    { slot: 4, id: 4, name: 'Drewno', count: 32 },
    { slot: 5, id: 5, name: 'Liście', count: 64 },
    { slot: 6, id: 6, name: 'Piasek', count: 64 },
    { slot: 7, id: 29, name: 'Łuk', count: 1 },
    { slot: 8, id: 28, name: 'Strzała', count: 64 },
    { slot: 9, id: 24, name: 'Drewniany Miecz', count: 1 }
];

// 27 Backpack Slots (3 rows of 9 slots)
export const BACKPACK_SLOTS = Array.from({ length: 27 }, (_, i) => ({
    slot: i + 1,
    id: 0,
    name: 'Puste',
    count: 0
}));

// Helper to create a pixel-perfect square Minecraft Stick canvas (16x16)
export function createPixelStickCanvas() {
    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 16;
    iconCanvas.height = 16;
    iconCanvas.className = 'slot-icon';
    const ctx = iconCanvas.getContext('2d');

    // Square-pixel Minecraft stick (diagonal from top-right to bottom-left)
    const stickPixels = [
        // Top tip
        [13, 2, '#4e3518'], [12, 2, '#785328'],
        [13, 3, '#967040'], [12, 3, '#785328'], [11, 3, '#4e3518'],
        [12, 4, '#967040'], [11, 4, '#785328'], [10, 4, '#4e3518'],
        [11, 5, '#aa824a'], [10, 5, '#785328'], [9, 5, '#4e3518'],
        [10, 6, '#967040'], [9, 6, '#785328'], [8, 6, '#4e3518'],
        [9, 7, '#aa824a'], [8, 7, '#785328'], [7, 7, '#4e3518'],
        [8, 8, '#967040'], [7, 8, '#785328'], [6, 8, '#4e3518'],
        [7, 9, '#aa824a'], [6, 9, '#785328'], [5, 9, '#4e3518'],
        [6, 10, '#967040'], [5, 10, '#785328'], [4, 10, '#4e3518'],
        [5, 11, '#967040'], [4, 11, '#785328'], [3, 11, '#4e3518'],
        [4, 12, '#785328'], [3, 12, '#4e3518'], [2, 12, '#38240f'],
        [3, 13, '#4e3518'], [2, 13, '#38240f']
    ];

    for (const [x, y, color] of stickPixels) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
    }
    return iconCanvas;
}

// Universal item icon creator for hotbar and backpack slots
export function createSlotItemIcon(itemId) {
    if (!itemId || itemId <= 0) return null;
    if (itemId === 20) {
        return createPixelStickCanvas();
    }
    if (itemId >= 21) {
        const itemSpan = document.createElement('span');
        itemSpan.style.fontSize = '20px';
        if (itemId === 21) itemSpan.innerText = '⛏️';
        else if (itemId === 22) itemSpan.innerText = '⚒️';
        else if (itemId === 23) itemSpan.innerText = '🍎';
        else if (itemId === 24) itemSpan.innerText = '🗡️';
        else if (itemId === 25) itemSpan.innerText = '⚔️';
        else if (itemId === 26) itemSpan.innerText = '🥩';
        else if (itemId === 27) itemSpan.innerText = '🦴';
        else if (itemId === 28) itemSpan.innerText = '🎯';
        else if (itemId === 29) itemSpan.innerText = '🏹';
        else if (itemId === 30) itemSpan.innerText = '💎';
        else if (itemId === 31) {
            itemSpan.innerText = '🗡️';
            itemSpan.style.filter = 'drop-shadow(0 0 5px #38bdf8)';
        }
        else if (itemId === 32) {
            itemSpan.innerText = '🛡️';
            itemSpan.style.filter = 'drop-shadow(0 0 5px #38bdf8)';
        }
        else if (itemId === 33) {
            itemSpan.innerText = '⛏️';
            itemSpan.style.filter = 'drop-shadow(0 0 5px #38bdf8)';
        }
        return itemSpan;
    }
    if (itemId >= 1 && itemId <= 15) {
        const iconCanvas = document.createElement('canvas');
        iconCanvas.width = 16;
        iconCanvas.height = 16;
        iconCanvas.className = 'slot-icon';
        const ctx = iconCanvas.getContext('2d');

        const def = BLOCK_DEF[itemId];
        const tileIdx = def?.tiles ? def.tiles[0] : 0;
        const sx = (tileIdx % ATLAS_COLS) * TILE_SIZE;
        const sy = Math.floor(tileIdx / ATLAS_COLS) * TILE_SIZE;

        ctx.drawImage(AtlasCanvas, sx, sy, 16, 16, 0, 0, 16, 16);
        return iconCanvas;
    }
    return null;
}

export class UI {
    constructor(player, world, survival = null, crafting = null, storage = null) {
        this.player = player;
        this.world = world;
        this.survival = survival;
        this.crafting = crafting;
        this.storage = storage;

        this.selectedSlotIndex = 0; // 0 to 8

        this.infoEl = document.getElementById('debug-info');
        this.hotbarEl = document.getElementById('hotbar');
        this.overlayEl = document.getElementById('start-overlay');
        this.blockNameEl = document.getElementById('block-name-popup');
        this.heartsBarEl = document.getElementById('hearts-bar');
        this.hungerBarEl = document.getElementById('hunger-bar');
        this.craftingModalEl = document.getElementById('crafting-modal');

        this.isCraftingOpen = false;

        this.hotbarBlocks = HOTBAR_BLOCKS;
        this.backpackSlots = BACKPACK_SLOTS;
        this.cursorItem = null;
        this.cursorItemEl = document.getElementById('cursor-item-display');

        this.fps = 60;
        this.lastFpsUpdate = performance.now();
        this.frameCount = 0;

        this.renderHotbar();
        this.renderBackpackSlots();
        this.renderModalHotbar();
        this.renderSurvivalBars(this.survival ? this.survival.health : 20, this.survival ? this.survival.hunger : 20);
        this.initEvents();
        this.initCraftingUI();
        this.initBusEvents();
    }

    initBusEvents() {
        this._handledByEvent = true;
        eventBus.on('ui:popup', (text) => {
            if (typeof text === 'string') this.showPopup(text);
            else if (text?.message) this.showPopup(text.message);
        });
        eventBus.on('item:consume', () => {
            this.consumeActiveItem();
        });
        eventBus.on('item:consume_specific', (data) => {
            if (data && data.id) {
                this.consumeItem(data.id, data.amount || 1);
            }
        });
        eventBus.on('item:add', (data) => {
            if (data && data.id) {
                this.addItem(data.id, data.name || 'Przedmiot', data.count || 1);
            }
        });
    }

    getActiveBlockId() {
        return HOTBAR_BLOCKS[this.selectedSlotIndex].id;
    }

    renderSurvivalBars(health = 20, hunger = 20, maxHealth = 20) {
        if (!this.heartsBarEl || !this.hungerBarEl) return;

        // Render hearts up to maxHealth (10 hearts for 20 HP, 15 hearts for 30 HP with armor)
        const totalHearts = Math.max(10, Math.ceil(maxHealth / 2));
        let heartsHtml = '';
        for (let i = 0; i < totalHearts; i++) {
            const heartVal = (i + 1) * 2;
            const isArmorHeart = i >= 10;
            if (health >= heartVal) {
                heartsHtml += `<span class="heart-icon">${isArmorHeart ? '💎' : '❤️'}</span>`;
            } else if (health === heartVal - 1) {
                heartsHtml += `<span class="heart-icon">${isArmorHeart ? '🔷' : '💔'}</span>`;
            } else {
                heartsHtml += '<span class="heart-icon" style="opacity:0.3">🖤</span>';
            }
        }
        this.heartsBarEl.innerHTML = heartsHtml;

        // 10 Drumsticks (20 Hunger)
        let hungerHtml = '';
        for (let i = 0; i < 10; i++) {
            const hungerVal = (i + 1) * 2;
            if (hunger >= hungerVal) {
                hungerHtml += '<span class="hunger-icon">🍗</span>';
            } else if (hunger === hungerVal - 1) {
                hungerHtml += '<span class="hunger-icon" style="opacity:0.6">🍗</span>';
            } else {
                hungerHtml += '<span class="hunger-icon" style="opacity:0.25">🦴</span>';
            }
        }
        this.hungerBarEl.innerHTML = hungerHtml;
    }

    renderHotbar() {
        this.hotbarEl.innerHTML = '';

        this.hotbarBlocks.forEach((item, idx) => {
            const slot = document.createElement('div');
            slot.className = `hotbar-slot ${idx === this.selectedSlotIndex ? 'active' : ''}`;
            slot.id = `slot-${idx}`;
            slot.title = item.name;

            const icon = createSlotItemIcon(item.id);
            if (icon) {
                slot.appendChild(icon);
            }

            if (item.count !== undefined && item.count > 0) {
                const countSpan = document.createElement('span');
                countSpan.className = 'slot-count';
                countSpan.innerText = item.count;
                slot.appendChild(countSpan);
            }

            const num = document.createElement('span');
            num.className = 'slot-num';
            num.innerText = item.slot;
            slot.appendChild(num);

            slot.addEventListener('click', () => {
                this.selectSlot(idx);
            });

            this.hotbarEl.appendChild(slot);
        });
    }

    renderBackpackSlots() {
        const grid = document.getElementById('backpack-grid');
        if (!grid) return;
        grid.innerHTML = '';

        this.backpackSlots.forEach((item, idx) => {
            const slotEl = document.createElement('div');
            slotEl.className = 'inv-slot backpack-slot';
            slotEl.dataset.backpackIndex = idx;
            this.renderSlotContent(slotEl, item);

            slotEl.addEventListener('click', () => {
                this.handleSlotClick(item, 'backpack', idx);
            });

            grid.appendChild(slotEl);
        });
    }

    renderModalHotbar() {
        const grid = document.getElementById('modal-hotbar-grid');
        if (!grid) return;
        grid.innerHTML = '';

        this.hotbarBlocks.forEach((item, idx) => {
            const slotEl = document.createElement('div');
            slotEl.className = `inv-slot modal-hotbar-slot ${idx === this.selectedSlotIndex ? 'active-hotbar-slot' : ''}`;
            slotEl.dataset.hotbarIndex = idx;
            this.renderSlotContent(slotEl, item);

            const numSpan = document.createElement('span');
            numSpan.className = 'slot-num';
            numSpan.innerText = idx + 1;
            slotEl.appendChild(numSpan);

            slotEl.addEventListener('click', () => {
                this.handleSlotClick(item, 'hotbar', idx);
            });

            grid.appendChild(slotEl);
        });
    }

    renderSlotContent(slotEl, item) {
        slotEl.innerHTML = '';
        if (item.id > 0 && item.count > 0) {
            const icon = createSlotItemIcon(item.id);
            if (icon) slotEl.appendChild(icon);

            const countSpan = document.createElement('span');
            countSpan.className = 'slot-count';
            countSpan.innerText = item.count;
            slotEl.appendChild(countSpan);
            slotEl.title = `${item.name} (${item.count})`;
        } else {
            slotEl.title = 'Puste';
        }
    }

    handleSlotClick(itemRef, slotType, slotIndex) {
        if (!this.cursorItem) {
            // Pick up item stack into cursor
            if (itemRef.id > 0 && itemRef.count > 0) {
                this.cursorItem = {
                    id: itemRef.id,
                    name: itemRef.name,
                    count: itemRef.count
                };
                itemRef.id = 0;
                itemRef.name = 'Puste';
                itemRef.count = 0;
            }
        } else {
            // Deposit or swap with cursor item
            if (itemRef.id === 0 || !itemRef.count || itemRef.count <= 0) {
                itemRef.id = this.cursorItem.id;
                itemRef.name = this.cursorItem.name;
                itemRef.count = this.cursorItem.count;
                this.cursorItem = null;
            } else if (itemRef.id === this.cursorItem.id) {
                const space = 64 - itemRef.count;
                if (space > 0) {
                    const toAdd = Math.min(space, this.cursorItem.count);
                    itemRef.count += toAdd;
                    this.cursorItem.count -= toAdd;
                    if (this.cursorItem.count <= 0) {
                        this.cursorItem = null;
                    }
                }
            } else {
                // Different item - swap
                const temp = { id: itemRef.id, name: itemRef.name, count: itemRef.count };
                itemRef.id = this.cursorItem.id;
                itemRef.name = this.cursorItem.name;
                itemRef.count = this.cursorItem.count;
                this.cursorItem = temp;
            }
        }

        this.renderHotbar();
        this.renderBackpackSlots();
        this.renderModalHotbar();
        this.updateCursorItemDisplay();
    }

    updateCursorItemDisplay() {
        if (!this.cursorItemEl) {
            this.cursorItemEl = document.getElementById('cursor-item-display');
        }
        if (!this.cursorItemEl) return;

        if (this.cursorItem && this.cursorItem.id > 0 && this.cursorItem.count > 0) {
            this.cursorItemEl.innerHTML = '';
            const icon = createSlotItemIcon(this.cursorItem.id);
            if (icon) this.cursorItemEl.appendChild(icon);
            const countSpan = document.createElement('span');
            countSpan.className = 'slot-count';
            countSpan.innerText = this.cursorItem.count;
            this.cursorItemEl.appendChild(countSpan);
            this.cursorItemEl.style.display = 'flex';
        } else {
            this.cursorItemEl.innerHTML = '';
            this.cursorItemEl.style.display = 'none';
        }
    }

    addItem(id, name, count = 1) {
        let remaining = count;

        // 1. Try to stack in hotbar
        for (const slot of this.hotbarBlocks) {
            if (slot.id === id && (slot.count || 0) < 64) {
                const space = 64 - slot.count;
                const toAdd = Math.min(space, remaining);
                slot.count += toAdd;
                remaining -= toAdd;
                if (remaining <= 0) break;
            }
        }

        // 2. Try to stack in backpack
        if (remaining > 0) {
            for (const slot of this.backpackSlots) {
                if (slot.id === id && (slot.count || 0) < 64) {
                    const space = 64 - slot.count;
                    const toAdd = Math.min(space, remaining);
                    slot.count += toAdd;
                    remaining -= toAdd;
                    if (remaining <= 0) break;
                }
            }
        }

        // 3. Put into first empty slot in hotbar
        if (remaining > 0) {
            const emptyHotbar = this.hotbarBlocks.find(s => !s.count || s.count <= 0 || s.id === 0);
            if (emptyHotbar) {
                emptyHotbar.id = id;
                emptyHotbar.name = name;
                emptyHotbar.count = remaining;
                remaining = 0;
            }
        }

        // 4. Put into first empty slot in backpack
        if (remaining > 0) {
            const emptyBackpack = this.backpackSlots.find(s => !s.count || s.count <= 0 || s.id === 0);
            if (emptyBackpack) {
                emptyBackpack.id = id;
                emptyBackpack.name = name;
                emptyBackpack.count = remaining;
                remaining = 0;
            }
        }

        if (remaining > 0) {
            this.showPopup('⚠️ Ekwipunek i plecak są pełne!');
        } else {
            this.showPopup(`+${count} ${name}`);
        }

        this.renderHotbar();
        if (this.isCraftingOpen) {
            this.renderBackpackSlots();
            this.renderModalHotbar();
        }
    }

    consumeActiveItem() {
        const item = this.hotbarBlocks[this.selectedSlotIndex];
        if (!item) return;
        if (item.count !== undefined) {
            item.count -= 1;
            if (item.count <= 0) {
                item.id = 0;
                item.name = 'Puste';
                item.count = 0;
            }
            this.renderHotbar();
            if (this.isCraftingOpen) {
                this.renderModalHotbar();
            }
        }
    }

    hasItem(itemId, minCount = 1) {
        let total = 0;
        for (const slot of this.hotbarBlocks) {
            if (slot.id === itemId && slot.count > 0) total += slot.count;
        }
        for (const slot of this.backpackSlots) {
            if (slot.id === itemId && slot.count > 0) total += slot.count;
        }
        return total >= minCount;
    }

    consumeItem(itemId, amount = 1) {
        let needed = amount;
        // 1. Try consuming from hotbar
        for (let i = 0; i < this.hotbarBlocks.length && needed > 0; i++) {
            const slot = this.hotbarBlocks[i];
            if (slot.id === itemId && slot.count > 0) {
                const take = Math.min(slot.count, needed);
                slot.count -= take;
                needed -= take;
                if (slot.count <= 0) {
                    slot.id = 0;
                    slot.name = 'Puste';
                    slot.count = 0;
                }
            }
        }
        // 2. Try consuming from backpack
        for (let i = 0; i < this.backpackSlots.length && needed > 0; i++) {
            const slot = this.backpackSlots[i];
            if (slot.id === itemId && slot.count > 0) {
                const take = Math.min(slot.count, needed);
                slot.count -= take;
                needed -= take;
                if (slot.count <= 0) {
                    slot.id = 0;
                    slot.name = 'Puste';
                    slot.count = 0;
                }
            }
        }
        this.renderHotbar();
        if (this.isCraftingOpen) {
            this.renderBackpackSlots();
            this.renderModalHotbar();
        }
        return needed === 0;
    }

    showPopup(text) {
        if (this.blockNameEl) {
            this.blockNameEl.innerText = text;
            this.blockNameEl.style.opacity = '1';
            clearTimeout(this.nameTimeout);
            this.nameTimeout = setTimeout(() => {
                if (this.blockNameEl) this.blockNameEl.style.opacity = '0';
            }, 1800);
        }
    }

    selectSlot(idx) {
        this.selectedSlotIndex = (idx + 9) % 9;
        const slots = this.hotbarEl.querySelectorAll('.hotbar-slot');
        slots.forEach((s, i) => {
            if (i === this.selectedSlotIndex) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });

        // Show active block name temporarily
        if (this.blockNameEl) {
            this.blockNameEl.innerText = HOTBAR_BLOCKS[this.selectedSlotIndex].name;
            this.blockNameEl.style.opacity = '1';
            clearTimeout(this.nameTimeout);
            this.nameTimeout = setTimeout(() => {
                this.blockNameEl.style.opacity = '0';
            }, 1500);
        }
    }

    toggleCraftingModal() {
        this.isCraftingOpen = !this.isCraftingOpen;
        if (this.isCraftingOpen) {
            if (this.overlayEl) this.overlayEl.style.display = 'none';
            this.player.controls.unlock();
            this.craftingModalEl.style.display = 'block';
            this.renderBackpackSlots();
            this.renderModalHotbar();
            this.updateCraftingDisplay();
        } else {
            if (this.cursorItem) {
                this.addItem(this.cursorItem.id, this.cursorItem.name, this.cursorItem.count);
                this.cursorItem = null;
                this.updateCursorItemDisplay();
            }
            this.craftingModalEl.style.display = 'none';
            if (!this.survival?.isDead) {
                this.player.controls.lock();
            }
        }
    }

    initCraftingUI() {
        const closeBtn = document.getElementById('close-crafting-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.toggleCraftingModal();
            });
        }

        const craftSlots = this.craftingModalEl.querySelectorAll('.craft-slot');
        craftSlots.forEach((slotEl) => {
            slotEl.addEventListener('click', () => {
                const sIdx = parseInt(slotEl.dataset.slot, 10);
                const currentVal = this.crafting.grid[sIdx];

                if (this.cursorItem) {
                    this.crafting.setSlot(sIdx, this.cursorItem.id);
                    this.cursorItem.count -= 1;
                    if (this.cursorItem.count <= 0) {
                        this.cursorItem = null;
                    }
                } else if (currentVal) {
                    const itemDef = getItem(currentVal) || { name: 'Przedmiot' };
                    this.cursorItem = {
                        id: currentVal,
                        name: itemDef.name || 'Przedmiot',
                        count: 1
                    };
                    this.crafting.setSlot(sIdx, null);
                } else {
                    const activeItem = this.hotbarBlocks[this.selectedSlotIndex];
                    if (activeItem && activeItem.id > 0 && activeItem.count > 0) {
                        this.crafting.setSlot(sIdx, activeItem.id);
                        activeItem.count -= 1;
                        if (activeItem.count <= 0) {
                            activeItem.id = 0;
                            activeItem.name = 'Puste';
                            activeItem.count = 0;
                        }
                        this.renderHotbar();
                        this.renderModalHotbar();
                    }
                }
                this.updateCraftingDisplay();
                this.updateCursorItemDisplay();
            });
        });

        const outputSlot = document.getElementById('craft-output-slot');
        if (outputSlot) {
            outputSlot.addEventListener('click', () => {
                const result = this.crafting.craft();
                if (result) {
                    if (!this.cursorItem) {
                        this.cursorItem = {
                            id: result.item.id,
                            name: result.item.name,
                            count: result.count
                        };
                    } else if (this.cursorItem.id === result.item.id) {
                        this.cursorItem.count += result.count;
                    } else {
                        this.addItem(result.item.id, result.item.name, result.count);
                    }
                    this.renderHotbar();
                    this.renderBackpackSlots();
                    this.renderModalHotbar();
                    this.updateCraftingDisplay();
                    this.updateCursorItemDisplay();
                    console.log(`[Crafting] Stworzono: ${result.item.name} x${result.count}`);
                }
            });
        }
    }

    updateCraftingDisplay() {
        const craftSlots = this.craftingModalEl.querySelectorAll('.craft-slot');
        craftSlots.forEach((slotEl) => {
            const sIdx = parseInt(slotEl.dataset.slot, 10);
            const val = this.crafting.grid[sIdx];
            if (!val) {
                slotEl.innerHTML = '';
                slotEl.style.background = '#8b8b8b';
            } else {
                slotEl.innerHTML = '';
                const icon = createSlotItemIcon(val);
                if (icon) {
                    slotEl.appendChild(icon);
                } else {
                    const itemDef = getItem(val);
                    slotEl.innerText = itemDef ? itemDef.name : 'Blok';
                }
                slotEl.style.background = '#555555';
                slotEl.style.color = '#ffffff';
            }
        });

        const outputSlot = document.getElementById('craft-output-slot');
        if (outputSlot) {
            const recipe = this.crafting.evaluateRecipe();
            if (recipe) {
                outputSlot.innerHTML = '';
                const icon = createSlotItemIcon(recipe.item.id);
                if (icon) {
                    icon.style.marginRight = '6px';
                    icon.style.verticalAlign = 'middle';
                    outputSlot.appendChild(icon);
                }
                const txt = document.createElement('span');
                txt.innerText = `${recipe.item.name} (${recipe.count})`;
                outputSlot.appendChild(txt);
                outputSlot.style.background = '#15803d';
                outputSlot.style.cursor = 'pointer';
            } else {
                outputSlot.innerText = 'Puste';
                outputSlot.style.background = '#4b5563';
                outputSlot.style.cursor = 'default';
            }
        }
    }

    initEvents() {
        // Keyboard 1-9 & 'R' or 'E' for backpack/inventory/crafting
        window.addEventListener('keydown', (e) => {
            const isR = e.code === 'KeyR' || e.key === 'r' || e.key === 'R';
            const isE = e.code === 'KeyE' || e.key === 'e' || e.key === 'E';
            if (isR || isE) {
                e.preventDefault();
                this.toggleCraftingModal();
                return;
            }

            if (e.code === 'Escape' || e.key === 'Escape') {
                if (this.isCraftingOpen) {
                    e.preventDefault();
                    this.toggleCraftingModal();
                    return;
                }
            }

            const num = parseInt(e.key, 10);
            if (!isNaN(num) && num >= 1 && num <= 9) {
                this.selectSlot(num - 1);
            }
        });

        // Mouse move to track cursor item preview
        window.addEventListener('mousemove', (e) => {
            if (this.isCraftingOpen && this.cursorItem && this.cursorItemEl) {
                this.cursorItemEl.style.left = `${e.clientX + 10}px`;
                this.cursorItemEl.style.top = `${e.clientY + 10}px`;
            }
        });

        // Mouse wheel
        window.addEventListener('wheel', (e) => {
            if (!this.player.controls.isLocked) return;
            if (e.deltaY > 0) {
                this.selectSlot(this.selectedSlotIndex + 1);
            } else if (e.deltaY < 0) {
                this.selectSlot(this.selectedSlotIndex - 1);
            }
        });

        // Menu Buttons & Start Game handling
        const startGame = () => {
            if (this.isCraftingOpen) {
                this.toggleCraftingModal();
            }
            this.overlayEl.style.display = 'none';
            this.hideResetConfirmation();
            try {
                this.player.controls.lock();
            } catch (err) {
                console.warn("[UI] Pointer lock error:", err);
            }
        };

        const resumeBtn = document.getElementById('resume-game-btn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                startGame();
            });
        }

        const resetBtn = document.getElementById('reset-world-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showResetConfirmation();
            });
        }

        const confirmYesBtn = document.getElementById('confirm-reset-yes');
        if (confirmYesBtn) {
            confirmYesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.storage) {
                    this.storage.resetWorld(true);
                } else {
                    localStorage.clear();
                    window.location.reload();
                }
            });
        }

        const confirmNoBtn = document.getElementById('confirm-reset-no');
        if (confirmNoBtn) {
            confirmNoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideResetConfirmation();
            });
        }

        // Pointer Lock events
        this.overlayEl.addEventListener('click', (e) => {
            if (!e.target.closest('#reset-confirm-box') && !e.target.closest('#reset-world-btn')) {
                startGame();
            }
        });

        // Clicking on game canvas also locks controls if menu is closed
        if (this.player && this.player.domElement) {
            this.player.domElement.addEventListener('click', () => {
                if (this.overlayEl.style.display === 'none' && !this.isCraftingOpen && !this.survival?.isDead) {
                    this.player.controls.lock();
                }
            });
        }

        this.player.controls.addEventListener('lock', () => {
            this.overlayEl.style.display = 'none';
            this.hideResetConfirmation();
        });

        this.player.controls.addEventListener('unlock', () => {
            if (!this.isCraftingOpen && !this.survival?.isDead) {
                const titleEl = document.getElementById('menu-title');
                const subtitleEl = document.getElementById('menu-subtitle');
                if (titleEl) titleEl.innerText = 'MENU GRY (PAUZA)';
                if (subtitleEl) subtitleEl.innerText = 'Gra wstrzymana. Wybierz opcję poniżej:';
                this.hideResetConfirmation();
                this.overlayEl.style.display = 'flex';
            }
        });
    }

    showResetConfirmation() {
        const confirmBox = document.getElementById('reset-confirm-box');
        const menuButtons = document.getElementById('main-menu-buttons');
        if (confirmBox) confirmBox.style.display = 'block';
        if (menuButtons) menuButtons.style.display = 'none';
    }

    hideResetConfirmation() {
        const confirmBox = document.getElementById('reset-confirm-box');
        const menuButtons = document.getElementById('main-menu-buttons');
        if (confirmBox) confirmBox.style.display = 'none';
        if (menuButtons) menuButtons.style.display = 'flex';
    }

    update() {
        // Update FPS counter
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFpsUpdate >= 500) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }

        // Update Coordinates & Biome
        const px = this.player.position.x.toFixed(1);
        const py = this.player.position.y.toFixed(1);
        const pz = this.player.position.z.toFixed(1);
        const biome = this.world.getBiome(Math.floor(this.player.position.x), Math.floor(this.player.position.z));
        const activeItem = HOTBAR_BLOCKS[this.selectedSlotIndex];

        if (this.infoEl) {
            let zombieText = 'Brak';
            let skeletonText = 'Brak';
            if (this.animals && this.animals.animals) {
                const z = this.animals.animals.find(a => a.type === 'zombie' && !a.isDead);
                if (z) {
                    const dist = z.position.distanceTo(this.player.position).toFixed(1);
                    zombieText = `${dist}m (HP: ${z.health}/${z.maxHealth})`;
                }
                const sk = this.animals.animals.find(a => a.type === 'skeleton' && !a.isDead);
                if (sk) {
                    const dist = sk.position.distanceTo(this.player.position).toFixed(1);
                    skeletonText = `${dist}m (HP: ${sk.health}/${sk.maxHealth})`;
                }
            }

            this.infoEl.innerHTML = `
                <div><b>Minecraft Web POC</b> | FPS: ${this.fps}</div>
                <div>Pozycja: X: ${px} | Y: ${py} | Z: ${pz}</div>
                <div>Biom: <span class="badge">${biome}</span></div>
                <div>Zombie: <b style="color: #4ade80">${zombieText}</b> | Szkielet: <b style="color: #e2e8f0">${skeletonText}</b></div>
                <div>W ręku: <b>${activeItem ? activeItem.name : 'Puste'}</b></div>
            `;
        }
    }
}
