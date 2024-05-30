import { CampaignResources } from "./campaignResources"

export interface CampaignFileFormat {
    id: string
    missionIds: string[]
    resources: CampaignResources
}
