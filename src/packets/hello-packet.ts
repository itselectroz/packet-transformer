import { RegisterPacket, Packet, uint32, cuint, vector } from '../packet';

RegisterPacket("HELLO")
export class HelloPacket extends Packet {
    userId: uint32 = -1;
    name: string = "";

    hash: cuint = -1;

    values: vector<cuint, cuint> = [];
}