import packets from "./data/packets.json"

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

    static read(data: Buffer) : Packet {
        return new Packet();
    }

    write(data: Buffer) : void {

    }
}

export class DataStructure {
    static read(data: Buffer) : DataStructure {
        return new DataStructure();
    }

    write(data: Buffer) : void {
        
    }
}

export const PACKET_ID_MAP: {
    [id: number]: typeof Packet
} = {};
export const PACKET_NAME_MAP: {
    [name: string]: typeof Packet
} = {};

export function RegisterPacket(name: string, packetClass: typeof Packet) {
    if(!(name in packets)) {
        throw new RangeError(`Expected valid packet name, got '${name}'`);
    }

    const packetId: number = (packets as any)[name];

    if(packetId == undefined || packetId == -1) {
        throw new RangeError(`Expected valid packet id, got id '${packetId}' from packet '${name}'`);
    }

    packetClass.ID = packetId;

    PACKET_ID_MAP[packetId] = packetClass;
    PACKET_NAME_MAP[packetId] = packetClass;
}