/* ============================================================
   UI Controller
   Renders the board, handles interactions, manages dialogs
   chess.com inspired UX with smooth interactions
   ============================================================ */

const UI = {
    game: null,
    boardEl: null,
    selectedPiece: null,   // { row, col } or null
    selectedHandPiece: null, // { type } or null
    legalMoves: [],
    flipped: false,

    promotedTypes: new Set(['tokin', 'narikyosha', 'narikeima', 'narigin', 'ryuu', 'uma']),

    shogiPieceKanji: {
        fu: '歩', kyosha: '香', keima: '桂', gin: '銀', kin: '金',
        hisha: '飛', kaku: '角', gyoku: '玉',
        tokin: 'と', narikyosha: '杏', narikeima: '圭', narigin: '全',
        ryuu: '竜', uma: '馬',
    },

    init() {
        this.game = new GameState();
        this.boardEl = document.getElementById('board');
        this.flipped = false;
        this.setupCoordinates();
        this.render();
        this.bindEvents();
        SoundManager.init();
    },

    setupCoordinates() {
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

        const coordsTop = document.getElementById('coords-top');
        const coordsBottom = document.getElementById('coords-bottom');
        const coordsLeft = document.getElementById('coords-left');
        const coordsRight = document.getElementById('coords-right');

        coordsTop.innerHTML = '';
        coordsBottom.innerHTML = '';
        coordsLeft.innerHTML = '';
        coordsRight.innerHTML = '';

        const displayFiles = this.flipped ? [...files].reverse() : files;
        const displayRanks = this.flipped ? [...ranks].reverse() : ranks;

        displayFiles.forEach(f => {
            coordsTop.innerHTML += `<span>${f}</span>`;
            coordsBottom.innerHTML += `<span>${f}</span>`;
        });

        displayRanks.forEach(r => {
            coordsLeft.innerHTML += `<span>${r}</span>`;
            coordsRight.innerHTML += `<span>${r}</span>`;
        });
    },

    render() {
        this.renderBoard();
        this.renderHandPieces();
        this.renderPlayerPanels();
        this.updateStatus();
        this.updateTurnIndicators();
        this.renderMoveHistory();
    },

    renderPlayerPanels() {
        const panelShogi = document.getElementById('panel-shogi');
        const panelChess = document.getElementById('panel-chess');

        if (this.flipped) {
            panelShogi.classList.remove('top-panel');
            panelShogi.classList.add('bottom-panel');
            panelChess.classList.remove('bottom-panel');
            panelChess.classList.add('top-panel');
            panelChess.style.order = '1';
            panelShogi.style.order = '3';
        } else {
            panelShogi.classList.remove('bottom-panel');
            panelShogi.classList.add('top-panel');
            panelChess.classList.remove('top-panel');
            panelChess.classList.add('bottom-panel');
            panelChess.style.order = '3';
            panelShogi.style.order = '1';
        }
    },

    renderBoard() {
        this.boardEl.innerHTML = '';

        for (let displayRow = 0; displayRow < 8; displayRow++) {
            for (let displayCol = 0; displayCol < 8; displayCol++) {
                const row = this.flipped ? (7 - displayRow) : displayRow;
                const col = this.flipped ? (7 - displayCol) : displayCol;

                const square = document.createElement('div');
                square.className = 'square';
                square.dataset.row = row;
                square.dataset.col = col;

                const isLight = (displayRow + displayCol) % 2 === 0;
                square.classList.add(isLight ? 'square-light' : 'square-dark');

                // Last move highlight
                if (this.game.lastMove) {
                    const lm = this.game.lastMove;
                    if (lm.from && lm.from.row === row && lm.from.col === col) {
                        square.classList.add('last-move');
                    }
                    if (lm.to.row === row && lm.to.col === col) {
                        square.classList.add('last-move');
                    }
                }

                // Selected highlight
                if (this.selectedPiece && this.selectedPiece.row === row && this.selectedPiece.col === col) {
                    square.classList.add('highlighted');
                }

                // Check highlight
                const piece = this.game.board[row][col];
                if (piece) {
                    if (piece.side === 'chess' && piece.type === 'king' && ChessRules.isKingInCheck(this.game, 'chess')) {
                        square.classList.add('check');
                    }
                    if (piece.side === 'shogi' && piece.type === 'gyoku' && ShogiRules.isKingInCheck(this.game, 'shogi')) {
                        square.classList.add('check');
                    }
                }

                // Move targets
                const isTarget = this.legalMoves.find(m => m.row === row && m.col === col);
                if (isTarget) {
                    if (this.selectedHandPiece) {
                        square.classList.add('drop-target');
                    } else if (this.game.board[row][col]) {
                        square.classList.add('capture-target');
                    } else {
                        square.classList.add('move-target');
                    }
                }

                // Piece rendering
                if (piece) {
                    const pieceEl = this.createPieceElement(piece);
                    square.appendChild(pieceEl);
                }

                square.addEventListener('click', () => this.onSquareClick(row, col));
                this.boardEl.appendChild(square);
            }
        }
    },

    createPieceElement(piece) {
        const wrapper = document.createElement('div');
        wrapper.className = 'piece';

        if (piece.side === 'chess') {
            const img = PieceAssets.createChessPieceImg(piece.type);
            wrapper.classList.add('chess-piece');
            wrapper.appendChild(img);
        } else {
            const img = PieceAssets.createShogiPieceImg(piece.type);
            wrapper.classList.add('shogi-piece');
            wrapper.appendChild(img);
        }

        return wrapper;
    },

    renderHandPieces() {
        const shogiHandEl = document.getElementById('hand-shogi');
        shogiHandEl.innerHTML = '';

        const handOrder = ['hisha', 'kaku', 'kin', 'gin', 'keima', 'kyosha', 'fu'];
        let hasHandPieces = false;

        for (const type of handOrder) {
            const count = this.game.shogiHand[type] || 0;
            if (count <= 0) continue;
            hasHandPieces = true;

            const el = document.createElement('div');
            el.className = 'hand-piece';
            if (this.selectedHandPiece && this.selectedHandPiece.type === type) {
                el.classList.add('selected');
            }

            const img = PieceAssets.createShogiHandPieceImg(type);
            el.appendChild(img);

            if (count > 1) {
                const countEl = document.createElement('div');
                countEl.className = 'hand-piece-count';
                countEl.textContent = count;
                el.appendChild(countEl);
            }

            el.addEventListener('click', (e) => {
                e.stopPropagation();
                this.onHandPieceClick(type);
            });

            shogiHandEl.appendChild(el);
        }

        if (!hasHandPieces) {
            shogiHandEl.innerHTML = '<span class="hand-empty">\u2014</span>';
        }

        const chessHandEl = document.getElementById('hand-chess');
        chessHandEl.innerHTML = '<span class="hand-empty">No hand pieces</span>';
    },

    onSquareClick(row, col) {
        const piece = this.game.board[row][col];

        // If we have a hand piece selected, try to drop it
        if (this.selectedHandPiece) {
            const dropMove = this.legalMoves.find(m => m.row === row && m.col === col);
            if (dropMove) {
                const dropResult = this.game.executeDrop(this.selectedHandPiece.type, row, col);
                this.clearSelection();
                SoundManager.playForResult(dropResult, 'shogi', this.game);
                this.autoFlip();
                this.render();
                return;
            } else {
                this.clearSelection();
                this.render();
                return;
            }
        }

        // If we have a board piece selected
        if (this.selectedPiece) {
            if (this.selectedPiece.row === row && this.selectedPiece.col === col) {
                this.clearSelection();
                this.render();
                return;
            }

            if (piece && piece.side === this.game.currentTurn) {
                this.selectPiece(row, col);
                return;
            }

            const move = this.legalMoves.find(m => m.row === row && m.col === col);
            if (move) {
                this.executeUIMove(move);
                return;
            } else {
                this.clearSelection();
                this.render();
                return;
            }
        }

        // Select a piece
        if (piece && piece.side === this.game.currentTurn) {
            this.selectPiece(row, col);
        }
    },

    selectPiece(row, col) {
        const piece = this.game.board[row][col];
        if (!piece) return;

        this.selectedPiece = { row, col };
        this.selectedHandPiece = null;

        if (piece.side === 'chess') {
            this.legalMoves = ChessRules.getLegalMoves(this.game, row, col);
        } else {
            this.legalMoves = ShogiRules.getLegalMoves(this.game, row, col);
        }

        this.render();
    },

    onHandPieceClick(type) {
        if (this.game.currentTurn !== 'shogi') return;

        if (this.selectedHandPiece && this.selectedHandPiece.type === type) {
            this.clearSelection();
            this.render();
            return;
        }

        this.selectedPiece = null;
        this.selectedHandPiece = { type };
        this.legalMoves = ShogiRules.getDropMoves(this.game, type);
        this.render();
    },

    executeUIMove(move) {
        const fromRow = this.selectedPiece.row;
        const fromCol = this.selectedPiece.col;
        const piece = this.game.board[fromRow][fromCol];

        // Shogi promotion choice
        if (piece.side === 'shogi' && move.special === 'promote') {
            const nonPromote = this.legalMoves.find(m => m.row === move.row && m.col === move.col && m.special !== 'promote');
            if (nonPromote) {
                this.showShogiPromotionDialog(fromRow, fromCol, move.row, move.col);
                return;
            }
        }

        // Chess pawn promotion
        if (piece.side === 'chess' && move.special === 'promotion') {
            this.showChessPromotionDialog(fromRow, fromCol, move.row, move.col);
            return;
        }

        const result = this.game.executeMove(fromRow, fromCol, move.row, move.col, move.special, move.promoteTo);
        this.clearSelection();

        if (result && result.needsQueenChoice) {
            SoundManager.play('shogi_capture');
            this.render();
            this.showQueenChoiceDialog();
            return;
        }

        SoundManager.playForResult(result, piece.side, this.game);
        this.autoFlip();
        this.render();
    },

    autoFlip() {
        if (this.game.gameOver) return;
        this.flipped = (this.game.currentTurn === 'shogi');
        this.setupCoordinates();
    },

    showShogiPromotionDialog(fromRow, fromCol, toRow, toCol) {
        const piece = this.game.board[fromRow][fromCol];
        const promotedType = ShogiRules.getPromotedType(piece.type);

        const overlay = document.getElementById('modal-overlay');
        const title = document.getElementById('modal-title');
        const options = document.getElementById('modal-options');

        title.textContent = '成りますか？';
        options.innerHTML = '';

        // Promote option
        const promoBtn = document.createElement('div');
        promoBtn.className = 'modal-option';
        const promoImg = PieceAssets.createShogiPieceImg(promotedType);
        promoImg.style.width = '44px';
        promoImg.style.height = '44px';
        promoBtn.appendChild(promoImg);
        promoBtn.addEventListener('click', () => {
            overlay.style.display = 'none';
            const result = this.game.executeMove(fromRow, fromCol, toRow, toCol, 'promote');
            this.clearSelection();
            if (result && result.needsQueenChoice) { SoundManager.play('shogi_capture'); this.render(); this.showQueenChoiceDialog(); return; }
            SoundManager.playForResult(result, 'shogi', this.game);
            this.autoFlip();
            this.render();
        });
        options.appendChild(promoBtn);

        // No promote option
        const noPromoBtn = document.createElement('div');
        noPromoBtn.className = 'modal-option';
        const noPromoImg = PieceAssets.createShogiPieceImg(piece.type);
        noPromoImg.style.width = '44px';
        noPromoImg.style.height = '44px';
        noPromoBtn.appendChild(noPromoImg);
        noPromoBtn.addEventListener('click', () => {
            overlay.style.display = 'none';
            const result = this.game.executeMove(fromRow, fromCol, toRow, toCol);
            this.clearSelection();
            if (result && result.needsQueenChoice) { SoundManager.play('shogi_capture'); this.render(); this.showQueenChoiceDialog(); return; }
            SoundManager.playForResult(result, 'shogi', this.game);
            this.autoFlip();
            this.render();
        });
        options.appendChild(noPromoBtn);

        overlay.style.display = 'flex';
    },

    showChessPromotionDialog(fromRow, fromCol, toRow, toCol) {
        const overlay = document.getElementById('modal-overlay');
        const title = document.getElementById('modal-title');
        const options = document.getElementById('modal-options');

        title.textContent = 'Promote to:';
        options.innerHTML = '';

        const promoOptions = ['queen', 'rook', 'bishop', 'knight'];

        for (const type of promoOptions) {
            const btn = document.createElement('div');
            btn.className = 'modal-option';
            const img = PieceAssets.createChessPieceImg(type);
            img.style.width = '44px';
            img.style.height = '44px';
            btn.appendChild(img);
            btn.addEventListener('click', () => {
                overlay.style.display = 'none';
                const result = this.game.executeMove(fromRow, fromCol, toRow, toCol, 'promotion', type);
                this.clearSelection();
                SoundManager.playForResult(result, 'chess', this.game);
                this.autoFlip();
                this.render();
            });
            options.appendChild(btn);
        }

        overlay.style.display = 'flex';
    },

    showQueenChoiceDialog() {
        const overlay = document.getElementById('modal-overlay');
        const title = document.getElementById('modal-title');
        const options = document.getElementById('modal-options');

        title.textContent = 'クイーンを捕獲！手駒を選択:';
        options.innerHTML = '';

        const choices = [
            { type: 'hisha', label: '飛車' },
            { type: 'kaku', label: '角行' },
        ];

        for (const choice of choices) {
            const btn = document.createElement('div');
            btn.className = 'modal-option';
            btn.style.height = '72px';
            const img = PieceAssets.createShogiPieceImg(choice.type);
            img.style.width = '44px';
            img.style.height = '44px';
            btn.appendChild(img);

            const label = document.createElement('div');
            label.className = 'modal-option-label';
            label.textContent = choice.label;
            btn.appendChild(label);

            btn.addEventListener('click', () => {
                overlay.style.display = 'none';
                this.game.completeQueenChoice(choice.type);
                SoundManager.playAfterQueenChoice(this.game);
                this.autoFlip();
                this.render();
            });
            options.appendChild(btn);
        }

        overlay.style.display = 'flex';
    },

    clearSelection() {
        this.selectedPiece = null;
        this.selectedHandPiece = null;
        this.legalMoves = [];
    },

    updateStatus() {
        const statusEl = document.getElementById('game-status');

        if (this.game.gameOver) {
            if (this.game.gameResult === 'chess-wins') {
                statusEl.textContent = '\u265A Chess Wins! \u30C1\u30A7\u30B9\u306E\u52DD\u3061\uFF01';
                statusEl.style.color = 'var(--accent-green)';
                this.showGameOver('Chess Wins!', '\u30C1\u30A7\u30B9\u9663\u55B6\u306E\u52DD\u5229\u3067\u3059\u3002\u5C06\u68CB\u306E\u738B\u304C\u8A70\u307F\u307E\u3057\u305F\u3002');
            } else if (this.game.gameResult === 'shogi-wins') {
                statusEl.textContent = '\u7389 Shogi Wins! \u5C06\u68CB\u306E\u52DD\u3061\uFF01';
                statusEl.style.color = 'var(--accent-green)';
                this.showGameOver('Shogi Wins!', '\u5C06\u68CB\u9663\u55B6\u306E\u52DD\u5229\u3067\u3059\u3002\u30C1\u30A7\u30B9\u306E\u30AD\u30F3\u30B0\u304C\u8A70\u307F\u307E\u3057\u305F\u3002');
            } else {
                statusEl.textContent = 'Stalemate / \u5F15\u304D\u5206\u3051';
                statusEl.style.color = 'var(--accent-gold)';
                this.showGameOver('Draw', '\u5F15\u304D\u5206\u3051\u3067\u3059\u3002');
            }
            return;
        }

        const inCheck = this.game.isCurrentSideInCheck();
        if (this.game.currentTurn === 'chess') {
            statusEl.textContent = inCheck ? '\u265A Chess is in CHECK!' : '\u265A Chess (White) to move';
            statusEl.style.color = inCheck ? 'var(--accent-red)' : 'var(--text-primary)';
        } else {
            statusEl.textContent = inCheck ? '\u7389 \u5C06\u68CB \u738B\u624B\uFF01' : '\u7389 Shogi (\u5C06\u68CB) to move';
            statusEl.style.color = inCheck ? 'var(--accent-red)' : 'var(--text-primary)';
        }
    },

    updateTurnIndicators() {
        const chessInd = document.getElementById('turn-chess');
        const shogiInd = document.getElementById('turn-shogi');

        chessInd.classList.toggle('active', this.game.currentTurn === 'chess');
        shogiInd.classList.toggle('active', this.game.currentTurn === 'shogi');
    },

    renderMoveHistory() {
        const histEl = document.getElementById('move-history');
        histEl.innerHTML = '';

        for (let i = 0; i < this.game.moveHistory.length; i += 2) {
            const moveNum = Math.floor(i / 2) + 1;
            const entry = document.createElement('div');
            entry.className = 'move-entry';

            const numSpan = document.createElement('span');
            numSpan.className = 'move-number';
            numSpan.textContent = moveNum + '.';
            entry.appendChild(numSpan);

            const whiteMove = document.createElement('span');
            whiteMove.textContent = this.game.moveHistory[i].notation;
            entry.appendChild(whiteMove);

            if (i + 1 < this.game.moveHistory.length) {
                const blackMove = document.createElement('span');
                blackMove.textContent = this.game.moveHistory[i + 1].notation;
                entry.appendChild(blackMove);
            }

            histEl.appendChild(entry);
        }

        histEl.scrollTop = histEl.scrollHeight;
    },

    showGameOver(title, message) {
        const overlay = document.getElementById('gameover-overlay');
        document.getElementById('gameover-title').textContent = title;
        document.getElementById('gameover-message').textContent = message;
        overlay.style.display = 'flex';
    },

    bindEvents() {
        document.getElementById('btn-new-game').addEventListener('click', () => {
            document.getElementById('gameover-overlay').style.display = 'none';
            this.game.reset();
            this.flipped = false;
            this.clearSelection();
            this.setupCoordinates();
            this.render();
        });

        document.getElementById('btn-flip').addEventListener('click', () => {
            this.flipped = !this.flipped;
            this.setupCoordinates();
            this.render();
        });

        document.getElementById('btn-undo').addEventListener('click', () => {
            if (this.game.moveHistory.length === 0) return;
            this.game.reset();
            this.flipped = false;
            this.clearSelection();
            this.setupCoordinates();
            this.render();
        });

        document.getElementById('btn-play-again').addEventListener('click', () => {
            document.getElementById('gameover-overlay').style.display = 'none';
            this.game.reset();
            this.flipped = false;
            this.clearSelection();
            this.setupCoordinates();
            this.render();
        });

        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            // Don't close promotion modals by clicking outside
        });

        const muteBtn = document.getElementById('btn-mute');
        muteBtn.addEventListener('click', () => {
            const on = SoundManager.toggle();
            muteBtn.innerHTML = on ? '\u266A' : '<span style="opacity:0.4">\u266A</span>';
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearSelection();
                this.render();
            }
            if (e.key === 'f' || e.key === 'F') {
                this.flipped = !this.flipped;
                this.setupCoordinates();
                this.render();
            }
            if (e.key === 'n' || e.key === 'N') {
                if (e.ctrlKey || e.metaKey) return;
                document.getElementById('gameover-overlay').style.display = 'none';
                this.game.reset();
                this.flipped = false;
                this.clearSelection();
                this.setupCoordinates();
                this.render();
            }
        });
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
