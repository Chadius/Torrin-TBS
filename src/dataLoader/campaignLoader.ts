import {LoadFileIntoFormat} from "./dataLoader";
import {CampaignFileFormat} from "../campaign/campaignFileFormat";
import {isValidValue} from "../utils/validityCheck";
import {CampaignResources, CampaignResourcesService} from "../campaign/campaignResources";

export interface CampaignLoaderContext {
    resourcesPendingLoading: string[];
    campaignIdToLoad: string;
}

export const CampaignLoaderService = {
    new: ({
              id,
              missionIds,
              resources
          }: {
        id: string,
        missionIds?: string[],
        resources?: CampaignResources,
    }): CampaignFileFormat => {
        const campaignFile: CampaignFileFormat = {
            id,
            missionIds,
            resources,
        }
        return sanitize(campaignFile);
    },
    loadCampaignFromFile: async (campaignId: string): Promise<CampaignFileFormat> => {
        const filename = `assets/campaign/${campaignId}/campaign.json`;
        try {
            return await LoadFileIntoFormat<CampaignFileFormat>(filename);
        } catch (e) {
            console.error(`Error while loading campaign file: ${filename}`);
            console.error(e);
            return undefined;
        }
    },
    sanitize: (campaign: CampaignFileFormat): CampaignFileFormat => {
        return sanitize(campaign);
    },
    newLoaderContext: (): CampaignLoaderContext => {
        return {
            resourcesPendingLoading: [],
            campaignIdToLoad: undefined,
        };
    }
}

const sanitize = (data: CampaignFileFormat): CampaignFileFormat => {
    if (!isValidValue(data.id)) {
        throw new Error("CampaignLoader cannot sanitize");
    }

    if (!isValidValue(data.missionIds)) {
        data.missionIds = [];
    }

    if (!isValidValue(data.resources)) {
        data.resources = CampaignResourcesService.default({});
    }

    return data;
}
