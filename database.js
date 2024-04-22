import mongoose from "mongoose";

const locationSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
    unique: true,
    maxlength: [
      8,
      "*El nombre de usuario no debe superar los ({MAXLENGTH}) carácteres",
    ],
  },
  latitude: Number,
  longitude: Number,
  adress: {
    street: String,
    streetNumber: String,
    city: String,
  },
  date: String,
  time: String,
});

export const Location = mongoose.model("Location", locationSchema);
