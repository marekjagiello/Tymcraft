import * as THREE from 'three';
import { playHitSound } from './audio.js';
import { eventBus } from './events.js';
import { WORLD_HEIGHT } from './world.js';

export class SecondPlayer {
    constructor(scene, world, player1) {
        this.scene = scene;
        this.world = world;
        this.player1 = player1;

        this.isActive = false;
        this.position = new THREE.Vector3(34, 15, 33);
        this.velocity = new THREE.Vector3();
        this.rotationY = 0;

        this.width = 0.6;
        this.height = 1.8;
        this.eyeHeight = 1.62;

        this.walkSpeed = 4.5;
        this.gravity = 28.0;
        this.jumpForce = 8.5;
        this.onGround = false;
        this.isInWater = false;

        this.walkCycle = 0;
        this.attackCooldown = 0;
        this.isAttacking = false;
        this.attackSwingTime = 0;

        this.keys = {
            forward: false,
            backward: false,
            turnLeft: false,
            turnRight: false,
            jump: false,
            attack: false,
            interact: false
        };

        this.buildMesh();
        this.initControls();
    }

    createNameTagSprite(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Rounded badge background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.roundRect(16, 8, 224, 48, 12);
        ctx.fill();

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Text
        ctx.font = 'bold 26px sans-serif';
        ctx.fillStyle = '#6ee7b7';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;

        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(1.6, 0.4, 1.0);
        sprite.position.set(0, 2.25, 0);
        return sprite;
    }

    buildMesh() {
        this.group = new THREE.Group();

        // 1. Torso (Emerald green Alex-style shirt)
        const torsoGeo = new THREE.BoxGeometry(0.42, 0.65, 0.22);
        const torsoMat = new THREE.MeshLambertMaterial({ color: 0x059669 });
        this.torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
        this.torsoMesh.position.set(0, 1.05, 0);
        this.group.add(this.torsoMesh);

        // 2. Head (Ginger hair & skin)
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.50, 0);

        const headGeo = new THREE.BoxGeometry(0.36, 0.36, 0.36);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xfcd34d });
        const headMesh = new THREE.Mesh(headGeo, headMat);
        headGroup.add(headMesh);

        // Hair
        const hairGeo = new THREE.BoxGeometry(0.38, 0.14, 0.38);
        const hairMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
        const hairMesh = new THREE.Mesh(hairGeo, hairMat);
        hairMesh.position.set(0, 0.13, 0);
        headGroup.add(hairMesh);

        this.torsoMesh.add(headGroup);

        // 3. Arms (skin + sleeve)
        const armGeo = new THREE.BoxGeometry(0.14, 0.62, 0.14);
        const armMat = new THREE.MeshLambertMaterial({ color: 0xfcd34d });

        this.leftArm = new THREE.Mesh(armGeo, armMat);
        this.leftArm.position.set(-0.29, 0, 0);
        this.torsoMesh.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeo, armMat);
        this.rightArm.position.set(0.29, 0, 0);
        this.torsoMesh.add(this.rightArm);

        // 4. Legs (brown pants)
        const legGeo = new THREE.BoxGeometry(0.18, 0.72, 0.18);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x78350f });

        this.leftLeg = new THREE.Mesh(legGeo, legMat);
        this.leftLeg.position.set(-0.11, 0.36, 0);
        this.group.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeo, legMat);
        this.rightLeg.position.set(0.11, 0.36, 0);
        this.group.add(this.rightLeg);

        // 5. Name tag badge floating above head
        this.nameTag = this.createNameTagSprite('🎮 Gracz 2 🟢');
        this.group.add(this.nameTag);

        this.group.visible = false;
        this.scene.add(this.group);
    }

    initControls() {
        const onKeyDown = (e) => {
            // Check if any Player 2 keys are pressed to awaken Player 2!
            const isP2Key = [
                'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                'Numpad0', 'ShiftRight', 'Enter', 'NumpadEnter',
                'ControlRight', 'KeyK', 'KeyL', 'Digit2', 'Numpad1'
            ].includes(e.code);

            if (isP2Key && !this.isActive) {
                this.activate();
            }

            if (!this.isActive) return;

            switch (e.code) {
                case 'ArrowUp':
                    this.keys.forward = true;
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    this.keys.backward = true;
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                    this.keys.turnLeft = true;
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    this.keys.turnRight = true;
                    e.preventDefault();
                    break;
                case 'ShiftRight':
                case 'Numpad0':
                    this.keys.jump = true;
                    e.preventDefault();
                    break;
                case 'Enter':
                case 'NumpadEnter':
                case 'ControlRight':
                case 'KeyK':
                    this.performAttack();
                    e.preventDefault();
                    break;
                case 'KeyL':
                case 'Numpad1':
                    this.performInteract();
                    e.preventDefault();
                    break;
            }
        };

        const onKeyUp = (e) => {
            if (!this.isActive) return;
            switch (e.code) {
                case 'ArrowUp': this.keys.forward = false; break;
                case 'ArrowDown': this.keys.backward = false; break;
                case 'ArrowLeft': this.keys.turnLeft = false; break;
                case 'ArrowRight': this.keys.turnRight = false; break;
                case 'ShiftRight':
                case 'Numpad0': this.keys.jump = false; break;
            }
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
    }

    activate() {
        this.isActive = true;
        this.group.visible = true;

        // Spawn right next to Player 1
        if (this.player1 && this.player1.position) {
            this.position.set(
                this.player1.position.x + 1.5,
                this.player1.position.y,
                this.player1.position.z + 1.0
            );
            this.rotationY = this.player1.rotationY || 0;
        }

        this.snapToGround();
        this.group.position.copy(this.position);

        const msg = '🎮 Gracz 2 dołączył do gry! (Strzałki: Ruch, Prawy Shift/0: Skok, Enter: Atak ⚔️, L: Interakcja)';
        eventBus.emit('ui:popup', msg);
        console.log('[SecondPlayer] Gracz 2 pomyślnie aktywowany!');
    }

    getGroundHeight(x, z) {
        const bx = Math.floor(x);
        const bz = Math.floor(z);
        for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
            if (this.world.getBlock(bx, y, bz) === 5) continue; // Skip tree leaves
            if (this.world.isSolid(bx, y, bz)) {
                return y + 1;
            }
        }
        return 10;
    }

    snapToGround() {
        this.position.y = this.getGroundHeight(this.position.x, this.position.z);
        this.velocity.set(0, 0, 0);
    }

    checkVoxelCollision(box) {
        const minBx = Math.floor(box.minX);
        const maxBx = Math.floor(box.maxX - 0.0001);
        const minBy = Math.floor(box.minY);
        const maxBy = Math.floor(box.maxY - 0.0001);
        const minBz = Math.floor(box.minZ);
        const maxBz = Math.floor(box.maxZ - 0.0001);

        for (let x = minBx; x <= maxBx; x++) {
            for (let y = minBy; y <= maxBy; y++) {
                for (let z = minBz; z <= maxBz; z++) {
                    if (this.world.isSolid(x, y, z)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    performAttack() {
        if (this.attackCooldown > 0) return;
        this.attackCooldown = 0.35;
        this.attackSwingTime = 0.25;
        playHitSound();

        // Check hits against hostile mobs around Player 2
        let hitSomething = false;
        if (this.scene) {
            // Find nearby mobs through global game/animals if available
            const animals = window.game?.animals?.animals || [];
            for (const mob of animals) {
                if (!mob || mob.isDead) continue;
                if (['zombie', 'skeleton', 'creeper', 'dirtik'].includes(mob.type)) {
                    const dist = this.position.distanceTo(mob.position);
                    if (dist <= 2.8) {
                        mob.onAttacked(4.5, this.position);
                        hitSomething = true;
                    }
                }
            }
        }

        if (hitSomething) {
            eventBus.emit('ui:popup', '⚔️ Gracz 2 trafił potwora (+4.5 DMG)!');
        }
    }

    performInteract() {
        // Interakcja ze zwierzętami (np. ujeżdżanie misia)
        const animals = window.game?.animals?.animals || [];
        for (const mob of animals) {
            if (!mob || mob.isDead) continue;
            const dist = this.position.distanceTo(mob.position);
            if (dist <= 3.2 && mob.type === 'bear') {
                if (mob.variant === 'polar') {
                    eventBus.emit('ui:popup', '🐻‍❄️ Biały Niedźwiedź Polarny jest zbyt dziki dla Gracza 2!');
                } else {
                    mob.spawnHeartParticles?.(0.9);
                    eventBus.emit('ui:popup', `🐻 Gracz 2 pogłaskał ${mob.variantName}! ❤️`);
                }
                return;
            }
        }
    }

    update(dt) {
        if (!this.isActive) return;

        dt = Math.min(dt, 0.05);

        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        if (this.attackSwingTime > 0) this.attackSwingTime -= dt;

        // Rotation via ArrowLeft / ArrowRight
        if (this.keys.turnLeft) {
            this.rotationY += 3.2 * dt;
        }
        if (this.keys.turnRight) {
            this.rotationY -= 3.2 * dt;
        }

        // Direction vectors
        const fwdX = -Math.sin(this.rotationY);
        const fwdZ = -Math.cos(this.rotationY);
        const rightX = Math.cos(this.rotationY);
        const rightZ = -Math.sin(this.rotationY);

        let moveZ = 0;
        if (this.keys.forward) moveZ += 1;
        if (this.keys.backward) moveZ -= 1;

        const isMoving = moveZ !== 0;

        // Check water
        const feetY = Math.floor(this.position.y + 0.1);
        const px = Math.floor(this.position.x);
        const pz = Math.floor(this.position.z);
        const inWater = (this.world.getBlock(px, feetY, pz) === 10);
        this.isInWater = inWater;

        const speed = (inWater ? this.walkSpeed * 0.65 : this.walkSpeed);
        const targetVelX = fwdX * moveZ * speed;
        const targetVelZ = fwdZ * moveZ * speed;

        const accel = inWater ? 12 : (this.onGround ? 16 : 10);
        this.velocity.x += (targetVelX - this.velocity.x) * accel * dt;
        this.velocity.z += (targetVelZ - this.velocity.z) * accel * dt;

        // Vertical movement
        if (inWater) {
            this.onGround = false;
            if (this.keys.jump) {
                this.velocity.y = 3.6;
            } else {
                this.velocity.y = Math.max(-2.5, this.velocity.y - 8.0 * dt);
            }
        } else {
            if (this.keys.jump && this.onGround) {
                this.velocity.y = this.jumpForce;
                this.onGround = false;
            }
            this.velocity.y -= this.gravity * dt;
            this.velocity.y = Math.max(this.velocity.y, -35);
        }

        const halfW = this.width / 2;

        // 1. Move Y
        let newY = this.position.y + this.velocity.y * dt;
        let testBoxY = {
            minX: this.position.x - halfW, maxX: this.position.x + halfW,
            minY: newY, maxY: newY + this.height,
            minZ: this.position.z - halfW, maxZ: this.position.z + halfW
        };

        if (this.checkVoxelCollision(testBoxY)) {
            if (this.velocity.y < 0) {
                this.position.y = Math.floor(newY + 1.0);
                this.onGround = true;
            }
            this.velocity.y = 0;
        } else {
            this.position.y = newY;
            this.onGround = false;
        }

        // 2. Move X
        let newX = this.position.x + this.velocity.x * dt;
        let testBoxX = {
            minX: newX - halfW, maxX: newX + halfW,
            minY: this.position.y, maxY: this.position.y + this.height,
            minZ: this.position.z - halfW, maxZ: this.position.z + halfW
        };
        if (!this.checkVoxelCollision(testBoxX)) {
            this.position.x = newX;
        } else {
            this.velocity.x = 0;
        }

        // 3. Move Z
        let newZ = this.position.z + this.velocity.z * dt;
        let testBoxZ = {
            minX: this.position.x - halfW, maxX: this.position.x + halfW,
            minY: this.position.y, maxY: this.position.y + this.height,
            minZ: newZ - halfW, maxZ: newZ + halfW
        };
        if (!this.checkVoxelCollision(testBoxZ)) {
            this.position.z = newZ;
        } else {
            this.velocity.z = 0;
        }

        // Tether / Keep together: If Player 2 gets too far (>25m), teleport closer
        if (this.player1 && this.player1.position) {
            const dist = this.position.distanceTo(this.player1.position);
            if (dist > 30.0) {
                this.position.set(
                    this.player1.position.x + 1.5,
                    this.player1.position.y,
                    this.player1.position.z + 1.0
                );
                this.snapToGround();
                eventBus.emit('ui:popup', '✨ Gracz 2 dołączył blisko Gracza 1!');
            }
        }

        // Sync 3D mesh
        this.group.position.copy(this.position);
        this.group.rotation.y = this.rotationY;

        // Walk & Attack animations
        if (isMoving) {
            this.walkCycle += dt * 8.0;
            const swing = Math.sin(this.walkCycle) * 0.55;
            this.leftLeg.rotation.x = swing;
            this.rightLeg.rotation.x = -swing;
            this.leftArm.rotation.x = -swing;
            if (this.attackSwingTime <= 0) {
                this.rightArm.rotation.x = swing;
            }
        } else {
            this.leftLeg.rotation.x = 0;
            this.rightLeg.rotation.x = 0;
            this.leftArm.rotation.x = 0;
            if (this.attackSwingTime <= 0) {
                this.rightArm.rotation.x = 0;
            }
        }

        if (this.attackSwingTime > 0) {
            this.rightArm.rotation.x = -Math.PI / 2.2 + Math.sin(this.attackSwingTime * 15) * 0.4;
        }
    }
}
