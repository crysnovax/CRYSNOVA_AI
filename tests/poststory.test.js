const test = require('node:test');
const assert = require('node:assert/strict');

const postStory = require('../src/Commands/Owner/poststory');

test('builds a deduplicated all-contacts audience and excludes the bot', () => {
    const store = {
        contacts: new Map([
            ['15550001@s.whatsapp.net', { id: '15550001@s.whatsapp.net' }],
            ['15550002@lid', { id: '15550002@lid', phoneNumber: '15550002@s.whatsapp.net' }],
            ['15550003@s.whatsapp.net', { phoneNumber: '+1 555 0003' }],
            ['120363000@g.us', { id: '120363000@g.us' }],
            ['status@broadcast', { id: 'status@broadcast' }],
        ])
    };

    assert.deepEqual(
        postStory.getStatusRecipients(store, '15550001:12@s.whatsapp.net'),
        ['15550002@s.whatsapp.net', '15550003@s.whatsapp.net']
    );
});

test('builds text and media story payloads', async () => {
    assert.deepEqual(await postStory.buildStoryContent({}, 'hello'), { text: 'hello' });

    const image = Buffer.from('image');
    const imageContent = await postStory.buildStoryContent({
        quoted: {
            mtype: 'imageMessage',
            caption: 'original caption',
            download: async () => image,
        }
    }, 'new caption');
    assert.deepEqual(imageContent, { image, caption: 'new caption' });

    const audio = Buffer.from('audio');
    const audioContent = await postStory.buildStoryContent({
        quoted: {
            mtype: 'audioMessage',
            mimetype: 'audio/ogg; codecs=opus',
            download: async () => audio,
        }
    }, '');
    assert.deepEqual(audioContent, {
        audio,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: false,
    });
});

test('posts through status@broadcast using Baileys 2.6.9 status fields', async () => {
    const sent = [];
    const replies = [];
    const sock = {
        user: { id: '15550001:1@s.whatsapp.net' },
        sendMessage: async (jid, content) => {
            sent.push({ jid, content });
            return { key: { id: 'story-id' } };
        },
    };
    const store = {
        contacts: {
            '15550001@s.whatsapp.net': { id: '15550001@s.whatsapp.net' },
            '15550002@s.whatsapp.net': { id: '15550002@s.whatsapp.net' },
        }
    };

    await postStory.execute(sock, {}, {
        text: 'A new story',
        store,
        reply: async text => replies.push(text),
    });

    assert.equal(sent[0].jid, 'status@broadcast');
    assert.equal(sent[0].content.status, true);
    assert.deepEqual(sent[0].content.statusJidList, ['15550002@s.whatsapp.net']);
    assert.equal(sent[0].content.text, 'A new story');
    assert.match(replies[0], /posted to 1 contact/i);
});
