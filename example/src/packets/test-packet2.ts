import { int32, Packet, uint16, vector } from "../../../";
import { RegisterPacket } from "../packet";

export class TestPacket2 extends Packet {
  attr: vector<int32, 4> = [];
  attrNested: vector<vector<int32, 4>, 4> = [];
  attrLength: vector<int32, uint16> = [];

  lengthField: uint16 = -1;
  attrField: vector<int32, "lengthField"> = [];
}
RegisterPacket("TEST2", TestPacket2);
