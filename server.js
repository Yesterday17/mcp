const net = require("net");
const minecraft = require("minecraft-protocol");
const socks = require("socksv5");
const { readFileSync } = require("fs");
const fake = require("./fakemap");

const {
  socksPort = 60000,
  port: serverPort = 25565,
  online = true,
  motd = "Hello Minecraft Server!",
  maxPlayers = 20,
  msgSender = "Server",
  msgContent = "Hello World!"
} = JSON.parse(readFileSync("./config.server.json", { encoding: "utf-8" }));

const sockets = new Map();

function createSocksServer() {
  const srv = socks.createServer(function(info, accept, deny) {
    accept();
  });
  srv.listen(socksPort, "localhost", function() {
    console.log(`SOCKS server listening on port ${socksPort}`);
  });

  srv.useAuth(socks.auth.None());
  return srv;
}

if (socksPort !== 1080) createSocksServer();

const server = minecraft.createServer({
  host: "0.0.0.0",
  port: serverPort,
  version: "1.12.2",
  "online-mode": online,
  motd: motd,
  maxPlayers: maxPlayers,
  encryption: true
});

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
    with: [msgSender, msgContent]
  };
  client.write("chat", { message: JSON.stringify(msg), position: 0 });

  client.on(fake.get("on-connection"), ({ id, data }) => {
    const socket = new net.Socket();
    socket.connect(socksPort, () => {
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
