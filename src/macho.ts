// See: https://github.com/apple-opensource-mirror/llvmCore/blob/0c60489d96c87140db9a6a14c6e82b15f5e5d252/include/llvm/Object/MachOFormat.h#L108-L112
// And: https://en.wikipedia.org/wiki/Mach-O#Mach-O_header
const MACHO_MAGIC = new Set([
  // 32-bit Mach-O
  0xfeedface, 0xcefaedfe,

  // 64-bit Mach-O
  0xfeedfacf, 0xcffaedfe,
]);

const MACHO_UNIVERSAL_MAGIC = new Set([
  // universal
  0xcafebabe, 0xbebafeca,
]);

export const isMachO = (fileContent: Buffer): boolean => {
  return MACHO_MAGIC.has(fileContent.readUInt32LE(0));
};

export const isUniversalMachO = (fileContent: Buffer): boolean => {
  return MACHO_UNIVERSAL_MAGIC.has(fileContent.readUInt32LE(0));
};
