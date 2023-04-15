import {OrchestratorComponent, OrchestratorComponentMouseEvent} from "./orchestrator/orchestratorComponent";
import {OrchestratorState} from "./orchestrator/orchestratorState";
import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {MissionMap} from "../missionMap/missionMap";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {Pathfinder} from "../hexMap/pathfinder/pathfinder";
import {SquaddieId} from "../squaddie/id";
import {SquaddieResource} from "../squaddie/resource";
import {Trait, TraitCategory, TraitStatusStorage} from "../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../squaddie/movement";
import {SquaddieActivity} from "../squaddie/activity";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {SquaddieTurn} from "../squaddie/turn";
import {BattleSquaddieTeam} from "./battleSquaddieTeam";
import p5 from "p5";
import {convertMapCoordinatesToScreenCoordinates} from "../hexMap/convertCoordinates";
import {ImageUI} from "../ui/imageUI";
import {RectArea} from "../ui/rectArea";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../ui/constants";

const mapMovementAndAttackIcons: string[] = [
    "map icon move 1 action",
    "map icon move 2 actions",
    "map icon move 3 actions",
    "map icon attack 1 action"
];

export class BattleMissionLoader implements OrchestratorComponent {
    startedLoading: boolean;
    finishedPreparations: boolean;

    affiliateIconResourceKeys: string[];
    staticSquaddieResourceKeys: string[];

    constructor() {
        this.startedLoading = false;
        this.finishedPreparations = false;
    }

    private loadMap(state: OrchestratorState) {
        state.hexMap = new TerrainTileMap({
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
            resourceHandler: state.resourceHandler,
        });

        state.resourceHandler.loadResources(mapMovementAndAttackIcons);

        state.missionMap = new MissionMap({
            terrainTileMap: state.hexMap
        })

        state.pathfinder = new Pathfinder();

        this.startedLoading = true;
    }

    private loadSquaddies(state: OrchestratorState) {
        state.squaddieRepo.addStaticSquaddie({
            squaddieId: new SquaddieId({
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
        state.squaddieRepo.addStaticSquaddie({
            squaddieId: new SquaddieId({
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
        state.squaddieRepo.addStaticSquaddie({
            squaddieId: new SquaddieId({
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

        state.squaddieRepo.addDynamicSquaddie("player_young_torrin", new BattleSquaddieDynamic({
            staticSquaddieId: "player_young_torrin",
            mapLocation: {q: 0, r: 0},
            squaddieTurn: new SquaddieTurn()
        }))
        state.squaddieRepo.addDynamicSquaddie("player_sir_camil", new BattleSquaddieDynamic({
            staticSquaddieId: "player_sir_camil",
            mapLocation: {q: 1, r: 1},
            squaddieTurn: new SquaddieTurn()
        }))
        state.squaddieRepo.addDynamicSquaddie("enemy_demon_slither_0", new BattleSquaddieDynamic({
            staticSquaddieId: "enemy_demon_slither",
            mapLocation: {q: 1, r: 2},
            squaddieTurn: new SquaddieTurn()
        }))

        state.battlePhaseTracker.addTeam(new BattleSquaddieTeam({
            affiliation: SquaddieAffiliation.PLAYER,
            name: "Crusaders",
            squaddieRepo: state.squaddieRepo,
            dynamicSquaddieIds: ["player_young_torrin", "player_sir_camil"],
        }));
        state.battlePhaseTracker.addTeam(new BattleSquaddieTeam({
            affiliation: SquaddieAffiliation.ENEMY,
            name: "Infiltrators",
            squaddieRepo: state.squaddieRepo,
            dynamicSquaddieIds: ["enemy_demon_slither_0"],
        }));
        state.battlePhaseTracker.advanceToNextPhase();

        this.affiliateIconResourceKeys = [
            "affiliate icon crusaders",
            "affiliate icon infiltrators",
            "affiliate icon western",
            "affiliate icon none",
        ];
        state.resourceHandler.loadResources(this.affiliateIconResourceKeys);

        const staticSquaddies: BattleSquaddieStatic[] = state.squaddieRepo.getStaticSquaddieIterator().map(info => info.staticSquaddie);
        this.staticSquaddieResourceKeys = staticSquaddies.map(staticSquaddie => staticSquaddie.squaddieId.resources.mapIconResourceKey);
        state.resourceHandler.loadResources(this.staticSquaddieResourceKeys);

        state.squaddieRepo.getDynamicSquaddieIterator().forEach((info) => {
            const {
                dynamicSquaddie,
                dynamicSquaddieId
            } = info;

            const {
                staticSquaddie
            } = getResultOrThrowError(state.squaddieRepo.getSquaddieByDynamicID(dynamicSquaddieId))

            state.missionMap.addSquaddie(staticSquaddie.squaddieId, dynamicSquaddie.mapLocation);
        })
    }

    update(state: OrchestratorState) {
        if (!this.startedLoading) {
            this.loadMap(state);
            this.loadSquaddies(state);
            return;
        }
        if (this.startedLoading && state.resourceHandler.areAllResourcesLoaded([
            ...mapMovementAndAttackIcons,
            ...this.affiliateIconResourceKeys,
            ...this.staticSquaddieResourceKeys,
        ])) {
            this.initializeSquaddieResources(state);
            this.initializeCameraPosition(state);
            this.finishedPreparations = true;
        }
    }

    private initializeSquaddieResources(state: OrchestratorState) {
        state.squaddieRepo.getDynamicSquaddieIterator().forEach((info) => {
            const {dynamicSquaddie, dynamicSquaddieId} = info;
            const {staticSquaddie} = getResultOrThrowError(state.squaddieRepo.getSquaddieByDynamicID(dynamicSquaddieId));

            let image: p5.Image = getResultOrThrowError(
                state.resourceHandler.getResource(staticSquaddie.squaddieId.resources.mapIconResourceKey)
            );

            const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
                dynamicSquaddie.mapLocation.q, dynamicSquaddie.mapLocation.r, ...state.camera.getCoordinates())

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

    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent) {};

    hasCompleted(state: OrchestratorState): boolean {
        return this.finishedPreparations;
    }

    private initializeCameraPosition(state: OrchestratorState) {
        const mapDimensions = state.hexMap.getDimensions();
        state.camera.setMapDimensionBoundaries(mapDimensions.widthOfWidestRow, mapDimensions.numberOfRows);
    }
}
