const sportyClient = require('./src/api/sportyClient');
const settings = require('./src/config/settings');

async function probe() {
    const leagueId = settings.LEAGUE_ID;
    console.log(`Probing League ID: ${leagueId}`);

    try {
        console.log('\n--- Testing getMatches ---');
        const matches = await sportyClient.getMatches(leagueId);
        console.log('Matches Type:', typeof matches, 'Is Array:', Array.isArray(matches));
        console.log(JSON.stringify(matches, null, 2));

        console.log('\n--- Testing getRanking ---');
        const ranking = await sportyClient.getRanking(leagueId);
        console.log('Ranking Type:', typeof ranking, 'Is Array:', Array.isArray(ranking));
        console.log(JSON.stringify(ranking, null, 2));

        console.log('\n--- Testing getResults ---');
        const results = await sportyClient.getResults(leagueId, 0, 5);
        console.log('Results Type:', typeof results, 'Is Array:', Array.isArray(results));
        console.log(JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('Probe failed:', error.message);
    }
}

probe();
