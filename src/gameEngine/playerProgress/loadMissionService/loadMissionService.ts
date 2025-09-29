import { MissionFileFormat } from "../../../dataLoader/missionLoader"
import { LoadFileIntoFormat } from "../../../dataLoader/dataLoader"

export const LoadMissionService = {
    loadMission: async (
        campaignId: string,
        missionId: string
    ): Promise<MissionFileFormat> => {
        try {
            return await LoadFileIntoFormat<MissionFileFormat>(
                `assets/campaign/${campaignId}/missions/${missionId}.json`
            )
        } catch (e) {
            console.error("Error while loading mission from file")
            console.error(e)
            throw e
        }
    },
}
