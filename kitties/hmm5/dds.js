const { Reader } = require("./reader.js");

const blockParsers = {};

blockParsers.RGB = function (block, buffer, x, y, width, height, dds) {

	let data = block[0] | (block[1] << 8) | (block[2] << 16) | (block[3] << 24);

	let r = (data >> dds.rBitMask[0]) & ((1 << (dds.rBitMask[1] - dds.rBitMask[0])) - 1);
	let g = (data >> dds.gBitMask[0]) & ((1 << (dds.gBitMask[1] - dds.gBitMask[0])) - 1);
	let b = (data >> dds.bBitMask[0]) & ((1 << (dds.bBitMask[1] - dds.bBitMask[0])) - 1);
	let a = 0xff;
	if (dds.aBitMask) {
		a = (data >> dds.aBitMask[0]) & ((1 << (dds.aBitMask[1] - dds.aBitMask[0])) - 1);
	}

	let offset = (y * width + x) << 2;

	buffer[offset] = r;
	buffer[offset + 1] = g;
	buffer[offset + 2] = b;
	buffer[offset + 3] = a;

};

blockParsers.BC1 = function (block, buffer, x, y, width, height, dds) {

	const parse565 = function (data, data2) {
		data = data | (data2 << 8);
		let b = Math.round(0xff * ((data & 0b11111) / 0b100000));
		let g = Math.round(0xff * (((data >> 5) & 0b111111) / 0b1000000));
		let r = Math.round(0xff * (((data >> 11) & 0b11111) / 0b100000));
		return [r, g, b];
	};

	let colors = [
		parse565(block[0], block[1]),
		parse565(block[2], block[3])
	];
	colors.push([
		Math.round(colors[0][0] * 2 / 3 + colors[1][0] / 3),
		Math.round(colors[0][1] * 2 / 3 + colors[1][1] / 3),
		Math.round(colors[0][2] * 2 / 3 + colors[1][2] / 3)
	]);
	colors.push([
		Math.round(colors[1][0] * 2 / 3 + colors[0][0] / 3),
		Math.round(colors[1][1] * 2 / 3 + colors[0][1] / 3),
		Math.round(colors[1][2] * 2 / 3 + colors[0][2] / 3)
	]);

	for (let looper = 0; looper < 16; ++looper) {
		let byte = block[4 + (looper >> 2)];
		let index = (byte >> ((looper % 4) << 1)) & 0x3;
		let newY = (looper >> 2) + y;
		let newX = (looper % 4) + x;
		let offset = (newY * width + newX) << 2;
		buffer[offset] = colors[index][0];
		buffer[offset + 1] = colors[index][1];
		buffer[offset + 2] = colors[index][2];
		buffer[offset + 3] = 0xff;
	}

};

blockParsers.BC2 = function (block, buffer, x, y, width, height, dds) {

	let alphas = [];
	for (let looper = 0; looper < 16; ++looper) {
		let byte = block[looper >> 1];
		let alpha = (byte >> ((looper % 2) << 2)) & 0b111;
		alphas.push(Math.round(0xff * (alpha / 0b111)));
	}

	const parse565 = function (data, data2) {
		data = data | (data2 << 8);
		let b = Math.round(0xff * ((data & 0b11111) / 0b100000));
		let g = Math.round(0xff * (((data >> 5) & 0b111111) / 0b1000000));
		let r = Math.round(0xff * (((data >> 11) & 0b11111) / 0b100000));
		return [r, g, b];
	};

	let colors = [
		parse565(block[8], block[9]),
		parse565(block[10], block[11])
	];
	colors.push([
		Math.round(colors[0][0] * 2 / 3 + colors[1][0] / 3),
		Math.round(colors[0][1] * 2 / 3 + colors[1][1] / 3),
		Math.round(colors[0][2] * 2 / 3 + colors[1][2] / 3)
	]);
	colors.push([
		Math.round(colors[1][0] * 2 / 3 + colors[0][0] / 3),
		Math.round(colors[1][1] * 2 / 3 + colors[0][1] / 3),
		Math.round(colors[1][2] * 2 / 3 + colors[0][2] / 3)
	]);

	for (let looper = 0; looper < 16; ++looper) {
		let byte = block[12 + (looper >> 2)];
		let index = (byte >> ((looper % 4) << 1)) & 0x3;
		let newY = (looper >> 2) + y;
		let newX = (looper % 4) + x;
		let offset = (newY * width + newX) << 2;
		buffer[offset] = colors[index][0];
		buffer[offset + 1] = colors[index][1];
		buffer[offset + 2] = colors[index][2];
		buffer[offset + 3] = alphas[looper];
	}

};

blockParsers.BC3 = function (block, buffer, x, y, width, height, dds) {

	let alphaSlots = [block[0], block[1]];
	if (alphaSlots[0] > alphaSlots[1]) {
		alphaSlots[2] = Math.round((alphaSlots[0] * 6 + alphaSlots[1] * 1) / 7);
		alphaSlots[3] = Math.round((alphaSlots[0] * 5 + alphaSlots[1] * 2) / 7);
		alphaSlots[4] = Math.round((alphaSlots[0] * 4 + alphaSlots[1] * 3) / 7);
		alphaSlots[5] = Math.round((alphaSlots[0] * 3 + alphaSlots[1] * 4) / 7);
		alphaSlots[6] = Math.round((alphaSlots[0] * 2 + alphaSlots[1] * 5) / 7);
		alphaSlots[7] = Math.round((alphaSlots[0] * 1 + alphaSlots[1] * 6) / 7);
	} else {
		alphaSlots[2] = Math.round((alphaSlots[0] * 4 + alphaSlots[1] * 1) / 5);
		alphaSlots[3] = Math.round((alphaSlots[0] * 3 + alphaSlots[1] * 2) / 5);
		alphaSlots[4] = Math.round((alphaSlots[0] * 2 + alphaSlots[1] * 3) / 5);
		alphaSlots[5] = Math.round((alphaSlots[0] * 1 + alphaSlots[1] * 4) / 5);
		alphaSlots[6] = 0;
		alphaSlots[7] = 0xff;
	}

	let alphas = [];
	for (let looper = 0; looper < 16; ++looper) {
		let bit = (looper * 3);
		let byte = block[2 + (bit >> 3)];
		if (bit % 8 > 5) {
			byte = byte | (block[3 + (bit >> 3)] << 8);
		}
		let value = (byte >> (bit % 8)) & 0b111;
		alphas.push(alphaSlots[value]);
	}

	const parse565 = function (data, data2) {
		data = data | (data2 << 8);
		let b = Math.round(0xff * ((data & 0b11111) / 0b100000));
		let g = Math.round(0xff * (((data >> 5) & 0b111111) / 0b1000000));
		let r = Math.round(0xff * (((data >> 11) & 0b11111) / 0b100000));
		return [r, g, b];
	};

	let colors = [
		parse565(block[8], block[9]),
		parse565(block[10], block[11])
	];
	colors.push([
		Math.round(colors[0][0] * 2 / 3 + colors[1][0] / 3),
		Math.round(colors[0][1] * 2 / 3 + colors[1][1] / 3),
		Math.round(colors[0][2] * 2 / 3 + colors[1][2] / 3)
	]);
	colors.push([
		Math.round(colors[1][0] * 2 / 3 + colors[0][0] / 3),
		Math.round(colors[1][1] * 2 / 3 + colors[0][1] / 3),
		Math.round(colors[1][2] * 2 / 3 + colors[0][2] / 3)
	]);

	for (let looper = 0; looper < 16; ++looper) {
		let byte = block[12 + (looper >> 2)];
		let index = (byte >> ((looper % 4) << 1)) & 0x3;
		let newY = (looper >> 2) + y;
		let newX = (looper % 4) + x;
		let offset = (newY * width + newX) << 2;
		buffer[offset] = colors[index][0];
		buffer[offset + 1] = colors[index][1];
		buffer[offset + 2] = colors[index][2];
		buffer[offset + 3] = alphas[looper];
	}

};

const DDS = function DDS(content) {

	let reader = new Reader(content);

	if ("DDS " !== reader.readString(4)) {
		throw new Error("Invalid DDS header");
	}

	if (reader.readUInt32() !== 124) {
		throw new Error("Invalid DDS header size");
	}

	this.size = {};

	let flag = reader.readUInt32();
	let flags = {
		"caps": (flag & 0x1) ? true : false,
		"height": (flag & 0x2) ? true : false,
		"width": (flag & 0x4) ? true : false,
		"pitch": (flag & 0x8) ? true : false,
		"pixelFormat": (flag & 0x1000) ? true : false,
		"mipMapCount": (flag & 0x20000) ? true : false,
		"linearSize": (flag & 0x80000) ? true : false,
		"depth": (flag & 0x800000) ? true : false,
	};

	let height = reader.readUInt32();
	if (flags.height) {
		this.size.height = height;
	}
	let width = reader.readUInt32();
	if (flags.width) {
		this.size.width = width;
	}

	let pitchOrLinearSize = reader.readUInt32();
	if (flags.pitch) {
		this.pitch = pitchOrLinearSize;
	} else if (flags.linearSize) {
		this.linearSize = pitchOrLinearSize;
	}

	let depth = reader.readUInt32();
	if (flags.depth) {
		this.depth = depth;
	}

	let mipMapCount = reader.readUInt32();
	if (flags.mipMapCount) {
		this.mipMapCount = mipMapCount;
	}

	reader.skip(11 * 4, 0);

	if (reader.readUInt32() !== 32) {
		throw new Error("Invalid DDS pixel format size");
	}
	flag = reader.readUInt32();
	flags = {
		"alphaPixels": (flag & 0x1) ? true : false,
		"alpha": (flag & 0x2) ? true : false,
		"fourCC": (flag & 0x4) ? true : false,
		"rgb": (flag & 0x40) ? true : false,
		"yuv": (flag & 0x200) ? true : false,
		"luminance": (flag & 0x20000) ? true : false,
	};
	let fourCC = reader.readUInt32();
	if (flags.fourCC) {
		switch (fourCC) {
			case 0x31545844: { this.format = "BC1"; break; }; // DXT1
			case 0x33545844: { this.format = "BC2"; break; }; // DXT3
			case 0x34545844: { this.format = "BC3"; break; }; // DXT4
			case 0x35545844: { this.format = "BC3"; break; }; // DXT5
			default: { 
				let buffer = Buffer.alloc(4);
				buffer.writeUInt32LE(fourCC);
				@dump([fourCC, buffer, new Reader(buffer).readString(4)]);
				break;
			};
		}
	}
	let rgbBitCount = reader.readUInt32();
	let rBitMask = reader.readUInt32();
	let gBitMask = reader.readUInt32();
	let bBitMask = reader.readUInt32();
	let aBitMask = reader.readUInt32();
	if (flags.rgb || flags.yuv || flags.luminance) {
		if (flags.rgb) {
			this.format = "RGB";
		} else if (flags.yuv) {
			this.format = "YUV";
		} else if (flgas.luminance) {
			this.format = "LUMINANCE";
		}
		this.rgbBitCount = rgbBitCount;

		const resolveMask = (mask) => {
			let from = 0;
			let to = 0;
			while (mask !== 0) {
				++to;
				if ((mask & 0x1) === 0) {
					++from;
				}
				mask = (mask >> 1) & 0x7fffffff;
			}	
			return [from, to];
		};

		this.rBitMask = resolveMask(rBitMask);
		this.gBitMask = resolveMask(gBitMask);
		this.bBitMask = resolveMask(bBitMask);
		if (flags.alphaPixels) {
			this.aBitMask = resolveMask(aBitMask);
		}

	}

	let caps = [reader.readUInt32(), reader.readUInt32(), reader.readUInt32(), reader.readUInt32()];
	if (caps[1] & 0x200) {
		this.cubeMap = {};
	} 
	if (caps[1] & 0x400) { this.cubeMap.positiveX = {}; }
	if (caps[1] & 0x800) { this.cubeMap.negativeX = {}; }
	if (caps[1] & 0x1000) { this.cubeMap.positiveY = {}; }
	if (caps[1] & 0x2000) { this.cubeMap.negativeY = {}; }
	if (caps[1] & 0x4000) { this.cubeMap.positiveZ = {}; }
	if (caps[1] & 0x8000) { this.cubeMap.negativeZ = {}; }
	if (caps[1] & 0x200000) { this.cubeMap.volume = {}; }
	
	let reserved = reader.readUInt32(); 

	this.completeInfo();

	this.data = this.loadData(reader, this.size.width, this.size.height);

};

DDS.prototype.loadData = function (reader, width, height) {

	let parser = blockParsers[this.format];

	let buffer = Buffer.alloc(width * height * 4);

	let y = 0;
	while (y < height) {

		let x = 0;
		while (x < width) {

			let blob = reader.readBLOB(this.blockSizes[1]);

			parser(blob, buffer, x, y, width, height, this);

			x += this.blockSizes[2];
		}

		y += this.blockSizes[2];
	}

	return buffer;

};

DDS.prototype.completeInfo = function () {

	switch (this.format) {

		case "BC1": { this.blockSizes = [48, 8, 4]; break; };
		case "BC2": { this.blockSizes = [48, 16, 4]; break; };
		case "BC3": { this.blockSizes = [64, 16, 4]; break; };

		case "RGB": { 
			this.blockSizes = [
				this.rgbBitCount >> 3, 
				this.rgbBitCount >> 3, 
				1]; 
			break; 
		};

		default: {
			@dump(this.format);
			throw new Error("Unknown format for DDS file");
			break;
		};
	}

};

DDS.prototype.encodeAsPNG = function () {

	let image = @.img(this.size.width, this.size.height, this.data);

	return image.encodeAsPNG();

};

module.exports.DDS = DDS;
