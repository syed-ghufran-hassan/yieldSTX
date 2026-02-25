import { describe, expect, it, beforeAll } from "vitest";
import { simnet } from "@stacks/clarinet-js-sdk";

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const owner = accounts.get("wallet_3")!; // contract owner

describe("STX Yield Contract Tests", () => {
  let contractName = "stx-yield-contract";

  beforeAll(() => {
    // Ensure simnet is running
    expect(simnet.blockHeight).toBeDefined();
  });

  it("should allow users to deposit STX", async () => {
    // User 1 deposits 100 STX
    const deposit1 = await simnet.mineBlock([
      simnet.tx(contractName, "deposit", ["u100"], wallet1),
    ]);
    expect(deposit1.receipts[0].success).toBe(true);

    // User 2 deposits 50 STX
    const deposit2 = await simnet.mineBlock([
      simnet.tx(contractName, "deposit", ["u50"], wallet2),
    ]);
    expect(deposit2.receipts[0].success).toBe(true);

    // Check total-deposits variable
    const totalDeposits = await simnet.callReadOnlyFn(
      contractName,
      "get-total-deposits",
      [],
      owner
    );
    expect(totalDeposits.result).toBeUint(150);
  });

  it("should allow owner to add rewards to users", async () => {
    // Owner adds 10 STX reward to wallet1
    const reward1 = await simnet.mineBlock([
      simnet.tx(contractName, "add-reward", [`'${wallet1.address}`, "u10"], owner),
    ]);
    expect(reward1.receipts[0].success).toBe(true);

    // Owner adds 5 STX reward to wallet2
    const reward2 = await simnet.mineBlock([
      simnet.tx(contractName, "add-reward", [`'${wallet2.address}`, "u5"], owner),
    ]);
    expect(reward2.receipts[0].success).toBe(true);

    // Verify rewards in deposit map
    const deposit1 = await simnet.callReadOnlyFn(
      contractName,
      "get-deposit",
      [`'${wallet1.address}`],
      owner
    );
    expect(deposit1.result).toHaveUintField("reward", 10);

    const deposit2 = await simnet.callReadOnlyFn(
      contractName,
      "get-deposit",
      [`'${wallet2.address}`],
      owner
    );
    expect(deposit2.result).toHaveUintField("reward", 5);
  });

  it("should allow users to withdraw principal + rewards", async () => {
    // Wallet1 withdraws
    const withdraw1 = await simnet.mineBlock([
      simnet.tx(contractName, "withdraw", [], wallet1),
    ]);
    expect(withdraw1.receipts[0].success).toBe(true);
    expect(withdraw1.receipts[0].events[0].stx_transfer.amount).toBe("110"); // 100 + 10

    // Wallet2 withdraws
    const withdraw2 = await simnet.mineBlock([
      simnet.tx(contractName, "withdraw", [], wallet2),
    ]);
    expect(withdraw2.receipts[0].success).toBe(true);
    expect(withdraw2.receipts[0].events[0].stx_transfer.amount).toBe("55"); // 50 + 5

    // Ensure deposits are deleted
    const deposit1After = await simnet.callReadOnlyFn(
      contractName,
      "get-deposit",
      [`'${wallet1.address}`],
      owner
    );
    expect(deposit1After.result).toBeErr();

    const deposit2After = await simnet.callReadOnlyFn(
      contractName,
      "get-deposit",
      [`'${wallet2.address}`],
      owner
    );
    expect(deposit2After.result).toBeErr();
  });

  it("should update total-deposits correctly after withdrawals", async () => {
    const totalDeposits = await simnet.callReadOnlyFn(
      contractName,
      "get-total-deposits",
      [],
      owner
    );
    expect(totalDeposits.result).toBeUint(0);
  });
});
