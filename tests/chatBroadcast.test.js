const http = require('http');
const express = require('express');
const chatService = require('../src/services/chatService');
const realtimeService = require('../src/services/realtimeService');

const router = require('../src/routes/userRoutes');

// App with a fake authenticated session so /send and /react are reachable,
// plus express.json() to mirror the real server config.
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
    req.session = { userId: 1, user: { id: 1, username: 'tester' } };
    next();
});
app.use('/', router);

afterAll(() => {
    try { clearInterval(realtimeService.heartbeat); } catch (e) {}
});

function postJson(path, payload, onEnd) {
    const server = app.listen(0, () => {
        const port = server.address().port;
        const body = JSON.stringify(payload);
        const req = http.request(
            {
                host: '127.0.0.1', port, path, method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
            },
            (res) => {
                let data = '';
                res.on('data', (c) => { data += c; });
                res.on('end', () => onEnd(data, server));
            }
        );
        req.on('error', (err) => server.close(() => onEnd(null, server, err)));
        req.end(body);
    });
}

test('POST /api/chat/send broadcasts a message event over SSE', (done) => {
    const spy = jest.spyOn(realtimeService, 'broadcast');
    const sendSpy = jest.spyOn(chatService, 'sendMessage').mockResolvedValue({
        id: 99, user_name: 'tester', content: 'hello realtime', self: false,
    });

    postJson('/api/chat/send', { content: 'hello realtime' }, (body, server, err) => {
        if (err) { spy.mockRestore(); sendSpy.mockRestore(); return server.close(() => done(err)); }
        const events = spy.mock.calls.map((c) => c[0]);
        const msgEvent = events.find((e) => e.type === 'message');
        expect(msgEvent).toBeDefined();
        expect(msgEvent.message.content).toBe('hello realtime');
        spy.mockRestore();
        sendSpy.mockRestore();
        server.close(() => done());
    });
});

test('POST /api/chat/react broadcasts a reaction event over SSE', (done) => {
    const spy = jest.spyOn(realtimeService, 'broadcast');
    const addSpy = jest.spyOn(chatService, 'addReaction').mockResolvedValue({});
    const dbMock = jest.spyOn(require('../src/config/database'), 'query')
        .mockResolvedValueOnce({ rows: [] })                     // existing check -> not present
        .mockResolvedValueOnce({ rows: [{ reaction: '👍', count: 1 }] }); // group by

    postJson('/api/chat/react', { messageId: 5, reaction: '👍' }, (body, server, err) => {
        if (err) { spy.mockRestore(); addSpy.mockRestore(); dbMock.mockRestore(); return server.close(() => done(err)); }
        const events = spy.mock.calls.map((c) => c[0]);
        const reactEvent = events.find((e) => e.type === 'reaction');
        expect(reactEvent).toBeDefined();
        expect(reactEvent.messageId).toBe(5);
        expect(reactEvent.reactions['👍']).toBe(1);
        spy.mockRestore();
        addSpy.mockRestore();
        dbMock.mockRestore();
        server.close(() => done());
    });
});

test('POST /api/chat/typing broadcasts a typing event over SSE', (done) => {
    const spy = jest.spyOn(realtimeService, 'broadcast');

    postJson('/api/chat/typing', {}, (body, server, err) => {
        if (err) { spy.mockRestore(); return server.close(() => done(err)); }
        const events = spy.mock.calls.map((c) => c[0]);
        const typingEvent = events.find((e) => e.type === 'typing');
        expect(typingEvent).toBeDefined();
        expect(typingEvent.userId).toBe(1);
        expect(typingEvent.username).toBe('tester');
        spy.mockRestore();
        server.close(() => done());
    });
});
