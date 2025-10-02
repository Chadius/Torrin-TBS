import { ResourceHandler } from "../../resource/resourceHandler"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import {
    MissionFileFormat,
    MissionLoaderService,
    NpcTeamMissionDeployment,
} from "../../dataLoader/missionLoader"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    MissionObjective,
    MissionObjectiveService,
} from "../missionResult/missionObjective"
import {
    MissionCutsceneCollection,
    MissionCutsceneCollectionHelper,
} from "../orchestrator/missionCutsceneCollection"
import {
    SquaddieAffiliation,
    TSquaddieAffiliation,
} from "../../squaddie/squaddieAffiliation"
import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { TeamStrategy } from "../teamStrategy/teamStrategy"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { SquaddieTurnService } from "../../squaddie/turn"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { ConvertCoordinateService } from "../../hexMap/convertCoordinates"
import { RectAreaService } from "../../ui/rectArea"
import { HORIZONTAL_ALIGN, VERTICAL_ALIGN } from "../../ui/constants"
import { BattleCamera } from "../battleCamera"
import { CutsceneService } from "../../cutscene/cutscene"
import { LoadFileIntoFormat } from "../../dataLoader/dataLoader"
import { PlayerArmy } from "../../campaign/playerArmy"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { isValidValue } from "../../utils/objectValidityCheck"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { ImageUI, ImageUILoadingBehavior } from "../../ui/imageUI/imageUI"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { ResourceHandlerBlocker } from "../../dataLoader/loadBlocker/resourceHandlerBlocker"
import { BattleEvent, BattleEventService } from "../event/battleEvent"

export interface MissionLoaderCompletionProgress {
    started: boolean
    loadedFileData: boolean
}

export interface MissionLoaderContext {
    id: string
    objectives: MissionObjective[]
    missionMap: MissionMap | undefined
    completionProgress: MissionLoaderCompletionProgress
    squaddieData: {
        teams: BattleSquaddieTeam[]
        teamStrategyById: { [key: string]: TeamStrategy[] }
        templates: { [id: string]: SquaddieTemplate | undefined }
    }
    cutsceneInfo: {
        cutsceneCollection: MissionCutsceneCollection | undefined
    }
    battleEvents: BattleEvent[]
    mapSettings: {
        camera: BattleCamera | undefined
    }
    phaseBannersByAffiliation: {
        [affiliation in TSquaddieAffiliation]?: string
    }
}

export const MissionLoader = {
    newEmptyMissionLoaderContext: (): MissionLoaderContext => {
        return {
            id: "",
            missionMap: undefined,
            objectives: [],
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
            },
            battleEvents: [],
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
    applyMissionData: async ({
        missionData,
        missionLoaderContext,
        objectRepository,
        loadBlocker,
    }: {
        missionData: MissionFileFormat
        missionLoaderContext: MissionLoaderContext
        objectRepository: ObjectRepository
        loadBlocker: ResourceHandlerBlocker
    }) => {
        missionLoaderContext.completionProgress.started = true
        missionLoaderContext.id = missionData.id

        missionLoaderContext.missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: missionData.terrain,
            }),
        })

        missionLoaderContext.objectives = missionData.objectives.map(
            MissionObjectiveService.validateMissionObjective
        )

        missionLoaderContext.completionProgress.loadedFileData = true

        missionLoaderContext.squaddieData.templates = {}
        missionData.npcDeployments.enemy?.templateIds.forEach(
            (id) =>
                (missionLoaderContext.squaddieData.templates[id] = undefined)
        )
        missionData.npcDeployments.ally?.templateIds.forEach(
            (id) =>
                (missionLoaderContext.squaddieData.templates[id] = undefined)
        )
        missionData.npcDeployments.noAffiliation?.templateIds.forEach(
            (id) =>
                (missionLoaderContext.squaddieData.templates[id] = undefined)
        )

        await loadActionTemplates({
            objectRepository,
        })
        await loadAndPrepareNPCTemplateData({
            missionLoaderContext,
            repository: objectRepository,
            loadBlocker,
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
            loadBlocker
        )
        loadTeamIcons(missionData, objectRepository, loadBlocker)
        loadCutscenes({
            missionLoaderContext,
            missionData,
            loadBlocker,
        })
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
    loadPlayerSquaddieTemplatesFile: async ({
        playerArmyData,
        missionLoaderContext,
        objectRepository,
        loadBlocker,
    }: {
        playerArmyData: PlayerArmy
        missionLoaderContext: MissionLoaderContext
        objectRepository: ObjectRepository
        loadBlocker: ResourceHandlerBlocker
    }) => {
        const baseSquaddieTemplates: SquaddieTemplate[] = []
        for (const build of playerArmyData.squaddieBuilds) {
            const loadedTemplate =
                await MissionLoaderService.loadBaseSquaddieTemplateBySquaddieTemplateId(
                    build.squaddieTemplateId
                )
            if (loadedTemplate == undefined) continue
            baseSquaddieTemplates.push(loadedTemplate)
        }

        baseSquaddieTemplates.forEach((squaddieTemplate) => {
            SquaddieTemplateService.sanitize(squaddieTemplate)
            missionLoaderContext.squaddieData.templates[
                squaddieTemplate.squaddieId.templateId
            ] = squaddieTemplate
        })

        baseSquaddieTemplates.forEach((squaddieTemplate) => {
            loadSquaddieTemplateResources({
                template: squaddieTemplate,
                objectRepository,
                loadBlocker,
            })
        })

        baseSquaddieTemplates.forEach((squaddieTemplate) => {
            if (
                ObjectRepositoryService.hasSquaddieByTemplateId(
                    objectRepository,
                    squaddieTemplate.squaddieId.templateId
                )
            )
                return
            ObjectRepositoryService.addSquaddieTemplate(
                objectRepository,
                squaddieTemplate
            )
        })
    },
    createAndAddBattleSquaddies: async ({
        playerArmyData,
        objectRepository,
    }: {
        playerArmyData: PlayerArmy
        objectRepository: ObjectRepository
    }) => {
        const baseSquaddieTemplates: SquaddieTemplate[] = []
        for (const build of playerArmyData.squaddieBuilds) {
            const loadedTemplate =
                await MissionLoaderService.loadBaseSquaddieTemplateBySquaddieTemplateId(
                    build.squaddieTemplateId
                )
            if (loadedTemplate == undefined) continue
            baseSquaddieTemplates.push(loadedTemplate)
        }

        baseSquaddieTemplates.forEach((squaddieTemplate) => {
            const battleSquaddie: BattleSquaddie = BattleSquaddieService.new({
                battleSquaddieId: squaddieTemplate.squaddieId.templateId,
                inBattleAttributes: InBattleAttributesService.new({
                    armyAttributes: squaddieTemplate.attributes,
                }),
                squaddieTemplate,
            })

            if (
                ObjectRepositoryService.hasSquaddieByBattleId(
                    objectRepository,
                    battleSquaddie.battleSquaddieId
                )
            )
                return
            ObjectRepositoryService.addBattleSquaddie(
                objectRepository,
                battleSquaddie
            )
        })
    },
}

const loadSquaddieTemplateResources = ({
    template,
    objectRepository,
    loadBlocker,
}: {
    template: SquaddieTemplate
    objectRepository: ObjectRepository
    loadBlocker: ResourceHandlerBlocker
}) => {
    const squaddieTemplateResourceKeys =
        SquaddieTemplateService.getResourceKeys(template, objectRepository)
    loadBlocker.queueResourceToLoad(squaddieTemplateResourceKeys)
}

const initializeCameraPosition = ({
    missionLoaderContext,
}: {
    missionLoaderContext: MissionLoaderContext
}) => {
    if (missionLoaderContext.missionMap == undefined) return
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
            const { squaddieTemplate } =
                ObjectRepositoryService.getSquaddieByBattleId(
                    repository,
                    battleSquaddieId
                )

            if (
                squaddieTemplate.squaddieId.resources.mapIconResourceKey ==
                undefined
            )
                return
            if (missionLoaderContext.missionMap == undefined) return
            if (missionLoaderContext.mapSettings.camera == undefined) return
            let image = resourceHandler.getResource(
                squaddieTemplate.squaddieId.resources.mapIconResourceKey
            )
            if (image == undefined) return

            const datum = MissionMapService.getByBattleSquaddieId(
                missionLoaderContext.missionMap,
                battleSquaddie.battleSquaddieId
            )

            let imageLeft = ScreenDimensions.SCREEN_WIDTH
            let imageTop = ScreenDimensions.SCREEN_HEIGHT
            if (datum.currentMapCoordinate !== undefined) {
                ;({ x: imageLeft, y: imageTop } =
                    ConvertCoordinateService.convertMapCoordinatesToScreenLocation(
                        {
                            mapCoordinate: datum.currentMapCoordinate,
                            cameraLocation:
                                missionLoaderContext.mapSettings.camera.getWorldLocation(),
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
                        left: imageLeft,
                        top: imageTop,
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
        missionLoaderContext.cutsceneInfo.cutsceneCollection?.cutsceneById ?? {}
    ).forEach(([_, cutscene]) => {
        CutsceneService.setResources(cutscene, resourceHandler)
    })
}

const loadCutscenes = ({
    missionLoaderContext,
    missionData,
    loadBlocker,
}: {
    missionLoaderContext: MissionLoaderContext
    missionData: MissionFileFormat
    loadBlocker: ResourceHandlerBlocker
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
    loadBlocker.queueResourceToLoad(cutsceneResourceKeys)

    missionLoaderContext.cutsceneInfo.cutsceneCollection = cutsceneCollection
    missionLoaderContext.battleEvents = missionData.battleEvents.map(
        (battleEvent) => BattleEventService.sanitize(battleEvent)
    )
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
    repository,
    loadBlocker,
}: {
    missionLoaderContext: MissionLoaderContext
    repository: ObjectRepository
    loadBlocker: ResourceHandlerBlocker
}) => {
    const loadedNPCTemplatesById = await loadNPCTemplatesFromFile(
        Object.keys(missionLoaderContext.squaddieData.templates)
    )
    let loadedTemplatesById: { [p: string]: SquaddieTemplate } = {
        ...loadedNPCTemplatesById,
    }

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
        loadBlocker.queueResourceToLoad(squaddieTemplateResourceKeys)
        if (
            !ObjectRepositoryService.hasSquaddieByTemplateId(
                repository,
                template.squaddieId.templateId
            )
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
    ].filter((x) => x != undefined)

    deployments.forEach((deployment) =>
        deployment.mapPlacements.forEach((mapPlacement) => {
            let { coordinate, battleSquaddieId, squaddieTemplateId } =
                mapPlacement
            if (
                !ObjectRepositoryService.hasSquaddieByBattleId(
                    repository,
                    battleSquaddieId
                )
            ) {
                ObjectRepositoryService.addBattleSquaddie(
                    repository,
                    BattleSquaddieService.newBattleSquaddie({
                        battleSquaddieId,
                        squaddieTemplateId,
                        squaddieTurn: SquaddieTurnService.new(),
                    })
                )
            }
            if (missionLoaderContext.missionMap == undefined) return
            MissionMapService.addSquaddie({
                missionMap: missionLoaderContext.missionMap,
                squaddieTemplateId,
                battleSquaddieId,
                originMapCoordinate: coordinate,
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
        affiliation: TSquaddieAffiliation
        deployment: NpcTeamMissionDeployment | undefined
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
        info.deployment?.teams.forEach((npcTeam) => {
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
    if (missionLoaderContext.missionMap == undefined) return
    missionLoaderContext.missionMap.playerDeployment = {
        ...missionData.player.deployment,
    }
    missionLoaderContext.missionMap.playerDeployment.required.forEach(
        (requiredDeployment) => {
            if (missionLoaderContext.missionMap == undefined) return
            MissionMapService.addSquaddie({
                missionMap: missionLoaderContext.missionMap,
                squaddieTemplateId: requiredDeployment.squaddieTemplateId,
                battleSquaddieId: requiredDeployment.battleSquaddieId,
                originMapCoordinate: requiredDeployment.coordinate,
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
    loadBlocker: ResourceHandlerBlocker
) => {
    missionLoaderContext.phaseBannersByAffiliation = {
        ...missionData.phaseBannersByAffiliation,
    }
    Object.entries(missionLoaderContext.phaseBannersByAffiliation).forEach(
        ([affiliationKey, resourceKeyName]) => {
            if (!isValidValue(resourceKeyName) || resourceKeyName === "") {
                return
            }

            const affiliation: TSquaddieAffiliation =
                affiliationKey as TSquaddieAffiliation
            repository.uiElements.phaseBannersByAffiliation[affiliation] =
                resourceKeyName

            loadBlocker.queueResourceToLoad(resourceKeyName)
        }
    )
}

const loadTeamIcons = (
    missionData: MissionFileFormat,
    repository: ObjectRepository,
    loadBlocker: ResourceHandlerBlocker
) => {
    repository.uiElements.teamAffiliationIcons = {}

    const playerTeamIconResourceKey = missionData.player.iconResourceKey
    if (
        isValidValue(playerTeamIconResourceKey) &&
        playerTeamIconResourceKey !== ""
    ) {
        repository.uiElements.teamAffiliationIcons[missionData.player.teamId] =
            playerTeamIconResourceKey
        loadBlocker.queueResourceToLoad(playerTeamIconResourceKey)
    }

    const deployments: NpcTeamMissionDeployment[] = [
        missionData.npcDeployments.enemy,
        missionData.npcDeployments.ally,
        missionData.npcDeployments.noAffiliation,
    ].filter((x) => x != undefined)

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
                loadBlocker.queueResourceToLoad(teamIconResourceKey)
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
            if (
                ObjectRepositoryService.hasActionTemplateId(
                    objectRepository,
                    actionTemplate.id
                )
            )
                return
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                ActionTemplateService.sanitize(actionTemplate)
            )
        }
    )
}
