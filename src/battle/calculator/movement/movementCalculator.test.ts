import { PathfinderService } from "../../../hexMap/pathfinder/pathGeneration/pathfinder"
import { SearchResultsService } from "../../../hexMap/pathfinder/searchResults/searchResult"
import { MovementCalculatorService } from "./movementCalculator"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../gameEngine/gameEngine"
import { BattleSquaddie } from "../../battleSquaddie"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import { ObjectRepositoryService } from "../../objectRepository"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { BattleOrchestratorStateService } from "../../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../../orchestrator/battleState"
import { SearchPathService } from "../../../hexMap/pathfinder/searchPath"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { MapGraphicsLayerHighlight } from "../../../hexMap/mapGraphicsLayer"
import { HIGHLIGHT_PULSE_COLOR } from "../../../hexMap/hexDrawingUtils"
import { CampaignService } from "../../../campaign/campaign"
import { BattleActionRecorderService } from "../../history/battleAction/battleActionRecorder"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import {
    AttributeModifierService,
    AttributeSource,
    AttributeType,
} from "../../../squaddie/attributeModifier"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"

describe("movement calculator", () => {
    let pathfinderSpy: MockInstance
    let gameEngineState: GameEngineState
    let battleSquaddie: BattleSquaddie
    let squaddieTemplate: SquaddieTemplate

    beforeEach(() => {
        const objectRepository = ObjectRepositoryService.new()
        const missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 "],
            }),
        })

        ;({ battleSquaddie, squaddieTemplate } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                objectRepository,
                actionTemplateIds: [],
                affiliation: SquaddieAffiliation.PLAYER,
                name: "squaddie",
                battleId: "squaddie",
                templateId: "squaddie",
            }))

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            squaddieTemplateId: battleSquaddie.squaddieTemplateId,
            coordinate: { q: 0, r: 0 },
        })

        gameEngineState = GameEngineStateService.new({
            repository: objectRepository,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.new({
                    missionMap,
                    missionId: "test mission",
                    campaignId: "test campaign",
                }),
            }),
            campaign: CampaignService.default(),
        })
    })
    afterEach(() => {
        if (pathfinderSpy) {
            pathfinderSpy.mockRestore()
        }
    })

    describe("isMovementPossible", () => {
        it("is not possible if the pathfinder says it is not", () => {
            pathfinderSpy = vi
                .spyOn(PathfinderService, "search")
                .mockReturnValue(
                    SearchResultsService.new({
                        stopCoordinatesReached: [],
                        shortestPathByCoordinate: {},
                    })
                )

            const isMovementPossible: boolean =
                MovementCalculatorService.isMovementPossible({
                    gameEngineState,
                    battleSquaddie,
                    squaddieTemplate,
                    destination: { q: 0, r: 1 },
                })

            expect(isMovementPossible).toBeFalsy()
            expect(pathfinderSpy).toHaveBeenCalled()
        })

        it("is possible if the pathfinder says it is", () => {
            const validPathToDestination = SearchPathService.newSearchPath()
            SearchPathService.add(
                validPathToDestination,
                {
                    hexCoordinate: { q: 0, r: 0 },
                    cumulativeMovementCost: 0,
                },
                0
            )
            SearchPathService.add(
                validPathToDestination,
                {
                    hexCoordinate: { q: 0, r: 1 },
                    cumulativeMovementCost: 0,
                },
                1
            )

            pathfinderSpy = vi
                .spyOn(PathfinderService, "search")
                .mockReturnValue(
                    SearchResultsService.new({
                        stopCoordinatesReached: [],
                        shortestPathByCoordinate: {
                            0: {
                                1: validPathToDestination,
                            },
                        },
                    })
                )

            const isMovementPossible: boolean =
                MovementCalculatorService.isMovementPossible({
                    gameEngineState,
                    battleSquaddie,
                    squaddieTemplate,
                    destination: { q: 0, r: 1 },
                })

            expect(isMovementPossible).toBeTruthy()
            expect(pathfinderSpy).toHaveBeenCalled()
        })

        it("applies the squaddie's modified movement attribute to the pathfinder", () => {
            InBattleAttributesService.addActiveAttributeModifier(
                battleSquaddie.inBattleAttributes,
                AttributeModifierService.new({
                    type: AttributeType.MOVEMENT,
                    duration: 1,
                    amount: 2,
                    source: AttributeSource.CIRCUMSTANCE,
                })
            )

            InBattleAttributesService.addActiveAttributeModifier(
                battleSquaddie.inBattleAttributes,
                AttributeModifierService.new({
                    type: AttributeType.IGNORE_TERRAIN_COST,
                    duration: 1,
                    amount: 1,
                    source: AttributeSource.CIRCUMSTANCE,
                })
            )

            pathfinderSpy = vi
                .spyOn(PathfinderService, "search")
                .mockReturnValue(
                    SearchResultsService.new({
                        stopCoordinatesReached: [],
                        shortestPathByCoordinate: {},
                    })
                )

            MovementCalculatorService.isMovementPossible({
                gameEngineState,
                battleSquaddie,
                squaddieTemplate,
                destination: { q: 0, r: 1 },
            })

            expect(pathfinderSpy).toHaveBeenCalled()
            const searchParameters =
                pathfinderSpy.mock.calls[0][0].searchParameters
            expect(searchParameters.pathContinueConstraints).toEqual(
                expect.objectContaining({
                    ignoreTerrainCost: true,
                })
            )
            expect(searchParameters.pathSizeConstraints).toEqual(
                expect.objectContaining({
                    movementPerAction:
                        battleSquaddie.inBattleAttributes.armyAttributes
                            .movement.movementPerAction + 2,
                })
            )
        })
    })

    describe("setBattleActionDecisionStepReadyToAnimate", () => {
        beforeEach(() => {
            MovementCalculatorService.setBattleActionDecisionStepReadyToAnimate(
                {
                    gameEngineState,
                    battleSquaddie,
                    squaddieTemplate,
                    destination: { q: 0, r: 1 },
                }
            )
        })
        it("sets up the action decision step", () => {
            const actionBuilderState =
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            expect(
                BattleActionDecisionStepService.getActor(actionBuilderState)
                    .battleSquaddieId
            ).toEqual(battleSquaddie.battleSquaddieId)
            expect(
                BattleActionDecisionStepService.getAction(actionBuilderState)
                    .movement
            ).toBeTruthy()
            expect(
                BattleActionDecisionStepService.getTarget(actionBuilderState)
                    .confirmed
            ).toBeTruthy()
            expect(
                BattleActionDecisionStepService.getTarget(actionBuilderState)
                    .targetCoordinate
            ).toEqual({ q: 0, r: 1 })
        })
        it("only highlights the moving path", () => {
            const highlights: MapGraphicsLayerHighlight[] =
                TerrainTileMapService.computeHighlightedTiles(
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap.terrainTileMap
                )
            expect(highlights).toHaveLength(2)
            expect(highlights).toContainEqual({
                coordinate: { q: 0, r: 0 },
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                overlayImageResourceName: "",
            })
            expect(highlights).toContainEqual({
                coordinate: { q: 0, r: 1 },
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                overlayImageResourceName:
                    gameEngineState.campaign.resources
                        .missionMapMovementIconResourceKeys
                        .MOVE_1_ACTION_CONTROLLABLE_SQUADDIE,
            })
        })
    })

    it("queueBattleActionToMove adds a move action to the battle queue", () => {
        MovementCalculatorService.queueBattleActionToMove({
            gameEngineState,
            battleSquaddie,
            destination: { q: 0, r: 1 },
        })

        const movementAction = BattleActionRecorderService.peekAtAnimationQueue(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )

        expect(movementAction.actor.actorBattleSquaddieId).toEqual(
            battleSquaddie.battleSquaddieId
        )
        expect(movementAction.action.isMovement).toBeTruthy()
        expect(movementAction.effect.movement.startCoordinate).toEqual({
            q: 0,
            r: 0,
        })
        expect(movementAction.effect.movement.endCoordinate).toEqual({
            q: 0,
            r: 1,
        })
    })

    describe("generate paths that move around squaddies", () => {
        let gameEngineState: GameEngineState
        let player0: BattleSquaddie
        let player1: BattleSquaddie
        let enemy0: BattleSquaddie
        beforeEach(() => {
            const objectRepository = ObjectRepositoryService.new()
            const missionMap = MissionMapService.new({
                terrainTileMap: TerrainTileMapService.new({
                    movementCost: ["1 1 1 1 1 ", " x x 1 1 x "],
                }),
            })

            ;[
                {
                    battleSquaddieId: "player0",
                    affiliation: SquaddieAffiliation.PLAYER,
                    coordinate: { q: 0, r: 0 },
                },
                {
                    battleSquaddieId: "player1",
                    affiliation: SquaddieAffiliation.PLAYER,
                    coordinate: { q: 0, r: 1 },
                },
                {
                    battleSquaddieId: "enemy0",
                    affiliation: SquaddieAffiliation.ENEMY,
                    coordinate: { q: 0, r: 3 },
                },
            ].forEach((info) => {
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    objectRepository,
                    actionTemplateIds: [],
                    affiliation: info.affiliation,
                    name: info.battleSquaddieId,
                    battleId: info.battleSquaddieId,
                    templateId: info.battleSquaddieId,
                })

                const { battleSquaddie } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        objectRepository,
                        info.battleSquaddieId
                    )
                )

                MissionMapService.addSquaddie({
                    missionMap,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    squaddieTemplateId: battleSquaddie.squaddieTemplateId,
                    coordinate: info.coordinate,
                })
            })
            ;({ battleSquaddie: player0 } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    "player0"
                )
            ))
            ;({ battleSquaddie: player1 } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    "player1"
                )
            ))
            ;({ battleSquaddie: enemy0 } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    "enemy0"
                )
            ))

            gameEngineState = GameEngineStateService.new({
                repository: objectRepository,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.new({
                        missionMap,
                        missionId: "test mission",
                        campaignId: "test campaign",
                    }),
                }),
                campaign: CampaignService.default(),
            })
        })
        it("will move through allies to get to the destination", () => {
            MovementCalculatorService.setBattleActionDecisionStepReadyToAnimate(
                {
                    gameEngineState,
                    battleSquaddie: player0,
                    squaddieTemplate,
                    destination: { q: 0, r: 2 },
                }
            )
            const squaddieMovePath =
                gameEngineState.battleOrchestratorState.battleState
                    .squaddieMovePath
            const coordinatesTraveled =
                SearchPathService.getCoordinates(squaddieMovePath)
            expect(coordinatesTraveled).toHaveLength(3)
            expect(coordinatesTraveled.map((l) => l.hexCoordinate)).toEqual([
                { q: 0, r: 0 },
                { q: 0, r: 1 },
                { q: 0, r: 2 },
            ])
        })
        it("will move around enemies to get to the destination", () => {
            MovementCalculatorService.setBattleActionDecisionStepReadyToAnimate(
                {
                    gameEngineState,
                    battleSquaddie: player1,
                    squaddieTemplate,
                    destination: { q: 0, r: 4 },
                }
            )
            const squaddieMovePath =
                gameEngineState.battleOrchestratorState.battleState
                    .squaddieMovePath
            const coordinatesTraveled =
                SearchPathService.getCoordinates(squaddieMovePath)
            expect(coordinatesTraveled).toHaveLength(5)
            expect(coordinatesTraveled.map((l) => l.hexCoordinate)).toEqual([
                { q: 0, r: 1 },
                { q: 0, r: 2 },
                { q: 1, r: 2 },
                { q: 1, r: 3 },
                { q: 0, r: 4 },
            ])
        })
    })
})
