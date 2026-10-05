// Storage manager using browser localStorage for sparse block deltas and player state

const STORAGE_KEYS = {
    WORLD_DELTA: 'minecraft_poc_world_delta_v1',
    PLAYER_STATE: 'minecraft_poc_player_state_v1'
};

export class StorageManager {
    constructor() {
        this.blockDelta = this.loadBlockDelta();
    }

    loadBlockDelta() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.WORLD_DELTA);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.warn("[Storage] Failed to read world delta from localStorage:", e);
            return {};
        }
    }

    saveBlock(x, y, z, blockId) {
        const key = `${x},${y},${z}`;
        this.blockDelta[key] = blockId;
        this.debouncedSaveWorld();
    }

    debouncedSaveWorld() {
        if (this._saveWorldTimeout) clearTimeout(this._saveWorldTimeout);
        this._saveWorldTimeout = setTimeout(() => {
            try {
                localStorage.setItem(STORAGE_KEYS.WORLD_DELTA, JSON.stringify(this.blockDelta));
                console.log(`[Storage] Saved ${Object.keys(this.blockDelta).length} block modifications to localStorage.`);
            } catch (e) {
                console.warn("[Storage] LocalStorage quota exceeded or error:", e);
            }
        }, 800);
    }

    savePlayer(player, survival, selectedSlot) {
        if (!player || !survival) return;
        const state = {
            position: {
                x: Number(player.position.x.toFixed(2)),
                y: Number(player.position.y.toFixed(2)),
                z: Number(player.position.z.toFixed(2))
            },
            health: survival.health,
            hunger: survival.hunger,
            selectedSlot: selectedSlot ?? 0,
            savedAt: Date.now()
        };

        try {
            localStorage.setItem(STORAGE_KEYS.PLAYER_STATE, JSON.stringify(state));
        } catch (e) {
            console.warn("[Storage] Failed to save player state:", e);
        }
    }

    loadPlayerState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.PLAYER_STATE);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    resetWorld() {
        if (confirm("Czy na pewno chcesz zresetować świat i zrestartować grę od nowa?")) {
            localStorage.removeItem(STORAGE_KEYS.WORLD_DELTA);
            localStorage.removeItem(STORAGE_KEYS.PLAYER_STATE);
            window.location.reload();
        }
    }
}
