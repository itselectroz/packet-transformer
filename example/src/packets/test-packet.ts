import { DataStructure, Packet, RegisterPacket, uint32 } from "../packet";

export class SubTestPacket extends DataStructure {
    otherField: uint32 = -1;
}

export class TestPacket extends Packet {
    field: uint32 = -1;
}
RegisterPacket("AUTH", TestPacket);