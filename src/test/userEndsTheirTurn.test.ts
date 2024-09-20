import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battle/battleSquaddieTeam"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../campaign/squaddieTemplate"
import { BattleSquaddie, BattleSquaddieService } from "../battle/battleSquaddie"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../action/template/actionTemplate"
import { ResourceHandler } from "../resource/resourceHandler"
import { MissionMap, MissionMapService } from "../missionMap/missionMap"
import { ActionEffectSquaddieTemplateService } from "../action/template/actionEffectSquaddieTemplate"
import { Trait, TraitStatusStorageService } from "../trait/traitStatusStorage"
import { SquaddieIdService } from "../squaddie/id"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import * as mocks from "../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import { makeResult } from "../utils/ResultOrError"
import { TerrainTileMapService } from "../hexMap/terrainTileMap"
import {
    BattlePhaseState,
    BattlePhaseStateService,
} from "../battle/orchestratorComponents/battlePhaseController"
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../battle/history/actionsThisRound"
import {
    GameEngineState,
    GameEngineStateService,
} from "../gameEngine/gameEngine"
import { BattleOrchestratorStateService } from "../battle/orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battle/orchestrator/battleState"
import { BattleCamera } from "../battle/battleCamera"
import { CampaignService } from "../campaign/campaign"
import { RectAreaService } from "../ui/rectArea"
import {
    DecidedActionEndTurnEffect,
    DecidedActionEndTurnEffectService,
} from "../action/decided/decidedActionEndTurnEffect"
import { ActionEffectEndTurnTemplateService } from "../action/template/actionEffectEndTurnTemplate"
import { BattlePhase } from "../battle/orchestratorComponents/battlePhaseTracker"
import { BattlePlayerSquaddieSelector } from "../battle/orchestratorComponents/battlePlayerSquaddieSelector"
import { convertMapCoordinatesToScreenCoordinates } from "../hexMap/convertCoordinates"
import { OrchestratorComponentMouseEventType } from "../battle/orchestrator/battleOrchestratorComponent"
import { SquaddieTurnService } from "../squaddie/turn"
import { OrchestratorUtilities } from "../battle/orchestratorComponents/orchestratorUtils"
import {
    ACTION_COMPLETED_WAIT_TIME_MS,
    BattleSquaddieUsesActionOnMap,
} from "../battle/orchestratorComponents/battleSquaddieUsesActionOnMap"
import { ProcessedActionEndTurnEffectService } from "../action/processed/processedActionEndTurnEffect"
import { ProcessedActionService } from "../action/processed/processedAction"
import { DrawSquaddieUtilities } from "../battle/animation/drawSquaddie"
import { BattleEventService } from "../battle/history/battleEvent"
import { MouseButton, MouseClickService } from "../utils/mouseConfig"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import { BattleHUDListener } from "../battle/hud/battleHUD"
import { BattleActionService } from "../battle/history/battleAction"
import { BattleActionQueueService } from "../battle/history/battleActionQueue"

describe("User ends their turn", () => {
    let objectRepository: ObjectRepository
    let gameEngineState: GameEngineState

    let playerTeam: BattleSquaddieTeam
    let playerSquaddieTemplate: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie

    let attackAction: ActionTemplate

    let selector: BattlePlayerSquaddieSelector

    let resourceHandler: ResourceHandler
    let missionMap: MissionMap

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        attackAction = ActionTemplateService.new({
            id: "action",
            name: "action",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            attackAction
        )

        playerSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                name: "player",
                affiliation: SquaddieAffiliation.PLAYER,
                templateId: "player",
            }),
            actionTemplateIds: [attackAction.id],
        })
        ObjectRepositoryService.addSquaddieTemplate(
            objectRepository,
            playerSquaddieTemplate
        )

        playerBattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "player 0",
        })
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
            playerBattleSquaddie
        )

        playerTeam = BattleSquaddieTeamService.new({
            name: "player team",
            id: "player",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [playerBattleSquaddie.battleSquaddieId],
        })

        resourceHandler = mocks.mockResourceHandler(
            new MockedP5GraphicsBuffer()
        )
        resourceHandler.areAllResourcesLoaded = jest
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true)
        resourceHandler = mocks.mockResourceHandler(
            new MockedP5GraphicsBuffer()
        )
        resourceHandler.getResource = jest
            .fn()
            .mockReturnValue(makeResult({ width: 1, height: 1 }))

        missionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 "],
            }),
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            location: {
                q: 0,
                r: 0,
            },
        })

        gameEngineState = getGameEngineState({
            resourceHandler,
            missionMap,
            repository: objectRepository,
            teams: [playerTeam],
            battlePhaseState: BattlePhaseStateService.new({
                currentAffiliation: BattlePhase.PLAYER,
                turnCount: 0,
            }),
        })
        const battleHUDListener = new BattleHUDListener("battleHUDListener")
        gameEngineState.messageBoard.addListener(
            battleHUDListener,
            MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
        )

        selectSquaddieForTheHUD({
            battleSquaddie: playerBattleSquaddie,
            gameEngineState,
        })
        selector = new BattlePlayerSquaddieSelector()
        gameEngineState.messageBoard.addListener(
            selector,
            MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR
        )

        gameEngineState.messageBoard.addListener(
            battleHUDListener,
            MessageBoardMessageType.PLAYER_ENDS_TURN
        )
    })

    it("HUD knows the user selected end turn", () => {
        let summaryHUDState =
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState
        selector.mouseClicked({
            mouseX: RectAreaService.centerX(
                summaryHUDState.playerCommandState.endTurnButton.buttonArea
            ),
            mouseY: RectAreaService.centerY(
                summaryHUDState.playerCommandState.endTurnButton.buttonArea
            ),
            gameEngineState,
            mouseButton: MouseButton.ACCEPT,
        })

        expect(
            summaryHUDState.playerCommandState.playerSelectedEndTurn
        ).toBeTruthy()
        expect(
            summaryHUDState.playerCommandState.playerSelectedSquaddieAction
        ).toBeFalsy()
    })

    it("EndTurn adds a ProcessedAction to end the turn", () => {
        let [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
            0,
            0,
            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
        )
        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
            mouseButton: MouseButton.ACCEPT,
        })

        expect(
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
        ).toBeUndefined()

        let summaryHUDState =
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState
        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: RectAreaService.centerX(
                summaryHUDState.playerCommandState.endTurnButton.buttonArea
            ),
            mouseY: RectAreaService.centerY(
                summaryHUDState.playerCommandState.endTurnButton.buttonArea
            ),
            mouseButton: MouseButton.ACCEPT,
        })

        const actionsThisRound =
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
        expect(actionsThisRound.processedActions).toHaveLength(1)

        const processedAction = actionsThisRound.processedActions[0]

        const decidedActionEndTurnEffect =
            DecidedActionEndTurnEffectService.new({
                template: ActionEffectEndTurnTemplateService.new({}),
            })
        expect(processedAction.processedActionEffects).toHaveLength(1)
        expect(processedAction.processedActionEffects[0]).toEqual(
            ProcessedActionEndTurnEffectService.newFromDecidedActionEffect({
                decidedActionEffect: decidedActionEndTurnEffect,
            })
        )
        expect(
            BattleActionQueueService.peek(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionQueue
            )
        ).toEqual(
            BattleActionService.new({
                actor: {
                    actorBattleSquaddieId:
                        playerBattleSquaddie.battleSquaddieId,
                },
                action: { isEndTurn: true },
                effect: { endTurn: true },
            })
        )
    })

    it("adds the Battle Action to the Battle Action Queue", () => {
        let summaryHUDState =
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState
        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: RectAreaService.centerX(
                summaryHUDState.playerCommandState.endTurnButton.buttonArea
            ),
            mouseY: RectAreaService.centerY(
                summaryHUDState.playerCommandState.endTurnButton.buttonArea
            ),
            mouseButton: MouseButton.ACCEPT,
        })

        const endTurnBattleAction = BattleActionService.new({
            actor: {
                actorBattleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            },
            action: { isEndTurn: true },
            effect: { endTurn: true },
        })

        expect(
            BattleActionQueueService.peek(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionQueue
            )
        ).toEqual(endTurnBattleAction)
    })

    describe("player squaddie selector reacts to ending the turn", () => {
        let highlightTileSpy: jest.SpyInstance

        beforeEach(() => {
            highlightTileSpy = jest.spyOn(
                TerrainTileMapService,
                "removeAllGraphicsLayers"
            )
            let [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
                0,
                0,
                ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
            )
            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX,
                mouseY,
                mouseButton: MouseButton.ACCEPT,
            })

            let summaryHUDState =
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: RectAreaService.centerX(
                    summaryHUDState.playerCommandState.endTurnButton.buttonArea
                ),
                mouseY: RectAreaService.centerY(
                    summaryHUDState.playerCommandState.endTurnButton.buttonArea
                ),
                mouseButton: MouseButton.ACCEPT,
            })
        })

        afterEach(() => {
            highlightTileSpy.mockClear()
        })

        it("Selector has completed and HUD is no longer drawn", () => {
            expect(selector.hasCompleted(gameEngineState)).toBeTruthy()
            selector.reset(gameEngineState)
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.showSummaryHUD
            ).toBeFalsy()
        })

        it("ends the squaddie turn", () => {
            expect(
                playerBattleSquaddie.squaddieTurn.remainingActionPoints
            ).toEqual(0)
            expect(
                SquaddieTurnService.hasActionPointsRemaining(
                    playerBattleSquaddie.squaddieTurn
                )
            ).toBeFalsy()
            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                    gameEngineState
                )
            ).toBeTruthy()
        })

        it("tells the map to stop highlighting tiles", () => {
            expect(highlightTileSpy).toBeCalled()
        })

        it("It adds an event showing the processed action", () => {
            const decidedActionEndTurnEffect =
                DecidedActionEndTurnEffectService.new({
                    template: ActionEffectEndTurnTemplateService.new({}),
                })

            expect(
                gameEngineState.battleOrchestratorState.battleState.recording
                    .history
            ).toContainEqual(
                BattleEventService.new({
                    processedAction: ProcessedActionService.new({
                        actionPointCost: "End Turn",
                        processedActionEffects: [
                            ProcessedActionEndTurnEffectService.newFromDecidedActionEffect(
                                {
                                    decidedActionEffect:
                                        decidedActionEndTurnEffect,
                                }
                            ),
                        ],
                    }),
                    results: undefined,
                })
            )
        })
    })

    describe("When MapAction phase completes", () => {
        let mapAction: BattleSquaddieUsesActionOnMap
        let graphicsContext: GraphicsBuffer
        let decidedActionEndTurnEffect: DecidedActionEndTurnEffect
        let tintSpy: jest.SpyInstance
        let orchestratorUtilsSpy: jest.SpyInstance

        beforeEach(() => {
            decidedActionEndTurnEffect = DecidedActionEndTurnEffectService.new({
                template: ActionEffectEndTurnTemplateService.new({}),
            })
            graphicsContext = new MockedP5GraphicsBuffer()
            mapAction = new BattleSquaddieUsesActionOnMap()

            gameEngineState = GameEngineStateService.new({
                repository: objectRepository,
                resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap,
                        battlePhaseState: {
                            currentAffiliation: BattlePhase.PLAYER,
                            turnCount: 0,
                        },
                        actionsThisRound: ActionsThisRoundService.new({
                            battleSquaddieId:
                                playerBattleSquaddie.battleSquaddieId,
                            startingLocation: { q: 0, r: 0 },
                            processedActions: [
                                ProcessedActionService.new({
                                    actionPointCost: "End Turn",
                                    processedActionEffects: [
                                        ProcessedActionEndTurnEffectService.newFromDecidedActionEffect(
                                            {
                                                decidedActionEffect:
                                                    decidedActionEndTurnEffect,
                                            }
                                        ),
                                    ],
                                }),
                            ],
                        }),
                    }),
                }),
                campaign: CampaignService.default(),
            })
            BattleSquaddieService.endTurn(playerBattleSquaddie)
            tintSpy = jest.spyOn(
                DrawSquaddieUtilities,
                "tintSquaddieMapIconIfTheyCannotAct"
            )

            jest.spyOn(Date, "now").mockImplementation(() => 0)
            mapAction.update(gameEngineState, graphicsContext)
            jest.spyOn(Date, "now").mockImplementation(
                () => ACTION_COMPLETED_WAIT_TIME_MS + 1
            )
            mapAction.update(gameEngineState, graphicsContext)

            orchestratorUtilsSpy = jest.spyOn(
                OrchestratorUtilities,
                "clearActionsThisRoundIfSquaddieCannotAct"
            )
        })

        afterEach(() => {
            tintSpy.mockRestore()
            orchestratorUtilsSpy.mockRestore()
        })

        it("component is completed", () => {
            expect(mapAction.hasCompleted(gameEngineState)).toBeTruthy()
        })
        it("It iterates to the next processed action to show", () => {
            let nextAction =
                ActionsThisRoundService.getProcessedActionEffectToShow(
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound
                )
            expect(nextAction).toEqual(
                ProcessedActionEndTurnEffectService.newFromDecidedActionEffect({
                    decidedActionEffect: decidedActionEndTurnEffect,
                })
            )
            mapAction.recommendStateChanges(gameEngineState)
            mapAction.reset(gameEngineState)
            nextAction = ActionsThisRoundService.getProcessedActionEffectToShow(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound
            )
            expect(nextAction).toBeUndefined()
        })
        it("It clears ActionsThisRound when there are no more actions to process", () => {
            mapAction.recommendStateChanges(gameEngineState)
            mapAction.reset(gameEngineState)
            expect(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound
            ).toBeUndefined()
        })
        it("The squaddie is grayed out since it is out of actions", () => {
            expect(tintSpy).toBeCalled()
        })
        it("checks to see if it should generate a message to alert another player squaddie can act", () => {
            mapAction.recommendStateChanges(gameEngineState)
            expect(orchestratorUtilsSpy).toBeCalledWith(gameEngineState)
        })
    })
})

const getGameEngineState = ({
    resourceHandler,
    missionMap,
    repository,
    teams,
    battlePhaseState,
    actionsThisRound,
}: {
    resourceHandler: ResourceHandler
    missionMap: MissionMap
    repository: ObjectRepository
    teams: BattleSquaddieTeam[]
    battlePhaseState: BattlePhaseState
    actionsThisRound?: ActionsThisRound
}): GameEngineState => {
    return GameEngineStateService.new({
        resourceHandler: resourceHandler,
        battleOrchestratorState: BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                missionMap,
                camera: new BattleCamera(0, 0),
                teams,
                battlePhaseState,
                actionsThisRound,
            }),
        }),
        repository,
        campaign: CampaignService.default(),
    })
}

const selectSquaddieForTheHUD = ({
    battleSquaddie,
    gameEngineState,
}: {
    battleSquaddie: BattleSquaddie
    gameEngineState: GameEngineState
}) => {
    gameEngineState.messageBoard.sendMessage({
        type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
        gameEngineState,
        battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
        selectionMethod: {
            mouseClick: MouseClickService.new({
                x: 0,
                y: 0,
                button: MouseButton.ACCEPT,
            }),
        },
    })
}
