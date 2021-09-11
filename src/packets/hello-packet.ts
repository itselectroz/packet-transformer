import { RegisterPacket, Packet, uint32, cuint } from '../packet';

RegisterPacket("HELLO")
export class HelloPacket extends Packet {
    userId: uint32 = -1;
    name: string = "";

    hash: cuint = -1;
}