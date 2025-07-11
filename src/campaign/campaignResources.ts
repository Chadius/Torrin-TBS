import { HexGridMovementCost } from "../hexMap/hexGridMovementCost"

export enum ActionEffectTemplateButtonIconKey {
    UNKNOWN = "UNKNOWN",
}

export interface MapTilesResources {
    resourceKeys: string[]
    defaultByTerrainCost: { [cost in HexGridMovementCost]: string }
}

export interface CampaignResources {
    actionEffectSquaddieTemplateButtonIcons: {
        [iconKey in ActionEffectTemplateButtonIconKey]: string
    }
    mapTiles: MapTilesResources
    endTurnIconResourceKey: string
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
            endTurnIconResourceKey: "decision-button-end",
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
    }),
}
