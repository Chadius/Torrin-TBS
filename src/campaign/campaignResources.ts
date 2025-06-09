import { HexGridMovementCost } from "../hexMap/hexGridMovementCost"
import { AttributeType } from "../squaddie/attribute/attributeType"

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
    endTurnIconResourceKey: string
}

export const CampaignResourcesService = {
    default: (): CampaignResources => {
        return {
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
            endTurnIconResourceKey: "decision-button-end",
        }
    },
    clone: (original: CampaignResources): CampaignResources => ({
        endTurnIconResourceKey: original.endTurnIconResourceKey,
        missionAttributeIconResourceKeys: {
            ...original.missionAttributeIconResourceKeys,
        },
        actionEffectSquaddieTemplateButtonIcons: {
            ...original.actionEffectSquaddieTemplateButtonIcons,
        },
        mapTiles: {
            resourceKeys: [...original.mapTiles.resourceKeys],
            defaultByTerrainCost: { ...original.mapTiles.defaultByTerrainCost },
        },
        attributeComparisons: { ...original.attributeComparisons },
        attributeIcons: { ...original.attributeIcons },
    }),
}
