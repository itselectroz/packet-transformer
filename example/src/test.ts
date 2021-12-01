import { Packet } from "./packet";
import { HelloPacket } from "./packets/hello-packet";

const helloPacket = new HelloPacket();

console.log(helloPacket);
console.log(HelloPacket.ID);
console.log(helloPacket.write != new Packet().write)