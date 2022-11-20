# packet-transformer

[![Version](https://img.shields.io/npm/v/packet-transformer.svg?style=flat-square)](https://www.npmjs.com/package/packet-transformer)
[![Downloads](https://img.shields.io/npm/dt/packet-transformer.svg?style=flat-square)](https://www.npmjs.com/package/packet-transformer)
[![License](https://img.shields.io/github/license/itselectroz/packet-transformer)](https://www.npmjs.com/package/packet-transformer)

**packet-transformer** is a package for transforming basic data structures to have read/write capabilities.

This package was created for working with packets in the game [Brawlhalla](https://www.brawlhalla.com).

It can be adapted for any game or system and is incredibly useful for defining file formats as data structures.

<!-- Commented out as it is currently using a c+p'd version of this -->

<!-- An example use is in my [abc-disassembler](https://github.com/itselectroz/abc-disassembler) library. -->

## Installation

You can install **packet-transformer** through the command line using `npm` or `yarn`.

```console
npm install packet-transformer
```

## Setup

This project requires [ttypescript](https://github.com/cevek/ttypescript) to work.
This can be installed as a drop-in replacement for typescript, replacing `tsc` with `ttsc`. Check their repo for more information.

Once ttsc is installed, add the plugin to your `tsconfig.json`:

```json
{
  ...
  "compilerOptions": {
    ...
    "plugins": [
      {
        "transform": "./node_modules/packet-transformer/dist/index.js",
        "type": "raw"
      }
    ],
  },
}
```

## Usage

Once properly setup you can import types and Packet from **packet-transformer** and create your own packets.

Below is an example packet; `HelloPacket`.

```javascript
import {
  cint3,
  cuint,
  cuint3,
  Packet,
  uint16,
  uint32,
  vector,
} from "packet-transformer";

export class HelloPacket extends Packet {
  email: string = ""; // The value here is a default for if read is never called.
  pwHash: string = ""; // A method read() will be generated that reads all this data from a buffer.
  username: string = "";

  ticket: vector<byte, cuint> = [];

  userId: string = "";
  platform: byte = -1;
}
```

This class we be transformed at build time to contain two methods:

- `HelloPacket.read(buffer): HelloPacket`

  > \<static\> read a packet from a buffer, a custom buffer implementation is needed which supports the following functions:
  >
  > - readBits
  > - readByte
  > - readBytes
  > - readUInt16
  > - readUInt32
  > - readInt16
  > - readInt32
  > - readCompressedUInt
  > - readCompressedInt
  > - read3bitCompressedUInt
  > - read3bitCompressedInt
  > - readUTFString
  > - readBoolean
  > - readFloat

- `packet.write(buffer): void`
  > write a packet to a buffer, a custom buffer implementation is needed which supports the following functions:
  >
  > - writeBits
  > - writeByte
  > - writeBytes
  > - writeUInt16
  > - writeUInt32
  > - writeInt16
  > - writeInt32
  > - writeCompressedUInt
  > - writeCompressedInt
  > - write3bitCompressedUInt
  > - write3bitCompressedInt
  > - writeUTFString
  > - writeBoolean
  > - writeFloat

## Documentation

### Types

The following details what types are available and what method it corresponds to, as well as some example transformations.

Please note in all examples the read method is there as an **example**. Please **omit** this when writing code.

It supports some **primitive** types as well as some **custom** types.

#### Primitives

> This package supports reading two primitive types; string, and boolean.

```typescript
export class TestPacket extends Packet {
  attr: string = "";
  attr2: boolean = false;

  // Roughly gets compiled to
  static read(buffer) {
    this.attr = buffer.readUTFString();
    this.attr2 = buffer.readBoolean();
  }
}
```

#### `type byte`

> Read as a single byte. Internally represented by a number.

```typescript
export class TestPacket extends Packet {
  attr: byte = -1;

  // Roughly gets compiled to
  static read(buffer) {
    this.attr = buffer.readByte();
  }
}
```

#### `type int16` && `type uint16`

> Read as a 2 byte int (signed or unsigned respectively). Internally represented by a number.

```typescript
export class TestPacket extends Packet {
  attr: int16 = -1;
  attr2: uint16 = -1;

  // Roughly gets compiled to
  static read(buffer) {
    this.attr = buffer.readInt16();
    this.attr2 = buffer.readUInt16();
  }
}
```

#### `type int32` && `type uint32`

> Read as a 4 byte int (signed or unsigned respectively). Internally represented by a number.

```typescript
export class TestPacket extends Packet {
  attr: int32 = -1;
  attr2: uint32 = -1;

  // Roughly gets compiled to
  static read(buffer) {
    this.attr = buffer.readInt32();
    this.attr2 = buffer.readUInt32();
  }
}
```

#### `type float`

> Read as a 4 byte floating point number. Represented internally as a number.

```typescript
export class TestPacket extends Packet {
  attr: float = -1;

  // Roughly gets compiled to
  static read(buffer) {
    this.attr = buffer.readFloat();
  }
}
```

#### `type cint` && `type cuint`

> 'Compressed' int (the name just stuck). \
> 4 bits representing size followed by the actual data:
>
> ```typescript
> let size = this.readBits(4);
> size = (size + 1) << 1;
> return this.readBits(size);
> ```

```typescript
export class TestPacket extends Packet {
  attr: cint = -1;
  attr2: cuint = -1;

  // Roughly gets compiled to
  static read(buffer) {
    this.attr = buffer.readCompressedInt();
    this.attr2 = buffer.readCompressedUInt();
  }
}
```

#### `type cint3` && `type cuint3`

> 'Compressed' 3bit size int. \
> Same as [cint](#type-cint--type-cuint) but with 3 bits for size instead of 4.

```typescript
export class TestPacket extends Packet {
  attr: cint3 = -1;
  attr2: cuint3 = -1;

  // Roughly gets compiled to
  static read(buffer) {
    this.attr = buffer.read3bitCompressedInt();
    this.attr2 = buffer.read3bitCompressedUInt();
  }
}
```

#### `type nbits<type>`

> Read a specific number of bits, must be a constant. Internally represented by a number.

```typescript
export class TestPacket extends Packet {
  attr: nbits<4> = -1;

  // Roughly gets compiled to
  static read(buffer) {
    this.attr = buffer.readBits(4);
  }
}
```

#### `type vector<type, lengthType>`

> Read a list of one type.\
> LengthType can be a constant, another type or a string constant which references an attribute of the packet.\
> Vector types can be nested.

```typescript
export class TestPacket extends Packet {
  attr: vector<int32, 4> = [];
  attrNested: vector<vector<int32, 4>, 4> = [];
  attrLength: vector<int32, uint16> = [];

  lengthField: uint16 = -1;
  attrField: vector<int32, "lengthField"> = [];

  // Roughly gets compiled to
  static read(buffer) {
    // Read 4 int32s
    var vectorValues = [];
    for (var i = 0; i < 4; i++) {
      vectorValues[i] = buffer.readInt32();
    }
    this.attr = vectorValues;

    // Nested too long to show

    // Length as uint16
    var vectorValues2 = [];
    var vectorLength2 = buffer.readUInt16();
    for (var i = 0; i < vectorLength2; i++) {
      vectorValues2[i] = buffer.readInt32();
    }
    this.attrLength = vectorValues2;

    this.lengthField = buffer.readUInt16();

    // Length is lengthField
    var vectorValues3 = [];
    for (var i = 0; i < this.lengthField; i++) {
      vectorValues3[i] = buffer.readInt32();
    }
    this.attrField = vectorValues3;
  }
}
```

#### `type custom<type>`

> Use another data structure as a type. Represented by the class it's reading.

```typescript
export class SubTestPacket extends DataStructure {
  otherField: uint32 = -1;

  // Roughly compiled to
  static read(buffer) {
    this.otherField = buffer.readUInt32();
  }
}

export class TestPacket extends Packet {
  field: uint32 = -1;

  subData: custom<SubTestPacket> = new SubTestPacket();

  // Roughly compiled to
  static read(buffer) {
    this.field = buffer.readUInt32();

    this.subData = SubTestPacket.read(buffer);
  }
}
```

## Contributing

Interested in contributing to **packet-transformer**?

Contributions are welcome, and are accepted via pull requests. Please [review these guidelines](contributing.md) before submitting any pull requests.

### Help

**Installing dependencies:**

```console
npm install
```

**Compile:**

```console
npm run build
```

## Tests

Due to its nature this project does not have any automated testing.

A test project can be found in `example/` and built using

```console
npm run test
```

## License

All code in this repository is licensed under [GPL-3.0](LICENSE).
