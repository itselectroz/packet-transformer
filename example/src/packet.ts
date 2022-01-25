import packets from "./data/packets.json"
import { Packet } from '../../';

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