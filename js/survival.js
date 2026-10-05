// Survival mechanics: Health, Hunger, Fall Damage, Starvation, and Eating

export class SurvivalManager {
    constructor(player, onStatsChange) {
        this.player = player;
        this.onStatsChange = onStatsChange || (() => {});

        this.maxHealth = 20;
        this.health = 20;

        this.maxHunger = 20;
        this.hunger = 20;

        this.isDead = false;

        // Timers for hunger and regeneration
        this.hungerTickTimer = 0;
        this.regenTimer = 0;
        this.starveTimer = 0;

        this.vignetteEl = document.getElementById('damage-vignette');
        this.deathOverlayEl = document.getElementById('death-overlay');

        this.initDeathScreen();
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

        this.health = Math.max(0, this.health - amount);
        this.flashRedVignette();
        this.onStatsChange(this.health, this.hunger);

        console.log(`[Survival] Took ${amount} damage from ${reason}. Health: ${this.health}/${this.maxHealth}`);

        if (this.health <= 0) {
            this.die();
        }
    }

    heal(amount) {
        if (this.isDead) return;
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.onStatsChange(this.health, this.hunger);
    }

    feed(amount) {
        if (this.isDead) return;
        this.hunger = Math.min(this.maxHunger, this.hunger + amount);
        this.heal(1);
        this.onStatsChange(this.health, this.hunger);
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
        this.onStatsChange(this.health, this.hunger);
    }

    handleFallLanding(downwardVelocity) {
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

        // Hunger depletion: faster if sprinting
        const sprintFactor = this.player.keys.sprint ? 2.5 : 1.0;
        this.hungerTickTimer += dt * sprintFactor;

        if (this.hungerTickTimer >= 35) { // 1 hunger point every ~35s
            this.hunger = Math.max(0, this.hunger - 1);
            this.hungerTickTimer = 0;
            this.onStatsChange(this.health, this.hunger);
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
    }
}
