import { BLOCK_DEF, AtlasCanvas, TILE_SIZE, ATLAS_COLS } from './textures.js';
import { ITEMS } from './crafting.js';

export const HOTBAR_BLOCKS = [
    { slot: 1, id: 1, name: 'Trawa', count: 64 },
    { slot: 2, id: 2, name: 'Ziemia', count: 64 },
    { slot: 3, id: 3, name: 'Kamień', count: 64 },
    { slot: 4, id: 4, name: 'Drewno', count: 32 },
    { slot: 5, id: 5, name: 'Liście', count: 64 },
    { slot: 6, id: 6, name: 'Piasek', count: 64 },
    { slot: 7, id: 7, name: 'Śnieg', count: 64 },
    { slot: 8, id: 8, name: 'Deski', count: 32 },
    { slot: 9, id: 24, name: 'Drewniany Miecz', count: 1 }
];

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

        this.fps = 60;
        this.lastFpsUpdate = performance.now();
        this.frameCount = 0;

        this.renderHotbar();
        this.renderSurvivalBars(this.survival ? this.survival.health : 20, this.survival ? this.survival.hunger : 20);
        this.initEvents();
        this.initCraftingUI();
    }

    getActiveBlockId() {
        return HOTBAR_BLOCKS[this.selectedSlotIndex].id;
    }

    renderSurvivalBars(health = 20, hunger = 20) {
        if (!this.heartsBarEl || !this.hungerBarEl) return;

        // 10 Hearts (20 HP)
        let heartsHtml = '';
        for (let i = 0; i < 10; i++) {
            const heartVal = (i + 1) * 2;
            if (health >= heartVal) {
                heartsHtml += '<span class="heart-icon">❤️</span>';
            } else if (health === heartVal - 1) {
                heartsHtml += '<span class="heart-icon">💔</span>';
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

        HOTBAR_BLOCKS.forEach((item, idx) => {
            const slot = document.createElement('div');
            slot.className = `hotbar-slot ${idx === this.selectedSlotIndex ? 'active' : ''}`;
            slot.id = `slot-${idx}`;
            slot.title = item.name;

            // Create icon
            if (item.id === 20) {
                // Pixel-art square Minecraft Stick icon!
                const stickCanvas = createPixelStickCanvas();
                slot.appendChild(stickCanvas);
            } else if (item.id >= 21) {
                // Item icon emoji / badge
                const itemSpan = document.createElement('span');
                itemSpan.style.fontSize = '20px';
                if (item.id === 21) itemSpan.innerText = '⛏️';
                else if (item.id === 22) itemSpan.innerText = '⚒️';
                else if (item.id === 23) itemSpan.innerText = '🍎';
                else if (item.id === 24) itemSpan.innerText = '🗡️';
                else if (item.id === 25) itemSpan.innerText = '⚔️';
                else if (item.id === 26) itemSpan.innerText = '🥩';
                else if (item.id === 27) itemSpan.innerText = '🦴';
                else if (item.id === 28) itemSpan.innerText = '🏹';
                slot.appendChild(itemSpan);
            } else {
                // Voxel block texture icon from Atlas
                const iconCanvas = document.createElement('canvas');
                iconCanvas.width = 16;
                iconCanvas.height = 16;
                iconCanvas.className = 'slot-icon';
                const ctx = iconCanvas.getContext('2d');

                const def = BLOCK_DEF[item.id];
                const tileIdx = def?.tiles ? def.tiles[0] : 0;
                const sx = (tileIdx % ATLAS_COLS) * TILE_SIZE;
                const sy = Math.floor(tileIdx / ATLAS_COLS) * TILE_SIZE;

                ctx.drawImage(AtlasCanvas, sx, sy, 16, 16, 0, 0, 16, 16);
                slot.appendChild(iconCanvas);
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

    addItem(id, name, count = 1) {
        let slot = HOTBAR_BLOCKS.find(s => s.id === id);
        if (slot) {
            slot.count = (slot.count || 0) + count;
        } else {
            slot = HOTBAR_BLOCKS.find(s => !s.count || s.count <= 0);
            if (slot) {
                slot.id = id;
                slot.name = name;
                slot.count = count;
            } else {
                HOTBAR_BLOCKS[this.selectedSlotIndex] = {
                    slot: this.selectedSlotIndex + 1,
                    id,
                    name,
                    count
                };
            }
        }
        this.renderHotbar();
        this.showPopup(`+${count} ${name}`);
    }

    consumeActiveItem() {
        const item = HOTBAR_BLOCKS[this.selectedSlotIndex];
        if (!item) return;
        if (item.count !== undefined) {
            item.count -= 1;
            if (item.count <= 0) {
                item.id = 0;
                item.name = 'Puste';
                item.count = 0;
            }
            this.renderHotbar();
        }
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
            this.player.controls.unlock();
            this.craftingModalEl.style.display = 'block';
            this.updateCraftingDisplay();
        } else {
            this.craftingModalEl.style.display = 'none';
            this.player.controls.lock();
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

                // If slot empty: place currently selected hotbar item into it
                if (!currentVal) {
                    const activeItem = HOTBAR_BLOCKS[this.selectedSlotIndex];
                    this.crafting.setSlot(sIdx, activeItem.id);
                } else {
                    // Empty slot
                    this.crafting.setSlot(sIdx, null);
                }
                this.updateCraftingDisplay();
            });
        });

        const outputSlot = document.getElementById('craft-output-slot');
        if (outputSlot) {
            outputSlot.addEventListener('click', () => {
                const result = this.crafting.craft();
                if (result) {
                    // Place crafted item into current active slot!
                    HOTBAR_BLOCKS[this.selectedSlotIndex] = {
                        slot: this.selectedSlotIndex + 1,
                        id: result.item.id,
                        name: result.item.name,
                        count: result.count
                    };
                    this.renderHotbar();
                    this.updateCraftingDisplay();
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
                let name = 'Blok';
                if (val === 4) name = 'Drewno';
                else if (val === 8) name = 'Deski';
                else if (val === 3) name = 'Kamień';
                else if (val === 20) name = 'Patyk';

                slotEl.innerHTML = '';
                if (val === 20) {
                    const canvas = createPixelStickCanvas();
                    canvas.style.width = '28px';
                    canvas.style.height = '28px';
                    canvas.style.display = 'block';
                    canvas.style.margin = 'auto';
                    slotEl.appendChild(canvas);
                } else {
                    slotEl.innerText = name;
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
                if (recipe.item.id === 20) {
                    const canvas = createPixelStickCanvas();
                    canvas.style.width = '24px';
                    canvas.style.height = '24px';
                    canvas.style.verticalAlign = 'middle';
                    canvas.style.marginRight = '6px';
                    outputSlot.appendChild(canvas);
                    const txt = document.createElement('span');
                    txt.innerText = `${recipe.item.name} (${recipe.count})`;
                    outputSlot.appendChild(txt);
                } else {
                    outputSlot.innerText = `${recipe.item.name} (${recipe.count})`;
                }
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
        // Keyboard 1-9 & 'E' for inventory/crafting
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE') {
                e.preventDefault();
                this.toggleCraftingModal();
                return;
            }

            if (e.code === 'Escape' && this.isCraftingOpen) {
                this.toggleCraftingModal();
                return;
            }

            const num = parseInt(e.key, 10);
            if (!isNaN(num) && num >= 1 && num <= 9) {
                this.selectSlot(num - 1);
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

        // Menu Buttons
        const resumeBtn = document.getElementById('resume-game-btn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!this.isCraftingOpen) {
                    this.player.controls.lock();
                }
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
            if (!this.isCraftingOpen && !e.target.closest('#reset-confirm-box') && !e.target.closest('#reset-world-btn')) {
                this.player.controls.lock();
            }
        });

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
                <div>W ręku: <b>${activeItem.name}</b></div>
            `;
        }
    }
}
