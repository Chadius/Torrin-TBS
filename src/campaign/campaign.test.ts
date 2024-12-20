import { Campaign, CampaignService } from "./campaign"
import { describe, expect, it } from "vitest"

describe("Campaign", () => {
    it("starts on the first mission id", () => {
        const campaign: Campaign = CampaignService.new({
            id: "wow",
            missionIds: ["0", "1", "2", "3"],
        })

        expect(campaign.id).toEqual("wow")
        expect(campaign.missionIds).toEqual(["0", "1", "2", "3"])
        expect(CampaignService.getNextMissionId(campaign)).toEqual("0")
    })
})
