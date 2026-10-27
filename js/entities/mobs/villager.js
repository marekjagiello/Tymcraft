import * as THREE from 'three';
import { Mob } from '../mob.js';
import { playHitSound } from '../../audio.js';
import { eventBus } from '../../events.js';

export class Villager extends Mob {
    constructor(scene, world, x = 100, z = 100, manager = null, profession = 'farmer') {
        super(scene, world, 'villager', x, z, manager);
        this.maxHealth = 20;
        this.health = 20;
        this.walkSpeed = 1.9;
        this.profession = profession; // 'farmer', 'blacksmith', 'librarian'

        this.gruntTimer = 4.0 + Math.random() * 8.0;
        this.panicTimer = 0;
        this.panicDir = new THREE.Vector3();
        this.emeraldParticles = [];

        this.buildModel();
        this.snapToGround();
        this.scene.add(this.group);
    }

    buildModel() {
        // Robe colors by profession
        let robeColor = 0x78350f; // Brown (classic villager)
        if (this.profession === 'farmer') robeColor = 0x92400e;
        else if (this.profession === 'blacksmith') robeColor = 0x334155;
        else if (this.profession === 'librarian') robeColor = 0x831843;

        const robeMat = new THREE.MeshLambertMaterial({ color: robeColor });
        const darkRobeMat = new THREE.MeshLambertMaterial({ color: 0x451a03 });
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xf3b28f });
        const noseMat = new THREE.MeshLambertMaterial({ color: 0xeba17a });
        const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x059669 }); // Emerald green villager eyes
        const browMat = new THREE.MeshLambertMaterial({ color: 0x5c3317 });

        // 1. Torso / Long Robe
        const bodyGeo = new THREE.BoxGeometry(0.66, 0.95, 0.44);
        const body = new THREE.Mesh(bodyGeo, robeMat);
        body.position.set(0, 0.88, 0);
        this.group.add(body);

        // Lower robe apron
        const apronGeo = new THREE.BoxGeometry(0.68, 0.35, 0.46);
        const apron = new THREE.Mesh(apronGeo, darkRobeMat);
        apron.position.set(0, 0.58, 0);
        this.group.add(apron);

        // 2. Head
        const headGeo = new THREE.BoxGeometry(0.54, 0.62, 0.54);
        this.head = new THREE.Mesh(headGeo, skinMat);
        this.head.position.set(0, 1.62, 0);

        // Monobrow
        const browGeo = new THREE.BoxGeometry(0.42, 0.08, 0.06);
        const brow = new THREE.Mesh(browGeo, browMat);
        brow.position.set(0, 0.12, 0.28);
        this.head.add(brow);

        // Eyes
        const leftEyeWhite = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), eyeWhiteMat);
        leftEyeWhite.position.set(-0.14, 0.04, 0.28);
        const leftPupil = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.05), eyePupilMat);
        leftPupil.position.set(-0.13, 0.04, 0.29);
        this.head.add(leftEyeWhite, leftPupil);

        const rightEyeWhite = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), eyeWhiteMat);
        rightEyeWhite.position.set(0.14, 0.04, 0.28);
        const rightPupil = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.05), eyePupilMat);
        rightPupil.position.set(0.13, 0.04, 0.29);
        this.head.add(rightEyeWhite, rightPupil);

        // 3. DUŻY CHARAKTERYSTYCZNY NOS WIEŚNIAKA (Tymek: "Wieśniacy mają duże nosy")
        const noseGeo = new THREE.BoxGeometry(0.15, 0.30, 0.18);
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, -0.06, 0.35); // prominentnie wysunięty do przodu!
        this.head.add(nose);
        this.noseMesh = nose;

        this.group.add(this.head);

        // 4. Folded Crossed Arms (Klasyczne złożone ręce z przodu)
        const armsGeo = new THREE.BoxGeometry(0.74, 0.26, 0.28);
        const arms = new THREE.Mesh(armsGeo, robeMat);
        arms.position.set(0, 1.05, 0.20);
        this.armsMesh = arms;

        // Folded hands in the center
        const handsGeo = new THREE.BoxGeometry(0.24, 0.18, 0.30);
        const hands = new THREE.Mesh(handsGeo, skinMat);
        hands.position.set(0, 0, 0.02);
        arms.add(hands);
        this.group.add(arms);

        // 5. Legs
        const legGeo = new THREE.BoxGeometry(0.24, 0.44, 0.24);
        const legOffsets = [
            [-0.16, 0.22, 0],
            [0.16, 0.22, 0]
        ];
        for (let i = 0; i < 2; i++) {
            const pivot = new THREE.Group();
            pivot.position.set(legOffsets[i][0], 0.44, legOffsets[i][2]);
            const legMesh = new THREE.Mesh(legGeo, darkRobeMat);
            legMesh.position.set(0, -0.22, 0);
            pivot.add(legMesh);
            this.group.add(pivot);
            this.legs.push(pivot);
        }

        this.buildHealthBar(2.05);
    }

    playVillagerGrunt() {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
                // Short characteristic nasal sound
                const utter = new SpeechSynthesisUtterance('Hrmmm');
                utter.rate = 1.1;
                utter.pitch = 0.82;
                utter.volume = 0.7;
                window.speechSynthesis.speak(utter);
            } catch (_) {}
        }
    }

    spawnEmeraldParticles() {
        const gemGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        const gemMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        for (let i = 0; i < 6; i++) {
            const gem = new THREE.Mesh(gemGeo, gemMat);
            gem.position.set(
                this.position.x + (Math.random() - 0.5) * 0.6,
                this.position.y + 1.8 + Math.random() * 0.4,
                this.position.z + (Math.random() - 0.5) * 0.6
            );
            this.scene.add(gem);
            this.emeraldParticles.push({
                mesh: gem,
                vy: 1.5 + Math.random() * 0.8,
                life: 0,
                maxLife: 0.8
            });
        }
    }

    onAttacked(damage = 2, attackerPos = null, sourceItem = null) {
        super.onAttacked(damage, attackerPos);
        playHitSound();

        // Panic run away
        this.panicTimer = 3.5;
        if (attackerPos) {
            this.panicDir.copy(this.position).sub(attackerPos).setY(0).normalize();
            this.targetRotationY = Math.atan2(this.panicDir.x, this.panicDir.z);
        }

        // Alert any Iron Golem in the village! (Tymek: "a Golem jak walniesz wieśniaka...")
        eventBus.emit('villager:attacked', {
            villager: this,
            position: this.position.clone(),
            attackerPos: attackerPos ? attackerPos.clone() : this.position.clone()
        });
    }

    interactWithPlayer(player, ui) {
        // Face player
        const dx = player.position.x - this.position.x;
        const dz = player.position.z - this.position.z;
        this.targetRotationY = Math.atan2(dx, dz);
        this.rotationY = this.targetRotationY;
        this.group.rotation.y = this.rotationY;

        this.playVillagerGrunt();

        // Open Trading Interface
        if (ui && typeof ui.openVillagerTrading === 'function') {
            ui.openVillagerTrading(this);
        }
    }

    moveForward(dt, speed = this.walkSpeed) {
        const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
        const nextX = this.position.x + fwd.x * speed * dt;
        const nextZ = this.position.z + fwd.z * speed * dt;
        const groundAtTarget = this.getGroundHeight(nextX, nextZ);
        if (groundAtTarget - this.position.y <= 1.25) {
            this.position.x = nextX;
            this.position.z = nextZ;
        }
    }

    animateLegs(dt, speedMult = 2.0) {
        this.animTime += dt * 6.0 * speedMult;
        const swing = Math.sin(this.animTime) * 0.55;
        if (this.legs[0]) this.legs[0].rotation.x = swing;
        if (this.legs[1]) this.legs[1].rotation.x = -swing;
    }

    update(dt) {
        if (this.isDead) return;

        // Periodic villager grunting
        this.gruntTimer -= dt;
        if (this.gruntTimer <= 0) {
            this.gruntTimer = 10.0 + Math.random() * 14.0;
            if (this.manager && this.manager.player) {
                const distToPlayer = this.position.distanceTo(this.manager.player.position);
                if (distToPlayer <= 14) {
                    this.playVillagerGrunt();
                }
            }
        }

        // Panic mode when hit
        if (this.panicTimer > 0) {
            this.panicTimer -= dt;
            this.moveForward(dt, 4.2);
            this.animateLegs(dt, 2.8);
            this.updateFooting(dt);
            this.updateParticles(dt);
            return;
        }

        this.walkSpeed = 1.9;

        // Village leash: stay near village center (x: 100, z: 100)
        const distFromVillageCenter = Math.hypot(this.position.x - 100, this.position.z - 100);
        if (distFromVillageCenter > 20) {
            // Turn back toward village center
            const dirX = 100 - this.position.x;
            const dirZ = 100 - this.position.z;
            this.targetRotationY = Math.atan2(dirX, dirZ);
            this.state = 'walk';
            this.stateTimer = 4.0;
        } else {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.state = (this.state === 'idle') ? 'walk' : 'idle';
                this.stateTimer = 2.0 + Math.random() * 4.0;
                if (this.state === 'walk') {
                    this.targetRotationY = Math.random() * Math.PI * 2;
                }
            }
        }

        // Smooth rotation
        let diff = this.targetRotationY - this.rotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.rotationY += diff * 4 * dt;
        this.group.rotation.y = this.rotationY;

        if (this.state === 'walk') {
            this.moveForward(dt, this.walkSpeed);
            this.animateLegs(dt, 1.2);
        } else {
            if (this.legs[0]) this.legs[0].rotation.x *= 0.8;
            if (this.legs[1]) this.legs[1].rotation.x *= 0.8;
        }

        this.updateFooting(dt);
        this.updateParticles(dt);
    }

    updateParticles(dt) {
        for (let i = this.emeraldParticles.length - 1; i >= 0; i--) {
            const p = this.emeraldParticles[i];
            p.life += dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.rotation.y += dt * 4;
            p.mesh.scale.multiplyScalar(0.96);
            if (p.life >= p.maxLife) {
                if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
                this.emeraldParticles.splice(i, 1);
            }
        }
    }
}
