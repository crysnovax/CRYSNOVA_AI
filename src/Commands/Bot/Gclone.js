const axios = require('axios');

module.exports = {
    name: 'gitclone',
    alias: ['clone', 'git', 'downloadrepo'],
    desc: 'Download any GitHub repository as ZIP and send it',
    category: 'Owner',
    ownerOnly: true,
    reactions: { start: '📥', success: '👾' },

    execute: async (sock, m, { args, reply }) => {
        if (!args[0]) {
            return reply(
                `📥 *GitClone Command*\n\n` +
                `Usage: .gitclone <GitHub repo URL>\n\n` +
                `Example:\n` +
                `• .gitclone https://github.com/crysnovax/CRYSNOVA_AI`
            );
        }

        let repoUrl = args[0].trim();

        if (repoUrl.endsWith('.git')) repoUrl = repoUrl.slice(0, -4);
        if (!repoUrl.includes('github.com')) {
            return reply('_*✘ Invalid GitHub URL.*_');
        }

        const parts = repoUrl.split('/').filter(Boolean);
        const owner = parts[parts.length - 2];
        const repo = parts[parts.length - 1];

        if (!owner || !repo) {
            return reply('_*⚉ Invalid GitHub URL format.*_');
        }

        const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/main.zip`;
        const fallbackUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/master.zip`;

        //await reply(`📥 Downloading...\n\nRepo: ${owner}/${repo}`);

        try {
            const res = await axios.get(zipUrl, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            await sock.sendMessage(m.chat, {
                document: Buffer.from(res.data),
                mimetype: 'application/zip',
                fileName: `❏⋆⁩⁩${repo}.zip`,
                caption: ` ❏◈${owner}`,
                      //    `    ${repo}`,
            }, { quoted: m });

        } catch (err) {
            // fallback to master
            try {
                const res2 = await axios.get(fallbackUrl, {
                    responseType: 'arraybuffer'
                });

                await sock.sendMessage(m.chat, {
                    document: Buffer.from(res2.data),
                    mimetype: 'application/zip',
                    fileName: `❏⋆ ${repo}.zip`,
                    caption: `❏◈${owner}/${repo}`
                }, { quoted: m });

            } catch {
                reply(`_*𓉤 Failed. Repo may not exist or is private.*_`);
            }
        }
    }
};
