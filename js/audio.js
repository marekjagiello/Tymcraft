// Central Web Audio API synthesis module for sound effects

let audioCtx = null;

export function getAudioContext() {
    if (!audioCtx && typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

export function playSwingSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
    } catch (_) {}
}

export function playHitSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
    } catch (_) {}
}

export function playBowShootSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.07);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.07);
    } catch (_) {}
}

export function playBowDrawSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(240, ctx.currentTime + 0.22);
        gain.gain.setValueAtTime(0.045, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
    } catch (_) {}
}


export function playEatSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.setValueAtTime(300, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
    } catch (_) {}
}

export function playDrinkSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        // Two refreshing drinking gulps
        [0, 0.12].forEach((offset) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, ctx.currentTime + offset);
            osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + offset + 0.09);
            gain.gain.setValueAtTime(0.18, ctx.currentTime + offset);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + 0.09);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + offset);
            osc.stop(ctx.currentTime + offset + 0.09);
        });
    } catch (_) {}
}

export function playRobotWakeSound() {

    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        // Sci-fi servo transform sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.25);
        osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    } catch (_) {}
}

export function playLaserSwordSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(750, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    } catch (_) {}
}

export function playQuestCompleteSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        // Joyous RPG quest fanfare
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
            gain.gain.setValueAtTime(0.22, ctx.currentTime + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.08);
            osc.stop(ctx.currentTime + idx * 0.08 + 0.28);
        });
    } catch (_) {}
}

export function playFreezeShiverSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        // Subtle teeth chatter
        [0, 0.06, 0.12, 0.18].forEach((t) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, ctx.currentTime + t);
            gain.gain.setValueAtTime(0.04, ctx.currentTime + t);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + t + 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + t);
            osc.stop(ctx.currentTime + t + 0.04);
        });
    } catch (_) {}
}



export function playHissSound(duration = 1.0) {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const bufferSize = Math.floor(ctx.sampleRate * duration);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.4;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1400, ctx.currentTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
        noise.stop(ctx.currentTime + duration);
    } catch (_) {}
}

export function playExplosionSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // 1. Low frequency sub-bass thump
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.6);
        oscGain.gain.setValueAtTime(0.65, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.6);

        // 2. White noise explosive burst
        const bufferSize = Math.floor(ctx.sampleRate * 0.7);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(120, now + 0.7);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.55, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        noise.start();
        noise.stop(now + 0.7);
    } catch (_) {}
}

let dirtikAudioEl = null;

export function playDirtikVoiceSound() {
    try {
        if (!dirtikAudioEl && typeof Audio !== 'undefined') {
            dirtikAudioEl = new Audio('./audio/dirtik_cry.wav?v=thin_1');
            dirtikAudioEl.volume = 1.0;
        }
        if (dirtikAudioEl) {
            dirtikAudioEl.currentTime = 0;
            const p = dirtikAudioEl.play();
            if (p && p.catch) {
                p.catch(() => speakDirtikCry());
            }
            return;
        }
    } catch (_) {}
    speakDirtikCry();
}

export function speakText(text, lang = 'pl-PL', pitch = 1.0, rate = 1.0) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = lang;
            utter.pitch = pitch;
            utter.rate = rate;
            window.speechSynthesis.speak(utter);
        } catch (e) {
            console.warn('[Speech] Could not speak text:', e);
        }
    }
}

export function speakDirtikCry() {
    speakText('Wiem, że to ty chcesz mnie zabić!', 'pl-PL', 1.8, 1.25);
}

export function playRainbowChimeSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (crystal chord)
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);
            gain.gain.setValueAtTime(0.18, now + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.35);
        });
    } catch (_) {}
}

export function playCyberTeleportSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.35);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
    } catch (_) {}
}

export function playMiniRobotZapSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    } catch (_) {}
}

// Dźwięk wibrującego hiper-reaktora ("dżżżżżżżż") podczas porywania przez robota
export function playReactorChargeSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(65, now);
        osc.frequency.linearRampToValueAtTime(140, now + 0.3);
        osc.frequency.linearRampToValueAtTime(260, now + 0.55);

        // Tremolo / LFO wibracja dla charakterystycznego efektu "dżżżż"
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(28, now); // 28Hz szybkie wibracje
        lfoGain.gain.setValueAtTime(30, now);
        lfo.connect(osc.frequency);
        lfo.start(now);
        lfo.stop(now + 0.55);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.55);
    } catch (_) {}
}

// Robotyczna syntezatorowa muzyka walki z mechem ("bźi-bźi-bźi-bźi")
let bossMusicInterval = null;
let bossMusicStep = 0;

export function startBossRobotMusic() {
    if (bossMusicInterval) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        bossMusicStep = 0;

        // Robotyczna melodia: "bźi bźi bźi bźi bźi..." w cybernetycznej skali
        const melodyNotes = [
            523.25, 523.25, 587.33, 622.25, // bźi bźi bźi bźi
            783.99, 622.25, 587.33, 523.25, // bźi bźi bźi bźi
            466.16, 523.25, 587.33, 783.99, // bźi bźi bźi bźi
            698.46, 622.25, 587.33, 466.16  // bźi bźi bźi bźi
        ];

        const bassNotes = [130.81, 130.81, 155.56, 174.61]; // C3, Eb3, F3

        bossMusicInterval = setInterval(() => {
            try {
                if (!ctx || ctx.state === 'suspended') return;
                const now = ctx.currentTime;
                const noteIdx = bossMusicStep % melodyNotes.length;
                const bassIdx = Math.floor(bossMusicStep / 4) % bassNotes.length;
                const freq = melodyNotes[noteIdx];

                // 1. Synth Lead "bźi-bźi" - ostry, staccato dźwięk mecha
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = (bossMusicStep % 2 === 0) ? 'square' : 'sawtooth';
                osc.frequency.setValueAtTime(freq, now);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + 0.11);

                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.11);

                // 2. Cyber-Bass Beat na co drugi krok
                if (bossMusicStep % 2 === 0) {
                    const bassOsc = ctx.createOscillator();
                    const bassGain = ctx.createGain();
                    bassOsc.type = 'triangle';
                    bassOsc.frequency.setValueAtTime(bassNotes[bassIdx], now);
                    bassOsc.frequency.exponentialRampToValueAtTime(50, now + 0.18);

                    bassGain.gain.setValueAtTime(0.08, now);
                    bassGain.gain.linearRampToValueAtTime(0.001, now + 0.18);

                    bassOsc.connect(bassGain);
                    bassGain.connect(ctx.destination);
                    bassOsc.start(now);
                    bassOsc.stop(now + 0.18);
                }

                bossMusicStep++;
            } catch (_) {}
        }, 135);
    } catch (_) {}
}

export function stopBossRobotMusic() {
    if (bossMusicInterval) {
        clearInterval(bossMusicInterval);
        bossMusicInterval = null;
        bossMusicStep = 0;
    }
}

// Ciężki metaliczny krok kolosa Bossa Robota
export function playBossStompSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // Sub-bass thud (75Hz -> 28Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(75, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + 0.22);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);

        // Metallic clank noise burst
        const bufferSize = Math.floor(ctx.sampleRate * 0.05);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.08, now);
        noiseGain.gain.linearRampToValueAtTime(0.001, now + 0.05);
        noise.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
    } catch (_) {}
}

// Strzał z laserowego pistoletu / blastera Bossa Robota
export function playLaserPistolSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(980, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.16);

        gain.gain.setValueAtTime(0.32, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.16);
    } catch (_) {}
}

// Chrumknięcie / ryk Króla Świń oraz świń z czerwonymi oczami (na życzenie Tymka!)
export function playPigGruntSound(isKing = false) {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        const startFreq = isKing ? 140 : 280;
        const endFreq = isKing ? 75 : 170;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.linearRampToValueAtTime(endFreq, now + 0.22);

        gain.gain.setValueAtTime(isKing ? 0.45 : 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
    } catch (_) {}
}

// Dźwięk tarczy anty-kolorowej odbijającej kolorowe bronie (na życzenie Tymka!)
export function playShieldDeflectSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.18);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
    } catch (_) {}
}

// Dźwięk dezorientacji / nagłego obrócenia gracza tyłem (na życzenie Tymka!)
export function playDisorientSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(360, now + 0.12);
        osc.frequency.linearRampToValueAtTime(110, now + 0.24);

        gain.gain.setValueAtTime(0.40, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.24);
    } catch (_) {}
}

// Dźwięk ostrzegawczy / brak surowców w Księdze Receptur
export function playWarningBuzzer() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.setValueAtTime(100, now + 0.08);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.18);
    } catch (_) {}
}

// Dźwięk pomyślnego wytworzenia przedmiotu w Księdze Receptur
export function playCraftSuccessSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const freqs = [440, 554.37, 659.25]; // A4, C#5, E5
        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);
            gain.gain.setValueAtTime(0.18, now + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.04);
            osc.stop(now + idx * 0.04 + 0.22);
        });
    } catch (_) {}
}

