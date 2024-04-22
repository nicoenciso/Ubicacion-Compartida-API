import { Location } from "./database.js";
import { GraphQLError } from "graphql";
import { PubSub } from "graphql-subscriptions";

const pubsub = new PubSub();

export const typeDefs = `#graphql
  type Adress {
    street: String!
    streetNumber: String!
    city: String!
  }

  type Location {
    _id: ID!
    username: String!
    latitude: Float!
    longitude: Float!
    adress: Adress
    date: String!
    time: String!
  }

  type DeletedCount {
    deletedCount: Int
  }

  input AdressInput {
    street: String
    streetNumber: String
    city: String
  }

  input locationInput {
    latitude: Float!
    longitude: Float!
    adress: AdressInput
    date: String!
    time: String!
  }

  type Query {
    getUser(_id: ID!): Location
    getLocations(ids: [ID!]!): [Location]
    getAllUsers: [Location]
    hello: String
  }

  type Mutation {
    addUser(
    username: String!
    ): Location
    deleteUser(
    _id: ID!
    ): Location
    addLocation(
    _id: ID!
    location: locationInput
    ): Location
    cleanUpInactiveUsers: DeletedCount
  }

  type Subscription {
    locationAdded: Location!
  }
`;

export const resolvers = {
  Query: {
    getUser: async (_, { _id }) => {
      try {
        return await Location.findById(_id);
      } catch (error) {
        if (_id === "" || _id.length < 24) {
          throw new GraphQLError("No has agregado una ID válida");
        }
        throw new GraphQLError("Error al obtener el usuario");
      }
    },
    getLocations: async (_, { ids }) => {
      try {
        return await Location.find({ _id: { $in: ids } });
      } catch (error) {
        throw new GraphQLError("Error al obtener ubicaciones");
      }
    },
    getAllUsers: async (_, args) => {
      try {
        return await Location.find({});
      } catch (error) {
        console.log("Error al obtener los usuarios");
      }
    },
    hello: () => "Ping",
  },
  Mutation: {
    addUser: async (_, args) => {
      const location = new Location({
        ...args,
        latitude: 0.0,
        longitude: 0.0,
        adress: {
          street: "",
          streetNumber: "",
          city: "",
        },
        date: "",
        time: "",
      });
      try {
        return await location.save();
      } catch (error) {
        if (error.name === "ValidationError") {
          const errorMessage = error.message.split("username: ")[1];
          throw new Error(errorMessage);
        }
        throw new GraphQLError("*Error al agregar un usuario");
      }
    },
    deleteUser: async (_, { _id }) => {
      try {
        return await Location.findByIdAndDelete({ _id });
      } catch (error) {
        throw new GraphQLError("*Error al eliminar una ubicacion");
      }
    },
    addLocation: async (_, { _id, location }) => {
      try {
        const locationAdded = await Location.findByIdAndUpdate(
          { _id },
          { ...location }
        );
        pubsub.publish("LOCATION_ADDED", {
          locationAdded: locationAdded,
        });
        return locationAdded;
      } catch (error) {
        throw new GraphQLError("*Error al agregar una ubicacion");
      }
    },
    cleanUpInactiveUsers: async () => {
      const tdaysAgo = new Date();
      const result = tdaysAgo.setDate(tdaysAgo.getDate() - 30);
      const date = new Date(result);
      const options = { year: "2-digit", month: "2-digit", day: "2-digit" };
      try {
        return await Location.deleteMany({
          date: date.toLocaleDateString("en-US", options),
        });
      } catch (error) {
        console.log("No se pudo eliminar los usuarios inactivos");
      }
    },
  },
  Subscription: {
    locationAdded: {
      subscribe: () => pubsub.asyncIterator(["LOCATION_ADDED"]),
    },
  },
};
