
import { createClient } from "@supabase/supabase-js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });

export default async function handler(req) {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const requestOrigin = new URL(req.url).origin;
    const origin = req.headers.get("origin");

    if (origin && origin !== requestOrigin) {
      return json({ error: "Forbidden" }, 403);
    }

    const { email, password } = await req.json();

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.includes("@") ||
      !password
    ) {
      return json({ error: "Invalid request" }, 400);
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      return json({ error: "Server not configured" }, 503);
    }

    const supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    const credentials = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (credentials.error || !credentials.data.user) {
      return json({ error: "Invalid email or password" }, 401);
    }

    // Do not send the password session to the browser.
    const otp = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false
      }
    });

    if (otp.error) {
      return json({ error: "Could not send OTP. Try later." }, 429);
    }

    return json({ sent: true });

  } catch (error) {
    console.error("Sign-in OTP request failed", error);
    return json({ error: "Sign-in service unavailable" }, 500);
  }
}
