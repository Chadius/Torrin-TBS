import {CampaignResources, CampaignResourcesService} from "./campaignResources";
import {isValidValue} from "../utils/validityCheck";

export interface Campaign {
    id: string;
    resources: CampaignResources;
    missionIds: string[];
}

export const CampaignService = {
    new: ({
              missionIds
    }: {
        missionIds?: string[],
    }): Campaign => {
        return {
            id: "default",
            resources: CampaignResourcesService.default({}),
            missionIds: isValidValue(missionIds)
                ? missionIds
                : ["0000"],
        }
    },
    default: ({}: {}): Campaign => {
        return {
            id: "default",
            resources: CampaignResourcesService.default({}),
            missionIds: ["0000"],
        }
    },
    getNextMissionId: (campaign: Campaign): string => {
        return campaign.missionIds[0];
    },
}
