import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {SquaddieID} from "../squaddie/id";
import {HexCoordinate, HexGridTile, Integer} from "../hexMap/hexGrid";
import {HexGridMovementCost} from "../hexMap/hexGridMovementCost";
import {SquaddieResource} from "../squaddie/resource";
import {TraitCategory, TraitStatusStorage} from "../trait/traitStatusStorage";
import {MissionMap} from "./missionMap";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";

describe('Mission Map', () => {
    let map: TerrainTileMap;
    let torrinSquaddie: SquaddieID;
    beforeEach(() => {
        map = new TerrainTileMap({
            tiles: [
                new HexGridTile(0 as Integer, -1 as Integer, HexGridMovementCost.singleMovement),
                new HexGridTile(0 as Integer, 0 as Integer, HexGridMovementCost.singleMovement),
                new HexGridTile(0 as Integer, 1 as Integer, HexGridMovementCost.doubleMovement),
            ]
        });

        torrinSquaddie = new SquaddieID({
            name: "Torrin",
            id: "000",
            resources: new SquaddieResource({
                mapIconResourceKey: "map_icon_torrin"
            }),
            traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT),
            affiliation: SquaddieAffiliation.PLAYER,
        });
    });

    it('can add a squaddie and report its location', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        missionMap.addSquaddie(torrinSquaddie, {q: 0 as Integer, r: 1 as Integer});

        const squaddieMapCoordinate: HexCoordinate = missionMap.getSquaddieLocationById(torrinSquaddie.id);
        expect(squaddieMapCoordinate.q).toBe(0);
        expect(squaddieMapCoordinate.r).toBe(1);
    });

    it('cannot add a squaddie to a location that is already occupied or off map', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        let error: Error;
        error = missionMap.addSquaddie(torrinSquaddie, {q: 0 as Integer, r: 1 as Integer});
        expect(error).toBeUndefined();

        const sirCamilSquaddie = new SquaddieID({
            name: "Sir Camil",
            id: "001",
            resources: new SquaddieResource({
                mapIconResourceKey: "map_icon_sir_camil"
            }),
            traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT),
            affiliation: SquaddieAffiliation.PLAYER,
        });

        error = missionMap.addSquaddie(sirCamilSquaddie, {q: 0 as Integer, r: 1 as Integer});
        expect(error.message.includes("already occupied")).toBeTruthy();

        error = missionMap.addSquaddie(sirCamilSquaddie, {q: 2 as Integer, r: 1 as Integer});
        expect(error.message.includes("not on map")).toBeTruthy();

        error = missionMap.addSquaddie(sirCamilSquaddie, {q: 0 as Integer, r: -1 as Integer});
        expect(error).toBeUndefined();
    });

    it('can see what is at a given location', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        missionMap.addSquaddie(torrinSquaddie, {q: 0 as Integer, r: 1 as Integer});

        let mapInformation = missionMap.getMapInformationForLocation({q: 0 as Integer, r: 1 as Integer});
        expect(mapInformation.q).toBe(0);
        expect(mapInformation.r).toBe(1);
        expect(mapInformation.squaddieId).toBe(torrinSquaddie.id);
        expect(mapInformation.tileTerrainType).toBe(HexGridMovementCost.doubleMovement);

        mapInformation = missionMap.getMapInformationForLocation({q: 0 as Integer, r: -1 as Integer});
        expect(mapInformation.q).toBe(0);
        expect(mapInformation.r).toBe(-1);
        expect(mapInformation.squaddieId).toBeUndefined();
        expect(mapInformation.tileTerrainType).toBe(HexGridMovementCost.singleMovement);

        mapInformation = missionMap.getMapInformationForLocation({q: 0 as Integer, r: -5 as Integer});
        expect(mapInformation.q).toBeUndefined();
        expect(mapInformation.r).toBeUndefined();
        expect(mapInformation.squaddieId).toBeUndefined();
        expect(mapInformation.tileTerrainType).toBeUndefined();
    });

    it('returns unknown location for squaddies that does not exist', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        missionMap.addSquaddie(torrinSquaddie, {q: 0 as Integer, r: 1 as Integer});

        const squaddieMapCoordinate: HexCoordinate = missionMap.getSquaddieLocationById("id does not exist");
        expect(squaddieMapCoordinate.q).toBeUndefined();
        expect(squaddieMapCoordinate.r).toBeUndefined();
    });

    it('can move a squaddie by updating its position', () => {
        const missionMap: MissionMap = new MissionMap({terrainTileMap: map});
        missionMap.addSquaddie(torrinSquaddie, {q: 0 as Integer, r: 0 as Integer})
        missionMap.updateSquaddiePosition(torrinSquaddie.id, {q: 0 as Integer, r: 1 as Integer})
        const squaddieMapCoordinate: HexCoordinate = missionMap.getSquaddieLocationById(torrinSquaddie.id);
        expect(squaddieMapCoordinate.q).toBe(0);
        expect(squaddieMapCoordinate.r).toBe(1);

        expect(missionMap.getSquaddieAtLocation({q: 0 as Integer, r: 0 as Integer})).toBeUndefined();
    });

    it('should be able to stay in place', () => {
        const missionMap: MissionMap = new MissionMap({terrainTileMap: map});
        missionMap.addSquaddie(torrinSquaddie, {q: 0 as Integer, r: 0 as Integer})
        missionMap.updateSquaddiePosition(torrinSquaddie.id, {q: 0 as Integer, r: 0 as Integer})
        const squaddieMapCoordinate: HexCoordinate = missionMap.getSquaddieLocationById(torrinSquaddie.id);
        expect(squaddieMapCoordinate.q).toBe(0);
        expect(squaddieMapCoordinate.r).toBe(0);

        expect(missionMap.getSquaddieAtLocation({q: 0 as Integer, r: 0 as Integer})).toBe(torrinSquaddie);
    });

    it('should throw an error if wrong squaddie id', () => {
        const missionMap: MissionMap = new MissionMap({terrainTileMap: map});
        missionMap.addSquaddie(torrinSquaddie, {q: 0 as Integer, r: 0 as Integer})
        const errorFound: Error | undefined = missionMap.updateSquaddiePosition("does not exist", {
            q: 0 as Integer,
            r: 1 as Integer
        });

        expect(errorFound).toEqual(expect.any(Error));
        expect((errorFound as Error).message.includes(`updateSquaddieLocation: no squaddie with id does not exist`)).toBeTruthy();
    });

    it('should throw an error if off map', () => {
        const missionMap: MissionMap = new MissionMap({terrainTileMap: map});
        missionMap.addSquaddie(torrinSquaddie, {q: 0 as Integer, r: 0 as Integer})
        const errorFound: Error | undefined = missionMap.updateSquaddiePosition(torrinSquaddie.id,
            {
                q: 9001 as Integer,
                r: -9001 as Integer
            }
        );

        expect(errorFound).toEqual(expect.any(Error));
        expect((errorFound as Error).message.includes(`not on map`)).toBeTruthy();
    });

    it('should throw an error if occupied by another', () => {
        const sirCamilSquaddie = new SquaddieID({
            name: "Sir Camil",
            id: "001",
            resources: new SquaddieResource({
                mapIconResourceKey: "map_icon_torrin"
            }),
            traits: new TraitStatusStorage().filterCategory(TraitCategory.MOVEMENT),
            affiliation: SquaddieAffiliation.PLAYER,
        });

        const missionMap: MissionMap = new MissionMap({terrainTileMap: map});
        missionMap.addSquaddie(torrinSquaddie, {q: 0 as Integer, r: 0 as Integer})
        missionMap.addSquaddie(sirCamilSquaddie, {q: 0 as Integer, r: 1 as Integer})
        const errorFound = missionMap.updateSquaddiePosition(torrinSquaddie.id, {q: 0 as Integer, r: 1 as Integer})

        expect(errorFound).toEqual(expect.any(Error));
        expect((errorFound as Error).message.includes(`occupied`)).toBeTruthy();
    });
});