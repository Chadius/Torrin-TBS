import {CampaignFileFormat} from "../../campaign/campaignFileFormat";

export const TestCampaignData = () => {
    const testCampaignFile: CampaignFileFormat = {
        "id": "coolCampaign",
        "missionIds": ["0000"],
        "resources": {
            "missionMapMovementIconResourceKeys": {
                "MOVE_1_ACTION": "map icon move 1 action",
                "MOVE_2_ACTIONS": "map icon move 2 actions",
                "MOVE_3_ACTIONS": "map icon move 3 actions"
            },
            "missionMapAttackIconResourceKeys": {
                "ATTACK_1_ACTION": "map icon attack 1 action"
            },
            "missionAttributeIconResourceKeys": {
                "ARMOR_CLASS": "armor class icon"
            },
            "actionEffectSquaddieTemplateButtonIcons": {
                "UNKNOWN": "decision-button-unknown"
            },
            "mapTiles": {
                "resourceKeys": [
                    "map-tiles-basic-floor",
                    "map-tiles-basic-pit",
                    "map-tiles-basic-wall",
                    "map-tiles-basic-water",
                    "map-tiles-basic-sand"
                ],
                "defaultByTerrainCost": {
                    "singleMovement": "map-tiles-basic-floor",
                    "doubleMovement": "map-tiles-basic-sand",
                    "pit": "map-tiles-basic-water",
                    "wall": "map-tiles-basic-wall"
                }
            }
        }
    }

    return {
        campaignFile: testCampaignFile,
    }
}
