import { CampaignLoaderService } from "../../../dataLoader/campaignLoader"

export const LoadCampaignService = {
    loadCampaign: async (campaignId: string) =>
        await CampaignLoaderService.loadCampaignFromFile(campaignId),
}
