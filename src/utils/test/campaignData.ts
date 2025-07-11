import { CampaignFileFormat } from "../../campaign/campaignFileFormat"

export const TestCampaignData = () => {
    const testCampaignFile: CampaignFileFormat = {
        id: "coolCampaign",
        missionIds: ["0000"],
        resources: {
            actionEffectSquaddieTemplateButtonIcons: {
                UNKNOWN: "decision-button-unknown",
            },
            mapTiles: {
                resourceKeys: [
                    "map-tiles-basic-floor",
                    "map-tiles-basic-pit",
                    "map-tiles-basic-wall",
                    "map-tiles-basic-water",
                    "map-tiles-basic-sand",
                ],
                defaultByTerrainCost: {
                    singleMovement: "map-tiles-basic-floor",
                    doubleMovement: "map-tiles-basic-sand",
                    pit: "map-tiles-basic-water",
                    wall: "map-tiles-basic-wall",
                },
            },
            endTurnIconResourceKey: "end-turn",
        },
    }

    return {
        campaignFile: testCampaignFile,
    }
}
