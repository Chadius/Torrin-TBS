import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    LoadPlayerArmyFromFile,
    MissionFileFormat,
    NpcTeam,
    NpcTeamMissionDeployment,
} from "../../dataLoader/missionLoader"
import { MissionLoader, MissionLoaderContext } from "./missionLoader"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { DEFAULT_VICTORY_CUTSCENE_ID } from "../orchestrator/missionCutsceneCollection"
import { MissionObjectiveService } from "../missionResult/missionObjective"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import {
    SquaddieAffiliation,
    TSquaddieAffiliation,
} from "../../squaddie/squaddieAffiliation"
import { PlayerArmy } from "../../campaign/playerArmy"
import { isValidValue } from "../../utils/objectValidityCheck"
import { CutsceneActionPlayerType } from "../../cutscene/cutsceneAction"
import { Dialogue } from "../../cutscene/dialogue/dialogue"
import { SplashScreen } from "../../cutscene/splashScreen"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { LoadCampaignData } from "../../utils/fileHandling/loadCampaignData"
import { MissionMapService } from "../../missionMap/missionMap"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ResourceHandlerBlocker } from "../../dataLoader/loadBlocker/resourceHandlerBlocker"
import {
    MockedP5GraphicsBuffer,
    mockResourceHandler,
} from "../../utils/test/mocks"
import { MessageBoard } from "../../message/messageBoard"

describe("Mission Loader", () => {
    let loadBlocker: ResourceHandlerBlocker
    let missionData: MissionFileFormat
    let missionLoaderContext: MissionLoaderContext
    let objectRepository: ObjectRepository
    let enemyDemonSlitherTemplate: SquaddieTemplate
    let enemyDemonSlitherTemplate2: SquaddieTemplate
    let npcActionTemplates: ActionTemplate[]
    let playerActionTemplates: ActionTemplate[]
    let playerArmy: PlayerArmy

    beforeEach(() => {
        const resourceHandler = mockResourceHandler(
            new MockedP5GraphicsBuffer()
        )
        resourceHandler.loadResources = vi.fn()
        resourceHandler.loadResource = vi.fn()
        resourceHandler.areAllResourcesLoaded = vi.fn().mockReturnValue(true)
        ;({
            playerArmy,
            missionData,
            enemyDemonSlitherTemplate,
            enemyDemonSlitherTemplate2,
            npcActionTemplates,
            playerActionTemplates,
        } = LoadCampaignData.createLoadFileSpy())

        loadBlocker = new ResourceHandlerBlocker(
            resourceHandler,
            new MessageBoard()
        )
        missionLoaderContext = MissionLoader.newEmptyMissionLoaderContext()
        objectRepository = ObjectRepositoryService.new()
    })

    it("knows it has not started yet", () => {
        expect(missionLoaderContext.completionProgress.started).toBeFalsy()
        expect(
            missionLoaderContext.completionProgress.loadedFileData
        ).toBeFalsy()
    })

    describe("can apply mission data from a file", () => {
        beforeEach(async () => {
            await MissionLoader.applyMissionData({
                missionData,
                missionLoaderContext: missionLoaderContext,
                objectRepository: objectRepository,
                loadBlocker,
            })
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
            expect(missionLoaderContext.missionMap!.terrainTileMap).toEqual(
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
                MissionObjectiveService.validateMissionObjective
            )
            expect(missionLoaderContext.objectives).toEqual(
                validatedMissionObjectives
            )
        })

        it("initializes the camera", () => {
            expect(
                missionLoaderContext!.mapSettings!.camera!
                    .mapDimensionBoundaries!.widthOfWidestRow
            ).toBe(17)
            expect(
                missionLoaderContext!.mapSettings!.camera!
                    .mapDimensionBoundaries!.numberOfRows
            ).toBe(18)
        })

        it("gets cutscenes", () => {
            expect(Object.keys(missionData.cutscene.cutsceneById)).toEqual(
                Object.keys(
                    missionLoaderContext.cutsceneInfo.cutsceneCollection!
                        .cutsceneById
                )
            )

            expect(loadBlocker.resourceKeysToLoad).toContain(
                "tutorial-confirm-cancel"
            )
            expect(loadBlocker.resourceKeysToLoad).toContain("splash victory")
            expect(
                loadBlocker.resourceKeysToLoad.every((key) => isValidValue(key))
            ).toBeTruthy()

            expect(missionLoaderContext.battleEvents).toEqual(
                missionData.battleEvents
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
                expect(loadBlocker.resourceKeysToLoad).toEqual(
                    expect.arrayContaining(
                        SquaddieTemplateService.getResourceKeys(
                            enemyDemonSlitherTemplate,
                            objectRepository
                        )
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
                    missionData!.npcDeployments!.enemy!,
                    missionData!.npcDeployments!.ally!,
                    missionData!.npcDeployments!.noAffiliation!,
                ]

                npcDeployments.forEach((deployment) =>
                    deployment.mapPlacements.forEach((placement) => {
                        const { battleSquaddie } =
                            ObjectRepositoryService.getSquaddieByBattleId(
                                objectRepository,
                                placement.battleSquaddieId
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
                    missionData!.npcDeployments!.enemy!,
                    missionData!.npcDeployments!.ally!,
                    missionData!.npcDeployments!.noAffiliation!,
                ]

                npcDeployments.forEach((deployment) =>
                    deployment.mapPlacements.forEach((placement) => {
                        const {
                            battleSquaddieId,
                            squaddieTemplateId,
                            currentMapCoordinate,
                        } = MissionMapService.getByBattleSquaddieId(
                            missionLoaderContext!.missionMap!,
                            placement.battleSquaddieId
                        )
                        expect(battleSquaddieId).toEqual(
                            placement.battleSquaddieId
                        )
                        expect(squaddieTemplateId).toEqual(
                            placement.squaddieTemplateId
                        )
                        expect(currentMapCoordinate).toEqual(
                            placement.coordinate
                        )
                    })
                )
            })
            describe("creates enemy teams", () => {
                it("creates enemy teams", () => {
                    const enemyNpcTeam0: NpcTeam =
                        missionData!.npcDeployments!.enemy!.teams[0]!
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
                                missionData!.npcDeployments!.enemy!.teams[1]!.id
                        )
                    ).toBeTruthy()
                })
                it("creates team strategies", () => {
                    expect(
                        missionLoaderContext.squaddieData.teamStrategyById[
                            missionData!.npcDeployments!.enemy!.teams[0]!.id
                        ]
                    ).toEqual(
                        missionData!.npcDeployments!.enemy!.teams[0]!.strategies
                    )
                })
            })
            describe("creates other NPC teams", () => {
                const affiliations: {
                    name: string
                    affiliation: TSquaddieAffiliation
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
                    affiliation: TSquaddieAffiliation
                ): NpcTeam => {
                    switch (affiliation) {
                        case SquaddieAffiliation.ALLY:
                            return missionData!.npcDeployments!.ally!.teams[0]
                        case SquaddieAffiliation.NONE:
                            return missionData!.npcDeployments!.noAffiliation!
                                .teams[0]
                    }
                    throw new Error(`Unknown Affiliation "${affiliation}"`)
                }

                it.each(affiliations)(
                    `create $name deployment`,
                    ({ affiliation }) => {
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
                    ({ affiliation }) => {
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
                        expect(loadBlocker.resourceKeysToLoad).toContain(
                            bannerResourceKey
                        )
                    })
            })
            it("adds action templates to the repository", () => {
                expect(
                    npcActionTemplates.every(
                        (template) =>
                            ObjectRepositoryService.getActionTemplateById(
                                objectRepository,
                                template.id
                            ).toString() === template.toString()
                    )
                ).toBeTruthy()
            })
        })
    })

    describe("can load player army information", () => {
        let initialPendingResourceListLength: number
        let playerArmyData: PlayerArmy

        beforeEach(async () => {
            await MissionLoader.applyMissionData({
                missionData,
                missionLoaderContext: missionLoaderContext,
                loadBlocker,
                objectRepository: objectRepository,
            })

            initialPendingResourceListLength =
                loadBlocker.resourceKeysToLoad.length

            const tempPlayerArmyData = await LoadPlayerArmyFromFile()
            if (tempPlayerArmyData != undefined) {
                playerArmyData = tempPlayerArmyData
            } else {
                throw new Error("Failed to load player army")
            }

            await MissionLoader.loadPlayerSquaddieTemplatesFile({
                playerArmyData,
                loadBlocker,
                missionLoaderContext,
                objectRepository,
            })
        })

        it("gets player squaddie templates", () => {
            const missionLoaderContextSquaddieTemplateIds: string[] =
                Object.keys(missionLoaderContext.squaddieData.templates)
            const playerArmySquaddieTemplateIds: string[] =
                playerArmy.squaddieBuilds.map(
                    (build) => build.squaddieTemplateId
                )
            expect(missionLoaderContextSquaddieTemplateIds).toEqual(
                expect.arrayContaining(playerArmySquaddieTemplateIds)
            )
        })

        it("adds resource keys to the list of resources to load", () => {
            expect(loadBlocker.resourceKeysToLoad.length).toBeGreaterThan(
                initialPendingResourceListLength
            )

            const missionLoaderContextSquaddieTemplates: SquaddieTemplate[] =
                Object.values(
                    missionLoaderContext.squaddieData.templates
                ).filter((x) => x != undefined)
            missionLoaderContextSquaddieTemplates.forEach((template) => {
                const playerResourceKeys =
                    SquaddieTemplateService.getResourceKeys(
                        template,
                        objectRepository
                    )
                expect(loadBlocker.resourceKeysToLoad).toEqual(
                    expect.arrayContaining(playerResourceKeys)
                )
            })
        })

        it("adds player squaddie templates to the repository", () => {
            const missionLoaderContextSquaddieTemplateIds: string[] =
                Object.keys(missionLoaderContext.squaddieData.templates)

            missionLoaderContextSquaddieTemplateIds.forEach((templateId) =>
                expect(
                    ObjectRepositoryService.getSquaddieTemplateIterator(
                        objectRepository
                    ).some(
                        (template) => template.squaddieTemplateId === templateId
                    )
                ).toBeTruthy()
            )
        })

        it("adds player deployment positions to the map", () => {
            expect(missionLoaderContext!.missionMap!.playerDeployment).toEqual(
                missionData.player.deployment
            )
        })

        it("loads the required player deployments onto the map", async () => {
            await MissionLoader.createAndAddBattleSquaddies({
                playerArmyData,
                objectRepository,
            })

            missionData.player.deployment.required.forEach(
                (requiredDeployment) => {
                    const coordinateDescriptor =
                        MissionMapService.getByBattleSquaddieId(
                            missionLoaderContext!.missionMap!,
                            requiredDeployment.battleSquaddieId
                        )
                    expect(coordinateDescriptor.battleSquaddieId).toEqual(
                        requiredDeployment.battleSquaddieId
                    )
                    expect(coordinateDescriptor.squaddieTemplateId).toEqual(
                        requiredDeployment.squaddieTemplateId
                    )
                    expect(coordinateDescriptor.currentMapCoordinate).toEqual(
                        requiredDeployment.coordinate
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

            expect(loadBlocker.resourceKeysToLoad.length).toBeGreaterThan(
                initialPendingResourceListLength
            )
        })

        it("adds action templates to the repository", () => {
            expect(
                playerActionTemplates.every(
                    (template) =>
                        ObjectRepositoryService.getActionTemplateById(
                            objectRepository,
                            template.id
                        ).toString() === template.toString()
                )
            ).toBeTruthy()
        })
    })

    describe("initializes resources once loading is finished and resources are found", () => {
        beforeEach(async () => {
            loadBlocker.resourceHandler.getResource = vi
                .fn()
                .mockReturnValue({ width: 1, height: 1 })

            await MissionLoader.applyMissionData({
                missionData,
                missionLoaderContext: missionLoaderContext,
                loadBlocker,
                objectRepository: objectRepository,
            })

            vi.spyOn(
                loadBlocker.resourceHandler,
                "isResourceLoaded"
            ).mockReturnValue(true)
            loadBlocker.beginLoading()
            loadBlocker.updateLoadingStatus()

            MissionLoader.assignResourceHandlerResources({
                missionLoaderContext,
                resourceHandler: loadBlocker.resourceHandler,
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
                npcDeployment!.teams.forEach((team) => {
                    expectedKeys[team.id] = team.iconResourceKey
                })
            )

            expect(objectRepository.uiElements.teamAffiliationIcons).toEqual(
                expectedKeys
            )
        })
    })
})
