export class IpUtils {
  /**
   * Converts IPv4 dotted decimal string to unsigned 32-bit integer.
   * Throws Error if format is invalid.
   */
  public static ipv4ToInt(ip: string): number {
    const parts = ip.trim().split('.');
    if (parts.length !== 4) {
      throw new Error(`Invalid IPv4 address format: "${ip}"`);
    }

    let result = 0;
    for (let i = 0; i < 4; i++) {
      const byte = Number(parts[i]);
      if (isNaN(byte) || byte < 0 || byte > 255 || parts[i] === '') {
        throw new Error(`Invalid IPv4 byte in address "${ip}": ${parts[i]}`);
      }
      result = (result << 8) | byte;
    }
    return result >>> 0; // Convert to unsigned 32-bit int
  }

  /**
   * Converts unsigned 32-bit integer to IPv4 dotted decimal string.
   */
  public static intToIpv4(intVal: number): string {
    const u = intVal >>> 0;
    return [
      (u >>> 24) & 255,
      (u >>> 16) & 255,
      (u >>> 8) & 255,
      u & 255
    ].join('.');
  }

  /**
   * Parses IPv4 CIDR string (e.g., "192.168.1.0/24" or "10.0.0.1")
   * Returns base IP as int and prefix length (0-32).
   */
  public static parseIpv4Cidr(cidr: string): { baseInt: number; prefixLen: number } {
    const [ipPart, prefixPart] = cidr.trim().split('/');
    const baseInt = this.ipv4ToInt(ipPart);

    let prefixLen = 32;
    if (prefixPart !== undefined) {
      prefixLen = Number(prefixPart);
      if (isNaN(prefixLen) || prefixLen < 0 || prefixLen > 32) {
        throw new Error(`Invalid CIDR prefix length in "${cidr}": ${prefixPart}`);
      }
    }

    // Zero out bits beyond prefixLen
    const mask = prefixLen === 0 ? 0 : (~0 << (32 - prefixLen)) >>> 0;
    const maskedBase = (baseInt & mask) >>> 0;

    return { baseInt: maskedBase, prefixLen };
  }

  /**
   * Gets the bit value (0 or 1) at bitIndex (0 is MSB bit 31, 31 is LSB bit 0).
   */
  public static getBit(u32: number, bitIndex: number): number {
    return (u32 >>> (31 - bitIndex)) & 1;
  }

  /**
   * Checks whether a string is an IPv4 address or CIDR.
   */
  public static isIpv4(ipOrCidr: string): boolean {
    const clean = ipOrCidr.split('/')[0].trim();
    const parts = clean.split('.');
    if (parts.length !== 4) return false;
    for (const p of parts) {
      const n = Number(p);
      if (isNaN(n) || n < 0 || n > 255 || p === '') return false;
    }
    return true;
  }
}
