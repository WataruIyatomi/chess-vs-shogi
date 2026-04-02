/* ============================================================
   Sound Manager
   Chess: chess.com default sound effects from CDN
         with synthesized fallback if CDN is unavailable
   Shogi: lishogi sound files from CDN (wooden koma placement)
         with synthesized fallback if CDN is unavailable

   Sound sources:
   - Chess: images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/
   - Shogi: lishogi1.org/assets/sound/mp3/system/shogi/
   ============================================================ */

const SoundManager = {
    ctx: null,
    enabled: true,
    initialized: false,

    // chess.com CDN sound files
    chessSounds: {
        move: null,
        capture: null,
        castle: null,
        promote: null,
        check: null,
        gameEnd: null,
    },

    // Lishogi CDN sound files
    lishogiSounds: {
        move: null,
        capture: null,
    },

    ensureContext() {
        if (this.ctx && this.ctx.state === 'running') return true;
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx.state === 'running';
    },

    init() {
        this.loadChessSounds();
        this.loadLishogiSounds();

        const unlock = () => {
            this.ensureContext();
            if (this.ctx && this.ctx.state === 'running') {
                document.removeEventListener('click', unlock, true);
                document.removeEventListener('keydown', unlock, true);
                this.initialized = true;
            }
        };
        document.addEventListener('click', unlock, true);
        document.addEventListener('keydown', unlock, true);
    },

    /**
     * Load chess.com default sound effects from CDN.
     * These are the authentic piece sounds used on chess.com.
     */
    loadChessSounds() {
        const base = 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default';
        const map = {
            move:    `${base}/move-self.mp3`,
            capture: `${base}/capture.mp3`,
            castle:  `${base}/castle.mp3`,
            promote: `${base}/promote.mp3`,
            check:   `${base}/move-check.mp3`,
            gameEnd: `${base}/game-end.mp3`,
        };

        for (const [key, url] of Object.entries(map)) {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.volume = 0.7;
            audio.addEventListener('canplaythrough', () => {
                this.chessSounds[key] = audio;
            }, { once: true });
            audio.addEventListener('error', () => {
                console.warn(`Chess.com sound not loaded: ${key}, using synthesis fallback`);
            }, { once: true });
            audio.src = url;
        }
    },

    /**
     * Load actual lishogi sound files from CDN.
     * These are the authentic wooden koma placement sounds used on lishogi.org.
     */
    loadLishogiSounds() {
        const base = 'https://lishogi1.org/assets/sound/mp3/system/shogi';
        const map = {
            move:    `${base}/move.mp3`,
            capture: `${base}/capture.mp3`,
        };

        for (const [key, url] of Object.entries(map)) {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.volume = 0.7;
            audio.addEventListener('canplaythrough', () => {
                this.lishogiSounds[key] = audio;
            }, { once: true });
            audio.addEventListener('error', () => {
                console.warn(`Lishogi sound not loaded: ${key}, using synthesis fallback`);
            }, { once: true });
            audio.src = url;
        }
    },

    /**
     * Play a preloaded Audio element (clone to allow overlap).
     * Returns true if played, false if not loaded yet.
     */
    _playAudio(audio) {
        if (!audio) return false;
        const clone = audio.cloneNode();
        clone.volume = audio.volume;
        clone.play().catch(() => {});
        return true;
    },

    // ========================================
    // Chess sounds: chess.com CDN with synthesis fallback
    // ========================================

    chessMove() {
        if (this._playAudio(this.chessSounds.move)) return;
        this._chessMovesynth();
    },

    chessCapture() {
        if (this._playAudio(this.chessSounds.capture)) return;
        this._chessCaptureSynth();
    },

    chessCheck() {
        if (this._playAudio(this.chessSounds.check)) return;
        this._chessCheckSynth();
    },

    chessCastle() {
        if (this._playAudio(this.chessSounds.castle)) return;
        this._chessCastleSynth();
    },

    chessPromote() {
        if (this._playAudio(this.chessSounds.promote)) return;
        this._chessPromoteSynth();
    },

    // ========================================
    // Chess synthesis fallbacks
    // ========================================

    _chessMovesynth() {
        if (!this.ensureContext()) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.08);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
    },

    _chessCaptureSynth() {
        if (!this.ensureContext()) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
        this._noiseBurst(0.2, 0.06, t);
    },

    _chessCheckSynth() {
        if (!this.ensureContext()) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.setValueAtTime(1600, t + 0.08);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
    },

    _chessCastleSynth() {
        if (!this.ensureContext()) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;
        [0, 0.1].forEach(offset => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(700, t + offset);
            osc.frequency.exponentialRampToValueAtTime(350, t + offset + 0.08);
            gain.gain.setValueAtTime(0.25, t + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.1);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t + offset);
            osc.stop(t + offset + 0.1);
        });
    },

    _chessPromoteSynth() {
        if (!this.ensureContext()) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(1400, t + 0.2);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
    },

    // ========================================
    // Shogi sounds: lishogi CDN with synthesis fallback
    // ========================================

    /**
     * Shogi move: play lishogi's authentic wooden koma sound.
     * Falls back to synthesis if CDN is unavailable.
     */
    shogiMove() {
        if (this._playAudio(this.lishogiSounds.move)) return;
        this._shogiMoveSynth();
    },

    shogiCapture() {
        if (this._playAudio(this.lishogiSounds.capture)) return;
        this._shogiCaptureSynth();
    },

    shogiCheck() {
        this._playAudio(this.lishogiSounds.capture);

        if (!this.ensureContext()) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Sharp warning tone on top
        [0, 0.12].forEach(offset => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(1000, t + offset);
            gain.gain.setValueAtTime(0.12, t + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.08);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t + offset);
            osc.stop(t + offset + 0.08);
        });
    },

    /**
     * Shogi promote: lishogi move sound + shimmer
     */
    shogiPromote() {
        this._playAudio(this.lishogiSounds.move);

        if (!this.ensureContext()) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
    },

    // ========================================
    // Synthesis fallbacks for shogi sounds
    // ========================================

    _shogiMoveSynth() {
        if (!this.ensureContext()) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Wood resonance
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1800, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);
        oscGain.gain.setValueAtTime(0.4, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(oscGain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.08);

        this._noiseBurst(0.35, 0.03, t);
    },

    _shogiCaptureSynth() {
        if (!this.ensureContext()) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;

        // Deep wood resonance
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2000, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.06);
        oscGain.gain.setValueAtTime(0.5, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(oscGain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);

        this._noiseBurst(0.45, 0.05, t);

        // Low thud
        const osc2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(200, t);
        osc2.frequency.exponentialRampToValueAtTime(80, t + 0.1);
        g2.gain.setValueAtTime(0.3, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc2.connect(g2).connect(ctx.destination);
        osc2.start(t);
        osc2.stop(t + 0.12);
    },

    // ========================================
    // Game end sound: chess.com CDN with synthesis fallback
    // ========================================

    gameEnd() {
        if (this._playAudio(this.chessSounds.gameEnd)) return;
        // Fallback: synthesized chord
        if (!this.ensureContext()) return;
        const ctx = this.ctx;
        const t = ctx.currentTime;
        [523, 659, 784].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t + i * 0.05);
            osc.stop(t + 0.6);
        });
    },

    // ========================================
    // Helpers
    // ========================================

    _noiseBurst(volume, duration, startTime) {
        const ctx = this.ctx;
        const bufferSize = Math.ceil(ctx.sampleRate * duration);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3000, startTime);
        filter.Q.setValueAtTime(1.5, startTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        source.connect(filter).connect(gain).connect(ctx.destination);
        source.start(startTime);
        source.stop(startTime + duration);
    },

    // ========================================
    // Sound dispatch API
    // ========================================

    play(key) {
        if (!this.enabled) return;
        const map = {
            chess_move: () => this.chessMove(),
            chess_capture: () => this.chessCapture(),
            chess_check: () => this.chessCheck(),
            chess_castle: () => this.chessCastle(),
            chess_promote: () => this.chessPromote(),
            chess_end: () => this.gameEnd(),
            shogi_move: () => this.shogiMove(),
            shogi_capture: () => this.shogiCapture(),
            shogi_check: () => this.shogiCheck(),
            shogi_promote: () => this.shogiPromote(),
            shogi_end: () => this.gameEnd(),
        };
        const fn = map[key];
        if (fn) fn();
    },

    playForResult(result, side, game) {
        if (!result) return;
        const p = side;

        if (game.gameOver) { this.play(`${p}_end`); return; }
        if (game.isCurrentSideInCheck()) { this.play(`${p}_check`); return; }
        if (result.special === 'promote' || result.special === 'promotion') { this.play(`${p}_promote`); return; }
        if (result.special === 'castle-king' || result.special === 'castle-queen') { this.play('chess_castle'); return; }
        if (result.special === 'drop') { this.play('shogi_move'); return; }
        if (result.captured) { this.play(`${p}_capture`); return; }
        this.play(`${p}_move`);
    },

    playAfterQueenChoice(game) {
        if (game.gameOver) { this.play('shogi_end'); return; }
        if (game.isCurrentSideInCheck()) { this.play('shogi_check'); return; }
    },

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    },
};
