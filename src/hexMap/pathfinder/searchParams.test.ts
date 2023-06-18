import {SearchParams, SearchParamsOptions} from "./searchParams";
import {SquaddieMovement} from "../../squaddie/movement";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../terrainTileMap";
import {Trait, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {BattleSquaddieRepository} from "../../battle/battleSquaddieRepository";
import {HexCoordinate} from "../hexCoordinate/hexCoordinate";
import {TargetingShape} from "../../battle/targeting/targetingShapeGenerator";

describe('searchParams', () => {
    it('getSearchParamsOptions generates options that can be used to build new objects', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 "]})
        })

        const squaddieRepo = new BattleSquaddieRepository();

        const originalParams: SearchParams = new SearchParams({
            canStopOnSquaddies: true,
            startLocation: new HexCoordinate({q: 5, r: 7}),
            stopLocation: new HexCoordinate({q: 11, r: 13}),
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
            squaddieRepository: squaddieRepo,
            shapeGeneratorType: TargetingShape.Snake,
        });

        const extractedOptions: SearchParamsOptions = originalParams.getSearchParamsOptions();

        const newParams: SearchParams = new SearchParams({searchParamsOptions: extractedOptions});

        expect(originalParams).toStrictEqual(newParams);
    });
});
