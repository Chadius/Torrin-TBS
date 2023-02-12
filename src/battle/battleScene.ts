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
  convertMapCoordinatesToScreenCoordinates,
  convertScreenCoordinatesToWorldCoordinates,
  convertWorldCoordinatesToMapCoordinates,
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

type RequiredOptions = {
  p: p5;
  width: PositiveNumber;
  height: PositiveNumber;
};

type Options = {
  resourceHandler: ResourceHandler;
  cutscene: Cutscene;
}

export class BattleScene {
  width: PositiveNumber;
  height: PositiveNumber;
  hexMap: HexMap;
  cutscene: Cutscene;
  resourceHandler: ResourceHandler;

  squaddiesByID: {
    [id: string]: {
      squaddieID: SquaddieID,
      movement: SquaddieMovement,
      activities: SquaddieActivity[],
      mapLocation: HexCoordinate,
      mapIcon?: ImageUI,
      squaddieTurn: SquaddieTurn,
    }
  }

  pathfinder: Pathfinder;
  turnBySquaddieId: {[key: string]: SquaddieTurn}

  camera: BattleCamera;

  constructor(options: RequiredOptions & Partial<Options>) {
    assertsPositiveNumber(options.width);
    this.width = options.width;
    assertsPositiveNumber(options.height);
    this.height = options.height;

    this.camera = new BattleCamera(0, 100);
    this.resourceHandler = options.resourceHandler;
    this.prepareSquaddies();
    this.prepareMap();
  }

  private prepareSquaddies() {
    this.turnBySquaddieId = {};
    this.squaddiesByID = {
      "0000": {
        squaddieID:  new SquaddieID({
          id: "0000",
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
        mapLocation: {q: 0 as Integer, r: 0 as Integer},
        squaddieTurn: new SquaddieTurn()
      }
    }

    Object.entries(this.squaddiesByID).forEach(([_, squaddieInfo]) => {
      this.resourceHandler.loadResource(squaddieInfo.squaddieID.resources.mapIconResourceKey);
    });

    Object.entries(this.squaddiesByID).forEach(([id, _]) => {
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

    this.loadAndInitializeSuqaddieResources();

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
      for (let i = 0; i < this.turnBySquaddieId["0000"].getRemainingActions(); i++) {
        p.circle(50 + (i * 55), SCREEN_HEIGHT - 70, 50);
      }
    }
  }

  private loadAndInitializeSuqaddieResources() {
    const allSquaddieIconsHaveBeenInitialized = Object.entries(this.squaddiesByID)
      .every(([_, squaddieInfo]) => squaddieInfo.mapIcon);
    if (allSquaddieIconsHaveBeenInitialized) {
      return;
    }

    const squaddieResourceKeys = Object.entries(this.squaddiesByID)
      .map(([_, squaddieInfo]) => squaddieInfo.squaddieID.resources.mapIconResourceKey);

    if (
      this.resourceHandler.areAllResourcesLoaded([
        ...squaddieResourceKeys,
        "map icon move 1 action",
        "map icon move 2 actions",
        "map icon move 3 actions",
      ])
    ) {
      Object.entries(this.squaddiesByID)
        .forEach(([_, squaddieInfo]) => {
          let image: p5.Image = this.resourceHandler.getResource(
            squaddieInfo.squaddieID.resources.mapIconResourceKey) as p5.Image;

          const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
            squaddieInfo.mapLocation.q, squaddieInfo.mapLocation.r, ...this.camera.getCoordinates())

          squaddieInfo.mapIcon = new ImageUI({
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
    Object.entries(this.squaddiesByID)
      .forEach(([_, squaddieInfo]) => {
        if (!squaddieInfo.mapIcon) {
          return;
        }
        const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
          squaddieInfo.mapLocation.q, squaddieInfo.mapLocation.r, ...this.camera.getCoordinates())
        this.setImageToLocation(squaddieInfo, xyCoords);

        squaddieInfo.mapIcon.draw(p);
      });
  }

  mouseMoved(mouseX: number, mouseY: number) {
    if (this.cutscene && this.cutscene.isInProgress()) {
      this.cutscene.mouseMoved(mouseX, mouseY);
      return;
    }

    if(mouseX < SCREEN_WIDTH * 0.10) {
      this.camera.setXVelocity(-1);
      if(mouseX < SCREEN_WIDTH * 0.04) {
        this.camera.setXVelocity(-5);
      }
      if(mouseX < SCREEN_WIDTH * 0.02) {
        this.camera.setXVelocity(-10);
      }
    } else if(mouseX > SCREEN_WIDTH * 0.90) {
      this.camera.setXVelocity(1);
      if(mouseX > SCREEN_WIDTH * 0.96) {
        this.camera.setXVelocity(5);
      }
      if(mouseX > SCREEN_WIDTH * 0.98) {
        this.camera.setXVelocity(10);
      }
    } else {
      this.camera.setXVelocity(0);
    }

    if(mouseY < SCREEN_HEIGHT * 0.10) {
      this.camera.setYVelocity(-1);
      if(mouseY < SCREEN_HEIGHT * 0.04) {
        this.camera.setYVelocity(-5);
      }
      if(mouseY < SCREEN_HEIGHT * 0.02) {
        this.camera.setYVelocity(-10);
      }
    } else if(mouseY > SCREEN_HEIGHT * 0.90) {
      this.camera.setYVelocity(1);
      if(mouseY > SCREEN_HEIGHT * 0.96) {
        this.camera.setYVelocity(5);
      }
      if(mouseY > SCREEN_HEIGHT * 0.98) {
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

    const [worldX, worldY] = convertScreenCoordinatesToWorldCoordinates(mouseX, mouseY, ...this.camera.getCoordinates())
    const clickedTileCoordinates: [number, number] = convertWorldCoordinatesToMapCoordinates(worldX, worldY);
    const clickedHexCoordinate: HexCoordinate = {
      q: clickedTileCoordinates[0] as Integer,
      r: clickedTileCoordinates[1] as Integer
    };
    if (
      this.hexMap.areCoordinatesOnMap(clickedHexCoordinate)
    ) {
      const torrinSquaddieInfo = this.squaddiesByID["0000"];

      torrinSquaddieInfo.mapLocation = clickedHexCoordinate;

      const xyCoords: [number, number] = convertMapCoordinatesToScreenCoordinates(
        clickedTileCoordinates[0], clickedTileCoordinates[1], ...this.camera.getCoordinates());
      this.setImageToLocation(torrinSquaddieInfo, xyCoords);

      const movementTiles: TileFoundDescription[] = this.pathfinder.getAllReachableTiles(new SearchParams({
        startLocation: torrinSquaddieInfo.mapLocation,
        squaddieMovement: torrinSquaddieInfo.movement,
        numberOfActions: 3,
      }));
      const movementTilesByNumberOfActions: {[numberOfActions: Integer]: TileFoundDescription[]} = sortTileDescriptionByNumberOfMovementActions(movementTiles);
      const actionTiles: TileFoundDescription[] = this.pathfinder.getTilesInRange({
        minimumDistance: torrinSquaddieInfo.activities[0].minimumRange,
        maximumDistance: torrinSquaddieInfo.activities[0].maximumRange,
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
    }

    this.hexMap.mouseClicked(mouseX, mouseY, ...this.camera.getCoordinates());
  }

  private setImageToLocation(torrinSquaddieInfo: { squaddieID: SquaddieID; movement: SquaddieMovement; activities: SquaddieActivity[]; mapLocation: HexCoordinate; mapIcon?: ImageUI; squaddieTurn: SquaddieTurn }, xyCoords: [number, number]) {
    torrinSquaddieInfo.mapIcon.area.setRectLeft({left: xyCoords[0]});
    torrinSquaddieInfo.mapIcon.area.setRectTop({top: xyCoords[1]});
    torrinSquaddieInfo.mapIcon.area.align({horizAlign: HORIZ_ALIGN_CENTER, vertAlign: VERT_ALIGN_CENTER});
  }
}
