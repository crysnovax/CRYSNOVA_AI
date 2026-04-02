// ╔══════════════════════════════════════════════════╗
// ║  SHAZAM - Audio Recognition Command              ║
// ║  Uses ACRCloud API via Core/•.js config          ║
// ╚══════════════════════════════════════════════════╝

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const FormData = require('form-data');
const fetch = require('node-fetch');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Import ACRCloud config from Core/•.js
const { ACR_CLOUD } = require('../Core/•.js');

// Store active shazam sessions for reply handling
const activeShazamSessions = new Map();

// ═══════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════

const buildStringToSign = (method, uri, accessKey, dataType, signatureVersion, timestamp) => {
    return [method, uri, accessKey, dataType, signatureVersion, timestamp].join('\n');
};

const sign = (signString, accessSecret) => {
    return crypto.createHmac('sha1', accessSecret)
        .update(Buffer.from(signString, 'utf8'))
        .digest()
        .toString('base64');
};

const audioCut = async (inputPath, start, duration) => {
    const outputPath = inputPath.replace(/\.[^.]+$/, '') + '_cut.mp3';
    
    try {
        await exec(`ffmpeg -i "${inputPath}" -ss ${start} -t ${duration} -acodec libmp3lame -ar 44100 -ac 1 -b:a 128k "${outputPath}" -y`);
        
        if (!fs.existsSync(outputPath)) {
            throw new Error('FFmpeg failed to create output file');
        }
        
        const data = fs.readFileSync(outputPath);
        return { data, path: outputPath };
    } catch (error) {
        throw new Error(`Audio processing failed: ${error.message}`);
    }
};

const ensureTempDir = () => {
    const tempDir = path.join(__dirname, '../../../temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    return tempDir;
};

const cleanupFiles = (files) => {
    files.forEach(file => {
        try {
            if (file && fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        } catch (e) {}
    });
};

// ═══════════════════════════════════════════════════
// YouTube Download Helpers
// ═══════════════════════════════════════════════════

const ytdl = require('ytdl-core');
const yts = require('yt-search');

const downloadAudio = async (url) => {
    try {
        const info = await ytdl.getInfo(url);
        const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
        return { url: format.url, title: info.videoDetails.title };
    } catch (e) {
        throw new Error('Failed to get audio URL');
    }
};

const downloadVideo = async (url) => {
    try {
        const info = await ytdl.getInfo(url);
        const format = ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'videoandaudio' });
        return { url: format.url, title: info.videoDetails.title };
    } catch (e) {
        throw new Error('Failed to get video URL');
    }
};

const searchYouTube = async (query) => {
    try {
        const result = await yts(query);
        return result.videos[0] || null;
    } catch (e) {
        console.log('[SHAZAM] YouTube search error:', e.message);
        return null;
    }
};

// ═══════════════════════════════════════════════════
// Reply Handler - Call this from your message handler
// ═══════════════════════════════════════════════════

const handleShazamReply = async (sock, m, reply) => {
    const sessionKey = `${m.chat}:${m.sender}`;
    const session = activeShazamSessions.get(sessionKey);
    
    if (!session) return false; // Not a reply to shazam
    
    // Check if reply is to our shazam message
    const quotedId = m.quoted?.id || m.message?.extendedTextMessage?.contextInfo?.stanzaId;
    if (quotedId !== session.messageId) return false;
    
    // Clear session
    activeShazamSessions.delete(sessionKey);
    
    const response = m.text?.toLowerCase().trim();
  //  console.log(`[SHAZAM] Got reply: ${response}`);
    
    // Validate response
    if (!['1', '2', 'audio', 'video'].includes(response)) {
        await reply('╭─❍ *SHA⚉AM*\n│\n│ ✘ Invalid option\n│ ⚉ Reply 1 for audio or 2 for video\n╰──────────────────');
        return true;
    }
    
    const wantAudio = response === '1' || response === 'audio';
    
    // React to show processing
    await sock.sendMessage(m.chat, {
        react: { text: '⬇️', key: m.key }
    }).catch(() => {});
    
    try {
        if (!session.ytUrl) {
            return reply('╭─❍ *SHA⚉AM*\n│\n│ ✘ YouTube link not available\n│ ⚉ Cannot download\n╰──────────────────');
        }
        
        if (wantAudio) {
            await reply('╭─❍ *SHA⚉AM*\n│\n│ ⚉ Downloading audio...\n╰──────────────────');
            const audio = await downloadAudio(session.ytUrl);
            
            await sock.sendMessage(m.chat, {
                audio: { url: audio.url },
                mimetype: 'audio/mpeg',
                fileName: `${session.title}.mp3`
            }, { quoted: m });
            
        } else {
            await reply('╭─❍ *SHA⚉AM*\n│\n│ ⚉ Downloading video...\n╰──────────────────');
            const video = await downloadVideo(session.ytUrl);
            
            await sock.sendMessage(m.chat, {
                video: { url: video.url },
                caption: `╭─❍ *𓄄 ${session.title}*\n╰──────────────────`
            }, { quoted: m });
        }
        
        // Success reaction
        await sock.sendMessage(m.chat, {
            react: { text: '✨', key: m.key }
        }).catch(() => {});
        
    } catch (error) {
  //      console.error('[SHAZAM DOWNLOAD ERROR]', error);
        await reply(`╭─❍ *SHA⚉AM*\n│\n│ ✘ Download failed\n│ ⚉ ${error.message}\n╰──────────────────`);
    }
    
    return true; // Handled
};

// ═══════════════════════════════════════════════════
// Main Command
// ═══════════════════════════════════════════════════

module.exports = {
    name: 'shazam',
    alias: ['findaudio', 'find', 'identifyaudio', 'whatmusic', 'music'],
    desc: 'Identify music from replied audio/video message',
    category: 'Search',
    usage: 'Reply to audio/video with .shazam',
    react: '🎵',
    
    // Export reply handler
    handleShazamReply,
    
    execute: async (sock, m, { args, reply, prefix }) => {
        const tempDir = ensureTempDir();
        let mediaPath = null;
        let cutAudio = null;
        
        try {
            // Check for quoted message
      //      console.log('[SHAZAM] Checking m.quoted:', m.quoted ? 'exists' : 'null');
       //     console.log('[SHAZAM] m.quoted.mtype:', m.quoted?.mtype);
            
            const isAudio = m.quoted?.mtype === 'audioMessage' || 
                           m.quoted?.mtype === 'ptvMessage' ||
                           m.quoted?.mimetype?.startsWith('audio/');
                           
            const isVideo = m.quoted?.mtype === 'videoMessage' ||
                           m.quoted?.mimetype?.startsWith('video/');
            
        //    console.log('[SHAZAM] Detection:', { isAudio, isVideo, mtype: m.quoted?.mtype });
            
            if (!isAudio && !isVideo) {
                return reply(
                    `╭─❍ *SHA𓄄AM*\n│\n` +
                    `│ ✘ *Must be audio or video*\n│\n` +
                    `│ ⚉ Reply to a voice note, audio file,\n` +
                    `│   or video with sound\n│\n` +
                    `│ ಠ_ಠ *Detected mtype:* ${m.quoted?.mtype || 'none'}\n` +
                    `╰──────────────────`
                );
            }
            
            // Send processing reaction
            await sock.sendMessage(m.chat, {
                react: { text: '🔍', key: m.key }
            }).catch(() => {});
            
            // Download using m.quoted.download()
        //    console.log('[SHAZAM] Starting download...');
            
            if (!m.quoted.download) {
                throw new Error('Download method not available on quoted message');
            }
            
            const stream = await m.quoted.download();
    //        console.log('[SHAZAM] Downloaded bytes:', stream?.length);
            
            if (!stream || stream.length === 0) {
                throw new Error('Downloaded stream is empty');
            }
            
            // Save to temp file
            const ext = isVideo ? 'mp4' : 'mp3';
            mediaPath = path.join(tempDir, `shazam_${Date.now()}.${ext}`);
            fs.writeFileSync(mediaPath, stream);
   //         console.log('[SHAZAM] Saved to:', mediaPath);
            
            // Cut audio to 15 seconds
            cutAudio = await audioCut(mediaPath, 0, 15);
   //         console.log('[SHAZAM] Audio cut, bytes:', cutAudio.data.length);
            
            // Build ACRCloud request
            const timestamp = Math.floor(Date.now() / 1000);
            const stringToSign = buildStringToSign(
                'POST',
                ACR_CLOUD.endpoint,
                ACR_CLOUD.access_key,
                ACR_CLOUD.data_type,
                ACR_CLOUD.signature_version,
                timestamp
            );
            const signature = sign(stringToSign, ACR_CLOUD.access_secret);
            
            // Create form data
            const form = new FormData();
            form.append('sample', cutAudio.data, { 
                filename: 'sample.mp3',
                contentType: 'audio/mpeg'
            });
            form.append('sample_bytes', cutAudio.data.length);
            form.append('access_key', ACR_CLOUD.access_key);
            form.append('data_type', ACR_CLOUD.data_type);
            form.append('signature_version', ACR_CLOUD.signature_version);
            form.append('signature', signature);
            form.append('timestamp', timestamp);
            
            // Send to ACRCloud
            const acrUrl = `http://${ACR_CLOUD.host}${ACR_CLOUD.endpoint}`;
      //      console.log(`[SHAZAM] Sending to ACRCloud...`);
            
            const response = await fetch(acrUrl, {
                method: 'POST',
                body: form,
                timeout: 30000
            });
            
            const result = await response.json();
      //      console.log('[SHAZAM] ACRCloud status:', result.status);
            
            // Check result
            if (result.status.code !== 0) {
                return reply(
                    `╭─❍ *SHA𓄄AM*\n│\n` +
                    `│ ✘ *Could not identify*\n│\n` +
                    `│ ⚉ ${result.status.msg || 'Try clearer audio'}\n` +
                    `│彡 Code: ${result.status.code}\n` +
                    `╰──────────────────`
                );
            }
            
            if (!result.metadata?.music?.length) {
                return reply(
                    `╭─❍ *SHA𓄄AM*\n│\n` +
                    `│ ✘ *No match found*\n│\n` +
                    `│ ⚉ Song not in database\n` +
                    `│ ಥ⁠‿⁠ಥ Try with clearer audio\n` +
                    `╰──────────────────`
                );
            }
            
            // Get track info
            const track = result.metadata.music[0];
            const artist = track.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
            const title = track.title || 'Unknown Title';
            const album = track.album?.name || 'Unknown Album';
            const releaseDate = track.release_date || 'N/A';
            const duration = track.duration_ms ? `${Math.floor(track.duration_ms / 1000)}s` : 'N/A';
            
            // Search YouTube for extra info
            const ytInfo = await searchYouTube(`${title} ${artist}`);
            
            // Build response
            let responseText = `╭─❍ *𓄄 SONG IDENTIFIED*\n│\n`;
            responseText += `│ ㉨⁠ *Title:* ${title}\n`;
            responseText += `│ 𓄄 *Artist:* ${artist}\n`;
            responseText += `│ ✦ *Album:* ${album}\n`;
            responseText += `│ ❏♪⁠ *Released:* ${releaseDate}\n`;
            responseText += `│ ☬ *Duration:* ${duration}\n│\n`;
            
            // External links
            const spotify = track.external_metadata?.spotify?.track;
            const youtube = track.external_metadata?.youtube;
            
            responseText += `│ *➫ Listen On:*\n`;
            if (spotify?.id) {
                responseText += `│   🎵 Spotify\n`;
                responseText += `│   spotify.com/track/${spotify.id}\n`;
            }
            if (youtube?.vid) {
                responseText += `│   📺 YouTube\n`;
                responseText += `│   youtube.com/watch?v=${youtube.vid}\n`;
            }
            if (ytInfo?.url) {
                responseText += `│   🔗 YT Search: ${ytInfo.url}\n`;
            }
            
            // YouTube stats if available
            if (ytInfo) {
                responseText += `│\n│ *➫ YouTube Stats:*\n`;
                responseText += `│  ಠ_ಠ ${ytInfo.views?.toLocaleString() || 'N/A'} views\n`;
                responseText += `│   彡 ${ytInfo.duration?.timestamp || 'N/A'}\n`;
            }
            
            responseText += `│\n│ ⚉ *Reply with:*\n`;
            responseText += `│   1 → download audio\n`;
            responseText += `│   2 → download video\n`;
            responseText += `╰──────────────────`;
            
            // Get thumbnail
            let thumbnailUrl = 'https://via.placeholder.com/400x400/1a1a2e/ffffff?text=NO+COVER';
            
            if (ytInfo?.thumbnail) {
                thumbnailUrl = ytInfo.thumbnail;
            } else if (spotify?.album?.id) {
                thumbnailUrl = `https://i.scdn.co/image/${spotify.album.id}`;
            } else if (track.album?.cover) {
                thumbnailUrl = track.album.cover;
            }
            
            // Send result
            const sentMsg = await sock.sendMessage(m.chat, {
                image: { url: thumbnailUrl },
                caption: responseText
            }, { quoted: m });
            
            // Store session for reply handling
            const sessionKey = `${m.chat}:${m.sender}`;
            activeShazamSessions.set(sessionKey, {
                messageId: sentMsg.key.id,
                ytUrl: ytInfo?.url || null,
                title: title,
                timestamp: Date.now()
            });
            
            // Auto-cleanup after 2 minutes
            setTimeout(() => {
                activeShazamSessions.delete(sessionKey);
            }, 120000);
            
            // React success
            await sock.sendMessage(m.chat, {
                react: { text: '🎶', key: m.key }
            }).catch(() => {});
            
        } catch (error) {
         //   console.error('[SHAZAM ERROR]', error);
            
            let errorMsg = error.message;
            if (error.message.includes('ffmpeg')) {
                errorMsg = 'FFmpeg not installed or failed';
            } else if (error.message.includes('fetch')) {
                errorMsg = 'Network error - check connection';
            } else if (error.message.includes('ENOENT')) {
                errorMsg = 'File system error';
            }
            
            return reply(
                `╭─❍ *SHA⚉AM*\n│\n` +
                `│ ✘ *Error*\n│\n` +
                `│ ⚉ ${errorMsg}\n` +
                `╰──────────────────`
            );
            
        } finally {
            // Cleanup
            cleanupFiles([mediaPath, cutAudio?.path]);
        }
    }
};

