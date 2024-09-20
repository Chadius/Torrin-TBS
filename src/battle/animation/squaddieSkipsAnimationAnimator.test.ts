import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ResourceHandler } from "../../resource/resourceHandler"
import { makeResult } from "../../utils/ResultOrError"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { Recording, RecordingService } from "../history/recording"
import {
    ANIMATE_TEXT_WINDOW_WAIT_TIME,
    SquaddieSkipsAnimationAnimator,
} from "./squaddieSkipsAnimationAnimator"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleEvent, BattleEventService } from "../history/battleEvent"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { LabelService } from "../../ui/label"
import * as ActionResultTextService from "./actionResultTextService"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService,
} from "../../action/template/actionEffectSquaddieTemplate"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { ProcessedActionSquaddieEffectService } from "../../action/processed/processedActionSquaddieEffect"
import { DecidedActionSquaddieEffectService } from "../../action/decided/decidedActionSquaddieEffect"
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../history/actionsThisRound"
import { MouseButton } from "../../utils/mouseConfig"
import { SquaddieSquaddieResultsService } from "../history/squaddieSquaddieResults"
import {
    BattleAction,
    BattleActionActionContextService,
    BattleActionService,
} from "../history/battleAction"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { BattleActionQueueService } from "../history/battleActionQueue"

describe("SquaddieSkipsAnimationAnimator", () => {
    let mockResourceHandler: jest.Mocked<ResourceHandler>

    let objectRepository: ObjectRepository
    let monkStaticId = "monk static"
    let monkBattleSquaddieId = "monk dynamic"
    let monkKoanAction: ActionTemplate
    let monkMeditatesEvent: BattleEvent
    let monkMeditatesInstruction: ActionsThisRound

    let battleEventRecording: Recording

    let animator: SquaddieSkipsAnimationAnimator
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        mockResourceHandler = mocks.mockResourceHandler(mockedP5GraphicsContext)
        mockResourceHandler.getResource = jest
            .fn()
            .mockReturnValue(makeResult(null))

        objectRepository = ObjectRepositoryService.new()

        monkKoanAction = ActionTemplateService.new({
            id: "koan",
            name: "koan",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.SKIP_ANIMATION]: true,
                    }),
                    maximumRange: 0,
                    minimumRange: 0,
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            monkKoanAction
        )

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            actionTemplateIds: [monkKoanAction.id],
            affiliation: SquaddieAffiliation.PLAYER,
            battleId: monkBattleSquaddieId,
            name: "Monk",
            templateId: monkStaticId,
            objectRepository: objectRepository,
        })

        battleEventRecording = { history: [] }

        const oneDecisionInstruction = ProcessedActionService.new({
            actionPointCost: 1,
            processedActionEffects: [
                ProcessedActionSquaddieEffectService.newFromDecidedActionEffect(
                    {
                        decidedActionEffect:
                            DecidedActionSquaddieEffectService.new({
                                template: monkKoanAction
                                    .actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                                target: { q: 0, r: 0 },
                            }),
                        results: undefined,
                    }
                ),
            ],
        })

        monkMeditatesInstruction = ActionsThisRoundService.new({
            battleSquaddieId: monkBattleSquaddieId,
            startingLocation: { q: 0, r: 0 },
            processedActions: [oneDecisionInstruction],
        })

        monkMeditatesEvent = BattleEventService.new({
            processedAction: oneDecisionInstruction,
            results: SquaddieSquaddieResultsService.new({
                actingBattleSquaddieId: monkBattleSquaddieId,
                targetedBattleSquaddieIds: [],
                squaddieChanges: [],
                actionContext: BattleActionActionContextService.new({}),
            }),
        })
        RecordingService.addEvent(battleEventRecording, monkMeditatesEvent)
        animator = new SquaddieSkipsAnimationAnimator()
    })

    it("will create a text window with the action results", () => {
        const gameEngineState: GameEngineState = GameEngineStateService.new({
            resourceHandler: mockResourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    campaignId: "test campaign",
                    missionId: "test mission",
                    recording: battleEventRecording,
                    actionsThisRound: monkMeditatesInstruction,
                }),
            }),
            repository: objectRepository,
        })
        BattleActionQueueService.add(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionQueue,
            BattleActionService.new({
                actor: { actorBattleSquaddieId: monkBattleSquaddieId },
                action: { actionTemplateId: monkKoanAction.id },
                effect: { squaddie: [] },
            })
        )

        const outputResultForTextOnlySpy = jest.spyOn(
            ActionResultTextService.ActionResultTextService,
            "outputResultForTextOnly"
        )
        const drawLabelSpy = jest.spyOn(LabelService, "draw")

        animator.reset(gameEngineState)
        animator.update(gameEngineState, mockedP5GraphicsContext)

        expect(animator.outputTextDisplay).not.toBeUndefined()
        expect(outputResultForTextOnlySpy).toBeCalled()
        expect(outputResultForTextOnlySpy).toBeCalledWith({
            currentActionEffectSquaddieTemplate:
                monkKoanAction.actionEffectTemplates[0],
            squaddieRepository: objectRepository,
            actionTemplateName: monkKoanAction.name,
            result: monkMeditatesEvent.results,
        })
        expect(drawLabelSpy).toBeCalled()
    })

    it("will complete at the end of the display time", () => {
        jest.spyOn(Date, "now").mockImplementation(() => 0)
        const gameEngineState: GameEngineState = GameEngineStateService.new({
            resourceHandler: mockResourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    actionsThisRound: monkMeditatesInstruction,
                    recording: battleEventRecording,
                }),
            }),
            repository: objectRepository,
        })
        BattleActionQueueService.add(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionQueue,
            BattleActionService.new({
                actor: { actorBattleSquaddieId: monkBattleSquaddieId },
                action: { actionTemplateId: monkKoanAction.id },
                effect: { squaddie: [] },
            })
        )

        animator.reset(gameEngineState)
        animator.update(gameEngineState, mockedP5GraphicsContext)
        expect(animator.hasCompleted(gameEngineState)).toBeFalsy()

        jest.spyOn(Date, "now").mockImplementation(
            () => ANIMATE_TEXT_WINDOW_WAIT_TIME
        )

        animator.update(gameEngineState, mockedP5GraphicsContext)
        expect(animator.hasCompleted(gameEngineState)).toBeTruthy()
    })

    it("will skip displaying the results if the user clicks", () => {
        jest.spyOn(Date, "now").mockImplementation(() => 0)
        const gameEngineState: GameEngineState = GameEngineStateService.new({
            resourceHandler: mockResourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    actionsThisRound: monkMeditatesInstruction,
                    recording: battleEventRecording,
                }),
            }),
            repository: objectRepository,
        })
        BattleActionQueueService.add(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionQueue,
            BattleActionService.new({
                actor: { actorBattleSquaddieId: monkBattleSquaddieId },
                action: { actionTemplateId: monkKoanAction.id },
                effect: { squaddie: [] },
            })
        )

        animator.reset(gameEngineState)
        animator.update(gameEngineState, mockedP5GraphicsContext)
        expect(animator.hasCompleted(gameEngineState)).toBeFalsy()

        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0,
            mouseButton: MouseButton.ACCEPT,
        }
        animator.mouseEventHappened(gameEngineState, mouseEvent)

        animator.update(gameEngineState, mockedP5GraphicsContext)
        expect(animator.hasCompleted(gameEngineState)).toBeTruthy()
    })

    it("will set the battle action animation to true when it resets", () => {
        const gameEngineState: GameEngineState = GameEngineStateService.new({
            resourceHandler: mockResourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    actionsThisRound: monkMeditatesInstruction,
                    recording: battleEventRecording,
                }),
            }),
            repository: objectRepository,
        })

        const battleAction: BattleAction = BattleActionService.new({
            actor: { actorBattleSquaddieId: monkBattleSquaddieId },
            action: { actionTemplateId: monkKoanAction.id },
            effect: { squaddie: [] },
        })
        BattleActionQueueService.add(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionQueue,
            battleAction
        )

        animator.reset(gameEngineState)

        expect(
            BattleActionService.isAnimationComplete(
                BattleActionQueueService.peek(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionQueue
                )
            )
        ).toBeTruthy()
    })
})
