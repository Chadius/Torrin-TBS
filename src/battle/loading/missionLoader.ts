import { ResourceHandler } from "../../resource/resourceHandler"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import {
    LoadMissionFromFile,
    LoadPlayerArmyFromFile,
    MissionFileFormat,
    MissionLoaderService,
    NpcTeamMissionDeployment,
} from "../../dataLoader/missionLoader"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    MissionObjective,
    MissionObjectiveHelper,
} from "../missionResult/missionObjective"
import {
    MissionCutsceneCollection,
    MissionCutsceneCollectionHelper,
} from "../orchestrator/missionCutsceneCollection"
import { CutsceneTrigger } from "../../cutscene/cutsceneTrigger"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { TeamStrategy } from "../teamStrategy/teamStrategy"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { SquaddieTurnService } from "../../squaddie/turn"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { RectAreaService } from "../../ui/rectArea"
import { HORIZONTAL_ALIGN, VERTICAL_ALIGN } from "../../ui/constants"
import { BattleCamera } from "../battleCamera"
import { CutsceneService } from "../../cutscene/cutscene"
import { LoadFileIntoFormat } from "../../dataLoader/dataLoader"
import { PlayerArmy } from "../../campaign/playerArmy"
import { SquaddieResource } from "../../squaddie/resource"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { isValidValue } from "../../utils/validityCheck"
import p5 from "p5"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { ImageUI, ImageUILoadingBehavior } from "../../ui/ImageUI"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"

export interface MissionLoaderCompletionProgress {
    started: boolean
    loadedFileData: boolean
}

export interface MissionLoaderContext {
    id: string
    objectives: MissionObjective[]
    missionMap: MissionMap | undefined
    resourcesPendingLoading: string[]
    completionProgress: MissionLoaderCompletionProgress
    squaddieData: {
        teams: BattleSquaddieTeam[]
        teamStrategyById: { [key: string]: TeamStrategy[] }
        templates: { [id: string]: SquaddieTemplate }
    }
    cutsceneInfo: {
        cutsceneCollection: MissionCutsceneCollection
        cutsceneTriggers: CutsceneTrigger[]
    }
    mapSettings: {
        camera: BattleCamera
    }
    phaseBannersByAffiliation: { [affiliation in SquaddieAffiliation]?: string }
}

export const MissionLoader = {
    newEmptyMissionLoaderContext: (): MissionLoaderContext => {
        return {
            id: "",
            missionMap: undefined,
            objectives: [],
            resourcesPendingLoading: [],
            completionProgress: {
                started: false,
                loadedFileData: false,
            },
            squaddieData: {
                teams: [],
                teamStrategyById: {},
                templates: {},
            },
            cutsceneInfo: {
                cutsceneCollection: undefined,
                cutsceneTriggers: [],
            },
            mapSettings: {
                camera: undefined,
            },
            phaseBannersByAffiliation: {
                [SquaddieAffiliation.PLAYER]: "",
                [SquaddieAffiliation.ENEMY]: "",
                [SquaddieAffiliation.ALLY]: "",
                [SquaddieAffiliation.NONE]: "",
            },
        }
    },
    loadMissionFromFile: async ({
        missionLoaderContext,
        missionId,
        campaignId,
        resourceHandler,
        objectRepository,
    }: {
        missionLoaderContext: MissionLoaderContext
        missionId: string
        campaignId: string
        resourceHandler: ResourceHandler
        objectRepository: ObjectRepository
    }) => {
        missionLoaderContext.completionProgress.started = true
        const missionData: MissionFileFormat = await LoadMissionFromFile(
            campaignId,
            missionId
        )

        missionLoaderContext.id = missionData.id

        missionLoaderContext.missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: missionData.terrain,
            }),
        })

        missionLoaderContext.objectives = missionData.objectives.map(
            MissionObjectiveHelper.validateMissionObjective
        )

        missionLoaderContext.completionProgress.loadedFileData = true

        missionLoaderContext.squaddieData.templates = {}
        missionData.npcDeployments.enemy.templateIds.forEach(
            (id) =>
                (missionLoaderContext.squaddieData.templates[id] = undefined)
        )
        missionData.npcDeployments.ally.templateIds.forEach(
            (id) =>
                (missionLoaderContext.squaddieData.templates[id] = undefined)
        )
        missionData.npcDeployments.noAffiliation.templateIds.forEach(
            (id) =>
                (missionLoaderContext.squaddieData.templates[id] = undefined)
        )

        const loaderLock = {
            locked: false,
        }
        await loadActionTemplates({
            objectRepository,
        })
        await loadAndPrepareNPCTemplateData({
            missionLoaderContext: missionLoaderContext,
            resourceHandler,
            repository: objectRepository,
            loaderLock,
        })

        createPlayerSquaddieTeam(missionLoaderContext, missionData)
        deployRequiredPlayerSquaddies(missionLoaderContext, missionData)

        spawnNPCSquaddiesAndAddToMap({
            missionLoaderContext: missionLoaderContext,
            repository: objectRepository,
            missionData,
        })
        createSquaddieTeams({ missionLoaderContext, missionData })

        initializeCameraPosition({ missionLoaderContext: missionLoaderContext })

        loadPhaseAffiliationBanners(
            missionLoaderContext,
            missionData,
            objectRepository,
            resourceHandler
        )
        loadTeamIcons(
            missionLoaderContext,
            missionData,
            objectRepository,
            resourceHandler
        )
        loadCutscenes({
            missionLoaderContext,
            missionData,
            resourceHandler,
        })
    },
    checkResourcesPendingLoading: ({
        missionLoaderContext,
        resourceHandler,
    }: {
        missionLoaderContext: MissionLoaderContext
        resourceHandler: ResourceHandler
    }) => {
        missionLoaderContext.resourcesPendingLoading =
            missionLoaderContext.resourcesPendingLoading.filter(
                (resourceKey) => {
                    return (
                        resourceHandler.isResourceLoaded(resourceKey) !== true
                    )
                }
            )
    },
    assignResourceHandlerResources: ({
        repository,
        missionLoaderContext,
        resourceHandler,
    }: {
        repository: ObjectRepository
        missionLoaderContext: MissionLoaderContext
        resourceHandler: ResourceHandler
    }) => {
        initializeCutscenes({ missionLoaderContext, resourceHandler })
        initializeSquaddieResources({
            repository: repository,
            missionLoaderContext,
            resourceHandler,
        })
    },
    loadPlayerArmyFromFile: async ({
        resourceHandler,
        missionLoaderContext,
        objectRepository,
    }: {
        resourceHandler: ResourceHandler
        missionLoaderContext: MissionLoaderContext
        objectRepository: ObjectRepository
    }) => {
        const playerArmyData: PlayerArmy = await LoadPlayerArmyFromFile()
        const baseSquaddieTemplates: SquaddieTemplate[] = []
        for (const build of playerArmyData.squaddieBuilds) {
            baseSquaddieTemplates.push(
                await MissionLoaderService.loadBaseSquaddieTemplateBySquaddieTemplateId(
                    build.squaddieTemplateId
                )
            )
        }

        baseSquaddieTemplates.forEach((squaddieTemplate) => {
            SquaddieTemplateService.sanitize(squaddieTemplate)
            missionLoaderContext.squaddieData.templates[
                squaddieTemplate.squaddieId.templateId
            ] = squaddieTemplate
        })

        baseSquaddieTemplates.forEach((squaddieTemplate) => {
            const resources = squaddieTemplate.squaddieId.resources
            loadSquaddieTemplateResources({
                template: squaddieTemplate,
                missionLoaderContext,
                resources,
                resourceHandler,
                objectRepository,
            })
        })

        baseSquaddieTemplates.forEach((squaddieTemplate) => {
            const battleSquaddie: BattleSquaddie = BattleSquaddieService.new({
                battleSquaddieId: squaddieTemplate.squaddieId.templateId,
                inBattleAttributes: InBattleAttributesService.new({
                    armyAttributes: squaddieTemplate.attributes,
                }),
                squaddieTemplate,
            })

            ObjectRepositoryService.addSquaddie({
                repo: objectRepository,
                squaddieTemplate,
                battleSquaddie: battleSquaddie,
            })
        })
    },
}

const loadSquaddieTemplateResources = ({
    missionLoaderContext,
    resources,
    resourceHandler,
    template,
    objectRepository,
}: {
    missionLoaderContext: MissionLoaderContext
    resources: SquaddieResource
    resourceHandler: ResourceHandler
    template: SquaddieTemplate
    objectRepository: ObjectRepository
}) => {
    const squaddieTemplateResourceKeys =
        SquaddieTemplateService.getResourceKeys(template, objectRepository)
    resourceHandler.loadResources(squaddieTemplateResourceKeys)
    missionLoaderContext.resourcesPendingLoading.push(
        ...squaddieTemplateResourceKeys
    )
}

const initializeCameraPosition = ({
    missionLoaderContext,
}: {
    missionLoaderContext: MissionLoaderContext
}) => {
    const mapDimensions = TerrainTileMapService.getDimensions(
        missionLoaderContext.missionMap.terrainTileMap
    )
    missionLoaderContext.mapSettings.camera = new BattleCamera()
    missionLoaderContext.mapSettings.camera.setMapDimensionBoundaries(
        mapDimensions.widthOfWidestRow,
        mapDimensions.numberOfRows
    )
}

const initializeSquaddieResources = ({
    repository,
    missionLoaderContext,
    resourceHandler,
}: {
    repository: ObjectRepository
    missionLoaderContext: MissionLoaderContext
    resourceHandler: ResourceHandler
}) => {
    ObjectRepositoryService.getBattleSquaddieIterator(repository).forEach(
        (info) => {
            const { battleSquaddie, battleSquaddieId } = info
            const { squaddieTemplate } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    repository,
                    battleSquaddieId
                )
            )

            let image: p5.Image = resourceHandler.getResource(
                squaddieTemplate.squaddieId.resources.mapIconResourceKey
            )

            const datum = MissionMapService.getByBattleSquaddieId(
                missionLoaderContext.missionMap,
                battleSquaddie.battleSquaddieId
            )

            let screenX = ScreenDimensions.SCREEN_WIDTH
            let screenY = ScreenDimensions.SCREEN_HEIGHT
            if (datum.mapCoordinate !== undefined) {
                ;({ screenX, screenY } =
                    ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                        {
                            q: datum.mapCoordinate.q,
                            r: datum.mapCoordinate.r,
                            ...missionLoaderContext.mapSettings.camera.getCoordinates(),
                        }
                    ))
            }
            ObjectRepositoryService.addImageUIByBattleSquaddieId({
                repository,
                battleSquaddieId,
                imageUI: new ImageUI({
                    imageLoadingBehavior: {
                        resourceKey:
                            squaddieTemplate.squaddieId.resources
                                .mapIconResourceKey,
                        loadingBehavior:
                            ImageUILoadingBehavior.KEEP_AREA_RESIZE_IMAGE,
                    },
                    area: RectAreaService.new({
                        left: screenX,
                        top: screenY,
                        width: image.width,
                        height: image.height,
                        horizAlign: HORIZONTAL_ALIGN.CENTER,
                        vertAlign: VERTICAL_ALIGN.CENTER,
                    }),
                }),
            })
        }
    )
}

const initializeCutscenes = ({
    missionLoaderContext,
    resourceHandler,
}: {
    missionLoaderContext: MissionLoaderContext
    resourceHandler: ResourceHandler
}) => {
    Object.entries(
        missionLoaderContext.cutsceneInfo.cutsceneCollection.cutsceneById
    ).forEach(([id, cutscene]) => {
        CutsceneService.setResources(cutscene, resourceHandler)
    })
}

const loadCutscenes = ({
    missionLoaderContext,
    missionData,
    resourceHandler,
}: {
    missionLoaderContext: MissionLoaderContext
    resourceHandler: ResourceHandler
    missionData: MissionFileFormat
}) => {
    const cutsceneById = Object.fromEntries(
        Object.entries(missionData.cutscene.cutsceneById).map(
            ([key, rawCutscene]) => {
                const cutscene = CutsceneService.new(rawCutscene)
                return [key, cutscene]
            }
        )
    )

    const cutsceneCollection = MissionCutsceneCollectionHelper.new({
        cutsceneById,
    })

    const cutsceneResourceKeys = Object.values(cutsceneCollection.cutsceneById)
        .map((cutscene) => {
            return cutscene.allResourceKeys
        })
        .flat()
    resourceHandler.loadResources(cutsceneResourceKeys)
    missionLoaderContext.resourcesPendingLoading = [
        ...missionLoaderContext.resourcesPendingLoading,
        ...cutsceneResourceKeys,
    ]

    const cutsceneTriggers: CutsceneTrigger[] =
        missionData.cutscene.cutsceneTriggers

    missionLoaderContext.cutsceneInfo.cutsceneCollection = cutsceneCollection
    missionLoaderContext.cutsceneInfo.cutsceneTriggers = cutsceneTriggers
}

const loadNPCTemplatesFromFile = async (
    templateIds: string[]
): Promise<{ [p: string]: SquaddieTemplate }> => {
    let squaddiesById: { [p: string]: SquaddieTemplate } = {}
    for (const templateId of templateIds) {
        try {
            const squaddieTemplate = await LoadFileIntoFormat<SquaddieTemplate>(
                `assets/npcData/${templateId}/${templateId}.json`
            )
            squaddiesById[templateId] =
                SquaddieTemplateService.sanitize(squaddieTemplate)
        } catch (e) {
            console.error(`Failed to load template: ${templateId}`)
            console.error(e)
            throw e
        }
    }
    return squaddiesById
}

const loadAndPrepareNPCTemplateData = async ({
    missionLoaderContext,
    resourceHandler,
    repository,
    loaderLock,
}: {
    missionLoaderContext: MissionLoaderContext
    resourceHandler: ResourceHandler
    repository: ObjectRepository
    loaderLock: {
        locked: boolean
    }
}) => {
    if (loaderLock.locked) {
        return
    }
    loaderLock.locked = true

    let loadedTemplatesById: { [p: string]: SquaddieTemplate } = {}
    const loadedNPCTemplatesById = await loadNPCTemplatesFromFile(
        Object.keys(missionLoaderContext.squaddieData.templates)
    )
    loadedTemplatesById = { ...loadedNPCTemplatesById }

    Object.values(loadedTemplatesById).forEach((template) => {
        SquaddieTemplateService.sanitize(template)
    })

    Object.assign(
        missionLoaderContext.squaddieData.templates,
        loadedTemplatesById
    )

    Object.values(loadedTemplatesById).forEach((template) => {
        const squaddieTemplateResourceKeys =
            SquaddieTemplateService.getResourceKeys(template, repository)
        resourceHandler.loadResources(squaddieTemplateResourceKeys)
        missionLoaderContext.resourcesPendingLoading.push(
            ...squaddieTemplateResourceKeys
        )
        ObjectRepositoryService.addSquaddieTemplate(repository, template)
    })
}

const spawnNPCSquaddiesAndAddToMap = ({
    repository,
    missionLoaderContext,
    missionData,
}: {
    repository: ObjectRepository
    missionLoaderContext: MissionLoaderContext
    missionData: MissionFileFormat
}) => {
    const deployments: NpcTeamMissionDeployment[] = [
        missionData.npcDeployments.enemy,
        missionData.npcDeployments.ally,
        missionData.npcDeployments.noAffiliation,
    ]

    deployments.forEach((deployment) =>
        deployment.mapPlacements.forEach((mapPlacement) => {
            let { coordinate, battleSquaddieId, squaddieTemplateId } =
                mapPlacement
            ObjectRepositoryService.addBattleSquaddie(
                repository,
                BattleSquaddieService.newBattleSquaddie({
                    battleSquaddieId,
                    squaddieTemplateId,
                    squaddieTurn: SquaddieTurnService.new(),
                })
            )
            MissionMapService.addSquaddie({
                missionMap: missionLoaderContext.missionMap,
                squaddieTemplateId,
                battleSquaddieId,
                coordinate: coordinate,
            })
        })
    )
}

const createSquaddieTeams = ({
    missionData,
    missionLoaderContext,
}: {
    missionData: MissionFileFormat
    missionLoaderContext: MissionLoaderContext
}) => {
    const deploymentInfo: {
        affiliation: SquaddieAffiliation
        deployment: NpcTeamMissionDeployment
    }[] = [
        {
            affiliation: SquaddieAffiliation.ENEMY,
            deployment: missionData.npcDeployments.enemy,
        },
        {
            affiliation: SquaddieAffiliation.ALLY,
            deployment: missionData.npcDeployments.ally,
        },
        {
            affiliation: SquaddieAffiliation.NONE,
            deployment: missionData.npcDeployments.noAffiliation,
        },
    ]

    deploymentInfo.forEach((info) =>
        info.deployment.teams.forEach((npcTeam) => {
            const team: BattleSquaddieTeam = {
                id: npcTeam.id,
                name: npcTeam.name,
                affiliation: info.affiliation,
                battleSquaddieIds: npcTeam.battleSquaddieIds,
                iconResourceKey: npcTeam.iconResourceKey,
            }
            missionLoaderContext.squaddieData.teams ||= []
            missionLoaderContext.squaddieData.teams.push(team)
            missionLoaderContext.squaddieData.teamStrategyById[team.id] ||= []
            missionLoaderContext.squaddieData.teamStrategyById[team.id].push(
                ...npcTeam.strategies
            )
        })
    )
}

const deployRequiredPlayerSquaddies = (
    missionLoaderContext: MissionLoaderContext,
    missionData: MissionFileFormat
) => {
    missionLoaderContext.missionMap.playerDeployment = {
        ...missionData.player.deployment,
    }
    missionLoaderContext.missionMap.playerDeployment.required.forEach(
        (requiredDeployment) => {
            MissionMapService.addSquaddie({
                missionMap: missionLoaderContext.missionMap,
                squaddieTemplateId: requiredDeployment.squaddieTemplateId,
                battleSquaddieId: requiredDeployment.battleSquaddieId,
                coordinate: requiredDeployment.coordinate,
            })
        }
    )
}

const createPlayerSquaddieTeam = (
    missionLoaderContext: MissionLoaderContext,
    missionData: MissionFileFormat
) => {
    missionLoaderContext.squaddieData.teams ||= []
    missionLoaderContext.squaddieData.teams.push({
        id: missionData.player.teamId,
        name: missionData.player.teamName,
        affiliation: SquaddieAffiliation.PLAYER,
        battleSquaddieIds: missionData.player.deployment.required.map(
            (info) => info.battleSquaddieId
        ),
        iconResourceKey: missionData.player.iconResourceKey,
    })
}

const loadPhaseAffiliationBanners = (
    missionLoaderContext: MissionLoaderContext,
    missionData: MissionFileFormat,
    repository: ObjectRepository,
    resourceHandler: ResourceHandler
) => {
    missionLoaderContext.phaseBannersByAffiliation = {
        ...missionData.phaseBannersByAffiliation,
    }
    Object.entries(missionLoaderContext.phaseBannersByAffiliation).forEach(
        ([affiliationKey, resourceKeyName]) => {
            if (!isValidValue(resourceKeyName) || resourceKeyName === "") {
                return
            }

            const affiliation: SquaddieAffiliation =
                affiliationKey as SquaddieAffiliation
            repository.uiElements.phaseBannersByAffiliation[affiliation] =
                resourceKeyName

            resourceHandler.loadResource(resourceKeyName)
            missionLoaderContext.resourcesPendingLoading.push(resourceKeyName)
        }
    )
}

const loadTeamIcons = (
    missionLoaderContext: MissionLoaderContext,
    missionData: MissionFileFormat,
    repository: ObjectRepository,
    resourceHandler: ResourceHandler
) => {
    repository.uiElements.teamAffiliationIcons = {}

    const playerTeamIconResourceKey = missionData.player.iconResourceKey
    if (
        isValidValue(playerTeamIconResourceKey) &&
        playerTeamIconResourceKey !== ""
    ) {
        repository.uiElements.teamAffiliationIcons[missionData.player.teamId] =
            playerTeamIconResourceKey
        resourceHandler.loadResource(playerTeamIconResourceKey)
        missionLoaderContext.resourcesPendingLoading.push(
            playerTeamIconResourceKey
        )
    }

    const deployments: NpcTeamMissionDeployment[] = [
        missionData.npcDeployments.enemy,
        missionData.npcDeployments.ally,
        missionData.npcDeployments.noAffiliation,
    ]

    deployments.forEach((deployment) =>
        deployment.teams
            .filter(
                (team) =>
                    isValidValue(team.iconResourceKey) &&
                    team.iconResourceKey !== ""
            )
            .forEach((team) => {
                const teamIconResourceKey = team.iconResourceKey
                repository.uiElements.teamAffiliationIcons[team.id] =
                    teamIconResourceKey
                resourceHandler.loadResource(teamIconResourceKey)
                missionLoaderContext.resourcesPendingLoading.push(
                    teamIconResourceKey
                )
            })
    )
}

const loadActionTemplates = async ({
    objectRepository,
}: {
    objectRepository: ObjectRepository
}) => {
    const loadActionTemplatesFromFile = async (
        filename: string,
        errorMessage: string
    ): Promise<ActionTemplate[]> => {
        try {
            return await LoadFileIntoFormat<ActionTemplate[]>(filename)
        } catch (e) {
            console.error(errorMessage)
            console.error(e)
            throw e
        }
    }

    const npcActionTemplatesFromFile: ActionTemplate[] =
        await loadActionTemplatesFromFile(
            `assets/npcData/action_templates.json`,
            `Failed to load NPC action templates`
        )

    const playerActionTemplatesFromFile: ActionTemplate[] =
        await loadActionTemplatesFromFile(
            `assets/playerArmy/action_templates.json`,
            `Failed to load player action templates`
        )

    ;[...npcActionTemplatesFromFile, ...playerActionTemplatesFromFile].forEach(
        (actionTemplate) => {
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                ActionTemplateService.sanitize(actionTemplate)
            )
        }
    )
}
