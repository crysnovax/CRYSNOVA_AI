const axios = require('axios');

module.exports = {
    name: 'livematch',
    alias: ['live', 'match', 'football'],
    desc: 'Get live football match scores',
    category: 'Search',
    usage: '.livematch [team] | .livematch premier | .livematch barcelona',
    reactions: { start: '⚽', success: '✨', error: '❔' },

    execute: async (sock, m, { args, reply, prefix }) => {
        try {
            const teamFilter = args.join(' ') || '';
            
            await sock.sendMessage(m.chat, { react: { text: '⚽', key: m.key } });

            let matches = [];
            let usingFallback = false;

            // Try primary API first
            try {
                const primaryUrl = teamFilter 
                    ? `https://apis.prexzyvilla.site/sports/football?detail=${encodeURIComponent(teamFilter)}`
                    : `https://apis.prexzyvilla.site/sports/football`;
                
                const primaryRes = await axios.get(primaryUrl, {
                    headers: { 'Accept': 'application/json' },
                    timeout: 10000
                });

                // Transform primary API response
                if (primaryRes.data && primaryRes.data.data && primaryRes.data.data.matches) {
                    matches = transformPrimaryResponse(primaryRes.data.data.matches);
                }

                if (!matches || matches.length === 0) {
                    throw new Error('No matches from primary API');
                }
            } catch (primaryError) {
                console.log('[PRIMARY API FAILED] Trying fallback...', primaryError.message);
                
                // Fallback to original API
                try {
                    const fallbackUrl = `https://livematch.crysnovax.workers.dev/?team=${encodeURIComponent(teamFilter)}`;
                    const fallbackRes = await axios.get(fallbackUrl, {
                        headers: { 'Accept': 'application/json' },
                        timeout: 15000
                    });

                    matches = fallbackRes.data || [];
                    usingFallback = true;
                } catch (fallbackError) {
                    console.error('[BOTH APIs FAILED]', fallbackError.message);
                    throw new Error('Both APIs failed');
                }
            }

            if (!matches || matches.length === 0) {
                await sock.sendMessage(m.chat, { react: { text: '💤', key: m.key } });
                return reply(`\`⚽ No live matches found${teamFilter ? ` for "${teamFilter}"` : ''}\``);
            }

            // If no filter, show top 10 popular matches
            const displayMatches = teamFilter ? matches : matches.slice(0, 10);

            if (displayMatches.length === 1) {
                // Single match - detailed view
                const match = displayMatches[0];
                
                await sock.sendMessage(m.chat, {
                    headerText: `## ⚽ ${match.team1} vs ${match.team2}`,
                    contentText: '---',
                    title: '📊 Match Details',
                    table: [
                        ['🏆 League', match.league || 'N/A'],
                        ['📊 Status', match.status || 'N/A'],
                        ['⚽ Score', match.score || '0 - 0'],
                        ['⏱️ Time', match.time || 'N/A']
                    ],
                    footerText: `💡 Live scores${usingFallback ? ' (Fallback)' : ''} • Powered by CRYSNOVA AI`
                }, { quoted: m });
            } else {
                // Multiple matches - table view
                const tableData = [['#', '⚽ Match', '🏆 League', '📊 Score']];
                
                for (let i = 0; i < displayMatches.length; i++) {
                    const match = displayMatches[i];
                    const teams = `${match.team1.slice(0, 12)} vs ${match.team2.slice(0, 12)}`;
                    const league = (match.league || 'N/A').slice(0, 15);
                    const score = match.score || '0 - 0';
                    
                    tableData.push([`${i + 1}`, teams, league, score]);
                }

                const headerText = teamFilter 
                    ? `## ⚽ Results for "${teamFilter}"`
                    : `## ⚽ Live Matches`;

                await sock.sendMessage(m.chat, {
                    headerText: headerText,
                    contentText: '---',
                    title: `📊 ${displayMatches.length} Match${displayMatches.length > 1 ? 'es' : ''}`,
                    table: tableData,
                    footerText: `💡 SWIPE ⇆ • Use ${prefix}livematch <team> to search${usingFallback ? ' (Fallback)' : ''}`
                }, { quoted: m });
            }

            await sock.sendMessage(m.chat, { react: { text: '🔖', key: m.key } });

        } catch (err) {
            console.error('[LIVEMATCH ERROR]', err.message);
            await sock.sendMessage(m.chat, { react: { text: '🙊', key: m.key } });
            reply('`✘ Failed to fetch live matches`');
        }
    }
};

// Helper function to transform primary API response
function transformPrimaryResponse(matches) {
    if (!Array.isArray(matches)) return [];
    
    return matches.map(match => {
        // Determine match status based on state field
        let status = 'Scheduled';
        if (match.state === 1) status = 'Live';
        else if (match.state === 3) status = 'Half Time';
        else if (match.state === -1) status = 'Finished';
        
        // Calculate match time if live
        let time = 'N/A';
        if (match.state === 1 && match.startTime_t) {
            const elapsed = Math.floor((Date.now() - match.startTime_t) / 60000);
            time = `${elapsed}'`;
        } else if (match.state === 3) {
            time = 'HT';
        } else if (match.state === -1) {
            time = 'FT';
        }

        return {
            team1: match.homeName || 'Unknown',
            team2: match.awayName || 'Unknown',
            league: match.leagueEn || 'N/A',
            status: status,
            score: `${match.homeScore || 0} - ${match.awayScore || 0}`,
            time: time
        };
    });
    }
