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

        original.battleActions = undefined

        const cloneActions = BattleActionsDuringTurnService.getAll(clone)
        expect(cloneActions).toHaveLength(2)
        expect(cloneActions[0]).toEqual(battleAction0)
        expect(cloneActions[1]).toEqual(battleAction1)
    })
})
