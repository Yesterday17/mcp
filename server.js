const net = require("net");
const minecraft = require("minecraft-protocol");
const socks = require("socksv5");

const fake = require("./fakemap");
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
  for (let entry of fake.entries()) {
    client.registerChannel(entry[1], [
      "container",
      [{ name: "id", type: "i8" }, { name: "data", type: "string" }]
    ]);
  }

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

  client.on(fake.get("on-connection"), ({ id, data }) => {
    const socket = new net.Socket();
    socket.connect(LOCAL_SOCKS5_PORT, () => {
      socket.write(Buffer.from(data, "base64"));
    });

    socket.on("data", data => {
      client.writeChannel(fake.get("on-data"), {
        id,
        data: data.toString("base64")
      });
    });

    socket.on("end", () => {
      client.writeChannel(fake.get("on-end"), { id, data: "" });
      sockets.delete(id);
    });

    socket.on("error", () => {});

    sockets.set(id, socket);
  });

  client.on(fake.get("on-data"), ({ id, data }) => {
    sockets.get(id).write(Buffer.from(data, "base64"));
  });

  client.on(fake.get("on-end"), ({ id, data }) => {
    //NOT NEEDED
  });

  client.on(fake.get("on-error"), ({ id, data }) => {
    //TODO:
  });
});
