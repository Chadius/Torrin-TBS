import { TerrainTileMap, TerrainTileMapService } from "../hexMap/terrainTileMap"
import { SquaddieId } from "../squaddie/id"
import { HexGridMovementCost } from "../hexMap/hexGridMovementCost"
import { TraitStatusStorageService } from "../trait/traitStatusStorage"
import { MissionMap, MissionMapService } from "./missionMap"
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
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })

        missionMap.addSquaddie(
            torrinSquaddie.templateId,
            "dynamic_squaddie_0",
            { q: 0, r: 2 }
        )

        let { mapLocation: squaddieMapCoordinate, squaddieTemplateId } =
            missionMap.getSquaddieByBattleId("dynamic_squaddie_0")
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
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })

        missionMap.addSquaddie(torrinSquaddie.templateId, "dynamic_squaddie_0")

        const { mapLocation: squaddieMapCoordinate, squaddieTemplateId } =
            missionMap.getSquaddieByBattleId("dynamic_squaddie_0")
        expect(squaddieTemplateId).toBe(torrinSquaddie.templateId)
        expect(squaddieMapCoordinate).toBeUndefined()
    })

    it("will return undefined if it cannot find a squaddie", () => {
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })

        const { mapLocation, squaddieTemplateId, battleSquaddieId } =
            missionMap.getSquaddieByBattleId("dynamic_squaddie_0")
        expect(squaddieTemplateId).toBeUndefined()
        expect(battleSquaddieId).toBeUndefined()
        expect(mapLocation).toBeUndefined()
    })

    it("cannot add a squaddie to a location that is already occupied", () => {
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })

        let error: Error
        error = missionMap.addSquaddie(
            torrinSquaddie.templateId,
            "dynamic_squaddie_0",
            {
                q: 0,
                r: 2,
            }
        )
        expect(error).toBeUndefined()

        error = missionMap.addSquaddie(
            torrinSquaddie.templateId,
            "dynamic_squaddie_1",
            {
                q: 0,
                r: 2,
            }
        )
        expect(error).toEqual(expect.any(Error))
        expect(
            (error as Error).message.includes("already occupied")
        ).toBeTruthy()

        error = missionMap.addSquaddie(
            torrinSquaddie.templateId,
            "dynamic_squaddie_1",
            {
                q: 0,
                r: 0,
            }
        )
        expect(error).toBeUndefined()
    })

    it("will raise an error if you add the same dynamic squaddie twice", () => {
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })

        let error: Error
        error = missionMap.addSquaddie(
            torrinSquaddie.templateId,
            "dynamic_squaddie_0"
        )
        expect(error).toBeUndefined()

        error = missionMap.addSquaddie(
            torrinSquaddie.templateId,
            "dynamic_squaddie_0"
        )
        expect(error).toEqual(expect.any(Error))
        expect((error as Error).message.includes("already added")).toBeTruthy()

        error = missionMap.addSquaddie(
            torrinSquaddie.templateId,
            "different_dynamic_squaddie_0"
        )
        expect(error).toBeUndefined()
    })

    it("will raise an error if the squaddie is added to an off map location", () => {
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })

        let error: Error
        error = missionMap.addSquaddie(
            torrinSquaddie.templateId,
            "dynamic_squaddie_0",
            {
                q: -999,
                r: 999,
            }
        )
        expect(error).toEqual(expect.any(Error))
        expect((error as Error).message.includes("is not on map")).toBeTruthy()
    })

    it("can see what is at a given location", () => {
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })

        missionMap.addSquaddie(
            torrinSquaddie.templateId,
            "dynamic_squaddie_0",
            { q: 0, r: 2 }
        )

        const {
            mapLocation: squaddieMapCoordinate,
            squaddieTemplateId,
            battleSquaddieId,
        } = missionMap.getSquaddieAtLocation({ q: 0, r: 2 })
        expect(squaddieTemplateId).toBe(torrinSquaddie.templateId)
        expect(battleSquaddieId).toBe("dynamic_squaddie_0")
        expect(squaddieMapCoordinate.q).toBe(0)
        expect(squaddieMapCoordinate.r).toBe(2)

        const noDatumFound = missionMap.getSquaddieAtLocation({ q: 0, r: 0 })
        expect(
            MissionMapSquaddieLocationService.isValid(noDatumFound)
        ).toBeFalsy()
    })

    it("can get terrain information at a given coordinate", () => {
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })

        let hexMovementType: HexGridMovementCost
        hexMovementType = missionMap.getHexGridMovementAtLocation({
            q: 0,
            r: 2,
        })
        expect(hexMovementType).toBe(HexGridMovementCost.doubleMovement)

        hexMovementType = missionMap.getHexGridMovementAtLocation({
            q: 0,
            r: 0,
        })
        expect(hexMovementType).toBe(HexGridMovementCost.singleMovement)

        hexMovementType = missionMap.getHexGridMovementAtLocation({
            q: 0,
            r: -4,
        })
        expect(hexMovementType).toBeUndefined()
    })

    it("can get all squaddies without a location", () => {
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })

        missionMap.addSquaddie("static_squaddie_0", "dynamic_squaddie_0")
        missionMap.addSquaddie("static_squaddie_0", "dynamic_squaddie_0_1")
        missionMap.addSquaddie("static_squaddie_1", "dynamic_squaddie_1")
        missionMap.addSquaddie(
            "static_squaddie_with_location",
            "dynamic_squaddie_with_location",
            {
                q: 0,
                r: 0,
            }
        )

        const squaddieData: MissionMapSquaddieLocation[] =
            missionMap.getSquaddiesThatHaveNoLocation()

        expect(squaddieData).toHaveLength(3)
        expect(squaddieData).toContainEqual({
            squaddieTemplateId: "static_squaddie_0",
            battleSquaddieId: "dynamic_squaddie_0",
            mapLocation: undefined,
        })
        expect(squaddieData).toContainEqual({
            squaddieTemplateId: "static_squaddie_0",
            battleSquaddieId: "dynamic_squaddie_0_1",
            mapLocation: undefined,
        })
        expect(squaddieData).toContainEqual({
            squaddieTemplateId: "static_squaddie_1",
            battleSquaddieId: "dynamic_squaddie_1",
            mapLocation: undefined,
        })
    })

    it("can move a squaddie by updating its position via class method", () => {
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })

        missionMap.addSquaddie(
            torrinSquaddie.templateId,
            "dynamic_squaddie_0",
            { q: 0, r: 1 }
        )
        missionMap.updateSquaddieLocation("dynamic_squaddie_0", { q: 0, r: 0 })

        expect(
            missionMap.getSquaddieAtLocation({
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
                missionMap.getSquaddieAtLocation({ q: 0, r: 1 })
            )
        ).toBeFalsy()
    })

    it("can move a squaddie by updating its position", () => {
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie(
            missionMap,
            torrinSquaddie.templateId,
            "dynamic_squaddie_0",
            { q: 0, r: 1 }
        )
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
                missionMap.getSquaddieAtLocation({ q: 0, r: 1 })
            )
        ).toBeFalsy()
    })

    it("can move a squaddie off the map", () => {
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })

        missionMap.addSquaddie(
            torrinSquaddie.templateId,
            "dynamic_squaddie_0",
            { q: 0, r: 1 }
        )
        missionMap.updateSquaddieLocation("dynamic_squaddie_0", undefined)

        expect(missionMap.getSquaddiesThatHaveNoLocation()).toStrictEqual([
            {
                battleSquaddieId: "dynamic_squaddie_0",
                squaddieTemplateId: torrinSquaddie.templateId,
                mapLocation: undefined,
            },
        ])
        expect(
            MissionMapSquaddieLocationService.isValid(
                missionMap.getSquaddieAtLocation({ q: 0, r: 1 })
            )
        ).toBeFalsy()
    })

    it("should raise an error if you try to move a squaddie that does not exist", () => {
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })

        let error: Error
        error = missionMap.updateSquaddieLocation("does not exist", undefined)

        expect(error).toEqual(expect.any(Error))
        expect((error as Error).message.includes(`does not exist`)).toBeTruthy()
    })

    it("should raise an error if moving a squaddie to a location not on the map", () => {
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })

        missionMap.addSquaddie(
            torrinSquaddie.templateId,
            "dynamic_squaddie_0",
            { q: 0, r: 1 }
        )

        let error: Error
        error = missionMap.updateSquaddieLocation("dynamic_squaddie_0", {
            q: 999,
            r: 999,
        })

        expect(error).toEqual(expect.any(Error))
        expect((error as Error).message.includes(`is not on map`)).toBeTruthy()
    })

    it("should raise an error if occupied by another squaddie", () => {
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })

        missionMap.addSquaddie("static_squaddie_0", "dynamic_squaddie_0", {
            q: 0,
            r: 1,
        })
        let e = missionMap.addSquaddie(
            "static_squaddie_1",
            "dynamic_squaddie_1",
            { q: 0, r: 0 }
        )
        expect(e).toBeUndefined()

        let error: Error
        error = missionMap.updateSquaddieLocation("dynamic_squaddie_1", {
            q: 0,
            r: 1,
        })

        expect(error).toEqual(expect.any(Error))
        expect(
            (error as Error).message.includes(`already occupied`)
        ).toBeTruthy()
    })

    it("should not raise an error if squaddie position is updated to its original location", () => {
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })

        missionMap.addSquaddie("static_squaddie_0", "dynamic_squaddie_0", {
            q: 0,
            r: 1,
        })

        let error: Error
        error = missionMap.updateSquaddieLocation("dynamic_squaddie_0", {
            q: 0,
            r: 1,
        })
        expect(error).toBeUndefined()
    })

    it("should be able to return a copy of all squaddie data", () => {
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })

        missionMap.addSquaddie("static_0", "dynamic_0", { q: 0, r: 2 })
        missionMap.addSquaddie("static_0", "dynamic_1", { q: 0, r: 1 })
        missionMap.addSquaddie("static_1", "dynamic_2", { q: 0, r: 0 })

        const actualSquaddieData: MissionMapSquaddieLocation[] =
            missionMap.getAllSquaddieData()

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

    it("can find all squaddies by their static id", () => {
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })
        missionMap.addSquaddie("static_squaddie_0", "dynamic_squaddie_0")
        missionMap.addSquaddie("static_squaddie_0", "dynamic_squaddie_0_1")
        missionMap.addSquaddie("static_squaddie_1", "dynamic_squaddie_1")
        missionMap.addSquaddie(
            "static_squaddie_with_location",
            "dynamic_squaddie_with_location",
            {
                q: 0,
                r: 0,
            }
        )

        const squaddieTemplate0: MissionMapSquaddieLocation[] =
            missionMap.getSquaddiesByTemplateId("static_squaddie_0")
        expect(squaddieTemplate0).toHaveLength(2)
        expect(squaddieTemplate0).toContainEqual({
            squaddieTemplateId: "static_squaddie_0",
            battleSquaddieId: "dynamic_squaddie_0",
            mapLocation: undefined,
        })
        expect(squaddieTemplate0).toContainEqual({
            squaddieTemplateId: "static_squaddie_0",
            battleSquaddieId: "dynamic_squaddie_0_1",
            mapLocation: undefined,
        })

        const squaddieTemplateWithLocation: MissionMapSquaddieLocation[] =
            missionMap.getSquaddiesByTemplateId("static_squaddie_with_location")
        expect(squaddieTemplateWithLocation).toHaveLength(1)
        expect(squaddieTemplateWithLocation).toContainEqual({
            squaddieTemplateId: "static_squaddie_with_location",
            battleSquaddieId: "dynamic_squaddie_with_location",
            mapLocation: { q: 0, r: 0 },
        })

        const doesNotExist: MissionMapSquaddieLocation[] =
            missionMap.getSquaddiesByTemplateId("does not exist")
        expect(doesNotExist).toHaveLength(0)
    })

    it("can draw and hide squaddies from the map", () => {
        const missionMap = new MissionMap({
            terrainTileMap: map,
        })
        const battleSquaddieId = "dynamic_squaddie_0"
        missionMap.addSquaddie("static_squaddie_0", battleSquaddieId)

        expect(
            missionMap.isSquaddieHiddenFromDrawing(battleSquaddieId)
        ).toBeFalsy()
        missionMap.hideSquaddieFromDrawing(battleSquaddieId)
        expect(
            missionMap.isSquaddieHiddenFromDrawing(battleSquaddieId)
        ).toBeTruthy()
        missionMap.revealSquaddieForDrawing(battleSquaddieId)
        expect(
            missionMap.isSquaddieHiddenFromDrawing(battleSquaddieId)
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
