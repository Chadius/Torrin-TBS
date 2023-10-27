import {MissionStatistics, MissionStatisticsHandler} from "./missionStatistics";

describe("MissionStatistics", () => {
    it('can track time elapsed', () => {
        const stats: MissionStatistics = MissionStatisticsHandler.new();
        expect(stats.timeElapsedInMilliseconds).toBeUndefined();
        MissionStatisticsHandler.reset(stats);
        MissionStatisticsHandler.startRecording(stats);
        expect(stats.timeElapsedInMilliseconds).toBe(0);
        MissionStatisticsHandler.addTimeElapsed(stats, 100);
        expect(stats.timeElapsedInMilliseconds).toBe(100);
    });

    it('can track damage dealt by player controlled squaddies', () => {
        const stats: MissionStatistics = MissionStatisticsHandler.new();
        expect(stats.damageDealtByPlayerTeam).toBeUndefined();
        MissionStatisticsHandler.reset(stats);
        MissionStatisticsHandler.startRecording(stats);
        expect(stats.damageDealtByPlayerTeam).toBe(0);
        MissionStatisticsHandler.addDamageDealtByPlayerTeam(stats, 5);
        expect(stats.damageDealtByPlayerTeam).toBe(5);
    });

    it('can track damage received by player controlled squaddies', () => {
        const stats: MissionStatistics = MissionStatisticsHandler.new();
        expect(stats.damageTakenByPlayerTeam).toBeUndefined();
        MissionStatisticsHandler.reset(stats);
        MissionStatisticsHandler.startRecording(stats);
        expect(stats.damageTakenByPlayerTeam).toBe(0);
        MissionStatisticsHandler.addDamageTakenByPlayerTeam(stats, 2);
        expect(stats.damageTakenByPlayerTeam).toBe(2);
    });

    it('can track healing received by player controlled squaddies', () => {
        const stats: MissionStatistics = MissionStatisticsHandler.new();
        expect(stats.healingReceivedByPlayerTeam).toBeUndefined();
        MissionStatisticsHandler.reset(stats);
        MissionStatisticsHandler.startRecording(stats);
        expect(stats.healingReceivedByPlayerTeam).toBe(0);
        MissionStatisticsHandler.addHealingReceivedByPlayerTeam(stats, 3);
        expect(stats.healingReceivedByPlayerTeam).toBe(3);
    });
});
