export class PriorityQueue {
    items: CostReportable[];

    constructor() {
        this.items = [];
    }

    isEmpty(): boolean {
        return this.items.length < 1;
    }

    enqueue(item: CostReportable): void {
        this.items.push(item);

        this.items.sort((a, b) => {
            if (a.getTotalMovementCost() < b.getTotalMovementCost()) {
                return -1;
            }
            if (a.getTotalMovementCost() > b.getTotalMovementCost()) {
                return 1;
            }
            return 0;
        })
    }

    peek(): CostReportable | undefined {
        if (this.items.length > 0) {
            return this.items[0];
        }
        return undefined;
    }

    dequeue(): CostReportable | undefined {
        const next: CostReportable = this.peek();
        if (this.items.length > 0) {
            this.items.shift();
        }
        return next;
    }
}
