import express from "express";
import { ethers } from "ethers";
import { KalypsoSdk } from "kalypso-sdk";
import { KalspsoConfig } from "kalypso-sdk/dist/types";
import { readFileSync } from "fs";
import BigNumber from "bignumber.js";
import cors from "cors";
import axios from "axios";
import { config } from "dotenv";

config();

const app = express();
const rpc = "https://arbitrum-sepolia.blockpi.network/v1/rpc/public";
const marketId = 3;

const provider = new ethers.JsonRpcProvider(rpc);
app.use(cors());
app.use(express.json());

const sk: string = process.env.SK || "CHANGE_ME";
const wallet = new ethers.Wallet(sk, provider);

const kalypsoConfig: KalspsoConfig = JSON.parse(
  readFileSync("kalypso-config.json", "utf-8"),
);
const kalypso = new KalypsoSdk(wallet as any, kalypsoConfig);

app.get("/version", (req, res) => {
  res.send({ ref: "0.1.0", commitHash: "0abcd" });
});
app.post("/proveTx", async (req, res) => {
  const reward = "1000000000000000123";

  const latestBlock = await provider.getBlockNumber();

  const body = req.body;

  // const publicInputs = bufferFromObject(body.publicInputs);
  let abiCoder = new ethers.AbiCoder();
  const publicInputs = abiCoder.encode(
    ["uint256[5]"],
    [[pub.root, pub.nullifier, pub.out_commit, pub.delta, pub.memo]],
  );
  const encryptedSecret = bufferFromObject(body.secretInputs.encryptedData);
  const acl = bufferFromObject(body.secretInputs.aclData);

  const assignmentDeadline = new BigNumber(latestBlock).plus(10000000000);
  console.log({
    latestBlock,
    assignmentDeadline: assignmentDeadline.toFixed(0),
  });
  const proofGenerationTimeInBlocks = new BigNumber(10000000000);

  // Create ASK request
  try {
    const askRequest = await kalypso
      .MarketPlace()
      .createAskWithEncryptedSecretAndAcl(
        marketId,
        publicInputs,
        reward,
        assignmentDeadline.toFixed(0),
        proofGenerationTimeInBlocks.toFixed(0),
        await wallet.getAddress(),
        0, // TODO: keep this 0 for now
        encryptedSecret,
        acl,
      );
    await askRequest.wait();
    console.log("Ask Request Hash: ", askRequest.hash);
    res.send(askRequest.hash);
  } catch (e: any) {
    console.log("exception :", e);
    res.status(500).send({ error: e.toString() });
  }
});

app.listen(8081, async () => {
  console.log("listening to 8081");
  const address = await wallet.getAddress();
  console.log(`using wallet ${address}`);
  const walletBalanceString = (await provider.getBalance(address)).toString();
  const decimals = 18;

  const balanceStringWithDecimalPoint =
    walletBalanceString.length < 18
      ? ["0.", walletBalanceString.padStart(decimals, "0")].join("")
      : [
          walletBalanceString.slice(0, walletBalanceString.length - decimals),
          ".",
          walletBalanceString.slice(walletBalanceString.length - decimals),
        ].join("");
  console.log(
    `current balance is  ${Number.parseFloat(balanceStringWithDecimalPoint)}`,
  );
});

import { pub, sec } from "./plaintext.json";
const callProveTx = async () => {
  try {
    let abiCoder = new ethers.AbiCoder();
    let secret = sec;

    let inputBytes = abiCoder.encode(
      ["uint256[5]"],
      [[pub.root, pub.nullifier, pub.out_commit, pub.delta, pub.memo]],
    );
    const secretString = JSON.stringify(secret);
    const encryptedRequestData = await kalypso
      .MarketPlace()
      .createEncryptedRequestData(
        inputBytes,
        Buffer.from(secretString),
        marketId,
      );

    console.warn(
      "Encrypted inputs can be verified /checkEncrypted soon (deployment in progress)",
    );

    const response = await axios.post(
      "http://localhost:8081/proveTx",
      encryptedRequestData,
    );
    console.log("ProveTx response: ", response.data);
  } catch (error) {
    console.error("Error calling /proveTx: ", error);
  }
};

// setTimeout(callProveTx, 5000); // Call /proveTx after 5 seconds

function bufferFromObject(obj: { type: string; data: number[] }): Buffer {
  return Buffer.from(obj.data);
}
