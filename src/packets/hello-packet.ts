import { RegisterPacket, Packet, uint32, cuint, vector, uint16 } from '../packet';

export class HelloPacket extends Packet {
    userId: uint32 = -1;
    name: string = "";

    hash: cuint = -1;
    numTaunts: uint32 = -1;

    values: vector<vector<vector<uint32, uint16>, "test">, cuint> = [];
    test: vector<uint32, uint16> = [];

    taunts: vector<uint16, "numTaunts"> = [];
}
RegisterPacket("HELLO", HelloPacket);