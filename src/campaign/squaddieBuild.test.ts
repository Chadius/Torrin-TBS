import { describe, expect, it } from "vitest"
import { SquaddieBuild, SquaddieBuildService } from "./squaddieBuild"

describe("squaddie Build", () => {
    it("knows the base squaddie template", () => {
        const squaddieBuild: SquaddieBuild = SquaddieBuildService.new({
            squaddieTemplateId: "templateId",
        })

        expect(squaddieBuild.squaddieTemplateId).toEqual("templateId")
    })
})
