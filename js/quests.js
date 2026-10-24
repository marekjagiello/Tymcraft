import { eventBus } from './events.js';
import { playQuestCompleteSound } from './audio.js';

export class QuestManager {
    constructor(ui, player, world) {
        this.ui = ui;
        this.player = player;
        this.world = world;
        this.stage2Unlocked = false;

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

        this.epicQuests = [
            {
                id: 'epic_boss_robot',
                name: '👑 Pogromca Bossa Robotów',
                description: 'Obudź i pokonaj 4-ramiennego Bossa Robota (totem: Ziemia na dole + Kamień na górze + Krzesiwo)!',
                current: 0,
                target: 1,
                reward: { id: 54, name: 'Kolorowy Miecz', count: 1, icon: '🌈🗡️' },
                completed: false
            },
            {
                id: 'epic_charged_block',
                name: '⚡ Mistrz Energii 626',
                description: 'Stwórz w craftingu Napiorunowany Kolorowy Blok (Kolorowy Blok 626 + Laserowy Miecz)!',
                current: 0,
                target: 1,
                reward: { id: 55, name: 'Kolorowy Łuk', count: 1, icon: '🌈🏹' },
                completed: false
            },
            {
                id: 'epic_wand_spells',
                name: '🪄 Arcymag Trzech Żywiołów',
                description: 'Wystrzel wszystkie 3 czary z Magicznej Różdżki: Piorun ⚡, Kulę Ognia 🔥 i Kamień 🪨!',
                current: 0,
                target: 3,
                castSpells: [],
                reward: { id: 56, name: 'Magiczna Kolorowa Strzała', count: 1, icon: '🌈🎯' },
                completed: false
            }
        ];

        this.hudEl = document.getElementById('quest-hud');
        this.initEvents();
        this.render();
    }

    getAllQuests() {
        return [...this.quests, ...this.epicQuests];
    }

    initEvents() {
        eventBus.on('mob:killed', (data) => {
            if (data?.type === 'dirtik') {
                this.addProgress('dirtik_hunt', 1);
            } else if (data?.type === 'robot') {
                this.addProgress('robot_boss', 1);
            } else if (data?.type === 'boss_robot') {
                this.addProgress('epic_boss_robot', 1);
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

        eventBus.on('craft:item', (data) => {
            if (data?.id === 53) {
                this.addProgress('epic_charged_block', 1);
            }
        });

        eventBus.on('wand:spell_cast', (data) => {
            const q = this.epicQuests.find(item => item.id === 'epic_wand_spells');
            if (q && !q.completed && data?.type) {
                if (!Array.isArray(q.castSpells)) q.castSpells = [];
                if (!q.castSpells.includes(data.type)) {
                    q.castSpells.push(data.type);
                    q.current = q.castSpells.length;
                    this.render();
                    if (q.current >= q.target) {
                        this.completeQuest(q);
                    }
                }
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

        eventBus.on('quests:skip_starter', () => {
            this.skipStarterQuests();
        });
    }

    skipStarterQuests() {
        this.quests.forEach(q => {
            q.completed = true;
            q.current = q.target;
        });

        if (this.ui && !this.ui.hasItem(46)) {
            this.ui.addItem(46, 'Ciepła Kurtka', 1);
        }

        this.stage2Unlocked = true;
        this.render();

        if (this.ui) {
            this.ui.addChatMessage('Serwer', '💥💨 Tajne hasło aktywowane! Wszystkie zadania startowe pominięte! Odblokowano Epickie Kolorowe Zadania Mistrza! 👑🌈', 'chat-success');
            this.ui.showPopup('💥 Zadania startowe pominięte! Witaj w Etapie 2! 👑🌈');
        }
    }

    addProgress(questId, amount = 1) {
        const q = this.getAllQuests().find(item => item.id === questId);
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

        // Check if all starter quests are completed to unlock Stage 2
        const starterDone = this.quests.every(quest => quest.completed);
        if (starterDone && !this.stage2Unlocked) {
            this.stage2Unlocked = true;
            if (this.ui) {
                this.ui.addChatMessage('Serwer', '🌟 ODBLOKOWANO ETAP 2: ZADANIA MISTRZA! Pokonaj Bossa Robotów i zdobądź Kolorowy Ekwipunek: Miecz 🌈🗡️, Łuk 🌈🏹 i Magiczną Strzałę 🌈🎯!', 'chat-success');
                this.ui.showPopup('🌟 ODBLOKOWANO ETAP 2: ZADANIA MISTRZA! 👑');
            }
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

        const starterCompletedCount = this.quests.filter(q => q.completed).length;
        const starterAllDone = starterCompletedCount === this.quests.length;

        const epicCompletedCount = this.epicQuests.filter(q => q.completed).length;

        let html = '';

        if (!starterAllDone) {
            html += `
                <div class="quest-hud-title">
                    <span>📜 ZADANIA STARTOWE [${starterCompletedCount}/5]</span>
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
            html += `
                <div class="quest-stage-locked" style="margin-top: 8px; padding: 6px; font-size: 11px; background: rgba(0,0,0,0.5); border: 1px dashed #eab308; border-radius: 4px; color: #fde047; text-align: center;">
                    🔒 <b>ETAP 2: ZADANIA MISTRZA</b><br/>Ukończ 5 zadań startowych, by odblokować Kolorowy Miecz, Łuk i Strzałę!
                </div>
            `;
        } else {
            // Stage 1 completed! Show Stage 2 prominently!
            html += `
                <div class="quest-stage-done-badge" style="font-size: 11px; color: #4ade80; margin-bottom: 4px; text-align: center;">
                    ✅ Etap 1: Wszystkie 5 zadań ukończone!
                </div>
                <div class="quest-hud-title" style="color: #facc15; text-shadow: 0 0 8px rgba(250,204,21,0.6);">
                    <span>👑 ETAP 2: ZADANIA MISTRZA [${epicCompletedCount}/3]</span>
                </div>
                <div class="quest-list">
            `;
            this.epicQuests.forEach(q => {
                const isDone = q.completed;
                const statusClass = isDone ? 'quest-done' : 'quest-active';
                const checkMark = isDone ? '✅' : '⬜';
                html += `
                    <div class="quest-item ${statusClass}" style="border-left: 3px solid #ec4899;">
                        <div class="quest-item-header">
                            <span class="quest-check">${checkMark}</span>
                            <span class="quest-name" style="color: #f472b6;">${q.name}</span>
                            <span class="quest-progress">${q.current}/${q.target}</span>
                        </div>
                        <div class="quest-desc">${q.description}</div>
                        <div class="quest-reward" style="color: #fde047;">🎁 Nagroda: <b>${q.reward.name}</b> ${q.reward.icon}</div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        this.hudEl.innerHTML = html;
    }
}
