import p5 from "p5";
import {HexCoordinate, Integer} from "../hexMap/hexGrid";
import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {Cutscene} from "../cutscene/cutscene";
import {ResourceHandler} from "../resource/resourceHandler";
import {assertsPositiveNumber, PositiveNumber} from "../utils/math";
import {SquaddieID} from "../squaddie/id";
import {SquaddieResource} from "../squaddie/resource";
import {ImageUI} from "../ui/imageUI";
import {RectArea} from "../ui/rectArea";
import {SCREEN_HEIGHT, SCREEN_WIDTH} from "../graphicsConstants";
import {
    convertMapCoordinatesToScreenCoordinates,
    convertMapCoordinatesToWorldCoordinates,
    convertScreenCoordinatesToWorldCoordinates,
    convertWorldCoordinatesToMapCoordinates,
} from "../hexMap/convertCoordinates";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../ui/constants";
import {Pathfinder} from "../hexMap/pathfinder/pathfinder";
import {SquaddieMovement} from "../squaddie/movement";
import {SearchParams} from "../hexMap/pathfinder/searchParams";
import {drawHexMap, HighlightPulseBlueColor, HighlightPulseRedColor} from "../hexMap/hexDrawingUtils";
import {SquaddieActivity} from "../squaddie/activity";
import {SquaddieTurn} from "../squaddie/turn";
import {Trait, TraitCategory, TraitStatusStorage} from "../trait/traitStatusStorage";
import {BattleCamera} from "./battleCamera";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {getSquaddiePositionAlongPath} from "./squaddieMoveAnimationUtils";
import {SearchResults} from "../hexMap/pathfinder/searchResults";
import {TileFoundDescription} from "../hexMap/pathfinder/tileFoundDescription";
import {MissionMap} from "../missionMap/missionMap";
import {SearchPath} from "../hexMap/pathfinder/searchPath";
import {isResult, unwrapResultOrError} from "../utils/ResultOrError";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";

type RequiredOptions = {
    p: p5;
    width: PositiveNumber;
    height: PositiveNumber;
};

type Options = {
    resourceHandler: ResourceHandler;
    cutscene: Cutscene;
}

enum AnimationMode {
    IDLE = "IDLE",
    MOVING_UNIT = "MOVING_UNIT"
}

export class BattleScene {
    width: PositiveNumber;
    height: PositiveNumber;
    hexMap: TerrainTileMap;
    cutscene: Cutscene;
    resourceHandler: ResourceHandler;

    squaddieDynamicInfoByID: {
        [id: string]: BattleSquaddieDynamic;
    }

    squaddieStaticInfoBySquaddieTypeID: {
        [id: string]: BattleSquaddieStatic;
    }

    pathfinder: Pathfinder;
    missionMap: MissionMap;
    turnBySquaddieId: { [key: string]: SquaddieTurn }

    camera: BattleCamera;
    animationMode: AnimationMode;
    squaddieMovePath?: SearchPath;
    animationTimer: number;
    squaddieAnimationWorldCoordinatesStart?: [number, number];
    squaddieAnimationWorldCoordinatesEnd?: [number, number];

    constructor(options: RequiredOptions & Partial<Options>) {
        assertsPositiveNumber(options.width);
        this.width = options.width;
        assertsPositiveNumber(options.height);
        this.height = options.height;

        this.camera = new BattleCamera(0, 100);
        this.resourceHandler = options.resourceHandler;
        this.prepareSquaddies();
        this.prepareMap();
        this.animationMode = AnimationMode.IDLE;
        this.animationTimer = 0;
        this.squaddieMovePath = undefined;
        this.squaddieAnimationWorldCoordinatesStart = undefined;
        this.squaddieAnimationWorldCoordinatesEnd = undefined;
    }

    private prepareSquaddies() {
        this.turnBySquaddieId = {};

        this.squaddieStaticInfoBySquaddieTypeID = {
            "player_young_torrin": {
                squaddieID: new SquaddieID({
                    id: "player_young_torrin",
                    name: "Torrin",
                    resources: new SquaddieResource({
                        mapIconResourceKey: "map icon young torrin"
                    }),
                    traits: new TraitStatusStorage({
                        [Trait.HUMANOID]: true,
                        [Trait.MONSU]: true,
                    }).filterCategory(TraitCategory.CREATURE),
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
                movement: new SquaddieMovement({
                    movementPerAction: 2,
                    traits: new TraitStatusStorage({
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }).filterCategory(TraitCategory.MOVEMENT)
                }),
                activities: [
                    new SquaddieActivity({
                        name: "water saber",
                        id: "torrin_water_saber",
                        minimumRange: 0 as Integer,
                        maximumRange: 2 as Integer,
                        traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTIVITY)
                    })
                ],
            },
            "player_sir_camil": {
                squaddieID: new SquaddieID({
                    id: "player_sir_camil",
                    name: "Sir Camil",
                    resources: new SquaddieResource({
                        mapIconResourceKey: "map icon sir camil"
                    }),
                    traits: new TraitStatusStorage({
                        [Trait.HUMANOID]: true,
                    }).filterCategory(TraitCategory.CREATURE),
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
                movement: new SquaddieMovement({
                    movementPerAction: 2,
                    traits: new TraitStatusStorage({}).filterCategory(TraitCategory.MOVEMENT)
                }),
                activities: [
                    new SquaddieActivity({
                        name: "longsword",
                        id: "sir_camil_longsword",
                        minimumRange: 0 as Integer,
                        maximumRange: 1 as Integer,
                        traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTIVITY)
                    })
                ],
            },
            "enemy_demon_slither": {
                squaddieID: new SquaddieID({
                    id: "enemy_demon_slither",
                    name: "Demon Slither",
                    resources: new SquaddieResource({
                        mapIconResourceKey: "map icon demon slither"
                    }),
                    traits: new TraitStatusStorage({
                        [Trait.DEMON]: true,
                    }).filterCategory(TraitCategory.CREATURE),
                    affiliation: SquaddieAffiliation.ENEMY,
                }),
                movement: new SquaddieMovement({
                    movementPerAction: 1,
                    traits: new TraitStatusStorage({}).filterCategory(TraitCategory.MOVEMENT)
                }),
                activities: [
                    new SquaddieActivity({
                        name: "Bite",
                        id: "demon_slither_bite",
                        minimumRange: 0 as Integer,
                        maximumRange: 1 as Integer,
                        traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTIVITY)
                    })
                ],
            },
        }

        this.squaddieDynamicInfoByID = {
            "player_young_torrin": {
                staticSquaddieId: "player_young_torrin",
                mapLocation: {q: 0 as Integer, r: 0 as Integer},
                squaddieTurn: new SquaddieTurn()
            },
            "player_sir_camil": {
                staticSquaddieId: "player_sir_camil",
                mapLocation: {q: 1 as Integer, r: 1 as Integer},
                squaddieTurn: new SquaddieTurn()
            },
            "enemy_demon_slither_0": {
                staticSquaddieId: "enemy_demon_slither",
                mapLocation: {q: 1 as Integer, r: 2 as Integer},
                squaddieTurn: new SquaddieTurn()
            }
        }

        Object.entries(this.squaddieStaticInfoBySquaddieTypeID).forEach(([_, squaddieInfo]) => {
            this.resourceHandler.loadResource(squaddieInfo.squaddieID.resources.mapIconResourceKey);
        });

        Object.entries(this.squaddieDynamicInfoByID).forEach(([id, _]) => {
            this.turnBySquaddieId[id] = new SquaddieTurn();
        });
    }

    private prepareMap() {
        this.hexMap = new TerrainTileMap({
            movementCost: [
                "1 1 1 1 1 1 1 1 1 ",
                " 1 1 1 1 1 1 1 1 1 ",
                "  1 1 1 1 1 1 1 1 1 ",
                "   1 1 1 1 1 1 1 1 1 ",
                "    1 1 1 1 1 1 1 1 1 ",
                "     1 1 1 1 1 1 1 1 1 ",
                "      1 1 1 1 1 1 1 1 1 ",
                "       1 1 1 1 1 1 1 1 1 ",
                "        1 1 1 1 1 1 1 1 1 ",
            ],
            resourceHandler: this.resourceHandler,
        });

        this.resourceHandler.loadResources([
            "map icon move 1 action",
            "map icon move 2 actions",
            "map icon move 3 actions",
            "map icon attack 1 action"
        ]);

        this.missionMap = new MissionMap({
            terrainTileMap: this.hexMap
        })
        Object.entries(this.squaddieDynamicInfoByID).forEach(([staticSquaddieId, info]) => {
            const staticSquaddieInfo: BattleSquaddieStatic = this.squaddieStaticInfoBySquaddieTypeID[info.staticSquaddieId];
            this.missionMap.addSquaddie(staticSquaddieInfo.squaddieID, info.mapLocation);
        })
        this.pathfinder = new Pathfinder();
    }

    draw(p: p5) {
        if (this.cutscene && this.cutscene.hasLoaded() && !this.cutscene.isInProgress()) {
            this.cutscene.setResources();
            this.cutscene.start();
        }

        this.loadAndInitializeSquaddieResources();

        p.colorMode("hsb", 360, 100, 100, 255)
        p.background(50, 10, 20);

        if (this.hexMap) {
            drawHexMap(p, this.hexMap, ...this.camera.getCoordinates());
        }

        this.drawSquaddieMapIcons(p);

        if (this.cutscene && this.cutscene.isInProgress()) {
            this.cutscene.update();
            this.cutscene.draw(p);
        } else {
            this.camera.moveCamera();

            p.fill("#dedede");
            p.stroke("#1f1f1f");
            for (let i = 0; i < this.turnBySquaddieId["player_young_torrin"].getRemainingActions(); i++) {
                p.circle(50 + (i * 55), SCREEN_HEIGHT - 70, 50);
            }
        }
    }

    private loadAndInitializeSquaddieResources() {
        const allSquaddieIconsHaveBeenInitialized = Object.entries(this.squaddieDynamicInfoByID)
            .every(([_, squaddieInfo]) => squaddieInfo.mapIcon);
        if (allSquaddieIconsHaveBeenInitialized) {
            return;
        }

        const squaddieResourceKeys = Object.entries(this.squaddieStaticInfoBySquaddieTypeID)
            .map(([_, squaddieInfo]) => squaddieInfo.squaddieID.resources.mapIconResourceKey);

        if (
            this.resourceHandler.areAllResourcesLoaded([
                ...squaddieResourceKeys,
                "map icon move 1 action",
                "map icon move 2 actions",
                "map icon move 3 actions",
            ])
        ) {
            Object.entries(this.squaddieDynamicInfoByID)
                .forEach(([_, dynaicSquaddieInfo]) => {
                    const staticInfo = this.squaddieStaticInfoBySquaddieTypeID[dynaicSquaddieInfo.staticSquaddieId];
                    let image: p5.Image;
                    const foundResourceResultOrError = this.resourceHandler.getResource(staticInfo.squaddieID.resources.mapIconResourceKey);
                    if (isResult(foundResourceResultOrError)) {
                        image = unwrapResultOrError(foundResourceResultOrError);
                    }

                    const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
                        dynaicSquaddieInfo.mapLocation.q, dynaicSquaddieInfo.mapLocation.r, ...this.camera.getCoordinates())

                    dynaicSquaddieInfo.mapIcon = new ImageUI({
                        graphic: image,
                        area: new RectArea({
                            left: xyCoords[0],
                            top: xyCoords[1],
                            width: image.width,
                            height: image.height,
                            horizAlign: HORIZ_ALIGN_CENTER,
                            vertAlign: VERT_ALIGN_CENTER
                        })
                    })
                });
        }
    }

    private drawSquaddieMapIcons(p: p5) {
        Object.entries(this.squaddieDynamicInfoByID)
            .forEach(([id, squaddieDynamicInfo]) => {
                if (!squaddieDynamicInfo.mapIcon) {
                    return;
                }

                if (this.animationMode === AnimationMode.MOVING_UNIT && id === "player_young_torrin") {
                    this.moveSquaddie(p, squaddieDynamicInfo);
                } else {
                    const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
                        squaddieDynamicInfo.mapLocation.q, squaddieDynamicInfo.mapLocation.r, ...this.camera.getCoordinates())
                    this.setImageToLocation(squaddieDynamicInfo, xyCoords);

                    squaddieDynamicInfo.mapIcon.draw(p);
                }
            });
    }

    private moveSquaddie(p: p5, squaddieDynamicInfo: BattleSquaddieDynamic) {
        if (this.animationMode !== AnimationMode.MOVING_UNIT) {
            return;
        }

        if (!this.squaddieMovePath) {
            return;
        }

        const squaddieStaticInfo = this.squaddieStaticInfoBySquaddieTypeID[squaddieDynamicInfo.staticSquaddieId];

        squaddieDynamicInfo.mapIcon.draw(p);

        const timePassed = Date.now() - this.animationTimer;
        const timeToMove = 1000.0;
        if (timePassed > timeToMove || this.squaddieMovePath.getTilesTraveled().length === 0) {
            squaddieDynamicInfo.mapLocation = this.squaddieMovePath.getDestination();
            const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
                this.squaddieMovePath.getDestination().q,
                this.squaddieMovePath.getDestination().r,
                ...this.camera.getCoordinates()
            );
            this.setImageToLocation(squaddieDynamicInfo, xyCoords);
            this.missionMap.updateSquaddiePosition(squaddieStaticInfo.squaddieID.id, squaddieDynamicInfo.mapLocation);

            const reachableTileSearchResults: SearchResults = this.pathfinder.getAllReachableTiles(
                new SearchParams({
                    missionMap: this.missionMap,
                    startLocation: squaddieDynamicInfo.mapLocation,
                    squaddieMovement: squaddieStaticInfo.movement,
                    squaddieAffiliation: squaddieStaticInfo.squaddieID.affiliation,
                    numberOfActions: 3,
                })
            );
            const movementTiles: TileFoundDescription[] = reachableTileSearchResults.allReachableTiles;
            const movementTilesByNumberOfActions: { [numberOfActions: number]: [{ q: Integer, r: Integer }?] } = reachableTileSearchResults.getReachableTilesByNumberOfMovementActions();

            const actionTiles: TileFoundDescription[] = this.pathfinder.getTilesInRange(new SearchParams({
                    missionMap: this.missionMap,
                    minimumDistanceMoved: squaddieStaticInfo.activities[0].minimumRange,
                }),
                squaddieStaticInfo.activities[0].maximumRange,
                movementTiles
            );

            const highlightTileDescriptions = [];
            if (movementTilesByNumberOfActions[0]) {
                highlightTileDescriptions.push(
                    {
                        tiles: movementTilesByNumberOfActions[0],
                        pulseColor: HighlightPulseBlueColor,
                    }
                )
            }
            if (movementTilesByNumberOfActions[1]) {
                highlightTileDescriptions.push(
                    {
                        tiles: movementTilesByNumberOfActions[1],
                        pulseColor: HighlightPulseBlueColor,
                        overlayImageResourceName: "map icon move 1 action",
                    }
                )
            }
            if (movementTilesByNumberOfActions[2]) {
                highlightTileDescriptions.push(
                    {
                        tiles: movementTilesByNumberOfActions[2],
                        pulseColor: HighlightPulseBlueColor,
                        overlayImageResourceName: "map icon move 2 actions",
                    }
                )
            }
            if (movementTilesByNumberOfActions[3]) {
                highlightTileDescriptions.push(
                    {
                        tiles: movementTilesByNumberOfActions[3],
                        pulseColor: HighlightPulseBlueColor,
                        overlayImageResourceName: "map icon move 3 actions",
                    }
                )
            }
            if (actionTiles) {
                highlightTileDescriptions.push({
                        tiles: actionTiles,
                        pulseColor: HighlightPulseRedColor,
                        overlayImageResourceName: "map icon attack 1 action",
                    },
                )
            }
            this.hexMap.highlightTiles(highlightTileDescriptions);
            this.animationMode = AnimationMode.IDLE;
        } else {
            const squaddieDrawCoordinates: [number, number] = getSquaddiePositionAlongPath(
                this.squaddieMovePath.getTilesTraveled(),
                timePassed,
                timeToMove,
                this.camera,
            )

            this.setImageToLocation(squaddieDynamicInfo, squaddieDrawCoordinates);
            squaddieDynamicInfo.mapIcon.draw(p);
            return;
        }
    }

    mouseMoved(mouseX: number, mouseY: number) {
        if (this.cutscene && this.cutscene.isInProgress()) {
            this.cutscene.mouseMoved(mouseX, mouseY);
            return;
        }

        if (mouseX < SCREEN_WIDTH * 0.10) {
            this.camera.setXVelocity(-1);
            if (mouseX < SCREEN_WIDTH * 0.04) {
                this.camera.setXVelocity(-5);
            }
            if (mouseX < SCREEN_WIDTH * 0.02) {
                this.camera.setXVelocity(-10);
            }
        } else if (mouseX > SCREEN_WIDTH * 0.90) {
            this.camera.setXVelocity(1);
            if (mouseX > SCREEN_WIDTH * 0.96) {
                this.camera.setXVelocity(5);
            }
            if (mouseX > SCREEN_WIDTH * 0.98) {
                this.camera.setXVelocity(10);
            }
        } else {
            this.camera.setXVelocity(0);
        }

        if (mouseY < SCREEN_HEIGHT * 0.10) {
            this.camera.setYVelocity(-1);
            if (mouseY < SCREEN_HEIGHT * 0.04) {
                this.camera.setYVelocity(-5);
            }
            if (mouseY < SCREEN_HEIGHT * 0.02) {
                this.camera.setYVelocity(-10);
            }
        } else if (mouseY > SCREEN_HEIGHT * 0.90) {
            this.camera.setYVelocity(1);
            if (mouseY > SCREEN_HEIGHT * 0.96) {
                this.camera.setYVelocity(5);
            }
            if (mouseY > SCREEN_HEIGHT * 0.98) {
                this.camera.setYVelocity(10);
            }
        } else {
            this.camera.setYVelocity(0);
        }

        if (
            mouseX < 0
            || mouseX > SCREEN_WIDTH
            || mouseY < 0
            || mouseY > SCREEN_HEIGHT
        ) {
            this.camera.setXVelocity(0);
            this.camera.setYVelocity(0);
        }
    }

    mouseClicked(mouseX: number, mouseY: number) {
        if (this.cutscene && this.cutscene.isInProgress()) {
            this.cutscene.mouseClicked(mouseX, mouseY);
            return;
        }

        if (this.animationMode === AnimationMode.IDLE) {
            const [worldX, worldY] = convertScreenCoordinatesToWorldCoordinates(mouseX, mouseY, ...this.camera.getCoordinates())
            const clickedTileCoordinates: [number, number] = convertWorldCoordinatesToMapCoordinates(worldX, worldY);
            const clickedHexCoordinate: HexCoordinate = {
                q: clickedTileCoordinates[0] as Integer,
                r: clickedTileCoordinates[1] as Integer
            };
            if (
                this.hexMap.areCoordinatesOnMap(clickedHexCoordinate)
            ) {
                const squaddieToMove = this.squaddieDynamicInfoByID["player_young_torrin"];
                const squaddieToMoveStatic = this.squaddieStaticInfoBySquaddieTypeID["player_young_torrin"];

                const searchPathResultsOrError = this.pathfinder.findPathToStopLocation(new SearchParams({
                    missionMap: this.missionMap,
                    squaddieMovement: squaddieToMoveStatic.movement,
                    numberOfActions: 3,
                    startLocation: {
                        q: squaddieToMove.mapLocation.q,
                        r: squaddieToMove.mapLocation.r,
                    },
                    stopLocation: {
                        q: clickedHexCoordinate.q,
                        r: clickedHexCoordinate.r
                    },
                    squaddieAffiliation: squaddieToMoveStatic.squaddieID.affiliation
                }));
                let foundRoute: SearchPath = undefined;
                if (
                    isResult(searchPathResultsOrError)
                ) {
                    const closestTilesToDestination = unwrapResultOrError(searchPathResultsOrError).getClosestTilesToDestination();
                    foundRoute = closestTilesToDestination ? closestTilesToDestination[0].searchPath : null;

                    if (foundRoute !== null) {
                        this.squaddieMovePath = foundRoute;
                    } else {
                        this.squaddieMovePath = new SearchPath();
                        this.squaddieMovePath.add({
                                q: squaddieToMove.mapLocation.q,
                                r: squaddieToMove.mapLocation.r,
                                movementCost: 0,
                            },
                            0
                        );
                        this.squaddieMovePath.add(
                            {
                                q: clickedHexCoordinate.q,
                                r: clickedHexCoordinate.r,
                                movementCost: 0,
                            },
                            0
                        );
                    }

                    this.squaddieAnimationWorldCoordinatesStart = convertMapCoordinatesToWorldCoordinates(
                        squaddieToMove.mapLocation.q,
                        squaddieToMove.mapLocation.r,
                    );
                    this.squaddieAnimationWorldCoordinatesEnd = convertMapCoordinatesToWorldCoordinates(
                        this.squaddieMovePath.getDestination().q,
                        this.squaddieMovePath.getDestination().r,
                    );

                    this.animationTimer = Date.now();
                    this.animationMode = AnimationMode.MOVING_UNIT;
                }
            }

            this.hexMap.mouseClicked(mouseX, mouseY, ...this.camera.getCoordinates());
        }
    }

    private setImageToLocation(
        dynamicSquaddieInfo: BattleSquaddieDynamic,
        xyCoords: [number, number]
    ) {
        dynamicSquaddieInfo.mapIcon.area.setRectLeft({left: xyCoords[0]});
        dynamicSquaddieInfo.mapIcon.area.setRectTop({top: xyCoords[1]});
        dynamicSquaddieInfo.mapIcon.area.align({horizAlign: HORIZ_ALIGN_CENTER, vertAlign: VERT_ALIGN_CENTER});
    }
}
