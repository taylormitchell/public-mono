import { expect, describe, it, beforeEach } from "bun:test";
import { ClientDatabase } from "../client";
import { ServerDatabase } from "../server";
import { MapDatabase } from "./map-db";

describe("client db", () => {
  it("basic", async () => {
    const clientDb = new ClientDatabase(new MapDatabase());
    await clientDb.mutate((dx) => {
      dx.put("nodes", "1", { id: "1", text: "test" });
    });
    const note = await clientDb.query((dx) => dx.get("nodes", "1"));
    expect(note).toMatchObject({ id: "1", text: "test" });
  });
});

describe("sync", () => {
  let serverDb: ServerDatabase;
  let clientDb: ClientDatabase;

  beforeEach(() => {
    serverDb = new ServerDatabase(new MapDatabase());
    clientDb = new ClientDatabase(new MapDatabase(), {
      push: async (mutations) => {
        await serverDb.applyClientMutations(mutations);
      },
      pull: async ({ clientId, dbVersionAtLastSync }) => {
        return serverDb.generatePatch(dbVersionAtLastSync, clientId);
      },
    });
  });

  it("basic sync 1", async () => {
    // client mutate
    console.log("calling mutate");
    const mutation = await clientDb.mutate(async (dx) => {
      await dx.put("nodes", "1", { id: "1", text: "test" });
      await dx.put("nodes", "2", { id: "2", text: "test2" });
      await dx.delete("nodes", "1");
    });
    console.log("mutate done", mutation);
    expect(mutation.mutationId).toBe(1);
    expect(await clientDb.query((dx) => dx.get("nodes", "1"))).toBeFalsy();
    expect(await clientDb.query((dx) => dx.get("nodes", "2"))).toEqual({ id: "2", text: "test2" });

    // push
    await clientDb.push();

    // mutate again
    await clientDb.mutate((dx) => {
      dx.put("nodes", "1", { id: "1", text: "test-updated" });
    });

    await clientDb.push();

    // pull
    await clientDb.pull();

    // check client and server data match
    const expectedData = {
      version: 2,
      nodes: {
        "1": { id: "1", text: "test-updated" },
        "2": { id: "2", text: "test2" },
      },
      relations: {},
      trees: {},
    };
    expect(await clientDb.dump()).toEqual(expectedData);
    expect(await serverDb.dump()).toEqual(expectedData);
  });

  it("basic sync 2", async () => {
    // mutate and push
    await clientDb.mutate((dx) => {
      dx.put("nodes", "1", { id: "1", text: "test" });
    });
    await clientDb.push();

    // mutation without push, and then pull
    await clientDb.mutate((dx) => {
      dx.put("nodes", "2", { id: "2", text: "test" });
    });
    await clientDb.pull();

    // expect we still have the mutation
    expect(await clientDb.query((dx) => dx.getAllKeys("nodes"))).toEqual(["1", "2"]);
  });

  it("two clients", async () => {
    const clientDb2 = new ClientDatabase(new MapDatabase(), {
      push: async (mutations) => {
        await serverDb.applyClientMutations(mutations);
      },
      pull: async ({ clientId, dbVersionAtLastSync }) => {
        return serverDb.generatePatch(dbVersionAtLastSync, clientId);
      },
    });

    // client 1 mutate and push
    await clientDb.mutate((dx) => {
      dx.put("nodes", "1", { id: "1", text: "test" });
    });
    await clientDb.push();

    // client 2 mutate and push
    await clientDb2.mutate((dx) => {
      dx.put("nodes", "2", { id: "2", text: "test2" });
    });
    await clientDb2.push();

    // pull and check data match
    await clientDb.pull();
    await clientDb2.pull();
    expect(await clientDb.dump()).toEqual(await clientDb2.dump());
  });
});
