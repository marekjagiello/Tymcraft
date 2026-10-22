import * as THREE from 'three';

// Helper for deterministic pixel noise
function hash(x, y) {
    let n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
}

// 4x4 Atlas of 16x16 textures = 64x64 px canvas
export const ATLAS_COLS = 4;
export const ATLAS_ROWS = 6;
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
    RUBY_ORE: 17,
    ROSE: 18,
    DANDELION: 19,
    LILY_PAD: 20
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
    16: { name: 'Ruda Rubinu (Ruby Ore)', tiles: [TILES.RUBY_ORE, TILES.RUBY_ORE, TILES.RUBY_ORE, TILES.RUBY_ORE, TILES.RUBY_ORE, TILES.RUBY_ORE], solid: true },
    17: { name: 'Czerwona Róża (Rose)', tiles: [TILES.ROSE, TILES.ROSE, TILES.ROSE, TILES.ROSE, TILES.ROSE, TILES.ROSE], solid: false, transparent: true, isPlant: true },
    18: { name: 'Żółty Mlecz (Dandelion)', tiles: [TILES.DANDELION, TILES.DANDELION, TILES.DANDELION, TILES.DANDELION, TILES.DANDELION, TILES.DANDELION], solid: false, transparent: true, isPlant: true },
    19: { name: 'Lilia Wodna (Lily Pad)', tiles: [TILES.LILY_PAD, TILES.LILY_PAD, TILES.LILY_PAD, TILES.LILY_PAD, TILES.LILY_PAD, TILES.LILY_PAD], solid: false, transparent: true, isLilyPad: true }
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

    // 0: GRASS TOP (Vibrant natural lawn with lush grass blades)
    drawTile(TILES.GRASS_TOP, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const cluster = (hash(Math.floor(x / 2) * 11, Math.floor(y / 2) * 13) - 0.5) * 16;
                const blade = (hash(x * 43 + 7, y * 47 + 13) - 0.5) * 32;
                const r = Math.max(60, Math.min(130, Math.round(92 + cluster * 0.6 + blade * 0.6)));
                const g = Math.max(125, Math.min(210, Math.round(168 + cluster + blade)));
                const b = Math.max(35, Math.min(95, Math.round(52 + cluster * 0.4 + blade * 0.4)));
                c.fillStyle = `rgb(${r}, ${g}, ${b})`;
                c.fillRect(x, y, 1, 1);
            }
        }
    });

    // 1: GRASS SIDE (Natural overhang with grass blades dripping onto rich soil)
    drawTile(TILES.GRASS_SIDE, (c) => {
        // First draw the rich dirt base
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const cx = Math.floor(x / 2);
                const cy = Math.floor(y / 2);
                const clusterNoise = (hash(cx * 13 + 3, cy * 17 + 7) - 0.5) * 18;
                const grain = (hash(x * 29 + 11, y * 31 + 19) - 0.5) * 20;
                const fleckHash = hash(x * 47 + 5, y * 53 + 23);
                const fleck = fleckHash < 0.12 ? -22 : (fleckHash > 0.88 ? 14 : 0);

                const r = Math.max(75, Math.min(185, Math.round(126 + clusterNoise * 0.9 + grain + fleck)));
                const g = Math.max(50, Math.min(145, Math.round(90 + clusterNoise * 0.8 + grain * 0.8 + fleck * 0.8)));
                const b = Math.max(30, Math.min(105, Math.round(60 + clusterNoise * 0.6 + grain * 0.6 + fleck * 0.6)));
                c.fillStyle = `rgb(${r}, ${g}, ${b})`;
                c.fillRect(x, y, 1, 1);
            }
        }

        // Hanging grass blades with shadow under-rim
        for (let x = 0; x < 16; x++) {
            const h = 3 + Math.floor(hash(x * 7 + 1, 5) * 4); // 3 to 6 pixels down
            for (let y = 0; y < h; y++) {
                const blade = (hash(x * 17 + y, y * 19 + x) - 0.5) * 24;
                const isTip = (y === h - 1);
                const isTop = (y === 0);

                // Top has highlight, tip has shadow
                const light = isTop ? 16 : (isTip ? -18 : 0);
                const r = Math.max(50, Math.min(125, Math.round(92 + blade * 0.6 + light * 0.5)));
                const g = Math.max(105, Math.min(195, Math.round(160 + blade + light)));
                const b = Math.max(30, Math.min(85, Math.round(50 + blade * 0.4 + light * 0.4)));

                c.fillStyle = `rgb(${r}, ${g}, ${b})`;
                c.fillRect(x, y, 1, 1);
            }

            // Dark shadow directly under grass blade tips
            if (h < 15) {
                c.fillStyle = 'rgba(40, 24, 12, 0.45)';
                c.fillRect(x, h, 1, 1);
            }
        }
    });

    // 2: DIRT (Rich earthy soil with organic loam clumps, mineral pebbles, and humus)
    drawTile(TILES.DIRT, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                // Soil clumping variation (smooth 2x2 cluster)
                const cx = Math.floor(x / 2);
                const cy = Math.floor(y / 2);
                const clusterNoise = (hash(cx * 13 + 3, cy * 17 + 7) - 0.5) * 20;

                // Fine earth grain
                const grain = (hash(x * 29 + 11, y * 31 + 19) - 0.5) * 22;

                // Organic flecks / pebbles / humus crevices
                const fleckHash = hash(x * 47 + 5, y * 53 + 23);
                let fleck = 0;
                let isPebble = false;

                if (fleckHash > 0.92) {
                    isPebble = true; // Small mineral pebble
                } else if (fleckHash < 0.10) {
                    fleck = -24; // Humus / deep soil crevice
                } else if (fleckHash > 0.82) {
                    fleck = 16; // Dry warm clay crumb
                }

                if (isPebble) {
                    // Grayish-beige limestone/quartz pebble
                    const pTone = Math.round(135 + grain * 0.5);
                    c.fillStyle = `rgb(${pTone + 5}, ${pTone}, ${pTone - 5})`;
                } else {
                    const baseR = 128 + clusterNoise * 0.9 + grain + fleck;
                    const baseG = 92 + clusterNoise * 0.8 + grain * 0.8 + fleck * 0.8;
                    const baseB = 62 + clusterNoise * 0.6 + grain * 0.6 + fleck * 0.6;
                    const r = Math.max(75, Math.min(185, Math.round(baseR)));
                    const g = Math.max(50, Math.min(145, Math.round(baseG)));
                    const b = Math.max(30, Math.min(105, Math.round(baseB)));
                    c.fillStyle = `rgb(${r}, ${g}, ${b})`;
                }
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

    // 4: WOOD SIDE (Natural oak bark with vertical fibrous bark grooves)
    drawTile(TILES.WOOD_SIDE, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const ridge1 = Math.sin(x * 1.6 + hash(0, Math.floor(y / 4)) * 0.8) * 18;
                const ridge2 = Math.cos(x * 3.2 + y * 0.4) * 8;
                const grain = (hash(x * 23 + 3, y * 31 + 7) - 0.5) * 14;

                const base = 108 + ridge1 + ridge2 + grain;
                const r = Math.max(65, Math.min(160, Math.round(base)));
                const g = Math.max(45, Math.min(125, Math.round(base * 0.78)));
                const b = Math.max(25, Math.min(85, Math.round(base * 0.50)));

                c.fillStyle = `rgb(${r}, ${g}, ${b})`;
                c.fillRect(x, y, 1, 1);
            }
        }
    });

    // 5: WOOD TOP (Tree trunk rings with dark bark outer rim and heartwood center)
    drawTile(TILES.WOOD_TOP, (c) => {
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const dist = Math.sqrt((x - 7.5)**2 + (y - 7.5)**2);

                if (dist >= 6.8) {
                    // Outer bark ring
                    const n = (hash(x, y) - 0.5) * 16;
                    c.fillStyle = `rgb(${95 + n}, ${72 + n * 0.8}, ${44 + n * 0.5})`;
                } else {
                    // Growth rings
                    const ring = Math.sin(dist * 2.2) * 20;
                    const grain = (hash(x * 17 + 5, y * 19 + 7) - 0.5) * 12;
                    const r = Math.max(120, Math.min(210, Math.round(172 + ring + grain)));
                    const g = Math.max(90, Math.min(170, Math.round(136 + ring * 0.8 + grain * 0.8)));
                    const b = Math.max(55, Math.min(125, Math.round(88 + ring * 0.5 + grain * 0.5)));
                    c.fillStyle = `rgb(${r}, ${g}, ${b})`;
                }
                c.fillRect(x, y, 1, 1);
            }
        }
    });

    // 6: LEAVES (Minecraft Fancy Cutout Leaves with translucent leaf apertures)
    drawTile(TILES.LEAVES, (c) => {
        c.clearRect(0, 0, 16, 16);
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                // Organic cutout holes (seeing through the leaves)
                const hVal = hash(x * 19 + 7, y * 23 + 13);
                const cluster = Math.sin(x * 0.8) * Math.cos(y * 0.8);
                const isHole = (hVal < 0.22 && (x % 3 !== 0 || y % 3 !== 0)) ||
                               (hVal < 0.35 && cluster < -0.3);

                if (isHole) {
                    continue; // Leave transparent!
                }

                // Rich multi-tone leaf shading
                const n = (hash(x * 37 + 5, y * 41 + 17) - 0.5) * 36;
                const edgeDarken = (x === 0 || x === 15 || y === 0 || y === 15) ? -12 : 0;
                const sunLight = (y < 6 ? 14 : (y > 10 ? -12 : 0));

                const r = Math.max(20, Math.min(80, Math.round(44 + n * 0.5 + sunLight * 0.4 + edgeDarken)));
                const g = Math.max(70, Math.min(185, Math.round(135 + n + sunLight + edgeDarken)));
                const b = Math.max(18, Math.min(75, Math.round(38 + n * 0.4 + sunLight * 0.3 + edgeDarken)));

                c.fillStyle = `rgb(${r}, ${g}, ${b})`;
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

export function renderWaterTile(c, time, offsetX = 0, offsetY = 0) {
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const w1 = Math.sin((x + time * 3.2) * 0.45) * 0.5;
            const w2 = Math.cos((y + time * 2.6) * 0.55) * 0.5;
            const wave = (w1 + w2) * 0.5;

            let r, g, b;
            if (wave > 0.32) {
                // Shimmering ripple highlight
                r = 175; g = 235; b = 255;
            } else if (wave > 0.06) {
                // Azure crest
                r = 50; g = 165; b = 245;
            } else if (wave > -0.22) {
                // Deep clear water body
                r = 28; g = 120; b = 220;
            } else {
                // Shadowed trough
                r = 18; g = 85; b = 190;
            }
            c.fillStyle = `rgb(${r}, ${g}, ${b})`;
            c.fillRect(offsetX + x, offsetY + y, 1, 1);
        }
    }
}

    // 11: WATER
    drawTile(TILES.WATER, (c) => {
        renderWaterTile(c, 0);
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

    // 18: ROSE / POPPY (Classic Minecraft red poppy flower with green stem and leafy base)
    drawTile(TILES.ROSE, (c) => {
        c.clearRect(0, 0, 16, 16);

        // Green Stem (y=7 to 15, x=7 to 8)
        for (let y = 7; y <= 15; y++) {
            c.fillStyle = (y % 2 === 0) ? '#38a169' : '#276749';
            c.fillRect(7, y, 1, 1);
            if (y >= 10 && y <= 14) {
                c.fillStyle = '#2f855a';
                c.fillRect(8, y, 1, 1);
            }
        }

        // Green Leaves branching off stem
        const leaves = [
            [5, 12, '#2f855a'], [6, 12, '#48bb78'], [6, 13, '#276749'],
            [9, 10, '#48bb78'], [10, 10, '#38a169'], [9, 11, '#276749']
        ];
        for (const [lx, ly, col] of leaves) {
            c.fillStyle = col;
            c.fillRect(lx, ly, 1, 1);
        }

        // Flower Petals (Red Rose Head: y=2 to 8, x=4 to 11)
        const rosePixels = [
            [6, 7, '#991b1b'], [7, 7, '#991b1b'], [8, 7, '#991b1b'], [9, 7, '#991b1b'],
            [5, 6, '#b91c1c'], [6, 6, '#dc2626'], [7, 6, '#ef4444'], [8, 6, '#ef4444'], [9, 6, '#dc2626'], [10, 6, '#b91c1c'],
            [4, 5, '#991b1b'], [5, 5, '#dc2626'], [6, 5, '#ef4444'], [7, 5, '#f87171'], [8, 5, '#ef4444'], [9, 5, '#dc2626'], [10, 5, '#b91c1c'],
            [4, 4, '#b91c1c'], [5, 4, '#ef4444'], [6, 4, '#f87171'], [7, 4, '#fca5a5'], [8, 4, '#f87171'], [9, 4, '#ef4444'], [10, 4, '#dc2626'],
            [5, 3, '#991b1b'], [6, 3, '#dc2626'], [7, 3, '#ef4444'], [8, 3, '#dc2626'], [9, 3, '#b91c1c'],
            [6, 2, '#991b1b'], [7, 2, '#b91c1c'], [8, 2, '#991b1b']
        ];
        for (const [px, py, col] of rosePixels) {
            c.fillStyle = col;
            c.fillRect(px, py, 1, 1);
        }

        // Flower core center highlight
        c.fillStyle = '#fee2e2';
        c.fillRect(7, 4, 1, 1);
    });

    // 19: DANDELION (Classic Minecraft yellow dandelion flower blossom)
    drawTile(TILES.DANDELION, (c) => {
        c.clearRect(0, 0, 16, 16);

        // Green Stem (y=7 to 15, x=7 to 8)
        for (let y = 7; y <= 15; y++) {
            c.fillStyle = (y % 2 === 0) ? '#38a169' : '#276749';
            c.fillRect(7, y, 1, 1);
            if (y >= 9 && y <= 13) {
                c.fillStyle = '#2f855a';
                c.fillRect(8, y, 1, 1);
            }
        }

        // Serrated green dandelion basal leaves
        const leaves = [
            [4, 14, '#2f855a'], [5, 14, '#38a169'], [6, 13, '#276749'],
            [9, 13, '#276749'], [10, 14, '#38a169'], [11, 14, '#2f855a']
        ];
        for (const [lx, ly, col] of leaves) {
            c.fillStyle = col;
            c.fillRect(lx, ly, 1, 1);
        }

        // Golden-yellow blossom head (y=3 to 8, x=5 to 10)
        const dandelionPixels = [
            [6, 8, '#b45309'], [7, 8, '#b45309'], [8, 8, '#b45309'], [9, 8, '#b45309'],
            [5, 7, '#d97706'], [6, 7, '#f59e0b'], [7, 7, '#fbbf24'], [8, 7, '#fbbf24'], [9, 7, '#f59e0b'], [10, 7, '#d97706'],
            [4, 6, '#d97706'], [5, 6, '#f59e0b'], [6, 6, '#fbbf24'], [7, 6, '#fde047'], [8, 6, '#fde047'], [9, 6, '#fbbf24'], [10, 6, '#f59e0b'], [11, 6, '#d97706'],
            [4, 5, '#d97706'], [5, 5, '#fbbf24'], [6, 5, '#fde047'], [7, 5, '#fef08a'], [8, 5, '#fde047'], [9, 5, '#fbbf24'], [10, 5, '#f59e0b'],
            [5, 4, '#b45309'], [6, 4, '#f59e0b'], [7, 4, '#fbbf24'], [8, 4, '#fbbf24'], [9, 4, '#f59e0b'], [10, 4, '#b45309'],
            [6, 3, '#d97706'], [7, 3, '#f59e0b'], [8, 3, '#f59e0b'], [9, 3, '#d97706']
        ];
        for (const [px, py, col] of dandelionPixels) {
            c.fillStyle = col;
            c.fillRect(px, py, 1, 1);
        }

        // Sunny core center highlight
        c.fillStyle = '#ffffff';
        c.fillRect(7, 5, 1, 1);
    });

    // 20: LILY PAD (floating water lily with circular green pad and pink lotus blossom)
    drawTile(TILES.LILY_PAD, (c) => {
        const cx = 7.5;
        const cy = 7.5;
        const r = 6.2;

        for (let y = 1; y < 15; y++) {
            for (let x = 1; x < 15; x++) {
                const dx = x - cx;
                const dy = y - cy;
                const distSq = dx * dx + dy * dy;
                if (distSq <= r * r) {
                    // Minecraft V-notch cutout in the bottom-right corner
                    if (dx > 0.5 && dy > 0.5 && Math.abs(dx - dy) <= 1.4) {
                        continue;
                    }

                    // Green pad shading
                    const edge = distSq > (r - 1.2) * (r - 1.2);
                    const vein = (Math.abs(dx) < 0.6 || Math.abs(dy) < 0.6);
                    let color = '#2d6a4f';
                    if (edge) color = '#1b4332';
                    else if (vein) color = '#52b788';
                    else if ((x + y) % 2 === 0) color = '#40916c';

                    c.fillStyle = color;
                    c.fillRect(x, y, 1, 1);
                }
            }
        }

        // Beautiful lotus blossom in the center
        const blossomPixels = [
            [7, 7, '#f472b6'], [8, 7, '#f472b6'],
            [7, 8, '#f472b6'], [8, 8, '#f472b6'],
            [6, 7, '#fbcfe8'], [9, 7, '#fbcfe8'],
            [7, 6, '#fbcfe8'], [8, 6, '#fbcfe8'],
            [7, 9, '#fbcfe8'], [8, 9, '#fbcfe8'],
            // Center gold
            [7, 7, '#fbbf24']
        ];
        for (const [px, py, col] of blossomPixels) {
            c.fillStyle = col;
            c.fillRect(px, py, 1, 1);
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
AtlasMaterial.name = 'AtlasMaterial';
AtlasMaterial.color.setHex(0xffffff);

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

// Dynamically animate water ripples across all water surfaces in world
export function updateWaterAnimation(time) {
    if (!AtlasCanvas || !AtlasTexture) return;
    const col = TILES.WATER % ATLAS_COLS;
    const row = Math.floor(TILES.WATER / ATLAS_COLS);
    const startX = col * TILE_SIZE;
    const startY = row * TILE_SIZE;

    const ctx = AtlasCanvas.getContext('2d');
    renderWaterTile(ctx, time, startX, startY);
    AtlasTexture.needsUpdate = true;
}
