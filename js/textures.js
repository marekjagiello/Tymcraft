import * as THREE from 'three';

// Helper for deterministic pixel noise
function hash(x, y) {
    let n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
}

// 4x4 Atlas of 16x16 textures = 64x64 px canvas
export const ATLAS_COLS = 4;
export const ATLAS_ROWS = 5;
export const TILE_SIZE = 16;

export const TILES = {
    GRASS_TOP: 0,
    GRASS_SIDE: 1,
    DIRT: 2,
    STONE: 3,
    WOOD_SIDE: 4,
    WOOD_TOP: 5,
    LEAVES: 6,
    SAND: 7,
    SNOW: 8,
    PLANKS: 9,
    GLASS: 10,
    WATER: 11,
    CACTUS_SIDE: 12,
    CACTUS_TOP: 13,
    BEDROCK: 14,
    COBBLE: 15,
    DIAMOND_ORE: 16,
    RUBY_ORE: 17
};

// Map block types to tile faces: [Top, Bottom, Front, Back, Left, Right]
export const BLOCK_DEF = {
    0: { name: 'Air', transparent: true, solid: false },
    1: { name: 'Trawa (Grass)', tiles: [TILES.GRASS_TOP, TILES.DIRT, TILES.GRASS_SIDE, TILES.GRASS_SIDE, TILES.GRASS_SIDE, TILES.GRASS_SIDE], solid: true },
    2: { name: 'Ziemia (Dirt)', tiles: [TILES.DIRT, TILES.DIRT, TILES.DIRT, TILES.DIRT, TILES.DIRT, TILES.DIRT], solid: true },
    3: { name: 'Kamień (Stone)', tiles: [TILES.STONE, TILES.STONE, TILES.STONE, TILES.STONE, TILES.STONE, TILES.STONE], solid: true },
    4: { name: 'Drewno (Wood)', tiles: [TILES.WOOD_TOP, TILES.WOOD_TOP, TILES.WOOD_SIDE, TILES.WOOD_SIDE, TILES.WOOD_SIDE, TILES.WOOD_SIDE], solid: true },
    5: { name: 'Liście (Leaves)', tiles: [TILES.LEAVES, TILES.LEAVES, TILES.LEAVES, TILES.LEAVES, TILES.LEAVES, TILES.LEAVES], solid: true, transparent: true },
    6: { name: 'Piasek (Sand)', tiles: [TILES.SAND, TILES.SAND, TILES.SAND, TILES.SAND, TILES.SAND, TILES.SAND], solid: true },
    7: { name: 'Śnieg (Snow)', tiles: [TILES.SNOW, TILES.DIRT, TILES.SNOW, TILES.SNOW, TILES.SNOW, TILES.SNOW], solid: true },
    8: { name: 'Deski (Planks)', tiles: [TILES.PLANKS, TILES.PLANKS, TILES.PLANKS, TILES.PLANKS, TILES.PLANKS, TILES.PLANKS], solid: true },
    9: { name: 'Szkło (Glass)', tiles: [TILES.GLASS, TILES.GLASS, TILES.GLASS, TILES.GLASS, TILES.GLASS, TILES.GLASS], solid: true, transparent: true },
    10: { name: 'Woda (Water)', tiles: [TILES.WATER, TILES.WATER, TILES.WATER, TILES.WATER, TILES.WATER, TILES.WATER], solid: false, transparent: true },
    11: { name: 'Kaktus (Cactus)', tiles: [TILES.CACTUS_TOP, TILES.CACTUS_TOP, TILES.CACTUS_SIDE, TILES.CACTUS_SIDE, TILES.CACTUS_SIDE, TILES.CACTUS_SIDE], solid: true },
    12: { name: 'Bruk (Cobblestone)', tiles: [TILES.COBBLE, TILES.COBBLE, TILES.COBBLE, TILES.COBBLE, TILES.COBBLE, TILES.COBBLE], solid: true },
    14: { name: 'Skała Macierzysta (Bedrock)', tiles: [TILES.BEDROCK, TILES.BEDROCK, TILES.BEDROCK, TILES.BEDROCK, TILES.BEDROCK, TILES.BEDROCK], solid: true },
    15: { name: 'Ruda Diamentu (Diamond Ore)', tiles: [TILES.DIAMOND_ORE, TILES.DIAMOND_ORE, TILES.DIAMOND_ORE, TILES.DIAMOND_ORE, TILES.DIAMOND_ORE, TILES.DIAMOND_ORE], solid: true },
    16: { name: 'Ruda Rubinu (Ruby Ore)', tiles: [TILES.RUBY_ORE, TILES.RUBY_ORE, TILES.RUBY_ORE, TILES.RUBY_ORE, TILES.RUBY_ORE, TILES.RUBY_ORE], solid: true }
};

// Build the canvas atlas
function createAtlas() {
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_COLS * TILE_SIZE;
    canvas.height = ATLAS_ROWS * TILE_SIZE;
    const ctx = canvas.getContext('2d');

    const drawTile = (tileIndex, drawFn) => {
        const tx = (tileIndex % ATLAS_COLS) * TILE_SIZE;
        const ty = Math.floor(tileIndex / ATLAS_COLS) * TILE_SIZE;
        ctx.save();
        ctx.translate(tx, ty);
        drawFn(ctx);
        ctx.restore();
    };

    // 0: GRASS TOP
    drawTile(TILES.GRASS_TOP, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const n = (hash(x, y) - 0.5) * 26;
                c.fillStyle = `rgb(${88 + n}, ${140 + n}, ${52 + n})`;
                c.fillRect(x, y, 1, 1);
            }
        }
    });

    // 1: GRASS SIDE
    drawTile(TILES.GRASS_SIDE, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const n = (hash(x, y) - 0.5) * 22;
                c.fillStyle = `rgb(${120 + n}, ${85 + n}, ${58 + n})`;
                c.fillRect(x, y, 1, 1);
            }
        }
        for (let x = 0; x < 16; x++) {
            const h = 3 + Math.floor(hash(x, 1) * 3);
            for (let y = 0; y < h; y++) {
                const n = (hash(x, y) - 0.5) * 18;
                c.fillStyle = `rgb(${88 + n}, ${140 + n}, ${52 + n})`;
                c.fillRect(x, y, 1, 1);
            }
        }
    });

    // 2: DIRT
    drawTile(TILES.DIRT, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const n = (hash(x, y) - 0.5) * 28;
                c.fillStyle = `rgb(${120 + n}, ${85 + n}, ${58 + n})`;
                c.fillRect(x, y, 1, 1);
            }
        }
    });

    // 3: STONE (Realistic natural rock with multi-scale geological formations)
    drawTile(TILES.STONE, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                // 1. Geological rock mass variation (bilinear smooth noise)
                const gx = x / 4.0;
                const gy = y / 4.0;
                const ix = Math.floor(gx);
                const iy = Math.floor(gy);
                const fx = gx - ix;
                const fy = gy - iy;
                const g00 = hash(ix * 7 + 1, iy * 11 + 3);
                const g10 = hash((ix + 1) * 7 + 1, iy * 11 + 3);
                const g01 = hash(ix * 7 + 1, (iy + 1) * 11 + 3);
                const g11 = hash((ix + 1) * 7 + 1, (iy + 1) * 11 + 3);
                const smoothGeo = (
                    g00 * (1 - fx) * (1 - fy) +
                    g10 * fx * (1 - fy) +
                    g01 * (1 - fx) * fy +
                    g11 * fx * fy - 0.5
                ) * 20.0;

                // 2. Medium mineral clusters (2x2)
                const cluster = (hash(Math.floor(x / 2) * 17 + 5, Math.floor(y / 2) * 19 + 7) - 0.5) * 14.0;

                // 3. Fine mineral grain
                const grain = (hash(x * 31 + 13, y * 37 + 17) - 0.5) * 11.0;

                // 4. Realistic mineral flecks (quartz highlights & basalt crevices)
                const fleckHash = hash(x * 53 + 7, y * 59 + 11);
                let fleck = 0;
                if (fleckHash > 0.88) {
                    fleck = 14.0; // Quartz highlight
                } else if (fleckHash < 0.12) {
                    fleck = -16.0; // Basalt dark mineral crevice
                }

                const base = Math.max(75, Math.min(185, Math.round(124 + smoothGeo + cluster + grain + fleck)));
                // Natural slate / granite mineral tint
                c.fillStyle = `rgb(${base - 2}, ${base}, ${base + 3})`;
                c.fillRect(x, y, 1, 1);
            }
        }
    });

    // 4: WOOD SIDE
    drawTile(TILES.WOOD_SIDE, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const ridge = Math.sin(x * 1.5) * 15;
                const n = (hash(x, y) - 0.5) * 16;
                c.fillStyle = `rgb(${105 + ridge + n}, ${80 + ridge * 0.8 + n}, ${50 + ridge * 0.5 + n})`;
                c.fillRect(x, y, 1, 1);
            }
        }
    });

    // 5: WOOD TOP
    drawTile(TILES.WOOD_TOP, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const dist = Math.sqrt((x - 7.5)**2 + (y - 7.5)**2);
                const ring = Math.sin(dist * 1.8) * 18;
                const n = (hash(x, y) - 0.5) * 12;
                c.fillStyle = `rgb(${160 + ring + n}, ${125 + ring * 0.8 + n}, ${80 + ring * 0.5 + n})`;
                c.fillRect(x, y, 1, 1);
            }
        }
    });

    // 6: LEAVES
    drawTile(TILES.LEAVES, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const n = (hash(x, y) - 0.5) * 40;
                c.fillStyle = `rgb(${45 + n * 0.6}, ${115 + n}, ${35 + n * 0.4})`;
                c.fillRect(x, y, 1, 1);
            }
        }
    });

    // 7: SAND
    drawTile(TILES.SAND, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const n = (hash(x, y) - 0.5) * 20;
                c.fillStyle = `rgb(${215 + n}, ${200 + n}, ${150 + n * 0.8})`;
                c.fillRect(x, y, 1, 1);
            }
        }
    });

    // 8: SNOW
    drawTile(TILES.SNOW, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const n = (hash(x, y) - 0.5) * 15;
                const v = 240 + n;
                c.fillStyle = `rgb(${v - 5}, ${v}, ${v + 5})`;
                c.fillRect(x, y, 1, 1);
            }
        }
    });

    // 9: PLANKS
    drawTile(TILES.PLANKS, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                let n = (hash(x, y) - 0.5) * 18;
                let isSeam = (y % 4 === 0) || (y < 4 && x === 7) || (y >= 4 && y < 8 && x === 14) || (y >= 8 && y < 12 && x === 4) || (y >= 12 && x === 11);
                let r = 168 + n, g = 125 + n * 0.8, b = 80 + n * 0.5;
                if (isSeam) { r *= 0.65; g *= 0.65; b *= 0.65; }
                c.fillStyle = `rgb(${r}, ${g}, ${b})`;
                c.fillRect(x, y, 1, 1);
            }
        }
    });

    // 10: GLASS
    drawTile(TILES.GLASS, (c) => {
        c.fillStyle = 'rgba(210, 240, 255, 0.2)';
        c.fillRect(0, 0, 16, 16);
        c.strokeStyle = 'rgba(235, 250, 255, 0.9)';
        c.lineWidth = 1;
        c.strokeRect(0.5, 0.5, 15, 15);
        c.fillStyle = 'rgba(255, 255, 255, 0.8)';
        c.fillRect(3, 3, 2, 2);
        c.fillRect(11, 10, 3, 1);
    });

    // 11: WATER
    drawTile(TILES.WATER, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const n = (hash(x, y) - 0.5) * 20;
                c.fillStyle = `rgb(${40 + n * 0.3}, ${115 + n * 0.5}, ${215 + n})`;
                c.fillRect(x, y, 1, 1);
            }
        }
    });

    // 12: CACTUS SIDE
    drawTile(TILES.CACTUS_SIDE, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const isGroove = (x % 3 === 0);
                const n = (hash(x, y) - 0.5) * 15;
                const g = isGroove ? 100 : 145;
                c.fillStyle = `rgb(${40 + n * 0.5}, ${g + n}, ${30 + n * 0.4})`;
                c.fillRect(x, y, 1, 1);
                // Thorns
                if (hash(x, y) > 0.92) {
                    c.fillStyle = '#222';
                    c.fillRect(x, y, 1, 1);
                }
            }
        }
    });

    // 13: CACTUS TOP
    drawTile(TILES.CACTUS_TOP, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const n = (hash(x, y) - 0.5) * 15;
                c.fillStyle = `rgb(${45 + n * 0.5}, ${135 + n}, ${35 + n * 0.4})`;
                c.fillRect(x, y, 1, 1);
            }
        }
    });

    // 14: BEDROCK
    drawTile(TILES.BEDROCK, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const n = hash(x, y) > 0.5 ? 40 : 15;
                c.fillStyle = `rgb(${n}, ${n}, ${n})`;
                c.fillRect(x, y, 1, 1);
            }
        }
    });

    // 15: COBBLESTONE
    drawTile(TILES.COBBLE, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const rock = ((x >> 2) + (y >> 2)) % 2 === 0;
                const n = (hash(x, y) - 0.5) * 35;
                const base = rock ? 110 : 90;
                c.fillStyle = `rgb(${base + n}, ${base + n}, ${base + n})`;
                c.fillRect(x, y, 1, 1);
            }
        }
    });

    // 16: DIAMOND ORE (Stone with glowing cyan diamond gems)
    drawTile(TILES.DIAMOND_ORE, (c) => {
        // Realistic stone base
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const n = (hash(x, y) - 0.5) * 28;
                c.fillStyle = `rgb(${126 + n}, ${126 + n}, ${126 + n})`;
                c.fillRect(x, y, 1, 1);
            }
        }
        // Minecraft-style diamond crystal pixel clusters
        const gemPixels = [
            [3, 3], [4, 3], [3, 4], [4, 4], [5, 4],
            [10, 5], [11, 5], [11, 6], [12, 6],
            [6, 9], [7, 9], [7, 10], [8, 10], [6, 10],
            [11, 11], [12, 11], [12, 12],
            [3, 12], [4, 12], [4, 13]
        ];
        for (const [gx, gy] of gemPixels) {
            c.fillStyle = (hash(gx, gy) > 0.45) ? '#38bdf8' : '#0284c7';
            c.fillRect(gx, gy, 1, 1);
        }
        // Bright shining specular diamond highlights
        const highlights = [[4, 3], [11, 5], [7, 9], [12, 11], [4, 12]];
        for (const [hx, hy] of highlights) {
            c.fillStyle = '#e0f2fe';
            c.fillRect(hx, hy, 1, 1);
        }
    });

    // 17: RUBY ORE (Stone with glowing crimson-red ruby gems)
    drawTile(TILES.RUBY_ORE, (c) => {
        // Realistic stone base
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const n = (hash(x + 10, y + 10) - 0.5) * 28;
                c.fillStyle = `rgb(${126 + n}, ${126 + n}, ${126 + n})`;
                c.fillRect(x, y, 1, 1);
            }
        }
        // Crimson ruby pixel crystals
        const rubyPixels = [
            [2, 3], [3, 3], [3, 4], [4, 4], [2, 4],
            [12, 4], [13, 4], [13, 5], [14, 5],
            [7, 7], [8, 7], [8, 8], [9, 8], [7, 8],
            [4, 10], [5, 10], [5, 11], [6, 11],
            [10, 12], [11, 12], [11, 13], [12, 13]
        ];
        for (const [rx, ry] of rubyPixels) {
            c.fillStyle = (hash(rx, ry) > 0.4) ? '#ef4444' : '#b91c1c';
            c.fillRect(rx, ry, 1, 1);
        }
        // Bright shining pinkish-white specular highlights
        const rubyHighlights = [[3, 3], [13, 4], [8, 7], [5, 10], [11, 12]];
        for (const [hx, hy] of rubyHighlights) {
            c.fillStyle = '#fecdd3';
            c.fillRect(hx, hy, 1, 1);
        }
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return { canvas, texture };
}

export const { canvas: AtlasCanvas, texture: AtlasTexture } = createAtlas();

export const AtlasMaterial = new THREE.MeshLambertMaterial({
    map: AtlasTexture,
    transparent: true,
    alphaTest: 0.1
});

// Helper to get UV bounds for a given tile index
export function getTileUV(tileIndex) {
    const col = tileIndex % ATLAS_COLS;
    const row = Math.floor(tileIndex / ATLAS_COLS);

    const u0 = col / ATLAS_COLS;
    const u1 = (col + 1) / ATLAS_COLS;
    const v0 = 1.0 - (row + 1) / ATLAS_ROWS;
    const v1 = 1.0 - row / ATLAS_ROWS;

    return { u0, v0, u1, v1 };
}
