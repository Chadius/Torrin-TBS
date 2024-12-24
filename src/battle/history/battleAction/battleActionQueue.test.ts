import { BattleAction, BattleActionService } from "./battleAction"
import { RollResultService } from "../../calculator/actionCalculator/rollResult"
import {
    BattleActionQueue,
    BattleActionQueueService,
} from "./battleActionQueue"
import { BattleActionActionContextService } from "./battleActionActionContext"
import {
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "./battleActionSquaddieChange"
import { beforeEach, describe, expect, it } from "vitest"

describe("BattleActionQueue", () => {
    let queue: BattleActionQueue
    let moveAction: BattleAction
    let endTurnAction: BattleAction

    beforeEach(() => {
        queue = BattleActionQueueService.new()
        moveAction = BattleActionService.new({
            actor: {
                actorBattleSquaddieId: "battleSquaddieId",
                actorContext: BattleActionActionContextService.new({
                    actingSquaddieModifiers: [],
                    actingSquaddieRoll: RollResultService.new({
                        rolls: [2, 6],
                        occurred: true,
                    }),
                }),
            },
            action: { isMovement: true },
            effect: {
                movement: {
                    startCoordinate: { q: 0, r: 0 },
                    endCoordinate: { q: 1, r: 1 },
                },
            },
        })
        endTurnAction = BattleActionService.new({
            actor: { actorBattleSquaddieId: "battleSquaddieId" },
            action: { isEndTurn: true },
            effect: { endTurn: true },
        })
    })
    it("Starts empty", () => {
        expect(BattleActionQueueService.isEmpty(queue)).toBeTruthy()
    })
    it("Can add to the queue and knows it is not empty", () => {
        BattleActionQueueService.add(queue, moveAction)
        expect(BattleActionQueueService.isEmpty(queue)).toBeFalsy()
    })
    it("Can peek the queue to see an action without removing objects", () => {
        BattleActionQueueService.add(queue, moveAction)
        expect(BattleActionQueueService.peek(queue)).toEqual(moveAction)
        expect(BattleActionQueueService.isEmpty(queue)).toBeFalsy()
    })
    it("Can peek the queue to see the first added action", () => {
        BattleActionQueueService.add(queue, moveAction)
        BattleActionQueueService.add(queue, endTurnAction)
        expect(BattleActionQueueService.peek(queue)).toEqual(moveAction)
    })
    it("Can dequeue the queue to see the first added action", () => {
        BattleActionQueueService.add(queue, moveAction)
        expect(BattleActionQueueService.dequeue(queue)).toEqual(moveAction)
        expect(BattleActionQueueService.isEmpty(queue)).toBeTruthy()
    })
    it("Can indicate the size of the actions queue", () => {
        BattleActionQueueService.add(queue, moveAction)
        BattleActionQueueService.add(queue, endTurnAction)
        expect(BattleActionQueueService.length(queue)).toEqual(2)
    })
    it("Can be cleared", () => {
        BattleActionQueueService.add(queue, moveAction)
        BattleActionQueueService.add(queue, endTurnAction)
        BattleActionQueueService.deleteAll(queue)
        expect(BattleActionQueueService.isEmpty(queue)).toBeTruthy()
    })
    it("can be cloned to a separate object", () => {
        const battleAction0: BattleAction = BattleActionService.new({
            actor: { actorBattleSquaddieId: "actor0" },
            action: { actionTemplateId: "charge" },
            effect: {
                movement: {
                    startCoordinate: { q: 0, r: 2 },
                    endCoordinate: { q: 2, r: 4 },
                },
            },
        })

        const battleAction1: BattleAction = BattleActionService.new({
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

        const original = BattleActionQueueService.new()

        BattleActionQueueService.add(original, battleAction0)
        BattleActionQueueService.add(original, battleAction1)

        const clone: BattleActionQueue =
            BattleActionQueueService.clone(original)

        expect(clone).toEqual(original)

        original.actions = undefined

        expect(clone.actions).toHaveLength(2)
        expect(clone.actions[0]).toEqual(battleAction0)
        expect(clone.actions[1]).toEqual(battleAction1)
    })
})
