const client = require('../src/api/sportyClient');

test('getMatches returns valid rounds', async () => {
    const leagueId = 8056;
    const data = await client.getMatches(leagueId);
    expect(data).toBeDefined();
    expect(data).toHaveProperty('rounds');
    expect(Array.isArray(data.rounds)).toBe(true);
});
