const {
  buildUserRoomsBackfill,
  extractRooms,
  parseArgs,
} = require("../../scripts/build-user-rooms-backfill");

describe("build-user-rooms-backfill", () => {
  it("builds userRooms updates from a full database export", () => {
    const result = buildUserRoomsBackfill({
      users: { "user-1": { name: "A" } },
      rooms: {
        "room-1": {
          members: {
            "user-1": { name: "A" },
            "user-2": true,
          },
        },
        "room-2": {
          members: {
            "user-1": { name: "A" },
          },
        },
      },
    });

    expect(result.updates).toEqual({
      "userRooms/user-1/room-1": true,
      "userRooms/user-1/room-2": true,
      "userRooms/user-2/room-1": true,
    });
    expect(result.stats).toEqual({
      roomsScanned: 2,
      roomsWithMembers: 2,
      membershipsIndexed: 3,
      skippedMembers: 0,
    });
  });

  it("accepts a rooms subtree export and skips invalid room records", () => {
    const result = buildUserRoomsBackfill({
      "room-1": { members: { "user-1": true } },
      "room-2": null,
      "room-3": { name: "No members" },
    });

    expect(result.updates).toEqual({
      "userRooms/user-1/room-1": true,
    });
    expect(result.stats.roomsScanned).toBe(3);
    expect(result.stats.roomsWithMembers).toBe(1);
  });

  it("extracts rooms from either supported export shape", () => {
    expect(extractRooms({ rooms: { a: true } })).toEqual({ a: true });
    expect(extractRooms({ a: true })).toEqual({ a: true });
    expect(extractRooms(null)).toEqual({});
  });

  it("parses input and output args", () => {
    expect(parseArgs(["--input", "in.json", "--output", "out.json"])).toEqual({
      input: "in.json",
      output: "out.json",
    });
  });
});
