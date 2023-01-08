import {HexMap} from "../hexMap";
import {HexCoordinate, HexGridTile, Integer} from "../hexGrid";
import {SquaddieID} from "../../squaddie/id";
import {SquaddieResource} from "../../squaddie/resource";
import {Pathfinder} from "./pathfinder";
import {HexGridTerrainTypes} from "../hexGridTerrainType";

describe('pathfinder', () => {
  let map: HexMap;
  let torrinSquaddie: SquaddieID;
  beforeEach(() => {
    map = new HexMap(
      [
        new HexGridTile(0, -1, HexGridTerrainTypes.floor),
        new HexGridTile(0, 0, HexGridTerrainTypes.floor),
        new HexGridTile(0, 1, HexGridTerrainTypes.sand),
      ]
    );

    torrinSquaddie = new SquaddieID({
      name: "Torrin",
      id: "000",
      resources: new SquaddieResource({
        mapIcon: "map_icon_torrin"
      })
    });
  });

  it('can add a squaddie and report its location', () => {
    const pathfinder = new Pathfinder({
      map: map
    })

    pathfinder.addSquaddie(torrinSquaddie, {q: 0 as Integer, r: 1 as Integer});

    const squaddieMapCoordinate: HexCoordinate = pathfinder.getSquaddieLocationById(torrinSquaddie.id);
    expect(squaddieMapCoordinate.q).toBe(0);
    expect(squaddieMapCoordinate.r).toBe(1);
  });

  it('cannot add a squaddie to a location that is already occupied or off map', () => {
    const pathfinder = new Pathfinder({
      map: map
    })

    let error: Error;
    error = pathfinder.addSquaddie(torrinSquaddie, {q: 0 as Integer, r: 1 as Integer});
    expect(error).toBeUndefined();

    const sirCamilSquaddie = new SquaddieID({
      name: "Sir Camil",
      id: "001",
      resources: new SquaddieResource({
        mapIcon: "map_icon_sir_camil"
      })
    });

    error = pathfinder.addSquaddie(sirCamilSquaddie, {q: 0 as Integer, r: 1 as Integer});
    expect(error.message.includes("already occupied")).toBeTruthy();

    error = pathfinder.addSquaddie(sirCamilSquaddie, {q: 2 as Integer, r: 1 as Integer});
    expect(error.message.includes("not on map")).toBeTruthy();

    error = pathfinder.addSquaddie(sirCamilSquaddie, {q: 0 as Integer, r: -1 as Integer});
    expect(error).toBeUndefined();
  });

  it('can see what is at a given location', () => {
    const pathfinder = new Pathfinder({
      map: map
    })

    pathfinder.addSquaddie(torrinSquaddie, {q: 0 as Integer, r: 1 as Integer});

    let mapInformation = pathfinder.getMapInformationForLocation({q: 0 as Integer, r: 1 as Integer});
    expect(mapInformation.q).toBe(0);
    expect(mapInformation.r).toBe(1);
    expect(mapInformation.squaddieId).toBe(torrinSquaddie.id);
    expect(mapInformation.tileTerrainType).toBe(HexGridTerrainTypes.sand);

    mapInformation = pathfinder.getMapInformationForLocation({q: 0 as Integer, r: -1 as Integer});
    expect(mapInformation.q).toBe(0);
    expect(mapInformation.r).toBe(-1);
    expect(mapInformation.squaddieId).toBeUndefined();
    expect(mapInformation.tileTerrainType).toBe(HexGridTerrainTypes.floor);

    mapInformation = pathfinder.getMapInformationForLocation({q: 0 as Integer, r: -5 as Integer});
    expect(mapInformation.q).toBeUndefined();
    expect(mapInformation.r).toBeUndefined();
    expect(mapInformation.squaddieId).toBeUndefined();
    expect(mapInformation.tileTerrainType).toBeUndefined();
  });

  it('returns unknown location for squaddies that does not exist', () => {
    const pathfinder = new Pathfinder({
      map: map
    })

    pathfinder.addSquaddie(torrinSquaddie, {q: 0 as Integer, r: 1 as Integer});

    const squaddieMapCoordinate: HexCoordinate = pathfinder.getSquaddieLocationById("id does not exist");
    expect(squaddieMapCoordinate.q).toBeUndefined();
    expect(squaddieMapCoordinate.r).toBeUndefined();
  });
});
