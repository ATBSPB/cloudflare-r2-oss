import { Hono } from "hono";
import { cors } from "hono/cors";
import buckets from "./routes/buckets";
import files from "./routes/files";
import raw from "./routes/raw";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

app.route("/api/buckets", buckets);
app.route("/api", files);
app.route("/raw", raw);

app.all("*", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
