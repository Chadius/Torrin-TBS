import {MissionStatistics} from "./missionStatistics";

describe("MissionStatistics", () => {
    it('starts the timer', () => {
        const stats = new MissionStatistics({});
        expect(stats.timeElapsedInMilliseconds).toBeUndefined();
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        stats.reset();
        stats.startRecording();
        expect(stats.timeElapsedInMilliseconds).toBe(0);
        jest.spyOn(Date, 'now').mockImplementation(() => 100);
        stats.updateTimeElapsed();
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
        expect(stats.damageReceivedByPlayerTeam).toBeUndefined();
        stats.reset();
        stats.startRecording();
        expect(stats.damageReceivedByPlayerTeam).toBe(0);
        stats.addDamageReceivedByPlayerTeam(2);
        expect(stats.damageReceivedByPlayerTeam).toBe(2);
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
