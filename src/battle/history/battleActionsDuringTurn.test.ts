import { BattleAction, BattleActionService } from "./battleAction"
import {
    BattleActionsDuringTurn,
    BattleActionsDuringTurnService,
} from "./battleActionsDuringTurn"

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
                    startLocation: { q: 0, r: 0 },
                    endLocation: { q: 0, r: 1 },
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
})
