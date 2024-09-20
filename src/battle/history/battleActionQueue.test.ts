import {
    BattleAction,
    BattleActionActionContextService,
    BattleActionService,
} from "./battleAction"
import { RollResultService } from "../calculator/actionCalculator/rollResult"
import {
    BattleActionQueue,
    BattleActionQueueService,
} from "./battleActionQueue"

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
                    startLocation: { q: 0, r: 0 },
                    endLocation: { q: 1, r: 1 },
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
    it("Can peek the queue to see the first added action", () => {
        BattleActionQueueService.add(queue, moveAction)
        expect(BattleActionQueueService.peek(queue)).toEqual(moveAction)
        expect(BattleActionQueueService.isEmpty(queue)).toBeFalsy()
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
})
