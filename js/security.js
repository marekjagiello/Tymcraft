// System Ochrony Gry Tymka (Tymcraft Full Game Protection & Anti-Download Shield)
import { eventBus } from './events.js';
import { playCyberTeleportSound } from './audio.js';

export class SecurityShield {
    constructor(game = null) {
        this.game = game;
        this.isProtected = true;
        this.owner = 'Tymek';
        this._alertTimeout = null;
        this.init();
    }

    init() {
        this.printConsoleSecurityBanner();
        this.initKeyblockers();
        this.initContextMenuBlocker();
        this.protectWindowGlobals();

        eventBus.on('security:alert', (msg) => {
            this.showSecurityAlert(msg);
        });
    }

    showSecurityAlert(msg = 'Nie możesz ściągnąć tej gry, bo ma własną ochronę!') {
        try { playCyberTeleportSound(); } catch (_) {}
        eventBus.emit('ui:popup', `🚫 ${msg} 🛡️`);
        eventBus.emit('chat:system_message', {
            sender: '🛡️ System Ochrony',
            text: `🚫 [BLOKADA ŚCIĄGANIA]: ${msg} Gra Tymka posiada własną nienaruszalną ochronę! Nikt nie może jej ściągnąć ani zrobić lepszej! 👑🔒`
        });

        if (typeof document === 'undefined') return;
        let el = document.getElementById('security-shield-popup');
        if (!el) {
            el = document.createElement('div');
            el.id = 'security-shield-popup';
            el.style.position = 'fixed';
            el.style.top = '22%';
            el.style.left = '50%';
            el.style.transform = 'translate(-50%, -50%)';
            el.style.zIndex = '999999';
            el.style.background = 'linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(6, 78, 59, 0.96))';
            el.style.color = '#ffffff';
            el.style.border = '3px solid #10b981';
            el.style.borderRadius = '16px';
            el.style.padding = '22px 30px';
            el.style.textAlign = 'center';
            el.style.fontFamily = "'Segoe UI', Roboto, sans-serif";
            el.style.boxShadow = '0 0 35px rgba(16, 185, 129, 0.8), 0 20px 40px rgba(0, 0, 0, 0.7)';
            el.style.pointerEvents = 'none';
            el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            el.style.maxWidth = '90vw';
            document.body.appendChild(el);
        }

        el.innerHTML = `
            <div style="font-size: 38px; margin-bottom: 8px;">🛡️ 👑 🔒</div>
            <div style="font-size: 20px; font-weight: 800; color: #34d399; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">
                Tarcza Ochrony Gry Tymka
            </div>
            <div style="font-size: 16px; font-weight: 700; color: #ffffff; line-height: 1.5; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">
                🚫 ${msg} 🛡️
            </div>
            <div style="font-size: 12px; color: #a7f3d0; margin-top: 10px; opacity: 0.9;">
                Ta gra jest zabezpieczona przed pobieraniem, modyfikacją i kopiowaniem!
            </div>
        `;
        el.style.opacity = '1';
        el.style.display = 'block';
        el.style.transform = 'translate(-50%, -50%) scale(1.05)';
        setTimeout(() => {
            el.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 120);

        clearTimeout(this._alertTimeout);
        this._alertTimeout = setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => {
                if (el.style.opacity === '0') el.style.display = 'none';
            }, 350);
        }, 3200);
    }

    printConsoleSecurityBanner() {
        if (typeof console !== 'undefined') {
            const banner = `
========================================================================================
🛡️ TYMCRAFT SECURITY SYSTEM — OFICJALNY SYSTEM OCHRONY GRY TYMKA 🛡️
========================================================================================
🚫 NIE MOŻESZ ŚCIĄGNĄĆ TEJ GRY!
Ta gra ma swoją własną ochronę stworzoną specjalnie dla Tymka!
Wszelkie próby pobierania, kopiowania, noclip i przerabiania są w 100% ZABLOKOWANE! 🔒👑
========================================================================================
            `;
            console.log('%c' + banner, 'color: #38bdf8; font-weight: bold; font-size: 14px; background: #0f172a; padding: 8px;');
        }
    }

    initKeyblockers() {
        window.addEventListener('keydown', (e) => {
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;
            const keyLower = (e.key || '').toLowerCase();

            // 1. Blokada Ctrl+S / Cmd+S (Zapisz stronę / Ściągnij grę)
            if (isCtrlOrCmd && keyLower === 's') {
                e.preventDefault();
                e.stopPropagation();
                this.showSecurityAlert('Nie możesz ściągnąć tej gry, bo ma własną ochronę!');
                return false;
            }

            // 2. Blokada Ctrl+U / Cmd+U (Wyświetl źródło strony)
            if (isCtrlOrCmd && keyLower === 'u') {
                e.preventDefault();
                e.stopPropagation();
                this.showSecurityAlert('Kod źródłowy gry jest chroniony Tarczą Tymka!');
                return false;
            }

            // 3. Blokada Ctrl+P (Drukuj / Zapisz jako PDF)
            if (isCtrlOrCmd && keyLower === 'p') {
                e.preventDefault();
                e.stopPropagation();
                this.showSecurityAlert('Kopiowanie i drukowanie gry jest zablokowane!');
                return false;
            }

            // 4. Blokada / Informacja przy próbie F12 / DevTools
            if (e.key === 'F12' || (isCtrlOrCmd && e.shiftKey && (keyLower === 'i' || keyLower === 'j' || keyLower === 'c'))) {
                this.printConsoleSecurityBanner();
            }
        }, true);
    }

    initContextMenuBlocker() {
        window.addEventListener('contextmenu', (e) => {
            // Blokuj menu kontekstowe na całej stronie, aby nikt nie mógł kliknąć "Zapisz stronę jako..."
            e.preventDefault();
            // Jeśli mysz nie jest zablokowana wskaźnikiem (np. gracz kliknął w menu/interfejsie):
            if (!this.game?.player?.controls?.isLocked) {
                this.showSecurityAlert('Opcje przeglądarki i pobieranie są zablokowane! Gra Tymka ma własną ochronę!');
            }
        }, true);
    }

    protectWindowGlobals() {
        try {
            if (typeof window !== 'undefined') {
                Object.defineProperty(window, 'isGameProtected', {
                    value: true,
                    writable: false,
                    configurable: false
                });
                Object.defineProperty(window, 'gameProtectionOwner', {
                    value: 'Tymek',
                    writable: false,
                    configurable: false
                });
            }
        } catch (_) {}
    }
}
