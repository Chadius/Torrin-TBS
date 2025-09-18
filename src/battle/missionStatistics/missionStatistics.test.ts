import {
    MissionStatistics,
    MissionStatisticsService,
} from "./missionStatistics"
import { describe, expect, it } from "vitest"

describe("MissionStatistics", () => {
    it("can track time elapsed", () => {
        const stats: MissionStatistics = MissionStatisticsService.new({})
        expect(stats.timeElapsedInMilliseconds).toBe(0)
        MissionStatisticsService.reset(stats)
        MissionStatisticsService.startRecording(stats)
        expect(stats.timeElapsedInMilliseconds).toBe(0)
        MissionStatisticsService.addTimeElapsed(stats, 100)
        expect(stats.timeElapsedInMilliseconds).toBe(100)
    })

    it("can track damage dealt by player controlled squaddies", () => {
        const stats: MissionStatistics = MissionStatisticsService.new({})
        expect(stats.damageDealtByPlayerTeam).toBe(0)
        MissionStatisticsService.reset(stats)
        MissionStatisticsService.startRecording(stats)
        expect(stats.damageDealtByPlayerTeam).toBe(0)
        MissionStatisticsService.addDamageDealtByPlayerTeam(stats, 5)
        expect(stats.damageDealtByPlayerTeam).toBe(5)
    })
    it("can track damage absorbed by player controlled squaddies", () => {
        const stats: MissionStatistics = MissionStatisticsService.new({})
        expect(stats.damageAbsorbedByPlayerTeam).toBe(0)
        MissionStatisticsService.reset(stats)
        MissionStatisticsService.startRecording(stats)
        expect(stats.damageAbsorbedByPlayerTeam).toBe(0)
        MissionStatisticsService.addDamageAbsorbedByPlayerTeam(stats, 5)
        expect(stats.damageAbsorbedByPlayerTeam).toBe(5)
    })
    it("can track damage received by player controlled squaddies", () => {
        const stats: MissionStatistics = MissionStatisticsService.new({})
        expect(stats.damageTakenByPlayerTeam).toBe(0)
        MissionStatisticsService.reset(stats)
        MissionStatisticsService.startRecording(stats)
        expect(stats.damageTakenByPlayerTeam).toBe(0)
        MissionStatisticsService.addDamageTakenByPlayerTeam(stats, 2)
        expect(stats.damageTakenByPlayerTeam).toBe(2)
    })
    it("can track healing received by player controlled squaddies", () => {
        const stats: MissionStatistics = MissionStatisticsService.new({})
        expect(stats.healingReceivedByPlayerTeam).toBe(0)
        MissionStatisticsService.reset(stats)
        MissionStatisticsService.startRecording(stats)
        expect(stats.healingReceivedByPlayerTeam).toBe(0)
        MissionStatisticsService.addHealingReceivedByPlayerTeam(stats, 3)
        expect(stats.healingReceivedByPlayerTeam).toBe(3)
    })
    it("can track when the player controlled squaddie deals a critical hit", () => {
        const stats: MissionStatistics = MissionStatisticsService.new({})
        expect(stats.damageDealtByPlayerTeam).toBe(0)
        MissionStatisticsService.reset(stats)
        MissionStatisticsService.startRecording(stats)
        expect(stats.criticalHitsDealtByPlayerTeam).toBe(0)
        MissionStatisticsService.incrementCriticalHitsDealtByPlayerTeam(stats)
        expect(stats.criticalHitsDealtByPlayerTeam).toBe(1)
    })
    it("can track when the player controlled squaddie takes a critical hit", () => {
        const stats: MissionStatistics = MissionStatisticsService.new({})
        expect(stats.damageDealtByPlayerTeam).toBe(0)
        MissionStatisticsService.reset(stats)
        MissionStatisticsService.startRecording(stats)
        expect(stats.criticalHitsTakenByPlayerTeam).toBe(0)
        MissionStatisticsService.incrementCriticalHitsTakenByPlayerTeam(stats)
        expect(stats.criticalHitsTakenByPlayerTeam).toBe(1)
    })
})
