import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { CreateNewSquaddieMovementWithTraits } from "../../squaddie/movement"
import { BattleSquaddieUsesActionOnMap } from "./battleSquaddieUsesActionOnMap"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { DecidedActionEndTurnEffectService } from "../../action/decided/decidedActionEndTurnEffect"
import { ActionEffectEndTurnTemplateService } from "../../action/template/actionEffectEndTurnTemplate"
import { ProcessedActionEndTurnEffectService } from "../../action/processed/processedActionEndTurnEffect"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"

describe("BattleSquaddieUsesActionOnMap", () => {
    let squaddieRepository: ObjectRepository
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let dateSpy: jest.SpyInstance
    let mapAction: BattleSquaddieUsesActionOnMap
    let gameEngineState: GameEngineState
    let messageSpy: jest.SpyInstance

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        squaddieRepository = ObjectRepositoryService.new()
        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "Torrin",
            templateId: "static_squaddie",
            battleId: "dynamic_squaddie",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository: squaddieRepository,
            attributes: {
                movement: CreateNewSquaddieMovementWithTraits({
                    movementPerAction: 2,
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }),
                }),
                armorClass: 0,
                maxHitPoints: 0,
            },
            actionTemplateIds: [],
        })

        dateSpy = jest.spyOn(Date, "now").mockImplementation(() => 0)

        mapAction = new BattleSquaddieUsesActionOnMap()

        gameEngineState = GameEngineStateService.new({
            repository: squaddieRepository,
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    campaignId: "test campaign",
                    missionId: "test mission",
                    actionsThisRound: ActionsThisRoundService.new({
                        battleSquaddieId: "dynamic_squaddie",
                        startingLocation: { q: 0, r: 0 },
                        processedActions: [
                            ProcessedActionService.new({
                                decidedAction: undefined,
                                processedActionEffects: [
                                    ProcessedActionEndTurnEffectService.new({
                                        decidedActionEffect:
                                            DecidedActionEndTurnEffectService.new(
                                                {
                                                    template:
                                                        ActionEffectEndTurnTemplateService.new(
                                                            {}
                                                        ),
                                                }
                                            ),
                                    }),
                                ],
                            }),
                        ],
                    }),
                }),
            }),
        })
        gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            battleSquaddieId: "dynamic_squaddie",
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            endTurn: true,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            targetLocation: { q: 0, r: 1 },
        })

        messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
    })

    afterEach(() => {
        dateSpy.mockRestore()
        messageSpy.mockRestore()
    })

    it("can wait half a second before ending turn", () => {
        mapAction.update(gameEngineState, mockedP5GraphicsContext)
        expect(mapAction.animationCompleteStartTime).not.toBeUndefined()
        expect(mapAction.hasCompleted(gameEngineState)).toBeFalsy()
        dateSpy.mockImplementation(() => 500)

        mapAction.update(gameEngineState, mockedP5GraphicsContext)
        expect(mapAction.hasCompleted(gameEngineState)).toBeTruthy()

        const stateChanges = mapAction.recommendStateChanges(gameEngineState)
        expect(stateChanges.nextMode).toBeUndefined()
        expect(stateChanges.displayMap).toBeTruthy()

        mapAction.reset(gameEngineState)
        expect(mapAction.animationCompleteStartTime).toBeUndefined()
        expect(
            OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                gameEngineState
            )
        ).toBeFalsy()
    })

    it("sets the next mode as undefined", () => {
        dateSpy.mockImplementation(() => 500)
        mapAction.update(gameEngineState, mockedP5GraphicsContext)

        const stateChanges = mapAction.recommendStateChanges(gameEngineState)
        expect(stateChanges.nextMode).toBeUndefined()
        expect(stateChanges.displayMap).toBeTruthy()

        mapAction.reset(gameEngineState)
        expect(mapAction.animationCompleteStartTime).toBeUndefined()
        expect(
            OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                gameEngineState
            )
        ).toBeFalsy()
    })

    it("sets the animation as complete", () => {
        mapAction.update(gameEngineState, mockedP5GraphicsContext)
        dateSpy.mockImplementation(() => 500)
        mapAction.update(gameEngineState, mockedP5GraphicsContext)
        expect(
            BattleActionDecisionStepService.isAnimationComplete(
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState
            )
        ).toBeTruthy()
    })

    it("displays the map", () => {
        dateSpy.mockImplementation(() => 500)
        mapAction.update(gameEngineState, mockedP5GraphicsContext)

        const stateChanges = mapAction.recommendStateChanges(gameEngineState)
        expect(stateChanges.displayMap).toBeTruthy()
    })

    it("sends a message noting the animation is complete", () => {
        mapAction.update(gameEngineState, mockedP5GraphicsContext)
        dateSpy.mockImplementation(() => 500)
        mapAction.update(gameEngineState, mockedP5GraphicsContext)
        expect(messageSpy).toBeCalledWith({
            type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
            gameEngineState,
        })
    })

    describe("reset the component", () => {
        let actionBuilderSpy: jest.SpyInstance

        beforeEach(() => {
            actionBuilderSpy = jest.spyOn(
                OrchestratorUtilities,
                "resetActionBuilderIfActionIsComplete"
            )
            mapAction.update(gameEngineState, mockedP5GraphicsContext)
            dateSpy.mockImplementation(() => 500)
            mapAction.update(gameEngineState, mockedP5GraphicsContext)
            mapAction.recommendStateChanges(gameEngineState)
            mapAction.reset(gameEngineState)
        })

        it("clears internal animation timer", () => {
            expect(mapAction.animationCompleteStartTime).toBeUndefined()
        })

        it("knows no squaddie is currently taking a turn", () => {
            expect(
                OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(
                    gameEngineState
                )
            ).toBeFalsy()
        })

        it("resets the action builder", () => {
            expect(actionBuilderSpy).toBeCalledWith(gameEngineState)
            expect(
                BattleActionDecisionStepService.isActionRecordComplete(
                    gameEngineState.battleOrchestratorState.battleState
                        .playerBattleActionBuilderState
                )
            ).toBeFalsy()
        })

        it("clears the HUD", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ).toBeUndefined()
        })
    })
})
