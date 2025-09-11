import { beforeEach, describe, expect, it } from "vitest"
import { SearchResult } from "../../searchResults/searchResult"
import { MapSearchService } from "../mapSearch"
import { MapSearchTestUtils } from "./mapSearchTestUtils"
import { SearchLimitService } from "../searchLimit"
import {
    MissionMap,
    MissionMapService,
} from "../../../../missionMap/missionMap"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../../battle/objectRepository"
import {
    SquaddieAffiliation,
    TSquaddieAffiliation,
} from "../../../../squaddie/squaddieAffiliation"
import { SquaddieRepositoryService } from "../../../../utils/test/squaddie"
import { getResultOrThrowError } from "../../../../utils/resultOrError"
import { InBattleAttributesService } from "../../../../battle/stats/inBattleAttributes"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../../../squaddie/attribute/attributeModifier"
import { Attribute } from "../../../../squaddie/attribute/attribute"
import { ArmyAttributesService } from "../../../../squaddie/armyAttributes"
import { SquaddieMovementService } from "../../../../squaddie/movement"
import { SearchResultAdapterService } from "../../searchResults/searchResultAdapter"
import {
    SearchPathAdapter,
    SearchPathAdapterService,
} from "../../../../search/searchPathAdapter/searchPathAdapter"

describe("mapSearch", () => {
    describe("calculateAllPossiblePathsFromStartingCoordinate", () => {
        let objectRepository: ObjectRepository
        beforeEach(() => {
            objectRepository = ObjectRepositoryService.new()
        })

        describe("searching while paying attention to terrain costs have the correct movement costs", () => {
            let searchResults: SearchResult
            let missionMap: MissionMap

            beforeEach(() => {
                missionMap =
                    MapSearchTestUtils.create1row6columnsWithAlternatingRoughTerrain()
                searchResults =
                    MapSearchService.calculateAllPossiblePathsFromStartingCoordinate(
                        {
                            missionMap,
                            originMapCoordinate: { q: 0, r: 0 },
                            currentMapCoordinate: { q: 0, r: 0 },
                            searchLimit: SearchLimitService.landBasedMovement(),
                            objectRepository,
                        }
                    )
            })

            const reachablePathTests = [
                {
                    mapCoordinate: { q: 0, r: 0 },
                    expectedTotalMovementCost: 0,
                    expectedNumberOfCoordinates: 0,
                },
                {
                    mapCoordinate: { q: 0, r: 1 },
                    expectedTotalMovementCost: 1,
                    expectedNumberOfCoordinates: 1,
                },
                {
                    mapCoordinate: { q: 0, r: 2 },
                    expectedTotalMovementCost: 3,
                    expectedNumberOfCoordinates: 2,
                },
                {
                    mapCoordinate: { q: 0, r: 3 },
                    expectedTotalMovementCost: 4,
                    expectedNumberOfCoordinates: 3,
                },
                {
                    mapCoordinate: { q: 0, r: 4 },
                    expectedTotalMovementCost: 6,
                    expectedNumberOfCoordinates: 4,
                },
                {
                    mapCoordinate: { q: 0, r: 5 },
                    expectedTotalMovementCost: 7,
                    expectedNumberOfCoordinates: 5,
                },
            ]

            it.each(reachablePathTests)(
                `$mapCoordinate`,
                ({
                    mapCoordinate,
                    expectedNumberOfCoordinates,
                    expectedTotalMovementCost,
                }) => {
                    expect(
                        MapSearchTestUtils.expectPathExistsWithExpectedDistanceAndCost(
                            {
                                mapCoordinate,
                                numberOfCoordinates:
                                    expectedNumberOfCoordinates,
                                expectedTotalMovementCost,
                                searchResults,
                            }
                        )
                    ).toBeTruthy()
                }
            )

            describe("Correctly calculates movement actions", () => {
                beforeEach(() => {
                    SquaddieRepositoryService.createNewSquaddieAndAddToRepository(
                        {
                            objectRepository,
                            affiliation: SquaddieAffiliation.PLAYER,
                            battleId: "searchingSquaddieBattleSquaddieId",
                            templateId: "searchingSquaddieSquaddieTemplateId",
                            name: "searchingSquaddie",
                            actionTemplateIds: [],
                            attributes: ArmyAttributesService.new({
                                movement: SquaddieMovementService.new({
                                    movementPerAction: 2,
                                }),
                            }),
                        }
                    )
                    MissionMapService.addSquaddie({
                        missionMap,
                        battleSquaddieId: "searchingSquaddieBattleSquaddieId",
                        squaddieTemplateId:
                            "searchingSquaddieSquaddieTemplateId",
                        originMapCoordinate: { q: 0, r: 0 },
                    })
                    searchResults =
                        MapSearchService.calculateAllPossiblePathsFromStartingCoordinate(
                            {
                                missionMap,
                                originMapCoordinate: { q: 0, r: 0 },
                                currentMapCoordinate: { q: 0, r: 0 },
                                searchLimit:
                                    SearchLimitService.landBasedMovement(),
                                objectRepository,
                            }
                        )
                })

                const reachablePathTests = [
                    {
                        mapCoordinate: { q: 0, r: 0 },
                        expectedMovementActions: 0,
                    },
                    {
                        mapCoordinate: { q: 0, r: 1 },
                        expectedMovementActions: 1,
                    },
                    {
                        mapCoordinate: { q: 0, r: 2 },
                        expectedMovementActions: 2,
                    },
                    {
                        mapCoordinate: { q: 0, r: 3 },
                        expectedMovementActions: 2,
                    },
                    {
                        mapCoordinate: { q: 0, r: 4 },
                        expectedMovementActions: 3,
                    },
                    {
                        mapCoordinate: { q: 0, r: 5 },
                        expectedMovementActions: 4,
                    },
                ]

                it.each(reachablePathTests)(
                    `$mapCoordinate costs $expectedMovementActions`,
                    ({ mapCoordinate, expectedMovementActions }) => {
                        const path: SearchPathAdapter =
                            SearchResultAdapterService.getShortestPathToCoordinate(
                                {
                                    searchResults: searchResults,
                                    mapCoordinate,
                                }
                            )
                        expect(
                            SearchPathAdapterService.getNumberOfMoveActions({
                                path,
                                movementPerAction: 2,
                            })
                        ).toEqual(expectedMovementActions)
                    }
                )
            })
        })

        describe("searching while crossing pits and passing through walls", () => {
            let cannotPassSearchResults: SearchResult
            let crossOverPitsSearchResults: SearchResult
            let passThroughWallsSearchResults: SearchResult

            beforeEach(() => {
                cannotPassSearchResults =
                    MapSearchService.calculateAllPossiblePathsFromStartingCoordinate(
                        {
                            missionMap:
                                MapSearchTestUtils.create1row5columnsWithPitAndWall(),
                            originMapCoordinate: { q: 0, r: 0 },
                            currentMapCoordinate: { q: 0, r: 0 },
                            searchLimit: SearchLimitService.landBasedMovement(),
                            objectRepository,
                        }
                    )
                crossOverPitsSearchResults =
                    MapSearchService.calculateAllPossiblePathsFromStartingCoordinate(
                        {
                            missionMap:
                                MapSearchTestUtils.create1row5columnsWithPitAndWall(),
                            originMapCoordinate: { q: 0, r: 0 },
                            currentMapCoordinate: { q: 0, r: 0 },
                            searchLimit: SearchLimitService.new({
                                baseSearchLimit:
                                    SearchLimitService.landBasedMovement(),
                                crossOverPits: true,
                            }),
                            objectRepository,
                        }
                    )
                passThroughWallsSearchResults =
                    MapSearchService.calculateAllPossiblePathsFromStartingCoordinate(
                        {
                            missionMap:
                                MapSearchTestUtils.create1row5columnsWithPitAndWall(),
                            originMapCoordinate: { q: 0, r: 0 },
                            currentMapCoordinate: { q: 0, r: 0 },
                            searchLimit: SearchLimitService.new({
                                baseSearchLimit:
                                    SearchLimitService.landBasedMovement(),
                                crossOverPits: true,
                                passThroughWalls: true,
                            }),
                            objectRepository,
                        }
                    )
            })

            describe("landBasedMovement", () => {
                const pathTests = {
                    coordinatesCanStopOn: [
                        {
                            mapCoordinate: { q: 0, r: 0 },
                        },
                    ],
                    coordinatesCannotStopOn: [
                        {
                            mapCoordinate: { q: 0, r: 1 },
                        },
                        {
                            mapCoordinate: { q: 0, r: 2 },
                        },
                        {
                            mapCoordinate: { q: 0, r: 3 },
                        },
                        {
                            mapCoordinate: { q: 0, r: 4 },
                        },
                    ],
                }

                describe("can stop on starting coordinate", () => {
                    it.each(pathTests.coordinatesCanStopOn)(
                        `$mapCoordinate`,
                        ({ mapCoordinate }) => {
                            expect(
                                MapSearchTestUtils.expectPathExists({
                                    mapCoordinate,
                                    searchResults: cannotPassSearchResults,
                                })
                            ).toBeTruthy()
                        }
                    )
                })

                describe("cannot cross over pit so cannot stop on other coordinates", () => {
                    it.each(pathTests.coordinatesCannotStopOn)(
                        `$mapCoordinate`,
                        ({ mapCoordinate }) => {
                            expect(
                                MapSearchTestUtils.expectPathDoesNotExist({
                                    mapCoordinate,
                                    searchResults: cannotPassSearchResults,
                                })
                            ).toBeTruthy()
                        }
                    )
                })
            })

            describe("can cross over pits but not through walls", () => {
                const pathTests = {
                    coordinatesCanStopOn: [
                        {
                            mapCoordinate: { q: 0, r: 0 },
                        },
                        {
                            mapCoordinate: { q: 0, r: 2 },
                        },
                    ],
                    coordinatesCannotStopOn: [
                        {
                            mapCoordinate: { q: 0, r: 1 },
                        },
                        {
                            mapCoordinate: { q: 0, r: 3 },
                        },
                        {
                            mapCoordinate: { q: 0, r: 4 },
                        },
                    ],
                }

                describe("can cross over pits to stop on coordinates past it", () => {
                    it.each(pathTests.coordinatesCanStopOn)(
                        `$mapCoordinate`,
                        ({ mapCoordinate }) => {
                            expect(
                                MapSearchTestUtils.expectPathExists({
                                    mapCoordinate,
                                    searchResults: crossOverPitsSearchResults,
                                })
                            ).toBeTruthy()
                        }
                    )
                })

                describe("can cross over pits but not pass through walls so cannot stop on other coordinates", () => {
                    it.each(pathTests.coordinatesCannotStopOn)(
                        `$mapCoordinate`,
                        ({ mapCoordinate }) => {
                            expect(
                                MapSearchTestUtils.expectPathDoesNotExist({
                                    mapCoordinate,
                                    searchResults: crossOverPitsSearchResults,
                                })
                            ).toBeTruthy()
                        }
                    )
                })
            })

            describe("can cross over pits and through walls", () => {
                const pathTests = {
                    coordinatesCanStopOn: [
                        {
                            mapCoordinate: { q: 0, r: 0 },
                        },
                        {
                            mapCoordinate: { q: 0, r: 2 },
                        },
                        {
                            mapCoordinate: { q: 0, r: 4 },
                        },
                    ],
                    coordinatesCannotStopOn: [
                        {
                            mapCoordinate: { q: 0, r: 1 },
                        },
                        {
                            mapCoordinate: { q: 0, r: 3 },
                        },
                    ],
                }

                describe("can stop after crossing pits and passing through walls", () => {
                    it.each(pathTests.coordinatesCanStopOn)(
                        `$mapCoordinate`,
                        ({ mapCoordinate }) => {
                            expect(
                                MapSearchTestUtils.expectPathExists({
                                    mapCoordinate,
                                    searchResults:
                                        passThroughWallsSearchResults,
                                })
                            ).toBeTruthy()
                        }
                    )
                })

                describe("can cross over pits and through walls but it cannot stop on them", () => {
                    it.each(pathTests.coordinatesCannotStopOn)(
                        `$mapCoordinate`,
                        ({ mapCoordinate }) => {
                            expect(
                                MapSearchTestUtils.expectPathDoesNotExist({
                                    mapCoordinate,
                                    searchResults:
                                        passThroughWallsSearchResults,
                                })
                            ).toBeTruthy()
                        }
                    )
                })
            })
        })

        describe("searching with maximum distance", () => {
            let searchResults: SearchResult
            beforeEach(() => {
                searchResults =
                    MapSearchService.calculateAllPossiblePathsFromStartingCoordinate(
                        {
                            missionMap:
                                MapSearchTestUtils.create1row5columnsAllFlatTerrain(),
                            originMapCoordinate: { q: 0, r: 0 },
                            currentMapCoordinate: { q: 0, r: 0 },
                            searchLimit: SearchLimitService.new({
                                baseSearchLimit: SearchLimitService.targeting(),
                                maximumDistance: 1,
                            }),
                            objectRepository,
                        }
                    )
            })

            const pathTests = {
                coordinatesCanStopOn: [
                    {
                        mapCoordinate: { q: 0, r: 0 },
                    },
                    {
                        mapCoordinate: { q: 0, r: 1 },
                    },
                ],
                coordinatesCannotStopOn: [
                    {
                        mapCoordinate: { q: 0, r: 2 },
                    },
                    {
                        mapCoordinate: { q: 0, r: 3 },
                    },
                    {
                        mapCoordinate: { q: 0, r: 4 },
                    },
                ],
            }

            describe("can stop on coordinates within melee range", () => {
                it.each(pathTests.coordinatesCanStopOn)(
                    `$mapCoordinate`,
                    ({ mapCoordinate }) => {
                        expect(
                            MapSearchTestUtils.expectPathExists({
                                mapCoordinate,
                                searchResults,
                            })
                        ).toBeTruthy()
                    }
                )
            })

            describe("cannot reach beyond melee range so it cannot stop on those coordinates", () => {
                it.each(pathTests.coordinatesCannotStopOn)(
                    `$mapCoordinate`,
                    ({ mapCoordinate }) => {
                        expect(
                            MapSearchTestUtils.expectPathDoesNotExist({
                                mapCoordinate,
                                searchResults,
                            })
                        ).toBeTruthy()
                    }
                )
            })
        })

        describe("searching with minimum distance", () => {
            let searchResults: SearchResult
            beforeEach(() => {
                searchResults =
                    MapSearchService.calculateAllPossiblePathsFromStartingCoordinate(
                        {
                            missionMap:
                                MapSearchTestUtils.create1row5columnsAllFlatTerrain(),
                            originMapCoordinate: { q: 0, r: 0 },
                            currentMapCoordinate: { q: 0, r: 0 },
                            searchLimit: SearchLimitService.new({
                                baseSearchLimit: SearchLimitService.targeting(),
                                minimumDistance: 1,
                            }),
                            objectRepository,
                        }
                    )
            })

            const pathTests = {
                coordinatesCanStopOn: [
                    {
                        mapCoordinate: { q: 0, r: 1 },
                    },
                    {
                        mapCoordinate: { q: 0, r: 2 },
                    },
                    {
                        mapCoordinate: { q: 0, r: 3 },
                    },
                    {
                        mapCoordinate: { q: 0, r: 4 },
                    },
                ],
                coordinatesCannotStopOn: [
                    {
                        mapCoordinate: { q: 0, r: 0 },
                    },
                ],
            }

            describe("can reach long distance locations", () => {
                it.each(pathTests.coordinatesCanStopOn)(
                    `$mapCoordinate`,
                    ({ mapCoordinate }) => {
                        expect(
                            MapSearchTestUtils.expectPathExists({
                                mapCoordinate,
                                searchResults,
                            })
                        ).toBeTruthy()
                    }
                )
            })

            describe("cannot stop in melee range", () => {
                it.each(pathTests.coordinatesCannotStopOn)(
                    `$mapCoordinate`,
                    ({ mapCoordinate }) => {
                        expect(
                            MapSearchTestUtils.expectPathDoesNotExist({
                                mapCoordinate,
                                searchResults,
                            })
                        ).toBeTruthy()
                    }
                )
            })
        })

        describe("searching with maximum movement cost", () => {
            let searchResults: SearchResult

            beforeEach(() => {
                searchResults =
                    MapSearchService.calculateAllPossiblePathsFromStartingCoordinate(
                        {
                            missionMap:
                                MapSearchTestUtils.create1row6columnsWithAlternatingRoughTerrain(),
                            originMapCoordinate: { q: 0, r: 0 },
                            currentMapCoordinate: { q: 0, r: 0 },
                            searchLimit: SearchLimitService.new({
                                baseSearchLimit:
                                    SearchLimitService.landBasedMovement(),
                                maximumMovementCost: 3,
                            }),
                            objectRepository,
                        }
                    )
            })

            const pathTests = {
                coordinatesCanStopOn: [
                    {
                        mapCoordinate: { q: 0, r: 0 },
                    },
                    {
                        mapCoordinate: { q: 0, r: 1 },
                    },
                    {
                        mapCoordinate: { q: 0, r: 2 },
                    },
                ],
                coordinatesCannotStopOn: [
                    {
                        mapCoordinate: { q: 0, r: 3 },
                    },
                    {
                        mapCoordinate: { q: 0, r: 4 },
                    },
                ],
            }

            describe("can stop on coordinates within 3 movement cost", () => {
                it.each(pathTests.coordinatesCanStopOn)(
                    `$mapCoordinate`,
                    ({ mapCoordinate }) => {
                        expect(
                            MapSearchTestUtils.expectPathExists({
                                mapCoordinate,
                                searchResults,
                            })
                        ).toBeTruthy()
                    }
                )
            })

            describe("cannot reach 3rd tile because Rough terrain cost too much Movement Cost", () => {
                it.each(pathTests.coordinatesCannotStopOn)(
                    `$mapCoordinate`,
                    ({ mapCoordinate }) => {
                        expect(
                            MapSearchTestUtils.expectPathDoesNotExist({
                                mapCoordinate,
                                searchResults,
                            })
                        ).toBeTruthy()
                    }
                )
            })
        })

        describe("can pass through allied squaddies but cannot stop on them", () => {
            let missionMap: MissionMap

            beforeEach(() => {
                missionMap =
                    MapSearchTestUtils.create1row5columnsAllFlatTerrain()
            })

            const createSquaddiesAndAddToMap = (
                searchingSquaddieAffiliation: TSquaddieAffiliation,
                blockingSquaddieAffiliation: TSquaddieAffiliation
            ) => {
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    objectRepository,
                    affiliation: searchingSquaddieAffiliation,
                    battleId: "searchingSquaddieBattleSquaddieId",
                    templateId: "searchingSquaddieSquaddieTemplateId",
                    name: "searchingSquaddie",
                    actionTemplateIds: [],
                })
                MissionMapService.addSquaddie({
                    missionMap,
                    battleSquaddieId: "searchingSquaddieBattleSquaddieId",
                    squaddieTemplateId: "searchingSquaddieSquaddieTemplateId",
                    originMapCoordinate: { q: 0, r: 0 },
                })

                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    objectRepository,
                    affiliation: blockingSquaddieAffiliation,
                    battleId: "blockingSquaddieBattleSquaddieId",
                    templateId: "blockingSquaddieSquaddieTemplateId",
                    name: "blockingSquaddie",
                    actionTemplateIds: [],
                })
                MissionMapService.addSquaddie({
                    missionMap,
                    battleSquaddieId: "blockingSquaddieBattleSquaddieId",
                    squaddieTemplateId: "blockingSquaddieSquaddieTemplateId",
                    originMapCoordinate: { q: 0, r: 2 },
                })
            }

            const squaddiePassThroughTests = {
                canPassThrough: [
                    {
                        searchingSquaddieAffiliation:
                            SquaddieAffiliation.PLAYER,
                        blockingSquaddieAffiliation: SquaddieAffiliation.PLAYER,
                    },
                    {
                        searchingSquaddieAffiliation:
                            SquaddieAffiliation.PLAYER,
                        blockingSquaddieAffiliation: SquaddieAffiliation.ALLY,
                    },
                    {
                        searchingSquaddieAffiliation: SquaddieAffiliation.ENEMY,
                        blockingSquaddieAffiliation: SquaddieAffiliation.ENEMY,
                    },
                    {
                        searchingSquaddieAffiliation: SquaddieAffiliation.ALLY,
                        blockingSquaddieAffiliation: SquaddieAffiliation.ALLY,
                    },
                    {
                        searchingSquaddieAffiliation: SquaddieAffiliation.ALLY,
                        blockingSquaddieAffiliation: SquaddieAffiliation.PLAYER,
                    },
                ],
                cannotPassThrough: [
                    {
                        searchingSquaddieAffiliation:
                            SquaddieAffiliation.PLAYER,
                        blockingSquaddieAffiliation: SquaddieAffiliation.ENEMY,
                    },
                    {
                        searchingSquaddieAffiliation:
                            SquaddieAffiliation.PLAYER,
                        blockingSquaddieAffiliation: SquaddieAffiliation.NONE,
                    },
                    {
                        searchingSquaddieAffiliation: SquaddieAffiliation.ENEMY,
                        blockingSquaddieAffiliation: SquaddieAffiliation.PLAYER,
                    },
                    {
                        searchingSquaddieAffiliation: SquaddieAffiliation.ENEMY,
                        blockingSquaddieAffiliation: SquaddieAffiliation.ALLY,
                    },
                    {
                        searchingSquaddieAffiliation: SquaddieAffiliation.ENEMY,
                        blockingSquaddieAffiliation: SquaddieAffiliation.NONE,
                    },
                    {
                        searchingSquaddieAffiliation: SquaddieAffiliation.ALLY,
                        blockingSquaddieAffiliation: SquaddieAffiliation.ENEMY,
                    },
                    {
                        searchingSquaddieAffiliation: SquaddieAffiliation.ALLY,
                        blockingSquaddieAffiliation: SquaddieAffiliation.NONE,
                    },
                    {
                        searchingSquaddieAffiliation: SquaddieAffiliation.NONE,
                        blockingSquaddieAffiliation: SquaddieAffiliation.PLAYER,
                    },
                    {
                        searchingSquaddieAffiliation: SquaddieAffiliation.NONE,
                        blockingSquaddieAffiliation: SquaddieAffiliation.ALLY,
                    },
                    {
                        searchingSquaddieAffiliation: SquaddieAffiliation.NONE,
                        blockingSquaddieAffiliation: SquaddieAffiliation.ENEMY,
                    },
                    {
                        searchingSquaddieAffiliation: SquaddieAffiliation.NONE,
                        blockingSquaddieAffiliation: SquaddieAffiliation.NONE,
                    },
                ],
            }

            describe("will allow searching squaddie to pass through blocking squaddie because they are friendly", () => {
                it.each(squaddiePassThroughTests.canPassThrough)(
                    `$searchingSquaddieAffiliation $blockingSquaddieAffiliation`,
                    ({
                        searchingSquaddieAffiliation,
                        blockingSquaddieAffiliation,
                    }) => {
                        createSquaddiesAndAddToMap(
                            searchingSquaddieAffiliation,
                            blockingSquaddieAffiliation
                        )
                        const searchResults =
                            MapSearchService.calculateAllPossiblePathsFromStartingCoordinate(
                                {
                                    missionMap,
                                    originMapCoordinate: { q: 0, r: 0 },
                                    currentMapCoordinate: { q: 0, r: 0 },
                                    searchLimit: SearchLimitService.new({
                                        baseSearchLimit:
                                            SearchLimitService.landBasedMovement(),
                                        squaddieAffiliation:
                                            searchingSquaddieAffiliation,
                                    }),
                                    objectRepository,
                                }
                            )
                        expect(
                            MapSearchTestUtils.expectPathExists({
                                searchResults,
                                mapCoordinate: { q: 0, r: 3 },
                            })
                        ).toBeTruthy()
                    }
                )
            })

            describe("blocking squaddie will block the searching squaddie because they are not friends", () => {
                it.each(squaddiePassThroughTests.cannotPassThrough)(
                    `$searchingSquaddieAffiliation $blockingSquaddieAffiliation`,
                    ({
                        searchingSquaddieAffiliation,
                        blockingSquaddieAffiliation,
                    }) => {
                        createSquaddiesAndAddToMap(
                            searchingSquaddieAffiliation,
                            blockingSquaddieAffiliation
                        )
                        const searchResults =
                            MapSearchService.calculateAllPossiblePathsFromStartingCoordinate(
                                {
                                    missionMap,
                                    originMapCoordinate: { q: 0, r: 0 },
                                    currentMapCoordinate: { q: 0, r: 0 },
                                    searchLimit: SearchLimitService.new({
                                        baseSearchLimit:
                                            SearchLimitService.landBasedMovement(),
                                        squaddieAffiliation:
                                            searchingSquaddieAffiliation,
                                    }),
                                    objectRepository,
                                }
                            )
                        expect(
                            MapSearchTestUtils.expectPathDoesNotExist({
                                searchResults,
                                mapCoordinate: { q: 0, r: 3 },
                            })
                        ).toBeTruthy()
                    }
                )
            })

            describe("searching squaddie has the Elusive modifier, so the blocking squaddie cannot block even if they are not friends", () => {
                it.each(squaddiePassThroughTests.cannotPassThrough)(
                    `$searchingSquaddieAffiliation $blockingSquaddieAffiliation`,
                    ({
                        searchingSquaddieAffiliation,
                        blockingSquaddieAffiliation,
                    }) => {
                        createSquaddiesAndAddToMap(
                            searchingSquaddieAffiliation,
                            blockingSquaddieAffiliation
                        )

                        const { battleSquaddie } = getResultOrThrowError(
                            ObjectRepositoryService.getSquaddieByBattleId(
                                objectRepository,
                                "searchingSquaddieBattleSquaddieId"
                            )
                        )
                        InBattleAttributesService.addActiveAttributeModifier(
                            battleSquaddie.inBattleAttributes,
                            AttributeModifierService.new({
                                type: Attribute.ELUSIVE,
                                duration: 1,
                                amount: 1,
                                source: AttributeSource.CIRCUMSTANCE,
                            })
                        )

                        const searchResults =
                            MapSearchService.calculateAllPossiblePathsFromStartingCoordinate(
                                {
                                    missionMap,
                                    originMapCoordinate: { q: 0, r: 0 },
                                    currentMapCoordinate: { q: 0, r: 0 },
                                    searchLimit: SearchLimitService.new({
                                        baseSearchLimit:
                                            SearchLimitService.landBasedMovement(),
                                        squaddieAffiliation:
                                            searchingSquaddieAffiliation,
                                    }),
                                    objectRepository,
                                }
                            )
                        expect(
                            MapSearchTestUtils.expectPathExists({
                                searchResults,
                                mapCoordinate: { q: 0, r: 3 },
                            })
                        ).toBeTruthy()
                    }
                )
            })

            describe("cannot stop on another squaddie", () => {
                it.each([
                    ...squaddiePassThroughTests.canPassThrough,
                    ...squaddiePassThroughTests.cannotPassThrough,
                ])(
                    `$searchingSquaddieAffiliation $blockingSquaddieAffiliation`,
                    ({
                        searchingSquaddieAffiliation,
                        blockingSquaddieAffiliation,
                    }) => {
                        createSquaddiesAndAddToMap(
                            searchingSquaddieAffiliation,
                            blockingSquaddieAffiliation
                        )
                        const searchResults =
                            MapSearchService.calculateAllPossiblePathsFromStartingCoordinate(
                                {
                                    missionMap,
                                    originMapCoordinate: { q: 0, r: 0 },
                                    currentMapCoordinate: { q: 0, r: 0 },
                                    searchLimit: SearchLimitService.new({
                                        baseSearchLimit:
                                            SearchLimitService.landBasedMovement(),
                                        squaddieAffiliation:
                                            searchingSquaddieAffiliation,
                                    }),
                                    objectRepository,
                                }
                            )
                        expect(
                            MapSearchTestUtils.expectPathDoesNotExist({
                                searchResults,
                                mapCoordinate: { q: 0, r: 2 },
                            })
                        ).toBeTruthy()
                    }
                )
            })

            it("can stop on another squaddie if SearchLimit permits", () => {
                createSquaddiesAndAddToMap(
                    SquaddieAffiliation.PLAYER,
                    SquaddieAffiliation.PLAYER
                )
                const searchResults =
                    MapSearchService.calculateAllPossiblePathsFromStartingCoordinate(
                        {
                            missionMap,
                            originMapCoordinate: { q: 0, r: 0 },
                            currentMapCoordinate: { q: 0, r: 0 },
                            searchLimit: SearchLimitService.new({
                                baseSearchLimit:
                                    SearchLimitService.landBasedMovement(),
                                squaddieAffiliation: SquaddieAffiliation.PLAYER,
                                canStopOnSquaddies: true,
                            }),
                            objectRepository,
                        }
                    )
                expect(
                    MapSearchTestUtils.expectPathExists({
                        searchResults,
                        mapCoordinate: { q: 0, r: 2 },
                    })
                ).toBeTruthy()
            })
        })

        it("does not need a squaddie at the start location", () => {
            const missionMap =
                MapSearchTestUtils.create1row5columnsAllFlatTerrain()
            const objectRepository = ObjectRepositoryService.new()
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "name",
                templateId: "squaddieTemplateId",
                battleId: "battleSquaddieId",
                affiliation: SquaddieAffiliation.PLAYER,
                objectRepository,
                actionTemplateIds: [],
            })
            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: "battleSquaddieId",
                squaddieTemplateId: "squaddieTemplateId",
                originMapCoordinate: { q: 0, r: 1 },
            })

            const searchResults = MapSearchService.calculatePathsToDestinations(
                {
                    missionMap,
                    searchLimit: {
                        ...SearchLimitService.landBasedMovement(),
                        maximumDistance: 1,
                    },
                    originMapCoordinate: { q: 0, r: 0 },
                    currentMapCoordinate: { q: 0, r: 0 },
                    objectRepository: ObjectRepositoryService.new(),
                    destinationCoordinates: [{ q: 0, r: 1 }],
                }
            )

            expect(
                MapSearchTestUtils.expectPathExists({
                    searchResults,
                    mapCoordinate: { q: 0, r: 0 },
                })
            ).toBeTruthy()
        })
    })
    describe("searchForPathsToDestinations", () => {
        let missionMap: MissionMap
        beforeEach(() => {
            missionMap = MapSearchTestUtils.create1row5columnsAllFlatTerrain()
        })

        it("will search the map and stop when it finds all of the destination", () => {
            const searchResults = MapSearchService.calculatePathsToDestinations(
                {
                    missionMap,
                    searchLimit: SearchLimitService.targeting(),
                    originMapCoordinate: { q: 0, r: 0 },
                    currentMapCoordinate: { q: 0, r: 0 },
                    objectRepository: ObjectRepositoryService.new(),
                    destinationCoordinates: [
                        { q: 0, r: 0 },
                        { q: 0, r: 1 },
                        { q: 0, r: 2 },
                    ],
                }
            )

            expect(
                MapSearchTestUtils.expectPathExists({
                    searchResults,
                    mapCoordinate: { q: 0, r: 0 },
                })
            ).toBeTruthy()
            expect(
                MapSearchTestUtils.expectPathExists({
                    searchResults,
                    mapCoordinate: { q: 0, r: 1 },
                })
            ).toBeTruthy()
            expect(
                MapSearchTestUtils.expectPathExists({
                    searchResults,
                    mapCoordinate: { q: 0, r: 2 },
                })
            ).toBeTruthy()
            expect(
                MapSearchTestUtils.expectPathDoesNotExist({
                    searchResults,
                    mapCoordinate: { q: 0, r: 4 },
                })
            ).toBeTruthy()
        })
    })
})
