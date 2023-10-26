import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {SquaddieId} from "../squaddie/id";
import {HexGridTile} from "../hexMap/hexGrid";
import {HexGridMovementCost} from "../hexMap/hexGridMovementCost";
import {SquaddieResource} from "../squaddie/resource";
import {TraitCategory, TraitStatusStorage} from "../trait/traitStatusStorage";
import {MissionMap, MissionMapSquaddieDatum} from "./missionMap";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";

describe('Mission Map', () => {
    let map: TerrainTileMap;
    let torrinSquaddie: SquaddieId;
    beforeEach(() => {
        map = new TerrainTileMap({
            tiles: [
                new HexGridTile(0, -1, HexGridMovementCost.singleMovement),
                new HexGridTile(0, 0, HexGridMovementCost.singleMovement),
                new HexGridTile(0, 1, HexGridMovementCost.doubleMovement),
            ]
        });

        torrinSquaddie = new SquaddieId({
            name: "Torrin",
            templateId: "000",
            resources: new SquaddieResource({
                mapIconResourceKey: "map_icon_torrin"
            }),
            traits: new TraitStatusStorage({}).filterCategory(TraitCategory.MOVEMENT),
            affiliation: SquaddieAffiliation.PLAYER,
        });
    });

    it('can add a squaddie and report its location', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        missionMap.addSquaddie(torrinSquaddie.templateId, "dynamic_squaddie_0", new HexCoordinate({q: 0, r: 1}));

        const {
            mapLocation: squaddieMapCoordinate,
            squaddieTemplateId,
        } = missionMap.getSquaddieByBattleId("dynamic_squaddie_0");
        expect(squaddieTemplateId).toBe(torrinSquaddie.templateId);
        expect(squaddieMapCoordinate.q).toBe(0);
        expect(squaddieMapCoordinate.r).toBe(1);
    });

    it('can add a squaddie without a location', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        missionMap.addSquaddie(torrinSquaddie.templateId, "dynamic_squaddie_0");

        const {
            mapLocation: squaddieMapCoordinate,
            squaddieTemplateId,
        } = missionMap.getSquaddieByBattleId("dynamic_squaddie_0");
        expect(squaddieTemplateId).toBe(torrinSquaddie.templateId);
        expect(squaddieMapCoordinate).toBeUndefined();
    });

    it('will return undefined if it cannot find a squaddie', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        const {
            mapLocation,
            squaddieTemplateId,
            battleSquaddieId
        } = missionMap.getSquaddieByBattleId("dynamic_squaddie_0");
        expect(squaddieTemplateId).toBeUndefined();
        expect(battleSquaddieId).toBeUndefined();
        expect(mapLocation).toBeUndefined();
    });

    it('cannot add a squaddie to a location that is already occupied', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        let error: Error;
        error = missionMap.addSquaddie(torrinSquaddie.templateId, "dynamic_squaddie_0", new HexCoordinate({
            q: 0,
            r: 1
        }));
        expect(error).toBeUndefined();

        error = missionMap.addSquaddie(torrinSquaddie.templateId, "dynamic_squaddie_1", new HexCoordinate({
            q: 0,
            r: 1
        }));
        expect(error).toEqual(expect.any(Error));
        expect((error as Error).message.includes("already occupied")).toBeTruthy();

        error = missionMap.addSquaddie(torrinSquaddie.templateId, "dynamic_squaddie_1", new HexCoordinate({
            q: 0,
            r: -1
        }));
        expect(error).toBeUndefined();
    });

    it('will raise an error if you add the same dynamic squaddie twice', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        let error: Error;
        error = missionMap.addSquaddie(torrinSquaddie.templateId, "dynamic_squaddie_0");
        expect(error).toBeUndefined();

        error = missionMap.addSquaddie(torrinSquaddie.templateId, "dynamic_squaddie_0");
        expect(error).toEqual(expect.any(Error));
        expect((error as Error).message.includes("already added")).toBeTruthy();

        error = missionMap.addSquaddie(torrinSquaddie.templateId, "different_dynamic_squaddie_0");
        expect(error).toBeUndefined();
    });

    it('will raise an error if the squaddie is added to an off map location', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        let error: Error;
        error = missionMap.addSquaddie(torrinSquaddie.templateId, "dynamic_squaddie_0", new HexCoordinate({
            q: -999,
            r: 999
        }));
        expect(error).toEqual(expect.any(Error));
        expect((error as Error).message.includes("is not on map")).toBeTruthy();
    });

    it('can see what is at a given location', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        missionMap.addSquaddie(torrinSquaddie.templateId, "dynamic_squaddie_0", new HexCoordinate({q: 0, r: 1}));

        const {
            mapLocation: squaddieMapCoordinate,
            squaddieTemplateId,
            battleSquaddieId,
        } = missionMap.getSquaddieAtLocation(new HexCoordinate({q: 0, r: 1}));
        expect(squaddieTemplateId).toBe(torrinSquaddie.templateId);
        expect(battleSquaddieId).toBe("dynamic_squaddie_0");
        expect(squaddieMapCoordinate.q).toBe(0);
        expect(squaddieMapCoordinate.r).toBe(1);

        const noDatumFound = missionMap.getSquaddieAtLocation(new HexCoordinate({q: 0, r: -1}));
        expect(noDatumFound.isValid()).toBeFalsy();
    });

    it('can get terrain information at a given coordinate', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        });

        let hexMovementType: HexGridMovementCost;
        hexMovementType = missionMap.getHexGridMovementAtLocation(new HexCoordinate({q: 0, r: 1}));
        expect(hexMovementType).toBe(HexGridMovementCost.doubleMovement);

        hexMovementType = missionMap.getHexGridMovementAtLocation(new HexCoordinate({q: 0, r: -1}));
        expect(hexMovementType).toBe(HexGridMovementCost.singleMovement);

        hexMovementType = missionMap.getHexGridMovementAtLocation(new HexCoordinate({q: 0, r: -5}));
        expect(hexMovementType).toBeUndefined();
    });

    it('can get all squaddies without a location', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        missionMap.addSquaddie("static_squaddie_0", "dynamic_squaddie_0");
        missionMap.addSquaddie("static_squaddie_0", "dynamic_squaddie_0_1");
        missionMap.addSquaddie("static_squaddie_1", "dynamic_squaddie_1");
        missionMap.addSquaddie("static_squaddie_with_location", "dynamic_squaddie_with_location", new HexCoordinate({
            q: 0,
            r: 0
        }));

        const squaddieData: MissionMapSquaddieDatum[] = missionMap.getSquaddiesThatHaveNoLocation();

        expect(squaddieData).toHaveLength(3);
        expect(squaddieData).toContainEqual(new MissionMapSquaddieDatum({
            squaddieTemplateId: "static_squaddie_0",
            battleSquaddieId: "dynamic_squaddie_0",
        }));
        expect(squaddieData).toContainEqual(new MissionMapSquaddieDatum({
            squaddieTemplateId: "static_squaddie_0",
            battleSquaddieId: "dynamic_squaddie_0_1",
        }));
        expect(squaddieData).toContainEqual(new MissionMapSquaddieDatum({
            squaddieTemplateId: "static_squaddie_1",
            battleSquaddieId: "dynamic_squaddie_1",
        }));
    });

    it('can move a squaddie by updating its position', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        missionMap.addSquaddie(torrinSquaddie.templateId, "dynamic_squaddie_0", new HexCoordinate({q: 0, r: 1}));
        missionMap.updateSquaddieLocation("dynamic_squaddie_0", new HexCoordinate({q: 0, r: 0}));

        expect(missionMap.getSquaddieAtLocation(new HexCoordinate({
            q: 0,
            r: 0
        }))).toStrictEqual(new MissionMapSquaddieDatum({
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: torrinSquaddie.templateId,
            mapLocation: new HexCoordinate({q: 0, r: 0}),
        }));
        expect(missionMap.getSquaddieAtLocation(new HexCoordinate({q: 0, r: 1})).isValid()).toBeFalsy();
    });

    it('can move a squaddie off the map', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        missionMap.addSquaddie(torrinSquaddie.templateId, "dynamic_squaddie_0", new HexCoordinate({q: 0, r: 1}));
        missionMap.updateSquaddieLocation("dynamic_squaddie_0", undefined);

        expect(missionMap.getSquaddiesThatHaveNoLocation()).toStrictEqual([
            new MissionMapSquaddieDatum({
                battleSquaddieId: "dynamic_squaddie_0",
                squaddieTemplateId: torrinSquaddie.templateId,
                mapLocation: undefined,
            })
        ]);
        expect(missionMap.getSquaddieAtLocation(new HexCoordinate({q: 0, r: 1})).isValid()).toBeFalsy();
    });

    it('should raise an error if you try to move a squaddie that does not exist', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        let error: Error;
        error = missionMap.updateSquaddieLocation("does not exist", undefined);

        expect(error).toEqual(expect.any(Error));
        expect((error as Error).message.includes(`does not exist`)).toBeTruthy();
    });

    it('should raise an error if moving a squaddie to a location not on the map', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        missionMap.addSquaddie(torrinSquaddie.templateId, "dynamic_squaddie_0", new HexCoordinate({q: 0, r: 1}));

        let error: Error;
        error = missionMap.updateSquaddieLocation("dynamic_squaddie_0", new HexCoordinate({q: 999, r: 999}));

        expect(error).toEqual(expect.any(Error));
        expect((error as Error).message.includes(`is not on map`)).toBeTruthy();
    });

    it('should raise an error if occupied by another squaddie', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        missionMap.addSquaddie("static_squaddie_0", "dynamic_squaddie_0", new HexCoordinate({q: 0, r: 1}));
        let e = missionMap.addSquaddie("static_squaddie_1", "dynamic_squaddie_1", new HexCoordinate({q: 0, r: 0}));
        expect(e).toBeUndefined();

        let error: Error;
        error = missionMap.updateSquaddieLocation("dynamic_squaddie_1", new HexCoordinate({q: 0, r: 1}));

        expect(error).toEqual(expect.any(Error));
        expect((error as Error).message.includes(`already occupied`)).toBeTruthy();
    });

    it('should not raise an error if squaddie position is updated to its original location', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        missionMap.addSquaddie("static_squaddie_0", "dynamic_squaddie_0", new HexCoordinate({q: 0, r: 1}));

        let error: Error;
        error = missionMap.updateSquaddieLocation("dynamic_squaddie_0", new HexCoordinate({q: 0, r: 1}));
        expect(error).toBeUndefined();
    });

    it('should be able to return a copy of all squaddie data', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })

        missionMap.addSquaddie("static_0", "dynamic_0", new HexCoordinate({q: 0, r: 1}));
        missionMap.addSquaddie("static_0", "dynamic_1", new HexCoordinate({q: 0, r: 0}));
        missionMap.addSquaddie("static_1", "dynamic_2", new HexCoordinate({q: 0, r: -1}));

        const actualSquaddieData: MissionMapSquaddieDatum[] = missionMap.getAllSquaddieData();

        expect(actualSquaddieData).toHaveLength(3);
        expect(actualSquaddieData).toContainEqual(new MissionMapSquaddieDatum({
            squaddieTemplateId: "static_0",
            battleSquaddieId: "dynamic_0",
            mapLocation: new HexCoordinate({q: 0, r: 1}),
        }));
        expect(actualSquaddieData).toContainEqual(new MissionMapSquaddieDatum({
            squaddieTemplateId: "static_0",
            battleSquaddieId: "dynamic_1",
            mapLocation: new HexCoordinate({q: 0, r: 0}),
        }));
        expect(actualSquaddieData).toContainEqual(new MissionMapSquaddieDatum({
            squaddieTemplateId: "static_1",
            battleSquaddieId: "dynamic_2",
            mapLocation: new HexCoordinate({q: 0, r: -1}),
        }));
    });

    it('can find all squaddies by their static id', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })
        missionMap.addSquaddie("static_squaddie_0", "dynamic_squaddie_0");
        missionMap.addSquaddie("static_squaddie_0", "dynamic_squaddie_0_1");
        missionMap.addSquaddie("static_squaddie_1", "dynamic_squaddie_1");
        missionMap.addSquaddie("static_squaddie_with_location", "dynamic_squaddie_with_location", new HexCoordinate({
            q: 0,
            r: 0
        }));

        const squaddieTemplate0: MissionMapSquaddieDatum[] = missionMap.getSquaddiesByTemplateId("static_squaddie_0");
        expect(squaddieTemplate0).toHaveLength(2);
        expect(squaddieTemplate0).toContainEqual(new MissionMapSquaddieDatum({
            squaddieTemplateId: "static_squaddie_0",
            battleSquaddieId: "dynamic_squaddie_0",
            mapLocation: undefined,
        }));
        expect(squaddieTemplate0).toContainEqual(new MissionMapSquaddieDatum({
            squaddieTemplateId: "static_squaddie_0",
            battleSquaddieId: "dynamic_squaddie_0_1",
            mapLocation: undefined,
        }));

        const squaddieTemplateWithLocation: MissionMapSquaddieDatum[] = missionMap.getSquaddiesByTemplateId("static_squaddie_with_location");
        expect(squaddieTemplateWithLocation).toHaveLength(1);
        expect(squaddieTemplateWithLocation).toContainEqual(new MissionMapSquaddieDatum({
            squaddieTemplateId: "static_squaddie_with_location",
            battleSquaddieId: "dynamic_squaddie_with_location",
            mapLocation: new HexCoordinate({q: 0, r: 0}),
        }));

        const doesNotExist: MissionMapSquaddieDatum[] = missionMap.getSquaddiesByTemplateId("does not exist");
        expect(doesNotExist).toHaveLength(0);
    });

    it('can draw and hide squaddies from the map', () => {
        const missionMap = new MissionMap({
            terrainTileMap: map
        })
        const battleSquaddieId = "dynamic_squaddie_0";
        missionMap.addSquaddie("static_squaddie_0", battleSquaddieId);

        expect(missionMap.isSquaddieHiddenFromDrawing(battleSquaddieId)).toBeFalsy();
        missionMap.hideSquaddieFromDrawing(battleSquaddieId);
        expect(missionMap.isSquaddieHiddenFromDrawing(battleSquaddieId)).toBeTruthy();
        missionMap.revealSquaddieForDrawing(battleSquaddieId);
        expect(missionMap.isSquaddieHiddenFromDrawing(battleSquaddieId)).toBeFalsy();
    });
});
