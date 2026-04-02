/* ============================================================
   Game State Management
   Core game logic: board state, turns, captures, special rules
   ============================================================ */

class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.board = this.createInitialBoard();
        this.currentTurn = 'chess'; // Chess (white) moves first
        this.moveHistory = [];
        this.enPassantTarget = null;
        this.chessCastling = { kingSide: true, queenSide: true };
        this.shogiHand = {}; // e.g. { fu: 2, keima: 1 }
        this.shogiKingAppeared = false;
        this.shogiBackRowMoved = [false, false, false, false, false, false, false, false]; // tracks which back row squares have been vacated
        this.gameOver = false;
        this.gameResult = null;
        this.lastMove = null;
    }

    createInitialBoard() {
        // 8x8 board. Row 0 = rank 8 (top, shogi back row)
        // Row 7 = rank 1 (bottom, chess back row)
        const board = Array.from({ length: 8 }, () => Array(8).fill(null));

        // === Chess pieces (white, bottom) ===
        // Row 7 (rank 1): R N B Q K B N R
        board[7][0] = { side: 'chess', type: 'rook' };
        board[7][1] = { side: 'chess', type: 'knight' };
        board[7][2] = { side: 'chess', type: 'bishop' };
        board[7][3] = { side: 'chess', type: 'queen' };
        board[7][4] = { side: 'chess', type: 'king' };
        board[7][5] = { side: 'chess', type: 'bishop' };
        board[7][6] = { side: 'chess', type: 'knight' };
        board[7][7] = { side: 'chess', type: 'rook' };
        // Row 6 (rank 2): Pawns
        for (let c = 0; c < 8; c++) {
            board[6][c] = { side: 'chess', type: 'pawn' };
        }

        // === Shogi pieces (black/sente, top) ===
        // Row 0 (rank 8): 香 桂 銀 金 金 銀 桂 香 (no King initially)
        board[0][0] = { side: 'shogi', type: 'kyosha' };
        board[0][1] = { side: 'shogi', type: 'keima' };
        board[0][2] = { side: 'shogi', type: 'gin' };
        board[0][3] = { side: 'shogi', type: 'kin' };
        board[0][4] = { side: 'shogi', type: 'kin' };
        board[0][5] = { side: 'shogi', type: 'gin' };
        board[0][6] = { side: 'shogi', type: 'keima' };
        board[0][7] = { side: 'shogi', type: 'kyosha' };

        // Row 1 (rank 7): . 飛 . . . . 角 . (Rook at b7=col1, Bishop at g7=col6)
        // 標準将棋配置: 飛車は2筋(先手の右側)、角行は8筋(先手の左側)
        board[1][1] = { side: 'shogi', type: 'hisha' };
        board[1][6] = { side: 'shogi', type: 'kaku' };

        // Row 2 (rank 6): 歩×8
        for (let c = 0; c < 8; c++) {
            board[2][c] = { side: 'shogi', type: 'fu' };
        }

        return board;
    }

    /**
     * Create a shallow clone for simulation
     */
    clone() {
        const gs = new GameState();
        gs.board = this.board.map(row => row.map(cell => cell ? { ...cell } : null));
        gs.currentTurn = this.currentTurn;
        gs.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
        gs.chessCastling = { ...this.chessCastling };
        gs.shogiHand = { ...this.shogiHand };
        gs.shogiKingAppeared = this.shogiKingAppeared;
        gs.shogiBackRowMoved = [...this.shogiBackRowMoved];
        gs.gameOver = this.gameOver;
        gs.lastMove = this.lastMove ? { ...this.lastMove } : null;
        return gs;
    }

    /**
     * Simulate a move and return the resulting state (for check testing)
     */
    simulate(fromRow, fromCol, toRow, toCol, special) {
        const sim = this.clone();
        const piece = sim.board[fromRow][fromCol];
        if (!piece) return sim;

        // Basic move
        sim.board[toRow][toCol] = { ...piece };
        sim.board[fromRow][fromCol] = null;

        // En passant capture
        if (special === 'en-passant' && piece.type === 'pawn') {
            sim.board[fromRow][toCol] = null;
        }

        // Castling
        if (special === 'castle-king') {
            sim.board[7][5] = sim.board[7][7];
            sim.board[7][7] = null;
        } else if (special === 'castle-queen') {
            sim.board[7][3] = sim.board[7][0];
            sim.board[7][0] = null;
        }

        // Promotion
        if (special === 'promote' && piece.side === 'shogi') {
            sim.board[toRow][toCol].type = ShogiRules.getPromotedType(piece.type);
        }

        return sim;
    }

    /**
     * Execute a board move
     * Returns result object with info about the move
     */
    executeMove(fromRow, fromCol, toRow, toCol, special, promoteTo) {
        if (this.gameOver) return null;

        const piece = this.board[fromRow][fromCol];
        if (!piece) return null;

        const capturedPiece = this.board[toRow][toCol];
        const result = {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: { ...piece },
            captured: capturedPiece ? { ...capturedPiece } : null,
            special: special || null,
            notation: '',
            needsQueenChoice: false,
        };

        // Move piece
        this.board[toRow][toCol] = { ...piece };
        this.board[fromRow][fromCol] = null;

        // Handle special moves
        if (special === 'en-passant') {
            result.captured = { ...this.board[fromRow][toCol] };
            this.board[fromRow][toCol] = null;
        }

        if (special === 'castle-king') {
            this.board[7][5] = this.board[7][7];
            this.board[7][7] = null;
        } else if (special === 'castle-queen') {
            this.board[7][3] = this.board[7][0];
            this.board[7][0] = null;
        }

        // Chess pawn promotion
        if (special === 'promotion' && piece.side === 'chess') {
            this.board[toRow][toCol].type = promoteTo || 'queen';
            this.board[toRow][toCol].promotedFromPawn = true; // 元はポーンなので将棋側が取っても「歩」扱い
        }

        // Shogi promotion
        if (special === 'promote' && piece.side === 'shogi') {
            this.board[toRow][toCol].type = ShogiRules.getPromotedType(piece.type);
        }

        // Handle captures
        if (result.captured) {
            this.handleCapture(piece.side, result.captured);
            // Check if captured piece requires queen choice:
            // 元々のクイーン（ポーンがプロモートしたものではない）を取った場合のみ
            if (piece.side === 'shogi' && result.captured.side === 'chess' &&
                result.captured.type === 'queen' && !result.captured.promotedFromPawn) {
                result.needsQueenChoice = true;
            }
        }

        // En passant tracking
        this.enPassantTarget = null;
        if (special === 'double-push' && piece.type === 'pawn') {
            this.enPassantTarget = { row: (fromRow + toRow) / 2, col: fromCol };
        }

        // Update castling rights
        if (piece.side === 'chess') {
            if (piece.type === 'king') {
                this.chessCastling.kingSide = false;
                this.chessCastling.queenSide = false;
            }
            if (piece.type === 'rook') {
                if (fromRow === 7 && fromCol === 0) this.chessCastling.queenSide = false;
                if (fromRow === 7 && fromCol === 7) this.chessCastling.kingSide = false;
            }
        }

        // Shogi King appearance check
        if (piece.side === 'shogi' && fromRow === 0 && !this.shogiKingAppeared) {
            this.shogiBackRowMoved[fromCol] = true;
            this.trySpawnShogiKing();
        }

        // Generate notation
        result.notation = this.generateNotation(result);

        // Record move
        this.lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
        this.moveHistory.push(result);

        // Switch turn (unless waiting for queen choice)
        if (!result.needsQueenChoice) {
            this.switchTurn();
        }

        return result;
    }

    /**
     * Execute a shogi drop
     */
    executeDrop(pieceType, row, col) {
        if (this.gameOver) return null;
        if (this.currentTurn !== 'shogi') return null;
        if (this.board[row][col]) return null;

        if (!this.shogiHand[pieceType] || this.shogiHand[pieceType] <= 0) return null;

        this.board[row][col] = { side: 'shogi', type: pieceType };
        this.shogiHand[pieceType]--;
        if (this.shogiHand[pieceType] === 0) delete this.shogiHand[pieceType];

        const result = {
            from: null,
            to: { row, col },
            piece: { side: 'shogi', type: pieceType },
            captured: null,
            special: 'drop',
            notation: this.getShogiPieceName(pieceType) + '*' + this.squareName(row, col),
        };

        this.lastMove = { from: null, to: { row, col } };
        this.moveHistory.push(result);
        this.switchTurn();

        return result;
    }

    /**
     * Complete a queen capture choice (for shogi capturing a queen)
     */
    completeQueenChoice(chosenType) {
        // Add the chosen type to hand
        if (!this.shogiHand[chosenType]) this.shogiHand[chosenType] = 0;
        this.shogiHand[chosenType]++;

        this.switchTurn();
    }

    switchTurn() {
        this.currentTurn = this.currentTurn === 'chess' ? 'shogi' : 'chess';
        this.checkGameEnd();
    }

    /**
     * Handle a capture (add to hand if shogi captures chess)
     */
    handleCapture(capturingSide, capturedPiece) {
        if (capturingSide === 'shogi' && capturedPiece.side === 'chess') {
            // ポーンがプロモーションした駒を取った場合は常に歩として手駒に入る
            if (capturedPiece.promotedFromPawn) {
                if (!this.shogiHand['fu']) this.shogiHand['fu'] = 0;
                this.shogiHand['fu']++;
                return;
            }
            // 通常の変換
            const conversion = this.getChessToShogiConversion(capturedPiece.type);
            if (conversion && conversion !== 'queen-choice') {
                if (!this.shogiHand[conversion]) this.shogiHand[conversion] = 0;
                this.shogiHand[conversion]++;
            }
            // queen-choice は needsQueenChoice フラグで別途処理
        }
        // Chess capturing shogi: nothing happens (piece disappears)
    }

    /**
     * Convert chess piece type to shogi hand piece type
     */
    getChessToShogiConversion(chessType) {
        const conversionMap = {
            pawn: 'fu',
            knight: 'keima',
            bishop: 'gin',
            rook: 'kyosha',
            queen: 'queen-choice', // Handled specially
        };
        return conversionMap[chessType] || null;
    }

    /**
     * Try to spawn shogi king on the back row
     */
    trySpawnShogiKing() {
        if (this.shogiKingAppeared) return;

        // Find an empty square on row 0 (back row)
        for (let c = 0; c < 8; c++) {
            if (!this.board[0][c] && this.shogiBackRowMoved[c]) {
                this.board[0][c] = { side: 'shogi', type: 'gyoku' };
                this.shogiKingAppeared = true;
                return;
            }
        }
    }

    /**
     * Check if game has ended
     */
    checkGameEnd() {
        if (this.currentTurn === 'chess') {
            const inCheck = ChessRules.isKingInCheck(this, 'chess');
            const hasLegal = ChessRules.hasLegalMoves(this);
            if (!hasLegal) {
                this.gameOver = true;
                this.gameResult = inCheck ? 'shogi-wins' : 'stalemate';
            }
        } else {
            // Check if shogi king exists
            if (this.shogiKingAppeared) {
                const inCheck = ShogiRules.isKingInCheck(this, 'shogi');
                const hasLegal = ShogiRules.hasLegalMoves(this);
                if (!hasLegal) {
                    this.gameOver = true;
                    this.gameResult = inCheck ? 'chess-wins' : 'stalemate';
                }
            } else {
                // King hasn't appeared, check if shogi has any moves
                const hasLegal = ShogiRules.hasLegalMoves(this);
                if (!hasLegal) {
                    this.gameOver = true;
                    this.gameResult = 'chess-wins';
                }
            }
        }
    }

    /**
     * Notation helpers
     */
    squareName(row, col) {
        return String.fromCharCode(97 + col) + (8 - row);
    }

    getChessPieceSymbol(type) {
        const symbols = { king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: '' };
        return symbols[type] || '';
    }

    getShogiPieceName(type) {
        const names = {
            fu: '歩', kyosha: '香', keima: '桂', gin: '銀', kin: '金',
            hisha: '飛', kaku: '角', gyoku: '玉',
            tokin: 'と', narikyosha: '成香', narikeima: '成桂', narigin: '成銀',
            ryuu: '竜', uma: '馬',
        };
        return names[type] || type;
    }

    generateNotation(result) {
        const { piece, from, to, captured, special } = result;
        if (special === 'castle-king') return 'O-O';
        if (special === 'castle-queen') return 'O-O-O';

        if (piece.side === 'chess') {
            let note = this.getChessPieceSymbol(piece.type);
            if (captured) note += 'x';
            note += this.squareName(to.row, to.col);
            if (special === 'promotion') note += '=' + this.getChessPieceSymbol(result.promoteTo || 'queen');
            return note;
        } else {
            let note = this.getShogiPieceName(piece.type);
            note += this.squareName(to.row, to.col);
            if (special === 'promote') note += '成';
            if (captured) note += 'x';
            return note;
        }
    }

    /**
     * Is the current side's king in check?
     */
    isCurrentSideInCheck() {
        if (this.currentTurn === 'chess') {
            return ChessRules.isKingInCheck(this, 'chess');
        } else {
            if (!this.shogiKingAppeared) return false;
            return ShogiRules.isKingInCheck(this, 'shogi');
        }
    }
}
