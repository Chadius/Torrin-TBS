import { LoadFileIntoFormat } from "./dataLoader"
import { CampaignFileFormat } from "../campaign/campaignFileFormat"
import {
    CampaignResources,
    CampaignResourcesService,
} from "../campaign/campaignResources"

export interface CampaignLoaderContext {
    campaignIdToLoad: string | undefined
}

export const CampaignLoaderService = {
    new: ({
        id,
        missionIds,
        resources,
    }: {
        id: string
        missionIds?: string[]
        resources?: CampaignResources
    }): CampaignFileFormat => {
        return sanitize({
            id,
            missionIds,
            resources,
        })
    },
    loadCampaignFromFile: async (
        campaignId: string
    ): Promise<CampaignFileFormat | undefined> => {
        const filename = `assets/campaign/${campaignId}/campaign.json`
        try {
            return await LoadFileIntoFormat<CampaignFileFormat>(filename)
        } catch (e) {
            console.error(`Error while loading campaign file: ${filename}`)
            console.error(e)
            return undefined
        }
    },
    sanitize: (campaign: CampaignFileFormat): CampaignFileFormat => {
        return sanitize(campaign)
    },
    newLoaderContext: (): CampaignLoaderContext => {
        return {
            campaignIdToLoad: undefined,
        }
    },
}

const sanitize = (data: Partial<CampaignFileFormat>): CampaignFileFormat => {
    if (data.id == undefined) {
        throw new Error("CampaignLoader cannot sanitize")
    }

    return {
        id: data.id,
        missionIds: data.missionIds ?? [],
        resources: data.resources ?? CampaignResourcesService.default(),
    }
}
