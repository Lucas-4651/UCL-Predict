const sportyClient = require('./src/api/sportyClient');
const settings = require('./src/config/settings');

async function probeResults() {
    const leagueId = settings.LEAGUE_ID;
    console.log(`Probing Results for League ID: ${leagueId}`);

    try {
        console.log('\n--- Testing getResults ---');
        // Fetch a small sample of results
        const results = await sportyClient.getResults(leagueId, 0, 5);
        console.log('Results Type:', typeof results, 'Is Array:', Array.isArray(results));
        console.log(JSON.stringify(results, null, 2));
    } catch (error) {
        console.error('Probe failed:', error.message);
    }
}

probeResults();
