import { PlayerArmy, PlayerArmyService } from "./playerArmy"
import { describe, expect, it, vi } from "vitest"
import { SquaddieBuildService } from "./squaddieBuild"

describe("Player Army", () => {
    describe("sanitization", () => {
        it("sanitizes each squaddie build", () => {
            const armyOfTwo: PlayerArmy = PlayerArmyService.new({
                squaddieBuilds: [
                    SquaddieBuildService.new({
                        squaddieTemplateId: "squaddie 1",
                    }),
                    SquaddieBuildService.new({
                        squaddieTemplateId: "squaddie 2",
                    }),
                ],
            })
            const sanitizer = vi.spyOn(SquaddieBuildService, "sanitize")

            PlayerArmyService.sanitize(armyOfTwo)

            expect(sanitizer).toBeCalledTimes(2)
        })
    })
})
