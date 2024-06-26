//@ts-ignore
import { wasm } from "circom_tester";
import path from "path";
import * as crypto from "crypto";
import { expect } from "chai";
//@ts-ignore
import * as snarkjs from "snarkjs";
import {
  bitArrayToHex,
  buffer2bitArray,
  getHexHashFromSha1CircuitOut,
} from "../lib/transform";
import { getNRandomBits, getStringOfNBits } from "../lib/input";
import fs from "fs";

describe("Test lib and SHA-1", () => {
  describe("Test lib", () => {
    it("Should output correct number of bits", () => {
      const bits3 = getNRandomBits(3); // "0bBBB"
      expect(parseInt(bits3, 2)).lessThanOrEqual(7);
      expect(parseInt(bits3, 2)).greaterThanOrEqual(0);
      expect(bits3).lengthOf(5);
    });

    it("Should output correctly sized string", () => {
      const str = getStringOfNBits(24); // UTF-8; should be multiple of 8
      expect(str).lengthOf(3);
      // convert to bit array --> buffer2bitArray() - from circomlib -
    });

    it("Should convert correctly bit array to hex string", () => {
      const hex = bitArrayToHex([0, 1, 0, 0, 1, 1, 0, 0]);
      expect(hex).equal("4c");
    });
  });

  describe("Computing SHA-1", () => {
    it("Should output correct hash value of a 24bits input", async () => {
      const cir = await wasm(
        path.join(__dirname, "../../test/circuits/main24.circom"),
        {
          include: path.join(__dirname, "../../node_modules"),
        }
      );

      const testStr = getStringOfNBits(24);
      const b = Buffer.from(testStr, "utf-8");
      const arrIn = buffer2bitArray(b);
      const witness = await cir.calculateWitness({ in: arrIn }, true);
      await cir.checkConstraints(witness);

      const arrOut = witness.slice(1, 161);
      const circuitHashOut = getHexHashFromSha1CircuitOut(arrOut);

      const hash = crypto.createHash("sha1").update(b).digest("hex");

      expect(hash).to.equal(circuitHashOut);
    });

    it("Should output correct hash value of 512bits inputs", async () => {
      const cir = await wasm(
        path.join(__dirname, "../../test/circuits/main512.circom"),
        {
          include: path.join(__dirname, "../../node_modules"),
        }
      );

      const testStr = getStringOfNBits(512);
      const b = Buffer.from(testStr, "utf-8");
      const arrIn = buffer2bitArray(b);
      const witness = await cir.calculateWitness({ in: arrIn }, true);
      await cir.checkConstraints(witness);

      const arrOut = witness.slice(1, 161);
      const circuitHashOut = getHexHashFromSha1CircuitOut(arrOut);

      const hash = crypto.createHash("sha1").update(b).digest("hex");

      expect(hash).to.equal(circuitHashOut);
    });
  });

  describe("Proving SHA1", () => {
    it("Should compute and verify a valid proof", async () => {
      const arrIn = {
        in: [
          1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
          1,
        ],
      };
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        arrIn,
        path.join(__dirname, "../../test/circuits/wasm/main24.wasm"),
        path.join(__dirname, "../../test/circuits/key/main24_final.zkey")
      );
      const vKey = JSON.parse(
        fs
          .readFileSync(
            path.join(__dirname, "../../test/circuits/key/verification_key.json")
          )
          .toString()
      );
      const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
      expect(res).equal(true);
    });
  });
});
