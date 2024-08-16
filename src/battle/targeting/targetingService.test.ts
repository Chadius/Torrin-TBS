import { MissionMap } from "../../missionMap/missionMap"
import { BattleSquaddie } from "../battleSquaddie"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { CreateNewNeighboringCoordinates } from "../../hexMap/hexGridDirection"
import { TerrainTileMap } from "../../hexMap/terrainTileMap"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { TargetingResults, TargetingResultsService } from "./targetingService"

import {
    HexCoordinate,
    NewHexCoordinateFromNumberPair,
} from "../../hexMap/hexCoordinate/hexCoordinate"
import { CreateNewSquaddieAndAddToRepository } from "../../utils/test/squaddie"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../../action/template/actionEffectSquaddieTemplate"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../orchestrator/battleState"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { HighlightPulseRedColor } from "../../hexMap/hexDrawingUtils"

describe("Targeting Service", () => {
    let longswordAction: ActionTemplate
    let sirCamilSquaddieTemplate: SquaddieTemplate
    let sirCamilBattleSquaddie: BattleSquaddie
    let squaddieRepo: ObjectRepository

    beforeEach(() => {
        longswordAction = ActionTemplateService.new({
            name: "longsword",
            id: "longsword",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_ARMOR]: true,
                        [Trait.TARGETS_FOE]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                }),
            ],
        })

        squaddieRepo = ObjectRepositoryService.new()
        ;({
            squaddieTemplate: sirCamilSquaddieTemplate,
            battleSquaddie: sirCamilBattleSquaddie,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Sir Camil",
            templateId: "Sir Camil",
            battleId: "Sir Camil 0",
            affiliation: SquaddieAffiliation.PLAYER,
            actionTemplates: [longswordAction],
            squaddieRepository: squaddieRepo,
        }))
    })

    it("will indicate which locations to highlight", () => {
        let battleMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
            }),
        })

        battleMap.addSquaddie(
            sirCamilSquaddieTemplate.squaddieId.templateId,
            sirCamilBattleSquaddie.battleSquaddieId,
            { q: 1, r: 1 }
        )

        const results: TargetingResults =
            TargetingResultsService.findValidTargets({
                map: battleMap,
                actionEffectSquaddieTemplate: longswordAction
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                actingSquaddieTemplate: sirCamilSquaddieTemplate,
                actingBattleSquaddie: sirCamilBattleSquaddie,
                squaddieRepository: squaddieRepo,
            })

        expect(results.locationsInRange).toHaveLength(6)
        expect(results.locationsInRange).toEqual(
            expect.arrayContaining(CreateNewNeighboringCoordinates(1, 1))
        )
    })

    it("will highlight nothing if the acting squaddie is not on the map", () => {
        let battleMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
            }),
        })

        battleMap.addSquaddie(
            sirCamilSquaddieTemplate.squaddieId.templateId,
            sirCamilBattleSquaddie.battleSquaddieId
        )

        const results: TargetingResults =
            TargetingResultsService.findValidTargets({
                map: battleMap,
                actionEffectSquaddieTemplate: longswordAction
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                actingSquaddieTemplate: sirCamilSquaddieTemplate,
                actingBattleSquaddie: sirCamilBattleSquaddie,
                squaddieRepository: squaddieRepo,
            })

        expect(results.locationsInRange).toHaveLength(0)
    })

    it("will respect walls and ranged attacks", () => {
        let battleMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 1 ", " 1 1 x 1 ", "  1 1 1 x "],
            }),
        })

        let longbowAction = ActionTemplateService.new({
            name: "longbow",
            id: "longbow",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_ARMOR]: true,
                    }),
                    minimumRange: 2,
                    maximumRange: 3,
                }),
            ],
        })

        squaddieRepo = ObjectRepositoryService.new()
        let {
            squaddieTemplate: archerSquaddieTemplate,
            battleSquaddie: archerBattleSquaddie,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Archer",
            templateId: "archer",
            battleId: "Archer 0",
            affiliation: SquaddieAffiliation.PLAYER,
            actionTemplates: [longbowAction],
            squaddieRepository: squaddieRepo,
        })

        battleMap.addSquaddie(
            archerSquaddieTemplate.squaddieId.templateId,
            archerBattleSquaddie.battleSquaddieId,
            { q: 1, r: 1 }
        )

        const results: TargetingResults =
            TargetingResultsService.findValidTargets({
                map: battleMap,
                actionEffectSquaddieTemplate: longbowAction
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                actingSquaddieTemplate: archerSquaddieTemplate,
                actingBattleSquaddie: archerBattleSquaddie,
                squaddieRepository: squaddieRepo,
            })

        expect(results.locationsInRange).toHaveLength(4)
        expect(results.locationsInRange).toContainEqual(
            NewHexCoordinateFromNumberPair([0, 0])
        )
        expect(results.locationsInRange).toContainEqual(
            NewHexCoordinateFromNumberPair([0, 3])
        )
        expect(results.locationsInRange).toContainEqual(
            NewHexCoordinateFromNumberPair([1, 3])
        )
        expect(results.locationsInRange).toContainEqual(
            NewHexCoordinateFromNumberPair([2, 2])
        )
    })

    const makeSquaddieOfGivenAffiliationAndAddOnMap = ({
        battleSquaddieId,
        squaddieAffiliation,
        location,
        repository,
        battleMap,
    }: {
        battleSquaddieId: string
        squaddieAffiliation: SquaddieAffiliation
        location: HexCoordinate
        repository: ObjectRepository
        battleMap: MissionMap
    }) => {
        let { squaddieTemplate, battleSquaddie } =
            CreateNewSquaddieAndAddToRepository({
                name: battleSquaddieId,
                templateId: battleSquaddieId,
                battleId: battleSquaddieId,
                affiliation: squaddieAffiliation,
                squaddieRepository: repository,
            })

        battleMap.addSquaddie(
            squaddieTemplate.squaddieId.templateId,
            battleSquaddie.battleSquaddieId,
            location
        )
    }

    it("will highlight unfriendly squaddies if they are in range", () => {
        let battleMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 1 ", " 1 1 x 1 ", "  1 1 1 x "],
            }),
        })

        battleMap.addSquaddie(
            sirCamilSquaddieTemplate.squaddieId.templateId,
            sirCamilBattleSquaddie.battleSquaddieId,
            { q: 1, r: 1 }
        )

        makeSquaddieOfGivenAffiliationAndAddOnMap({
            battleSquaddieId: "player in range",
            squaddieAffiliation: SquaddieAffiliation.PLAYER,
            repository: squaddieRepo,
            battleMap: battleMap,
            location: { q: 1, r: 0 },
        })

        makeSquaddieOfGivenAffiliationAndAddOnMap({
            battleSquaddieId: "enemy in range",
            squaddieAffiliation: SquaddieAffiliation.ENEMY,
            repository: squaddieRepo,
            battleMap: battleMap,
            location: { q: 2, r: 1 },
        })

        makeSquaddieOfGivenAffiliationAndAddOnMap({
            battleSquaddieId: "enemy far away",
            squaddieAffiliation: SquaddieAffiliation.ENEMY,
            repository: squaddieRepo,
            battleMap: battleMap,
            location: { q: 0, r: 3 },
        })

        const results: TargetingResults =
            TargetingResultsService.findValidTargets({
                map: battleMap,
                actionEffectSquaddieTemplate: longswordAction
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                actingSquaddieTemplate: sirCamilSquaddieTemplate,
                actingBattleSquaddie: sirCamilBattleSquaddie,
                squaddieRepository: squaddieRepo,
            })

        expect(results.battleSquaddieIdsInRange).toEqual(
            expect.arrayContaining(["enemy in range"])
        )
    })

    it("will highlight allied squaddies if they are in range", () => {
        let battleMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 1 1 ", " 1 1 x 1 ", "  1 1 1 x "],
            }),
        })

        battleMap.addSquaddie(
            sirCamilSquaddieTemplate.squaddieId.templateId,
            sirCamilBattleSquaddie.battleSquaddieId,
            { q: 1, r: 1 }
        )

        makeSquaddieOfGivenAffiliationAndAddOnMap({
            battleSquaddieId: "player in range",
            squaddieAffiliation: SquaddieAffiliation.PLAYER,
            repository: squaddieRepo,
            battleMap: battleMap,
            location: { q: 1, r: 0 },
        })

        makeSquaddieOfGivenAffiliationAndAddOnMap({
            battleSquaddieId: "enemy in range",
            squaddieAffiliation: SquaddieAffiliation.ENEMY,
            repository: squaddieRepo,
            battleMap: battleMap,
            location: { q: 1, r: 2 },
        })

        makeSquaddieOfGivenAffiliationAndAddOnMap({
            battleSquaddieId: "enemy far away",
            squaddieAffiliation: SquaddieAffiliation.ENEMY,
            repository: squaddieRepo,
            battleMap: battleMap,
            location: { q: 0, r: 3 },
        })

        const healingAction: ActionTemplate = ActionTemplateService.new({
            id: "healingAction",
            name: "Healing Action",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    healingDescriptions: {
                        LOST_HIT_POINTS: 1,
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        TARGETS_ALLY: true,
                        TARGETS_SELF: true,
                    }),
                    minimumRange: 0,
                    maximumRange: 1,
                }),
            ],
        })

        const results: TargetingResults =
            TargetingResultsService.findValidTargets({
                map: battleMap,
                actionEffectSquaddieTemplate: healingAction
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                actingSquaddieTemplate: sirCamilSquaddieTemplate,
                actingBattleSquaddie: sirCamilBattleSquaddie,
                squaddieRepository: squaddieRepo,
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
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.TARGET_ARMOR]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 3,
                }),
            ],
        })

        let battleMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["2 2 2 2 "],
            }),
        })

        battleMap.addSquaddie(
            sirCamilSquaddieTemplate.squaddieId.templateId,
            sirCamilBattleSquaddie.battleSquaddieId,
            { q: 0, r: 0 }
        )

        const results: TargetingResults =
            TargetingResultsService.findValidTargets({
                map: battleMap,
                actionEffectSquaddieTemplate: longbowAction
                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                actingSquaddieTemplate: sirCamilSquaddieTemplate,
                actingBattleSquaddie: sirCamilBattleSquaddie,
                squaddieRepository: squaddieRepo,
            })

        expect(results.locationsInRange).toHaveLength(3)
        expect(results.locationsInRange).toStrictEqual([
            { q: 0, r: 1 },
            { q: 0, r: 2 },
            { q: 0, r: 3 },
        ])
    })

    describe("highlightTargetRange using a gameEngineState", () => {
        let gameEngineState: GameEngineState
        let highlightRangeSpy: jest.SpyInstance

        beforeEach(() => {
            const battleMap: MissionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
                }),
            })
            battleMap.addSquaddie(
                sirCamilSquaddieTemplate.squaddieId.templateId,
                sirCamilBattleSquaddie.battleSquaddieId,
                { q: 1, r: 1 }
            )

            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: sirCamilBattleSquaddie.battleSquaddieId,
                startingLocation: { q: 1, r: 1 },
                previewedActionTemplateId: longswordAction.id,
            })

            gameEngineState = GameEngineStateService.new({
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.new({
                        missionMap: battleMap,
                        campaignId: "test campaign",
                        missionId: "test mission",
                        actionsThisRound,
                    }),
                }),
                repository: squaddieRepo,
            })

            highlightRangeSpy = jest.spyOn(
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap,
                "highlightTiles"
            )
        })

        it("will return the tiles in range", () => {
            const actionRange: HexCoordinate[] =
                TargetingResultsService.highlightTargetRange(gameEngineState)
            expect(actionRange).toHaveLength(6)
            expect(actionRange).toEqual(
                expect.arrayContaining(CreateNewNeighboringCoordinates(1, 1))
            )
        })

        it("will highlight the tiles", () => {
            const actionRange: HexCoordinate[] =
                TargetingResultsService.highlightTargetRange(gameEngineState)
            expect(highlightRangeSpy).toHaveBeenCalledWith([
                {
                    tiles: actionRange,
                    pulseColor: HighlightPulseRedColor,
                    overlayImageResourceName: "map icon attack 1 action",
                },
            ])
        })
    })

    describe("verify target affiliation in relation to the user", () => {
        type idAndAffiliation = {
            id: string
            affiliation: SquaddieAffiliation
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
            traits: Trait[]
            expectedToTarget: boolean
        }

        const expectShouldTarget = ({
            traits,
            actor,
            target,
            expectedToTarget,
        }: {
            traits: Trait[]
            actor: idAndAffiliation
            target: idAndAffiliation
            expectedToTarget: boolean
        }) => {
            const actionTraits = TraitStatusStorageService.newUsingTraitValues(
                Object.fromEntries(traits.map((trait) => [trait, true]))
            )
            expect(
                TargetingResultsService.shouldTargetDueToAffiliationAndTargetTraits(
                    {
                        actionTraits: actionTraits,
                        actorBattleSquaddieId: actor.id,
                        actorAffiliation: actor.affiliation,
                        targetBattleSquaddieId: target.id,
                        targetAffiliation: target.affiliation,
                    }
                )
            ).toEqual(expectedToTarget)
        }

        describe("can target itself if the action TARGETS_SELF", () => {
            const tests: AffiliationTest[] = [
                {
                    name: "player1 player1",
                    actor: player1,
                    target: player1,
                    traits: [Trait.TARGETS_SELF],
                    expectedToTarget: true,
                },
                {
                    name: "player1 player2",
                    actor: player1,
                    target: player2,
                    traits: [Trait.TARGETS_SELF],
                    expectedToTarget: false,
                },
            ]

            it.each(tests)(
                `$name`,
                ({ actor, target, traits, expectedToTarget }) => {
                    expectShouldTarget({
                        traits,
                        actor,
                        target,
                        expectedToTarget,
                    })
                }
            )
        })

        describe("can target allies if the action TARGETS_ALLY", () => {
            const tests: AffiliationTest[] = [
                {
                    name: "player1 player1",
                    actor: player1,
                    target: player1,
                    traits: [Trait.TARGETS_ALLY],
                    expectedToTarget: true,
                },
                {
                    name: "player1 player2",
                    actor: player1,
                    target: player2,
                    traits: [Trait.TARGETS_ALLY],
                    expectedToTarget: true,
                },
                {
                    name: "player1 enemy1",
                    actor: player1,
                    target: enemy1,
                    traits: [Trait.TARGETS_ALLY],
                    expectedToTarget: false,
                },
            ]

            it.each(tests)(
                `$name`,
                ({ actor, target, traits, expectedToTarget }) => {
                    expectShouldTarget({
                        traits,
                        actor,
                        target,
                        expectedToTarget,
                    })
                }
            )
        })

        describe("can target allies if the action TARGETS_FOE", () => {
            const tests: AffiliationTest[] = [
                {
                    name: "player1 enemy1",
                    actor: player1,
                    target: enemy1,
                    traits: [Trait.TARGETS_FOE],
                    expectedToTarget: true,
                },
                {
                    name: "enemy1 player1",
                    actor: enemy1,
                    target: player1,
                    traits: [Trait.TARGETS_FOE],
                    expectedToTarget: true,
                },
                {
                    name: "player1 player1",
                    actor: player1,
                    target: player1,
                    traits: [Trait.TARGETS_FOE],
                    expectedToTarget: false,
                },
                {
                    name: "player1 player2",
                    actor: player1,
                    target: player2,
                    traits: [Trait.TARGETS_FOE],
                    expectedToTarget: false,
                },
            ]

            it.each(tests)(
                `$name`,
                ({ actor, target, traits, expectedToTarget }) => {
                    expectShouldTarget({
                        traits,
                        actor,
                        target,
                        expectedToTarget,
                    })
                }
            )
        })
    })
})
