const realtimeService = require('../src/services/realtimeService');

function makeFakeRes() {
    const chunks = [];
    const res = {
        write: (chunk) => { chunks.push(chunk); return true; },
        flush: () => {},
        on: (event, cb) => { res._close = cb; },
        getChunks: () => chunks.join(''),
    };
    return res;
}

test('broadcast writes SSE event to all connected clients', () => {
    const res = makeFakeRes();
    realtimeService.addClient(res);
    realtimeService.broadcast({ type: 'ping' });
    const out = res.getChunks();
    expect(out).toContain('data: ');
    expect(out).toContain('"type":"ping"');
    expect(out).toContain('\n\n');
    realtimeService.removeClient(res);
});

test('removeClient stops receiving broadcasts', () => {
    const res = makeFakeRes();
    realtimeService.addClient(res);
    realtimeService.removeClient(res);
    realtimeService.broadcast({ type: 'message', message: { id: 1 } });
    expect(res.getChunks()).toBe('');
});

test('setPresence adds client and getPresenceList returns usernames', () => {
    realtimeService.setPresence('c1', { userId: 1, username: 'alice' });
    realtimeService.setPresence('c2', { userId: 2, username: 'bob' });
    const list = realtimeService.getPresenceList();
    expect(list.map(u => u.username).sort()).toEqual(['alice', 'bob']);
    expect(list.length).toBe(2);
    realtimeService.removePresence('c1');
});

test('removePresence removes client from presence list', () => {
    realtimeService.setPresence('cX', { userId: 9, username: 'carol' });
    realtimeService.removePresence('cX');
    expect(realtimeService.getPresenceList().find(u => u.username === 'carol')).toBeUndefined();
});
