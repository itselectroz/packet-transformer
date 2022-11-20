import { custom, DataStructure, nbits, Packet, uint32 } from "../../../";
import { RegisterPacket } from "../packet";

export class SubTestPacket extends DataStructure {
  otherField: uint32 = -1;
}

export class TestPacket extends Packet {
  field: uint32 = -1;
  field2: nbits<4> = -1;

  subData: custom<SubTestPacket> = new SubTestPacket();
}
RegisterPacket("AUTH", TestPacket);
