import p5 from "p5";
import {HexGridTerrainTypes, HexGridTile, Integer} from "../hexMap/hexGrid";
import {HexMap} from "../hexMap/hexMap";
import {Cutscene} from "../cutscene/cutscene";
import {DialogueBox} from "../cutscene/dialogueBox";
import {SplashScreen} from "../cutscene/splashScreen";
import {DecisionTrigger} from "../cutscene/DecisionTrigger";

export type PositiveNumber = number & {_brand: 'PositiveNumber'}
function assertsPositiveNumber(value: number): asserts value is PositiveNumber {
  if(value < 0) throw new Error('Value must be a positive number');
}

export class BattleScene {
  width: PositiveNumber;
  height: PositiveNumber;
  hexMap: HexMap;
  cutscene: Cutscene;

  constructor(p: p5, w: number, h: number) {
    assertsPositiveNumber(w);
    assertsPositiveNumber(h);
    this.width = w;
    this.height = h;

    type Tile = [number, number, HexGridTerrainTypes];
    const rawTiles: Tile[] = [
      [0, -1, HexGridTerrainTypes.water],
      [0,  0, HexGridTerrainTypes.water],
      [0,  1, HexGridTerrainTypes.water],
      [0,  2, HexGridTerrainTypes.water],
      [0,  3, HexGridTerrainTypes.water],

      [ 1, -1, HexGridTerrainTypes.floor],
      [ 1,  0, HexGridTerrainTypes.floor],
      [ 1,  1, HexGridTerrainTypes.floor],
      [ 1,  2, HexGridTerrainTypes.floor],

      [ 2, -2, HexGridTerrainTypes.grass],
      [ 2, -1, HexGridTerrainTypes.grass],
      [ 2,  0, HexGridTerrainTypes.grass],
      [ 2,  1, HexGridTerrainTypes.grass],
      [ 2,  2, HexGridTerrainTypes.grass],

      [ 3, -2, HexGridTerrainTypes.sand],
      [ 3, -1, HexGridTerrainTypes.sand],
      [ 3,  0, HexGridTerrainTypes.sand],
      [ 3,  1, HexGridTerrainTypes.sand],

      [ 4, -3, HexGridTerrainTypes.stone],
      [ 4, -2, HexGridTerrainTypes.stone],
      [ 4, -1, HexGridTerrainTypes.stone],
      [ 4,  0, HexGridTerrainTypes.stone],
      [ 4,  1, HexGridTerrainTypes.stone],
    ];

    this.cutscene = new Cutscene(
      {
        actions: [
            new SplashScreen({
              id: "splash",
              screenImage: p.loadImage("assets/testPortrait0001.png"),
            }),
            new DialogueBox({
              id: "welcome",
              name: "Crazy Pete's",
              text: "Welcome to Crazy Pete's!",
              portrait: p.loadImage("assets/testPortrait0001.png"),
              screenDimensions: [this.width, this.height]
            }),
            new DialogueBox({
              id: "blah",
              name: "Crazy Pete's",
              text: "Blah blah blah blah blahdy blahski!",
              portrait: p.loadImage("assets/testPortrait0001.png"),
              screenDimensions: [this.width, this.height]
            }),
            new DialogueBox({
              id: "look at this book",
              name: "Crazy Pete's",
              text: "Are you even listening? Look at this book!",
              portrait: p.loadImage("assets/testPortrait0001.png"),
              screenDimensions: [this.width, this.height]
            }),
            new DialogueBox({
              id: "purchase Offer",
              name: "Crazy Pete's",
              text: "Please buy my book!",
              portrait: p.loadImage("assets/testPortrait0001.png"),
              answers: ["Okay fine!", "No way!"],
              screenDimensions: [this.width, this.height]
            }),
          new DialogueBox({
              id: "reconsider",
              name: "Crazy Pete's",
              text: "I implore you to reconsider...",
              animationDuration: 100,
              portrait: p.loadImage("assets/testPortrait0001.png"),
              screenDimensions: [this.width, this.height]
            }),
          new DialogueBox({
              id: "sold",
              name: "Crazy Pete's",
              text: "Thank you, come again!",
              animationDuration: 100,
              portrait: p.loadImage("assets/testPortrait0001.png"),
              screenDimensions: [this.width, this.height]
            })
          ],
        decisionTriggers: [
          new DecisionTrigger({
            source_dialog_id: "purchase Offer",
            source_dialog_answer: 1,
            destination_dialog_id: "reconsider"
          }),
          new DecisionTrigger({
            source_dialog_id: "purchase Offer",
            source_dialog_answer: 0,
            destination_dialog_id: "sold"
          }),
          new DecisionTrigger({
            source_dialog_id: "reconsider",
            destination_dialog_id: "purchase Offer"
          })
        ],
        screenDimensions: [p.width, p.height]
      }
    );
    this.cutscene.start();

    this.hexMap = new HexMap( rawTiles.map(triple => {
      return new HexGridTile(triple[0], triple[1], triple[2])
    }));

    this.hexMap.highlightTiles(
      [
        {
          q: 0 as Integer,
          r: 0 as Integer,
        },
        {
          q: 2 as Integer,
          r: 0 as Integer,
        }
      ],
      {
        hue: 0,
        saturation: 80,
        brightness: 80,
        lowAlpha: 80,
        highAlpha: 90,
        periodAlpha: 2000,
      },
    );
  }

  draw(p: p5)  {
    p.colorMode("hsb", 360, 100, 100, 255)
    p.background(50, 10, 20);

    if (this.hexMap) {
      this.hexMap.draw(p);
    }

    if (this.cutscene && this.cutscene.isInProgress()) {
      this.cutscene.update();
      this.cutscene.draw(p);
    }
  }

  mouseClicked(mouseX: number, mouseY: number) {
    if (this.cutscene && this.cutscene.isInProgress()) {
      this.cutscene.mouseClicked(mouseX, mouseY);
      return;
    }

    this.hexMap.stopHighlightingTiles();
    this.hexMap.mouseClicked(mouseX, mouseY);
  }
}
