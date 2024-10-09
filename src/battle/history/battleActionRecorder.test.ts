import { BattleAction, BattleActionService } from "./battleAction"
import {
    BattleActionsDuringTurn,
    BattleActionsDuringTurnService,
} from "./battleActionsDuringTurn"
import {
    BattleActionRecorder,
    BattleActionRecorderService,
} from "./battleActionRecorder"
import { BattleActionQueueService } from "./battleActionQueue"

describe("battleActionRecorder", () => {
    let battleActionMovement: BattleAction
    let battleActionUseActionTemplate: BattleAction

    beforeEach(() => {
        battleActionMovement = BattleActionService.new({
            actor: { actorBattleSquaddieId: "actor" },
            action: { isMovement: true },
            effect: {
                movement: {
                    startLocation: { q: 0, r: 0 },
                    endLocation: { q: 0, r: 1 },
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
    it("can move the front of the ready to animate queue to the animated this turn list", () => {
        const battleActionRecorder: BattleActionRecorder =
            BattleActionRecorderService.new()
        BattleActionRecorderService.addReadyToAnimateBattleAction(
            battleActionRecorder,
            battleActionMovement
        )
        BattleActionRecorderService.battleActionFinishedAnimating(
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
        BattleActionRecorderService.battleActionFinishedAnimating(
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

        BattleActionRecorderService.battleActionFinishedAnimating(
            battleActionRecorder
        )
        BattleActionRecorderService.battleActionFinishedAnimating(
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
})
