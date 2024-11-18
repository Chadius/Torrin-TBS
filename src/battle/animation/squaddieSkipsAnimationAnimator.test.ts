import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ResourceHandler } from "../../resource/resourceHandler"
import { makeResult } from "../../utils/ResultOrError"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import {
    ANIMATE_TEXT_WINDOW_WAIT_TIME,
    SquaddieSkipsAnimationAnimator,
} from "./squaddieSkipsAnimationAnimator"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
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
import { ActionEffectTemplateService } from "../../action/template/actionEffectTemplate"
import { MouseButton } from "../../utils/mouseConfig"
import {
    BattleAction,
    BattleActionService,
} from "../history/battleAction/battleAction"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { BattleActionSquaddieChangeService } from "../history/battleAction/battleActionSquaddieChange"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { TargetConstraintsService } from "../../action/targetConstraints"

describe("SquaddieSkipsAnimationAnimator", () => {
    let mockResourceHandler: jest.Mocked<ResourceHandler>

    let objectRepository: ObjectRepository
    let monkStaticId = "monk static"
    let monkBattleSquaddieId = "monk dynamic"
    let monkKoanAction: ActionTemplate
    let monkMeditatesBattleAction: BattleAction

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
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 0,
                maximumRange: 0,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.SKIP_ANIMATION]: true,
                    }),
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

        monkMeditatesBattleAction = BattleActionService.new({
            actor: { actorBattleSquaddieId: monkBattleSquaddieId },
            action: { actionTemplateId: monkKoanAction.id },
            effect: {
                squaddie: [
                    BattleActionSquaddieChangeService.new({
                        battleSquaddieId: monkBattleSquaddieId,
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    }),
                ],
            },
        })
        animator = new SquaddieSkipsAnimationAnimator()
    })

    it("will create a text window with the action results", () => {
        const gameEngineState: GameEngineState = GameEngineStateService.new({
            resourceHandler: mockResourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    campaignId: "test campaign",
                    missionId: "test mission",
                }),
            }),
            repository: objectRepository,
        })
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            monkMeditatesBattleAction
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
            currentActionEffectTemplate:
                monkKoanAction.actionEffectTemplates[0],
            squaddieRepository: objectRepository,
            actionTemplateName: monkKoanAction.name,
            actingBattleSquaddieId:
                monkMeditatesBattleAction.actor.actorBattleSquaddieId,
            actingContext: monkMeditatesBattleAction.actor.actorContext,
            battleActionSquaddieChanges:
                monkMeditatesBattleAction.effect.squaddie,
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
                }),
            }),
            repository: objectRepository,
        })
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            monkMeditatesBattleAction
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
                }),
            }),
            repository: objectRepository,
        })
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            monkMeditatesBattleAction
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
                }),
            }),
            repository: objectRepository,
        })
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            monkMeditatesBattleAction
        )

        animator.reset(gameEngineState)

        expect(
            BattleActionService.isAnimationComplete(
                BattleActionRecorderService.peekAtAnimationQueue(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder
                )
            )
        ).toBeTruthy()
    })
})
