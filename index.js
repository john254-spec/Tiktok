const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 10000;

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL;

if (!CLIENT_KEY || !CLIENT_SECRET || !BASE_URL) {
  console.warn(
    "WARNING: Set TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET and BASE_URL"
  );
}

const REDIRECT_URI = `${BASE_URL}/auth/tiktok/callback`;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* -----------------------------
   Basic security headers
----------------------------- */

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

/* -----------------------------
   Homepage
----------------------------- */

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Jontez Creator Hub</title>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #080808;
  color: #fff;
}

nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 7%;
  border-bottom: 1px solid #222;
  background: #0d0d0d;
}

.logo {
  font-size: 22px;
  font-weight: bold;
}

nav a {
  color: #aaa;
  text-decoration: none;
  margin-left: 20px;
}

nav a:hover {
  color: #fff;
}

.hero {
  min-height: 75vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 50px 20px;
}

.hero-content {
  max-width: 760px;
}

.badge {
  display: inline-block;
  border: 1px solid #333;
  border-radius: 30px;
  padding: 8px 16px;
  color: #bbb;
  margin-bottom: 20px;
}

h1 {
  font-size: clamp(42px, 8vw, 78px);
  margin: 0 0 20px;
}

h1 span {
  background: linear-gradient(90deg, #ff0050, #00f2ea);
  -webkit-background-clip: text;
  color: transparent;
}

.hero p {
  color: #aaa;
  font-size: 19px;
  line-height: 1.7;
}

.login-btn {
  display: inline-block;
  margin-top: 25px;
  padding: 15px 28px;
  border-radius: 8px;
  background: #fff;
  color: #000;
  text-decoration: none;
  font-weight: bold;
  transition: .2s;
}

.login-btn:hover {
  transform: translateY(-2px);
  background: #eee;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  max-width: 1000px;
  margin: 0 auto;
  padding: 50px 20px;
}

.card {
  background: #111;
  border: 1px solid #222;
  border-radius: 14px;
  padding: 25px;
}

.card h3 {
  margin-top: 0;
}

.card p {
  color: #999;
  line-height: 1.6;
}

footer {
  border-top: 1px solid #222;
  padding: 30px 20px;
  text-align: center;
  color: #777;
}

footer a {
  color: #aaa;
  margin: 0 10px;
}

footer a:hover {
  color: #fff;
}
</style>
</head>

<body>

<nav>
  <div class="logo">Jontez Creator Hub</div>

  <div>
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
  </div>
</nav>

<section class="hero">
  <div class="hero-content">

    <div class="badge">Creator tools & social integration</div>

    <h1>Create.<br><span>Connect.</span> Grow.</h1>

    <p>
      Jontez Creator Hub helps creators connect their social accounts
      and manage creator-focused experiences from one place.
    </p>

    <a class="login-btn" href="/auth/tiktok">
      Continue with TikTok
    </a>

  </div>
</section>

<section class="cards">

  <div class="card">
    <h3>Creator Connection</h3>
    <p>
      Securely connect your supported social account using OAuth authorization.
    </p>
  </div>

  <div class="card">
    <h3>Privacy First</h3>
    <p>
      Access is requested only for functionality supported by the application.
    </p>
  </div>

  <div class="card">
    <h3>Simple Dashboard</h3>
    <p>
      A clean foundation for future creator-management features.
    </p>
  </div>

</section>

<footer>
  <p>© ${new Date().getFullYear()} Jontez Creator Hub</p>

  <p>
    <a href="/privacy">Privacy Policy</a>
    <a href="/terms">Terms of Service</a>
  </p>
</footer>

<script>
console.log("Jontez Creator Hub loaded successfully.");
</script>

</body>
</html>
`);
});

/* -----------------------------
   TikTok OAuth start
----------------------------- */

app.get("/auth/tiktok", (req, res) => {

  if (!CLIENT_KEY || !CLIENT_SECRET || !BASE_URL) {
    return res.status(500).send("TikTok environment variables are not configured.");
  }

  const state = crypto.randomBytes(32).toString("hex");

  res.setHeader(
    "Set-Cookie",
    `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
  );

  const params = new URLSearchParams({
    client_key: CLIENT_KEY,
    response_type: "code",
    scope: "user.info.basic",
    redirect_uri: REDIRECT_URI,
    state
  });

  res.redirect(
    `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
  );
});

/* -----------------------------
   TikTok OAuth callback
----------------------------- */

app.get("/auth/tiktok/callback", async (req, res) => {

  try {

    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).send("Missing authorization code or state.");
    }

    const cookies = req.headers.cookie || "";

    const stateCookie = cookies
      .split(";")
      .map(v => v.trim())
      .find(v => v.startsWith("oauth_state="));

    const savedState = stateCookie
      ? stateCookie.split("=")[1]
      : null;

    if (!savedState || savedState !== state) {
      return res.status(403).send("Invalid OAuth state.");
    }

    const tokenResponse = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_key: CLIENT_KEY,
          client_secret: CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI
        })
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("TikTok token error:", tokenData);
      return res.status(400).send(
        "TikTok authorization failed. Check the server logs."
      );
    }

    const accessToken = tokenData.access_token;

    const userResponse = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      console.error("TikTok user info error:", userData);
      return res.status(400).send(
        "Authorization succeeded, but user information could not be retrieved."
      );
    }

    const user = userData.data?.user || {};

    /*
      IMPORTANT:
      Do not display or store the access token in the browser.
      For a production application, store tokens securely server-side.
    */

    res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TikTok Connected</title>

<style>
body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #080808;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
}

.box {
  width: min(90%, 500px);
  background: #111;
  border: 1px solid #222;
  border-radius: 18px;
  padding: 35px;
}

img {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  object-fit: cover;
}

a {
  display: inline-block;
  margin-top: 20px;
  color: white;
  text-decoration: none;
}
</style>
</head>

<body>

<div class="box">

<h1>Connected successfully ✓</h1>

${
  user.avatar_url
    ? `<img src="${escapeHtml(user.avatar_url)}" alt="Profile">`
    : ""
}

<h2>${escapeHtml(user.display_name || "TikTok creator")}</h2>

<p>
Your account authorization was successfully completed.
</p>

<a href="/">← Back to Jontez Creator Hub</a>

</div>

</body>
</html>
`);

  } catch (error) {

    console.error(error);

    res.status(500).send(
      "An unexpected error occurred during TikTok authorization."
    );
  }
});

/* -----------------------------
   Privacy Policy
----------------------------- */

app.get("/privacy", (req, res) => {

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy Policy - Jontez Creator Hub</title>

<style>
body {
  font-family: Arial, sans-serif;
  background: #080808;
  color: #eee;
  line-height: 1.7;
  margin: 0;
}

main {
  max-width: 850px;
  margin: auto;
  padding: 40px 20px;
}

h1, h2 {
  color: white;
}

a {
  color: #aaa;
}
</style>
</head>

<body>

<main>

<h1>Privacy Policy</h1>

<p>Last updated: September 13, 2026</p>

<p>
Jontez Creator Hub respects your privacy. This Privacy Policy explains
how information may be processed when you use this website.
</p>

<h2>Information We Receive</h2>

<p>
When you choose to connect a supported social account, the service may
receive information made available through the authorization granted by
you, such as your display name, profile information and account
identifiers.
</p>

<h2>How We Use Information</h2>

<p>
Information is used to provide and improve the functionality of the
website, authenticate users, and provide creator-related features.
</p>

<h2>OAuth Authorization</h2>

<p>
Connecting a social account requires authorization through the relevant
platform's official authorization system. You may revoke authorization
through the platform's account settings where supported.
</p>

<h2>Data Security</h2>

<p>
We take reasonable technical measures to protect information handled by
the service. Authentication credentials and access tokens should not be
shared publicly.
</p>

<h2>Third Parties</h2>

<p>
This service may interact with third-party platforms when you explicitly
authorize such integrations. Their own privacy policies may also apply.
</p>

<h2>Contact</h2>

<p>
For privacy questions, contact the website operator through the contact
information provided with this service.
</p>

<p><a href="/">← Back to home</a></p>

</main>

</body>
</html>
`);
});

/* -----------------------------
   Terms
----------------------------- */

app.get("/terms", (req, res) => {

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Terms of Service - Jontez Creator Hub</title>

<style>
body {
  font-family: Arial, sans-serif;
  background: #080808;
  color: #eee;
  line-height: 1.7;
  margin: 0;
}

main {
  max-width: 850px;
  margin: auto;
  padding: 40px 20px;
}

h1, h2 {
  color: white;
}

a {
  color: #aaa;
}
</style>
</head>

<body>

<main>

<h1>Terms of Service</h1>

<p>Last updated: September 13, 2026</p>

<h2>Acceptance</h2>

<p>
By using Jontez Creator Hub, you agree to these Terms of Service.
</p>

<h2>Use of the Service</h2>

<p>
You agree to use the service lawfully and not to interfere with its
operation, abuse authentication systems, or attempt unauthorized access
to accounts or services.
</p>

<h2>Third-Party Services</h2>

<p>
The website may provide integrations with third-party platforms.
Those platforms have their own terms and policies, which remain
applicable to your use of their services.
</p>

<h2>Availability</h2>

<p>
The service is provided on an availability basis and functionality may
change as integrations and third-party APIs change.
</p>

<h2>Account Authorization</h2>

<p>
You are responsible for authorizing only accounts that you own or have
permission to connect.
</p>

<h2>Changes</h2>

<p>
These Terms may be updated when necessary. The updated version will be
published on this page.
</p>

<h2>Contact</h2>

<p>
Questions regarding these Terms may be directed to the website operator
through the contact information associated with the service.
</p>

<p><a href="/">← Back to home</a></p>

</main>

</body>
</html>
`);
});

/* -----------------------------
   Robots
----------------------------- */

app.get("/robots.txt", (req, res) => {
  res.type("text/plain");

  res.send(
`User-agent: *
Allow: /

Sitemap: ${BASE_URL || ""}/sitemap.xml
`
  );
});

/* -----------------------------
   Sitemap
----------------------------- */

app.get("/sitemap.xml", (req, res) => {

  res.type("application/xml");

  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

<url>
  <loc>${BASE_URL}/</loc>
</url>

<url>
  <loc>${BASE_URL}/privacy</loc>
</url>

<url>
  <loc>${BASE_URL}/terms</loc>
</url>

</urlset>`);
});

/* -----------------------------
   Health check
----------------------------- */

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "jontez-creator-hub"
  });
});

/* -----------------------------
   Helper
----------------------------- */

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* -----------------------------
   Start
----------------------------- */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Jontez Creator Hub running on port ${PORT}`);

  if (BASE_URL) {
    console.log(`Website: ${BASE_URL}`);
    console.log(`TikTok callback: ${REDIRECT_URI}`);
  }
});
