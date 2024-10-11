import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { BattleOrchestratorState } from "../orchestrator/battleOrchestratorState"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { OrchestratorUtilities } from "./orchestratorUtils"
import { IsSquaddieAlive } from "../../squaddie/squaddieService"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { SquaddieTargetsOtherSquaddiesAnimator } from "../animation/squaddieTargetsOtherSquaddiesAnimatior"
import { SquaddieActionAnimator } from "../animation/squaddieActionAnimator"
import { DefaultSquaddieActionAnimator } from "../animation/defaultSquaddieActionAnimator"
import { SquaddieSkipsAnimationAnimator } from "../animation/squaddieSkipsAnimationAnimator"
import { Trait } from "../../trait/traitStatusStorage"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { DrawSquaddieUtilities } from "../animation/drawSquaddie"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { ActionComponentCalculator } from "../actionDecision/actionComponentCalculator"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { BattleActionRecorderService } from "../history/battleActionRecorder"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"

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

    hasCompleted(state: GameEngineState): boolean {
        return this.sawResultAftermath
    }

    mouseEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            this.setSquaddieActionAnimatorBasedOnAction(
                state.battleOrchestratorState
            )
            this.squaddieActionAnimator.mouseEventHappened(state, event)
        }
    }

    keyEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        // Required by inheritance
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
            pauseTimer: true,
        })
    }

    recommendStateChanges(
        gameEngineState: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        generateMessagesBasedOnSquaddieSquaddieResults(gameEngineState)

        ActionsThisRoundService.nextProcessedActionEffectToShow(
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
        )
        OrchestratorUtilities.clearActionsThisRoundIfSquaddieCannotAct(
            gameEngineState
        )
        OrchestratorUtilities.generateMessagesIfThePlayerCanActWithANewSquaddie(
            gameEngineState
        )
        const nextMode =
            ActionComponentCalculator.getNextModeBasedOnBattleActionRecorder(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        OrchestratorUtilities.drawOrResetHUDBasedOnSquaddieTurnAndAffiliation(
            gameEngineState
        )
        OrchestratorUtilities.drawPlayableSquaddieReach(gameEngineState)

        return {
            nextMode,
            displayMap: true,
            checkMissionObjectives: true,
        }
    }

    reset(gameEngineState: GameEngineState): void {
        this.squaddieActionAnimator.reset(gameEngineState)
        this._squaddieActionAnimator = undefined
        this.resetInternalState()
    }

    update(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ): void {
        if (
            this.squaddieActionAnimator instanceof DefaultSquaddieActionAnimator
        ) {
            this.setSquaddieActionAnimatorBasedOnAction(
                gameEngineState.battleOrchestratorState
            )
        }
        this.squaddieActionAnimator.update(gameEngineState, graphicsContext)
        if (this.squaddieActionAnimator.hasCompleted(gameEngineState)) {
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
            const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    gameEngineState.repository,
                    battleSquaddieId
                )
            )
            DrawSquaddieUtilities.highlightPlayableSquaddieReachIfTheyCanAct({
                battleSquaddie,
                squaddieTemplate,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                repository: gameEngineState.repository,
                campaign: gameEngineState.campaign,
            })
            DrawSquaddieUtilities.tintSquaddieMapIconIfTheyCannotAct(
                battleSquaddie,
                squaddieTemplate,
                gameEngineState.repository
            )

            gameEngineState.messageBoard.sendMessage({
                type: MessageBoardMessageType.BATTLE_ACTION_FINISHES_ANIMATION,
                gameEngineState,
            })

            this.sawResultAftermath = true
        }
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
            if (!IsSquaddieAlive({ battleSquaddie, squaddieTemplate })) {
                gameEngineState.battleOrchestratorState.battleState.missionMap.hideSquaddieFromDrawing(
                    result.battleSquaddieId
                )
                gameEngineState.battleOrchestratorState.battleState.missionMap.updateSquaddieLocation(
                    result.battleSquaddieId,
                    undefined
                )
            }
        })
    }

    private setSquaddieActionAnimatorBasedOnAction(
        battleOrchestratorState: BattleOrchestratorState
    ) {
        const battleActionReadyToAnimate =
            BattleActionRecorderService.peekAtAnimationQueue(
                battleOrchestratorState.battleState.battleActionRecorder
            )
        if (!battleActionReadyToAnimate) {
            this._squaddieActionAnimator = new DefaultSquaddieActionAnimator()
            return
        }

        const processedActionEffectToShow =
            ActionsThisRoundService.getProcessedActionEffectToShow(
                battleOrchestratorState.battleState.actionsThisRound
            )

        if (processedActionEffectToShow?.type !== ActionEffectType.SQUADDIE) {
            return
        }

        if (
            processedActionEffectToShow.decidedActionEffect.template.traits
                .booleanTraits[Trait.SKIP_ANIMATION] === true
        ) {
            this._squaddieActionAnimator = this.squaddieSkipsAnimationAnimator
            return
        }

        this._squaddieActionAnimator =
            this.squaddieTargetsOtherSquaddiesAnimator
    }
}

const generateMessagesBasedOnSquaddieSquaddieResults = (
    gameEngineState: GameEngineState
) => {
    const actionEffectJustShown =
        ActionsThisRoundService.getProcessedActionEffectToShow(
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
        )
    if (actionEffectJustShown?.type === ActionEffectType.SQUADDIE) {
        const damagedBattleSquaddieIds: string[] =
            actionEffectJustShown.results.squaddieChanges
                .filter((change) => change.damage.net > 0)
                .map((change) => change.battleSquaddieId)
        if (gameEngineState.messageBoard) {
            gameEngineState.messageBoard.sendMessage({
                gameEngineState,
                type: MessageBoardMessageType.SQUADDIE_IS_INJURED,
                battleSquaddieIdsThatWereInjured: damagedBattleSquaddieIds,
            })
        }
    }
}
