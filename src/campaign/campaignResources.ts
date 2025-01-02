import { HexGridMovementCost } from "../hexMap/hexGridMovementCost"
import { AttributeType } from "../squaddie/attribute/attributeType"

export enum MissionMapMovementIconKey {
    MOVE_1_ACTION_CONTROLLABLE_SQUADDIE = "MOVE_1_ACTION_CONTROLLABLE_SQUADDIE",
    MOVE_2_ACTIONS_CONTROLLABLE_SQUADDIE = "MOVE_2_ACTIONS_CONTROLLABLE_SQUADDIE",
    MOVE_3_ACTIONS_CONTROLLABLE_SQUADDIE = "MOVE_3_ACTIONS_CONTROLLABLE_SQUADDIE",
    MOVE_1_ACTION_UNCONTROLLABLE_SQUADDIE = "MOVE_1_ACTION_UNCONTROLLABLE_SQUADDIE",
    MOVE_2_ACTIONS_UNCONTROLLABLE_SQUADDIE = "MOVE_2_ACTIONS_UNCONTROLLABLE_SQUADDIE",
    MOVE_3_ACTIONS_UNCONTROLLABLE_SQUADDIE = "MOVE_3_ACTIONS_UNCONTROLLABLE_SQUADDIE",
}

export enum MissionMapAttackIconKey {
    ATTACK_1_ACTION = "ATTACK_1_ACTION",
}

export enum MissionAttributeIconKey {
    ARMOR_CLASS = "ARMOR_CLASS",
}

export enum ActionEffectTemplateButtonIconKey {
    UNKNOWN = "UNKNOWN",
}

export interface MapTilesResources {
    resourceKeys: string[]
    defaultByTerrainCost: { [cost in HexGridMovementCost]: string }
}

export interface CampaignResources {
    missionMapMovementIconResourceKeys: {
        [movementIcon in MissionMapMovementIconKey]: string
    }
    missionMapAttackIconResourceKeys: {
        [attackIcon in MissionMapAttackIconKey]: string
    }
    missionAttributeIconResourceKeys: {
        [attributeIconKey in MissionAttributeIconKey]: string
    }
    actionEffectSquaddieTemplateButtonIcons: {
        [iconKey in ActionEffectTemplateButtonIconKey]: string
    }
    mapTiles: MapTilesResources
    attributeComparisons: {
        up: string
        down: string
    }
    attributeIcons: {
        [t in AttributeType]?: string
    }
}

export const CampaignResourcesService = {
    default: (): CampaignResources => {
        return {
            missionMapMovementIconResourceKeys: {
                [MissionMapMovementIconKey.MOVE_1_ACTION_CONTROLLABLE_SQUADDIE]:
                    "map icon move 1 action",
                [MissionMapMovementIconKey.MOVE_2_ACTIONS_CONTROLLABLE_SQUADDIE]:
                    "map icon move 2 actions",
                [MissionMapMovementIconKey.MOVE_3_ACTIONS_CONTROLLABLE_SQUADDIE]:
                    "map icon move 3 actions",
                [MissionMapMovementIconKey.MOVE_1_ACTION_UNCONTROLLABLE_SQUADDIE]:
                    "map icon move 1 action small",
                [MissionMapMovementIconKey.MOVE_2_ACTIONS_UNCONTROLLABLE_SQUADDIE]:
                    "map icon move 2 actions small",
                [MissionMapMovementIconKey.MOVE_3_ACTIONS_UNCONTROLLABLE_SQUADDIE]:
                    "map icon move 3 actions small",
            },
            missionMapAttackIconResourceKeys: {
                [MissionMapAttackIconKey.ATTACK_1_ACTION]:
                    "map icon attack 1 action",
            },
            missionAttributeIconResourceKeys: {
                [MissionAttributeIconKey.ARMOR_CLASS]: "armor class icon",
            },
            actionEffectSquaddieTemplateButtonIcons: {
                [ActionEffectTemplateButtonIconKey.UNKNOWN]:
                    "decision-button-unknown",
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
                    [HexGridMovementCost.singleMovement]:
                        "map-tiles-basic-floor",
                    [HexGridMovementCost.doubleMovement]:
                        "map-tiles-basic-sand",
                    [HexGridMovementCost.pit]: "map-tiles-basic-water",
                    [HexGridMovementCost.wall]: "map-tiles-basic-wall",
                },
            },
            attributeIcons: {
                [AttributeType.ARMOR]: "armor",
            },
            attributeComparisons: {
                up: "attribute-up",
                down: "attribute-down",
            },
        }
    },
}
