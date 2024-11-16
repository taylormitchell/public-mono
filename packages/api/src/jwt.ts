import jwt from "jsonwebtoken";
import { config } from "dotenv";

config();
const SECRET_KEY = getSecretKey();

function getSecretKey() {
  const SECRET_KEY = process.env.JWT_SECRET_KEY;
  if (!SECRET_KEY) {
    console.error("JWT_SECRET_KEY is not set in the environment variables");
    process.exit(1);
  }
  return SECRET_KEY;
}

export function generateJwt() {
  const payload = {
    email: "taylor.j.mitchell@gmail.com",
  };
  return jwt.sign(payload, SECRET_KEY);
}

export function verifyJwt(token: string) {
  return jwt.verify(token, SECRET_KEY);
}
