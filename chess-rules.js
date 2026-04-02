/* ============================================================
   Chess Rules Engine
   Handles all chess piece movement, capture, and special rules
   ============================================================ */

const ChessRules = {
    /**
     * Get all legal moves for a chess piece at (row, col)
     * @param {object} gameState - The current game state
     * @param {number} row - Row index (0-7, 0=top=rank8)
     * @param {number} col - Col index (0-7, 0=left=a-file)
     * @returns {Array} Array of {row, col, special} move objects
     */
    getLegalMoves(gameState, row, col) {
        const piece = gameState.board[row][col];
        if (!piece || piece.side !== 'chess') return [];

        const pseudoMoves = this.getPseudoLegalMoves(gameState, row, col);

        // Filter out moves that leave own king in check
        return pseudoMoves.filter(move => {
            const sim = gameState.simulate(row, col, move.row, move.col, move.special);
            return !this.isKingInCheck(sim, 'chess');
        });
    },

    /**
     * Get pseudo-legal moves (not checking for self-check)
     */
    getPseudoLegalMoves(gameState, row, col) {
        const piece = gameState.board[row][col];
        if (!piece) return [];

        switch (piece.type) {
            case 'pawn': return this.getPawnMoves(gameState, row, col);
            case 'knight': return this.getKnightMoves(gameState, row, col);
            case 'bishop': return this.getBishopMoves(gameState, row, col);
            case 'rook': return this.getRookMoves(gameState, row, col);
            case 'queen': return this.getQueenMoves(gameState, row, col);
            case 'king': return this.getKingMoves(gameState, row, col);
            default: return [];
        }
    },

    getPawnMoves(gameState, row, col) {
        const moves = [];
        const board = gameState.board;
        // Chess is white, on bottom. Pawns move up (row decreases). Start row = 6.
        const dir = -1;
        const startRow = 6;
        const promoRow = 0;

        // Forward one
        const r1 = row + dir;
        if (r1 >= 0 && r1 <= 7 && !board[r1][col]) {
            if (r1 <= 2) { // Promotion zone is now last 3 ranks (rows 0, 1, 2)
                ['queen', 'rook', 'bishop', 'knight'].forEach(promo => {
                    moves.push({ row: r1, col, special: 'promotion', promoteTo: promo });
                });
            } else {
                moves.push({ row: r1, col });
            }

            // Forward two from start
            const r2 = row + dir * 2;
            if (row === startRow && !board[r2][col]) {
                moves.push({ row: r2, col, special: 'double-push' });
            }
        }

        // Captures (diagonal)
        for (const dc of [-1, 1]) {
            const nc = col + dc;
            if (nc < 0 || nc > 7 || r1 < 0 || r1 > 7) continue;
            const target = board[r1][nc];
            if (target && target.side !== 'chess') {
                if (r1 <= 2) { // Promotion zone is now last 3 ranks (rows 0, 1, 2)
                    ['queen', 'rook', 'bishop', 'knight'].forEach(promo => {
                        moves.push({ row: r1, col: nc, special: 'promotion', promoteTo: promo });
                    });
                } else {
                    moves.push({ row: r1, col: nc });
                }
            }
        }

        // En passant
        if (gameState.enPassantTarget) {
            const ep = gameState.enPassantTarget;
            if (ep.row === r1 && Math.abs(ep.col - col) === 1) {
                moves.push({ row: ep.row, col: ep.col, special: 'en-passant' });
            }
        }

        return moves;
    },

    getKnightMoves(gameState, row, col) {
        const moves = [];
        const offsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        for (const [dr, dc] of offsets) {
            const r = row + dr, c = col + dc;
            if (r < 0 || r > 7 || c < 0 || c > 7) continue;
            const target = gameState.board[r][c];
            if (!target || target.side !== 'chess') {
                moves.push({ row: r, col: c });
            }
        }
        return moves;
    },

    getSlidingMoves(gameState, row, col, directions) {
        const moves = [];
        for (const [dr, dc] of directions) {
            let r = row + dr, c = col + dc;
            while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                const target = gameState.board[r][c];
                if (!target) {
                    moves.push({ row: r, col: c });
                } else {
                    if (target.side !== 'chess') {
                        moves.push({ row: r, col: c });
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }
        return moves;
    },

    getBishopMoves(gameState, row, col) {
        return this.getSlidingMoves(gameState, row, col, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
    },

    getRookMoves(gameState, row, col) {
        return this.getSlidingMoves(gameState, row, col, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
    },

    getQueenMoves(gameState, row, col) {
        return this.getSlidingMoves(gameState, row, col, [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]);
    },

    getKingMoves(gameState, row, col) {
        const moves = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = row + dr, c = col + dc;
                if (r < 0 || r > 7 || c < 0 || c > 7) continue;
                const target = gameState.board[r][c];
                if (!target || target.side !== 'chess') {
                    moves.push({ row: r, col: c });
                }
            }
        }

        // Castling
        if (!gameState.chessCastling) return moves;
        const castling = gameState.chessCastling;

        if (row === 7 && col === 4 && !this.isKingInCheck(gameState, 'chess')) {
            // King-side (h1 rook)
            if (castling.kingSide &&
                !gameState.board[7][5] && !gameState.board[7][6] &&
                gameState.board[7][7] && gameState.board[7][7].type === 'rook' && gameState.board[7][7].side === 'chess') {
                // Check that king doesn't pass through check
                const sim1 = gameState.simulate(7, 4, 7, 5);
                if (!this.isKingInCheck(sim1, 'chess')) {
                    moves.push({ row: 7, col: 6, special: 'castle-king' });
                }
            }
            // Queen-side (a1 rook)
            if (castling.queenSide &&
                !gameState.board[7][1] && !gameState.board[7][2] && !gameState.board[7][3] &&
                gameState.board[7][0] && gameState.board[7][0].type === 'rook' && gameState.board[7][0].side === 'chess') {
                const sim1 = gameState.simulate(7, 4, 7, 3);
                if (!this.isKingInCheck(sim1, 'chess')) {
                    moves.push({ row: 7, col: 2, special: 'castle-queen' });
                }
            }
        }

        return moves;
    },

    /**
     * Check if the king of the given side is in check
     */
    isKingInCheck(gameState, side) {
        // Find king
        let kingRow = -1, kingCol = -1;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = gameState.board[r][c];
                if (p && p.side === side && (p.type === 'king' || p.type === 'gyoku')) {
                    kingRow = r;
                    kingCol = c;
                    break;
                }
            }
            if (kingRow >= 0) break;
        }
        if (kingRow < 0) return false; // King not on board (shogi king may not have appeared)

        // Check if any opponent piece attacks the king
        const opponentSide = side === 'chess' ? 'shogi' : 'chess';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = gameState.board[r][c];
                if (!p || p.side !== opponentSide) continue;

                let attacks;
                if (p.side === 'chess') {
                    attacks = this.getPseudoLegalMoves(gameState, r, c);
                } else {
                    attacks = ShogiRules.getPseudoLegalMoves(gameState, r, c);
                }
                if (attacks.some(m => m.row === kingRow && m.col === kingCol)) {
                    return true;
                }
            }
        }
        return false;
    },

    /**
     * Check if the chess side has any legal moves
     */
    hasLegalMoves(gameState) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = gameState.board[r][c];
                if (p && p.side === 'chess') {
                    if (this.getLegalMoves(gameState, r, c).length > 0) return true;
                }
            }
        }
        return false;
    }
};
