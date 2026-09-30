const { getAuth } = require("firebase-admin/auth");

async function authenticateFirebaseToken(req, res, next) {
  const authorization = req.get("authorization") || "";
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);

  if (!tokenMatch) {
    return res.status(401).json({ error: "A Firebase ID token is required." });
  }

  try {
    req.user = await getAuth().verifyIdToken(tokenMatch[1]);
    return next();
  } catch {
    return res.status(401).json({ error: "The Firebase ID token is invalid or expired." });
  }
}

module.exports = { authenticateFirebaseToken };