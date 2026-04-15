class MemoryRecoveryService {
    async purgeCache() {
        console.log('[MemoryRecovery] Purging internal caches to free RAM...');
        // In a real system, this would clear LRU caches or Map objects
        if (global.predictionCache) {
            global.predictionCache.clear();
        }
    }

    async checkAndRecover() {
        const ramUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        if (ramUsage > 400) { // Threshold 400MB
            console.log(`[MemoryRecovery] High RAM usage detected: ${ramUsage.toFixed(2)}MB. Purging...`);
            await this.purgeCache();
        }
    }
}

module.exports = new MemoryRecoveryService();
