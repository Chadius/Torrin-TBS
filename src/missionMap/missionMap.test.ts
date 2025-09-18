import { TerrainTileMap, TerrainTileMapService } from "../hexMap/terrainTileMap"
import { SquaddieId } from "../squaddie/id"
import { TraitStatusStorageService } from "../trait/traitStatusStorage"
import { MissionMapService } from "./missionMap"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import {
    MissionMapSquaddieCoordinate,
    MissionMapSquaddieCoordinateService,
} from "./squaddieCoordinate"
import { beforeEach, describe, expect, it } from "vitest"
import { HexCoordinateService } from "../hexMap/hexCoordinate/hexCoordinate"

describe("Mission Map", () => {
    let map: TerrainTileMap
    let nahlaSquaddie: SquaddieId
    beforeEach(() => {
        map = TerrainTileMapService.new({
            movementCost: ["1 1 2 "],
        })

        nahlaSquaddie = {
            name: "Nahla",
            templateId: "000",
            resources: {
                mapIconResourceKey: "map_icon_nahla",
                actionSpritesByEmotion: {},
            },
            traits: TraitStatusStorageService.newUsingTraitValues(),
            affiliation: SquaddieAffiliation.PLAYER,
        }
    })

    it("can add a squaddie and report its coordinate", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: nahlaSquaddie.templateId,
            originMapCoordinate: { q: 0, r: 2 },
        })

        let {
            currentMapCoordinate: squaddieMapCoordinate,
            squaddieTemplateId,
        } = MissionMapService.getByBattleSquaddieId(
            missionMap,
            "dynamic_squaddie_0"
        )
        expect(squaddieTemplateId).toBe(nahlaSquaddie.templateId)
        expect(squaddieMapCoordinate?.q).toBe(0)
        expect(squaddieMapCoordinate?.r).toBe(2)
        ;({ originMapCoordinate: squaddieMapCoordinate, squaddieTemplateId } =
            MissionMapService.getByBattleSquaddieId(
                missionMap,
                "dynamic_squaddie_0"
            ))
        expect(squaddieTemplateId).toBe(nahlaSquaddie.templateId)
        expect(squaddieMapCoordinate?.q).toBe(0)
        expect(squaddieMapCoordinate?.r).toBe(2)
    })

    it("can add a squaddie without a coordinate", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: nahlaSquaddie.templateId,
        })

        const {
            currentMapCoordinate: squaddieMapCoordinate,
            squaddieTemplateId,
        } = MissionMapService.getByBattleSquaddieId(
            missionMap,
            "dynamic_squaddie_0"
        )
        expect(squaddieTemplateId).toBe(nahlaSquaddie.templateId)
        expect(squaddieMapCoordinate).toBeUndefined()
    })

    it("will return undefined if it cannot find a squaddie", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        const { currentMapCoordinate, squaddieTemplateId, battleSquaddieId } =
            MissionMapService.getByBattleSquaddieId(
                missionMap,
                "dynamic_squaddie_0"
            )
        expect(squaddieTemplateId).toBeUndefined()
        expect(battleSquaddieId).toBeUndefined()
        expect(currentMapCoordinate).toBeUndefined()
    })

    it("cannot add a squaddie to a coordinate that is already occupied", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        let error: Error | undefined
        error = MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: nahlaSquaddie.templateId,
            originMapCoordinate: { q: 0, r: 2 },
        })
        expect(error).toBeUndefined()

        error = MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_1",
            squaddieTemplateId: nahlaSquaddie.templateId,
            originMapCoordinate: { q: 0, r: 2 },
        })
        expect(error).toEqual(expect.any(Error))
        expect(
            (error as Error).message.includes("already occupied")
        ).toBeTruthy()

        error = MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_1",
            squaddieTemplateId: nahlaSquaddie.templateId,
            originMapCoordinate: { q: 0, r: 0 },
        })

        expect(error).toBeUndefined()
    })

    it("will raise an error if you add the same dynamic squaddie twice", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        let error: Error | undefined
        error = MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: nahlaSquaddie.templateId,
        })
        expect(error).toBeUndefined()

        error = MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: nahlaSquaddie.templateId,
        })

        expect(error).toEqual(expect.any(Error))
        expect((error as Error).message.includes("already added")).toBeTruthy()

        error = MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "different_dynamic_squaddie_0",
            squaddieTemplateId: nahlaSquaddie.templateId,
        })
        expect(error).toBeUndefined()
    })

    it("will raise an error if the squaddie is added to an off map coordinate", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        let error: Error | undefined
        error = MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: nahlaSquaddie.templateId,
            originMapCoordinate: { q: -999, r: 999 },
        })
        expect(error).toEqual(expect.any(Error))
        expect((error as Error).message.includes("is not on map")).toBeTruthy()
    })

    it("can see what is at a given coordinate", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: nahlaSquaddie.templateId,
            originMapCoordinate: { q: 0, r: 2 },
        })

        const {
            currentMapCoordinate: squaddieMapCoordinate,
            squaddieTemplateId,
            battleSquaddieId,
        } = MissionMapService.getBattleSquaddieAtCoordinate(missionMap, {
            q: 0,
            r: 2,
        })

        expect(squaddieTemplateId).toBe(nahlaSquaddie.templateId)
        expect(battleSquaddieId).toBe("dynamic_squaddie_0")
        expect(squaddieMapCoordinate?.q).toBe(0)
        expect(squaddieMapCoordinate?.r).toBe(2)

        const noDatumFound = MissionMapService.getBattleSquaddieAtCoordinate(
            missionMap,
            {
                q: 0,
                r: 0,
            }
        )
        expect(
            MissionMapSquaddieCoordinateService.isValid(noDatumFound)
        ).toBeFalsy()
    })

    it("can move a squaddie by updating its position via class method", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: nahlaSquaddie.templateId,
            originMapCoordinate: { q: 0, r: 1 },
        })
        MissionMapService.updateBattleSquaddieCoordinate({
            missionMap: missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            coordinate: {
                q: 0,
                r: 0,
            },
        })

        const battleSquaddieId = "dynamic_squaddie_0"
        expect(
            MissionMapService.getBattleSquaddieAtCoordinate(missionMap, {
                q: 0,
                r: 0,
            })
        ).toStrictEqual({
            battleSquaddieId: battleSquaddieId,
            squaddieTemplateId: nahlaSquaddie.templateId,
            originMapCoordinate: { q: 0, r: 1 },
            currentMapCoordinate: { q: 0, r: 0 },
        })
        expect(
            MissionMapSquaddieCoordinateService.isValid(
                MissionMapService.getBattleSquaddieAtCoordinate(missionMap, {
                    q: 0,
                    r: 1,
                })
            )
        ).toBeFalsy()

        MissionMapService.setOriginMapCoordinateToCurrentMapCoordinate(
            missionMap,
            battleSquaddieId
        )
        const coordinateInfo = MissionMapService.getByBattleSquaddieId(
            missionMap,
            battleSquaddieId
        )
        expect(
            HexCoordinateService.areEqual(
                coordinateInfo.originMapCoordinate,
                coordinateInfo.currentMapCoordinate
            )
        ).toBeTruthy()
    })

    it("can move a squaddie off the map", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: nahlaSquaddie.templateId,
            originMapCoordinate: { q: 0, r: 1 },
        })
        MissionMapService.updateBattleSquaddieCoordinate({
            missionMap: missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            coordinate: undefined,
        })

        const offMapSquaddieInfo =
            missionMap.squaddieInfoByBattleSquaddieId.get("dynamic_squaddie_0")
        expect(offMapSquaddieInfo).toEqual({
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: nahlaSquaddie.templateId,
            originMapCoordinate: { q: 0, r: 1 },
            currentMapCoordinate: undefined,
        })
        expect(
            missionMap.squaddieInfoByCoordinate.has(
                HexCoordinateService.toString(
                    offMapSquaddieInfo?.originMapCoordinate
                )
            )
        ).toBeFalsy()

        expect(
            MissionMapSquaddieCoordinateService.isValid(
                MissionMapService.getBattleSquaddieAtCoordinate(missionMap, {
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

        let error: Error | undefined
        error = MissionMapService.updateBattleSquaddieCoordinate({
            missionMap: missionMap,
            battleSquaddieId: "does not exist",
            coordinate: undefined,
        })

        expect(error).toEqual(expect.any(Error))
        expect((error as Error).message.includes(`does not exist`)).toBeTruthy()
    })

    it("should raise an error if moving a squaddie to a coordinate not on the map", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: nahlaSquaddie.templateId,
            originMapCoordinate: { q: 0, r: 1 },
        })

        let error: Error | undefined
        error = MissionMapService.updateBattleSquaddieCoordinate({
            missionMap: missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            coordinate: {
                q: 999,
                r: 999,
            },
        })

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
            originMapCoordinate: { q: 0, r: 1 },
        })

        let e = MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_1",
            squaddieTemplateId: "static_squaddie_1",
            originMapCoordinate: { q: 0, r: 0 },
        })
        expect(e).toBeUndefined()

        let error: Error | undefined
        error = MissionMapService.updateBattleSquaddieCoordinate({
            missionMap: missionMap,
            battleSquaddieId: "dynamic_squaddie_1",
            coordinate: {
                q: 0,
                r: 1,
            },
        })

        expect(error).toEqual(expect.any(Error))
        expect(
            (error as Error).message.includes(`already occupied`)
        ).toBeTruthy()
    })

    it("should not raise an error if squaddie position is updated to its original coordinate", () => {
        const missionMap = MissionMapService.new({
            terrainTileMap: map,
        })

        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            squaddieTemplateId: "static_squaddie_0",
            originMapCoordinate: { q: 0, r: 1 },
        })

        let error: Error | undefined
        error = MissionMapService.updateBattleSquaddieCoordinate({
            missionMap: missionMap,
            battleSquaddieId: "dynamic_squaddie_0",
            coordinate: {
                q: 0,
                r: 1,
            },
        })
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
            originMapCoordinate: { q: 0, r: 2 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_1",
            squaddieTemplateId: "static_0",
            originMapCoordinate: { q: 0, r: 1 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: "dynamic_2",
            squaddieTemplateId: "static_1",
            originMapCoordinate: { q: 0, r: 0 },
        })

        const actualSquaddieData: MissionMapSquaddieCoordinate[] =
            MissionMapService.getAllSquaddieData(missionMap)

        expect(actualSquaddieData).toHaveLength(3)
        expect(actualSquaddieData).toContainEqual({
            squaddieTemplateId: "static_0",
            battleSquaddieId: "dynamic_0",
            originMapCoordinate: { q: 0, r: 2 },
            currentMapCoordinate: { q: 0, r: 2 },
        })
        expect(actualSquaddieData).toContainEqual({
            squaddieTemplateId: "static_0",
            battleSquaddieId: "dynamic_1",
            originMapCoordinate: { q: 0, r: 1 },
            currentMapCoordinate: { q: 0, r: 1 },
        })
        expect(actualSquaddieData).toContainEqual({
            squaddieTemplateId: "static_1",
            battleSquaddieId: "dynamic_2",
            originMapCoordinate: { q: 0, r: 0 },
            currentMapCoordinate: { q: 0, r: 0 },
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

    it("can create mission map coordinates using data", () => {
        const coordinate: MissionMapSquaddieCoordinate = {
            battleSquaddieId: "battle",
            squaddieTemplateId: "template",
            currentMapCoordinate: { q: 3, r: 8 },
            originMapCoordinate: { q: 1, r: 8 },
        }

        expect(coordinate.battleSquaddieId).toBe("battle")
        expect(coordinate.squaddieTemplateId).toBe("template")
        expect(coordinate.currentMapCoordinate).toStrictEqual({ q: 3, r: 8 })
        expect(coordinate.originMapCoordinate).toStrictEqual({ q: 1, r: 8 })
    })
})
