const net = require("net");
const minecraft = require("minecraft-protocol");
const { readFileSync } = require("fs");
const fake = require("./fakemap");

const {
  host,
  port: clientPort = 1080,
  username,
  password,
  version = "1.12.2"
} = JSON.parse(readFileSync("./config.client.json", { encoding: "utf-8" }));

let req = 0;

const sockets = new Map();

const client = minecraft.createClient({
  host,
  username,
  password,
  version
});

for (let entry of fake.entries()) {
  client.registerChannel(entry[1], [
    "container",
    [{ name: "id", type: "i8" }, { name: "data", type: "string" }]
  ]);
}

client.on("chat", function(packet) {
  if (JSON.parse(packet.message).translate == "chat.type.announcement") {
    // 连接成功，收到了系统的欢迎消息
    const localListener = net.createServer();
    localListener.on("connection", local => {
      let id = req++,
        written = false;
      sockets.set(id, local);
      local.on("data", data => {
        client.writeChannel(
          !written ? fake.get("on-connection") : fake.get("on-data"),
          { id, data: data.toString("base64") }
        );
        written = true;
      });
      local.on("error", () => {});
    });
    localListener.listen(clientPort);
  }
});

client.on(fake.get("on-connection"), ({ id, data }) => {
  // NOT NEEDED
});

client.on(fake.get("on-data"), ({ id, data }) => {
  sockets.get(id).write(Buffer.from(data, "base64"));
});

client.on(fake.get("on-end"), ({ id }) => {
  sockets.get(id).end();
  sockets.delete(id);
});

client.on(fake.get("on-error"), ({ id, data }) => {
  //TODO:
});
