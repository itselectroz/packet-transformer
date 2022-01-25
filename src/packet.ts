export class BaseDataStructure {
    get size() {
        return 0;
    }

    private getBitSize(value: number) : number {
        let bytes = 0;
        while(value > 0) {
            value >>>= 1;
            bytes++;
        }
        
        return bytes > 0 ? bytes : 1;
    }

    write(data: Buffer) : void {

    }

    static read(data: Buffer) : any {
        return new BaseDataStructure();
    }
}

export class Packet extends BaseDataStructure {
    static ID: number = -1;
    get id() {
        return (this.constructor as any).ID;
    }

    send: boolean = true;

    static read(data: Buffer) : any {
        return new Packet();
    }
}

export class DataStructure extends BaseDataStructure {
    static read(data: Buffer) : any {
        return new DataStructure();
    }
}