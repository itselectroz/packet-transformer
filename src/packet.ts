export function RegisterPacket(name: string) {
}

export type int16 = number;
export type uint16 = number;

export type int32 = number;
export type uint32 = number;

export type cint = number;
export type cuint = number;

export type cint3 = number;
export type cuint3 = number;

export type vector<type, _lengthType> = type[];

export class Packet {
    static ID: number = -1;
    id: number = -1;

    static read(data: Buffer) : Packet {
        return new Packet();
    }

    write(data: Buffer) : void {

    }
}