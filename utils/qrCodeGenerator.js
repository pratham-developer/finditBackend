import crypto from "crypto";
import jwt from "jsonwebtoken";

export const generateClaimToken = (claimRequestId, itemId, requesterId, ownerId) => {
  // Create a payload with all necessary information
  const payload = {
    claimRequestId,
    itemId,
    requesterId,
    ownerId,
    // Add some randomness to prevent token prediction
    nonce: crypto.randomBytes(8).toString('hex'),
    // Set creation timestamp
    iat: Math.floor(Date.now() / 1000)
  };
  
  // Sign with JWT using a secret key (should be in your environment variables)
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

export const verifyClaimToken = (token) => {
  try {
    // Verify the token and return the decoded payload
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
};
