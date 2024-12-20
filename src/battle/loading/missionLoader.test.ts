import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { ResourceHandler } from "../../resource/resourceHandler"
import {
    MissionFileFormat,
    NpcTeam,
    NpcTeamMissionDeployment,
} from "../../dataLoader/missionLoader"
import { MissionLoader, MissionLoaderContext } from "./missionLoader"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { DEFAULT_VICTORY_CUTSCENE_ID } from "../orchestrator/missionCutsceneCollection"
import { MissionObjectiveHelper } from "../missionResult/missionObjective"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { PlayerArmy } from "../../campaign/playerArmy"
import { CutsceneService } from "../../cutscene/cutscene"
import { isValidValue } from "../../utils/validityCheck"
import { CutsceneActionPlayerType } from "../../cutscene/cutsceneAction"
import { Dialogue } from "../../cutscene/dialogue/dialogue"
import { SplashScreen } from "../../cutscene/splashScreen"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { LoadCampaignData } from "../../utils/fileHandling/loadCampaignData"
import { MissionMapService } from "../../missionMap/missionMap"
import { beforeEach, describe, expect, it, MockInstance, vi } from "vitest"

describe("Mission Loader", () => {
    let resourceHandler: ResourceHandler
    let missionData: MissionFileFormat
    let loadFileIntoFormatSpy: MockInstance
    let missionLoaderContext: MissionLoaderContext
    let objectRepository: ObjectRepository
    let enemyDemonSlitherTemplate: SquaddieTemplate
    let enemyDemonSlitherTemplate2: SquaddieTemplate
    let npcActionTemplates: ActionTemplate[]
    let playerActionTemplates: ActionTemplate[]
    let playerArmy: PlayerArmy

    beforeEach(() => {
        resourceHandler = mocks.mockResourceHandler(
            new MockedP5GraphicsBuffer()
        )
        resourceHandler.loadResources = vi.fn()
        resourceHandler.loadResource = vi.fn()
        resourceHandler.areAllResourcesLoaded = vi.fn().mockReturnValue(true)
        ;({
            loadFileIntoFormatSpy,
            playerArmy,
            missionData,
            enemyDemonSlitherTemplate,
            enemyDemonSlitherTemplate2,
            npcActionTemplates,
            playerActionTemplates,
        } = LoadCampaignData.createLoadFileSpy())

        missionLoaderContext = MissionLoader.newEmptyMissionLoaderContext()
        objectRepository = ObjectRepositoryService.new()
    })

    it("knows it has not started yet", () => {
        expect(missionLoaderContext.completionProgress.started).toBeFalsy()
        expect(
            missionLoaderContext.completionProgress.loadedFileData
        ).toBeFalsy()
    })

    describe("can load mission data from a file", () => {
        beforeEach(async () => {
            await MissionLoader.loadMissionFromFile({
                missionLoaderContext: missionLoaderContext,
                missionId: "0000",
                resourceHandler,
                objectRepository: objectRepository,
            })
        })

        it("calls the loading function", () => {
            expect(loadFileIntoFormatSpy).toBeCalled()
        })

        it("reports file loading was a success", () => {
            expect(
                missionLoaderContext.completionProgress.loadedFileData
            ).toBeTruthy()
        })

        it("loads the mission id", () => {
            expect(missionLoaderContext.id).toBe("test mission")
        })

        it("loaded the mission map", () => {
            expect(missionLoaderContext.missionMap.terrainTileMap).toEqual(
                TerrainTileMapService.new({
                    movementCost: [
                        "x x x x x 2 2 1 1 1 1 1 2 2 x x x ",
                        " 1 1 1 1 2 2 2 1 1 1 1 2 2 1 1 1 1 ",
                        "  x x x x 2 2 1 1 1 1 1 2 2 1 1 1 1 ",
                        "   x x x x x x x x x x x x x x 1 1 1 ",
                        "    1 1 1 1 1 1 1 1 1 1 1 1 1 x 1 1 1 ",
                        "     1 1 1 1 1 1 1 1 1 1 1 1 1 x 1 1 1 ",
                        "      1 1 1 1 1 1 1 1 1 1 1 1 x 1 1 1 1 ",
                        "       1 1 1 1 1 1 1 1 1 1 1 x 1 1 1 1 1 ",
                        "        x x x x x x x x x x x 2 1 1 1 1 1 ",
                        "         1 1 1 1 1 1 x 2 2 2 1 1 1 1 2 2 2 ",
                        "          1 1 1 1 1 x 2 1 1 1 1 1 1 1 1 1 2 ",
                        "           1 1 1 1 x 2 1 1 1 2 2 2 1 1 1 1 2 ",
                        "            1 1 1 x 2 1 1 1 1 O O 1 1 1 1 1 2 ",
                        "             1 1 1 x 2 1 1 1 O O O 1 1 1 1 1 2 ",
                        "              1 1 1 x 2 1 1 1 O O 1 1 1 1 1 1 2 ",
                        "               1 1 1 x 2 1 1 1 1 1 1 1 1 1 1 2 x ",
                        "                1 1 1 x 2 1 1 1 1 1 1 1 1 1 2 x 1 ",
                        "                 1 1 1 x 2 2 2 2 2 2 2 2 2 2 x 1 1 ",
                    ],
                })
            )
        })

        it("can extract and validate objectives", () => {
            const clonedObjectives = missionData.objectives.map((obj) => {
                return { ...obj }
            })
            expect(clonedObjectives[0]).not.toBe(
                missionLoaderContext.objectives[0]
            )
            expect(clonedObjectives[0]).toEqual(
                missionLoaderContext.objectives[0]
            )
            const validatedMissionObjectives = clonedObjectives.map(
                MissionObjectiveHelper.validateMissionObjective
            )
            expect(missionLoaderContext.objectives).toEqual(
                validatedMissionObjectives
            )
        })

        it("initializes the camera", () => {
            expect(
                missionLoaderContext.mapSettings.camera.mapDimensionBoundaries
                    .widthOfWidestRow
            ).toBe(17)
            expect(
                missionLoaderContext.mapSettings.camera.mapDimensionBoundaries
                    .numberOfRows
            ).toBe(18)
        })

        it("gets cutscenes", () => {
            expect(Object.keys(missionData.cutscene.cutsceneById)).toEqual(
                Object.keys(
                    missionLoaderContext.cutsceneInfo.cutsceneCollection
                        .cutsceneById
                )
            )

            expect(missionLoaderContext.resourcesPendingLoading).toContain(
                "tutorial-confirm-cancel"
            )
            expect(missionLoaderContext.resourcesPendingLoading).toContain(
                "splash victory"
            )
            expect(
                missionLoaderContext.resourcesPendingLoading.every((key) =>
                    isValidValue(key)
                )
            ).toBeTruthy()

            expect(missionLoaderContext.cutsceneInfo.cutsceneTriggers).toEqual(
                missionData.cutscene.cutsceneTriggers
            )

            const introductionCutsceneDirections =
                missionData.cutscene.cutsceneById["introduction"].directions[0]
            expect(introductionCutsceneDirections.type).toEqual(
                CutsceneActionPlayerType.DIALOGUE
            )
            expect(
                (introductionCutsceneDirections as Dialogue).backgroundColor
            ).toEqual([1, 2, 3])

            const victoryCutsceneDirections =
                missionData.cutscene.cutsceneById[DEFAULT_VICTORY_CUTSCENE_ID]
                    .directions
            expect(
                victoryCutsceneDirections[victoryCutsceneDirections.length - 1]
                    .type
            ).toEqual(CutsceneActionPlayerType.SPLASH_SCREEN)
            expect(
                (
                    victoryCutsceneDirections[
                        victoryCutsceneDirections.length - 1
                    ] as SplashScreen
                ).backgroundColor
            ).toEqual([10, 11, 12])
        })

        describe("npc squaddie information", () => {
            it("knows the template ids for this map", () => {
                expect(
                    missionLoaderContext.squaddieData.templates
                ).toHaveProperty(
                    enemyDemonSlitherTemplate.squaddieId.templateId
                )
                expect(
                    missionLoaderContext.squaddieData.templates[
                        enemyDemonSlitherTemplate.squaddieId.templateId
                    ]
                ).toEqual(enemyDemonSlitherTemplate)

                expect(
                    missionLoaderContext.squaddieData.templates
                ).toHaveProperty(
                    enemyDemonSlitherTemplate2.squaddieId.templateId
                )
                expect(
                    missionLoaderContext.squaddieData.templates[
                        enemyDemonSlitherTemplate2.squaddieId.templateId
                    ]
                ).toEqual(enemyDemonSlitherTemplate2)
            })
            it("knows it has to load resources based on the template resources", () => {
                expect(missionLoaderContext.resourcesPendingLoading).toEqual(
                    expect.arrayContaining(
                        SquaddieTemplateService.getResourceKeys(
                            enemyDemonSlitherTemplate,
                            objectRepository
                        )
                    )
                )

                expect(resourceHandler.loadResources).toBeCalledWith(
                    SquaddieTemplateService.getResourceKeys(
                        enemyDemonSlitherTemplate,
                        objectRepository
                    )
                )
            })
            it("knows to add the template to the repository", () => {
                expect(
                    ObjectRepositoryService.getSquaddieTemplateIterator(
                        objectRepository
                    ).length
                ).toBeGreaterThan(0)
                expect(
                    ObjectRepositoryService.getSquaddieTemplateIterator(
                        objectRepository
                    ).some(
                        (val) =>
                            val.squaddieTemplateId ===
                            enemyDemonSlitherTemplate.squaddieId.templateId
                    )
                ).toBeTruthy()
                expect(
                    ObjectRepositoryService.getSquaddieTemplateIterator(
                        objectRepository
                    ).some(
                        (val) =>
                            val.squaddieTemplateId ===
                            enemyDemonSlitherTemplate2.squaddieId.templateId
                    )
                ).toBeTruthy()
            })
            it("adds battle squaddies to the repository", () => {
                const npcDeployments: NpcTeamMissionDeployment[] = [
                    missionData.npcDeployments.enemy,
                    missionData.npcDeployments.ally,
                    missionData.npcDeployments.noAffiliation,
                ]

                npcDeployments.forEach((deployment) =>
                    deployment.mapPlacements.forEach((placement) => {
                        const { battleSquaddie } = getResultOrThrowError(
                            ObjectRepositoryService.getSquaddieByBattleId(
                                objectRepository,
                                placement.battleSquaddieId
                            )
                        )
                        expect(battleSquaddie.battleSquaddieId).toEqual(
                            placement.battleSquaddieId
                        )
                        expect(battleSquaddie.squaddieTemplateId).toEqual(
                            placement.squaddieTemplateId
                        )
                    })
                )
            })
            it("adds squaddies to the map", () => {
                const npcDeployments: NpcTeamMissionDeployment[] = [
                    missionData.npcDeployments.enemy,
                    missionData.npcDeployments.ally,
                    missionData.npcDeployments.noAffiliation,
                ]

                npcDeployments.forEach((deployment) =>
                    deployment.mapPlacements.forEach((placement) => {
                        const {
                            battleSquaddieId,
                            squaddieTemplateId,
                            mapCoordinate,
                        } = MissionMapService.getByBattleSquaddieId(
                            missionLoaderContext.missionMap,
                            placement.battleSquaddieId
                        )
                        expect(battleSquaddieId).toEqual(
                            placement.battleSquaddieId
                        )
                        expect(squaddieTemplateId).toEqual(
                            placement.squaddieTemplateId
                        )
                        expect(mapCoordinate).toEqual(placement.location)
                    })
                )
            })
            describe("creates enemy teams", () => {
                it("creates enemy teams", () => {
                    const enemyNpcTeam0: NpcTeam =
                        missionData.npcDeployments.enemy.teams[0]
                    expect(
                        missionLoaderContext.squaddieData.teams
                    ).toContainEqual({
                        affiliation: SquaddieAffiliation.ENEMY,
                        id: enemyNpcTeam0.id,
                        name: enemyNpcTeam0.name,
                        battleSquaddieIds: enemyNpcTeam0.battleSquaddieIds,
                        iconResourceKey: enemyNpcTeam0.iconResourceKey,
                    })
                    expect(
                        missionLoaderContext.squaddieData.teams.some(
                            (team) =>
                                team.id ===
                                missionData.npcDeployments.enemy.teams[1].id
                        )
                    ).toBeTruthy()
                })
                it("creates team strategies", () => {
                    expect(
                        missionLoaderContext.squaddieData.teamStrategyById[
                            missionData.npcDeployments.enemy.teams[0].id
                        ]
                    ).toEqual(
                        missionData.npcDeployments.enemy.teams[0].strategies
                    )
                })
            })
            describe("creates other NPC teams", () => {
                const affiliations: {
                    name: string
                    affiliation: SquaddieAffiliation
                }[] = [
                    {
                        name: "ally",
                        affiliation: SquaddieAffiliation.ALLY,
                    },
                    {
                        name: "no affiliation",
                        affiliation: SquaddieAffiliation.NONE,
                    },
                ]

                const getNpcTeamByAffiliation = (
                    affiliation: SquaddieAffiliation
                ): NpcTeam => {
                    switch (affiliation) {
                        case SquaddieAffiliation.ALLY:
                            return missionData.npcDeployments.ally.teams[0]
                        case SquaddieAffiliation.NONE:
                            return missionData.npcDeployments.noAffiliation
                                .teams[0]
                    }
                    return undefined
                }

                it.each(affiliations)(
                    `create $name deployment`,
                    ({ name, affiliation }) => {
                        const npcTeam0 = getNpcTeamByAffiliation(affiliation)
                        expect(
                            missionLoaderContext.squaddieData.teams
                        ).toContainEqual({
                            affiliation,
                            id: npcTeam0.id,
                            name: npcTeam0.name,
                            battleSquaddieIds: npcTeam0.battleSquaddieIds,
                            iconResourceKey: npcTeam0.iconResourceKey,
                        })
                        expect(
                            missionLoaderContext.squaddieData.teams.some(
                                (team) => team.id === npcTeam0.id
                            )
                        ).toBeTruthy()
                    }
                )

                it.each(affiliations)(
                    `create $name team strategies`,
                    ({ name, affiliation }) => {
                        const npcTeam0 = getNpcTeamByAffiliation(affiliation)
                        expect(
                            missionLoaderContext.squaddieData.teamStrategyById[
                                npcTeam0.id
                            ]
                        ).toEqual(npcTeam0.strategies)
                    }
                )
            })
            it("creates affiliation banners", () => {
                expect(missionLoaderContext.phaseBannersByAffiliation).toEqual(
                    missionData.phaseBannersByAffiliation
                )

                Object.values(missionData.phaseBannersByAffiliation)
                    .filter((key) => key !== "")
                    .forEach((bannerResourceKey) => {
                        expect(
                            missionLoaderContext.resourcesPendingLoading
                        ).toContain(bannerResourceKey)
                    })
            })
            it("adds action templates to the repository", () => {
                expect(
                    npcActionTemplates.every(
                        (template) =>
                            ObjectRepositoryService.getActionTemplateById(
                                objectRepository,
                                template.id
                            ) === template
                    )
                ).toBeTruthy()
            })
        })
    })

    describe("can load player army information", () => {
        let initialPendingResourceListLength: number

        beforeEach(async () => {
            await MissionLoader.loadMissionFromFile({
                missionLoaderContext: missionLoaderContext,
                missionId: "0000",
                resourceHandler,
                objectRepository: objectRepository,
            })

            initialPendingResourceListLength =
                missionLoaderContext.resourcesPendingLoading.length

            await MissionLoader.loadPlayerArmyFromFile({
                missionLoaderContext: missionLoaderContext,
                resourceHandler,
                objectRepository,
            })
        })

        it("gets player squaddie templates", () => {
            expect(
                missionLoaderContext.squaddieData.templates[
                    playerArmy.squaddieTemplates[0].squaddieId.templateId
                ]
            ).toEqual(playerArmy.squaddieTemplates[0])
            expect(
                missionLoaderContext.squaddieData.templates[
                    playerArmy.squaddieTemplates[1].squaddieId.templateId
                ]
            ).toEqual(playerArmy.squaddieTemplates[1])
        })

        it("adds resource keys to the list of resources to load", () => {
            expect(
                missionLoaderContext.resourcesPendingLoading.length
            ).toBeGreaterThan(initialPendingResourceListLength)

            const player0ResourceKeys = SquaddieTemplateService.getResourceKeys(
                playerArmy.squaddieTemplates[0],
                objectRepository
            )
            expect(missionLoaderContext.resourcesPendingLoading).toEqual(
                expect.arrayContaining(player0ResourceKeys)
            )
            expect(resourceHandler.loadResources).toBeCalledWith(
                player0ResourceKeys
            )

            const player1ResourceKeys = SquaddieTemplateService.getResourceKeys(
                playerArmy.squaddieTemplates[1],
                objectRepository
            )
            expect(missionLoaderContext.resourcesPendingLoading).toEqual(
                expect.arrayContaining(player1ResourceKeys)
            )
            expect(resourceHandler.loadResources).toBeCalledWith(
                player1ResourceKeys
            )
        })

        it("adds player squaddies to the repository", () => {
            expect(
                ObjectRepositoryService.getSquaddieTemplateIterator(
                    objectRepository
                ).some(
                    (template) =>
                        template.squaddieTemplateId ===
                        playerArmy.squaddieTemplates[0].squaddieId.templateId
                )
            ).toBeTruthy()
            expect(
                ObjectRepositoryService.getSquaddieTemplateIterator(
                    objectRepository
                ).some(
                    (template) =>
                        template.squaddieTemplateId ===
                        playerArmy.squaddieTemplates[1].squaddieId.templateId
                )
            ).toBeTruthy()
        })

        it("adds player deployment positions to the map", () => {
            expect(missionLoaderContext.missionMap.playerDeployment).toEqual(
                missionData.player.deployment
            )
        })

        it("loads the required player deployments onto the map", () => {
            missionData.player.deployment.required.forEach(
                (requiredDeployment) => {
                    const locationDescriptor =
                        MissionMapService.getByBattleSquaddieId(
                            missionLoaderContext.missionMap,
                            requiredDeployment.battleSquaddieId
                        )
                    expect(locationDescriptor.battleSquaddieId).toEqual(
                        requiredDeployment.battleSquaddieId
                    )
                    expect(locationDescriptor.squaddieTemplateId).toEqual(
                        requiredDeployment.squaddieTemplateId
                    )
                    expect(locationDescriptor.mapCoordinate).toEqual(
                        requiredDeployment.location
                    )
                }
            )
        })

        it("adds the player team using the required squaddies", () => {
            expect(missionLoaderContext.squaddieData.teams).toContainEqual({
                affiliation: SquaddieAffiliation.PLAYER,
                id: missionData.player.teamId,
                name: missionData.player.teamName,
                battleSquaddieIds: missionData.player.deployment.required.map(
                    (info) => info.battleSquaddieId
                ),
                iconResourceKey: missionData.player.iconResourceKey,
            })
        })

        it("gets squaddies and queues resources to load based on the squaddie resources", () => {
            expect(
                ObjectRepositoryService.getSquaddieTemplateIterator(
                    objectRepository
                ).length
            ).toBeGreaterThan(0)
            expect(
                missionLoaderContext.squaddieData.teams.length
            ).toBeGreaterThan(0)
            expect(
                Object.keys(missionLoaderContext.squaddieData.teamStrategyById)
                    .length
            ).toBeGreaterThan(0)

            expect(
                missionLoaderContext.resourcesPendingLoading.length
            ).toBeGreaterThan(initialPendingResourceListLength)
        })

        it("adds action templates to the repository", () => {
            expect(
                playerActionTemplates.every(
                    (template) =>
                        ObjectRepositoryService.getActionTemplateById(
                            objectRepository,
                            template.id
                        ) === template
                )
            ).toBeTruthy()
        })
    })

    it("can reduce the pending resources", () => {
        missionLoaderContext.resourcesPendingLoading = ["A", "B", "C"]
        resourceHandler.isResourceLoaded = vi
            .fn()
            .mockImplementation((_: string) => {
                return false
            })
        MissionLoader.checkResourcesPendingLoading({
            missionLoaderContext,
            resourceHandler,
        })
        expect(missionLoaderContext.resourcesPendingLoading).toEqual([
            "A",
            "B",
            "C",
        ])

        resourceHandler.isResourceLoaded = vi
            .fn()
            .mockImplementation((resourceKey: string) => {
                return resourceKey === "A"
            })
        MissionLoader.checkResourcesPendingLoading({
            missionLoaderContext,
            resourceHandler,
        })
        expect(missionLoaderContext.resourcesPendingLoading).toEqual(["B", "C"])

        resourceHandler.isResourceLoaded = vi
            .fn()
            .mockImplementation((_: string) => {
                return true
            })
        MissionLoader.checkResourcesPendingLoading({
            missionLoaderContext,
            resourceHandler,
        })
        expect(missionLoaderContext.resourcesPendingLoading).toEqual([])
    })

    describe("initializes resources once loading is finished and resources are found", () => {
        beforeEach(async () => {
            resourceHandler.getResource = vi
                .fn()
                .mockReturnValue({ width: 1, height: 1 })

            await MissionLoader.loadMissionFromFile({
                missionLoaderContext: missionLoaderContext,
                missionId: "0000",
                resourceHandler,
                objectRepository: objectRepository,
            })

            vi.spyOn(resourceHandler, "isResourceLoaded").mockReturnValue(true)
            resourceHandler.loadResources(
                missionLoaderContext.resourcesPendingLoading
            )

            MissionLoader.assignResourceHandlerResources({
                missionLoaderContext,
                resourceHandler,
                repository: objectRepository,
            })
        })

        it("initializes squaddie resources", () => {
            expect(
                Object.keys(objectRepository.imageUIByBattleSquaddieId)
            ).toHaveLength(
                ObjectRepositoryService.getBattleSquaddieIterator(
                    objectRepository
                ).length
            )
        })

        it("initializes cutscenes", () => {
            expect(
                CutsceneService.hasLoaded(
                    missionLoaderContext.cutsceneInfo.cutsceneCollection
                        .cutsceneById[DEFAULT_VICTORY_CUTSCENE_ID],
                    resourceHandler
                )
            ).toBeTruthy()
        })

        it("has the squaddie templates that were loaded from files", () => {
            expect(
                ObjectRepositoryService.getSquaddieTemplateIterator(
                    objectRepository
                ).some(
                    (val) =>
                        val.squaddieTemplateId ===
                        enemyDemonSlitherTemplate.squaddieId.templateId
                )
            ).toBeTruthy()
            expect(
                ObjectRepositoryService.getSquaddieTemplateIterator(
                    objectRepository
                ).some(
                    (val) =>
                        val.squaddieTemplateId ===
                        enemyDemonSlitherTemplate2.squaddieId.templateId
                )
            ).toBeTruthy()
        })

        it("copies the banner by squaddie affiliation information", () => {
            expect(
                objectRepository.uiElements.phaseBannersByAffiliation
            ).toEqual(missionData.phaseBannersByAffiliation)
        })

        it("copies the team affiliation icons", () => {
            const expectedKeys: { [teamId: string]: string } = {}
            expectedKeys[missionData.player.teamId] =
                missionData.player.iconResourceKey
            ;[
                missionData.npcDeployments.enemy,
                missionData.npcDeployments.ally,
                missionData.npcDeployments.noAffiliation,
            ].forEach((npcDeployment) =>
                npcDeployment.teams.forEach((team) => {
                    expectedKeys[team.id] = team.iconResourceKey
                })
            )

            expect(objectRepository.uiElements.teamAffiliationIcons).toEqual(
                expectedKeys
            )
        })
    })
})
