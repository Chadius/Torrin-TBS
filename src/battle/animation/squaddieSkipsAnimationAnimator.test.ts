import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { ResourceRepository, ResourceRepositoryService } from "../../resource/resourceRepository"
import { TestLoadImmediatelyImageLoader } from "../../resource/resourceRepositoryTestUtils"
import { LoadCampaignData } from "../../utils/fileHandling/loadCampaignData"
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
import { BattleStateService } from "../battleState/battleState"
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
import {
    ActionRange,
    TargetConstraintsService,
} from "../../action/targetConstraints"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngineState/gameEngineState"
import { CoordinateGeneratorShape } from "../targeting/coordinateGenerator"

describe("SquaddieSkipsAnimationAnimator", () => {
    let resourceRepository: ResourceRepository

    let objectRepository: ObjectRepository
    let monkStaticId = "monk static"
    let monkBattleSquaddieId = "monk dynamic"
    let monkKoanAction: ActionTemplate
    let monkMeditatesBattleAction: BattleAction

    let animator: SquaddieSkipsAnimationAnimator
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        const loadImmediatelyImageLoader = new TestLoadImmediatelyImageLoader({})
        resourceRepository = ResourceRepositoryService.new({
            imageLoader: loadImmediatelyImageLoader,
            urls: Object.fromEntries(
                LoadCampaignData.getResourceKeys().map((key) => [key, "url"])
            ),
        })

        objectRepository = ObjectRepositoryService.new()

        monkKoanAction = ActionTemplateService.new({
            id: "koan",
            name: "koan",
            targetConstraints: TargetConstraintsService.new({
                range: ActionRange.SELF,
                coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
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
            resourceRepository: resourceRepository,
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

        const outputResultForTextOnlySpy = vi.spyOn(
            ActionResultTextService.ActionResultTextService,
            "outputResultForTextOnly"
        )
        const drawLabelSpy = vi.spyOn(LabelService, "draw")

        animator.reset(gameEngineState)
        animator.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
        })

        expect(animator.outputTextDisplay).not.toBeUndefined()
        expect(outputResultForTextOnlySpy).toBeCalled()
        expect(outputResultForTextOnlySpy).toBeCalledWith({
            currentActionEffectTemplate:
                monkKoanAction.actionEffectTemplates[0],
            squaddieRepository: objectRepository,
            actionTemplateName: monkKoanAction.name,
            actingBattleSquaddieId:
                monkMeditatesBattleAction.actor.actorBattleSquaddieId,
            actorContext: monkMeditatesBattleAction.actor.actorContext,
            battleActionSquaddieChanges:
                monkMeditatesBattleAction.effect.squaddie,
        })
        expect(drawLabelSpy).toBeCalled()
    })

    it("will complete at the end of the display time", () => {
        const gameEngineState = setupAnimationAtTime0()
        vi.spyOn(Date, "now").mockImplementation(
            () => ANIMATE_TEXT_WINDOW_WAIT_TIME
        )

        animator.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
        })
        expect(animator.hasCompleted(gameEngineState)).toBeTruthy()
    })

    const setupAnimationAtTime0 = () => {
        vi.spyOn(Date, "now").mockImplementation(() => 0)
        const gameEngineState: GameEngineState = GameEngineStateService.new({
            resourceRepository: resourceRepository,
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
        animator.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
        })
        expect(animator.hasCompleted(gameEngineState)).toBeFalsy()
        return gameEngineState
    }

    it("will skip displaying the results if the user clicks", () => {
        const gameEngineState = setupAnimationAtTime0()

        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.RELEASE,
            mouseRelease: {
                button: MouseButton.ACCEPT,
                x: 0,
                y: 0,
            },
        }
        animator.mouseEventHappened(gameEngineState, mouseEvent)

        animator.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
        })
        expect(animator.hasCompleted(gameEngineState)).toBeTruthy()
    })

    it("will set the battle action animation to true when it resets", () => {
        const gameEngineState: GameEngineState = GameEngineStateService.new({
            resourceRepository: resourceRepository,
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

        const battleAction = BattleActionRecorderService.peekAtAnimationQueue(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )
        expect(
            BattleActionService.isAnimationComplete(battleAction!)
        ).toBeTruthy()
    })
})
