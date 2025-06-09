import { CampaignFileFormat } from "../../campaign/campaignFileFormat"
import { AttributeType } from "../../squaddie/attribute/attributeType"

export const TestCampaignData = () => {
    const testCampaignFile: CampaignFileFormat = {
        id: "coolCampaign",
        missionIds: ["0000"],
        resources: {
            missionAttributeIconResourceKeys: {
                ARMOR_CLASS: "armor class icon",
            },
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
            attributeIcons: {
                [AttributeType.ARMOR]: "armor",
            },
            attributeComparisons: {
                up: "attribute-up",
                down: "attribute-down",
            },
            endTurnIconResourceKey: "end-turn",
        },
    }

    return {
        campaignFile: testCampaignFile,
    }
}
