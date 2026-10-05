import { BLOCK_DEF, AtlasCanvas, TILE_SIZE, ATLAS_COLS } from './textures.js';

export const HOTBAR_BLOCKS = [
    { slot: 1, id: 1, name: 'Trawa' },
    { slot: 2, id: 2, name: 'Ziemia' },
    { slot: 3, id: 3, name: 'Kamień' },
    { slot: 4, id: 4, name: 'Drewno' },
    { slot: 5, id: 5, name: 'Liście' },
    { slot: 6, id: 6, name: 'Piasek' },
    { slot: 7, id: 7, name: 'Śnieg' },
    { slot: 8, id: 8, name: 'Deski' },
    { slot: 9, id: 9, name: 'Szkło' }
];

export class UI {
    constructor(player, world) {
        this.player = player;
        this.world = world;
        this.selectedSlotIndex = 0; // 0 to 8

        this.infoEl = document.getElementById('debug-info');
        this.hotbarEl = document.getElementById('hotbar');
        this.overlayEl = document.getElementById('start-overlay');
        this.blockNameEl = document.getElementById('block-name-popup');

        this.fps = 60;
        this.lastFpsUpdate = performance.now();
        this.frameCount = 0;

        this.renderHotbar();
        this.initEvents();
    }

    getActiveBlockId() {
        return HOTBAR_BLOCKS[this.selectedSlotIndex].id;
    }

    renderHotbar() {
        this.hotbarEl.innerHTML = '';

        HOTBAR_BLOCKS.forEach((item, idx) => {
            const slot = document.createElement('div');
            slot.className = `hotbar-slot ${idx === this.selectedSlotIndex ? 'active' : ''}`;
            slot.id = `slot-${idx}`;

            // Create canvas icon from Atlas
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

    initEvents() {
        // Keyboard 1-9
        window.addEventListener('keydown', (e) => {
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

        // Pointer Lock events
        this.overlayEl.addEventListener('click', () => {
            this.player.controls.lock();
        });

        this.player.controls.addEventListener('lock', () => {
            this.overlayEl.style.display = 'none';
        });

        this.player.controls.addEventListener('unlock', () => {
            this.overlayEl.style.display = 'flex';
        });
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
        const activeBlock = HOTBAR_BLOCKS[this.selectedSlotIndex].name;

        if (this.infoEl) {
            this.infoEl.innerHTML = `
                <div><b>Minecraft Web POC</b> | FPS: ${this.fps}</div>
                <div>Pozycja: X: ${px} | Y: ${py} | Z: ${pz}</div>
                <div>Biom: <span class="badge">${biome}</span></div>
                <div>Wybrany blok: <b>${activeBlock}</b></div>
            `;
        }
    }
}
