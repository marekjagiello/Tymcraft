import { BLOCK_DEF, AtlasCanvas, TILE_SIZE, ATLAS_COLS } from './textures.js?v=water_2';
import { ITEMS, RECIPES, canCraftRecipe, craftRecipeDirect } from './crafting.js?v=pig_kingdom_dialogue_stage2_v8';
import { getItem } from './items.js?v=pig_kingdom_dialogue_stage2_v8';
import { eventBus } from './events.js';
import { playCraftSuccessSound, speakText, playPigGruntSound } from './audio.js?v=pig_kingdom_dialogue_stage2_v8';

// 9 Pustych Slotów Paska Podręcznego (gracz zaczyna bez żadnych rzeczy na życzenie Tymka!)
export const HOTBAR_BLOCKS = Array.from({ length: 9 }, (_, i) => ({
    slot: i + 1,
    id: 0,
    name: 'Puste',
    count: 0
}));

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
        else if (itemId === 34) {
            itemSpan.innerText = '🔴';
            itemSpan.style.filter = 'drop-shadow(0 0 6px #ef4444)';
        }
        else if (itemId === 35) {
            itemSpan.innerText = '🗡️';
            itemSpan.style.filter = 'drop-shadow(0 0 7px #ef4444)';
        }
        else if (itemId === 36) {
            itemSpan.innerText = '🧨';
            itemSpan.style.filter = 'drop-shadow(0 0 5px #e11d48)';
        }
        else if (itemId === 37) {
            itemSpan.innerText = '🛡️';
            itemSpan.style.filter = 'drop-shadow(0 0 8px #ef4444)';
        }
        else if (itemId === 38) {
            itemSpan.innerText = '🥩'; // Surowy Schab
        }
        else if (itemId === 39) {
            itemSpan.innerText = '🍖'; // Surowa Baranina
        }
        else if (itemId === 40) {
            itemSpan.innerText = '🥩'; // Surowa Wołowina
        }
        else if (itemId === 41) {
            itemSpan.innerText = '🟤'; // Skóra
        }
        else if (itemId === 42) {
            itemSpan.innerText = '🧶'; // Biała Wełna
        }
        else if (itemId === 43) {
            itemSpan.innerText = '🛡️'; // Kamienna Zbroja
            itemSpan.style.filter = 'drop-shadow(0 0 5px #94a3b8)';
        }
        else if (itemId === 44) {
            itemSpan.innerText = '🎁'; // Mystery Box
            itemSpan.style.filter = 'drop-shadow(0 0 7px #f59e0b)';
        }
        else if (itemId === 45) {
            itemSpan.innerText = '💧'; // Butelka Wody
            itemSpan.style.filter = 'drop-shadow(0 0 6px #38bdf8)';
        }
        else if (itemId === 46) {
            itemSpan.innerText = '🧥'; // Ciepła Kurtka
            itemSpan.style.filter = 'drop-shadow(0 0 6px #f59e0b)';
        }
        else if (itemId === 47) {
            itemSpan.innerText = '⚡'; // Laserowy Miecz
            itemSpan.style.filter = 'drop-shadow(0 0 8px #38bdf8)';
        }
        else if (itemId === 48) {
            itemSpan.innerText = '🗡️'; // Miecz Bedrockowy
            itemSpan.style.filter = 'drop-shadow(0 0 9px #7c3aed)';
        }
        else if (itemId === 49) {
            itemSpan.innerText = '💠'; // Niebieski Pierwiastek
            itemSpan.style.filter = 'drop-shadow(0 0 9px #38bdf8)';
        }
        else if (itemId === 50) {
            itemSpan.innerText = '🪄'; // Magiczna Różdżka
            itemSpan.style.filter = 'drop-shadow(0 0 10px #c084fc)';
        }
        else if (itemId === 51) {
            itemSpan.innerText = '🌈'; // Kolorowy Blok 626
            itemSpan.style.filter = 'drop-shadow(0 0 9px #ec4899)';
        }
        else if (itemId === 52) {
            itemSpan.innerText = '🔥'; // Krzesiwo
            itemSpan.style.filter = 'drop-shadow(0 0 9px #f97316)';
        }
        else if (itemId === 53) {
            itemSpan.innerText = '⚡🌈'; // Napiorunowany Kolorowy Blok
            itemSpan.style.filter = 'drop-shadow(0 0 11px #38bdf8)';
        }
        else if (itemId === 54) {
            itemSpan.innerText = '🌈🗡️'; // Kolorowy Miecz
            itemSpan.style.filter = 'drop-shadow(0 0 10px #f43f5e)';
        }
        else if (itemId === 55) {
            itemSpan.innerText = '🌈🏹'; // Kolorowy Łuk
            itemSpan.style.filter = 'drop-shadow(0 0 10px #06b6d4)';
        }
        else if (itemId === 56) {
            itemSpan.innerText = '🌈🎯'; // Magiczna Kolorowa Strzała
            itemSpan.style.filter = 'drop-shadow(0 0 10px #eab308)';
        }
        else if (itemId === 57) {
            itemSpan.innerText = '🧵'; // Linka
            itemSpan.style.filter = 'drop-shadow(0 0 5px #e2e8f0)';
        }
        else if (itemId === 58) {
            itemSpan.innerText = '🔩'; // Żelazo
            itemSpan.style.filter = 'drop-shadow(0 0 5px #cbd5e1)';
        }
        else if (itemId === 59) {
            itemSpan.innerText = '🐷🧱'; // Świniowy Blok
            itemSpan.style.filter = 'drop-shadow(0 0 8px #f472b6)';
        }
        else if (itemId === 60) {
            itemSpan.innerText = '🗿'; // Odstraszacz Potworów
            itemSpan.style.filter = 'drop-shadow(0 0 8px #a855f7)';
        }
        return itemSpan;
    }



    if (itemId === 17) {
        const itemSpan = document.createElement('span');
        itemSpan.style.fontSize = '20px';
        itemSpan.innerText = '🌹';
        return itemSpan;
    }
    if (itemId === 18) {
        const itemSpan = document.createElement('span');
        itemSpan.style.fontSize = '20px';
        itemSpan.innerText = '🌼';
        return itemSpan;
    }
    if (itemId === 19) {
        const itemSpan = document.createElement('span');
        itemSpan.style.fontSize = '20px';
        itemSpan.innerText = '🪷';
        return itemSpan;
    }
    if (itemId >= 1 && itemId <= 19) {
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
        this.loadingOverlayEl = document.getElementById('loading-overlay');
        this.blockNameEl = document.getElementById('block-name-popup');
        this.heartsBarEl = document.getElementById('hearts-bar');
        this.bubblesBarEl = document.getElementById('bubbles-bar');
        this.hungerBarEl = document.getElementById('hunger-bar');
        this.craftingModalEl = document.getElementById('crafting-modal');

        this.isCraftingOpen = false;
        this.isGameActive = false;
        this.isLoading = false;
        this.lastUnlockAllowedTime = 0;

        this.hotbarBlocks = HOTBAR_BLOCKS;
        this.backpackSlots = BACKPACK_SLOTS;
        this.cursorItem = null;
        this.cursorItemEl = document.getElementById('cursor-item-display');

        // In-game Chat state
        this.isChatOpen = false;
        this.playerName = 'Tymek';
        this.chatMessagesEl = document.getElementById('chat-messages');
        this.chatInputRowEl = document.getElementById('chat-input-row');
        this.chatInputEl = document.getElementById('chat-input');

        this.fps = 60;
        this.lastFpsUpdate = performance.now();
        this.frameCount = 0;

        // Tracking one-time secret codes (resettable after beating Boss Robot)
        this.usedSecretCodes = new Set();
        try {
            const saved = localStorage.getItem('m2_used_codes');
            if (saved) {
                JSON.parse(saved).forEach(c => this.usedSecretCodes.add(c));
            }
        } catch (_) {}

        this.renderHotbar();
        this.renderBackpackSlots();
        this.renderModalHotbar();
        this.renderSurvivalBars(this.survival ? this.survival.health : 20, this.survival ? this.survival.hunger : 20);
        this.initEvents();
        this.initCraftingUI();
        this.initChat();
        this.initBusEvents();
    }

    isCodeUsed(codeKey) {
        return this.usedSecretCodes.has(codeKey);
    }

    markCodeUsed(codeKey) {
        this.usedSecretCodes.add(codeKey);
        try {
            localStorage.setItem('m2_used_codes', JSON.stringify([...this.usedSecretCodes]));
        } catch (_) {}
    }

    resetSecretCodes() {
        this.usedSecretCodes.clear();
        try {
            localStorage.removeItem('m2_used_codes');
        } catch (_) {}
    }

    showBossBar(title = '👑 BOSS ROBOT', hp = 160, maxHp = 160) {
        if (!this.bossHudEl) this.bossHudEl = document.getElementById('boss-hud');
        if (!this.bossTitleEl) this.bossTitleEl = document.getElementById('boss-title');
        if (!this.bossBarFillEl) this.bossBarFillEl = document.getElementById('boss-bar-fill');
        if (!this.bossHpTextEl) this.bossHpTextEl = document.getElementById('boss-hp-text');

        if (this.bossTitleEl) this.bossTitleEl.textContent = title;
        this.updateBossBar(hp, maxHp);
        if (this.bossHudEl) this.bossHudEl.style.display = 'flex';
    }

    updateBossBar(hp, maxHp = 160) {
        if (!this.bossHudEl) this.bossHudEl = document.getElementById('boss-hud');
        if (!this.bossBarFillEl) this.bossBarFillEl = document.getElementById('boss-bar-fill');
        if (!this.bossHpTextEl) this.bossHpTextEl = document.getElementById('boss-hp-text');

        const ratio = Math.max(0, Math.min(1.0, hp / maxHp));
        if (this.bossBarFillEl) {
            this.bossBarFillEl.style.width = `${(ratio * 100).toFixed(1)}%`;
        }
        if (this.bossHpTextEl) {
            this.bossHpTextEl.textContent = `${Math.ceil(Math.max(0, hp))} / ${maxHp}`;
        }
    }

    hideBossBar() {
        if (!this.bossHudEl) this.bossHudEl = document.getElementById('boss-hud');
        if (this.bossHudEl) this.bossHudEl.style.display = 'none';
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
        eventBus.on('chat:system_message', (data) => {
            if (data && data.text) {
                this.addChatMessage(data.sender || '🛡️ System Ochrony', data.text, 'chat-success');
            }
        });
    }

    startLoadingSequence(onComplete = null) {
        if (this.isLoading) return;
        this.isLoading = true;

        const loadingOverlay = document.getElementById('loading-overlay') || this.loadingOverlayEl;
        const statusText = document.getElementById('loading-status-text');
        const barFill = document.getElementById('loading-bar-fill');
        const percentText = document.getElementById('loading-percent-text');
        const tipText = document.getElementById('loading-tip-text');

        if (this.overlayEl) {
            this.overlayEl.style.display = 'none';
        }
        this.hideResetConfirmation();

        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
            loadingOverlay.style.opacity = '1';
        }

        const tips = [
            "💡 Wskazówka: Naciśnij PPM na misia lub wciśnij P, aby na niego wsiąść i ujeżdżać! 🐻",
            "💡 Wskazówka: Nurkując pod wodą, pilnuj bąbelków powietrza 🫧 – nie pozwól im zgasnąć!",
            "💡 Wskazówka: Spadając do wody z dowolnej wysokości nie odniesiesz żadnych obrażeń! 🌊",
            "💡 Wskazówka: Zrywaj czerwone róże 🌹 i żółte mlecze 🌼, aby karmić owieczki oraz świnki!"
        ];
        if (tipText) {
            tipText.innerText = tips[Math.floor(Math.random() * tips.length)];
        }

        const stages = [
            { progress: 20, text: "🌍 Generowanie klockowego terenu, wzgórz i jaskiń..." },
            { progress: 45, text: "🌊 Wypełnianie błękitnych jezior, fal i lilii wodnych..." },
            { progress: 70, text: "🌹 Sadzenie pachnących róż, mleczy oraz drzew..." },
            { progress: 90, text: "🐻 Budzenie przyjaznych niedźwiedzi i owieczek..." },
            { progress: 100, text: "🎮 Świat wygenerowany pomyślnie! Wkraczanie do gry..." }
        ];

        let currentStageIdx = 0;
        const targetDuration = 1400; // 1.4s smooth world generation
        const startTime = performance.now();

        const updateProgress = () => {
            const elapsed = performance.now() - startTime;
            const progressRatio = Math.min(1, elapsed / targetDuration);
            const currentPercent = Math.min(100, Math.floor(progressRatio * 100));

            if (barFill) barFill.style.width = `${currentPercent}%`;
            if (percentText) percentText.innerText = `${currentPercent}%`;

            while (currentStageIdx < stages.length && currentPercent >= stages[currentStageIdx].progress) {
                if (statusText) statusText.innerText = stages[currentStageIdx].text;
                currentStageIdx++;
            }

            if (progressRatio < 1) {
                requestAnimationFrame(updateProgress);
            } else {
                setTimeout(() => {
                    if (loadingOverlay) {
                        loadingOverlay.style.opacity = '0';
                        setTimeout(() => {
                            loadingOverlay.style.display = 'none';
                        }, 250);
                    }
                    this.isLoading = false;
                    this.isGameActive = true;
                    this.lastUnlockAllowedTime = Date.now() + 1000;
                    try {
                        this.player.controls.lock();
                    } catch (e) {
                        console.warn("[UI] Lock error:", e);
                    }
                    if (onComplete) onComplete();
                }, 100);
            }
        };

        requestAnimationFrame(updateProgress);
    }

    getActiveBlockId() {
        return HOTBAR_BLOCKS[this.selectedSlotIndex].id;
    }

    renderSurvivalBars(health = 20, hunger = 20, maxHealth = 20) {
        if (!this.heartsBarEl || !this.hungerBarEl) return;

        // Render hearts up to maxHealth (10 hearts for 20 HP, 13 for Stone, 15 for Diamond, 20 for Ruby)
        const isRuby = (this.survival && this.survival.hasRubyArmor) || maxHealth >= 40;
        const isStone = (this.survival && this.survival.armorType === 43) || maxHealth === 26;
        const totalHearts = Math.max(10, Math.ceil(maxHealth / 2));
        let heartsHtml = '';
        for (let i = 0; i < totalHearts; i++) {
            const heartVal = (i + 1) * 2;
            const isArmorHeart = i >= 10;
            const fullIcon = isArmorHeart ? (isRuby ? '🔴' : (isStone ? '🩶' : '💎')) : '❤️';
            const halfIcon = isArmorHeart ? (isRuby ? '🛡️' : (isStone ? '🛡️' : '🔷')) : '💔';
            if (health >= heartVal) {
                heartsHtml += `<span class="heart-icon">${fullIcon}</span>`;
            } else if (health === heartVal - 1) {
                heartsHtml += `<span class="heart-icon">${halfIcon}</span>`;
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

    updateBubblesBar(oxygen = 10, maxOxygen = 10, isHeadUnderwater = false) {
        if (!this.bubblesBarEl) {
            this.bubblesBarEl = document.getElementById('bubbles-bar');
        }
        if (!this.bubblesBarEl) return;

        // Display oxygen bubble meter whenever submerged or recovering
        if (isHeadUnderwater || oxygen < maxOxygen) {
            this.bubblesBarEl.style.display = 'flex';
            const current = Math.ceil(oxygen);
            let bubblesHtml = '';
            for (let i = 0; i < maxOxygen; i++) {
                if (i < current) {
                    bubblesHtml += '<span class="bubble-icon">🫧</span>';
                } else {
                    bubblesHtml += '<span class="bubble-icon" style="opacity:0.3; filter:grayscale(1);">💨</span>';
                }
            }
            this.bubblesBarEl.innerHTML = bubblesHtml;
        } else {
            this.bubblesBarEl.style.display = 'none';
        }
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
        if (this.isCraftingOpen) this.renderRecipeBook();
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
            this.renderRecipeBook();
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
                this.renderRecipeBook();
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
            this.renderRecipeBook();
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
            const slotItem = HOTBAR_BLOCKS[this.selectedSlotIndex];
            if (slotItem && slotItem.id === 50 && this.interaction && this.interaction.wandSpells) {
                const sp = this.interaction.wandSpells[this.interaction.currentWandSpellIdx];
                this.blockNameEl.innerText = `🪄 Magiczna Różdżka [${sp.name}] (LPM: czar, PPM / V / X: zmiana)`;
            } else if (slotItem) {
                this.blockNameEl.innerText = slotItem.name;
            }
            this.blockNameEl.style.opacity = '1';
            clearTimeout(this.nameTimeout);
            this.nameTimeout = setTimeout(() => {
                this.blockNameEl.style.opacity = '0';
            }, 1800);
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
            this.renderRecipeBook();
        } else {
            if (this.cursorItem) {
                this.addItem(this.cursorItem.id, this.cursorItem.name, this.cursorItem.count);
                this.cursorItem = null;
                this.updateCursorItemDisplay();
            }
            this.craftingModalEl.style.display = 'none';
            this.lastUnlockAllowedTime = Date.now() + 500;
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

        // Przycisk otwierania/zwijania Księgi Receptur (📗)
        const toggleBookBtn = document.getElementById('toggle-recipe-book-btn');
        const bookContainer = document.getElementById('recipe-book-container');
        if (toggleBookBtn && bookContainer) {
            toggleBookBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = bookContainer.style.display === 'none';
                bookContainer.style.display = isHidden ? 'flex' : 'none';
                const iconEl = toggleBookBtn.querySelector('.book-icon');
                if (iconEl) iconEl.innerText = isHidden ? '📗' : '📖';
            });
        }

        // Zakładki kategorii w Księdze Receptur
        const tabs = this.craftingModalEl.querySelectorAll('.recipe-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.recipeBookCategory = tab.dataset.cat || 'all';
                this.renderRecipeBook();
            });
        });

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
                    this.renderRecipeBook();
                    console.log(`[Crafting] Stworzono: ${result.item.name} x${result.count}`);
                    eventBus.emit('craft:item', { id: result.item.id });
                }
            });
        }

        this.renderRecipeBook();
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
        this.renderRecipeBook();
    }

    // ==============================================================================
    // 📖 Renderowanie Interaktywnej Księgi Receptur (Recipe Book) na życzenie Tymka
    // ==============================================================================
    renderRecipeBook() {
        const listEl = document.getElementById('recipe-cards-list');
        const readyCountEl = document.getElementById('recipe-ready-count');
        if (!listEl) return;

        listEl.innerHTML = '';
        let readyCount = 0;

        const currentCat = this.recipeBookCategory || 'all';
        const filtered = RECIPES.filter(r => currentCat === 'all' || r.category === currentCat);

        filtered.forEach((recipe) => {
            const { canCraft, missing } = canCraftRecipe(recipe, this);
            if (canCraft) readyCount++;

            const card = document.createElement('div');
            card.className = `recipe-card ${canCraft ? 'available' : 'unavailable'}`;
            card.dataset.recipeId = recipe.id;

            const iconSpan = document.createElement('span');
            iconSpan.className = 'recipe-icon';
            const slotIcon = createSlotItemIcon(recipe.output.id);
            if (slotIcon) {
                iconSpan.appendChild(slotIcon);
            } else {
                iconSpan.innerText = '📦';
            }

            const texts = document.createElement('div');
            texts.className = 'recipe-texts';

            const nameSpan = document.createElement('div');
            nameSpan.className = 'recipe-name';
            nameSpan.innerText = `${recipe.output.name} (x${recipe.output.count})`;

            const ingSpan = document.createElement('div');
            ingSpan.className = 'recipe-ingredients';
            ingSpan.style.display = 'flex';
            ingSpan.style.flexWrap = 'wrap';
            ingSpan.style.gap = '6px';
            ingSpan.style.marginTop = '4px';

            recipe.ingredients.forEach(ing => {
                const allowedIds = ing.alternatives || [ing.id];
                let count = 0;
                for (const id of allowedIds) {
                    for (const slot of this.hotbarBlocks) { if (slot.id === id && slot.count > 0) count += slot.count; }
                    for (const slot of this.backpackSlots) { if (slot.id === id && slot.count > 0) count += slot.count; }
                }
                const isSatisfied = count >= ing.count;

                const chip = document.createElement('span');
                chip.className = 'recipe-ingredient-chip';
                chip.style.display = 'inline-flex';
                chip.style.alignItems = 'center';
                chip.style.gap = '4px';
                chip.style.padding = '2px 6px';
                chip.style.borderRadius = '6px';
                chip.style.fontSize = '11px';
                chip.style.background = isSatisfied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
                chip.style.border = isSatisfied ? '1px solid #22c55e' : '1px solid #ef4444';
                chip.style.color = isSatisfied ? '#86efac' : '#fca5a5';

                const chipIcon = createSlotItemIcon(ing.id);
                if (chipIcon) {
                    chipIcon.style.width = '16px';
                    chipIcon.style.height = '16px';
                    chipIcon.style.imageRendering = 'pixelated';
                    chipIcon.style.verticalAlign = 'middle';
                    chip.appendChild(chipIcon);
                }

                const txt = document.createElement('span');
                txt.innerText = `${ing.name} (${count}/${ing.count})`;
                txt.style.fontWeight = isSatisfied ? 'normal' : 'bold';
                chip.appendChild(txt);

                ingSpan.appendChild(chip);
            });

            texts.appendChild(nameSpan);
            texts.appendChild(ingSpan);

            const info = document.createElement('div');
            info.className = 'recipe-info';
            info.appendChild(iconSpan);
            info.appendChild(texts);

            const badge = document.createElement('span');
            badge.className = `recipe-badge ${canCraft ? 'badge-green' : 'badge-red'}`;
            badge.innerText = canCraft ? '✓ Gotowe' : '✕ Brak';

            card.appendChild(info);
            card.appendChild(badge);

            // Obsługa kliknięcia wg reguł Tymka:
            // - Zielona: od razu wytwarza przedmiot
            // - Czerwona: Mówi na głos (TTS) czego potrzebujesz i wyraźnie to POKAZUJE na ekranie!
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                if (canCraft) {
                    const result = craftRecipeDirect(recipe, this);
                    if (result.success) {
                        playCraftSuccessSound();
                        this.showPopup(`✨ Wytworzono: ${recipe.output.name} x${recipe.output.count}! 🎉`);
                        eventBus.emit('craft:item', { id: recipe.output.id });
                        this.renderHotbar();
                        this.renderBackpackSlots();
                        this.renderModalHotbar();
                        this.updateCraftingDisplay();
                        this.renderRecipeBook();
                    }
                } else {
                    card.classList.add('shake');
                    setTimeout(() => card.classList.remove('shake'), 350);

                    // Tymek: "Ma mówić czego potrzebujesz, ma pokazywać czego potrzebujesz, a nie robić bzzzt bzzzt!"
                    const spokenMissing = missing.map(m => `${m.diff} ${m.name}`).join(' oraz ');
                    speakText(`Do wytworzenia ${recipe.output.name} potrzebujesz: ${spokenMissing}`);

                    this.showRecipeNeedsModal(recipe, missing);
                }
            });

            listEl.appendChild(card);
        });

        if (readyCountEl) {
            readyCountEl.innerText = `${readyCount} gotowych`;
            readyCountEl.style.background = readyCount > 0 ? '#065f46' : '#7f1d1d';
            readyCountEl.style.color = readyCount > 0 ? '#34d399' : '#fca5a5';
            readyCountEl.style.borderColor = readyCount > 0 ? '#10b981' : '#ef4444';
        }
    }

    showRecipeNeedsModal(recipe, missing) {
        let el = document.getElementById('recipe-needs-popup');
        if (!el) {
            el = document.createElement('div');
            el.id = 'recipe-needs-popup';
            el.style.position = 'fixed';
            el.style.top = '12%';
            el.style.left = '50%';
            el.style.transform = 'translateX(-50%)';
            el.style.zIndex = '99999';
            el.style.background = 'linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.96))';
            el.style.border = '2px solid #f59e0b';
            el.style.borderRadius = '14px';
            el.style.padding = '16px 24px';
            el.style.color = '#ffffff';
            el.style.textAlign = 'center';
            el.style.fontFamily = "'Segoe UI', Roboto, sans-serif";
            el.style.boxShadow = '0 12px 35px rgba(0, 0, 0, 0.8), 0 0 25px rgba(245, 158, 11, 0.4)';
            el.style.pointerEvents = 'none';
            el.style.transition = 'opacity 0.25s ease';
            document.body.appendChild(el);
        }

        el.innerHTML = '';

        const title = document.createElement('div');
        title.style.fontSize = '16px';
        title.style.fontWeight = 'bold';
        title.style.color = '#fbbf24';
        title.style.marginBottom = '10px';
        title.innerHTML = `📋 Czego potrzebujesz do wytworzenia: <b>${recipe.output.name}</b> (x${recipe.output.count})?`;
        el.appendChild(title);

        const listContainer = document.createElement('div');
        listContainer.style.display = 'flex';
        listContainer.style.justifyContent = 'center';
        listContainer.style.gap = '12px';
        listContainer.style.flexWrap = 'wrap';
        listContainer.style.margin = '8px 0';

        missing.forEach(m => {
            const card = document.createElement('div');
            card.style.display = 'flex';
            card.style.alignItems = 'center';
            card.style.gap = '10px';
            card.style.background = 'rgba(239, 68, 68, 0.22)';
            card.style.border = '2px solid #ef4444';
            card.style.borderRadius = '10px';
            card.style.padding = '8px 14px';

            const itemId = m.id || recipe?.ingredients?.find(i => i.name === m.name)?.id;
            const icon = createSlotItemIcon(itemId);
            if (icon) {
                icon.style.width = '30px';
                icon.style.height = '30px';
                icon.style.imageRendering = 'pixelated';
                card.appendChild(icon);
            }

            const info = document.createElement('div');
            info.style.textAlign = 'left';
            info.innerHTML = `
                <div style="font-weight: bold; color: #ffffff; font-size: 14px;">🔴 ${m.name}</div>
                <div style="font-size: 12px; color: #fca5a5;">Masz: <b>${m.have}</b> / Potrzebujesz: <b>${m.needed}</b></div>
                <div style="font-size: 12px; color: #fef08a; font-weight: bold;">(Brakuje: ${m.diff})</div>
            `;
            card.appendChild(info);
            listContainer.appendChild(card);
        });
        el.appendChild(listContainer);

        const hint = document.createElement('div');
        hint.style.fontSize = '12px';
        hint.style.color = '#94a3b8';
        hint.style.marginTop = '8px';
        hint.innerText = 'Zbierz brakujące surowce w świecie lub wykop ze skał!';
        el.appendChild(hint);

        el.style.display = 'block';
        el.style.opacity = '1';

        clearTimeout(this._recipeNeedsTimeout);
        this._recipeNeedsTimeout = setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => { if (el.style.opacity === '0') el.style.display = 'none'; }, 300);
        }, 3800);

        const missingStr = missing.map(m => `${m.diff}x ${m.name}`).join(', ');
        this.showPopup(`🚫 Nie masz dobrych surowców, żeby to zrobić! (Potrzebujesz: ${missingStr})`);
    }

    initEvents() {
        // Keyboard 1-9 & 'R' or 'E' for backpack/inventory/crafting & Chat triggers
        window.addEventListener('keydown', (e) => {
            // When chat is open, handle toggle or Escape with Q
            if (this.isChatOpen) {
                if (e.key === 'Escape' || e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q') {
                    e.preventDefault();
                    this.closeChat();
                }
                return;
            }

            // Open chat triggers: 'Q', '=', '/', '-', 'T', or 'Enter'
            const isChatTrigger = e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q' ||
                                  e.key === '=' || e.key === '/' || e.key === '-' ||
                                  e.code === 'KeyT' || e.key === 't' || e.key === 'T' ||
                                  e.key === 'Enter';
            if (isChatTrigger && !this.isCraftingOpen && !this.isLoading) {
                e.preventDefault();
                let initChar = '';
                if (e.key === '=' || e.key === '/' || e.key === '-') {
                    initChar = e.key;
                }
                this.openChat(initChar);
                return;
            }

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
                if (this.isGameActive && !this.isLoading && !this.isChatOpen && !this.survival?.isDead) {
                    this.pauseGame();
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
            if (this.isLoading) return;
            if (this.isCraftingOpen) {
                this.toggleCraftingModal();
            }
            this.hideResetConfirmation();

            if (!this.isGameActive) {
                // First start: run authentic world loading screen!
                this.startLoadingSequence();
            } else {
                // Resuming from pause menu
                this.resumeGame();
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

        // Clicking on game canvas also locks controls if menu is closed and not loading
        if (this.player && this.player.domElement) {
            this.player.domElement.addEventListener('click', () => {
                if (this.isGameActive && !this.isLoading && this.overlayEl.style.display === 'none' && !this.isCraftingOpen && !this.isChatOpen && !this.survival?.isDead) {
                    this.lastUnlockAllowedTime = Date.now() + 500;
                    try {
                        this.player.controls.lock();
                    } catch (e) {}
                }
            });
        }

        this.player.controls.addEventListener('lock', () => {
            this.overlayEl.style.display = 'none';
            this.hideResetConfirmation();
        });

        this.player.controls.addEventListener('unlock', () => {
            // Guard: Only show pause menu if the game is active, not currently loading,
            // not in crafting modal, not in chat, player is alive, and grace period has elapsed!
            if (this.isGameActive && !this.isLoading && !this.isCraftingOpen && !this.isChatOpen && !this.survival?.isDead) {
                if (Date.now() < this.lastUnlockAllowedTime) {
                    return;
                }
                this.pauseGame();
            }
        });
    }

    isGamePaused() {
        if (!this.isGameActive) return true;
        if (this.isLoading) return true;
        if (this.isCraftingOpen) return true;
        if (this.overlayEl && this.overlayEl.style.display !== 'none') return true;
        return false;
    }

    pauseGame() {
        if (!this.isGameActive || this.isLoading || this.survival?.isDead) return;
        if (this.isCraftingOpen) {
            this.toggleCraftingModal();
        }
        const titleEl = document.getElementById('menu-title');
        const subtitleEl = document.getElementById('menu-subtitle');
        if (titleEl) titleEl.innerText = '⏸️ GRA ZATRZYMANA (PAUZA)';
        if (subtitleEl) subtitleEl.innerText = 'Świat gry i potwory są zatrzymane. Naciśnij Wznów grę lub kliknij ekran, aby kontynuować!';
        const resumeBtn = document.getElementById('resume-game-btn');
        if (resumeBtn) resumeBtn.innerText = 'Wznów grę';
        this.hideResetConfirmation();
        this.overlayEl.style.display = 'flex';
        try {
            this.player.controls.unlock();
        } catch (e) {}
    }

    resumeGame() {
        this.overlayEl.style.display = 'none';
        this.lastUnlockAllowedTime = Date.now() + 800;
        try {
            this.player.controls.lock();
        } catch (err) {
            console.warn("[UI] Pointer lock error:", err);
        }
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

    speakTranslator(text) {
        try {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance(text);
                utter.lang = 'pl-PL';
                utter.rate = 1.05;
                window.speechSynthesis.speak(utter);
            }
        } catch (_) {}
    }

    printTranslatorGuide(speak = false) {
        this.addChatMessage('👑 Przewodnik', '📜 JAK WEJŚĆ DO BOSSA: Weź krzesiwo i zrób portal z kamienia na 2 na 2 kratki, żeby twój skin wszedł, a potem zapal pod sobą krzesiwem i będziesz już u bossa. Życzę powodzenia! 🔥🪨', 'chat-server');
        if (speak) {
            this.speakTranslator('Weź krzesiwo i zrób portal z kamienia na dwie na dwie kratki, żeby twój skin wszedł, a potem zapal pod sobą krzesiwem i będziesz już u bossa. Życzę powodzenia!');
        }
    }

    showBossStartGuide() {
        this.addChatMessage('👑 Przewodnik', '📜 JAK WEJŚĆ DO BOSSA: Weź krzesiwo i zrób portal z kamienia na 2 na 2 kratki, żeby twój skin wszedł, a potem zapal pod sobą krzesiwem i będziesz już u bossa. Życzę powodzenia! 🔥🪨', 'chat-server');

        let banner = document.getElementById('boss-start-guide-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'boss-start-guide-banner';
            banner.style.position = 'fixed';
            banner.style.top = '22px';
            banner.style.left = '50%';
            banner.style.transform = 'translateX(-50%)';
            banner.style.zIndex = '99998';
            banner.style.width = 'min(640px, 92vw)';
            banner.style.background = 'linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 27, 75, 0.96))';
            banner.style.border = '2px solid #f59e0b';
            banner.style.borderRadius = '14px';
            banner.style.padding = '14px 20px';
            banner.style.boxShadow = '0 12px 30px rgba(0,0,0,0.85), 0 0 20px rgba(245, 158, 11, 0.35)';
            banner.style.color = '#ffffff';
            banner.style.fontFamily = "'Segoe UI', Roboto, sans-serif";
            banner.style.cursor = 'pointer';
            banner.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            banner.onclick = () => {
                banner.style.opacity = '0';
                banner.style.transform = 'translateX(-50%) translateY(-15px)';
                setTimeout(() => { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 400);
            };
            document.body.appendChild(banner);
        }

        banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 14px;">
                <div style="font-size: 34px;">📜👑</div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; font-size: 15px; color: #fbbf24; margin-bottom: 3px; letter-spacing: 0.5px;">
                        JAK WEJŚĆ DO BOSSA:
                    </div>
                    <div style="font-size: 14px; line-height: 1.45; color: #f8fafc;">
                        Weź krzesiwo i zrób portal z kamienia na <b>2 na 2 kratki</b>, żeby twój skin wszedł, a potem <b>zapal pod sobą krzesiwem</b> i będziesz już u bossa. Życzę powodzenia! 🔥🪨
                    </div>
                </div>
            </div>
            <div style="text-align: right; margin-top: 5px; font-size: 11px; color: #94a3b8;">
                (Kliknij, aby zamknąć ✕)
            </div>
        `;

        setTimeout(() => {
            if (banner && banner.parentNode) {
                banner.style.opacity = '0';
                banner.style.transform = 'translateX(-50%) translateY(-15px)';
                setTimeout(() => { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 400);
            }
        }, 9000);
    }

    initChat() {
        if (!this.chatInputEl) return;

        this.chatInputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.submitChat();
            } else if (e.key === 'Escape' || e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q') {
                e.preventDefault();
                this.closeChat();
            }
        });

        // Krótka instrukcja wejścia do bossa na początku gry na życzenie Tymka!
        setTimeout(() => {
            this.showBossStartGuide();
            this.addChatMessage('Serwer', '💬 Wciśnij Q, aby otworzyć czat! Wpisz /pomoc, aby zobaczyć komendy ✨', 'chat-server');
            this.addChatMessage('🛡️ System Ochrony', '🛡️ TARCZA ANTY-HAKERSKA TYMCRAFT: WKLEJONA NA STAŁE! Każdy gracz ma automatyczną blokadę przechodzenia przez ściany, noclip i cheatów od razu! Nikt nie musi nic wpisywać! 🔒✨', 'chat-success');
        }, 1200);
    }

    openChat(initialChar = '') {
        if (!this.chatInputRowEl || !this.chatInputEl) return;
        this.isChatOpen = true;
        this.chatInputRowEl.style.display = 'flex';
        this.chatInputEl.value = initialChar;
        this.lastUnlockAllowedTime = Date.now() + 1000;
        if (this.player && this.player.controls) {
            try {
                this.player.controls.unlock();
            } catch (err) {}
        }
        setTimeout(() => {
            this.chatInputEl.focus();
            if (initialChar) {
                this.chatInputEl.setSelectionRange(initialChar.length, initialChar.length);
            }
        }, 30);
    }

    closeChat() {
        if (!this.chatInputRowEl || !this.chatInputEl) return;
        this.isChatOpen = false;
        this.chatInputRowEl.style.display = 'none';
        this.chatInputEl.blur();
        this.chatInputEl.value = '';
        if (document.activeElement) {
            try { document.activeElement.blur(); } catch (e) {}
        }
        window.focus();
        this.lastUnlockAllowedTime = Date.now() + 600;
        if (this.player && this.player.controls) {
            try {
                this.player.controls.lock();
            } catch (err) {}
        }
    }

    submitChat() {
        if (!this.chatInputEl) return;
        const raw = this.chatInputEl.value.trim();
        this.closeChat();
        if (!raw) return;

        // Strip leading symbols like =, /, -
        const stripped = raw.replace(/^[/=\-]/, '').trim();
        const lower = stripped.toLowerCase();

        // Blokada ściągania i kopiowania gry (Anti-Download Defense na życzenie Tymka):
        if (lower === 'pobierz' || lower === 'sciagnij' || lower === 'ściągnij' || lower === 'download' || lower === 'tata' || lower === 'save' || lower === 'zapisz' || lower === 'kopia' || lower === 'skopiuj' || lower === 'rip') {
            this.addChatMessage('🛡️ System Ochrony', '🚫 [BLOKADA ŚCIĄGANIA]: Nie możesz ściągnąć tej gry! Ta gra ma własną ochronę stworzoną specjalnie dla Tymka! Nikt nie może jej ściągnąć ani zrobić lepszej! 👑🔒✨', 'chat-success');
            eventBus.emit('security:alert', 'Nie możesz ściągnąć tej gry, bo ma własną ochronę!');
            return;
        }

        // Tarcza Anty-Hakerska TYMCRAFT na życzenie Tymka (wklejona na stałe!):
        if (lower === 'tarcza' || lower === 'antihack' || lower === 'haker' || lower === 'ochrona' || lower === 'bezpieczenstwo' || lower === 'bezpieczeństwo' || lower === 'shield') {
            this.addChatMessage('🛡️ System Ochrony', '🛡️ Tarcza Anty-Hakerska TYMCRAFT jest już wklejona na stałe dla każdego gracza! Nikt nie musi nic wpisywać – przechodzenie przez ściany, noclip i cheaty są w 100% zablokowane od razu! 🚀✨', 'chat-success');
            this.showPopup('🛡️ Tarcza Anty-Hakerska jest wklejona na stałe! Świat jest w 100% bezpieczny! 🔒');
            return;
        }

        // Tłumacznik / Rozpiska / Pomoc command: prints complete guide and speaks via TTS!
        if (lower === 'pomoc' || lower === 'help' || lower === 'boss' || lower === 'portal' || lower === 'tlumacz' || lower === 'tłumacz' || lower === 'rozpiska' || lower === 'zasady' || lower === 'krzesiwo') {
            this.printTranslatorGuide(true);
            return;
        }

        // Komenda powrotu z areny do normalnego świata (brak przymusowego wywalania przez portal):
        if (lower === 'wroc' || lower === 'wróć' || lower === 'powrot' || lower === 'powrót' || lower === 'spawn' || lower === 'dom') {
            eventBus.emit('dimension:return_to_overworld');
            this.addChatMessage('Serwer', '🌟 Powracasz do bezpiecznego świata!', 'chat-success');
            return;
        }

        // Secret code 1: "miał" or "mial" gives Mystery Box!
        if (lower === 'miał' || lower === 'mial' || lower === 'miau' || lower === 'kot') {
            if (this.isCodeUsed('mial')) {
                this.addChatMessage('Serwer', '🔒 Ten kod został już wykorzystany na tej mapie! Kody są tylko raz na mapę – zresetuj świat w menu, aby zacząć od nowa! 🔄', 'chat-server');
                this.showPopup('🔒 Kod "miał" już wykorzystany!');
                return;
            }
            this.markCodeUsed('mial');
            this.addItem(44, 'Mystery Box', 1);
            this.addChatMessage('Serwer', '🐱 Miau! Odkryłeś tajne hasło! Otrzymałeś Mystery Boxa 🎁! Kliknij na niego PPM w ręku, aby go otworzyć!', 'chat-success');
            this.showPopup('🐱 Tajne hasło "miał" odkryte! +1 Mystery Box 🎁');
            return;
        }

        // Secret code 2: "grat" or "rat" gives Water Bottle (NIESKOŃCZONOŚĆ KODU NA WODĘ na życzenie Tymka!)
        if (lower === 'grat' || lower === 'rat' || lower === 'gratt' || lower === 'woda' || lower === 'butelka' || lower === 'water') {
            this.addItem(45, 'Butelka Wody', 1);
            this.addChatMessage('Serwer', '💧 Odkryłeś tajne hasło! Otrzymałeś Butelkę Wody 💧! Wodę możesz brać bez limitu! Kliknij na nią PPM w ręku, aby się orzeźwić!', 'chat-success');
            this.showPopup('💧 Tajne hasło odkryte! +1 Butelka Wody 💧');
            return;
        }

        // Secret code: "6261" / "626" gives Kolorowy Blok 626, Pioruny (Laserowe Miecze), Patyki & Totem!
        if (lower === '6261' || lower === '6 2 6 1' || lower === '6-2-6-1' || lower === '626' || lower === '6 2 6' || lower === '6-2-6') {
            if (this.isCodeUsed('6261')) {
                this.addChatMessage('Serwer', '🔒 Ten kod został już wykorzystany na tej mapie! Kody są tylko raz na mapę – zresetuj świat w menu, aby zacząć od nowa! 🔄', 'chat-server');
                this.showPopup('🔒 Kod 6261 już wykorzystany!');
                return;
            }
            this.markCodeUsed('6261');
            this.addItem(51, 'Kolorowy Blok 626', 1);
            this.addItem(47, 'Laserowy Miecz', 2); // Pioruny!
            this.addItem(20, 'Patyk', 2);
            this.addItem(52, 'Krzesiwo', 1);
            this.addItem(2, 'Ziemia', 2);
            this.addItem(3, 'Kamień', 2);
            this.addChatMessage('Serwer', '🌈⚡ Odkryłeś tajne hasło 6261! Otrzymałeś Kolorowy Blok 626 🌈, Pioruny (Laserowe Miecze ⚡) oraz Patyki! Połącz Kolorowy Blok z Piorunami w craftingu [R/E] na Napiorunowany Blok, a potem z Patykiem na Magiczną Różdżkę z czarami! 🪄', 'chat-success');
            this.showPopup('🌈 Kod 6261 odkryty! +Kolorowy Blok, Pioruny ⚡ i Różdżka 🪄');
            return;
        }

        // Secret code 4: "czar" / "wand" gives Niebieski Pierwiastek!
        if (lower === 'czar' || lower === 'wand' || lower === 'magia' || lower === 'rozdzka' || lower === 'różdżka') {
            if (this.isCodeUsed('czar')) {
                this.addChatMessage('Serwer', '🔒 Ten kod został już wykorzystany na tej mapie! Kody są tylko raz na mapę – zresetuj świat w menu, aby zacząć od nowa! 🔄', 'chat-server');
                this.showPopup('🔒 Kod "czar" już wykorzystany!');
                return;
            }
            this.markCodeUsed('czar');
            this.addItem(49, 'Niebieski Pierwiastek', 2);
            this.addChatMessage('Serwer', '✨ Tajne hasło magii odkryte! Otrzymałeś 2x Niebieski Pierwiastek 💠! Połącz go w craftingu [R/E] z Bedrockiem (kod "1234"), aby stworzyć Magiczną Różdżkę! 🪄', 'chat-success');
            this.showPopup('✨ +2 Niebieski Pierwiastek 💠');
            return;
        }

        // Secret code 5: "tecza" / "rainbow" / "kolor" gives full Rainbow Armory!
        if (lower === 'tecza' || lower === 'tęcza' || lower === 'rainbow' || lower === 'kolor' || lower === 'epickie') {
            if (this.isCodeUsed('tecza')) {
                this.addChatMessage('Serwer', '🔒 Ten kod został już wykorzystany na tej mapie! Kody są tylko raz na mapę – zresetuj świat w menu, aby zacząć od nowa! 🔄', 'chat-server');
                this.showPopup('🔒 Kod "tęcza" już wykorzystany!');
                return;
            }
            this.markCodeUsed('tecza');
            this.addItem(54, 'Kolorowy Miecz', 1);
            this.addItem(55, 'Kolorowy Łuk', 1);
            this.addItem(56, 'Magiczna Kolorowa Strzała', 1);
            this.addItem(52, 'Krzesiwo', 1);
            this.addItem(2, 'Ziemia', 2);
            this.addItem(3, 'Kamień', 2);
            this.addChatMessage('Serwer', '🌈👑 Odkryłeś tajne hasło TĘCZY! Otrzymałeś Kolorowy Miecz 🌈🗡️, Kolorowy Łuk 🌈🏹 i Magiczną Samonaprowadzającą Strzałę 🌈🎯! Naciśnij [T] z łukiem, aby namierzać potwory!', 'chat-success');
            this.showPopup('🌈👑 Legendarne Kolorowe Uzbrojenie dodane!');
            return;
        }

        // Secret code: "da da" / "dada" / "da" (wymóg odblokowania Etapu 2)
        if (lower === 'da da' || lower === 'dada' || lower === 'da') {
            if (this.isCodeUsed('dada')) {
                this.addChatMessage('Serwer', '🔒 Ten kod został już wykorzystany na tej mapie! Kody są tylko raz na mapę – zresetuj świat w menu, aby zacząć od nowa! 🔄', 'chat-server');
                this.showPopup('🔒 Kod "da da" już wykorzystany!');
                return;
            }
            this.markCodeUsed('dada');
            this.addItem(54, 'Kolorowy Miecz', 1);
            this.addItem(55, 'Kolorowy Łuk', 1);
            this.addItem(56, 'Magiczna Kolorowa Strzała', 1);
            this.addChatMessage('Serwer', '🌈👑 Odkryłeś tajne hasło DA DA! Otrzymałeś drugą część Kolorowego Ekwipunku 🌈🗡️🏹🎯!', 'chat-success');
            this.showPopup('🌈👑 Legendarne Kolorowe Uzbrojenie dodane!');
            return;
        }

        // Secret code 6: "cz" / "czy" - niszczy wszystkie słabe questy i daje do tych lepszych, kolorowych! (Ściśle tajne)
        if (lower === 'cz' || lower === 'czy' || lower === 'c z' || lower === 'c-z') {
            eventBus.emit('quests:skip_starter');
            return;
        }

        // Secret code: "3" / "trzy" gives Warm Jacket (Ciepła Kurtka) and reveals Stone Portal hint!
        if (lower === '3' || lower === 'trzy' || lower === 'kurtka') {
            if (this.isCodeUsed('3')) {
                this.addChatMessage('Serwer', '🔒 Ten kod został już wykorzystany na tej mapie! Kody są tylko raz na mapę – zresetuj świat w menu, aby zacząć od nowa! 🔄', 'chat-server');
                this.showPopup('🔒 Kod "3" już wykorzystany!');
                return;
            }
            this.markCodeUsed('3');
            this.addItem(46, 'Ciepła Kurtka', 1);
            this.addChatMessage('Serwer', '🧥 Odkryłeś tajne hasło 3! Otrzymałeś Ciepłą Kurtkę 🧥! Chroni ona przed mrozem na ośnieżonych szczytach gór! Zbuduj Portal z Kamienia i podpal go Krzesiwem, aby wkroczyć do Mrocznego Wymiaru Bossa! 🌌🪨', 'chat-success');
            this.showPopup('🧥 Tajne hasło 3 odkryte! +1 Ciepła Kurtka 🧥');
            return;
        }

        if (lower === 'tymek' || lower === 'startpack' || lower === 'starter' || lower === 'kit') {
            if (this.isCodeUsed('tymek')) {
                this.addChatMessage('Serwer', '🔒 Zestaw Startowy Tymka został już odebrany! Kody są tylko raz na mapę – zresetuj świat w menu, aby zacząć od nowa! 🔄', 'chat-server');
                this.showPopup('🔒 Zestaw Startowy już odebrany!');
                return;
            }
            this.markCodeUsed('tymek');
            this.playerName = 'Tymek';
            
            // Give items: Stone Pickaxe (22), Stone Sword (25), Stone Armor (43)
            this.addItem(22, 'Kamienny Kilof', 1);
            this.addItem(25, 'Kamienny Miecz', 1);
            this.addItem(43, 'Kamienna Zbroja', 1);

            this.addChatMessage('Serwer', '🎁 Witaj Tymek! Otrzymałeś Zestaw Startowy: Kamienny Kilof ⛏️, Kamienny Miecz ⚔️ oraz Kamienną Zbroję 🛡️!', 'chat-success');
            this.showPopup('🎁 Witaj Tymek! Zestaw Startowy dodany do ekwipunku!');
            return;
        }

        if (lower === 'pomoc' || lower === 'help') {
            this.addChatMessage('Serwer', '💡 Wpisuj tajne hasła na czacie, aby zdobywać nagrody! | /clear - Wyczyść czat 🧹', 'chat-server');
            return;
        }

        if (lower === 'clear') {
            if (this.chatMessagesEl) this.chatMessagesEl.innerHTML = '';
            return;
        }

        // Regular chat message
        this.addChatMessage(this.playerName, raw, 'chat-player');
    }

    addChatMessage(sender, text, type = 'chat-player') {
        if (!this.chatMessagesEl) return;
        const msgEl = document.createElement('div');
        msgEl.className = `chat-message ${type}`;

        const senderSpan = document.createElement('b');
        senderSpan.innerText = `<${sender}> `;
        if (type === 'chat-server' || type === 'chat-success') {
            senderSpan.innerText = `[${sender}] `;
        }
        msgEl.appendChild(senderSpan);

        const textSpan = document.createElement('span');
        textSpan.innerText = text;
        msgEl.appendChild(textSpan);

        this.chatMessagesEl.appendChild(msgEl);
        this.chatMessagesEl.scrollTop = this.chatMessagesEl.scrollHeight;

        // Auto fade-out after 9 seconds like Minecraft
        setTimeout(() => {
            msgEl.classList.add('chat-fading');
            setTimeout(() => {
                if (msgEl.parentNode) msgEl.parentNode.removeChild(msgEl);
            }, 600);
        }, 9000);
    }

    showPigKingdomDialogue(onComplete) {
        let el = document.getElementById('pig-king-dialogue-modal');
        if (!el) {
            el = document.createElement('div');
            el.id = 'pig-king-dialogue-modal';
            el.style.position = 'fixed';
            el.style.bottom = '85px';
            el.style.left = '50%';
            el.style.transform = 'translateX(-50%)';
            el.style.zIndex = '99999';
            el.style.width = 'min(780px, 92vw)';
            el.style.background = 'linear-gradient(135deg, rgba(30, 27, 75, 0.96), rgba(15, 23, 42, 0.96))';
            el.style.border = '3px solid #f59e0b';
            el.style.borderRadius = '16px';
            el.style.padding = '18px 24px';
            el.style.boxShadow = '0 15px 40px rgba(0,0,0,0.85), 0 0 25px rgba(245, 158, 11, 0.4)';
            el.style.color = '#ffffff';
            el.style.fontFamily = "'Segoe UI', Roboto, sans-serif";
            el.style.cursor = 'pointer';
            document.body.appendChild(el);
        }

        const lines = [
            {
                speaker: '👑 Król Świń',
                avatar: '🐷👑',
                color: '#fbbf24',
                text: 'Chrum! Cześć, czego chcesz?',
                audioText: 'Chrum! Cześć, czego chcesz?',
                pitch: 1.0,
                grunt: true
            },
            {
                speaker: '🧑 Ty (Tymek)',
                avatar: '🧑',
                color: '#38bdf8',
                text: 'Ja tu przybyłem przez przypadek.',
                audioText: 'Ja tu przybyłem przez przypadek.',
                pitch: 1.0,
                grunt: false
            },
            {
                speaker: '👑 Król Świń',
                avatar: '🐷👑',
                color: '#ef4444',
                text: 'Chrrr! Straże! Zaatakować go!',
                audioText: 'Chrrr! Straże! Zaatakować go!',
                pitch: 1.0,
                grunt: true
            }
        ];

        let currentIdx = 0;
        let lineTimeout = null;

        const renderLine = () => {
            if (currentIdx >= lines.length) {
                if (lineTimeout) clearTimeout(lineTimeout);
                el.style.display = 'none';
                if (typeof onComplete === 'function') onComplete();
                return;
            }

            const item = lines[currentIdx];
            if (item.grunt) {
                playPigGruntSound(true);
            }
            speakText(item.audioText, 'pl-PL', item.pitch || 1.0);

            el.innerHTML = `
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div style="font-size: 42px; background: rgba(0,0,0,0.3); border-radius: 12px; padding: 6px 12px; border: 2px solid ${item.color};">
                        ${item.avatar}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; font-size: 16px; color: ${item.color}; margin-bottom: 4px;">
                            ${item.speaker}
                        </div>
                        <div style="font-size: 17px; line-height: 1.4; color: #f8fafc; font-weight: 500;">
                            „${item.text}”
                        </div>
                    </div>
                </div>
                <div style="text-align: right; margin-top: 8px; font-size: 11px; color: #94a3b8;">
                    (Kliknij gdziekolwiek lub poczekaj, aby przejść dalej ➡️)
                </div>
            `;
            el.style.display = 'block';

            if (lineTimeout) clearTimeout(lineTimeout);
            lineTimeout = setTimeout(() => {
                currentIdx++;
                renderLine();
            }, 3600);
        };

        el.onclick = (e) => {
            e.stopPropagation();
            if (lineTimeout) clearTimeout(lineTimeout);
            currentIdx++;
            renderLine();
        };

        renderLine();
    }
}
