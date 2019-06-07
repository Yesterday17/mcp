const net = require("net");
const minecraft = require("minecraft-protocol");

let req = 0;

const sockets = new Map();

const client = minecraft.createClient({
  username: "Yesterday17",
  version: "1.12.2"
});

client.registerChannel("shadowsocks", ["string", []]);

client.on("chat", function(packet) {
  var jsonMsg = JSON.parse(packet.message);
  if (jsonMsg.translate == "chat.type.announcement") {
    const netClient = net.createServer();
    netClient.on("connection", local => {
      let id = req++,
        written = false;
      sockets.set(id, local);
      local.on("data", data => {
        client.writeChannel(
          "shadowsocks",
          JSON.stringify({
            id: id,
            type: written ? "w" : "s",
            data: data.toJSON()
          })
        );
        written = true;
      });
      local.on("error", () => {});
    });
    netClient.listen(11451);
  }
});

client.on("shadowsocks", data => {
  const d = JSON.parse(data);
  if (d.data) d.data = Buffer.from(d.data.data);

  console.log(d);
  if (d.type === "w") {
    sockets.get(d.id).write(d.data);
  } else if (d.type === "e") {
    sockets.get(d.id).end();
    sockets.delete(d.id);
  }
});
