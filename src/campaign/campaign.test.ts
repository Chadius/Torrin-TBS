import {Campaign, CampaignService} from "./campaign";

describe('Campaign', () => {
    it('starts on the first mission id', () => {
        const campaign: Campaign = CampaignService.new({
            missionIds: ["0", "1", "2", "3"]
        });

        expect(campaign.missionIds).toEqual(["0", "1", "2", "3"]);
        expect(CampaignService.getNextMissionId(campaign)).toEqual("0");
    });
});
