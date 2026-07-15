const http = require('http');
const express = require('express');
const chatService = require('../src/services/chatService');
const realtimeService = require('../src/services/realtimeService');

const router = require('../src/routes/userRoutes');

// App with a fake authenticated session so /send and /react are reachable.
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
    req.session = { user: { id: 1, username: 'tester' } };
    next();
});
app.use('/', router);

// Stop the shared heartbeat so Jest can exit cleanly after this test.
afterAll(() => {
    try { clearInterval(realtimeService.heartbeat); } catch (e) {}
});

test('GET /api/chat/stream sets SSE headers and sends initial state', (done) => {
    const spy = jest.spyOn(chatService, 'getRecentMessages').mockResolvedValue([
        { id: 1, user_name: 'alice', content: 'hi', self: false },
    ]);

    const server = app.listen(0, () => {
        const port = server.address().port;
        const req = http.get({ host: '127.0.0.1', port, path: '/api/chat/stream' }, (res) => {
            expect(res.headers['content-type']).toMatch(/text\/event-stream/);
            let received = '';
            res.on('data', (chunk) => {
                received += chunk.toString();
                if (received.includes('data: ')) {
                    expect(received).toContain('"type"');
                    spy.mockRestore();
                    req.destroy();
                    server.close(() => done());
                }
            });
        });
        req.on('error', (err) => { server.close(() => done(err)); });
    });
});

