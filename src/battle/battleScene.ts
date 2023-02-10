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
  convertMapCoordinatesToWorldCoordinates, convertScreenCoordinatesToWorldCoordinates,
  convertWorldCoordinatesToMapCoordinates, convertWorldCoordinatesToScreenCoordinates
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

  torrinSquaddieId: SquaddieID;
  torrinSquaddieMovement: SquaddieMovement;
  torrinSquaddieActivity: SquaddieActivity[];
  torrinMapIcon: ImageUI;

  torrinMapLocation: HexCoordinate;
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

    this.torrinSquaddieId = new SquaddieID({
      id: "0000",
      name: "Torrin",
      resources: new SquaddieResource({
        mapIcon: "map icon young torrin"
      }),
      traits: new TraitStatusStorage({
        [Trait.HUMANOID]: true,
        [Trait.MONSU]: true,
      }).filterCategory(TraitCategory.CREATURE)
    });
    this.torrinSquaddieMovement = new SquaddieMovement({
      movementPerAction: 2,
      traits: new TraitStatusStorage({
        [Trait.PASS_THROUGH_WALLS]: true,
      }).filterCategory(TraitCategory.MOVEMENT)
    })
    this.torrinSquaddieActivity = [
      new SquaddieActivity({
        name: "water saber",
        id: "torrin_water_saber",
        minimumRange: 0 as Integer,
        maximumRange: 2 as Integer,
        traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTIVITY)
      })
    ];
    this.resourceHandler.loadResource(this.torrinSquaddieId.resources.mapIcon);
    this.turnBySquaddieId[this.torrinSquaddieId.id] = new SquaddieTurn();
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

    if (
      this.resourceHandler.areAllResourcesLoaded([
        this.torrinSquaddieId.resources.mapIcon,
        "map icon move 1 action",
        "map icon move 2 actions",
        "map icon move 3 actions",
      ])
      && !this.torrinMapIcon
    ) {
      let image: p5.Image = this.resourceHandler.getResource(this.torrinSquaddieId.resources.mapIcon) as p5.Image;

      this.torrinMapLocation = {q: 0 as Integer, r: 0 as Integer};
      const xyWorldCoords = convertMapCoordinatesToWorldCoordinates(0, 0);
      const xyCoords = convertWorldCoordinatesToScreenCoordinates(
        xyWorldCoords[0], xyWorldCoords[1],
        ...this.camera.getCoordinates()
      )

      this.torrinMapIcon = new ImageUI({
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
    }

    p.colorMode("hsb", 360, 100, 100, 255)
    p.background(50, 10, 20);

    if (this.hexMap) {
      drawHexMap(p, this.hexMap, ...this.camera.getCoordinates());
    }

    if (this.torrinMapIcon) {
      const xyWorldCoords = convertMapCoordinatesToWorldCoordinates(this.torrinMapLocation.q, this.torrinMapLocation.r);
      const xyCoords = convertWorldCoordinatesToScreenCoordinates(
        xyWorldCoords[0], xyWorldCoords[1],
        ...this.camera.getCoordinates()
      );
      this.torrinMapIcon.area.setRectLeft({left: xyCoords[0]});
      this.torrinMapIcon.area.setRectTop({top: xyCoords[1]});
      this.torrinMapIcon.area.align({horizAlign: HORIZ_ALIGN_CENTER, vertAlign: VERT_ALIGN_CENTER});

      this.torrinMapIcon.draw(p);
    }

    if (this.cutscene && this.cutscene.isInProgress()) {
      this.cutscene.update();
      this.cutscene.draw(p);
    } else {
      this.camera.moveCamera();

      p.fill("#dedede");
      p.stroke("#1f1f1f");
      for (let i = 0; i < this.turnBySquaddieId[this.torrinSquaddieId.id].getRemainingActions(); i++) {
        p.circle(50 + (i * 55), SCREEN_HEIGHT - 70, 50);
      }
    }
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
      this.torrinMapLocation = clickedHexCoordinate;
      const xyWorldCoords = convertMapCoordinatesToWorldCoordinates(clickedHexCoordinate.q, clickedHexCoordinate.r);
      const xyCoords = convertWorldCoordinatesToScreenCoordinates(xyWorldCoords[0], xyWorldCoords[1], ...this.camera.getCoordinates())

      this.torrinMapIcon.area.setRectLeft({left: xyCoords[0]});
      this.torrinMapIcon.area.setRectTop({top: xyCoords[1]});
      this.torrinMapIcon.area.align({horizAlign: HORIZ_ALIGN_CENTER, vertAlign: VERT_ALIGN_CENTER});

      const movementTiles: TileFoundDescription[] = this.pathfinder.getAllReachableTiles(new SearchParams({
        startLocation: this.torrinMapLocation,
        squaddieMovement: this.torrinSquaddieMovement,
        numberOfActions: 3,
      }));
      const movementTilesByNumberOfActions: {[numberOfActions: Integer]: TileFoundDescription[]} = sortTileDescriptionByNumberOfMovementActions(movementTiles);
      const actionTiles: TileFoundDescription[] = this.pathfinder.getTilesInRange({
        minimumDistance: this.torrinSquaddieActivity[0].minimumRange,
        maximumDistance: this.torrinSquaddieActivity[0].maximumRange,
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
}
