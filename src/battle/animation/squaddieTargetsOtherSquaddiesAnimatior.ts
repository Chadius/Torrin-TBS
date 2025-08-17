import {
    OrchestratorComponentKeyEvent,
    OrchestratorComponentKeyEventType,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { ActionAnimationPhase } from "./actionAnimation/actionAnimationConstants"
import { ActionTimer } from "./actionAnimation/actionTimer"
import { ActorTextWindow } from "./actionAnimation/actorTextWindow"
import { WeaponIcon } from "./actionAnimation/weaponIcon"
import { ActorSprite } from "./actionAnimation/actorSprite"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { TargetSprite } from "./actionAnimation/targetSprite"
import { TargetTextWindow } from "./actionAnimation/targetTextWindow"
import { HitPointMeter } from "./actionAnimation/hitPointMeter"
import { SquaddieService } from "../../squaddie/squaddieService"
import { GOLDEN_RATIO, WINDOW_SPACING } from "../../ui/constants"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../graphicsConstants"
import { SquaddieActionAnimator } from "./squaddieActionAnimator"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { RectAreaService } from "../../ui/rectArea"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ActionEffectTemplate } from "../../action/template/actionEffectTemplate"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { BattleActionSquaddieChange } from "../history/battleAction/battleActionSquaddieChange"
import {
    BattleAction,
    BattleActionService,
} from "../history/battleAction/battleAction"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { ResourceHandler } from "../../resource/resourceHandler"
import { ActionEffectChange } from "../history/calculatedResult"
import {
    DiceRollAnimation,
    DiceRollAnimationService,
} from "./attackRollAnimation/diceRollAnimation"
import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import {
    ModifierDisplayColumn,
    ModifierDisplayColumnData,
    ModifierDisplayColumnPosition,
    ModifierDisplayColumnService,
} from "./modifierDisplay/modifierDisplayColumn"
import {
    AttributeTypeAndAmount,
    AttributeTypeService,
} from "../../squaddie/attribute/attributeType"
import {
    RollModifierType,
    RollModifierTypeService,
} from "../calculator/actionCalculator/rollResult"
import {
    AttackRollThermometer,
    AttackRollThermometerService,
} from "./attackRollThermometer/attackRollThermometer"
import { isValidValue } from "../../utils/objectValidityCheck"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"

const Layout = {
    diceRollAnimationLayout: {
        drawArea: {
            startColumn: 4,
            endColumn: 8,
            top: ScreenDimensions.SCREEN_HEIGHT / GOLDEN_RATIO + 40,
            height: 40,
        },
    },
    attackRollThermometerLayout: {
        drawArea: {
            startColumn: 4,
            endColumn: 8,
            top: ScreenDimensions.SCREEN_HEIGHT / GOLDEN_RATIO,
            height: 32,
        },
    },
}

export class SquaddieTargetsOtherSquaddiesAnimator
    implements SquaddieActionAnimator
{
    sawResultAftermath: boolean
    private startedShowingResults: boolean
    private _userRequestedAnimationSkip: boolean
    diceRollAnimation: DiceRollAnimation
    modifierDisplayColumns: {
        [p in ModifierDisplayColumnPosition]: ModifierDisplayColumn
    }
    attackRollThermometer: AttackRollThermometer

    constructor() {
        this.resetInternalState()
    }

    private _actionAnimationTimer: ActionTimer

    get actionAnimationTimer(): ActionTimer {
        return this._actionAnimationTimer
    }

    private _weaponIcon: WeaponIcon

    get weaponIcon(): WeaponIcon {
        return this._weaponIcon
    }

    private _actorTextWindow: ActorTextWindow

    get actorTextWindow(): ActorTextWindow {
        return this._actorTextWindow
    }

    private _actorSprite: ActorSprite

    get actorSprite(): ActorSprite {
        return this._actorSprite
    }

    private _targetSprites: TargetSprite[]

    get targetSprites(): TargetSprite[] {
        return this._targetSprites
    }

    private _targetTextWindows: TargetTextWindow[]

    get targetTextWindows(): TargetTextWindow[] {
        return this._targetTextWindows
    }

    private _targetHitPointMeters: {
        [battleId: string]: HitPointMeter
    }

    get targetHitPointMeters(): {
        [battleId: string]: HitPointMeter
    } {
        return this._targetHitPointMeters
    }

    hasCompleted(_: GameEngineState): boolean {
        return this.sawResultAftermath === true
    }

    mouseEventHappened(
        gameEngineState: GameEngineState,
        mouseEvent: OrchestratorComponentMouseEvent
    ) {
        if (
            mouseEvent.eventType === OrchestratorComponentMouseEventType.RELEASE
        ) {
            this._userRequestedAnimationSkip = true
            if (this.startedShowingResults === false) {
                this.updateHitPointMeters(gameEngineState)
                this.startedShowingResults = true
            }
        }
    }

    keyEventHappened(
        gameEngineState: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        if (event.eventType === OrchestratorComponentKeyEventType.PRESSED) {
            this._userRequestedAnimationSkip = true
            if (this.startedShowingResults === false) {
                this.updateHitPointMeters(gameEngineState)
                this.startedShowingResults = true
            }
        }
    }

    start(_: GameEngineState) {
        // Required by inheritance
    }

    resetInternalState() {
        this._actionAnimationTimer = new ActionTimer()
        this._userRequestedAnimationSkip = false
        this.sawResultAftermath = false
        this.startedShowingResults = false
        this._actionAnimationTimer = new ActionTimer()
        this._targetHitPointMeters = {}
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
            this.actionAnimationTimer.currentPhase ===
            ActionAnimationPhase.INITIALIZED
        ) {
            this.setupActionAnimation(gameEngineState)
            this.actionAnimationTimer.start()
        }

        const phaseToShow: ActionAnimationPhase = this
            ._userRequestedAnimationSkip
            ? ActionAnimationPhase.FINISHED_SHOWING_RESULTS
            : this.actionAnimationTimer.currentPhase

        switch (phaseToShow) {
            case ActionAnimationPhase.INITIALIZED:
            case ActionAnimationPhase.BEFORE_ACTION:
            case ActionAnimationPhase.DURING_ACTION:
                this.drawActionAnimation(
                    gameEngineState,
                    graphicsContext,
                    resourceHandler
                )
                break
            case ActionAnimationPhase.SHOWING_RESULTS:
            case ActionAnimationPhase.TARGET_REACTS:
                if (this.startedShowingResults === false) {
                    this.updateHitPointMeters(gameEngineState)
                    this.startedShowingResults = true
                }
                this.drawActionAnimation(
                    gameEngineState,
                    graphicsContext,
                    resourceHandler
                )
                break
            case ActionAnimationPhase.FINISHED_SHOWING_RESULTS:
                this.drawActionAnimation(
                    gameEngineState,
                    graphicsContext,
                    resourceHandler
                )
                this.sawResultAftermath = true
                break
        }

        DiceRollAnimationService.draw({
            graphicsBuffer: graphicsContext,
            diceRollAnimation: this.diceRollAnimation,
        })
        AttackRollThermometerService.draw({
            graphicsBuffer: graphicsContext,
            thermometer: this.attackRollThermometer,
        })
        if (this.modifierDisplayColumns[ModifierDisplayColumnPosition.LEFT]) {
            ModifierDisplayColumnService.draw({
                modifierDisplay:
                    this.modifierDisplayColumns[
                        ModifierDisplayColumnPosition.LEFT
                    ],
                graphicsBuffer: graphicsContext,
            })
        }
        if (this.modifierDisplayColumns[ModifierDisplayColumnPosition.RIGHT]) {
            ModifierDisplayColumnService.draw({
                modifierDisplay:
                    this.modifierDisplayColumns[
                        ModifierDisplayColumnPosition.RIGHT
                    ],
                graphicsBuffer: graphicsContext,
            })
        }
    }

    reset(gameEngineState: GameEngineState) {
        this.resetInternalState()
        BattleActionService.setAnimationCompleted({
            battleAction: BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            ),
            animationCompleted: true,
        })
    }

    private setupActionAnimation(gameEngineState: GameEngineState) {
        this._actorTextWindow = new ActorTextWindow()
        this._weaponIcon = new WeaponIcon()
        this._actorSprite = new ActorSprite()

        const actionToShow: BattleAction =
            BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        const { battleSquaddie: actorBattle, squaddieTemplate: actorTemplate } =
            getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    gameEngineState.repository,
                    actionToShow.actor.actorBattleSquaddieId
                )
            )

        if (actionToShow?.action.actionTemplateId === undefined) {
            return
        }

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            actionToShow.action.actionTemplateId
        )
        const results: ActionEffectChange = {
            actorContext: actionToShow.actor.actorContext,
            squaddieChanges: actionToShow.effect.squaddie,
        }

        this.actorTextWindow.start({
            actorTemplate: actorTemplate,
            actorBattle: actorBattle,
            actionTemplateName: actionTemplate.name,
            results,
        })

        this.actorSprite.start({
            actorBattleSquaddieId: actorBattle.battleSquaddieId,
            squaddieRepository: gameEngineState.repository,
            resourceHandler: gameEngineState.resourceHandler,
            startingPosition:
                (2 * ScreenDimensions.SCREEN_WIDTH) / 12 +
                WINDOW_SPACING.SPACING1,
            squaddieChanges: results.squaddieChanges[0],
        })
        this.weaponIcon.start()

        const resultPerTarget = actionToShow.effect.squaddie
        this.setupAnimationForTargetTextWindows(
            gameEngineState,
            resultPerTarget
        )
        this.setupAnimationForTargetSprites(
            gameEngineState,
            actionTemplate.actionEffectTemplates[0],
            resultPerTarget
        )
        this.setupAnimationForTargetHitPointMeters(gameEngineState)
        this.setupDiceRollAnimation(results)
        this.setupModifierDisplays(results)
        this.setupAttackRollThermometerAnimation({
            actionTemplateId: actionToShow.action.actionTemplateId,
            objectRepository: gameEngineState.repository,
            results: results,
        })
    }

    private setupAnimationForTargetSprites(
        gameEngineState: GameEngineState,
        actionEffectSquaddieTemplate: ActionEffectTemplate,
        resultPerTarget: BattleActionSquaddieChange[]
    ) {
        const actionToShow: BattleAction =
            BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        this._targetSprites = actionToShow.effect.squaddie
            .map((s) => s.battleSquaddieId)
            .map((battleId: string, index: number) => {
                const targetSprite = new TargetSprite()
                targetSprite.start({
                    targetBattleSquaddieId: battleId,
                    squaddieRepository: gameEngineState.repository,
                    actionEffectSquaddieTemplate,
                    result: resultPerTarget.find(
                        (change) => change.battleSquaddieId === battleId
                    ),
                    resourceHandler: gameEngineState.resourceHandler,
                    startingPosition: RectAreaService.right(
                        this.targetTextWindows[index].targetLabel.rectangle.area
                    ),
                })
                return targetSprite
            })
    }

    private setupAnimationForTargetTextWindows(
        gameEngineState: GameEngineState,
        resultPerTarget: BattleActionSquaddieChange[]
    ) {
        const actionToShow: BattleAction =
            BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        if (actionToShow?.action.actionTemplateId === undefined) {
            this._targetTextWindows = []
            return
        }

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            actionToShow.action.actionTemplateId
        )

        this._targetTextWindows = resultPerTarget
            .map((r) => r.battleSquaddieId)
            .map((battleId: string) => {
                const {
                    battleSquaddie: targetBattle,
                    squaddieTemplate: targetTemplate,
                } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        gameEngineState.repository,
                        battleId
                    )
                )

                const actionEffectSquaddieTemplate =
                    actionTemplate.actionEffectTemplates[0]

                const targetTextWindow = new TargetTextWindow()
                targetTextWindow.start({
                    targetTemplate: targetTemplate,
                    targetBattle: targetBattle,
                    result: resultPerTarget.find(
                        (change) => change.battleSquaddieId === battleId
                    ),
                    actionEffectSquaddieTemplate,
                })
                return targetTextWindow
            })
            .filter((x) => x)
    }

    private setupAnimationForTargetHitPointMeters(
        gameEngineState: GameEngineState
    ) {
        const actionToShow: BattleAction =
            BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        if (actionToShow?.action.actionTemplateId === undefined) {
            this._targetTextWindows = []
            return
        }

        actionToShow.effect.squaddie.forEach(
            (change: BattleActionSquaddieChange, index: number) => {
                const battleSquaddieId = change.battleSquaddieId
                const {
                    battleSquaddie: targetBattle,
                    squaddieTemplate: targetTemplate,
                } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        gameEngineState.repository,
                        battleSquaddieId
                    )
                )

                let {
                    currentHitPoints: displayedHitPointsBeforeChange,
                    maxHitPoints,
                } = SquaddieService.getHitPoints({
                    battleSquaddie: targetBattle,
                    squaddieTemplate: targetTemplate,
                })

                displayedHitPointsBeforeChange -= change.healingReceived
                displayedHitPointsBeforeChange += change.damage.net

                this._targetHitPointMeters[battleSquaddieId] =
                    new HitPointMeter({
                        currentHitPoints: displayedHitPointsBeforeChange,
                        maxHitPoints,
                        left:
                            this._targetTextWindows[index].targetLabel.rectangle
                                .area.left + WINDOW_SPACING.SPACING1,
                        top:
                            this._targetTextWindows[index].targetLabel.rectangle
                                .area.top + 100,
                        hue: HUE_BY_SQUADDIE_AFFILIATION[
                            targetTemplate.squaddieId.affiliation
                        ],
                    })
            }
        )
    }

    private drawActionAnimation(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ) {
        this.actorTextWindow.draw(graphicsContext, this.actionAnimationTimer)

        const actionToShow: BattleAction =
            BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        if (actionToShow?.action.actionTemplateId === undefined) {
            return
        }

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            actionToShow.action.actionTemplateId
        )

        const actionEffectSquaddieTemplate =
            actionTemplate.actionEffectTemplates[0]

        this.actorSprite.draw({
            timer: this.actionAnimationTimer,
            graphicsContext,
            actionEffectSquaddieTemplate,
            resourceHandler,
        })
        this.weaponIcon.draw({
            graphicsContext,
            actorImageArea: this.actorSprite.getSquaddieImageBasedOnTimer(
                this.actionAnimationTimer,
                graphicsContext,
                actionEffectSquaddieTemplate
            ).drawArea,
            actionEffectSquaddieTemplate,
        })
        this.targetTextWindows.forEach((t) =>
            t.draw(graphicsContext, this.actionAnimationTimer)
        )

        this.targetSprites.forEach((t) => {
            t.draw(
                this.actionAnimationTimer,
                graphicsContext,
                actionEffectSquaddieTemplate,
                actionToShow.effect.squaddie.find(
                    (change) => change.battleSquaddieId === t.battleSquaddieId
                ),
                resourceHandler
            )
        })
        Object.values(this.targetHitPointMeters).forEach((t) =>
            t.draw(graphicsContext)
        )
    }

    private updateHitPointMeters(gameEngineState: GameEngineState) {
        const actionToShow: BattleAction =
            BattleActionRecorderService.peekAtAnimationQueue(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

        actionToShow.effect.squaddie.forEach((change) => {
            const battleSquaddieId = change.battleSquaddieId
            const hitPointMeter = this.targetHitPointMeters[battleSquaddieId]
            const hitPointChange: number =
                change.healingReceived - change.damage.net
            hitPointMeter.changeHitPoints(hitPointChange)
        })
    }

    private setupDiceRollAnimation(results: ActionEffectChange) {
        const degreeOfSuccess =
            results?.squaddieChanges[0]?.actorDegreeOfSuccess ??
            DegreeOfSuccess.NONE

        this.diceRollAnimation = DiceRollAnimationService.new({
            degreeOfSuccess,
            rollResult: results.actorContext.actorRoll,
            drawArea: RectAreaService.new({
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                startColumn:
                    Layout.diceRollAnimationLayout.drawArea.startColumn,
                endColumn: Layout.diceRollAnimationLayout.drawArea.endColumn,
                top: Layout.diceRollAnimationLayout.drawArea.top,
                height: Layout.diceRollAnimationLayout.drawArea.height,
            }),
        })
    }

    private setupAttackRollThermometerAnimation({
        actionTemplateId,
        objectRepository,
        results,
    }: {
        actionTemplateId: string
        objectRepository: ObjectRepository
        results: ActionEffectChange
    }) {
        if (!isValidValue(results?.squaddieChanges[0])) {
            return
        }

        const degreeOfSuccess =
            results?.squaddieChanges[0]?.actorDegreeOfSuccess ??
            DegreeOfSuccess.NONE

        if (degreeOfSuccess === DegreeOfSuccess.NONE) {
            this.attackRollThermometer = undefined
            return
        }

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            objectRepository,
            actionTemplateId
        )
        if (!actionTemplate) return
        const actionEffectTemplate = actionTemplate.actionEffectTemplates[0]
        if (!actionEffectTemplate) return

        this.attackRollThermometer = AttackRollThermometerService.new({
            successBonus: results.squaddieChanges[0].successBonus,
            tryToShowCriticalSuccess:
                !TraitStatusStorageService.getStatus(
                    actionEffectTemplate.traits,
                    Trait.CANNOT_CRITICALLY_SUCCEED
                ) === true,
            tryToShowCriticalFailure:
                !TraitStatusStorageService.getStatus(
                    actionEffectTemplate.traits,
                    Trait.CANNOT_CRITICALLY_FAIL
                ) === true,
            drawArea: RectAreaService.new({
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                startColumn:
                    Layout.attackRollThermometerLayout.drawArea.startColumn,
                endColumn:
                    Layout.attackRollThermometerLayout.drawArea.endColumn,
                top: Layout.attackRollThermometerLayout.drawArea.top,
                height: Layout.attackRollThermometerLayout.drawArea.height,
            }),
        })

        AttackRollThermometerService.beginRollingAnimation({
            thermometer: this.attackRollThermometer,
            rolls: [
                results.actorContext.actorRoll.rolls[0],
                results.actorContext.actorRoll.rolls[1],
            ],
            degreeOfSuccess: results.squaddieChanges[0].actorDegreeOfSuccess,
        })
    }

    private setupModifierDisplays(results: ActionEffectChange) {
        const convertAttributeTypesAndAmountsToModifierDisplayColumnData = (
            attributeModifiers: AttributeTypeAndAmount[]
        ): ModifierDisplayColumnData[] =>
            attributeModifiers
                ? attributeModifiers.map((attributeModifier) => ({
                      amount: attributeModifier.amount,
                      description: AttributeTypeService.readableName(
                          attributeModifier.type
                      ),
                  }))
                : []

        const convertRollModifiersToModifierDisplayColumnData =
            (rollModifiers: {
                [t in RollModifierType]?: number
            }): ModifierDisplayColumnData[] =>
                Object.entries(rollModifiers).map(
                    ([rollModifierType, amount]) => {
                        return {
                            amount,
                            description: RollModifierTypeService.readableName({
                                type: rollModifierType as RollModifierType,
                                abbreviate: false,
                            }),
                        }
                    }
                )

        this.modifierDisplayColumns = {
            [ModifierDisplayColumnPosition.LEFT]: undefined,
            [ModifierDisplayColumnPosition.RIGHT]: undefined,
        }

        const leftColumnRollModifierDisplayColumnData =
            Object.keys(results.actorContext.actorRoll?.rollModifiers || {})
                .length > 0
                ? convertRollModifiersToModifierDisplayColumnData(
                      results.actorContext.actorRoll?.rollModifiers
                  )
                : []

        const leftColumnAttributeModifierDisplayColumnData =
            results.actorContext.actorAttributeModifiers.length > 0
                ? convertAttributeTypesAndAmountsToModifierDisplayColumnData(
                      results.actorContext.actorAttributeModifiers
                  )
                : []

        if (
            leftColumnRollModifierDisplayColumnData.length > 0 ||
            leftColumnAttributeModifierDisplayColumnData.length > 0
        ) {
            this.modifierDisplayColumns[ModifierDisplayColumnPosition.LEFT] =
                ModifierDisplayColumnService.new({
                    modifiers: [
                        ...leftColumnRollModifierDisplayColumnData,
                        ...leftColumnAttributeModifierDisplayColumnData,
                    ],
                    position: ModifierDisplayColumnPosition.LEFT,
                    sortOrderLeastToGreatest: false,
                })
        }

        const rightColumnAttributeModifierDisplayColumnData =
            Object.values(results.actorContext.targetAttributeModifiers)
                .length > 0 &&
            Object.values(results.actorContext.targetAttributeModifiers)[0]
                .length > 0
                ? convertAttributeTypesAndAmountsToModifierDisplayColumnData(
                      results.actorContext.targetAttributeModifiers
                          ? Object.values(
                                results.actorContext.targetAttributeModifiers
                            )[0]
                          : []
                  )
                : []
        if (rightColumnAttributeModifierDisplayColumnData.length > 0) {
            this.modifierDisplayColumns[ModifierDisplayColumnPosition.RIGHT] =
                ModifierDisplayColumnService.new({
                    modifiers: rightColumnAttributeModifierDisplayColumnData,
                    position: ModifierDisplayColumnPosition.RIGHT,
                    sortOrderLeastToGreatest: false,
                })
        }
    }
}
