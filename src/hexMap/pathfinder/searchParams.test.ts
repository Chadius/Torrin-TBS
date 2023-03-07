import {SearchParams, SearchParamsOptions} from "./searchParams";
import {Integer} from "../hexGrid";
import {SquaddieMovement} from "../../squaddie/movement";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../terrainTileMap";
import {Trait, TraitStatusStorage} from "../../trait/traitStatusStorage";

describe('searchParams', () => {
    it('getSearchParamsOptions generates options that can be used to build new objects', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 "]})
        })

        const originalParams: SearchParams = new SearchParams({
            startLocation: {q: 5 as Integer, r: 7 as Integer},
            stopLocation: {q: 11 as Integer, r: 13 as Integer},
            squaddieMovement: new SquaddieMovement({
                movementPerAction: 17,
                traits: new TraitStatusStorage({
                    [Trait.PASS_THROUGH_WALLS]: true,
                    [Trait.CROSS_OVER_PITS]: true,
                }),
            }),
            squaddieAffiliation: SquaddieAffiliation.NONE,
            numberOfActions: 3,
            minimumDistanceMoved: 2,
            missionMap: missionMap,
        });

        const extractedOptions: SearchParamsOptions = originalParams.getSearchParamsOptions();

        const newParams: SearchParams = new SearchParams(extractedOptions);

        expect(originalParams).toStrictEqual(newParams);
    });
});