import { BattleAction, BattleActionService } from "./battleAction"

describe("BattleAction", () => {
    describe("Creation and Sanitization", () => {
        it("Can create a BattleAction", () => {
            const newBattleAction: BattleAction = BattleActionService.new({
                actor: { battleSquaddieId: "battleSquaddieId" },
                action: {
                    id: "longsword",
                },
                effect: {
                    endTurn: true,
                },
            })

            expect(newBattleAction.actor.battleSquaddieId).toEqual(
                "battleSquaddieId"
            )
            expect(newBattleAction.action.id).toEqual("longsword")
            expect(newBattleAction.effect.endTurn).toBeTruthy()
            expect(newBattleAction.animation.completed).toBeFalsy()
            expect(
                BattleActionService.isAnimationComplete(newBattleAction)
            ).toEqual(false)
        })

        it("Must include at least one effect", () => {
            const createBattleActionWithoutEffect = () => {
                BattleActionService.new({
                    actor: { battleSquaddieId: "battleSquaddieId" },
                    action: {},
                    effect: {},
                })
            }

            expect(() => {
                createBattleActionWithoutEffect()
            }).toThrow("cannot sanitize")
        })
    })
})
