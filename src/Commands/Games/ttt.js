const games = new Map();

function createBoard() {
    return [
        ['1️⃣', '2️⃣', '3️⃣'],
        ['4️⃣', '5️⃣', '6️⃣'],
        ['7️⃣', '8️⃣', '9️⃣']
    ];
}

function checkWinner(board) {
    for (let i = 0; i < 3; i++) {
        if (board[i][0] === board[i][1] && board[i][1] === board[i][2]) return board[i][0];
    }
    for (let i = 0; i < 3; i++) {
        if (board[0][i] === board[1][i] && board[1][i] === board[2][i]) return board[0][i];
    }
    if (board[0][0] === board[1][1] && board[1][1] === board[2][2]) return board[0][0];
    if (board[0][2] === board[1][1] && board[1][1] === board[2][0]) return board[0][2];
    return null;
}

function isDraw(board) {
    return board.every(row => row.every(cell => cell === '❌' || cell === '⭕'));
}

function posToCoords(pos) {
    return { row: Math.floor((pos - 1) / 3), col: (pos - 1) % 3 };
}

// Shared move handler
async function handleMove(sock, m, game, position, reply, prefix, chatId, userId) {
    if (userId !== game.currentPlayer) {
        return reply('`✘ It\'s not your turn!`');
    }

    const { row, col } = posToCoords(position);

    if (game.board[row][col] === '❌' || game.board[row][col] === '⭕') {
        return reply('`✘ That spot is already taken!`');
    }

    const mark = userId === game.playerX ? '❌' : '⭕';
    game.board[row][col] = mark;
    game.moves++;
    game.currentPlayer = game.currentPlayer === game.playerX ? game.playerO : game.playerX;

    const winner = checkWinner(game.board);
    const draw = !winner && isDraw(game.board);

    let status = '';
    if (winner) {
        const winnerJid = winner === '❌' ? game.playerX : game.playerO;
        status = `🎉 @${winnerJid.split('@')[0]} WINS!`;
    } else if (draw) {
        status = '🤝 DRAW!';
    } else {
        status = `⏳ ${game.currentPlayer === game.playerX ? '❌' : '⭕'}'s turn`;
    }

    await sock.sendMessage(m.chat, { react: { text: winner ? '🎉' : draw ? '🤝' : '🎭', key: m.key } });

    const tableData = [
        ['👤 ❌ (X)', `@${game.playerX.split('@')[0]}`],
        ['👤 ⭕ (O)', `@${game.playerO.split('@')[0]}`],
        ['📊 Status', status],
        ['', ''],
        ['🎯 Board', ''],
        ['Row 1', game.board[0].join(' │ ')],
        ['Row 2', game.board[1].join(' │ ')],
        ['Row 3', game.board[2].join(' │ ')],
        ['', ''],
        ['📊 Moves', game.moves]
    ];

    const sent = await sock.sendMessage(m.chat, {
        headerText: `## 🎮 Tic-Tac-Toe`,
        contentText: '---',
        title: status,
        table: tableData,
        footerText: winner || draw 
            ? `💡 Play again: ${prefix}ttt start @user` 
            : `💡 Reply with *1-9* to play!`
    }, { 
        quoted: m,
        mentions: [game.playerX, game.playerO]
    });

    if (winner || draw) {
        games.delete(chatId);
    } else {
        game.messageId = sent.key.id;
        games.set(chatId, game);
    }
}

// Pre-command handler for reply-to-play
async function handleGameReply(sock, m) {
    const chatId = m.chat;
    const userId = m.sender;
    const game = games.get(chatId);
    
    if (!game) return false;
    if (userId !== game.playerX && userId !== game.playerO) return false;
    
    const quotedId = m.message?.extendedTextMessage?.contextInfo?.stanzaId;
    if (!quotedId || quotedId !== game.messageId) return false;
    
    const text = m.text?.trim() || '';
    const pos = parseInt(text);
    if (isNaN(pos) || pos < 1 || pos > 9) return false;
    
    const mockReply = async (txt) => {
        await sock.sendMessage(chatId, { text: txt }, { quoted: m });
    };
    
    await handleMove(sock, m, game, pos, mockReply, '.', chatId, userId);
    return true;
}

module.exports = {
    name: 'ttt',
    alias: ['tictactoe', 'xo'],
    desc: 'Play Tic-Tac-Toe with a friend!',
    category: 'Games',
    usage: '.ttt start @opponent | .ttt <1-9> | .ttt stop',
    reactions: { start: '🎮', success: '🎭', error: '🏗️' },

    handleGameReply,

    execute: async (sock, m, { args, reply, prefix }) => {
        const sub = args[0]?.toLowerCase();
        const chatId = m.chat;
        const userId = m.sender;

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

        if (sub === 'start') {
            let opponent = null;
            if (m.quoted?.sender) opponent = m.quoted.sender;
            if (!opponent && m.mentionedJid?.length) opponent = m.mentionedJid[0];
            if (!opponent) {
                for (const arg of args.slice(1)) {
                    const num = arg.replace(/[^0-9]/g, '');
                    if (num.length >= 7) { opponent = num + '@s.whatsapp.net'; break; }
                }
            }

            if (!opponent) return reply('`✘ Tag the person you want to play with! .ttt start @user`');
            if (opponent === userId) return reply('`✘ You cannot play against yourself!`');
            if (games.has(chatId)) return reply('`✘ A game is already in progress! Use .ttt stop first.`');

            const first = Math.random() < 0.5 ? userId : opponent;
            
            const game = {
                board: createBoard(),
                playerX: first,
                playerO: first === userId ? opponent : userId,
                currentPlayer: first,
                moves: 0
            };

            games.set(chatId, game);

            await sock.sendMessage(m.chat, { react: { text: '🎮', key: m.key } });

            const tableData = [
                ['👤 ❌ (X)', `@${first.split('@')[0]} ${first === userId ? '(You)' : ''}`],
                ['👤 ⭕ (O)', `@${first === userId ? opponent.split('@')[0] : userId.split('@')[0]}`],
                ['🎯 First', `${first === userId ? 'You' : 'Opponent'} go first! ❌`],
                ['', ''],
                ['🎯 Board', ''],
                ['Row 1', '1️⃣ │ 2️⃣ │ 3️⃣'],
                ['Row 2', '4️⃣ │ 5️⃣ │ 6️⃣'],
                ['Row 3', '7️⃣ │ 8️⃣ │ 9️⃣']
            ];

            const sent = await sock.sendMessage(m.chat, {
                headerText: `## 🎮 Tic-Tac-Toe`,
                contentText: '---',
                title: '🟢 Game Started!',
                table: tableData,
                footerText: '💡 Reply with *1-9* to play!'
            }, { 
                quoted: m,
                mentions: [userId, opponent]
            });

            game.messageId = sent.key.id;
            games.set(chatId, game);
            return;
        }

        if (sub === 'stop') {
            if (!games.has(chatId)) return reply('`✘ No active game!`');
            games.delete(chatId);
            await sock.sendMessage(m.chat, { react: { text: '🛑', key: m.key } });
            return reply('`🛑 Game stopped!`');
        }

        const game = games.get(chatId);
        if (!game) return reply(`\`✘ No active game! Use ${prefix}ttt start @user\``);

        const position = parseInt(sub);
        if (isNaN(position) || position < 1 || position > 9) {
            return reply('`✘ Choose a position 1-9`');
        }

        return await handleMove(sock, m, game, position, reply, prefix, chatId, userId);
    }
};
