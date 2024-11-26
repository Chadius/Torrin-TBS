import { TerrainTileMap, TerrainTileMapService } from "../hexMap/terrainTileMap"
import { SquaddieId } from "../squaddie/id"
import { TraitStatusStorageService } from "../trait/traitStatusStorage"
import { MissionMapService } from "./missionMap"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import {
    MissionMapSquaddieLocation,
    MissionMapSquaddieLocationService,
} from "./squaddieLocation"

describe("Mission Map", () => {
    let map: TerrainTileMap
    let torrinSquaddie: SquaddieId
    beforeEach(() => {
        map = TerrainTileMapService.new({
            movementCost: ["1 1 2 "],
        })

        torrinSquaddie = {
            name: "Torrin",
            templateId: "000",
            resources: {
                mapIconResourceKey: "map_icon_torrin",
                actionSpritesByEmotion: {},
            },
            traits: TraitStatusStorageService.newUsingTraitValues(),
            affiliation: SquaddieAffiliation.PLAYER,
        }
    })

    it("can add a squaddie and report its location", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: torrinSquaddie.templateId,
            location: { q: 0, r: 2 },
        })

        let { mapLocation: squaddieMapCoordinate, squaddieTemplateId } =
            MissionMapService.getByBattleSquaddieId(
                missionMap,
                "dynamic_squaddie_0"
            )
        expect(squaddieTemplateId).toBe(torrinSquaddie.templateId)
        expect(squaddieMapCoordinate.q).toBe(0)
        expect(squaddieMapCoordinate.r).toBe(2)
        ;({ mapLocation: squaddieMapCoordinate, squaddieTemplateId } =
            MissionMapService.getByBattleSquaddieId(
                missionMap,
                "dynamic_squaddie_0"
            ))
        expect(squaddieTemplateId).toBe(torrinSquaddie.templateId)
        expect(squaddieMapCoordinate.q).toBe(0)
        expect(squaddieMapCoordinate.r).toBe(2)
    })

    it("can add a squaddie without a location", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: torrinSquaddie.templateId,
        })

        const { mapLocation: squaddieMapCoordinate, squaddieTemplateId } =
            MissionMapService.getByBattleSquaddieId(
                missionMap,
                "dynamic_squaddie_0"
            )
        expect(squaddieTemplateId).toBe(torrinSquaddie.templateId)
        expect(squaddieMapCoordinate).toBeUndefined()
    })

    it("will return undefined if it cannot find a squaddie", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        const { mapLocation, squaddieTemplateId, battleSquaddieId } =
            MissionMapService.getByBattleSquaddieId(
                missionMap,
                "dynamic_squaddie_0"
            )
        expect(squaddieTemplateId).toBeUndefined()
        expect(battleSquaddieId).toBeUndefined()
        expect(mapLocation).toBeUndefined()
    })

    it("cannot add a squaddie to a location that is already occupied", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        let error: Error
        error = MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: torrinSquaddie.templateId,
            location: { q: 0, r: 2 },
        })
        expect(error).toBeUndefined()

        error = MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_1",
            squaddieTemplateId: torrinSquaddie.templateId,
            location: { q: 0, r: 2 },
        })
        expect(error).toEqual(expect.any(Error))
        expect(
            (error as Error).message.includes("already occupied")
        ).toBeTruthy()

        error = MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_1",
            squaddieTemplateId: torrinSquaddie.templateId,
            location: { q: 0, r: 0 },
        })

        expect(error).toBeUndefined()
    })

    it("will raise an error if you add the same dynamic squaddie twice", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        let error: Error
        error = MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: torrinSquaddie.templateId,
        })
        expect(error).toBeUndefined()

        error = MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: torrinSquaddie.templateId,
        })

        expect(error).toEqual(expect.any(Error))
        expect((error as Error).message.includes("already added")).toBeTruthy()

        error = MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "different_dynamic_squaddie_0",
            squaddieTemplateId: torrinSquaddie.templateId,
        })
        expect(error).toBeUndefined()
    })

    it("will raise an error if the squaddie is added to an off map location", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        let error: Error
        error = MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: torrinSquaddie.templateId,
            location: { q: -999, r: 999 },
        })
        expect(error).toEqual(expect.any(Error))
        expect((error as Error).message.includes("is not on map")).toBeTruthy()
    })

    it("can see what is at a given location", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: torrinSquaddie.templateId,
            location: { q: 0, r: 2 },
        })

        const {
            mapLocation: squaddieMapCoordinate,
            squaddieTemplateId,
            battleSquaddieId,
        } = MissionMapService.getBattleSquaddieAtLocation(missionMap, {
            q: 0,
            r: 2,
        })

        expect(squaddieTemplateId).toBe(torrinSquaddie.templateId)
        expect(battleSquaddieId).toBe("dynamic_squaddie_0")
        expect(squaddieMapCoordinate.q).toBe(0)
        expect(squaddieMapCoordinate.r).toBe(2)

        const noDatumFound = MissionMapService.getBattleSquaddieAtLocation(
            missionMap,
            {
                q: 0,
                r: 0,
            }
        )
        expect(
            MissionMapSquaddieLocationService.isValid(noDatumFound)
        ).toBeFalsy()
    })

    it("can move a squaddie by updating its position via class method", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: torrinSquaddie.templateId,
            location: { q: 0, r: 1 },
        })
        MissionMapService.updateBattleSquaddieLocation(
            missionMap,
            "dynamic_squaddie_0",
            {
                q: 0,
                r: 0,
            }
        )

        expect(
            MissionMapService.getBattleSquaddieAtLocation(missionMap, {
                q: 0,
                r: 0,
            })
        ).toStrictEqual({
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: torrinSquaddie.templateId,
            mapLocation: { q: 0, r: 0 },
        })
        expect(
            MissionMapSquaddieLocationService.isValid(
                MissionMapService.getBattleSquaddieAtLocation(missionMap, {
                    q: 0,
                    r: 1,
                })
            )
        ).toBeFalsy()
    })

    it("can move a squaddie by updating its position", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: torrinSquaddie.templateId,
            battleSquaddieId: "dynamic_squaddie_0",
            location: {
                q: 0,
                r: 1,
            },
        })
        MissionMapService.updateBattleSquaddieLocation(
            missionMap,
            "dynamic_squaddie_0",
            { q: 0, r: 0 }
        )
        expect(
            MissionMapService.getBattleSquaddieAtLocation(missionMap, {
                q: 0,
                r: 0,
            })
        ).toStrictEqual({
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: torrinSquaddie.templateId,
            mapLocation: { q: 0, r: 0 },
        })
        expect(
            MissionMapSquaddieLocationService.isValid(
                MissionMapService.getBattleSquaddieAtLocation(missionMap, {
                    q: 0,
                    r: 1,
                })
            )
        ).toBeFalsy()
    })

    it("can move a squaddie off the map", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: torrinSquaddie.templateId,
            location: { q: 0, r: 1 },
        })
        MissionMapService.updateBattleSquaddieLocation(
            missionMap,
            "dynamic_squaddie_0",
            undefined
        )

        expect(
            MissionMapService.getSquaddiesThatHaveNoLocation(missionMap)
        ).toStrictEqual([
            {
                battleSquaddieId: "dynamic_squaddie_0",
                squaddieTemplateId: torrinSquaddie.templateId,
                mapLocation: undefined,
            },
        ])
        expect(
            MissionMapSquaddieLocationService.isValid(
                MissionMapService.getBattleSquaddieAtLocation(missionMap, {
                    q: 0,
                    r: 1,
                })
            )
        ).toBeFalsy()
    })

    it("should raise an error if you try to move a squaddie that does not exist", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        let error: Error
        error = MissionMapService.updateBattleSquaddieLocation(
            missionMap,
            "does not exist",
            undefined
        )

        expect(error).toEqual(expect.any(Error))
        expect((error as Error).message.includes(`does not exist`)).toBeTruthy()
    })

    it("should raise an error if moving a squaddie to a location not on the map", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: torrinSquaddie.templateId,
            location: { q: 0, r: 1 },
        })

        let error: Error
        error = MissionMapService.updateBattleSquaddieLocation(
            missionMap,
            "dynamic_squaddie_0",
            {
                q: 999,
                r: 999,
            }
        )

        expect(error).toEqual(expect.any(Error))
        expect((error as Error).message.includes(`is not on map`)).toBeTruthy()
    })

    it("should raise an error if occupied by another squaddie", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: "static_squaddie_0",
            location: { q: 0, r: 1 },
        })

        let e = MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_1",
            squaddieTemplateId: "static_squaddie_1",
            location: { q: 0, r: 0 },
        })
        expect(e).toBeUndefined()

        let error: Error
        error = MissionMapService.updateBattleSquaddieLocation(
            missionMap,
            "dynamic_squaddie_1",
            {
                q: 0,
                r: 1,
            }
        )

        expect(error).toEqual(expect.any(Error))
        expect(
            (error as Error).message.includes(`already occupied`)
        ).toBeTruthy()
    })

    it("should not raise an error if squaddie position is updated to its original location", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: "static_squaddie_0",
            location: { q: 0, r: 1 },
        })

        let error: Error
        error = MissionMapService.updateBattleSquaddieLocation(
            missionMap,
            "dynamic_squaddie_0",
            {
                q: 0,
                r: 1,
            }
        )
        expect(error).toBeUndefined()
    })

    it("should be able to return a copy of all squaddie data", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_0",
            squaddieTemplateId: "static_0",
            location: { q: 0, r: 2 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_1",
            squaddieTemplateId: "static_0",
            location: { q: 0, r: 1 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_2",
            squaddieTemplateId: "static_1",
            location: { q: 0, r: 0 },
        })

        const actualSquaddieData: MissionMapSquaddieLocation[] =
            MissionMapService.getAllSquaddieData(missionMap)

        expect(actualSquaddieData).toHaveLength(3)
        expect(actualSquaddieData).toContainEqual({
            squaddieTemplateId: "static_0",
            battleSquaddieId: "dynamic_0",
            mapLocation: { q: 0, r: 2 },
        })
        expect(actualSquaddieData).toContainEqual({
            squaddieTemplateId: "static_0",
            battleSquaddieId: "dynamic_1",
            mapLocation: { q: 0, r: 1 },
        })
        expect(actualSquaddieData).toContainEqual({
            squaddieTemplateId: "static_1",
            battleSquaddieId: "dynamic_2",
            mapLocation: { q: 0, r: 0 },
        })
    })

    it("can draw and hide squaddies from the map", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })
        const battleSquaddieId = "dynamic_squaddie_0"
        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId,
            squaddieTemplateId: "static_squaddie_0",
        })

        expect(
            MissionMapService.isSquaddieHiddenFromDrawing(
                missionMap,
                battleSquaddieId
            )
        ).toBeFalsy()
        MissionMapService.hideSquaddieFromDrawing(missionMap, battleSquaddieId)
        expect(
            MissionMapService.isSquaddieHiddenFromDrawing(
                missionMap,
                battleSquaddieId
            )
        ).toBeTruthy()
        MissionMapService.revealSquaddieForDrawing(missionMap, battleSquaddieId)
        expect(
            MissionMapService.isSquaddieHiddenFromDrawing(
                missionMap,
                battleSquaddieId
            )
        ).toBeFalsy()
    })

    it("can create mission map locations using data", () => {
        const location: MissionMapSquaddieLocation = {
            battleSquaddieId: "battle",
            squaddieTemplateId: "template",
            mapLocation: { q: 3, r: 8 },
        }

        expect(location.battleSquaddieId).toBe("battle")
        expect(location.squaddieTemplateId).toBe("template")
        expect(location.mapLocation).toStrictEqual({ q: 3, r: 8 })
    })
})
