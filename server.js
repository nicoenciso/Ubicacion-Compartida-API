import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import http from "http";
import cors from "cors";
import bodyParser from "body-parser";
import express from "express";
import mongoose from "mongoose";
import { typeDefs, resolvers } from "./graphql.js";
import cron from "node-cron";

const app = express();
const httpServer = http.createServer(app);

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Conexion a MongoDB exitosa"))
  .catch((error) => console.error("Error al conectar a MongoDB", error));

const schema = makeExecutableSchema({ typeDefs, resolvers });

const wsServer = new WebSocketServer({
  server: httpServer,
});

const serverCleanup = useServer({ schema }, wsServer);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

await server.start();

cron.schedule("0 0 * * *", async () => {
  try {
    const response = await server.executeOperation({
      query: "mutation cleanUpInactiveUsers {cleanUpInactiveUsers {deletedCount}}",
    });
    console.log(`Se eliminaron ${response.body.singleResult.data.cleanUpInactiveUsers.deletedCount} usuarios inactivos`)
  } catch (error) {
    console.log("Error al ejecutar la limpieza:", error)
  }
});

app.get("/ping", (req, res) => {
  res.send("Ping");
});

app.use(cors(), bodyParser.json(), expressMiddleware(server));
await new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));

console.log(`🚀 Server ready`);
