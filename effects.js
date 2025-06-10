// グローバル THREE を使用（sub.html の CDN から読み込み済み）
const THREE = window.THREE;
const { EffectComposer, RenderPass, ShaderPass, UnrealBloomPass } = THREE;

// 汎用パーティクルエフェクトクラス（ドラクエ8風）
class ParticleEffect {
    constructor(battleScreen, targetRect, color, count = 120, lifetime = 45, size = 0.5, gravity = 0, swirl = 0, bloomStrength = 0.8, spellType = 0) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, battleScreen[0].offsetWidth / battleScreen[0].offsetHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(battleScreen[0].offsetWidth, battleScreen[0].offsetHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '1000';
        battleScreen[0].appendChild(this.renderer.domElement);

        // ポストプロセッシング
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.flashPass = new ShaderPass({
            uniforms: {
                tDiffuse: { value: null },
                time: { value: 0 },
                flashColor: { value: new THREE.Vector3(color.r, color.g, color.b) },
                flashIntensity: { value: 0.9 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float time;
                uniform vec3 flashColor;
                uniform float flashIntensity;
                varying vec2 vUv;
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    float flash = pow(1.0 - smoothstep(0.1, 0.4, time), 2.5) * flashIntensity; // DQ8風の鋭いピーク
                    gl_FragColor = color + vec4(flashColor * flash, 0.75);
                }
            `
        });
        this.composer.addPass(this.flashPass);
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(battleScreen[0].offsetWidth, battleScreen[0].offsetHeight),
            bloomStrength,
            0.5, // 強めの拡散
            0.7 // 閾値を下げて輝きを強調
        );
        this.composer.addPass(this.bloomPass);

        // パーティクル
        this.particleCount = Math.min(count, window.innerWidth < 768 ? 80 : 150); // モバイル最適化
        if (spellType === 4) this.particleCount = Math.min(count, window.innerWidth < 768 ? 120 : 250); // ギガデインは高密度
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const velocities = new Float32Array(this.particleCount * 3);
        const scales = new Float32Array(this.particleCount);
        const lifetimes = new Float32Array(this.particleCount);
        for (let i = 0; i < this.particleCount * 3; i += 3) {
            const angle = Math.random() * Math.PI * 2;
            const radius = spellType === 6 ? Math.random() * 2.2 : Math.random() * 1.8; // バギは広範囲
            const z = (Math.random() - 0.5) * (spellType === 7 ? 0.5 : 1.2); // ヒャドはZ軸を抑える
            positions[i] = Math.cos(angle) * radius;
            positions[i + 1] = Math.sin(angle) * radius;
            positions[i + 2] = z;
            velocities[i] = Math.cos(angle) * (spellType === 5 ? 0.7 : spellType === 4 ? 0.8 : 0.4) * (0.8 + Math.random());
            velocities[i + 1] = Math.sin(angle) * (spellType === 5 ? 0.7 : spellType === 4 ? 0.8 : 0.4) * (0.8 + Math.random());
            velocities[i + 2] = spellType === 2 ? 0.35 : (Math.random() - 0.5) * 0.25; // ホイミは上昇
            scales[i / 3] = size * (0.8 + Math.random() * (spellType === 1 ? 1.6 : 1.0)); // メラは大きめ
            lifetimes[i / 3] = 1.0;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
        geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

        // DQ8風シェーダー（呪文ごとの質感）
        const material = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(color) },
                time: { value: 0 },
                spellType: { value: spellType } // 0: generic, 1: mera, 2: hoimi, 3: sukara, 4: gigadein, 5: gira, 6: bagi, 7: hyado, 8: remuomu, 9: rura
            },
            vertexShader: `
                attribute float scale;
                attribute float lifetime;
                varying float vLifetime;
                void main() {
                    vLifetime = lifetime;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = scale * (400.0 / -mvPosition.z) * (0.6 + lifetime * 0.4);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float time;
                uniform int spellType;
                varying float vLifetime;
                void main() {
                    float alpha = vLifetime * pow(1.0 - smoothstep(0.2, 0.8, time), 1.5); // DQ8風の急激な減衰
                    vec2 uv = gl_PointCoord - vec2(0.5);
                    float dist = length(uv);
                    float glow = exp(-dist * (spellType == 7 ? 8.0 : spellType == 4 ? 6.0 : 5.0)) * alpha; // ヒャドとギガデインは鋭い輝き
                    gl_FragColor = vec4(color, glow * (spellType == 1 ? 1.3 : 1.0)); // メラは強め
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);

        // テールエフェクト（DQ8の軌跡強化）
        this.trailGeometry = new THREE.BufferGeometry();
        const trailPositions = new Float32Array(this.particleCount * 6);
        for (let i = 0; i < this.particleCount * 6; i += 6) {
            trailPositions[i] = positions[i / 2];
            trailPositions[i + 1] = positions[i / 2 + 1];
            trailPositions[i + 2] = positions[i / 2 + 2];
            trailPositions[i + 3] = positions[i / 2];
            trailPositions[i + 4] = positions[i / 2 + 1];
            trailPositions[i + 5] = positions[i / 2 + 2];
        }
        this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        const trailMaterial = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: spellType === 2 ? 0.3 : 0.6 // ホイミは柔らかい軌跡
        });
        this.trail = new THREE.LineSegments(this.trailGeometry, trailMaterial);
        this.scene.add(this.trail);

        // 呪文固有の追加オブジェクト
        if (spellType === 1) { // メラ
            const flameCore = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 20, 20), // 大きめの炎
                new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.85 })
            );
            this.scene.add(flameCore);
        } else if (spellType === 7) { // ヒャド
            for (let i = 0; i < 3; i++) { // 複数結晶
                const iceCrystal = new THREE.Mesh(
                    new THREE.TetrahedronGeometry(0.25 + Math.random() * 0.1, 1),
                    new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.7 })
                );
                iceCrystal.position.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
                this.scene.add(iceCrystal);
            }
        }

        // カメラ位置（DQ8の奥行き感）
        const centerX = targetRect.left + targetRect.width / 2 - battleScreen[0].getBoundingClientRect().left;
        const centerY = targetRect.top + targetRect.height / 2 - battleScreen[0].getBoundingClientRect().top;
        this.camera.position.set(centerX / 100, -centerY / 100 + (spellType === 2 ? 2.0 : 1.5), 5.0);
        this.camera.lookAt(new THREE.Vector3(centerX / 100, -centerY / 100, 0));

        this.velocities = velocities;
        this.lifetimes = lifetimes;
        this.lifetime = lifetime;
        this.gravity = gravity;
        this.swirl = swirl;
        this.time = 0;
        this.spellType = spellType;
    }

    animate() {
        if (this.lifetime <= 0) {
            this.renderer.domElement.remove();
            return false;
        }
        this.time += 0.05;
        this.flashPass.uniforms.time.value = this.time;
        this.particles.material.uniforms.time.value = this.time;
        if (this.spellType === 4) { // ギガデイン
            this.bloomPass.strength = 1.0 + Math.sin(this.time * 12.0) * 0.4; // 火花の脈動
        }

        const positions = this.particles.geometry.attributes.position.array;
        const trailPositions = this.trailGeometry.attributes.position.array;
        for (let i = 0; i < this.particleCount * 3; i += 3) {
            const idx = i / 3;
            positions[i] += this.velocities[i];
            positions[i + 1] += this.velocities[i + 1];
            positions[i + 2] += this.velocities[i + 2];
            if (this.spellType === 6) { // バギ
                this.velocities[i] += Math.cos(this.time + idx) * this.swirl * 1.3; // 強い渦巻き
                this.velocities[i + 1] += Math.sin(this.time + idx) * this.swirl * 1.3;
            } else {
                this.velocities[i] += Math.cos(this.time + idx) * this.swirl * 0.6;
                this.velocities[i + 1] += Math.sin(this.time + idx) * this.swirl * 0.6;
            }
            this.velocities[i + 1] -= this.gravity;
            this.lifetimes[idx] -= 0.025;
            if (this.lifetimes[idx] < 0) this.lifetimes[idx] = 0;

            trailPositions[i * 2] = positions[i];
            trailPositions[i * 2 + 1] = positions[i + 1];
            trailPositions[i * 2 + 2] = positions[i + 2];
            trailPositions[i * 2 + 3] = positions[i] - this.velocities[i] * 0.15;
            trailPositions[i * 2 + 4] = positions[i + 1] - this.velocities[i + 1] * 0.15;
            trailPositions[i * 2 + 5] = positions[i + 2] - this.velocities[i + 2] * 0.15;
        }
        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.geometry.attributes.lifetime.needsUpdate = true;
        this.trailGeometry.attributes.position.needsUpdate = true;

        // DQ8風カメラワーク
        this.camera.position.z -= this.time * (this.spellType === 4 ? 0.06 : 0.03); // ギガデインは強めのズーム
        this.camera.rotation.z += Math.sin(this.time * 2.0) * (this.spellType === 1 ? 0.015 : 0.008);
        this.composer.render();
        this.lifetime--;
        return true;
    }
}

// ギガデインの稲妻エフェクト（DQ8風）
class LightningEffect {
    constructor(battleScreen) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, battleScreen[0].offsetWidth / battleScreen[0].offsetHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(battleScreen[0].offsetWidth, battleScreen[0].offsetHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '1001';
        battleScreen[0].appendChild(this.renderer.domElement);

        // ポストプロセッシング
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.flashPass = new ShaderPass({
            uniforms: {
                tDiffuse: { value: null },
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float time;
                varying vec2 vUv;
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    float flash = pow(1.0 - smoothstep(0.05, 0.2, time), 4.0) * 1.5; // DQ8の鋭い閃光
                    gl_FragColor = color + vec4(flash * 0.7, flash * 0.9, flash, 0.95);
                }
            `
        });
        this.composer.addPass(this.flashPass);
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(battleScreen[0].offsetWidth, battleScreen[0].offsetHeight),
            1.2, // 強めのブルーム
            0.5,
            0.65
        );
        this.composer.addPass(this.bloomPass);

        // 稲妻ライン（DQ8の分岐感強化）
        this.lightnings = [];
        for (let j = 0; j < 12; j++) { // 本数増加
            const points = [];
            for (let i = 0; i < 30; i++) { // 頂点数増加
                points.push(new THREE.Vector3(
                    (Math.random() - 0.5) * 12 + (j - 6) * 1.5,
                    12 - i * 0.5,
                    (Math.random() - 0.5) * 3.5
                ));
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: 0x00ccff, linewidth: 6 + Math.random() * 4 });
            const lightning = new THREE.Line(geometry, material);
            this.scene.add(lightning);
            this.lightnings.push(lightning);
        }

        this.camera.position.z = 6.5;
        this.lifetime = 20; // 短めでインパクト重視
        this.time = 0;
    }

    animate() {
        if (this.lifetime <= 0) {
            this.renderer.domElement.remove();
            return false;
        }
        this.time += 0.1;
        this.flashPass.uniforms.time.value = this.time;
        this.bloomPass.strength = 1.2 + Math.sin(this.time * 10.0) * 0.3; // ブルームの脈動
        this.lightnings.forEach(lightning => {
            const positions = lightning.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += (Math.random() - 0.5) * 0.5; // 激しい揺れ
                positions[i + 2] += (Math.random() - 0.5) * 0.4;
            }
            lightning.geometry.attributes.position.needsUpdate = true;
        });
        this.camera.rotation.z += Math.sin(this.time * 4.0) * 0.025; // 強い揺れ
        this.camera.position.z -= 0.07; // 急速なズームイン
        this.composer.render();
        this.lifetime--;
        return true;
    }
}

// スカラのバリアエフェクト（DQ8風）
class BarrierEffect {
    constructor(battleScreen, targetRect) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, battleScreen[0].offsetWidth / battleScreen[0].offsetHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(battleScreen[0].offsetWidth, battleScreen[0].offsetHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '1000';
        battleScreen[0].appendChild(this.renderer.domElement);

        // ポストプロセッシング
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.flashPass = new ShaderPass({
            uniforms: {
                tDiffuse: { value: null },
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float time;
                varying vec2 vUv;
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    float flash = pow(1.0 - smoothstep(0.1, 0.5, time), 2.0) * 0.7; // DQ8の柔らかいフラッシュ
                    gl_FragColor = color + vec4(0.0, flash * 0.7, flash, 0.75);
                }
            `
        });
        this.composer.addPass(this.flashPass);
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(battleScreen[0].offsetWidth, battleScreen[0].offsetHeight),
            0.9,
            0.5,
            0.7
        );
        this.composer.addPass(this.bloomPass);

        // バリア（DQ8の大型シールド）
        this.barrier = new THREE.Mesh(
            new THREE.SphereGeometry(1.3, 32, 32), // 大きめに
            new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    varying vec3 vNormal;
                    void main() {
                        vUv = uv;
                        vNormal = normal;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    varying vec2 vUv;
                    varying vec3 vNormal;
                    void main() {
                        float glow = sin(time * 5.0) * 0.5 + 0.7; // 脈動感
                        float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.5); // 強いフレネル
                        vec3 color = vec3(0.0, 0.6, 1.0);
                        gl_FragColor = vec4(color, glow * fresnel * 0.95);
                    }
                `,
                transparent: true,
                side: THREE.BackSide
            })
        );
        this.scene.add(this.barrier);

        // 位置
        const centerX = targetRect.left + targetRect.width / 2 - battleScreen[0].getBoundingClientRect().left;
        const centerY = targetRect.top + targetRect.height / 2 - battleScreen[0].getBoundingClientRect().top;
        this.camera.position.set(centerX / 100, -centerY / 100 + 1.5, 5.0);
        this.camera.lookAt(new THREE.Vector3(centerX / 100, -centerY / 100, 0));

        this.lifetime = 40;
        this.time = 0;
    }

    animate() {
        if (this.lifetime <= 0) {
            this.renderer.domElement.remove();
            return false;
        }
        this.time += 0.1;
        this.flashPass.uniforms.time.value = this.time;
        this.barrier.material.uniforms.time.value = this.time;
        this.barrier.rotation.y += 0.12; // 高速回転
        this.barrier.rotation.x += 0.09;
        this.camera.rotation.z += Math.sin(this.time * 2.0) * 0.012; // 揺れ強化
        this.composer.render();
        this.lifetime--;
        return true;
    }
}

// クイズ用エフェクトマッピング
export function playSpellEffect(spell, effectLayer, battleScreen) {
    console.log(`Playing effect for spell: ${spell}`);

    const monsterSprite = document.querySelector('#monster-sprite');
    const monsterRect = monsterSprite?.getBoundingClientRect() || {
        left: battleScreen[0].offsetWidth / 2 - 75,
        top: battleScreen[0].offsetHeight / 4 - 75,
        width: 150,
        height: 150
    };
    const playerRect = {
        left: battleScreen[0].offsetWidth / 2 - 75,
        top: battleScreen[0].offsetHeight - 200,
        width: 150,
        height: 150
    };

    let selectedSpell = spell;
    if (spell === 'correct' || spell === 'incorrect') {
        const isCorrect = spell === 'correct';
        const spellMap = {
            correct: ['ホイミ', 'スカラ', 'ルーラ'],
            incorrect: [
                { spell: 'メラ', weight: 0.5 },
                { spell: 'ギガデイン', weight: 0.2 },
                { spell: 'ヒャド', weight: 0.15 },
                { spell: 'バギ', weight: 0.1 },
                { spell: 'ギラ', weight: 0.03 },
                { spell: 'レムオム', weight: 0.02 }
            ]
        };
        if (isCorrect) {
            selectedSpell = spellMap.correct[Math.floor(Math.random() * spellMap.correct.length)];
        } else {
            let rand = Math.random(), sum = 0;
            selectedSpell = spellMap.incorrect.find(s => {
                sum += s.weight;
                return rand <= sum;
            }).spell;
        }
    }

    try {
        switch (selectedSpell) {
            case 'メラ':
                const meraEffect = new ParticleEffect(battleScreen, monsterRect, new THREE.Color(0xff4500), 160, 40, 0.6, -0.01, 0.06, 1.0, 1);
                meraEffect.flashPass.uniforms.flashColor.value.set(1.0, 0.6, 0.4);
                setTimeout(() => {
                    meraEffect.flashPass.uniforms.flashIntensity.value = 1.3; // DQ8の強烈なピーク
                    meraEffect.bloomPass.strength = 1.2; // ブルーム強化
                }, 200);
                function animateMera() {
                    if (meraEffect.animate()) {
                        requestAnimationFrame(animateMera);
                    }
                }
                animateMera();
                break;

            case 'ホイミ':
                const hoimiEffect = new ParticleEffect(battleScreen, playerRect, new THREE.Color(0x00ff00), 100, 50, 0.4, -0.04, 0.02, 0.7, 2);
                hoimiEffect.flashPass.uniforms.flashColor.value.set(0.6, 1.0, 0.6);
                function animateHoimi() {
                    if (hoimiEffect.animate()) {
                        requestAnimationFrame(animateHoimi);
                    }
                }
                animateHoimi();
                break;

            case 'スカラ':
                const sukaraEffect = new ParticleEffect(battleScreen, playerRect, new THREE.Color(0x00b7eb), 90, 40, 0.3, 0, 0.04, 0.8, 3);
                sukaraEffect.flashPass.uniforms.flashColor.value.set(0.4, 0.7, 1.0);
                const barrierEffect = new BarrierEffect(battleScreen, playerRect);
                function animateSukara() {
                    const particleContinue = sukaraEffect.animate();
                    const barrierContinue = barrierEffect.animate();
                    if (particleContinue || barrierContinue) {
                        requestAnimationFrame(animateSukara);
                    }
                }
                animateSukara();
                break;

            case 'ギガデイン':
                const lightningEffect = new LightningEffect(battleScreen);
                const sparkEffect = new ParticleEffect(battleScreen, monsterRect, new THREE.Color(0xffff00), 250, 20, 0.6, 0.02, 0, 1.2, 4);
                sparkEffect.flashPass.uniforms.flashColor.value.set(0.7, 0.9, 1.0);
                setTimeout(() => {
                    sparkEffect.flashPass.uniforms.flashIntensity.value = 1.5; // 強烈なピーク
                    lightningEffect.bloomPass.strength = 1.5; // ブルーム強化
                }, 100);
                function animateGigaDein() {
                    const lightningContinue = lightningEffect.animate();
                    const sparkContinue = sparkEffect.animate();
                    if (lightningContinue || sparkContinue) {
                        requestAnimationFrame(animateGigaDein);
                    }
                }
                animateGigaDein();
                break;

            case 'ギラ':
                const giraEffect = new ParticleEffect(battleScreen, monsterRect, new THREE.Color(0xff8c00), 140, 38, 0.5, 0, 0.05, 0.9, 5);
                giraEffect.flashPass.uniforms.flashColor.value.set(1.0, 0.7, 0.4);
                const linePoints = [
                    new THREE.Vector3(-4.5, 0, 0),
                    new THREE.Vector3(4.5, 0, 0)
                ];
                const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
                const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff8c00, linewidth: 8 });
                const flameLine = new THREE.Line(lineGeometry, lineMaterial);
                giraEffect.scene.add(flameLine);
                function animateGira() {
                    if (giraEffect.animate()) {
                        requestAnimationFrame(animateGira);
                    }
                }
                animateGira();
                break;

            case 'バギ':
                const bagiEffect = new ParticleEffect(battleScreen, monsterRect, new THREE.Color(0x00ff7f), 150, 40, 0.4, 0, 0.08, 0.9, 6);
                bagiEffect.flashPass.uniforms.flashColor.value.set(0.6, 1.0, 0.7);
                function animateBagi() {
                    if (bagiEffect.animate()) {
                        requestAnimationFrame(animateBagi);
                    }
                }
                animateBagi();
                break;

            case 'ヒャド':
                const hyadoEffect = new ParticleEffect(battleScreen, monsterRect, new THREE.Color(0x00b7eb), 130, 45, 0.4, 0.04, 0.03, 0.9, 7);
                hyadoEffect.flashPass.uniforms.flashColor.value.set(0.4, 0.7, 1.0);
                function animateHyado() {
                    if (hyadoEffect.animate()) {
                        requestAnimationFrame(animateHyado);
                    }
                }
                animateHyado();
                break;

            case 'レムオム':
                const remuomuEffect = new ParticleEffect(battleScreen, monsterRect, new THREE.Color(0x800080), 100, 50, 0.3, -0.03, 0.04, 0.7, 8);
                remuomuEffect.flashPass.uniforms.flashColor.value.set(0.8, 0.6, 1.0);
                function animateRemuomu() {
                    if (remuomuEffect.animate()) {
                        requestAnimationFrame(animateRemuomu);
                    }
                }
                animateRemuomu();
                break;

            case 'ルーラ':
                const ruraEffect = new ParticleEffect(battleScreen, playerRect, new THREE.Color(0x00ced1), 200, 55, 0.5, -0.05, 0.09, 1.0, 9);
                ruraEffect.flashPass.uniforms.flashColor.value.set(0.7, 1.0, 1.0);
                function animateRura() {
                    if (ruraEffect.animate()) {
                        requestAnimationFrame(animateRura);
                    }
                }
                animateRura();
                const fadeScene = new THREE.Scene();
                const fadeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
                const fadeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
                fadeRenderer.setSize(battleScreen[0].offsetWidth, battleScreen[0].offsetHeight);
                fadeRenderer.domElement.style.position = 'absolute';
                fadeRenderer.domElement.style.top = '0';
                fadeRenderer.domElement.style.left = '0';
                fadeRenderer.domElement.style.zIndex = '1002';
                battleScreen[0].appendChild(fadeRenderer.domElement);
                const fadeComposer = new EffectComposer(fadeRenderer);
                fadeComposer.addPass(new RenderPass(fadeScene, fadeCamera));
                const fadePass = new ShaderPass({
                    uniforms: {
                        tDiffuse: { value: null },
                        time: { value: 0 }
                    },
                    vertexShader: `
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
                    fragmentShader: `
                        uniform float time;
                        varying vec2 vUv;
                        void main() {
                            float fade = pow(smoothstep(0.0, 0.6, time), 2.0) * smoothstep(1.4, 0.7, time); // DQ8の滑らかなフェード
                            gl_FragColor = vec4(1.0, 1.0, 1.0, fade * 0.98);
                        }
                    `
                });
                fadeComposer.addPass(fadePass);
                let fadeTime = 0;
                function animateFade() {
                    if (fadeTime > 1.4) {
                        fadeRenderer.domElement.remove();
                        return;
                    }
                    fadeTime += 0.05;
                    fadePass.uniforms.time.value = fadeTime;
                    fadeComposer.render();
                    requestAnimationFrame(animateFade);
                }
                animateFade();
                break;

            default:
                console.log(`No effect defined for spell: ${selectedSpell}`);
        }
    } catch (e) {
        console.error(`Effect error for spell ${selectedSpell}:`, e);
    }
}