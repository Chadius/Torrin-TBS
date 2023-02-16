import p5 from "p5";
import {HexCoordinate, Integer} from "../hexMap/hexGrid";
import {HexMap} from "../hexMap/hexMap";
import {Cutscene} from "../cutscene/cutscene";
import {ResourceHandler} from "../resource/resourceHandler";
import {assertsPositiveNumber, PositiveNumber} from "../utils/math";
import {SquaddieID} from "../squaddie/id";
import {SquaddieResource} from "../squaddie/resource";
import {ImageUI} from "../ui/imageUI";
import {RectArea} from "../ui/rectArea";
import {SCREEN_HEIGHT, SCREEN_WIDTH} from "../graphicsConstants";
import {
  convertMapCoordinatesToScreenCoordinates, convertMapCoordinatesToWorldCoordinates,
  convertScreenCoordinatesToWorldCoordinates,
  convertWorldCoordinatesToMapCoordinates, convertWorldCoordinatesToScreenCoordinates,
} from "../hexMap/convertCoordinates";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../ui/constants";
import {
  Pathfinder,
  sortTileDescriptionByNumberOfMovementActions,
  TileFoundDescription
} from "../hexMap/pathfinder/pathfinder";
import {SquaddieMovement} from "../squaddie/movement";
import {SearchParams} from "../hexMap/pathfinder/searchParams";
import {drawHexMap, HighlightPulseBlueColor, HighlightPulseRedColor} from "../hexMap/hexDrawingUtils";
import {SquaddieActivity} from "../squaddie/activity";
import {SquaddieTurn} from "../squaddie/turn";
import {Trait, TraitCategory, TraitStatusStorage} from "../trait/traitStatusStorage";
import {BattleCamera} from "./battleCamera";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";

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
  hexMap: HexMap;
  cutscene: Cutscene;
  resourceHandler: ResourceHandler;

  squaddieDynamicInfoByID: {
    [id: string]: BattleSquaddieDynamic;
  }

  squaddieStaticInfoBySquaddieTypeID: {
    [id: string]: BattleSquaddieStatic;
  }

  pathfinder: Pathfinder;
  turnBySquaddieId: { [key: string]: SquaddieTurn }

  camera: BattleCamera;
  animationMode: AnimationMode;
  squaddieMovePath?: HexCoordinate;
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
          }).filterCategory(TraitCategory.CREATURE)
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
          }).filterCategory(TraitCategory.CREATURE)
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
          }).filterCategory(TraitCategory.CREATURE)
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
    this.hexMap = new HexMap({
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

    this.pathfinder = new Pathfinder({
      map: this.hexMap
    })
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
          let image: p5.Image = this.resourceHandler.getResource(
            staticInfo.squaddieID.resources.mapIconResourceKey) as p5.Image;

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

        if(this.animationMode === AnimationMode.MOVING_UNIT && id === "player_young_torrin") {
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
    if (timePassed > timeToMove) {
      squaddieDynamicInfo.mapLocation = this.squaddieMovePath;
      const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
        this.squaddieMovePath.q, this.squaddieMovePath.r, ...this.camera.getCoordinates());
      this.setImageToLocation(squaddieDynamicInfo, xyCoords);

      const movementTiles: TileFoundDescription[] = this.pathfinder.getAllReachableTiles(new SearchParams({
        startLocation: squaddieDynamicInfo.mapLocation,
        squaddieMovement: squaddieStaticInfo.movement,
        numberOfActions: 3,
      }));
      const movementTilesByNumberOfActions: { [numberOfActions: Integer]: TileFoundDescription[] } = sortTileDescriptionByNumberOfMovementActions(movementTiles);
      const actionTiles: TileFoundDescription[] = this.pathfinder.getTilesInRange({
        minimumDistance: squaddieStaticInfo.activities[0].minimumRange,
        maximumDistance: squaddieStaticInfo.activities[0].maximumRange,
        passThroughWalls: false,
        sourceTiles: movementTiles
      });

      this.hexMap.highlightTiles([
        {
          tiles: movementTilesByNumberOfActions[0 as Integer],
          pulseColor: HighlightPulseBlueColor,
        },
        {
          tiles: movementTilesByNumberOfActions[1 as Integer],
          pulseColor: HighlightPulseBlueColor,
          overlayImageResourceName: "map icon move 1 action",
        },
        {
          tiles: movementTilesByNumberOfActions[2 as Integer],
          pulseColor: HighlightPulseBlueColor,
          overlayImageResourceName: "map icon move 2 actions",
        },
        {
          tiles: movementTilesByNumberOfActions[3 as Integer],
          pulseColor: HighlightPulseBlueColor,
          overlayImageResourceName: "map icon move 3 actions",
        },
        {
          tiles: actionTiles,
          pulseColor: HighlightPulseRedColor,
          overlayImageResourceName: "map icon attack 1 action",
        },
      ]);
      this.animationMode = AnimationMode.IDLE;
    } else {
      const lerpQ: number = (
        this.squaddieAnimationWorldCoordinatesEnd[0]
        - this.squaddieAnimationWorldCoordinatesStart[0]
      ) * timePassed / timeToMove + this.squaddieAnimationWorldCoordinatesStart[0];
      const lerpR: number = (
        this.squaddieAnimationWorldCoordinatesEnd[1]
        - this.squaddieAnimationWorldCoordinatesStart[1]
      ) * timePassed / timeToMove + this.squaddieAnimationWorldCoordinatesStart[1];

      const xyCoords: [number, number] = convertWorldCoordinatesToScreenCoordinates(
        lerpQ, lerpR, ...this.camera.getCoordinates())
      this.setImageToLocation(squaddieDynamicInfo, xyCoords);
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

        this.squaddieMovePath = clickedHexCoordinate;
        this.squaddieAnimationWorldCoordinatesStart = convertMapCoordinatesToWorldCoordinates(
          squaddieToMove.mapLocation.q,
          squaddieToMove.mapLocation.r,
        );
        this.squaddieAnimationWorldCoordinatesEnd = convertMapCoordinatesToWorldCoordinates(
          this.squaddieMovePath.q,
          this.squaddieMovePath.r,
        );

        this.animationTimer = Date.now();
        this.animationMode = AnimationMode.MOVING_UNIT;
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
