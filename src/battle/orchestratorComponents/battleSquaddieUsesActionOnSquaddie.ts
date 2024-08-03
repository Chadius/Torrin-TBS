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
import { RecordingService } from "../history/recording"
import { BattleEvent } from "../history/battleEvent"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import { DrawSquaddieUtilities } from "../animation/drawSquaddie"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { ActionComponentCalculator } from "../actionDecision/actionComponentCalculator"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"

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
    ): void {}

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
            ActionComponentCalculator.getNextModeBasedOnActionsThisRound(
                gameEngineState.battleOrchestratorState.battleState
                    .actionsThisRound
            )
        OrchestratorUtilities.drawOrResetHUDBasedOnSquaddieTurnAndAffiliation(
            gameEngineState
        )
        OrchestratorUtilities.drawSquaddieReachBasedOnSquaddieTurnAndAffiliation(
            gameEngineState
        )

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
        OrchestratorUtilities.resetActionBuilderIfActionIsComplete(
            gameEngineState
        )
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

            const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    gameEngineState.repository,
                    gameEngineState.battleOrchestratorState.battleState
                        .actionsThisRound.battleSquaddieId
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

    private hideDeadSquaddies(state: GameEngineState) {
        const mostRecentResults = RecordingService.mostRecentEvent(
            state.battleOrchestratorState.battleState.recording
        ).results
        mostRecentResults.targetedBattleSquaddieIds.forEach(
            (battleSquaddieId) => {
                const { battleSquaddie, squaddieTemplate } =
                    getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            state.repository,
                            battleSquaddieId
                        )
                    )
                if (!IsSquaddieAlive({ battleSquaddie, squaddieTemplate })) {
                    state.battleOrchestratorState.battleState.missionMap.hideSquaddieFromDrawing(
                        battleSquaddieId
                    )
                    state.battleOrchestratorState.battleState.missionMap.updateSquaddieLocation(
                        battleSquaddieId,
                        undefined
                    )
                }
            }
        )
    }

    private setSquaddieActionAnimatorBasedOnAction(
        state: BattleOrchestratorState
    ) {
        const mostRecentEvent: BattleEvent = RecordingService.mostRecentEvent(
            state.battleState.recording
        )
        if (
            mostRecentEvent === undefined ||
            mostRecentEvent.processedAction === undefined
        ) {
            this._squaddieActionAnimator = new DefaultSquaddieActionAnimator()
            return
        }

        const processedActionEffectToShow =
            ActionsThisRoundService.getProcessedActionEffectToShow(
                state.battleState.actionsThisRound
            )

        if (processedActionEffectToShow.type !== ActionEffectType.SQUADDIE) {
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
                .filter((change) => change.damageTaken > 0)
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
