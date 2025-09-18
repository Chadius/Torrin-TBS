export interface MissionStatistics {
    criticalHitsTakenByPlayerTeam: number
    criticalHitsDealtByPlayerTeam: number
    timeElapsedInMilliseconds: number
    damageDealtByPlayerTeam: number
    damageTakenByPlayerTeam: number
    healingReceivedByPlayerTeam: number
    damageAbsorbedByPlayerTeam: number
}

export const MissionStatisticsService = {
    new: ({
        timeElapsedInMilliseconds,
        damageDealtByPlayerTeam,
        damageTakenByPlayerTeam,
        healingReceivedByPlayerTeam,
        damageAbsorbedByPlayerTeam,
        criticalHitsDealtByPlayerTeam,
        criticalHitsTakenByPlayerTeam,
    }: {
        timeElapsedInMilliseconds?: number
        damageDealtByPlayerTeam?: number
        damageTakenByPlayerTeam?: number
        healingReceivedByPlayerTeam?: number
        damageAbsorbedByPlayerTeam?: number
        criticalHitsDealtByPlayerTeam?: number
        criticalHitsTakenByPlayerTeam?: number
    }): MissionStatistics => ({
        timeElapsedInMilliseconds: timeElapsedInMilliseconds ?? 0,
        damageDealtByPlayerTeam: damageDealtByPlayerTeam ?? 0,
        damageTakenByPlayerTeam: damageTakenByPlayerTeam ?? 0,
        healingReceivedByPlayerTeam: healingReceivedByPlayerTeam ?? 0,
        damageAbsorbedByPlayerTeam: damageAbsorbedByPlayerTeam ?? 0,
        criticalHitsDealtByPlayerTeam: criticalHitsDealtByPlayerTeam ?? 0,
        criticalHitsTakenByPlayerTeam: criticalHitsTakenByPlayerTeam ?? 0,
    }),
    reset: (data: MissionStatistics) => {
        data.timeElapsedInMilliseconds = 0
        data.damageDealtByPlayerTeam = 0
        data.damageTakenByPlayerTeam = 0
        data.healingReceivedByPlayerTeam = 0
        data.damageAbsorbedByPlayerTeam = 0
        data.criticalHitsDealtByPlayerTeam = 0
        data.criticalHitsTakenByPlayerTeam = 0
    },
    startRecording: (data: MissionStatistics) => {
        data.timeElapsedInMilliseconds = data.timeElapsedInMilliseconds || 0
        data.damageDealtByPlayerTeam = data.damageDealtByPlayerTeam || 0
        data.damageTakenByPlayerTeam = data.damageTakenByPlayerTeam || 0
        data.healingReceivedByPlayerTeam = data.healingReceivedByPlayerTeam || 0
        data.damageAbsorbedByPlayerTeam = data.damageAbsorbedByPlayerTeam || 0
        data.criticalHitsDealtByPlayerTeam =
            data.criticalHitsDealtByPlayerTeam || 0
        data.criticalHitsTakenByPlayerTeam =
            data.criticalHitsTakenByPlayerTeam || 0
    },
    addTimeElapsed: (data: MissionStatistics, milliseconds: number) => {
        data.timeElapsedInMilliseconds += milliseconds
    },
    addDamageDealtByPlayerTeam: (data: MissionStatistics, damage: number) => {
        data.damageDealtByPlayerTeam += damage
    },
    addDamageAbsorbedByPlayerTeam: (
        data: MissionStatistics,
        damage: number
    ) => {
        data.damageAbsorbedByPlayerTeam += damage
    },
    addDamageTakenByPlayerTeam: (data: MissionStatistics, damage: number) => {
        data.damageTakenByPlayerTeam += damage
    },
    addHealingReceivedByPlayerTeam: (
        data: MissionStatistics,
        healing: number
    ) => {
        data.healingReceivedByPlayerTeam += healing
    },
    hasStarted: (data: MissionStatistics): boolean => {
        return data.timeElapsedInMilliseconds != undefined
    },
    incrementCriticalHitsDealtByPlayerTeam: (stats: MissionStatistics) => {
        stats.criticalHitsDealtByPlayerTeam += 1
    },
    incrementCriticalHitsTakenByPlayerTeam: (stats: MissionStatistics) => {
        stats.criticalHitsTakenByPlayerTeam += 1
    },
}
