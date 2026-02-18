const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

module.exports = {
    name: 'audio-editor',
    alias: [
        'aspeed', 'apitch', 'avolume', 'anoise',
        'avoice'
    ],
    desc: 'Edit replied audio: speed, pitch, volume, noise removal, voice changers',
    category: 'media',
    usage: 'Reply to audio/voice note + command',
    owner: false,

    execute: async (sock, m, { args, reply }) => {
        // Must reply to audio
        if (!m.quoted) {
            return reply('_*𓄄 Reply to an audio/voice note to edit it!*_');
        }

        const quoted = m.quoted;
        const mtype = quoted.mtype || quoted.type || '';

        if (!['audioMessage', 'audio'].includes(mtype)) {
            return reply('_𓉤 Reply to an *audio* or *voice note*_');
        }

        try {
            await reply('_*✪ Processing audio...*_');

            // Download audio
            const buffer = await m.quoted.download();
            if (!buffer || buffer.length < 1000) {
                return reply('_*✘ Failed to download audio*_');
            }

            const tempInput = path.join(__dirname, `temp_input_${Date.now()}.opus`);
            const tempOutput = path.join(__dirname, `temp_output_${Date.now()}.opus`);

            fs.writeFileSync(tempInput, buffer);

            const command = m.body.toLowerCase().split(/\s+/)[0].slice(1); // remove .
            let ffmpegCmd = ffmpeg(tempInput);

            switch (command) {
                case 'aspeed':
                    const speed = parseFloat(args[0]) || 1.2;
                    if (speed < 0.5 || speed > 3) return reply('Speed must be between 0.5 and 3');
                    ffmpegCmd = ffmpegCmd.audioFilters(`atempo=${speed}`);
                    break;

                case 'apitch':
                    const pitch = parseFloat(args[0]) || 1.2;
                    if (pitch < 0.5 || pitch > 2) return reply('Pitch must be between 0.5 and 2');
                    ffmpegCmd = ffmpegCmd.audioFilters(`rubberband=pitch=${pitch},loudnorm`);
                    break;

                case 'avolume':
                    const vol = parseFloat(args[0]) || 2;
                    if (vol < 0.2 || vol > 5) return reply('Volume multiplier between 0.2 and 5');
                    ffmpegCmd = ffmpegCmd.audioFilters(`volume=${vol}`);
                    break;

                case 'anoise':
                    // Basic noise reduction
                    ffmpegCmd = ffmpegCmd.audioFilters('afftdn=nf=-30');
                    break;

                case 'avoice':
                    const effect = args[0]?.toLowerCase();
                    if (!['deep', 'high', 'robot', 'echo'].includes(effect)) {
                        return reply('Use: .avoice deep | high | robot | echo');
                    }

                    if (effect === 'deep') {
                        ffmpegCmd = ffmpegCmd.audioFilters('rubberband=pitch=0.7,tempo=0.9');
                    } else if (effect === 'high') {
                        ffmpegCmd = ffmpegCmd.audioFilters('rubberband=pitch=1.6,tempo=1.1');
                    } else if (effect === 'robot') {
                        ffmpegCmd = ffmpegCmd.audioFilters('afftdn,highpass=f=200,lowpass=f=3000,volume=1.5');
                    } else if (effect === 'echo') {
                        ffmpegCmd = ffmpegCmd.audioFilters('aecho=0.8:0.88:60:0.4');
                    }
                    break;

                default:
                    return reply('Unknown audio command.\nUse: .aspeed | .apitch | .avolume | .anoise | .avoice <effect>');
            }

            // Output as opus (WhatsApp voice note format)
            await new Promise((resolve, reject) => {
                ffmpegCmd
                    .audioCodec('libopus')
                    .format('ogg')
                    .on('end', resolve)
                    .on('error', reject)
                    .save(tempOutput);
            });

            const editedBuffer = fs.readFileSync(tempOutput);

            // Send as voice note
            await sock.sendMessage(m.key.remoteJid, {
                audio: editedBuffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true // send as voice note
            }, { quoted: m });

            // Clean up temp files
            fs.unlinkSync(tempInput);
            fs.unlinkSync(tempOutput);

            await reply(`✨ Audio edited with .${command}`);

        } catch (err) {
            console.error('[AUDIO-EDITOR ERROR]', err.message || err);
            await reply('_*⚉ Failed to process audio*_\n' + (err.message || 'Unknown error'));
        }
    }
};
