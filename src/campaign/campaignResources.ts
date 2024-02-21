export enum MissionMapMovementIconKey {
    MOVE_1_ACTION = "MOVE_1_ACTION",
    MOVE_2_ACTIONS = "MOVE_2_ACTIONS",
    MOVE_3_ACTIONS = "MOVE_3_ACTIONS",
}

export enum MissionMapAttackIconKey {
    ATTACK_1_ACTION = "ATTACK_1_ACTION",
}

export enum MissionAttributeIconKey {
    ARMOR_CLASS = "ARMOR_CLASS",
}

export enum ActionEffectSquaddieTemplateButtonIconKey {
    UNKNOWN = "UNKNOWN",
}

export interface CampaignResources {
    missionMapMovementIconResourceKeys: { [movementIcon in MissionMapMovementIconKey]: string }
    missionMapAttackIconResourceKeys: { [attackIcon in MissionMapAttackIconKey]: string }
    missionAttributeIconResourceKeys: { [attributeIconKey in MissionAttributeIconKey]: string }
    actionEffectSquaddieTemplateButtonIcons: { [iconKey in ActionEffectSquaddieTemplateButtonIconKey]: string }
}

export const CampaignResourcesService = {
    new: ({}: {}): CampaignResources => {
        return {
            missionMapMovementIconResourceKeys: {
                [MissionMapMovementIconKey.MOVE_1_ACTION]: "map icon move 1 action",
                [MissionMapMovementIconKey.MOVE_2_ACTIONS]: "map icon move 2 actions",
                [MissionMapMovementIconKey.MOVE_3_ACTIONS]: "map icon move 3 actions",
            },
            missionMapAttackIconResourceKeys: {
                [MissionMapAttackIconKey.ATTACK_1_ACTION]: "map icon attack 1 action"
            },
            missionAttributeIconResourceKeys: {
                [MissionAttributeIconKey.ARMOR_CLASS]: "armor class icon",
            },
            actionEffectSquaddieTemplateButtonIcons: {
                [ActionEffectSquaddieTemplateButtonIconKey.UNKNOWN]: "decision-button-unknown"
            }
        }
    },
    default: ({}: {}): CampaignResources => {
        return {
            missionMapMovementIconResourceKeys: {
                [MissionMapMovementIconKey.MOVE_1_ACTION]: "map icon move 1 action",
                [MissionMapMovementIconKey.MOVE_2_ACTIONS]: "map icon move 2 actions",
                [MissionMapMovementIconKey.MOVE_3_ACTIONS]: "map icon move 3 actions",
            },
            missionMapAttackIconResourceKeys: {
                [MissionMapAttackIconKey.ATTACK_1_ACTION]: "map icon attack 1 action"
            },
            missionAttributeIconResourceKeys: {
                [MissionAttributeIconKey.ARMOR_CLASS]: "armor class icon",
            },
            actionEffectSquaddieTemplateButtonIcons: {
                [ActionEffectSquaddieTemplateButtonIconKey.UNKNOWN]: "decision-button-unknown"
            }
        }
    },
}
