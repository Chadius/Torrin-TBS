export interface MissionStatistics {
    timeElapsedInMilliseconds: number
    damageDealtByPlayerTeam: number
    damageTakenByPlayerTeam: number
    healingReceivedByPlayerTeam: number
}

export const MissionStatisticsHandler = {
    new: (): MissionStatistics => {
        return {
            timeElapsedInMilliseconds: undefined,
            damageDealtByPlayerTeam: undefined,
            damageTakenByPlayerTeam: undefined,
            healingReceivedByPlayerTeam: undefined,
        }
    },
    reset: (data: MissionStatistics) => {
        data.timeElapsedInMilliseconds = undefined
        data.damageDealtByPlayerTeam = undefined
        data.damageTakenByPlayerTeam = undefined
        data.healingReceivedByPlayerTeam = undefined
    },
    startRecording: (data: MissionStatistics) => {
        data.timeElapsedInMilliseconds = data.timeElapsedInMilliseconds || 0
        data.damageDealtByPlayerTeam = data.damageDealtByPlayerTeam || 0
        data.damageTakenByPlayerTeam = data.damageTakenByPlayerTeam || 0
        data.healingReceivedByPlayerTeam = data.healingReceivedByPlayerTeam || 0
    },
    addTimeElapsed: (data: MissionStatistics, milliseconds: number) => {
        data.timeElapsedInMilliseconds += milliseconds
    },
    addDamageDealtByPlayerTeam: (data: MissionStatistics, damage: number) => {
        data.damageDealtByPlayerTeam += damage
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
