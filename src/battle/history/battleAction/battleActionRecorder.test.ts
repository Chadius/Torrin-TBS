import { BattleAction, BattleActionService } from "./battleAction"
import {
    BattleActionsDuringTurn,
    BattleActionsDuringTurnService,
} from "./battleActionsDuringTurn"
import {
    BattleActionRecorder,
    BattleActionRecorderService,
} from "./battleActionRecorder"
import {
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "./battleActionSquaddieChange"
import { beforeEach, describe, expect, it } from "vitest"

describe("battleActionRecorder", () => {
    let battleActionMovement: BattleAction
    let battleActionUseActionTemplate: BattleAction

    beforeEach(() => {
        battleActionMovement = BattleActionService.new({
            actor: { actorBattleSquaddieId: "actor" },
            action: { isMovement: true },
            effect: {
                movement: {
                    startCoordinate: { q: 0, r: 0 },
                    endCoordinate: { q: 0, r: 1 },
                },
            },
        })
        battleActionUseActionTemplate = BattleActionService.new({
            actor: { actorBattleSquaddieId: "actor" },
            action: { actionTemplateId: "action" },
            effect: { squaddie: [] },
        })
    })

    it("starts empty with an empty queue", () => {
        const battleActionRecorder: BattleActionRecorder =
            BattleActionRecorderService.new()
        expect(
            BattleActionRecorderService.isAnimationQueueEmpty(
                battleActionRecorder
            )
        ).toBeTruthy()
    })
    describe("Adding a movement action", () => {
        it("can add a battle action to the ready to animate queue", () => {
            const battleActionRecorder: BattleActionRecorder =
                BattleActionRecorderService.new()
            BattleActionRecorderService.addReadyToAnimateBattleAction(
                battleActionRecorder,
                battleActionMovement
            )
            expect(
                BattleActionRecorderService.isAnimationQueueEmpty(
                    battleActionRecorder
                )
            ).toBeFalsy()
            expect(
                BattleActionRecorderService.peekAtAnimationQueue(
                    battleActionRecorder
                )
            ).toEqual(battleActionMovement)
        })
    })
    it("can move the front of the ready to animate queue to the animated this turn list", () => {
        const battleActionRecorder: BattleActionRecorder =
            BattleActionRecorderService.new()
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            battleActionRecorder,
            battleActionMovement
        )
        BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
            battleActionRecorder
        )
        expect(
            BattleActionRecorderService.isAnimationQueueEmpty(
                battleActionRecorder
            )
        ).toBeTruthy()
        expect(
            BattleActionRecorderService.isAlreadyAnimatedQueueEmpty(
                battleActionRecorder
            )
        ).toBeFalsy()
        expect(
            BattleActionRecorderService.peekAtAlreadyAnimatedQueue(
                battleActionRecorder
            )
        ).toEqual(battleActionMovement)
    })
    it("can save the completed battle actions to storage", () => {
        const battleActionRecorder: BattleActionRecorder =
            BattleActionRecorderService.new()
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            battleActionRecorder,
            battleActionMovement
        )
        BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
            battleActionRecorder
        )
        BattleActionRecorderService.turnComplete(battleActionRecorder)
        expect(
            BattleActionRecorderService.isAnimationQueueEmpty(
                battleActionRecorder
            )
        ).toBeTruthy()
        expect(
            BattleActionRecorderService.isAlreadyAnimatedQueueEmpty(
                battleActionRecorder
            )
        ).toBeTruthy()

        const previousBattleActionTurns: BattleActionsDuringTurn[] =
            BattleActionRecorderService.getPreviousBattleActionTurns(
                battleActionRecorder
            )
        expect(previousBattleActionTurns).toHaveLength(1)
        expect(
            BattleActionsDuringTurnService.isEmpty(previousBattleActionTurns[0])
        ).toBeFalsy()
        const battleActions: BattleAction[] =
            BattleActionsDuringTurnService.getAll(previousBattleActionTurns[0])
        expect(battleActions).toHaveLength(1)
        expect(battleActions[0]).toEqual(battleActionMovement)
    })
    it("can remove the already animated battle action without adding it to the record", () => {
        const battleActionRecorder: BattleActionRecorder =
            BattleActionRecorderService.new()
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            battleActionRecorder,
            battleActionMovement
        )
        BattleActionRecorderService.dequeueBattleActionFromReadyToAnimateQueue(
            battleActionRecorder
        )

        expect(
            BattleActionRecorderService.isAnimationQueueEmpty(
                battleActionRecorder
            )
        ).toBeTruthy()
        expect(
            BattleActionRecorderService.isAlreadyAnimatedQueueEmpty(
                battleActionRecorder
            )
        ).toBeTruthy()
    })
    it("knows the last animated action", () => {
        const battleActionRecorder: BattleActionRecorder =
            BattleActionRecorderService.new()
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            battleActionRecorder,
            battleActionMovement
        )
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            battleActionRecorder,
            battleActionUseActionTemplate
        )

        expect(
            BattleActionRecorderService.mostRecentAnimatedActionThisTurn(
                battleActionRecorder
            )
        ).toBeUndefined()

        BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
            battleActionRecorder
        )
        BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
            battleActionRecorder
        )
        expect(
            BattleActionRecorderService.mostRecentAnimatedActionThisTurn(
                battleActionRecorder
            )
        ).toEqual(battleActionUseActionTemplate)

        BattleActionRecorderService.turnComplete(battleActionRecorder)
        expect(
            BattleActionRecorderService.mostRecentAnimatedActionThisTurn(
                battleActionRecorder
            )
        ).toBeUndefined()

        expect(
            BattleActionRecorderService.mostRecentCompletedTurn(
                battleActionRecorder
            )
        ).toEqual(
            BattleActionsDuringTurnService.new([
                battleActionMovement,
                battleActionUseActionTemplate,
            ])
        )
    })
    it("can be cloned to a separate object", () => {
        const actionAnimatingBattleAction: BattleAction =
            BattleActionService.new({
                actor: { actorBattleSquaddieId: "actor0" },
                action: { actionTemplateId: "charge" },
                effect: {
                    movement: {
                        startCoordinate: { q: 0, r: 2 },
                        endCoordinate: { q: 2, r: 4 },
                    },
                },
            })

        const readyToAnimateBattleAction: BattleAction =
            BattleActionService.new({
                actor: { actorBattleSquaddieId: "actor0" },
                action: { actionTemplateId: "charge" },
                effect: {
                    squaddie: [
                        BattleActionSquaddieChangeService.new({
                            battleSquaddieId: "target",
                            damageExplanation: DamageExplanationService.new({
                                net: 1,
                                raw: 1,
                                absorbed: 0,
                            }),
                        }),
                    ],
                },
            })

        const endTurnBattleAction: BattleAction = BattleActionService.new({
            actor: { actorBattleSquaddieId: "actor0" },
            action: { isEndTurn: true },
            effect: { endTurn: true },
        })

        const original = BattleActionRecorderService.new()
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            original,
            endTurnBattleAction
        )
        BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
            original
        )
        BattleActionRecorderService.turnComplete(original)

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            original,
            actionAnimatingBattleAction
        )
        BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
            original
        )
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            original,
            readyToAnimateBattleAction
        )

        expect(
            BattleActionsDuringTurnService.getAll(
                original.actionsAlreadyAnimatedThisTurn
            )
        ).toEqual([actionAnimatingBattleAction])
        expect(
            BattleActionRecorderService.getPreviousBattleActionTurns(original)
        ).toEqual([BattleActionsDuringTurnService.new([endTurnBattleAction])])

        expect(
            BattleActionRecorderService.peekAtAnimationQueue(original)
        ).toEqual(readyToAnimateBattleAction)

        const clone: BattleActionRecorder =
            BattleActionRecorderService.clone(original)

        expect(clone).toEqual(original)

        original.actionsAlreadyAnimatedThisTurn = undefined
        original.readyToAnimateQueue = undefined
        original.previousTurns = undefined

        expect(
            BattleActionsDuringTurnService.getAll(
                clone.actionsAlreadyAnimatedThisTurn
            )
        ).toEqual([actionAnimatingBattleAction])
        expect(
            BattleActionRecorderService.getPreviousBattleActionTurns(clone)
        ).toEqual([BattleActionsDuringTurnService.new([endTurnBattleAction])])

        expect(BattleActionRecorderService.peekAtAnimationQueue(clone)).toEqual(
            readyToAnimateBattleAction
        )
    })
})
