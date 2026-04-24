// Game storage: { board, currentPlayer, playerX, playerO, moves }
const games = new Map();

function createBoard() {
    return [
        ['1️⃣', '2️⃣', '3️⃣'],
        ['4️⃣', '5️⃣', '6️⃣'],
        ['7️⃣', '8️⃣', '9️⃣']
    ];
}

function checkWinner(board) {
    // Rows
    for (let i = 0; i < 3; i++) {
        if (board[i][0] === board[i][1] && board[i][1] === board[i][2]) return board[i][0];
    }
    // Columns
    for (let i = 0; i < 3; i++) {
        if (board[0][i] === board[1][i] && board[1][i] === board[2][i]) return board[0][i];
    }
    // Diagonals
    if (board[0][0] === board[1][1] && board[1][1] === board[2][2]) return board[0][0];
    if (board[0][2] === board[1][1] && board[1][1] === board[2][0]) return board[0][2];
    return null;
}

function isDraw(board) {
    return board.every(row => row.every(cell => cell === '❌' || cell === '⭕'));
}

function renderBoard(board) {
    return board.map(row => row.join('│')).join('\n──┼──┼──\n');
}

module.exports = {
    name: 'ttt',
    alias: ['tictactoe', 'xo', 'noughtsandcrosses'],
    desc: 'Play Tic-Tac-Toe with a friend!',
    category: 'Games',
    usage: '.ttt start @opponent | .ttt <position 1-9> | .ttt stop',
    reactions: { start: '🎮', success: '🎭', error: '🏗️' },

    execute: async (sock, m, { args, reply, prefix, mentioned }) => {
        const sub = args[0]?.toLowerCase();
        const chatId = m.chat;
        const userId = m.sender;

        // ── HELP ──────────────────────────────────────────────
        if (!sub) {
            const game = games.get(chatId);
            return reply(
                `╭─❍ *TIC-TAC-TOE*\n│\n` +
                `│ ${game ? '🎮 *Game in progress!*' : '🟢 *Ready to play!*'}\n│\n` +
                `│ ⚉ *Commands:*\n` +
                `│ • ${prefix}ttt start @user\n` +
                `│ • ${prefix}ttt <1-9>\n` +
                `│ • ${prefix}ttt stop\n│\n` +
                `│ 🎮 *Play with a friend!*\n` +
                `╰──────────────────`
            );
        }

        // ── START GAME ───────────────────────────────────────
        if (sub === 'start') {
            if (!mentioned || !mentioned.length) {
                return reply('`✘ Tag the person you want to play with! .ttt start @user`');
            }

            const opponent = mentioned[0];
            if (opponent === userId) return reply('`✘ You cannot play against yourself!`');

            if (games.has(chatId)) return reply('`✘ A game is already in progress! Use .ttt stop first.`');

            // Randomize who goes first
            const first = Math.random() < 0.5 ? userId : opponent;
            
            games.set(chatId, {
                board: createBoard(),
                playerX: first,
                playerO: first === userId ? opponent : userId,
                currentPlayer: first,
                moves: 0
            });

            await sock.sendMessage(m.chat, { react: { text: '🎮', key: m.key } });

            const boardStr = renderBoard(createBoard());
            
            await sock.sendMessage(m.chat, {
                headerText: `## 🎮 Tic-Tac-Toe`,
                contentText: '---',
                title: `${first === userId ? 'You' : 'Opponent'} go first! ❌`,
                table: [
                    ['👤 ❌ (X)', `@${first.split('@')[0]}`],
                    ['👤 ⭕ (O)', `@${first === userId ? opponent.split('@')[0] : userId.split('@')[0]}`],
                    ['🎯 Board', boardStr],
                    ['📝 Move', `${prefix}ttt <1-9>`]
                ],
                footerText: '💡 Pick a number 1-9 to place your mark!'
            }, { quoted: m, mentions: [userId, opponent] });

            return;
        }

        // ── STOP GAME ────────────────────────────────────────
        if (sub === 'stop') {
            if (!games.has(chatId)) return reply('`✘ No active game!`');
            games.delete(chatId);
            await sock.sendMessage(m.chat, { react: { text: '🛑', key: m.key } });
            return reply('`🛑 Game stopped!`');
        }

        // ── MAKE MOVE ────────────────────────────────────────
        const game = games.get(chatId);
        if (!game) return reply(`\`✘ No active game! Use ${prefix}ttt start @user\``);

        if (userId !== game.currentPlayer) {
            return reply('`✘ It\'s not your turn!`');
        }

        const position = parseInt(sub);
        if (isNaN(position) || position < 1 || position > 9) {
            return reply('`✘ Choose a position 1-9`');
        }

        const row = Math.floor((position - 1) / 3);
        const col = (position - 1) % 3;

        if (game.board[row][col] === '❌' || game.board[row][col] === '⭕') {
            return reply('`✘ That spot is already taken!`');
        }

        // Place mark
        const mark = userId === game.playerX ? '❌' : '⭕';
        game.board[row][col] = mark;
        game.moves++;
        game.currentPlayer = game.currentPlayer === game.playerX ? game.playerO : game.playerX;

        const boardStr = renderBoard(game.board);
        const winner = checkWinner(game.board);
        const draw = !winner && isDraw(game.board);

        let status = '';
        if (winner) {
            status = `🎉 ${winner} WINS!`;
            games.delete(chatId);
        } else if (draw) {
            status = '🤝 DRAW!';
            games.delete(chatId);
        } else {
            status = `${mark === '❌' ? '⭕' : '❌'}'s turn`;
        }

        await sock.sendMessage(m.chat, { react: { text: winner ? '🎉' : draw ? '🤝' : '✅', key: m.key } });

        await sock.sendMessage(m.chat, {
            headerText: `## 🎮 Tic-Tac-Toe`,
            contentText: '---',
            title: status,
            table: [
                ['👤 ❌', `@${game.playerX.split('@')[0]}`],
                ['👤 ⭕', `@${game.playerO.split('@')[0]}`],
                ['🎯 Board', boardStr],
                ['📊 Moves', game.moves]
            ],
            footerText: winner || draw ? `💡 Play again: ${prefix}ttt start @user` : `💡 Next: ${prefix}ttt <1-9>`
        }, { quoted: m });

        if (winner || draw) {
            games.delete(chatId);
        }
    }
};
