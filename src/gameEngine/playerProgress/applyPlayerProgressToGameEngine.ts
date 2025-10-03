import { PlayerProgress } from "./playerProgress"
import { CampaignFileFormat } from "../../campaign/campaignFileFormat"
import { MissionFileFormat } from "../../dataLoader/missionLoader"
import { PlayerArmy } from "../../campaign/playerArmy"
import { LoadCampaignService } from "./loadCampaignService/loadCampaignService"
import { LoadMissionService } from "./loadMissionService/loadMissionService"
import { LoadPlayerArmyService } from "./loadPlayerArmyService/loadPlayerArmyService"

export interface PlayerProgressToGameEngine {
    playerProgress: {
        tryingToApply: PlayerProgress | undefined
        previousValid: PlayerProgress | undefined
    }
    status: {
        hasStarted: boolean
        hasFinishedSuccessfully: boolean
        abortedWithError: boolean
        error: Error | undefined
    }
    loadedFileData: {
        playerArmy: PlayerArmy | undefined
        campaign: CampaignFileFormat | undefined
        mission: MissionFileFormat | undefined
    }
}

export const ApplyPlayerProgressToGameEngineService = {
    new: (
        newGamePlayerProgress: PlayerProgress
    ): PlayerProgressToGameEngine => {
        return {
            playerProgress: {
                tryingToApply: newGamePlayerProgress,
                previousValid: undefined,
            },
            status: {
                hasStarted: false,
                hasFinishedSuccessfully: false,
                abortedWithError: false,
                error: undefined,
            },
            loadedFileData: {
                campaign: undefined,
                mission: undefined,
                playerArmy: undefined,
            },
        }
    },
    hasStartedApplying: (
        playerProgressToGameEngine: PlayerProgressToGameEngine
    ): boolean => hasStartedApplying(playerProgressToGameEngine),
    startApplyingPlayerProgress: (
        playerProgressToGameEngine: PlayerProgressToGameEngine,
        playerProgress?: PlayerProgress
    ) => {
        if (hasStartedApplying(playerProgressToGameEngine)) {
            return
        }

        if (playerProgress) {
            playerProgressToGameEngine.playerProgress.tryingToApply =
                playerProgress
        }
        resetStatus(playerProgressToGameEngine)
        resetLoadedData(playerProgressToGameEngine)
        playerProgressToGameEngine.status.hasStarted = true
    },
    revertToLastValidPlayerProgress: (
        playerProgressToGameEngine: PlayerProgressToGameEngine
    ) => {
        if (
            playerProgressToGameEngine.playerProgress.previousValid == undefined
        ) {
            throw new Error(
                "[ApplyPlayerProgressToGameEngineService.revertToLastValidPlayerProgress] no valid player progress exists, cannot revert"
            )
        }
        resetStatus(playerProgressToGameEngine)
        playerProgressToGameEngine.playerProgress.tryingToApply =
            playerProgressToGameEngine.playerProgress.previousValid
        playerProgressToGameEngine.playerProgress.previousValid = undefined
        return
    },
    update: async (playerProgressToGameEngine: PlayerProgressToGameEngine) => {
        if (
            playerProgressToGameEngine.playerProgress.tryingToApply == undefined
        ) {
            throw new Error(
                "[ApplyPlayerProgressToGameEngineService.update] PlayerProgress cannot be undefined"
            )
        }

        const shouldLogMessages = process.env.LOG_MESSAGES === "true"
        if (shouldLogMessages) {
            console.log({
                hasStarted: playerProgressToGameEngine.status.hasStarted,
                hasFinishedSuccessfully: hasFinishedApplyingSuccessfully(
                    playerProgressToGameEngine
                ),
                hasAbortedWithError: hasAbortedWithError(
                    playerProgressToGameEngine
                ),
                hasLoadedCampaign: hasLoadedCampaign(
                    playerProgressToGameEngine
                ),
                hasLoadedMission: hasLoadedMission(playerProgressToGameEngine),
                hasLoadedPlayerArmy: hasLoadedPlayerArmy(
                    playerProgressToGameEngine
                ),
            })
        }

        if (!playerProgressToGameEngine.status.hasStarted) return

        switch (true) {
            case !hasLoadedCampaign(playerProgressToGameEngine):
                if (shouldLogMessages) {
                    console.log(
                        "[ApplyPlayerProgressToGameEngineService.update] Loading Campaign"
                    )
                }
                await loadCampaign(playerProgressToGameEngine)
                playerProgressToGameEngine.loadedFileData.mission = undefined
                playerProgressToGameEngine.loadedFileData.playerArmy = undefined
                break
            case hasLoadedCampaign(playerProgressToGameEngine) &&
                !(
                    hasLoadedMission(playerProgressToGameEngine) &&
                    hasLoadedPlayerArmy(playerProgressToGameEngine)
                ):
                if (shouldLogMessages) {
                    console.log(
                        "[ApplyPlayerProgressToGameEngineService.update] Loading Mission and Player Army"
                    )
                }
                await loadMissionAndPlayerArmy(playerProgressToGameEngine)
                break
            case hasLoadedCampaign(playerProgressToGameEngine) &&
                hasLoadedMission(playerProgressToGameEngine) &&
                hasLoadedPlayerArmy(playerProgressToGameEngine) &&
                !hasFinishedApplyingSuccessfully(playerProgressToGameEngine):
                if (shouldLogMessages) {
                    console.log(
                        "[ApplyPlayerProgressToGameEngineService.update] Applied Successfully, finishing"
                    )
                }
                finishApplyWithSuccess(playerProgressToGameEngine)
                break
        }
    },
    hasFinishedApplyingSuccessfully: (
        playerProgressToGameEngine: PlayerProgressToGameEngine
    ): boolean => hasFinishedApplyingSuccessfully(playerProgressToGameEngine),
    hasAbortedWithError: (
        playerProgressToGameEngine: PlayerProgressToGameEngine
    ): boolean => hasAbortedWithError(playerProgressToGameEngine),
    getError: (
        playerProgressToGameEngine: PlayerProgressToGameEngine
    ): Error | undefined => playerProgressToGameEngine.status.error,
}

const hasStartedApplying = (
    playerProgressToGameEngine: PlayerProgressToGameEngine
): boolean => playerProgressToGameEngine.status.hasStarted

const hasFinishedApplyingSuccessfully = (
    playerProgressToGameEngine: PlayerProgressToGameEngine
): boolean => playerProgressToGameEngine.status.hasFinishedSuccessfully

const hasLoadedCampaign = (
    playerProgressToGameEngine: PlayerProgressToGameEngine
): boolean => {
    if (
        playerProgressToGameEngine.loadedFileData.campaign == undefined ||
        playerProgressToGameEngine.playerProgress.tryingToApply == undefined
    )
        return false

    return (
        playerProgressToGameEngine.loadedFileData.campaign.id ==
        playerProgressToGameEngine.playerProgress.tryingToApply.campaignId
    )
}

const loadCampaign = async (
    playerProgressToGameEngine: PlayerProgressToGameEngine
) => {
    if (playerProgressToGameEngine.playerProgress.tryingToApply == undefined) {
        throw new Error(
            "[ApplyPlayerProgressToGameEngineService.update] PlayerProgress cannot be undefined"
        )
    }

    try {
        playerProgressToGameEngine.loadedFileData.campaign =
            await LoadCampaignService.loadCampaign(
                playerProgressToGameEngine.playerProgress.tryingToApply
                    .campaignId
            )
    } catch (error) {
        finishApplyWithError(playerProgressToGameEngine)
        playerProgressToGameEngine.status.error = error as Error
    }
}

const hasLoadedMission = (
    playerProgressToGameEngine: PlayerProgressToGameEngine
): boolean => {
    return (
        playerProgressToGameEngine.loadedFileData.campaign != undefined &&
        playerProgressToGameEngine.loadedFileData.mission != undefined
    )
}

const loadMissionAndPlayerArmy = async (
    playerProgressToGameEngine: PlayerProgressToGameEngine
): Promise<void> => {
    if (playerProgressToGameEngine.playerProgress.tryingToApply == undefined) {
        throw new Error(
            "[ApplyPlayerProgressToGameEngineService.update] PlayerProgress cannot be undefined"
        )
    }
    if (playerProgressToGameEngine.loadedFileData.campaign == undefined) {
        throw new Error(
            "[ApplyPlayerProgressToGameEngineService.loadMission] Campaign must be loaded first"
        )
    }

    try {
        const [playerArmy, mission] = await Promise.all([
            LoadPlayerArmyService.loadPlayerArmy(),
            LoadMissionService.loadMission(
                playerProgressToGameEngine.playerProgress.tryingToApply
                    .campaignId,
                playerProgressToGameEngine.loadedFileData.campaign.missionIds[0]
            ),
        ])
        playerProgressToGameEngine.loadedFileData.playerArmy = playerArmy
        playerProgressToGameEngine.loadedFileData.mission = mission
    } catch (error) {
        finishApplyWithError(playerProgressToGameEngine)
        playerProgressToGameEngine.status.error = error as Error
    }
}

const hasLoadedPlayerArmy = (
    playerProgressToGameEngine: PlayerProgressToGameEngine
): boolean => playerProgressToGameEngine.loadedFileData.playerArmy != undefined

const finishApplyWithSuccess = (
    playerProgressToGameEngine: PlayerProgressToGameEngine
) => {
    resetStatus(playerProgressToGameEngine)
    playerProgressToGameEngine.status.hasFinishedSuccessfully = true
    playerProgressToGameEngine.playerProgress.previousValid =
        playerProgressToGameEngine.playerProgress.tryingToApply
    playerProgressToGameEngine.playerProgress.tryingToApply = undefined
    resetLoadedData(playerProgressToGameEngine)
}

const finishApplyWithError = (
    playerProgressToGameEngine: PlayerProgressToGameEngine
) => {
    resetStatus(playerProgressToGameEngine)
    playerProgressToGameEngine.status.abortedWithError = true
    playerProgressToGameEngine.playerProgress.tryingToApply = undefined
    resetLoadedData(playerProgressToGameEngine)
}

const hasAbortedWithError = (
    playerProgressToGameEngine: PlayerProgressToGameEngine
): boolean => playerProgressToGameEngine.status.abortedWithError

const resetStatus = (
    playerProgressToGameEngine: PlayerProgressToGameEngine
) => {
    playerProgressToGameEngine.status.hasStarted = false
    playerProgressToGameEngine.status.error = undefined
    playerProgressToGameEngine.status.hasFinishedSuccessfully = false
    playerProgressToGameEngine.status.abortedWithError = false
}

const resetLoadedData = (
    playerProgressToGameEngine: PlayerProgressToGameEngine
) => {
    playerProgressToGameEngine.loadedFileData = {
        campaign: undefined,
        mission: undefined,
        playerArmy: undefined,
    }
}
