import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { BattleSquaddie } from "../battleSquaddie"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import {
    SquaddieAffiliation,
    TSquaddieAffiliation,
} from "../../squaddie/squaddieAffiliation"
import { TargetingResults, TargetingResultsService } from "./targetingService"

import {
    HexCoordinate,
    HexCoordinateService,
} from "../../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
    VersusSquaddieResistance,
} from "../../action/template/actionEffectTemplate"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battleState/battleState"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { TargetConstraintsService } from "../../action/targetConstraints"
import { beforeEach, describe, expect, it } from "vitest"

describe("Targeting Service", () => {
    let longswordAction: ActionTemplate
    let sirCamilSquaddieTemplate: SquaddieTemplate
    let sirCamilBattleSquaddie: BattleSquaddie
    let objectRepository: ObjectRepository

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        longswordAction = ActionTemplateService.new({
            name: "longsword",
            id: "longsword",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    versusSquaddieResistance: VersusSquaddieResistance.ARMOR,
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            longswordAction
        )
        ;({
            squaddieTemplate: sirCamilSquaddieTemplate,
            battleSquaddie: sirCamilBattleSquaddie,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "Sir Camil",
            templateId: "Sir Camil",
            battleId: "Sir Camil 0",
            affiliation: SquaddieAffiliation.PLAYER,
            actionTemplateIds: [longswordAction.id],
            objectRepository: objectRepository,
        }))
    })

    it("will indicate which coordinates to highlight", () => {
        let battleMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
            }),
        })

        MissionMapService.addSquaddie({
            missionMap: battleMap,
            squaddieTemplateId: sirCamilBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: sirCamilBattleSquaddie.battleSquaddieId,
            originMapCoordinate: { q: 1, r: 1 },
        })

        const results: TargetingResults =
            TargetingResultsService.findValidTargets({
                map: battleMap,
                actionTemplate: longswordAction,
                actionEffectSquaddieTemplate:
                    longswordAction.actionEffectTemplates[0],
                actingSquaddieTemplate: sirCamilSquaddieTemplate,
                actingBattleSquaddie: sirCamilBattleSquaddie,
                squaddieRepository: objectRepository,
            })

        expect(results.coordinatesInRange).toHaveLength(6)
        expect(results.coordinatesInRange).toEqual(
            expect.arrayContaining(
                HexCoordinateService.createNewNeighboringCoordinates({
                    q: 1,
                    r: 1,
                })
            )
        )
    })

    it("will respect walls and ranged attacks", () => {
        let battleMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 ", " 1 1 x 1 ", "  1 1 1 x "],
            }),
        })

        let longbowAction = ActionTemplateService.new({
            name: "longbow",
            id: "longbow",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 2,
                maximumRange: 3,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    versusSquaddieResistance: VersusSquaddieResistance.ARMOR,
                }),
            ],
        })

        objectRepository = ObjectRepositoryService.new()
        let {
            squaddieTemplate: archerSquaddieTemplate,
            battleSquaddie: archerBattleSquaddie,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "Archer",
            templateId: "archer",
            battleId: "Archer 0",
            affiliation: SquaddieAffiliation.PLAYER,
            actionTemplateIds: [longbowAction.id],
            objectRepository: objectRepository,
        })

        MissionMapService.addSquaddie({
            missionMap: battleMap,
            squaddieTemplateId: archerBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: archerBattleSquaddie.battleSquaddieId,
            originMapCoordinate: { q: 1, r: 1 },
        })

        const results: TargetingResults =
            TargetingResultsService.findValidTargets({
                map: battleMap,
                actionTemplate: longbowAction,
                actionEffectSquaddieTemplate:
                    longbowAction.actionEffectTemplates[0],
                actingSquaddieTemplate: archerSquaddieTemplate,
                actingBattleSquaddie: archerBattleSquaddie,
                squaddieRepository: objectRepository,
            })

        expect(results.coordinatesInRange).toHaveLength(4)
        expect(results.coordinatesInRange).toContainEqual({ q: 0, r: 0 })
        expect(results.coordinatesInRange).toContainEqual({ q: 0, r: 3 })
        expect(results.coordinatesInRange).toContainEqual({ q: 1, r: 3 })
        expect(results.coordinatesInRange).toContainEqual({ q: 2, r: 2 })
    })

    const makeSquaddieOfGivenAffiliationAndAddOnMap = ({
        battleSquaddieId,
        squaddieAffiliation,
        coordinate,
        repository,
        battleMap,
    }: {
        battleSquaddieId: string
        squaddieAffiliation: TSquaddieAffiliation
        coordinate: HexCoordinate
        repository: ObjectRepository
        battleMap: MissionMap
    }) => {
        let { squaddieTemplate, battleSquaddie } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: battleSquaddieId,
                templateId: battleSquaddieId,
                battleId: battleSquaddieId,
                affiliation: squaddieAffiliation,
                objectRepository: repository,
                actionTemplateIds: [],
            })

        MissionMapService.addSquaddie({
            missionMap: battleMap,
            squaddieTemplateId: squaddieTemplate.squaddieId.templateId,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            originMapCoordinate: coordinate,
        })
    }

    it("will select unfriendly squaddies if they are in range", () => {
        let battleMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 ", " 1 1 x 1 ", "  1 1 1 x "],
            }),
        })

        MissionMapService.addSquaddie({
            missionMap: battleMap,
            squaddieTemplateId: sirCamilBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: sirCamilBattleSquaddie.battleSquaddieId,
            originMapCoordinate: { q: 1, r: 1 },
        })

        makeSquaddieOfGivenAffiliationAndAddOnMap({
            battleSquaddieId: "player in range",
            squaddieAffiliation: SquaddieAffiliation.PLAYER,
            repository: objectRepository,
            battleMap: battleMap,
            coordinate: { q: 1, r: 0 },
        })

        makeSquaddieOfGivenAffiliationAndAddOnMap({
            battleSquaddieId: "enemy in range",
            squaddieAffiliation: SquaddieAffiliation.ENEMY,
            repository: objectRepository,
            battleMap: battleMap,
            coordinate: { q: 2, r: 1 },
        })

        makeSquaddieOfGivenAffiliationAndAddOnMap({
            battleSquaddieId: "enemy far away",
            squaddieAffiliation: SquaddieAffiliation.ENEMY,
            repository: objectRepository,
            battleMap: battleMap,
            coordinate: { q: 0, r: 3 },
        })

        const results: TargetingResults =
            TargetingResultsService.findValidTargets({
                map: battleMap,
                actionTemplate: longswordAction,
                actionEffectSquaddieTemplate:
                    longswordAction.actionEffectTemplates[0],
                actingSquaddieTemplate: sirCamilSquaddieTemplate,
                actingBattleSquaddie: sirCamilBattleSquaddie,
                squaddieRepository: objectRepository,
            })

        expect(results.battleSquaddieIdsInRange).toEqual(
            expect.arrayContaining(["enemy in range"])
        )
    })

    it("will select allied squaddies if they are in range", () => {
        let battleMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 ", " 1 1 x 1 ", "  1 1 1 x "],
            }),
        })

        MissionMapService.addSquaddie({
            missionMap: battleMap,
            squaddieTemplateId: sirCamilBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: sirCamilBattleSquaddie.battleSquaddieId,
            originMapCoordinate: { q: 1, r: 1 },
        })

        makeSquaddieOfGivenAffiliationAndAddOnMap({
            battleSquaddieId: "player in range",
            squaddieAffiliation: SquaddieAffiliation.PLAYER,
            repository: objectRepository,
            battleMap: battleMap,
            coordinate: { q: 1, r: 0 },
        })

        makeSquaddieOfGivenAffiliationAndAddOnMap({
            battleSquaddieId: "enemy in range",
            squaddieAffiliation: SquaddieAffiliation.ENEMY,
            repository: objectRepository,
            battleMap: battleMap,
            coordinate: { q: 1, r: 2 },
        })

        makeSquaddieOfGivenAffiliationAndAddOnMap({
            battleSquaddieId: "enemy far away",
            squaddieAffiliation: SquaddieAffiliation.ENEMY,
            repository: objectRepository,
            battleMap: battleMap,
            coordinate: { q: 0, r: 3 },
        })

        const healingAction: ActionTemplate = ActionTemplateService.new({
            id: "healingAction",
            name: "Healing Action",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 0,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    healingDescriptions: {
                        LOST_HIT_POINTS: 1,
                    },
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: true,
                    },
                }),
            ],
        })

        const results: TargetingResults =
            TargetingResultsService.findValidTargets({
                map: battleMap,
                actionTemplate: healingAction,
                actionEffectSquaddieTemplate:
                    healingAction.actionEffectTemplates[0],
                actingSquaddieTemplate: sirCamilSquaddieTemplate,
                actingBattleSquaddie: sirCamilBattleSquaddie,
                squaddieRepository: objectRepository,
            })

        expect(results.battleSquaddieIdsInRange).toEqual(
            expect.arrayContaining([
                "player in range",
                sirCamilBattleSquaddie.battleSquaddieId,
            ])
        )
        expect(results.battleSquaddieIdsInRange).toHaveLength(2)
    })

    it("will ignore terrain costs when targeting", () => {
        let longbowAction: ActionTemplate = ActionTemplateService.new({
            name: "longbow",
            id: "longbow",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 3,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    versusSquaddieResistance: VersusSquaddieResistance.ARMOR,
                }),
            ],
        })

        let battleMap: MissionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["2 2 2 2 "],
            }),
        })

        MissionMapService.addSquaddie({
            missionMap: battleMap,
            squaddieTemplateId: sirCamilBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: sirCamilBattleSquaddie.battleSquaddieId,
            originMapCoordinate: { q: 0, r: 0 },
        })

        const results: TargetingResults =
            TargetingResultsService.findValidTargets({
                map: battleMap,
                actionTemplate: longbowAction,
                actionEffectSquaddieTemplate:
                    longbowAction.actionEffectTemplates[0],
                actingSquaddieTemplate: sirCamilSquaddieTemplate,
                actingBattleSquaddie: sirCamilBattleSquaddie,
                squaddieRepository: objectRepository,
            })

        expect(results.coordinatesInRange).toHaveLength(3)
        expect(results.coordinatesInRange).toStrictEqual([
            { q: 0, r: 1 },
            { q: 0, r: 2 },
            { q: 0, r: 3 },
        ])
    })

    describe("highlightTargetRange using a gameEngineState", () => {
        let gameEngineState: GameEngineState

        beforeEach(() => {
            const battleMap: MissionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
                }),
            })
            MissionMapService.addSquaddie({
                missionMap: battleMap,
                squaddieTemplateId: sirCamilBattleSquaddie.squaddieTemplateId,
                battleSquaddieId: sirCamilBattleSquaddie.battleSquaddieId,
                originMapCoordinate: { q: 1, r: 1 },
            })

            gameEngineState = GameEngineStateService.new({
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.new({
                        missionMap: battleMap,
                        campaignId: "test campaign",
                        missionId: "test mission",
                    }),
                }),
                repository: objectRepository,
            })

            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                battleSquaddieId: sirCamilBattleSquaddie.battleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                actionTemplateId: longswordAction.id,
            })
        })

        it("will return the tiles in range", () => {
            const actionRange: HexCoordinate[] =
                TargetingResultsService.highlightTargetRange({
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    objectRepository: gameEngineState.repository,
                    battleActionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    battleActionRecorder:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionRecorder,
                })
            expect(actionRange).toHaveLength(6)
            expect(actionRange).toEqual(
                expect.arrayContaining(
                    HexCoordinateService.createNewNeighboringCoordinates({
                        q: 1,
                        r: 1,
                    })
                )
            )
        })
    })

    describe("verify target affiliation in relation to the user", () => {
        type idAndAffiliation = {
            id: string
            affiliation: TSquaddieAffiliation
        }

        let player1: idAndAffiliation = {
            id: "player1",
            affiliation: SquaddieAffiliation.PLAYER,
        }
        let player2: idAndAffiliation = {
            id: "player2",
            affiliation: SquaddieAffiliation.PLAYER,
        }
        let enemy1: idAndAffiliation = {
            id: "enemy1",
            affiliation: SquaddieAffiliation.ENEMY,
        }

        type AffiliationTest = {
            name: string
            actor: idAndAffiliation
            target: idAndAffiliation
            squaddieAffiliationRelation: {
                [TargetBySquaddieAffiliationRelation.TARGET_SELF]: boolean
                [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: boolean
                [TargetBySquaddieAffiliationRelation.TARGET_FOE]: boolean
            }
            expectedToTarget: boolean
        }

        const expectShouldTarget = ({
            actor,
            target,
            expectedToTarget,
            squaddieAffiliationRelation,
        }: {
            actor: idAndAffiliation
            target: idAndAffiliation
            expectedToTarget: boolean
            squaddieAffiliationRelation: {
                [TargetBySquaddieAffiliationRelation.TARGET_SELF]: boolean
                [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: boolean
                [TargetBySquaddieAffiliationRelation.TARGET_FOE]: boolean
            }
        }) => {
            expect(
                TargetingResultsService.shouldTargetDueToAffiliationAndTargetTraits(
                    {
                        squaddieAffiliationRelation,
                        actorBattleSquaddieId: actor.id,
                        actorAffiliation: actor.affiliation,
                        targetBattleSquaddieId: target.id,
                        targetAffiliation: target.affiliation,
                    }
                )
            ).toEqual(expectedToTarget)
        }

        describe("can target itself if the action TARGET_SELF", () => {
            const tests: AffiliationTest[] = [
                {
                    name: "player1 player1",
                    actor: player1,
                    target: player1,
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: true,
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                    expectedToTarget: true,
                },
                {
                    name: "player1 player2",
                    actor: player1,
                    target: player2,
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]:
                            false,
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: false,
                    },
                    expectedToTarget: false,
                },
            ]

            it.each(tests)(
                `$name`,
                ({
                    actor,
                    target,
                    squaddieAffiliationRelation,
                    expectedToTarget,
                }) => {
                    expectShouldTarget({
                        squaddieAffiliationRelation,
                        actor,
                        target,
                        expectedToTarget,
                    })
                }
            )
        })

        describe("can target allies but not self if the action TARGET_ALLY", () => {
            const tests: AffiliationTest[] = [
                {
                    name: "player1 player1",
                    actor: player1,
                    target: player1,
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                            false,
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: true,
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: false,
                    },
                    expectedToTarget: false,
                },
                {
                    name: "player1 player2",
                    actor: player1,
                    target: player2,
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                            false,
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: true,
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: false,
                    },
                    expectedToTarget: true,
                },
                {
                    name: "player1 enemy1",
                    actor: player1,
                    target: enemy1,
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                            false,
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: true,
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: false,
                    },
                    expectedToTarget: false,
                },
            ]

            it.each(tests)(
                `$name`,
                ({
                    actor,
                    target,
                    squaddieAffiliationRelation,
                    expectedToTarget,
                }) => {
                    expectShouldTarget({
                        squaddieAffiliationRelation,
                        actor,
                        target,
                        expectedToTarget,
                    })
                }
            )
        })

        describe("can target allies if the action TARGET_FOE", () => {
            const tests: AffiliationTest[] = [
                {
                    name: "player1 enemy1",
                    actor: player1,
                    target: enemy1,
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                            false,
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]:
                            false,
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                    expectedToTarget: true,
                },
                {
                    name: "enemy1 player1",
                    actor: enemy1,
                    target: player1,
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                            false,
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]:
                            false,
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                    expectedToTarget: true,
                },
                {
                    name: "player1 player1",
                    actor: player1,
                    target: player1,
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                            false,
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]:
                            false,
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                    expectedToTarget: false,
                },
                {
                    name: "player1 player2",
                    actor: player1,
                    target: player2,
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]:
                            false,
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]:
                            false,
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                    expectedToTarget: false,
                },
            ]

            it.each(tests)(
                `$name`,
                ({
                    actor,
                    target,
                    squaddieAffiliationRelation,
                    expectedToTarget,
                }) => {
                    expectShouldTarget({
                        squaddieAffiliationRelation,
                        actor,
                        target,
                        expectedToTarget,
                    })
                }
            )
        })
    })
})
