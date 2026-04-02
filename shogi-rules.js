/* ============================================================
   Shogi Rules Engine
   Handles all shogi piece movement, promotion, drops
   ============================================================ */

const ShogiRules = {
    // Shogi piece movement patterns (relative to piece position)
    // Shogi pieces move "upward" on the board (decreasing row = toward chess side)
    // For shogi in this game, "forward" = increasing row (toward chess side, south)
    // Wait: shogi is at top (rows 0-2), chess at bottom (rows 5-7)
    // Shogi pieces face downward (toward chess side), so forward = +row

    /**
     * Movement definitions for shogi pieces
     * forward = +row direction (toward chess side)
     */
    moveDefs: {
        // 歩 (Pawn/Fu) - one step forward
        fu: { steps: [[1, 0]], slides: [] },
        // 香 (Lance/Kyosha) - slides forward
        kyosha: { steps: [], slides: [[1, 0]] },
        // 桂 (Knight/Keima) - L-shape forward only
        keima: { steps: [[2, -1], [2, 1]], slides: [] },
        // 銀 (Silver/Gin) - forward diagonals + forward
        gin: { steps: [[1, 0], [1, -1], [1, 1], [-1, -1], [-1, 1]], slides: [] },
        // 金 (Gold/Kin) - forward, sides, backward, forward diagonals
        kin: { steps: [[1, 0], [1, -1], [1, 1], [0, -1], [0, 1], [-1, 0]], slides: [] },
        // 飛 (Rook/Hisha) - slides in 4 cardinal directions
        hisha: { steps: [], slides: [[1, 0], [-1, 0], [0, 1], [0, -1]] },
        // 角 (Bishop/Kaku) - slides in 4 diagonals
        kaku: { steps: [], slides: [[1, 1], [1, -1], [-1, 1], [-1, -1]] },
        // 王/玉 (King/Gyoku) - one step in all 8 directions
        gyoku: { steps: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], slides: [] },

        // Promoted pieces
        // と (Promoted Pawn) - moves like Gold
        tokin: { steps: [[1, 0], [1, -1], [1, 1], [0, -1], [0, 1], [-1, 0]], slides: [] },
        // 成香 (Promoted Lance) - moves like Gold
        narikyosha: { steps: [[1, 0], [1, -1], [1, 1], [0, -1], [0, 1], [-1, 0]], slides: [] },
        // 成桂 (Promoted Knight) - moves like Gold
        narikeima: { steps: [[1, 0], [1, -1], [1, 1], [0, -1], [0, 1], [-1, 0]], slides: [] },
        // 成銀 (Promoted Silver) - moves like Gold
        narigin: { steps: [[1, 0], [1, -1], [1, 1], [0, -1], [0, 1], [-1, 0]], slides: [] },
        // 竜 (Promoted Rook/Ryuu) - Rook + diagonal one step
        ryuu: { steps: [[1, 1], [1, -1], [-1, 1], [-1, -1]], slides: [[1, 0], [-1, 0], [0, 1], [0, -1]] },
        // 馬 (Promoted Bishop/Uma) - Bishop + cardinal one step
        uma: { steps: [[1, 0], [-1, 0], [0, 1], [0, -1]], slides: [[1, 1], [1, -1], [-1, 1], [-1, -1]] },
    },

    /**
     * Get legal moves for a shogi piece at (row, col)
     */
    getLegalMoves(gameState, row, col) {
        const piece = gameState.board[row][col];
        if (!piece || piece.side !== 'shogi') return [];

        const pseudoMoves = this.getPseudoLegalMoves(gameState, row, col);

        // Filter out moves that leave own king in check
        return pseudoMoves.filter(move => {
            const sim = gameState.simulate(row, col, move.row, move.col, move.special);
            return !ShogiRules.isKingInCheck(sim, 'shogi');
        });
    },

    /**
     * Get pseudo-legal moves (without checking self-check)
     */
    getPseudoLegalMoves(gameState, row, col) {
        const piece = gameState.board[row][col];
        if (!piece || piece.side !== 'shogi') return [];

        const moveDef = this.moveDefs[piece.type];
        if (!moveDef) return [];

        const moves = [];
        const board = gameState.board;

        // Step moves
        for (const [dr, dc] of moveDef.steps) {
            const r = row + dr, c = col + dc;
            if (r < 0 || r > 7 || c < 0 || c > 7) continue;
            const target = board[r][c];
            if (!target || target.side !== 'shogi') {
                this.addMoveWithPromotion(moves, row, col, r, c, piece);
            }
        }

        // Slide moves
        for (const [dr, dc] of moveDef.slides) {
            let r = row + dr, c = col + dc;
            while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                const target = board[r][c];
                if (!target) {
                    this.addMoveWithPromotion(moves, row, col, r, c, piece);
                } else {
                    if (target.side !== 'shogi') {
                        this.addMoveWithPromotion(moves, row, col, r, c, piece);
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }

        return moves;
    },

    /**
     * Add move with optional promotion options
     * Shogi promotion zone: rows 5-7 (last 3 rows toward chess side)
     */
    addMoveWithPromotion(moves, fromRow, fromCol, toRow, toCol, piece) {
        const promoZoneStart = 5; // rows 5, 6, 7 are promotion zone for shogi
        const canPromote = this.canPromote(piece.type);
        const inPromoZone = toRow >= promoZoneStart || fromRow >= promoZoneStart;
        const mustPromote = this.mustPromote(piece.type, toRow);

        if (canPromote && inPromoZone) {
            // Add promoted move
            moves.push({ row: toRow, col: toCol, special: 'promote' });
            // Add non-promoted move if not forced
            if (!mustPromote) {
                moves.push({ row: toRow, col: toCol });
            }
        } else {
            moves.push({ row: toRow, col: toCol });
        }
    },

    /**
     * Check if piece type can promote
     */
    canPromote(type) {
        return ['fu', 'kyosha', 'keima', 'gin', 'hisha', 'kaku'].includes(type);
    },

    /**
     * Check if piece must promote (can't go further)
     */
    mustPromote(type, toRow) {
        if (type === 'fu' || type === 'kyosha') return toRow === 7;
        if (type === 'keima') return toRow >= 6;
        return false;
    },

    /**
     * Get the promoted type for a piece
     */
    getPromotedType(type) {
        const promoMap = {
            fu: 'tokin',
            kyosha: 'narikyosha',
            keima: 'narikeima',
            gin: 'narigin',
            hisha: 'ryuu',
            kaku: 'uma',
        };
        return promoMap[type] || type;
    },

    /**
     * Get the unpromoted type (for hand pieces when captured)
     */
    getUnpromotedType(type) {
        const unpromoMap = {
            tokin: 'fu',
            narikyosha: 'kyosha',
            narikeima: 'keima',
            narigin: 'gin',
            ryuu: 'hisha',
            uma: 'kaku',
        };
        return unpromoMap[type] || type;
    },

    /**
     * Get legal drop squares for a hand piece
     */
    getDropMoves(gameState, pieceType) {
        const moves = [];
        const board = gameState.board;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c]) continue; // Occupied

                // 歩 drop restrictions
                if (pieceType === 'fu') {
                    // No two fu in same column (二歩)
                    let hasFuInCol = false;
                    for (let rr = 0; rr < 8; rr++) {
                        const p = board[rr][c];
                        if (p && p.side === 'shogi' && p.type === 'fu') {
                            hasFuInCol = true;
                            break;
                        }
                    }
                    if (hasFuInCol) continue;

                    // Can't drop on last row
                    if (r === 7) continue;

                    // Check for 打ち歩詰め (checkmate by pawn drop) - simplified check
                    // Place the pawn and see if it causes immediate checkmate
                    const sim = gameState.clone();
                    sim.board[r][c] = { side: 'shogi', type: 'fu' };
                    if (this.isKingInCheck(sim, 'chess') || ChessRules.isKingInCheck(sim, 'chess')) {
                        // Check if chess has no legal moves (uchifuzume)
                        if (!ChessRules.hasLegalMoves(sim)) continue;
                    }
                }

                // 桂馬 can't be dropped where it can't move
                if (pieceType === 'keima' && r >= 6) continue;

                // 香車 can't be dropped on last row
                if (pieceType === 'kyosha' && r === 7) continue;

                // SPECIAL RULE: Drops only allowed in own territory (bottom 4 rows from player perspective, which is rows 0-3 in board logic)
                if (r > 3) continue;

                // Verify the drop doesn't leave own king in check
                const sim = gameState.clone();
                sim.board[r][c] = { side: 'shogi', type: pieceType };
                if (!this.isKingInCheck(sim, 'shogi')) {
                    moves.push({ row: r, col: c, special: 'drop' });
                }
            }
        }

        return moves;
    },

    /**
     * Check if shogi king is in check
     */
    isKingInCheck(gameState, side) {
        // Find king (gyoku for shogi)
        let kingRow = -1, kingCol = -1;
        const kingType = side === 'shogi' ? 'gyoku' : 'king';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = gameState.board[r][c];
                if (p && p.side === side && (p.type === kingType || p.type === 'king' || p.type === 'gyoku')) {
                    kingRow = r;
                    kingCol = c;
                    break;
                }
            }
            if (kingRow >= 0) break;
        }
        if (kingRow < 0) return false; // King not on board yet

        // Check if any opponent attacks the king
        const opponentSide = side === 'chess' ? 'shogi' : 'chess';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = gameState.board[r][c];
                if (!p || p.side !== opponentSide) continue;

                let attacks;
                if (p.side === 'chess') {
                    attacks = ChessRules.getPseudoLegalMoves(gameState, r, c);
                } else {
                    attacks = this.getPseudoLegalMoves(gameState, r, c);
                }
                if (attacks.some(m => m.row === kingRow && m.col === kingCol)) {
                    return true;
                }
            }
        }
        return false;
    },

    /**
     * Check if shogi side has any legal moves (board moves + drops)
     */
    hasLegalMoves(gameState) {
        // Board moves
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = gameState.board[r][c];
                if (p && p.side === 'shogi') {
                    if (this.getLegalMoves(gameState, r, c).length > 0) return true;
                }
            }
        }
        // Drop moves
        for (const type of Object.keys(gameState.shogiHand)) {
            if (gameState.shogiHand[type] > 0) {
                if (this.getDropMoves(gameState, type).length > 0) return true;
            }
        }
        return false;
    }
};
