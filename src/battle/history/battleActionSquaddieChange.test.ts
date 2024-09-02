import { DegreeOfSuccess } from "../calculator/actionCalculator/degreeOfSuccess"
import {
    BattleActionSquaddieChange,
    BattleActionSquaddieChangeService,
} from "./battleActionSquaddieChange"

describe("BattleActionSquaddieChange", () => {
    describe("knows when the result hinders the squaddie", () => {
        it("knows when the target is not hindered", () => {
            const changes: BattleActionSquaddieChange =
                BattleActionSquaddieChangeService.new({
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    damageTaken: 0,
                    battleSquaddieId: "target",
                })

            expect(
                BattleActionSquaddieChangeService.isSquaddieHindered(changes)
            ).toBeFalsy()
        })
        it("knows when the target took damage", () => {
            const changes: BattleActionSquaddieChange =
                BattleActionSquaddieChangeService.new({
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    damageTaken: 1,
                    battleSquaddieId: "target",
                })

            expect(
                BattleActionSquaddieChangeService.isSquaddieHindered(changes)
            ).toBeTruthy()
        })
    })
    describe("knows when the result helps the squaddie", () => {
        it("knows when the target is not helped", () => {
            const changes: BattleActionSquaddieChange =
                BattleActionSquaddieChangeService.new({
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    damageTaken: 0,
                    battleSquaddieId: "target",
                })

            expect(
                BattleActionSquaddieChangeService.isSquaddieHelped(changes)
            ).toBeFalsy()
        })
        it("knows when the target received healing", () => {
            const changes: BattleActionSquaddieChange =
                BattleActionSquaddieChangeService.new({
                    actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS,
                    healingReceived: 1,
                    battleSquaddieId: "target",
                })

            expect(
                BattleActionSquaddieChangeService.isSquaddieHelped(changes)
            ).toBeTruthy()
        })
    })
})
