export interface MissionStatistics {
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
    }: {
        timeElapsedInMilliseconds?: number
        damageDealtByPlayerTeam?: number
        damageTakenByPlayerTeam?: number
        healingReceivedByPlayerTeam?: number
        damageAbsorbedByPlayerTeam?: number
    }): MissionStatistics => ({
        timeElapsedInMilliseconds,
        damageDealtByPlayerTeam,
        damageTakenByPlayerTeam,
        healingReceivedByPlayerTeam,
        damageAbsorbedByPlayerTeam,
    }),
    reset: (data: MissionStatistics) => {
        data.timeElapsedInMilliseconds = undefined
        data.damageDealtByPlayerTeam = undefined
        data.damageTakenByPlayerTeam = undefined
        data.healingReceivedByPlayerTeam = undefined
        data.damageAbsorbedByPlayerTeam = undefined
    },
    startRecording: (data: MissionStatistics) => {
        data.timeElapsedInMilliseconds = data.timeElapsedInMilliseconds || 0
        data.damageDealtByPlayerTeam = data.damageDealtByPlayerTeam || 0
        data.damageTakenByPlayerTeam = data.damageTakenByPlayerTeam || 0
        data.healingReceivedByPlayerTeam = data.healingReceivedByPlayerTeam || 0
        data.damageAbsorbedByPlayerTeam = data.damageAbsorbedByPlayerTeam || 0
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
}
