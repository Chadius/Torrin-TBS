type RequiredOptions = {
    mapIconResourceKey: string;
};

export class SquaddieResource {
    mapIconResourceKey: string;

    constructor(options: RequiredOptions) {
        this.mapIconResourceKey = options.mapIconResourceKey;
    }
};

export const NullSquaddieResource: () => SquaddieResource = () => {
    return new SquaddieResource({
        mapIconResourceKey: ""
    })
}