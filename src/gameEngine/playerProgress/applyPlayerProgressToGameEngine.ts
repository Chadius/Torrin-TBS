import { PlayerProgress } from "./playerProgress"
import { CampaignFileFormat } from "../../campaign/campaignFileFormat"
import {
    MissionFileFormat,
    MissionFileFormatService,
} from "../../dataLoader/missionLoader"
import { PlayerArmy } from "../../campaign/playerArmy"
import { LoadCampaignService } from "./loadCampaignService/loadCampaignService"
import { LoadMissionService } from "./loadMissionService/loadMissionService"
import { LoadPlayerArmyService } from "./loadPlayerArmyService/loadPlayerArmyService"
import { CampaignResourcesService } from "../../campaign/campaignResources"
import { ResourceHandler } from "../../resource/resourceHandler"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../battle/objectRepository"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { LoadFileIntoFormat } from "../../dataLoader/dataLoader"
import { SquaddieResourceService } from "../../squaddie/resource"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"

export interface PlayerProgressToGameEngine {
    playerProgress: {
        tryingToApply: PlayerProgress | undefined
        previousValid: PlayerProgress | undefined
    }
    status: {
        hasStarted: boolean
        hasFinishedDiscoveringPendingResourceKeys: boolean
        hasFinishedSuccessfully: boolean
        abortedWithError: boolean
        error: Error | undefined
    }
    loadedFileData: {
        playerArmy: PlayerArmy | undefined
        campaign: CampaignFileFormat | undefined
        mission: MissionFileFormat | undefined
    }
    resourceKeys: {
        pending: Set<string>
        startedLoading: Set<string>
        finishedLoaded: Set<string>
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
                hasFinishedDiscoveringPendingResourceKeys: false,
                abortedWithError: false,
                error: undefined,
            },
            loadedFileData: {
                campaign: undefined,
                mission: undefined,
                playerArmy: undefined,
            },
            resourceKeys: {
                pending: new Set(),
                startedLoading: new Set(),
                finishedLoaded: new Set(),
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
    update: async ({
        playerProgressToGameEngine,
        repository,
        resourceHandler,
    }: {
        playerProgressToGameEngine: PlayerProgressToGameEngine
        resourceHandler: ResourceHandler
        repository: ObjectRepository
    }) => {
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
                hasFinishedDiscoveringPendingResourceKeys:
                    hasFinishedDiscoveringPendingResourceKeys(
                        playerProgressToGameEngine
                    ),
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
                await loadMissionAndPlayerArmy({
                    playerProgressToGameEngine: playerProgressToGameEngine,
                    repository,
                })
                break
            case hasFinishedDiscoveringPendingResourceKeys(
                playerProgressToGameEngine
            ) &&
                hasLoadedMission(playerProgressToGameEngine) &&
                hasLoadedPlayerArmy(playerProgressToGameEngine):
                if (shouldLogMessages) {
                    console.log(
                        "[ApplyPlayerProgressToGameEngineService.update] Adding Pending Resource Keys to Resource Handler"
                    )
                }
                loadPendingResourceKeys({
                    playerProgressToGameEngine,
                    resourceHandler,
                })
                break
            case hasLoadedCampaign(playerProgressToGameEngine) &&
                hasLoadedMission(playerProgressToGameEngine) &&
                hasLoadedPlayerArmy(playerProgressToGameEngine) &&
                hasFinishedDiscoveringPendingResourceKeys(
                    playerProgressToGameEngine
                ) &&
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

    if (playerProgressToGameEngine.loadedFileData.campaign) {
        playerProgressToGameEngine.resourceKeys.pending =
            playerProgressToGameEngine.resourceKeys.pending.union(
                new Set<string>(
                    CampaignResourcesService.getAllResourceKeys(
                        playerProgressToGameEngine.loadedFileData.campaign
                            .resources
                    )
                )
            )
    }
}

const hasFinishedDiscoveringPendingResourceKeys = (
    playerProgressToGameEngine: PlayerProgressToGameEngine
): boolean => {
    return playerProgressToGameEngine.status
        .hasFinishedDiscoveringPendingResourceKeys
}

const hasLoadedMission = (
    playerProgressToGameEngine: PlayerProgressToGameEngine
): boolean => {
    return (
        playerProgressToGameEngine.loadedFileData.campaign != undefined &&
        playerProgressToGameEngine.loadedFileData.mission != undefined
    )
}

const loadMissionAndPlayerArmy = async ({
    playerProgressToGameEngine,
    repository,
}: {
    playerProgressToGameEngine: PlayerProgressToGameEngine
    repository: ObjectRepository
}): Promise<void> => {
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

        playerArmy.squaddieBuilds.map((a) => a.squaddieTemplateId)
    } catch (error) {
        finishApplyWithError(playerProgressToGameEngine)
        playerProgressToGameEngine.status.error = error as Error
        return
    }

    const squaddieTemplates = await getSquaddieTemplates({
        playerProgressToGameEngine,
    })
    const actionTemplateIds = getActionTemplateIds(squaddieTemplates)
    await addResourceKeysToPending({
        playerProgressToGameEngine: playerProgressToGameEngine,
        repository: repository,
        squaddieTemplates: squaddieTemplates,
        actionTemplateIds: actionTemplateIds,
    })

    playerProgressToGameEngine.status.hasFinishedDiscoveringPendingResourceKeys = true
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

const addSquaddieTemplateResourceKeysToPending = ({
    playerProgressToGameEngine,
    repository,
    squaddieTemplates,
}: {
    playerProgressToGameEngine: PlayerProgressToGameEngine
    repository: ObjectRepository
    squaddieTemplates: SquaddieTemplate[]
}) => {
    playerProgressToGameEngine.resourceKeys.pending =
        playerProgressToGameEngine.resourceKeys.pending.union(
            new Set(
                getSquaddieTemplateResourceKeys(
                    [...squaddieTemplates],
                    repository
                )
            )
        )
}

const getSquaddieTemplateIdsFromPlayerArmy = ({
    playerProgressToGameEngine,
}: {
    playerProgressToGameEngine: PlayerProgressToGameEngine
}): string[] => {
    return (
        playerProgressToGameEngine.loadedFileData.playerArmy?.squaddieBuilds.map(
            (squaddieBuild) => squaddieBuild.squaddieTemplateId
        ) || []
    )
}

const getSquaddieTemplateFromPlayerArmy = async ({
    squaddieTemplateId,
}: {
    squaddieTemplateId: string
}) => {
    return SquaddieTemplateService.sanitize(
        await LoadFileIntoFormat<SquaddieTemplate>(
            `assets/playerArmy/${squaddieTemplateId}/base-squaddie-template.json`
        )
    )
}

const getSquaddieTemplates = async ({
    playerProgressToGameEngine,
}: {
    playerProgressToGameEngine: PlayerProgressToGameEngine
}): Promise<SquaddieTemplate[]> => {
    if (playerProgressToGameEngine.loadedFileData.playerArmy == undefined) {
        throw new Error(
            "[ApplyPlayerProgressToGameEngine.getSquaddieTemplatesFromPlayerArmy]: playerArmy must be loaded"
        )
    }
    if (playerProgressToGameEngine.loadedFileData.mission == undefined) {
        throw new Error(
            "[ApplyPlayerProgressToGameEngine.getSquaddieTemplatesFromMission]: mission must be loaded"
        )
    }

    const squaddieTemplateIdsBySource = [
        ...getSquaddieTemplateIdsFromPlayerArmy({
            playerProgressToGameEngine,
        }).map((squaddieTemplateId) => {
            return {
                source: "playerArmy",
                squaddieTemplateId,
            }
        }),
        ...getSquaddieTemplateIdsFromMission({
            playerProgressToGameEngine,
        }).map((squaddieTemplateId) => {
            return {
                source: "mission",
                squaddieTemplateId,
            }
        }),
    ]

    const squaddieTemplates: SquaddieTemplate[] = []

    for (const squaddieTemplateIdInfo of squaddieTemplateIdsBySource) {
        let squaddieTemplateId: string =
            squaddieTemplateIdInfo.squaddieTemplateId
        try {
            let squaddieTemplate: SquaddieTemplate | undefined = undefined
            switch (squaddieTemplateIdInfo.source) {
                case "playerArmy":
                    squaddieTemplate = await getSquaddieTemplateFromPlayerArmy({
                        squaddieTemplateId,
                    })
                    break
                default:
                    squaddieTemplate = await getSquaddieTemplateFromMission({
                        squaddieTemplateId,
                    })
                    break
            }
            if (squaddieTemplate != undefined)
                squaddieTemplates.push(squaddieTemplate)
        } catch (error) {
            finishApplyWithError(playerProgressToGameEngine)
            playerProgressToGameEngine.status.error = error as Error
            throw new Error(
                `[ApplyPlayerProgressToGameEngine.getSquaddieTemplatesFromPlayerArmy]: ${squaddieTemplateId}: ${(error as Error).message}`
            )
        }
    }
    return squaddieTemplates
}

const getSquaddieTemplateIdsFromMission = ({
    playerProgressToGameEngine,
}: {
    playerProgressToGameEngine: PlayerProgressToGameEngine
}): string[] => {
    const missionFile = playerProgressToGameEngine.loadedFileData.mission!
    return [
        missionFile.npcDeployments.enemy?.templateIds,
        missionFile.npcDeployments.ally?.templateIds,
        missionFile.npcDeployments.noAffiliation?.templateIds,
    ]
        .filter((x) => x != undefined)
        .flat()
}

const getSquaddieTemplateFromMission = async ({
    squaddieTemplateId,
}: {
    squaddieTemplateId: string
}) => {
    return SquaddieTemplateService.sanitize(
        await LoadFileIntoFormat<SquaddieTemplate>(
            `assets/npcData/${squaddieTemplateId}/${squaddieTemplateId}.json`
        )
    )
}

const getSquaddieTemplateResourceKeys = (
    squaddieTemplates: SquaddieTemplate[],
    repository: ObjectRepository
) => {
    return squaddieTemplates
        .filter(
            (squaddieTemplate) =>
                !ObjectRepositoryService.hasSquaddieByTemplateId(
                    repository,
                    squaddieTemplate.squaddieId.templateId
                )
        )
        .map((squaddieTemplate) => {
            ObjectRepositoryService.addSquaddieTemplate(
                repository,
                squaddieTemplate
            )

            return SquaddieResourceService.getResourceKeys(
                squaddieTemplate.squaddieId.resources
            )
        })
        .flat()
}

const addActionTemplateResourceKeysToPending = ({
    playerProgressToGameEngine,
    repository,
    actionTemplateIds,
}: {
    playerProgressToGameEngine: PlayerProgressToGameEngine
    repository: ObjectRepository
    actionTemplateIds: string[]
}) => {
    playerProgressToGameEngine.resourceKeys.pending =
        playerProgressToGameEngine.resourceKeys.pending.union(
            new Set(
                getActionTemplateResourceKeys(
                    [...actionTemplateIds],
                    repository
                )
            )
        )
}

const getActionTemplateIds = (
    squaddieTemplates: SquaddieTemplate[]
): string[] => {
    return squaddieTemplates
        .map(
            (squaddieTemplate: SquaddieTemplate) =>
                squaddieTemplate.actionTemplateIds
        )
        .flat()
}

const getActionTemplateResourceKeys = (
    actionTemplateIds: string[],
    repository: ObjectRepository
): string[] => {
    return actionTemplateIds
        .map((actionTemplateId: string) => {
            const actionTemplate: ActionTemplate =
                ObjectRepositoryService.getActionTemplateById(
                    repository,
                    actionTemplateId
                )

            return ActionTemplateService.getResourceKeys(actionTemplate)
        })
        .flat()
}

const addActionTemplatesToRepository = async (
    actionTemplateIds: string[],
    repository: ObjectRepository
) => {
    const loadActionTemplatesFromFile = async (
        filename: string,
        errorMessage: string
    ): Promise<ActionTemplate[]> => {
        try {
            return await LoadFileIntoFormat<ActionTemplate[]>(filename)
        } catch (e) {
            throw new Error(
                `[ApplyPlayerProgressToGameEngine.addActionTemplatesToRepository] ${filename}: ${errorMessage}`
            )
        }
    }

    const [npcActionTemplatesFromFile, playerActionTemplatesFromFile] =
        await Promise.all([
            loadActionTemplatesFromFile(
                `assets/npcData/action_templates.json`,
                `Failed to load NPC action templates`
            ),
            loadActionTemplatesFromFile(
                `assets/playerArmy/action_templates.json`,
                `Failed to load player action templates`
            ),
        ])
    const actionTemplateIdSet = new Set<string>(actionTemplateIds)
    ;[...npcActionTemplatesFromFile, ...playerActionTemplatesFromFile]
        .filter((actionTemplate) => actionTemplateIdSet.has(actionTemplate.id))
        .forEach((actionTemplate) => {
            if (
                ObjectRepositoryService.hasActionTemplateId(
                    repository,
                    actionTemplate.id
                )
            )
                return
            ObjectRepositoryService.addActionTemplate(
                repository,
                ActionTemplateService.sanitize(actionTemplate)
            )
        })
}

const addResourceKeysToPending = async ({
    playerProgressToGameEngine,
    repository,
    squaddieTemplates,
    actionTemplateIds,
}: {
    playerProgressToGameEngine: PlayerProgressToGameEngine
    repository: ObjectRepository
    squaddieTemplates: SquaddieTemplate[]
    actionTemplateIds: string[]
}) => {
    addSquaddieTemplateResourceKeysToPending({
        playerProgressToGameEngine,
        repository,
        squaddieTemplates,
    })
    await addActionTemplatesToRepository(actionTemplateIds, repository)
    addActionTemplateResourceKeysToPending({
        playerProgressToGameEngine,
        actionTemplateIds,
        repository,
    })

    if (playerProgressToGameEngine.loadedFileData.mission) {
        MissionFileFormatService.hydrateCutscenesFromLoadedData(
            playerProgressToGameEngine.loadedFileData.mission
        )

        playerProgressToGameEngine.resourceKeys.pending =
            playerProgressToGameEngine.resourceKeys.pending.union(
                new Set<string>([
                    ...MissionFileFormatService.getAllResourceKeys(
                        playerProgressToGameEngine.loadedFileData.mission
                    ),
                    ...Object.values(
                        playerProgressToGameEngine.loadedFileData.mission
                            .cutscene.cutsceneById
                    )
                        .map((cutscene) => cutscene.allResourceKeys)
                        .flat(),
                ])
            )
    }
}

const loadPendingResourceKeys = ({
    playerProgressToGameEngine,
    resourceHandler,
}: {
    playerProgressToGameEngine: PlayerProgressToGameEngine
    resourceHandler: ResourceHandler
}) => {
    removeAlreadyLoadedResourceKeysFromSet({
        resourceKeySet: playerProgressToGameEngine.resourceKeys.pending,
        resourceHandler,
    })

    playerProgressToGameEngine.resourceKeys.pending.forEach((key) => {
        resourceHandler.loadResource(key)
        playerProgressToGameEngine.resourceKeys.startedLoading.add(key)
    })
    removeAlreadyLoadedResourceKeysFromSet({
        resourceKeySet: playerProgressToGameEngine.resourceKeys.startedLoading,
        resourceHandler,
    })

    playerProgressToGameEngine.resourceKeys.startedLoading.forEach((key) => {
        if (resourceHandler.isResourceLoaded(key)) {
            playerProgressToGameEngine.resourceKeys.finishedLoaded.add(key)
        }
    })
    removeAlreadyLoadedResourceKeysFromSet({
        resourceKeySet: playerProgressToGameEngine.resourceKeys.startedLoading,
        resourceHandler,
    })

    if (
        playerProgressToGameEngine.resourceKeys.pending.size == 0 &&
        playerProgressToGameEngine.resourceKeys.startedLoading.size == 0
    )
        finishApplyWithSuccess(playerProgressToGameEngine)
}

const removeAlreadyLoadedResourceKeysFromSet = ({
    resourceKeySet,
    resourceHandler,
}: {
    resourceKeySet: Set<string>
    resourceHandler: ResourceHandler
}) => {
    const keysToRemove = new Set<string>()
    resourceKeySet.forEach((key) => {
        if (resourceHandler.isResourceLoaded(key)) {
            keysToRemove.add(key)
        }
    })
    keysToRemove.forEach((key) => resourceKeySet.delete(key))
}
