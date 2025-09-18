import { BattleAction, BattleActionService } from "./battleAction"
import {
    BattleActionsDuringTurn,
    BattleActionsDuringTurnService,
} from "./battleActionsDuringTurn"
import {
    BattleActionSquaddieChangeService,
    DamageExplanationService,
} from "./battleActionSquaddieChange"
import { beforeEach, describe, expect, it } from "vitest"

describe("Battle Actions During Turn", () => {
    let battleActionUseActionTemplate: BattleAction
    let battleActionMovement: BattleAction

    beforeEach(() => {
        battleActionUseActionTemplate = BattleActionService.new({
            actor: { actorBattleSquaddieId: "actor" },
            action: { actionTemplateId: "action" },
            effect: { squaddie: [] },
        })
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
    })

    it("knows it is empty when created", () => {
        const battleActionsDuringTurn: BattleActionsDuringTurn =
            BattleActionsDuringTurnService.new()
        expect(
            BattleActionsDuringTurnService.isEmpty(battleActionsDuringTurn)
        ).toBeTruthy()
    })
    it("can add and retrieve all Battle Actions saved", () => {
        const battleActionsDuringTurn: BattleActionsDuringTurn =
            BattleActionsDuringTurnService.new()
        BattleActionsDuringTurnService.add(
            battleActionsDuringTurn,
            battleActionUseActionTemplate
        )
        BattleActionsDuringTurnService.add(
            battleActionsDuringTurn,
            battleActionMovement
        )
        expect(
            BattleActionsDuringTurnService.isEmpty(battleActionsDuringTurn)
        ).toBeFalsy()

        const battleActions: BattleAction[] =
            BattleActionsDuringTurnService.getAll(battleActionsDuringTurn)
        expect(battleActions).toHaveLength(2)
        expect(battleActions[0]).toEqual(battleActionUseActionTemplate)
        expect(battleActions[1]).toEqual(battleActionMovement)
    })
    it("can be initialized with multiple BattleActions", () => {
        const battleActionsDuringTurn: BattleActionsDuringTurn =
            BattleActionsDuringTurnService.new([
                battleActionMovement,
                battleActionUseActionTemplate,
            ])
        expect(
            BattleActionsDuringTurnService.isEmpty(battleActionsDuringTurn)
        ).toBeFalsy()
        const battleActions: BattleAction[] =
            BattleActionsDuringTurnService.getAll(battleActionsDuringTurn)
        expect(battleActions).toHaveLength(2)
        expect(battleActions[0]).toEqual(battleActionMovement)
        expect(battleActions[1]).toEqual(battleActionUseActionTemplate)
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

        const original = BattleActionsDuringTurnService.new([
            battleAction0,
            battleAction1,
        ])

        const clone: BattleActionsDuringTurn =
            BattleActionsDuringTurnService.clone(original)

        expect(clone).toEqual(original)

        //@ts-ignore Setting the field to force a change in the original, so I know the clone is a deep copy
        original.battleActions = undefined

        const cloneActions = BattleActionsDuringTurnService.getAll(clone)
        expect(cloneActions).toHaveLength(2)
        expect(cloneActions[0]).toEqual(battleAction0)
        expect(cloneActions[1]).toEqual(battleAction1)
    })
    describe("consolidate movement actions", () => {
        let battleActionsDuringTurn: BattleActionsDuringTurn

        beforeEach(() => {
            battleActionsDuringTurn = BattleActionsDuringTurnService.new()
        })

        it("has no effect on an undefined object", () => {
            //@ts-ignore Setting the field, so I know it doesn't throw an exception
            const nothing: BattleActionsDuringTurn = undefined
            BattleActionsDuringTurnService.removeUndoableMovementActions(
                nothing
            )
            expect(nothing).toBeUndefined()
        })
        it("has no effect on an empty queue", () => {
            expect(
                BattleActionsDuringTurnService.isEmpty(battleActionsDuringTurn)
            ).toBe(true)
            BattleActionsDuringTurnService.removeUndoableMovementActions(
                battleActionsDuringTurn
            )
            expect(
                BattleActionsDuringTurnService.getAll(battleActionsDuringTurn)
                    .length
            ).toBe(0)
        })
        it("will remove multiple movement actions that were added first", () => {
            BattleActionsDuringTurnService.add(
                battleActionsDuringTurn,
                battleActionMovement
            )
            BattleActionsDuringTurnService.add(
                battleActionsDuringTurn,
                battleActionMovement
            )
            BattleActionsDuringTurnService.add(
                battleActionsDuringTurn,
                battleActionMovement
            )
            expect(
                BattleActionsDuringTurnService.getAll(battleActionsDuringTurn)
                    .length
            ).toBe(3)
            BattleActionsDuringTurnService.removeUndoableMovementActions(
                battleActionsDuringTurn
            )
            expect(
                BattleActionsDuringTurnService.getAll(battleActionsDuringTurn)
                    .length
            ).toBe(0)
        })
        it("will remove movement actions from the back of the queue until it sees a non movement action", () => {
            BattleActionsDuringTurnService.add(
                battleActionsDuringTurn,
                battleActionMovement
            )
            BattleActionsDuringTurnService.add(
                battleActionsDuringTurn,
                battleActionUseActionTemplate
            )
            BattleActionsDuringTurnService.add(
                battleActionsDuringTurn,
                battleActionMovement
            )
            expect(
                BattleActionsDuringTurnService.getAll(battleActionsDuringTurn)
                    .length
            ).toBe(3)
            BattleActionsDuringTurnService.removeUndoableMovementActions(
                battleActionsDuringTurn
            )
            expect(
                BattleActionsDuringTurnService.getAll(battleActionsDuringTurn)
                    .length
            ).toBe(2)
            expect(
                BattleActionsDuringTurnService.getAll(
                    battleActionsDuringTurn
                )[0]
            ).toBe(battleActionMovement)
            expect(
                BattleActionsDuringTurnService.getAll(
                    battleActionsDuringTurn
                )[1]
            ).toBe(battleActionUseActionTemplate)
        })
        it("will make no changes if the most recent action is not a movement", () => {
            BattleActionsDuringTurnService.add(
                battleActionsDuringTurn,
                battleActionMovement
            )
            BattleActionsDuringTurnService.add(
                battleActionsDuringTurn,
                battleActionMovement
            )
            BattleActionsDuringTurnService.add(
                battleActionsDuringTurn,
                battleActionUseActionTemplate
            )
            expect(
                BattleActionsDuringTurnService.getAll(battleActionsDuringTurn)
                    .length
            ).toBe(3)
            BattleActionsDuringTurnService.removeUndoableMovementActions(
                battleActionsDuringTurn
            )
            expect(
                BattleActionsDuringTurnService.getAll(battleActionsDuringTurn)
                    .length
            ).toBe(3)
            expect(
                BattleActionsDuringTurnService.getAll(
                    battleActionsDuringTurn
                )[2]
            ).toBe(battleActionUseActionTemplate)
        })
    })
})
