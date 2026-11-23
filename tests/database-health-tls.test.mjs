import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createSecureContext, TLSSocket } from "node:tls";

const require = createRequire(import.meta.url);
const apiRequire = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const { Client, Pool } = apiRequire("pg");
const { PrismaPg } = apiRequire("@prisma/adapter-pg");
const {
  probeDatabase,
  createProbeOperation,
  PROBE_DEADLINE_MS,
} = require("../apps/api/dist/database/health-probe.js");

const SSL_REQUEST = Buffer.from([0, 0, 0, 8, 4, 210, 22, 47]);
const READY = Buffer.from([90, 0, 0, 0, 5, 73]);

function frame(tag, body) {
  const header = Buffer.alloc(5);
  header.write(tag);
  header.writeUInt32BE(body.length + 4, 1);
  return Buffer.concat([header, body]);
}

const column = Buffer.alloc(18);
column.writeUInt32BE(23, 6); // PostgreSQL int4
column.writeInt16BE(4, 10);
column.writeInt32BE(-1, 12);
const SELECT_ONE = Buffer.concat([
  frame(
    "T",
    Buffer.concat([Buffer.from([0, 1]), Buffer.from("result\0"), column]),
  ),
  frame("D", Buffer.from([0, 1, 0, 0, 0, 1, 49])),
  frame("C", Buffer.from("SELECT 1\0")),
  READY,
]);

test("Prisma/pg verifies local PostgreSQL TLS and disposes both transports", async (t) => {
  assert.equal(PROBE_DEADLINE_MS, 2000);
  const directory = mkdtempSync(join(tmpdir(), "khlim-probe-tls-"));
  t.after(() => rmSync(directory, { recursive: true }));
  const certificate = (hostname) => {
    const key = join(directory, `${hostname}.key.pem`);
    const cert = join(directory, `${hostname}.cert.pem`);
    // An ephemeral self-signed certificate is the trust anchor for this test only.
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-days",
        "1",
        "-subj",
        `/CN=${hostname}`,
        "-addext",
        `subjectAltName=DNS:${hostname}`,
        "-keyout",
        key,
        "-out",
        cert,
      ],
      { stdio: "pipe" },
    );
    return {
      cert,
      secureContext: createSecureContext({
        key: readFileSync(key),
        cert: readFileSync(cert),
      }),
    };
  };
  const matching = certificate("localhost");
  const mismatched = certificate("probe.invalid");

  for (const [name, { cert, secureContext }, trusted, expectedCode] of [
    ["trusted query", matching, true, undefined],
    ["active query timeout", matching, true, "KHLIM_PROBE_TIMEOUT"],
    ["hostname mismatch", mismatched, true, "ERR_TLS_CERT_ALTNAME_INVALID"],
    ["untrusted certificate", matching, false, "DEPTH_ZERO_SELF_SIGNED_CERT"],
  ]) {
    await t.test(name, { timeout: 7000 }, async (subtest) => {
      const unhandled = [];
      const recordRejection = (reason) => unhandled.push(reason);
      process.on("unhandledRejection", recordRejection);
      subtest.after(() => process.off("unhandledRejection", recordRejection));

      const stalls = expectedCode === "KHLIM_PROBE_TIMEOUT";
      const queryExpected = expectedCode === undefined || stalls;
      let peer;
      let requests = 0;
      const server = createServer((socket) => {
        peer = socket;
        let request = Buffer.alloc(0);
        const upgrade = (data) => {
          request = Buffer.concat([request, data]);
          if (request.length < SSL_REQUEST.length) return;
          assert.deepEqual(request, SSL_REQUEST);
          socket.off("data", upgrade);
          socket.write("S");
          const tls = new TLSSocket(socket, { isServer: true, secureContext });
          // Hostname and CA rejection may end the peer's TLS handshake.
          tls.on("error", () => {});
          let startup = true;
          let buffer = Buffer.alloc(0);
          tls.on("data", (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);
            if (startup) {
              if (buffer.length < 4 || buffer.length < buffer.readUInt32BE(0))
                return;
              buffer = buffer.subarray(buffer.readUInt32BE(0));
              startup = false;
              tls.write(Buffer.concat([frame("R", Buffer.alloc(4)), READY]));
            }
            if (buffer.length < 5 || buffer.length < 1 + buffer.readUInt32BE(1))
              return;
            if (buffer[0] !== 81) return; // Only respond to the Simple Query frame.
            assert.equal(
              buffer.subarray(5, 1 + buffer.readUInt32BE(1)).toString(),
              "SELECT 1\0",
            );
            requests++;
            if (!stalls) tls.write(SELECT_ONE);
          });
        };
        socket.on("data", upgrade);
      });
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      subtest.after(async () => {
        peer?.destroy();
        await new Promise((resolve) => server.close(resolve));
      });

      const sockets = new Map();
      const observeSocket = (socket) => {
        sockets.set(
          socket,
          new Promise((resolve) => socket.once("close", resolve)),
        );
      };
      const connect = Client.prototype.connect;
      subtest.mock.method(Client.prototype, "connect", function (...args) {
        observeSocket(this.connection.stream);
        this.connection.once("sslconnect", () =>
          observeSocket(this.connection.stream),
        );
        return Reflect.apply(connect, this, args);
      });
      subtest.after(() => {
        for (const socket of sockets.keys()) socket.destroy();
      });
      const end = subtest.mock.method(Pool.prototype, "end");
      const connectAdapter = PrismaPg.prototype.connect;
      let dispose;
      subtest.mock.method(PrismaPg.prototype, "connect", async function () {
        const adapter = await Reflect.apply(connectAdapter, this, []);
        dispose = subtest.mock.method(adapter, "dispose");
        return adapter;
      });

      const url = new URL(
        `postgresql://probe@localhost:${server.address().port}/test`,
      );
      url.password = randomUUID();
      url.searchParams.set("sslmode", "verify-full");
      if (trusted) url.searchParams.set("sslrootcert", cert);
      let cleanup;
      const result = await probeDatabase(url.href, (value) => {
        const operation = createProbeOperation(value);
        return { ...operation, close: () => (cleanup = operation.close()) };
      });
      assert.equal(result.connected, expectedCode === undefined);
      assert.equal(result.code, expectedCode);
      assert.equal(result.stage, queryExpected ? "query" : "connect");
      if (stalls) {
        assert.equal(result.category, "probe_timeout");
        assert.ok(result.durationMs >= PROBE_DEADLINE_MS - 2);
      } else if (expectedCode) {
        assert.equal(result.category, "tls_failure");
      }
      assert.equal(requests, queryExpected ? 1 : 0);
      assert.equal(end.mock.callCount(), 1);
      assert.equal(sockets.size, 2);
      const [raw, tls] = sockets.keys();
      assert.ok(tls instanceof TLSSocket);
      assert.equal(
        raw.destroyed,
        true,
        "probe teardown must destroy the owned socket before returning",
      );
      if (requests) assert.equal(tls.authorized, true);
      await Promise.all([cleanup, ...sockets.values()]);
      assert.equal(dispose.mock.callCount(), 1);
      assert.equal(tls.destroyed, true);
      const { this: pool } = end.mock.calls[0];
      assert.equal(pool.totalCount, 0);
      assert.equal(pool.waitingCount, 0);
      if (!peer.destroyed) await once(peer, "close");
      await new Promise((resolve) => setImmediate(resolve));
      assert.deepEqual(unhandled, []);
    });
  }
});
