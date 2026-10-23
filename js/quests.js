import { eventBus } from './events.js';
import { playQuestCompleteSound } from './audio.js';

export class QuestManager {
    constructor(ui, player, world) {
        this.ui = ui;
        this.player = player;
        this.world = world;

        this.quests = [
            {
                id: 'dirtik_hunt',
                name: '🐗 Pogromca Dirtików',
                description: 'Pokonaj 2 Dirtiki bez zginięcia',
                current: 0,
                target: 2,
                reward: { id: 46, name: 'Ciepła Kurtka', count: 1, icon: '🧥' },
                completed: false
            },
            {
                id: 'freeze_peak',
                name: '🏔️ Mroźny Szczyt',
                description: 'Wejdź na ośnieżoną górę w Ciepłej Kurtce',
                current: 0,
                target: 1,
                reward: { id: 30, name: 'Diament', count: 5, icon: '💎' },
                completed: false
            },
            {
                id: 'desert_oasis',
                name: '🏜️ Oaza Pustynna',
                description: 'Dotrzyj na pustynię i napij się wody z butelki (kod "grat")',
                current: 0,
                target: 1,
                reward: { id: 34, name: 'Rubin', count: 3, icon: '🔴' },
                completed: false
            },
            {
                id: 'robot_boss',
                name: '🤖 Pogromca Robota',
                description: 'Obudź i pokonaj transformującego się Robota!',
                current: 0,
                target: 1,
                reward: { id: 47, name: 'Laserowy Miecz', count: 1, icon: '⚡' },
                completed: false
            },
            {
                id: 'mystery_box',
                name: '🎁 Szczęśliwy Los',
                description: 'Otwórz Mystery Boxa (hasło "miał")',
                current: 0,
                target: 1,
                reward: { id: 23, name: 'Złote Jabłko', count: 6, icon: '🍏' },
                completed: false
            }
        ];

        this.hudEl = document.getElementById('quest-hud');
        this.initEvents();
        this.render();
    }

    initEvents() {
        eventBus.on('mob:killed', (data) => {
            if (data?.type === 'dirtik') {
                this.addProgress('dirtik_hunt', 1);
            } else if (data?.type === 'robot') {
                this.addProgress('robot_boss', 1);
            }
        });

        eventBus.on('mystery_box:opened', () => {
            this.addProgress('mystery_box', 1);
        });

        eventBus.on('water:drank', (data) => {
            if (data?.biome === 'Desert') {
                this.addProgress('desert_oasis', 1);
            }
        });

        eventBus.on('player:damage', (data) => {
            // Check if player died
            if (this.ui?.survival?.isDead && !this.quests[0].completed) {
                if (this.quests[0].current > 0) {
                    this.quests[0].current = 0;
                    if (this.ui) this.ui.showPopup('⚠️ Zginąłeś! Licznik Dirtików zresetowany do 0/2!');
                    this.render();
                }
            }
        });
    }

    addProgress(questId, amount = 1) {
        const q = this.quests.find(item => item.id === questId);
        if (!q || q.completed) return;

        q.current = Math.min(q.target, q.current + amount);
        this.render();

        if (q.current >= q.target) {
            this.completeQuest(q);
        }
    }

    completeQuest(q) {
        q.completed = true;
        playQuestCompleteSound();

        // Award items
        if (this.ui && q.reward) {
            this.ui.addItem(q.reward.id, q.reward.name, q.reward.count);
            this.ui.addChatMessage('Serwer', `🏆 BRAWO! Ukończyłeś zadanie: ${q.name}! Nagroda: ${q.reward.count}x ${q.reward.name} ${q.reward.icon}!`, 'chat-success');
            this.ui.showPopup(`🎉 Zadanie ukończone: ${q.name}! Odebrano ${q.reward.count}x ${q.reward.name}!`);
        }

        this.render();
    }

    checkPlayerLocation(px, py, pz, biome, hasJacket) {
        // Quest 2: Mountain peak with Warm Jacket
        if (!this.quests[1].completed && hasJacket) {
            if (biome === 'Mountains' && py >= 14) {
                this.addProgress('freeze_peak', 1);
            }
        }
    }

    render() {
        if (!this.hudEl) {
            this.hudEl = document.getElementById('quest-hud');
        }
        if (!this.hudEl) return;

        const completedCount = this.quests.filter(q => q.completed).length;
        let html = `
            <div class="quest-hud-title">
                <span>📜 ZADANIA (QUESTY) [${completedCount}/5]</span>
            </div>
            <div class="quest-list">
        `;

        this.quests.forEach(q => {
            const isDone = q.completed;
            const statusClass = isDone ? 'quest-done' : 'quest-active';
            const checkMark = isDone ? '✅' : '⬜';
            html += `
                <div class="quest-item ${statusClass}">
                    <div class="quest-item-header">
                        <span class="quest-check">${checkMark}</span>
                        <span class="quest-name">${q.name}</span>
                        <span class="quest-progress">${q.current}/${q.target}</span>
                    </div>
                    <div class="quest-desc">${q.description}</div>
                    <div class="quest-reward">🎁 Nagroda: <b>${q.reward.name}</b> ${q.reward.icon}</div>
                </div>
            `;
        });

        html += `</div>`;
        this.hudEl.innerHTML = html;
    }
}
