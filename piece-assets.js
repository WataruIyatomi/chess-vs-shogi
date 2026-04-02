/* ============================================================
   Piece Assets
   Chess: lichess cburnett SVGs (local files)
   Shogi: lishogi-style kanji koma - faithful reproduction of
          lishogi.org's default "Ryoko 1-Kanji" piece set
   ============================================================ */

const PieceAssets = {
    chessImages: {
        king: 'pieces/chess/wK.svg',
        queen: 'pieces/chess/wQ.svg',
        rook: 'pieces/chess/wR.svg',
        bishop: 'pieces/chess/wB.svg',
        knight: 'pieces/chess/wN.svg',
        pawn: 'pieces/chess/wP.svg',
    },

    shogiSVGs: {},

    init() {
        this.generateShogiSVGs();
    },

    /**
     * Generate lishogi-style shogi piece SVGs.
     * Faithful reproduction of the kanji piece set used on lishogi.org:
     * - Traditional pentagonal koma shape
     * - Warm wood-grain gradient fill
     * - Clean dark outline
     * - Bold kanji (black for normal, red for promoted)
     */
    generateShogiSVGs() {
        const pieces = {
            fu:         { kanji: '歩', promoted: false },
            kyosha:     { kanji: '香', promoted: false },
            keima:      { kanji: '桂', promoted: false },
            gin:        { kanji: '銀', promoted: false },
            kin:        { kanji: '金', promoted: false },
            hisha:      { kanji: '飛', promoted: false },
            kaku:       { kanji: '角', promoted: false },
            gyoku:      { kanji: '玉', promoted: false },
            tokin:      { kanji: 'と', promoted: true },
            narikyosha: { kanji: '杏', promoted: true },
            narikeima:  { kanji: '圭', promoted: true },
            narigin:    { kanji: '全', promoted: true },
            ryuu:       { kanji: '龍', promoted: true },
            uma:        { kanji: '馬', promoted: true },
        };

        for (const [type, info] of Object.entries(pieces)) {
            this.shogiSVGs[type] = this.createKomaSVG(info.kanji, info.promoted);
        }
    },

    /**
     * Create a lishogi-style koma SVG.
     * The shape closely matches lishogi's default kanji piece set:
     * pentagonal koma with pointed top, wide shoulders, flat base.
     */
    createKomaSVG(kanji, isPromoted) {
        const textColor = isPromoted ? '#b51c1c' : '#27201a';
        // Use a slightly larger font for single-char kanji
        const fontSize = kanji === 'と' ? '42' : '40';
        // Vertical position tweak for と character
        const textY = kanji === 'と' ? '68' : '66';

        return `data:image/svg+xml,${encodeURIComponent(
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86 100">
  <defs>
    <linearGradient id="koma" x1="0" y1="0" x2=".7" y2="1">
      <stop offset="0%" stop-color="#EDD291"/>
      <stop offset="30%" stop-color="#E5C47A"/>
      <stop offset="60%" stop-color="#DCBA6C"/>
      <stop offset="100%" stop-color="#D0A855"/>
    </linearGradient>
    <linearGradient id="highlight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,230,0.25)"/>
      <stop offset="100%" stop-color="rgba(255,255,230,0)"/>
    </linearGradient>
    <filter id="s" x="-4%" y="-4%" width="110%" height="110%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.15"/>
    </filter>
  </defs>
  <g filter="url(#s)">
    <path d="M43,5 L77,22 L73,95 L13,95 L9,22 Z"
      fill="url(#koma)" stroke="#7a6432" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M43,8 L74,24 L71,92 L15,92 L12,24 Z"
      fill="url(#highlight)" stroke="none"/>
  </g>
  <text x="43" y="${textY}" text-anchor="middle" dominant-baseline="middle"
    font-family="'Hiragino Mincho Pro','Yu Mincho','Noto Serif JP','MS Mincho',serif"
    font-size="${fontSize}" font-weight="bold" fill="${textColor}"
    stroke="${textColor}" stroke-width="0.3">${kanji}</text>
</svg>`)}`;
    },

    createChessPieceImg(type) {
        const img = document.createElement('img');
        img.src = this.chessImages[type];
        img.alt = type;
        img.className = 'piece-img chess-piece-img';
        img.draggable = false;
        return img;
    },

    createShogiPieceImg(type) {
        const img = document.createElement('img');
        img.src = this.shogiSVGs[type];
        img.alt = type;
        img.className = 'piece-img shogi-piece-img';
        img.draggable = false;
        return img;
    },

    createShogiHandPieceImg(type) {
        const img = document.createElement('img');
        img.src = this.shogiSVGs[type];
        img.alt = type;
        img.className = 'piece-img shogi-hand-img';
        img.draggable = false;
        return img;
    }
};

PieceAssets.init();
