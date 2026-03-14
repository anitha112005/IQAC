import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MONGO_URI is missing in backend/.env");
    }

    const hasPasswordPlaceholder = mongoUri.includes("<db_password>");
    const hasUsernamePlaceholder = mongoUri.includes("<db_username>");

    if (hasPasswordPlaceholder) {
      const password = process.env.DB_PASSWORD;
      if (!password) {
        throw new Error(
          "Atlas password not configured. Set DB_PASSWORD in backend/.env or replace <db_password> in MONGO_URI."
        );
      }

      mongoUri = mongoUri.replace("<db_password>", encodeURIComponent(password));
    }

    if (hasUsernamePlaceholder) {
      const username = process.env.DB_USERNAME;
      if (!username) {
        throw new Error(
          "Atlas username not configured. Set DB_USERNAME in backend/.env or replace <db_username> in MONGO_URI."
        );
      }

      mongoUri = mongoUri.replace("<db_username>", encodeURIComponent(username));
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("DB connection failed", error.message);
    process.exit(1);
  }
};
