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
            }
        }
    };

    return {
        campaignFile: testCampaignFile,
    }
}
