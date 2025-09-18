import {
    CampaignResources,
    CampaignResourcesService,
} from "./campaignResources"

export interface Campaign {
    id: string | undefined
    resources: CampaignResources
    missionIds: string[]
}

export const CampaignService = {
    new: ({
        id,
        resources,
        missionIds,
    }: {
        id?: string
        resources?: CampaignResources
        missionIds?: string[]
    }): Campaign => {
        return {
            id: id ?? undefined,
            resources: resources ?? CampaignResourcesService.default(),
            missionIds: missionIds ?? ["0000"],
        }
    },
    default: (): Campaign => {
        return {
            id: "default",
            resources: CampaignResourcesService.default(),
            missionIds: ["0000"],
        }
    },
    getNextMissionId: (campaign: Campaign): string => {
        return campaign.missionIds[0]
    },
}
