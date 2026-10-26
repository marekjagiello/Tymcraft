// Survival mechanics: Health, Hunger, Fall Damage, Starvation, and Eating
import { eventBus } from './events.js';

export class SurvivalManager {
    constructor(player, onStatsChange) {
        this.player = player;
        this.onStatsChange = onStatsChange || (() => {});

        this.maxHealth = 20;
        this.health = 20;

        this.maxHunger = 20;
        this.hunger = 20;

        this.isDead = false;
        this.hasArmor = false;
        this.hasRubyArmor = false;
        this.rubyArmorDurability = 50;
        this.maxRubyArmorDurability = 50;
        this.armorType = 0;
        this.checkHasArmor = null;
        this.getArmorType = null;

        // Timers for hunger and regeneration
        this.hungerTickTimer = 0;
        this.regenTimer = 0;
        this.starveTimer = 0;

        // Oxygen & drowning
        this.maxOxygen = 10;
        this.oxygen = 10;
        this.oxygenTimer = 0;
        this.drownDamageTimer = 0;
        this.onOxygenChange = null;

        this.vignetteEl = document.getElementById('damage-vignette');
        this.deathOverlayEl = document.getElementById('death-overlay');

        this.initDeathScreen();
        this.initEventListeners();
    }

    initEventListeners() {
        this._handledByEvent = true;

        eventBus.on('player:damage', (data) => {
            const amount = typeof data === 'number' ? data : (data?.amount ?? 1);
            const reason = typeof data === 'object' ? (data?.reason ?? 'damage') : 'damage';
            this.takeDamage(amount, reason);
        });

        eventBus.on('player:heal', (data) => {
            const amount = typeof data === 'number' ? data : (data?.amount ?? 1);
            this.heal(amount);
        });

        eventBus.on('player:feed', (data) => {
            const amount = typeof data === 'number' ? data : (data?.amount ?? 1);
            this.feed(amount);
        });
    }

    initDeathScreen() {
        const respawnBtn = document.getElementById('respawn-button');
        if (respawnBtn) {
            respawnBtn.addEventListener('click', () => {
                this.respawn();
            });
        }
    }

    takeDamage(amount, reason = 'damage') {
        if (this.isDead || amount <= 0) return;
        if (this.game && this.game.isGamePaused && this.game.isGamePaused()) return;
        if (this.ui && this.ui.isGamePaused && this.ui.isGamePaused()) return;

        if (this.hasRubyArmor) {
            this.rubyArmorDurability = (typeof this.rubyArmorDurability === 'number' && this.rubyArmorDurability > 0)
                ? this.rubyArmorDurability - 1
                : 49;

            this.flashRedVignette();

            if (this.rubyArmorDurability > 0) {
                console.log(`[Survival] Cios (${amount} dmg z ${reason}) pochłonięty przez Rubinową Zbroję! Trwałość: ${this.rubyArmorDurability}/${this.maxRubyArmorDurability}`);
                eventBus.emit('ui:popup', `🛡️ Rubinowa Zbroja przyjęła cios! (Wytrzymałość: ${this.rubyArmorDurability}/${this.maxRubyArmorDurability} ciosów) 🔴`);
            } else {
                console.log('[Survival] Rubinowa Zbroja zużyła się i pękła!');
                eventBus.emit('ui:popup', '💥 Twoja Rubinowa Zbroja pękła i rozpadła się na kawałki!');
                this.hasRubyArmor = false;
                this.hasArmor = false;
                this.armorType = 0;
                this.rubyArmorDurability = 50;

                // Remove ruby armor item (ID 37) from inventory
                eventBus.emit('item:consume_specific', { id: 37, amount: 1 });

                this.maxHealth = 20;
                if (this.health > 20) this.health = 20;
                this.onStatsChange(this.health, this.hunger, this.maxHealth);
                if (this.player && this.player.setArmorVisual) {
                    this.player.setArmorVisual(0);
                }
            }
            return;
        }

        let finalAmount = amount;
        if (this.hasArmor) {
            finalAmount = Math.max(1, Math.round(amount * 0.6)); // 40% damage reduction from Diamond Armor
        }

        this.health = Math.max(0, this.health - finalAmount);
        this.flashRedVignette();
        this.onStatsChange(this.health, this.hunger, this.maxHealth);

        console.log(`[Survival] Took ${finalAmount} damage (raw: ${amount}) from ${reason}. Health: ${this.health}/${this.maxHealth} (Armor: ${this.hasArmor})`);

        if (this.health <= 0) {
            this.die();
        }
    }

    heal(amount) {
        if (this.isDead) return;
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.onStatsChange(this.health, this.hunger, this.maxHealth);
    }

    feed(amount) {
        if (this.isDead) return;
        this.hunger = Math.min(this.maxHunger, this.hunger + amount);
        this.heal(1);
        this.onStatsChange(this.health, this.hunger, this.maxHealth);
    }

    eat(amount) {
        this.feed(amount);
    }

    flashRedVignette() {
        if (this.vignetteEl) {
            this.vignetteEl.style.opacity = '0.7';
            setTimeout(() => {
                if (this.vignetteEl) this.vignetteEl.style.opacity = '0';
            }, 300);
        }
    }

    die() {
        this.isDead = true;
        this.player.controls.unlock();
        eventBus.emit('player:death');
        if (this.deathOverlayEl) {
            this.deathOverlayEl.style.display = 'flex';
        }
    }

    respawn() {
        this.health = this.maxHealth;
        this.hunger = this.maxHunger;
        this.isDead = false;

        if (this.deathOverlayEl) {
            this.deathOverlayEl.style.display = 'none';
        }

        this.player.spawnOnSurface();
        this.player.controls.lock();
        this.oxygen = this.maxOxygen;
        this.oxygenTimer = 0;
        this.drownDamageTimer = 0;
        if (this.onOxygenChange) this.onOxygenChange(this.oxygen, this.maxOxygen, false);
        this.onStatsChange(this.health, this.hunger);
        eventBus.emit('player:respawn');
    }

    handleFallLanding(downwardVelocity) {
        if (this.game && this.game.isGamePaused && this.game.isGamePaused()) return;
        if (this.ui && this.ui.isGamePaused && this.ui.isGamePaused()) return;
        // Woda w pełni amortyzuje upadek jak w Minecrafcie!
        if (this.player && this.player.isInWater) return;

        // Fall damage threshold: velocity < -15
        if (downwardVelocity < -15) {
            const rawDmg = Math.abs(downwardVelocity) - 15;
            const dmg = Math.min(20, Math.floor(rawDmg * 1.4));
            if (dmg > 0) {
                this.takeDamage(dmg, 'fall');
            }
        }
    }

    update(dt) {
        if (this.isDead) return;
        if (this.game && this.game.isGamePaused && this.game.isGamePaused()) return;
        if (this.ui && this.ui.isGamePaused && this.ui.isGamePaused()) return;

        // Check armor type (0 = none, 32 = Diamond, 37 = Ruby)
        if (this.getArmorType) {
            const currentArmor = this.getArmorType();
            if (currentArmor !== this.armorType) {
                this.armorType = currentArmor;
                this.hasArmor = currentArmor === 32 || currentArmor === 37 || currentArmor === 43;
                this.hasRubyArmor = currentArmor === 37;

                if (this.hasRubyArmor) {
                    this.maxHealth = 40; // 20 hearts
                    this.health = 40;
                    this.rubyArmorDurability = 50;
                } else if (this.armorType === 32) {
                    this.maxHealth = 30; // 15 hearts
                    if (this.health <= 20) this.health = 30;
                } else if (this.armorType === 43) {
                    this.maxHealth = 26; // 13 hearts (Kamienna zbroja)
                    if (this.health <= 20) this.health = 26;
                } else {
                    this.maxHealth = 20;
                    if (this.health > 20) this.health = 20;
                }
                this.onStatsChange(this.health, this.hunger, this.maxHealth);
                if (this.player && this.player.setArmorVisual) {
                    this.player.setArmorVisual(this.armorType);
                }
            }
        } else if (this.checkHasArmor) {
            const hasArmorNow = Boolean(this.checkHasArmor());
            if (hasArmorNow !== this.hasArmor) {
                this.hasArmor = hasArmorNow;
                this.maxHealth = this.hasArmor ? 30 : 20; // 30 HP = 15 hearts
                if (this.hasArmor && this.health <= 20) {
                    this.health = Math.min(this.maxHealth, this.health + 10);
                } else if (!this.hasArmor && this.health > 20) {
                    this.health = 20;
                }
                this.onStatsChange(this.health, this.hunger, this.maxHealth);
            }
        }

        // Hunger depletion: faster if sprinting
        const sprintFactor = this.player.keys.sprint ? 2.5 : 1.0;
        this.hungerTickTimer += dt * sprintFactor;

        if (this.hungerTickTimer >= 35) { // 1 hunger point every ~35s
            this.hunger = Math.max(0, this.hunger - 1);
            this.hungerTickTimer = 0;
            this.onStatsChange(this.health, this.hunger, this.maxHealth);
        }

        // Natural regeneration if well-fed (hunger >= 18)
        if (this.hunger >= 18 && this.health < this.maxHealth) {
            this.regenTimer += dt;
            if (this.regenTimer >= 4.0) {
                this.heal(1);
                this.hunger = Math.max(0, this.hunger - 0.5); // consumes little hunger
                this.regenTimer = 0;
            }
        } else {
            this.regenTimer = 0;
        }

        // Starvation damage if hunger is 0
        if (this.hunger === 0 && this.health > 1) {
            this.starveTimer += dt;
            if (this.starveTimer >= 4.0) {
                this.takeDamage(1, 'starvation');
                this.starveTimer = 0;
            }
        } else {
            this.starveTimer = 0;
        }

        // Underwater oxygen bubbles & drowning damage
        const isHeadUnderwater = this.player ? Boolean(this.player.isHeadUnderwater) : false;
        if (isHeadUnderwater) {
            this.oxygenTimer += dt;
            // 1 bubble pops every 1.5s (15s underwater capacity)
            if (this.oxygenTimer >= 1.5) {
                this.oxygenTimer = 0;
                this.oxygen = Math.max(0, this.oxygen - 1);
                if (this.onOxygenChange) {
                    this.onOxygenChange(this.oxygen, this.maxOxygen, true);
                }
            }

            // Drowning damage when oxygen is completely exhausted!
            if (this.oxygen <= 0) {
                this.drownDamageTimer += dt;
                if (this.drownDamageTimer >= 1.2) {
                    this.drownDamageTimer = 0;
                    this.takeDamage(2, 'drowning');
                    eventBus.emit('ui:popup', '🫧 Brak tlenu! Toniesz pod wodą! Wynurz się! 🌊');
                }
            } else {
                this.drownDamageTimer = 0;
            }
        } else {
            // Head is above water: rapidly refill oxygen
            this.drownDamageTimer = 0;
            if (this.oxygen < this.maxOxygen) {
                this.oxygen = Math.min(this.maxOxygen, this.oxygen + dt * 6.0);
                if (this.onOxygenChange) {
                    this.onOxygenChange(this.oxygen, this.maxOxygen, false);
                }
            }
        }
    }
}
