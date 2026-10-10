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

export function speakDirtikCry() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance('Ja to Dircik, a ty chciałeś mnie zabić!');
            utter.lang = 'pl-PL';
            utter.pitch = 1.35;
            utter.rate = 1.15;
            window.speechSynthesis.speak(utter);
        } catch (e) {
            console.warn('[Speech] Could not speak Dirtik cry:', e);
        }
    }
}


