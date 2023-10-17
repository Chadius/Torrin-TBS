import {MissionStatistics} from "./missionStatistics";

describe("MissionStatistics", () => {
    it('can track time elapsed', () => {
        const stats = new MissionStatistics({});
        expect(stats.timeElapsedInMilliseconds).toBeUndefined();
        stats.reset();
        stats.startRecording();
        expect(stats.timeElapsedInMilliseconds).toBe(0);
        stats.addTimeElapsed(100);
        expect(stats.timeElapsedInMilliseconds).toBe(100);
    });

    it('can track damage dealt by player controlled squaddies', () => {
        const stats = new MissionStatistics({});
        expect(stats.damageDealtByPlayerTeam).toBeUndefined();
        stats.reset();
        stats.startRecording();
        expect(stats.damageDealtByPlayerTeam).toBe(0);
        stats.addDamageDealtByPlayerTeam(5);
        expect(stats.damageDealtByPlayerTeam).toBe(5);
    });

    it('can track damage received by player controlled squaddies', () => {
        const stats = new MissionStatistics({});
        expect(stats.damageTakenByPlayerTeam).toBeUndefined();
        stats.reset();
        stats.startRecording();
        expect(stats.damageTakenByPlayerTeam).toBe(0);
        stats.adddamageTakenByPlayerTeam(2);
        expect(stats.damageTakenByPlayerTeam).toBe(2);
    });

    it('can track healing received by player controlled squaddies', () => {
        const stats = new MissionStatistics({});
        expect(stats.healingReceivedByPlayerTeam).toBeUndefined();
        stats.reset();
        stats.startRecording();
        expect(stats.healingReceivedByPlayerTeam).toBe(0);
        stats.addHealingReceivedByPlayerTeam(3);
        expect(stats.healingReceivedByPlayerTeam).toBe(3);
    });
});
