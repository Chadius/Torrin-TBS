import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { SquaddieService } from "../../squaddie/squaddieService"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { SquaddieTargetsOtherSquaddiesAnimator } from "../animation/squaddieTargetsOtherSquaddiesAnimatior"
import { SquaddieActionAnimator } from "../animation/squaddieActionAnimator"
import { DefaultSquaddieActionAnimator } from "../animation/defaultSquaddieActionAnimator"
import { SquaddieSkipsAnimationAnimator } from "../animation/squaddieSkipsAnimationAnimator"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ActionComponentCalculator } from "../actionDecision/actionComponentCalculator"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import { isValidValue } from "../../utils/validityCheck"
import { MissionMapService } from "../../missionMap/missionMap"
import { ResourceHandler } from "../../resource/resourceHandler"

export class BattleSquaddieUsesActionOnSquaddie
    implements BattleOrchestratorComponent
{
    private sawResultAftermath: boolean
    private readonly _squaddieTargetsOtherSquaddiesAnimator: SquaddieTargetsOtherSquaddiesAnimator
    private readonly _squaddieSkipsAnimationAnimator: SquaddieSkipsAnimationAnimator

    constructor() {
        this._squaddieTargetsOtherSquaddiesAnimator =
            new SquaddieTargetsOtherSquaddiesAnimator()
        this._squaddieSkipsAnimationAnimator =
            new SquaddieSkipsAnimationAnimator()
        this.resetInternalState()
    }

    get squaddieSkipsAnimationAnimator(): SquaddieSkipsAnimationAnimator {
        return this._squaddieSkipsAnimationAnimator
    }

    private _squaddieActionAnimator: SquaddieActionAnimator

    get squaddieActionAnimator(): SquaddieActionAnimator {
        if (this._squaddieActionAnimator === undefined) {
            this._squaddieActionAnimator = new DefaultSquaddieActionAnimator()
        }
        return this._squaddieActionAnimator
    }

    get squaddieTargetsOtherSquaddiesAnimator(): SquaddieTargetsOtherSquaddiesAnimator {
        return this._squaddieTargetsOtherSquaddiesAnimator
    }

    hasCompleted(_state: GameEngineState): boolean {
        return this.sawResultAftermath
    }

    mouseEventHappened(
        gameEngineState: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        if (event.eventType === OrchestratorComponentMouseEventType.RELEASE) {
            this.setSquaddieActionAnimatorBasedOnAction(gameEngineState)
            this.squaddieActionAnimator.mouseEventHappened(
                gameEngineState,
                event
            )
        }
    }

    keyEventHappened(
        gameEngineState: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        if (event.eventType === OrchestratorComponentKeyEventType.PRESSED) {
            this.setSquaddieActionAnimatorBasedOnAction(gameEngineState)
            this.squaddieActionAnimator.keyEventHappened(gameEngineState, event)
        }
    }

    uiControlSettings(_state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
            pauseTimer: true,
            displayPlayerHUD: false,
        })
    }

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        OrchestratorUtilities.generateMessagesIfThePlayerCanActWithANewSquaddie(
            gameEngineState
        )
        const nextMode =
            ActionComponentCalculator.getNextModeBasedOnBattleActionRecorder(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        OrchestratorUtilities.messageAndHighlightPlayableSquaddieTakingATurn({
            gameEngineState,
        })

        return {
            nextMode,
            checkMissionObjectives: true,
        }
    }

    reset(gameEngineState: GameEngineState): void {
        this.squaddieActionAnimator.reset(gameEngineState)
        this._squaddieActionAnimator = undefined
        this.resetInternalState()
    }

    update({
        gameEngineState,
        graphicsContext,
        resourceHandler,
    }: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }): void {
        if (
            this.squaddieActionAnimator instanceof DefaultSquaddieActionAnimator
        ) {
            this.setSquaddieActionAnimatorBasedOnAction(gameEngineState)
        }
        this.squaddieActionAnimator.update({
            gameEngineState,
            graphicsContext,
            resourceHandler,
        })
        if (
            !this.sawResultAftermath &&
            this.squaddieActionAnimator.hasCompleted(gameEngineState)
        ) {
            this.reactToAnimationCompletion(gameEngineState, graphicsContext)
        }
    }

    private reactToAnimationCompletion(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ) {
        this.hideDeadSquaddies(gameEngineState)
        const battleSquaddieId =
            BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            ).actor.actorBattleSquaddieId

        if (!battleSquaddieId) {
            this.sawResultAftermath = true
            return
        }

        generateMessagesBasedOnAnimationFinishedBattleAction(gameEngineState)

        gameEngineState.messageBoard.sendMessage({
            type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
            gameEngineState,
            graphicsContext,
            resourceHandler: gameEngineState.resourceHandler,
        })

        this.sawResultAftermath = true
    }

    private resetInternalState() {
        this.sawResultAftermath = false
    }

    private hideDeadSquaddies(gameEngineState: GameEngineState) {
        const recentBattleAction =
            BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )
        const mostRecentResults = recentBattleAction.effect.squaddie
        mostRecentResults.forEach((result) => {
            const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    gameEngineState.repository,
                    result.battleSquaddieId
                )
            )
            if (
                !SquaddieService.isSquaddieAlive({
                    battleSquaddie,
                    squaddieTemplate,
                })
            ) {
                MissionMapService.hideSquaddieFromDrawing(
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                    result.battleSquaddieId
                )
                MissionMapService.updateBattleSquaddieCoordinate({
                    missionMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                    battleSquaddieId: result.battleSquaddieId,
                    coordinate: undefined,
                })
            }
        })
    }

    private setSquaddieActionAnimatorBasedOnAction(
        gameEngineState: GameEngineState
    ) {
        const battleOrchestratorState = gameEngineState.battleOrchestratorState
        const battleActionReadyToAnimate =
            BattleActionRecorderService.peekAtAnimationQueue(
                battleOrchestratorState.battleState.battleActionRecorder
            )
        if (!battleActionReadyToAnimate) {
            this._squaddieActionAnimator = new DefaultSquaddieActionAnimator()
            return
        }

        if (!battleActionReadyToAnimate.action.actionTemplateId) {
            return
        }

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            battleActionReadyToAnimate.action.actionTemplateId
        )

        if (!actionTemplate) {
            return
        }

        if (
            TraitStatusStorageService.getStatus(
                actionTemplate.actionEffectTemplates[0].traits,
                Trait.SKIP_ANIMATION
            ) === true
        ) {
            this._squaddieActionAnimator = this.squaddieSkipsAnimationAnimator
            return
        }

        this._squaddieActionAnimator =
            this.squaddieTargetsOtherSquaddiesAnimator
    }
}

const generateMessagesBasedOnAnimationFinishedBattleAction = (
    gameEngineState: GameEngineState
) => {
    const recentBattleAction = BattleActionRecorderService.peekAtAnimationQueue(
        gameEngineState.battleOrchestratorState.battleState.battleActionRecorder
    )
    if (!isValidValue(recentBattleAction?.effect?.squaddie)) return

    const damagedBattleSquaddieIds: string[] =
        recentBattleAction.effect.squaddie
            .filter((change) => change.damage.net > 0)
            .map((change) => change.battleSquaddieId)

    gameEngineState.messageBoard.sendMessage({
        gameEngineState,
        type: MessageBoardMessageType.SQUADDIE_IS_INJURED,
        battleSquaddieIdsThatWereInjured: damagedBattleSquaddieIds,
    })
}
