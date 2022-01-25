import { cint3, cuint, cuint3, Packet, uint16, uint32, vector } from '../../..';
import { RegisterPacket } from '../packet';

export class HelloPacket extends Packet {
    userId: uint32 = -1;
    name: string = "";

    hash: cuint = -1;
    numTaunts: uint32 = -1;

    values: vector<vector<vector<cuint3, uint16>, "test">, cuint> = [];
    test: vector<uint32, uint16> = [];
    anotherTest: vector<string, cint3> = [];

    taunts: vector<uint16, "numTaunts"> = [];

    constant: vector<uint16, 7> = [];
}
RegisterPacket("HELLO", HelloPacket);