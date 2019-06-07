const net = require("net");
const minecraft = require("minecraft-protocol");
const socks = require("socksv5");

const LOCAL_SOCKS5_PORT = 1080; // 60000;

function createSocksServer() {
  const srv = socks.createServer(function(info, accept, deny) {
    accept();
  });
  srv.listen(LOCAL_SOCKS5_PORT, "localhost", function() {
    console.log(`SOCKS server listening on port ${LOCAL_SOCKS5_PORT}`);
  });

  srv.useAuth(socks.auth.None());
  return srv;
}

if (LOCAL_SOCKS5_PORT !== 1080) createSocksServer();

const server = minecraft.createServer({
  host: "0.0.0.0",
  port: 25565,
  version: "1.12.2",
  "online-mode": false,
  motd: `Yesterday17's void world.`,
  maxPlayers: 10,
  encryption: true
});

const sockets = new Map();

server.on("login", client => {
  client.registerChannel("shadowsocks", ["string", []]);
  client.write("login", {
    entityId: client.id,
    levelType: "default",
    gameMode: 0,
    dimension: 0,
    difficulty: 2,
    maxPlayers: server.maxPlayers,
    reducedDebugInfo: false
  });
  client.write("position", {
    x: 0,
    y: 1.62,
    z: 0,
    yaw: 0,
    pitch: 0,
    flags: 0x00
  });

  const msg = {
    translate: "chat.type.announcement",
    with: ["某昨P", "Welcome! 请自行寻找游戏方式（逃）"]
  };
  client.write("chat", { message: JSON.stringify(msg), position: 0 });

  client.on("shadowsocks", data => {
    const d = JSON.parse(data);
    if (d.data) d.data = Buffer.from(d.data.data);
    console.log(d);
    if (d.type === "s") {
      const s = new net.Socket();
      s.connect(LOCAL_SOCKS5_PORT, () => {
        s.write(d.data);
      });
      s.on("data", data => {
        client.writeChannel(
          "shadowsocks",
          JSON.stringify({
            id: d.id,
            type: "w",
            data: data.toJSON()
          })
        );
      });
      s.on("end", () => {
        client.writeChannel(
          "shadowsocks",
          JSON.stringify({
            id: d.id,
            type: "e"
          })
        );
        sockets.delete(d.id);
      });
      s.on("error", () => {});
      sockets.set(d.id, s);
    } else if (d.type === "w") {
      sockets.get(d.id).write(d.data);
    }
  });
});
