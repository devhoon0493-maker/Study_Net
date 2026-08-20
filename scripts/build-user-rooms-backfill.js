#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function extractRooms(snapshot) {
  if (!isPlainObject(snapshot)) return {};
  if (isPlainObject(snapshot.rooms)) return snapshot.rooms;
  return snapshot;
}

function buildUserRoomsBackfill(snapshot) {
  const rooms = extractRooms(snapshot);
  const updates = {};
  const stats = {
    roomsScanned: 0,
    roomsWithMembers: 0,
    membershipsIndexed: 0,
    skippedMembers: 0,
  };

  Object.entries(rooms).forEach(([roomId, room]) => {
    stats.roomsScanned += 1;
    if (!isPlainObject(room) || !isPlainObject(room.members)) return;

    stats.roomsWithMembers += 1;
    Object.keys(room.members).forEach((uid) => {
      if (!uid || room.members[uid] == null) {
        stats.skippedMembers += 1;
        return;
      }

      updates[`userRooms/${uid}/${roomId}`] = true;
      stats.membershipsIndexed += 1;
    });
  });

  return { updates, stats };
}

function parseArgs(argv) {
  const options = { input: "", output: "" };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input" || arg === "-i") {
      options.input = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--output" || arg === "-o") {
      options.output = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/build-user-rooms-backfill.js --input ./database-export.json --output ./userRooms-backfill.json",
    "",
    "Input can be either a full Realtime Database export with a top-level rooms key, or the rooms subtree itself.",
  ].join("\n");
}

function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage());
    return;
  }
  if (!options.input) {
    throw new Error("Missing required --input path.\n\n" + usage());
  }

  const inputPath = path.resolve(options.input);
  const raw = fs.readFileSync(inputPath, "utf8");
  const snapshot = JSON.parse(raw);
  const { updates, stats } = buildUserRoomsBackfill(snapshot);
  const output = JSON.stringify(updates, null, 2) + "\n";

  if (options.output) {
    fs.writeFileSync(path.resolve(options.output), output, "utf8");
  } else {
    process.stdout.write(output);
  }

  console.error(
    [
      `rooms scanned: ${stats.roomsScanned}`,
      `rooms with members: ${stats.roomsWithMembers}`,
      `memberships indexed: ${stats.membershipsIndexed}`,
      `skipped members: ${stats.skippedMembers}`,
    ].join("\n"),
  );
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  buildUserRoomsBackfill,
  extractRooms,
  parseArgs,
};
