import {
    HexGridMovementCost,
    THexGridMovementCost,
} from "../hexMap/hexGridMovementCost"
import { EnumLike } from "../utils/enum"
import { TAttribute } from "../squaddie/attribute/attribute.ts"

export const ActionEffectTemplateButtonIconKey = {
    UNKNOWN: "UNKNOWN",
} as const satisfies Record<string, string>
export type TActionEffectTemplateButtonIconKey = EnumLike<
    typeof ActionEffectTemplateButtonIconKey
>

export interface MapTilesResources {
    resourceKeys: string[]
    defaultByTerrainCost: { [cost in THexGridMovementCost]: string }
}

export interface CampaignResources {
    actionEffectSquaddieTemplateButtonIcons: {
        [iconKey in TActionEffectTemplateButtonIconKey]: string
    }
    mapTiles: MapTilesResources
    endTurnIconResourceKey: string
    attributeIcons: {
        up: string
        down: string
        byAttribute: {
            [t in TAttribute]?: string
        }
    }
}

export const CampaignResourcesService = {
    default: (): CampaignResources => {
        return {
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
            endTurnIconResourceKey: "decision-button-end-turn",
            attributeIcons: {
                up: "attribute-up",
                down: "attribute-down",
                byAttribute: {
                    ARMOR: "attribute-icon-armor",
                    ABSORB: "attribute-icon-absorb",
                },
            },
        }
    },
    clone: (original: CampaignResources): CampaignResources => ({
        endTurnIconResourceKey: original.endTurnIconResourceKey,
        actionEffectSquaddieTemplateButtonIcons: {
            ...original.actionEffectSquaddieTemplateButtonIcons,
        },
        mapTiles: {
            resourceKeys: [...original.mapTiles.resourceKeys],
            defaultByTerrainCost: { ...original.mapTiles.defaultByTerrainCost },
        },
        attributeIcons: {
            up: original.attributeIcons.up,
            down: original.attributeIcons.down,
            byAttribute: {
                ...original.attributeIcons.byAttribute,
            },
        },
    }),
    getAllImageResourceKeys: (
        campaignResources: CampaignResources
    ): string[] => {
        return [
            ...Object.values(
                campaignResources.actionEffectSquaddieTemplateButtonIcons
            ),
            ...campaignResources.mapTiles.resourceKeys,
            campaignResources.endTurnIconResourceKey,
            campaignResources.attributeIcons.up,
            campaignResources.attributeIcons.down,
            ...Object.values(campaignResources.attributeIcons.byAttribute),
        ]
    },
}
