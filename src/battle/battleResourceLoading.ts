import {BattleSquaddieStatic} from "./battleSquaddie";
import {ResourceHandler} from "../resource/resourceHandler";

export const loadMapIconResources = (resourceHandler: ResourceHandler, staticSquaddies: BattleSquaddieStatic []) => {
    staticSquaddies.forEach(staticSquaddie => resourceHandler.loadResource(staticSquaddie.squaddieID.resources.mapIconResourceKey));
}

export const loadMapTileResources = (resourceHandler: ResourceHandler) => {
    resourceHandler.loadResources([
        "map icon move 1 action",
        "map icon move 2 actions",
        "map icon move 3 actions",
        "map icon attack 1 action"
    ]);
}

export const areAllResourcesLoaded: (resourceHandler: ResourceHandler, staticSquaddies: BattleSquaddieStatic[]) => Boolean
    = (resourceHandler: ResourceHandler, staticSquaddies: BattleSquaddieStatic []) => {
    const squaddieResourceKeys = staticSquaddies.map(info => info.squaddieID.resources.mapIconResourceKey)

    return resourceHandler.areAllResourcesLoaded([
        ...squaddieResourceKeys,
        "map icon move 1 action",
        "map icon move 2 actions",
        "map icon move 3 actions",
    ])
}