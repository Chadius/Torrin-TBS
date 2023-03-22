import p5 from "p5";
import {HexCoordinate} from "../hexMap/hexGrid";
import {HighlightTileDescription, TerrainTileMap} from "../hexMap/terrainTileMap";
import {Cutscene} from "../cutscene/cutscene";
import {ResourceHandler} from "../resource/resourceHandler";
import {assertsNonNegativeNumber, NonNegativeNumber} from "../utils/mathAssert";
import {SquaddieID} from "../squaddie/id";
import {SquaddieResource} from "../squaddie/resource";
import {ImageUI} from "../ui/imageUI";
import {RectArea} from "../ui/rectArea";
import {
    convertMapCoordinatesToScreenCoordinates,
    convertMapCoordinatesToWorldCoordinates,
    convertScreenCoordinatesToMapCoordinates,
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
import {assertBattleSquaddieDynamic, BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {getSquaddiePositionAlongPath, TIME_TO_MOVE} from "./squaddieMoveAnimationUtils";
import {SearchResults} from "../hexMap/pathfinder/searchResults";
import {TileFoundDescription} from "../hexMap/pathfinder/tileFoundDescription";
import {MissionMap} from "../missionMap/missionMap";
import {SearchPath} from "../hexMap/pathfinder/searchPath";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {areAllResourcesLoaded, loadMapIconResources, loadMapTileResources} from "./battleResourceLoading";
import {BattleSquaddieUIInput, BattleSquaddieUISelectionState} from "./battleSquaddieUIInput";
import {calculateNewBattleSquaddieUISelectionState} from "./battleSquaddieUIService";
import {BattleSquaddieSelectedHUD} from "./battleSquaddieSelectedHUD";
import {ScreenDimensions} from "../utils/graphicsConfig";

type RequiredOptions = {
    p: p5;
    width: NonNegativeNumber;
    height: NonNegativeNumber;
};

type Options = {
    resourceHandler: ResourceHandler;
    cutscene: Cutscene;
}

enum AnimationMode {
    IDLE = "IDLE",
    MOVING_SQUADDIE = "MOVING_SQUADDIE"
}

export class BattleScene {
    width: NonNegativeNumber;
    height: NonNegativeNumber;
    hexMap: TerrainTileMap;
    cutscene: Cutscene;
    resourceHandler: ResourceHandler;

    squaddieRepo: BattleSquaddieRepository;

    pathfinder: Pathfinder;
    missionMap: MissionMap;
    turnBySquaddieId: { [key: string]: SquaddieTurn }

    camera: BattleCamera;
    animationMode: AnimationMode;
    squaddieMovePath?: SearchPath;
    animationTimer: number;
    squaddieAnimationWorldCoordinatesStart?: [number, number];
    squaddieAnimationWorldCoordinatesEnd?: [number, number];

    battleSquaddieUIInput: BattleSquaddieUIInput;
    battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD;

    constructor(options: RequiredOptions & Partial<Options>) {
        assertsNonNegativeNumber(options.width);
        this.width = options.width;
        assertsNonNegativeNumber(options.height);
        this.height = options.height;

        this.camera = new BattleCamera(0, 100);
        this.resourceHandler = options.resourceHandler;
        this.prepareSquaddies();
        this.prepareMap();

        const mapDimensions = this.hexMap.getDimensions()
        this.camera.setMapDimensionBoundaries(mapDimensions.widthOfWidestRow, mapDimensions.numberOfRows);

        this.animationMode = AnimationMode.IDLE;
        this.animationTimer = 0;
        this.squaddieMovePath = undefined;
        this.squaddieAnimationWorldCoordinatesStart = undefined;
        this.squaddieAnimationWorldCoordinatesEnd = undefined;

        this.battleSquaddieUIInput = {
            selectionState: BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED,
            missionMap: this.missionMap,
            squaddieRepository: this.squaddieRepo,
        };
        this.battleSquaddieSelectedHUD = new BattleSquaddieSelectedHUD({
            missionMap: this.missionMap,
            squaddieRepository: this.squaddieRepo,
        });
        this.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
    }

    private prepareSquaddies() {
        this.turnBySquaddieId = {};

        this.squaddieRepo = new BattleSquaddieRepository();
        this.squaddieRepo.addStaticSquaddie({
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
                    minimumRange: 0,
                    maximumRange: 2,
                    traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTIVITY)
                })
            ],
        });
        this.squaddieRepo.addStaticSquaddie({
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
                    minimumRange: 0,
                    maximumRange: 1,
                    traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTIVITY)
                })
            ],
        });
        this.squaddieRepo.addStaticSquaddie({
            squaddieID: new SquaddieID({
                id: "enemy_demon_slither",
                name: "Slither Demon",
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
                    minimumRange: 0,
                    maximumRange: 1,
                    traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTIVITY)
                })
            ],
        });

        this.squaddieRepo.addDynamicSquaddie("player_young_torrin", {
            staticSquaddieId: "player_young_torrin",
            mapLocation: {q: 0, r: 0},
            squaddieTurn: new SquaddieTurn()
        })
        this.squaddieRepo.addDynamicSquaddie("player_sir_camil", {
            staticSquaddieId: "player_sir_camil",
            mapLocation: {q: 1, r: 1},
            squaddieTurn: new SquaddieTurn()
        })
        this.squaddieRepo.addDynamicSquaddie("enemy_demon_slither_0", {
            staticSquaddieId: "enemy_demon_slither",
            mapLocation: {q: 1, r: 2},
            squaddieTurn: new SquaddieTurn()
        })

        loadMapIconResources(
            this.resourceHandler,
            this.squaddieRepo.getStaticSquaddieIterator().map(info => info.staticSquaddie)
        )

        this.squaddieRepo.getDynamicSquaddieIterator().forEach((info) => {
            const {
                dynamicSquaddieId
            } = info;

            this.turnBySquaddieId[dynamicSquaddieId] = new SquaddieTurn();
        });
    }

    private prepareMap() {
        this.hexMap = new TerrainTileMap({
            movementCost: [
                "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                " 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "  1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "   1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "    1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "     1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "      1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "       1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "        1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "         1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "          1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "           1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "            1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "             1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "              1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "               1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "                1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
                "                 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 ",
            ],
            resourceHandler: this.resourceHandler,
        });

        loadMapTileResources(this.resourceHandler);

        this.missionMap = new MissionMap({
            terrainTileMap: this.hexMap
        })

        this.squaddieRepo.getDynamicSquaddieIterator().forEach((info) => {
            const {
                dynamicSquaddie,
                dynamicSquaddieId
            } = info;

            const {
                staticSquaddie
            } = getResultOrThrowError(this.squaddieRepo.getSquaddieByDynamicID(dynamicSquaddieId))

            this.missionMap.addSquaddie(staticSquaddie.squaddieID, dynamicSquaddie.mapLocation);
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
            this.camera.constrainCamera();

            this.battleSquaddieSelectedHUD.draw(p);
        }
    }

    private loadAndInitializeSquaddieResources() {
        const allSquaddieIconsHaveBeenInitialized = this.squaddieRepo.getDynamicSquaddieIterator().every((info) => {
            const {dynamicSquaddie} = info;
            return dynamicSquaddie.mapIcon;
        });

        if (allSquaddieIconsHaveBeenInitialized) {
            return;
        }

        if (
            areAllResourcesLoaded(
                this.resourceHandler,
                this.squaddieRepo.getStaticSquaddieIterator().map(info => info.staticSquaddie)
            )
        ) {
            this.squaddieRepo.getDynamicSquaddieIterator().forEach((info) => {
                const {dynamicSquaddie, dynamicSquaddieId} = info;
                const {staticSquaddie} = getResultOrThrowError(this.squaddieRepo.getSquaddieByDynamicID(dynamicSquaddieId));

                let image: p5.Image = getResultOrThrowError(
                    this.resourceHandler.getResource(staticSquaddie.squaddieID.resources.mapIconResourceKey)
                );

                const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
                    dynamicSquaddie.mapLocation.q, dynamicSquaddie.mapLocation.r, ...this.camera.getCoordinates())

                dynamicSquaddie.mapIcon = new ImageUI({
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
        this.squaddieRepo.getDynamicSquaddieIterator().forEach((info) => {
            const {dynamicSquaddie, dynamicSquaddieId} = info;
            if (!dynamicSquaddie.mapIcon) {
                return;
            }

            if (this.animationMode === AnimationMode.MOVING_SQUADDIE && dynamicSquaddieId === this.battleSquaddieUIInput.selectedSquaddieDynamicID) {
                this.moveSquaddie(p);
                this.updateBattleSquaddieUIDraw();
            } else {
                const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
                    dynamicSquaddie.mapLocation.q, dynamicSquaddie.mapLocation.r, ...this.camera.getCoordinates())
                this.setImageToLocation(dynamicSquaddie, xyCoords);

                dynamicSquaddie.mapIcon.draw(p);
            }
        });
    }

    private updateBattleSquaddieUIDraw() {
        switch (this.battleSquaddieUIInput.selectionState) {
            case BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED:
                break;
            case BattleSquaddieUISelectionState.SELECTED_SQUADDIE:
                break;
            case BattleSquaddieUISelectionState.MOVING_SQUADDIE:
                this.updateBattleSquaddieUIMovingSquaddie();
                break;
        }
    }

    mouseMoved(mouseX: number, mouseY: number) {
        if (this.cutscene && this.cutscene.isInProgress()) {
            this.cutscene.mouseMoved(mouseX, mouseY);
            return;
        }

        if (mouseX < ScreenDimensions.SCREEN_WIDTH * 0.10) {
            this.camera.setXVelocity(-1);
            if (mouseX < ScreenDimensions.SCREEN_WIDTH * 0.04) {
                this.camera.setXVelocity(-5);
            }
            if (mouseX < ScreenDimensions.SCREEN_WIDTH * 0.02) {
                this.camera.setXVelocity(-10);
            }
        } else if (mouseX > ScreenDimensions.SCREEN_WIDTH * 0.90) {
            this.camera.setXVelocity(1);
            if (mouseX > ScreenDimensions.SCREEN_WIDTH * 0.96) {
                this.camera.setXVelocity(5);
            }
            if (mouseX > ScreenDimensions.SCREEN_WIDTH * 0.98) {
                this.camera.setXVelocity(10);
            }
        } else {
            this.camera.setXVelocity(0);
        }

        if (mouseY < ScreenDimensions.SCREEN_HEIGHT * 0.10) {
            this.camera.setYVelocity(-1);
            if (mouseY < ScreenDimensions.SCREEN_HEIGHT * 0.04) {
                this.camera.setYVelocity(-5);
            }
            if (mouseY < ScreenDimensions.SCREEN_HEIGHT * 0.02) {
                this.camera.setYVelocity(-10);
            }
        } else if (mouseY > ScreenDimensions.SCREEN_HEIGHT * 0.90) {
            this.camera.setYVelocity(1);
            if (mouseY > ScreenDimensions.SCREEN_HEIGHT * 0.96) {
                this.camera.setYVelocity(5);
            }
            if (mouseY > ScreenDimensions.SCREEN_HEIGHT * 0.98) {
                this.camera.setYVelocity(10);
            }
        } else {
            this.camera.setYVelocity(0);
        }

        if (
            mouseX < 0
            || mouseX > ScreenDimensions.SCREEN_WIDTH
            || mouseY < 0
            || mouseY > ScreenDimensions.SCREEN_HEIGHT
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

        this.updateBattleSquaddieUIMouseClicked(mouseX, mouseY);
        this.hexMap.mouseClicked(mouseX, mouseY, ...this.camera.getCoordinates());
    }

    updateBattleSquaddieUIMouseClicked(mouseX: number, mouseY: number) {
        const clickedTileCoordinates: [number, number] = convertScreenCoordinatesToMapCoordinates(mouseX, mouseY, ...this.camera.getCoordinates());
        const clickedHexCoordinate: HexCoordinate = {
            q: clickedTileCoordinates[0],
            r: clickedTileCoordinates[1]
        };

        if (
            !this.hexMap.areCoordinatesOnMap(clickedHexCoordinate)
        ) {
            this.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
            return;
        }

        switch (this.battleSquaddieUIInput.selectionState) {
            case BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED:
                this.updateBattleSquaddieUINoSquaddieSelected(clickedHexCoordinate, mouseX, mouseY);
                break;
            case BattleSquaddieUISelectionState.SELECTED_SQUADDIE:
                this.updateBattleSquaddieUISelectedSquaddie(clickedHexCoordinate, mouseX, mouseY);
                break;
            case BattleSquaddieUISelectionState.MOVING_SQUADDIE:
                this.updateBattleSquaddieUIMovingSquaddie(clickedHexCoordinate);
                break;
        }
    }

    private updateBattleSquaddieUINoSquaddieSelected(clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        const newSelectionState: BattleSquaddieUISelectionState = calculateNewBattleSquaddieUISelectionState(
            {
                tileClickedOn: clickedHexCoordinate,
                selectionState: this.battleSquaddieUIInput.selectionState,
                missionMap: this.missionMap,
                squaddieRepository: this.squaddieRepo,
            }
        );

        if (newSelectionState !== BattleSquaddieUISelectionState.SELECTED_SQUADDIE) {
            this.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
            return;
        }

        const squaddieID: SquaddieID = this.missionMap.getSquaddieAtLocation(clickedHexCoordinate);
        if (!squaddieID) {
            this.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
            return;
        }
        const {
            staticSquaddie,
            dynamicSquaddie,
            dynamicSquaddieId,
        } = getResultOrThrowError(this.squaddieRepo.getSquaddieByStaticIDAndLocation(squaddieID.id, clickedHexCoordinate));

        this.highlightSquaddieReach(dynamicSquaddie, staticSquaddie);
        this.battleSquaddieUIInput.selectedSquaddieDynamicID = dynamicSquaddieId;
        this.battleSquaddieUIInput.selectionState = BattleSquaddieUISelectionState.SELECTED_SQUADDIE;

        this.battleSquaddieSelectedHUD.mouseClickedSquaddieSelected(dynamicSquaddieId, mouseX, mouseY);
    }

    private updateBattleSquaddieUISelectedSquaddie(clickedHexCoordinate: HexCoordinate, mouseX: number, mouseY: number) {
        if (
            !this.hexMap.areCoordinatesOnMap(clickedHexCoordinate)
        ) {
            this.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
            return;
        }


        const squaddieID: SquaddieID = this.missionMap.getSquaddieAtLocation(clickedHexCoordinate);
        if (squaddieID) {
            const {
                staticSquaddie,
                dynamicSquaddie,
                dynamicSquaddieId,
            } = getResultOrThrowError(this.squaddieRepo.getSquaddieByStaticIDAndLocation(squaddieID.id, clickedHexCoordinate));

            this.hexMap.stopHighlightingTiles();
            this.highlightSquaddieReach(dynamicSquaddie, staticSquaddie);
            this.battleSquaddieUIInput.selectedSquaddieDynamicID = dynamicSquaddieId;
            this.battleSquaddieUIInput.selectionState = BattleSquaddieUISelectionState.SELECTED_SQUADDIE;
            this.battleSquaddieSelectedHUD.mouseClickedSquaddieSelected(dynamicSquaddieId, mouseX, mouseY);
            return;
        }

        const {
            staticSquaddie,
            dynamicSquaddie,
            dynamicSquaddieId,
        } = getResultOrThrowError(this.squaddieRepo.getSquaddieByDynamicID(this.battleSquaddieUIInput.selectedSquaddieDynamicID));

        const newSelectionState: BattleSquaddieUISelectionState = calculateNewBattleSquaddieUISelectionState(
            {
                tileClickedOn: clickedHexCoordinate,
                selectionState: this.battleSquaddieUIInput.selectionState,
                missionMap: this.missionMap,
                squaddieRepository: this.squaddieRepo,
                selectedSquaddieDynamicID: dynamicSquaddieId
            }
        );

        if (newSelectionState === BattleSquaddieUISelectionState.MOVING_SQUADDIE) {
            const searchResults: SearchResults = getResultOrThrowError(
                this.pathfinder.findPathToStopLocation(new SearchParams({
                    missionMap: this.missionMap,
                    squaddieMovement: staticSquaddie.movement,
                    numberOfActions: dynamicSquaddie.squaddieTurn.getRemainingActions(),
                    startLocation: {
                        q: dynamicSquaddie.mapLocation.q,
                        r: dynamicSquaddie.mapLocation.r,
                    },
                    stopLocation: {
                        q: clickedHexCoordinate.q,
                        r: clickedHexCoordinate.r
                    },
                    squaddieAffiliation: staticSquaddie.squaddieID.affiliation
                }))
            );

            const closestRoute: SearchPath = getResultOrThrowError(searchResults.getRouteToStopLocation());
            if (closestRoute == null) {
                this.battleSquaddieUIInput.selectionState = BattleSquaddieUISelectionState.SELECTED_SQUADDIE;
                return;
            }

            this.squaddieMovePath = closestRoute;
            this.squaddieAnimationWorldCoordinatesStart = convertMapCoordinatesToWorldCoordinates(
                dynamicSquaddie.mapLocation.q,
                dynamicSquaddie.mapLocation.r,
            );
            this.squaddieAnimationWorldCoordinatesEnd = convertMapCoordinatesToWorldCoordinates(
                this.squaddieMovePath.getDestination().q,
                this.squaddieMovePath.getDestination().r,
            );
            this.animationTimer = Date.now();
            this.animationMode = AnimationMode.MOVING_SQUADDIE;

            let routeSortedByNumberOfMovementActions: TileFoundDescription[][] = getResultOrThrowError(searchResults.getRouteToStopLocationSortedByNumberOfMovementActions());

            const routeTilesByDistance = this.getHighlightedTileDescriptionByNumberOfMovementActions(routeSortedByNumberOfMovementActions);
            this.hexMap.stopHighlightingTiles();
            this.hexMap.highlightTiles(routeTilesByDistance);

            this.battleSquaddieUIInput.selectionState = BattleSquaddieUISelectionState.MOVING_SQUADDIE;
            if (this.squaddieTurnEnded()) {
                this.battleSquaddieSelectedHUD.mouseClickedNoSquaddieSelected();
                this.hexMap.stopHighlightingTiles();
            }
            return;
        }
    }

    private getHighlightedTileDescriptionByNumberOfMovementActions(routeSortedByNumberOfMovementActions: HexCoordinate[][]) {
        const routeTilesByDistance: HighlightTileDescription[] =
            routeSortedByNumberOfMovementActions.map((tiles, numberOfMovementActions) => {
                let overlayImageResourceName: string;
                switch (numberOfMovementActions) {
                    case 0:
                        break;
                    case 1:
                        overlayImageResourceName = "map icon move 1 action";
                        break;
                    case 2:
                        overlayImageResourceName = "map icon move 2 actions";
                        break;
                    default:
                        overlayImageResourceName = "map icon move 3 actions";
                        break;
                }

                if (overlayImageResourceName) {
                    return {
                        tiles,
                        pulseColor: HighlightPulseBlueColor,
                        overlayImageResourceName,
                    }
                }
                return {
                    tiles,
                    pulseColor: HighlightPulseBlueColor,
                }
            });
        return routeTilesByDistance;
    }

    private updateBattleSquaddieUIMovingSquaddie(clickedHexCoordinate?: HexCoordinate) {
        const newSelectionState: BattleSquaddieUISelectionState = calculateNewBattleSquaddieUISelectionState(
            {
                tileClickedOn: clickedHexCoordinate,
                selectionState: this.battleSquaddieUIInput.selectionState,
                missionMap: this.missionMap,
                squaddieRepository: this.squaddieRepo,
                selectedSquaddieDynamicID: this.battleSquaddieUIInput.selectedSquaddieDynamicID,
                finishedAnimating: this.hasMovementAnimationFinished()
            }
        );

        if (newSelectionState === BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED) {
            this.battleSquaddieUIInput.selectionState = newSelectionState;
            this.battleSquaddieUIInput.selectedSquaddieDynamicID = "";
            return;
        }
    }

    private hasMovementAnimationFinished() {
        const timePassed = Date.now() - this.animationTimer;
        const timeToMove = TIME_TO_MOVE;
        return (
            timePassed > timeToMove
            || !this.squaddieMovePath
            || this.squaddieMovePath.getTilesTraveled().length === 0
        );
    }

    private moveSquaddie(p: p5) {
        if (this.animationMode !== AnimationMode.MOVING_SQUADDIE) {
            return;
        }

        if (!this.squaddieMovePath) {
            return;
        }

        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(this.squaddieRepo.getSquaddieByDynamicID(
            this.battleSquaddieUIInput.selectedSquaddieDynamicID
        ));

        const timePassed = Date.now() - this.animationTimer;
        const timeToMove = TIME_TO_MOVE;
        if (this.hasMovementAnimationFinished()) {
            dynamicSquaddie.mapLocation = this.squaddieMovePath.getDestination();
            const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
                this.squaddieMovePath.getDestination().q,
                this.squaddieMovePath.getDestination().r,
                ...this.camera.getCoordinates()
            );
            this.setImageToLocation(dynamicSquaddie, xyCoords);
            this.missionMap.updateSquaddiePosition(staticSquaddie.squaddieID.id, dynamicSquaddie.mapLocation);
            this.animationMode = AnimationMode.IDLE;
        } else {
            const squaddieDrawCoordinates: [number, number] = getSquaddiePositionAlongPath(
                this.squaddieMovePath.getTilesTraveled(),
                timePassed,
                timeToMove,
                this.camera,
            )

            this.setImageToLocation(dynamicSquaddie, squaddieDrawCoordinates);
        }
        dynamicSquaddie.mapIcon.draw(p);
    }

    private highlightSquaddieReach(dynamicSquaddie: BattleSquaddieDynamic, staticSquaddie: BattleSquaddieStatic) {
        const reachableTileSearchResults: SearchResults = this.pathfinder.getAllReachableTiles(
            new SearchParams({
                missionMap: this.missionMap,
                startLocation: dynamicSquaddie.mapLocation,
                squaddieMovement: staticSquaddie.movement,
                squaddieAffiliation: staticSquaddie.squaddieID.affiliation,
                numberOfActions: dynamicSquaddie.squaddieTurn.getRemainingActions(),
            })
        );
        const movementTiles: TileFoundDescription[] = reachableTileSearchResults.allReachableTiles;
        const movementTilesByNumberOfActions: { [numberOfActions: number]: [{ q: number, r: number }?] } = reachableTileSearchResults.getReachableTilesByNumberOfMovementActions();

        const actionTiles: TileFoundDescription[] = this.pathfinder.getTilesInRange(new SearchParams({
                canStopOnSquaddies: true,
                missionMap: this.missionMap,
                minimumDistanceMoved: staticSquaddie.activities[0].minimumRange,
            }),
            staticSquaddie.activities[0].maximumRange,
            movementTiles
        );

        const tilesTraveledByNumberOfMovementActions: HexCoordinate[][] = Object.values(movementTilesByNumberOfActions);
        tilesTraveledByNumberOfMovementActions.unshift([]);
        const highlightTileDescriptions = this.getHighlightedTileDescriptionByNumberOfMovementActions(tilesTraveledByNumberOfMovementActions);

        if (actionTiles) {
            highlightTileDescriptions.push({
                    tiles: actionTiles,
                    pulseColor: HighlightPulseRedColor,
                    overlayImageResourceName: "map icon attack 1 action",
                },
            )
        }
        this.hexMap.highlightTiles(highlightTileDescriptions);
    }

    private setImageToLocation(
        dynamicSquaddieInfo: BattleSquaddieDynamic,
        xyCoords: [number, number]
    ) {
        assertBattleSquaddieDynamic(dynamicSquaddieInfo);
        dynamicSquaddieInfo.mapIcon.area.setRectLeft({left: xyCoords[0]});
        dynamicSquaddieInfo.mapIcon.area.setRectTop({top: xyCoords[1]});
        dynamicSquaddieInfo.mapIcon.area.align({horizAlign: HORIZ_ALIGN_CENTER, vertAlign: VERT_ALIGN_CENTER});
    }

    private squaddieTurnEnded(): boolean {
        return true;
    }
}
