import express from "express";
import authenticateFirebaseUser from "../middleware/googleAuth.js";
import { Item } from "../models/item.js";
import { User } from "../models/user.js";
import { ClaimRequest } from "../models/claim.js";
import { generateClaimToken, verifyClaimToken } from "../utils/qrCodeGenerator.js";
import QRCode from "qrcode";

const routerClaim = express.Router();

// 1. Generate QR code for a specific item (owner action)
routerClaim.post("/generate-qr/:itemId", authenticateFirebaseUser, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { email } = req.user;
    
    // Find the user (item owner)
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Find the item
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    // Verify the user is the item owner
    if (item.postedBy.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "You don't have permission to generate QR for this item" });
    }
    
    // Verify the item isn't already claimed
    if (item.status === "claimed") {
      return res.status(400).json({ message: "This item has already been claimed" });
    }
    
    // Generate a token for the QR code
    // This token will be used by the claimer to verify ownership transfer
    const token = generateClaimToken(
      null, // No claim request ID since we're simplifying
      item._id.toString(),
      null, // No specific requester ID yet
      user._id.toString()
    );
    
    // Store the token temporarily (valid for 5 minutes)
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 5);
    
    // Temporarily store the QR token with the item
    // Create a new field in the item document to store the claim token
    item.claimToken = {
      token,
      expiresAt: expiryTime,
      issuedAt: new Date()
    };
    
    await item.save();
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(token);
    
    return res.status(200).json({
      message: "QR code generated successfully",
      qrCode: qrCodeDataUrl,
      expiresAt: expiryTime
    });
  } catch (err) {
    console.error("Error generating QR code:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// 2. Verify QR code and claim the item (claimer action)
routerClaim.post("/claim-item", authenticateFirebaseUser, async (req, res) => {
  try {
    const { token } = req.body;
    const { email } = req.user;
    
    // Find the claimer
    const claimer = await User.findOne({ email });
    if (!claimer) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Verify the token
    const decodedToken = verifyClaimToken(token);
    if (!decodedToken) {
      return res.status(400).json({ message: "Invalid or expired QR code" });
    }
    
    // Find the item
    const item = await Item.findById(decodedToken.itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    // Verify the item has a valid claim token
    if (!item.claimToken || item.claimToken.token !== token) {
      return res.status(400).json({ message: "QR code is invalid or has been superseded" });
    }
    
    // Check if the QR code is expired
    if (new Date() > new Date(item.claimToken.expiresAt)) {
      return res.status(400).json({ message: "QR code has expired" });
    }
    
    // Verify the item isn't already claimed
    if (item.status === "claimed") {
      return res.status(400).json({ message: "This item has already been claimed" });
    }
    
    // Verify the owner isn't trying to claim their own item
    if (item.postedBy.toString() === claimer._id.toString()) {
      return res.status(400).json({ message: "You cannot claim your own item" });
    }
    
    // Update item status
    item.status = "claimed";
    item.claimedBy = claimer._id;
    item.claimedWhen = new Date();
    
    // Clear the temporary claim token
    item.claimToken = undefined;
    
    await item.save();
    
    // Add the item to user's claimed items
    claimer.claimedItems.push(item._id);
    await claimer.save();
    
    return res.status(200).json({
      message: "Item claimed successfully",
      item
    });
  } catch (err) {
    console.error("Error claiming item:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// 3. Get claimable status of an item (to check if it's still available)
routerClaim.get("/status/:itemId", async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const item = await Item.findById(itemId)
      .select("status title category");
    
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    return res.status(200).json({
      message: "Item status retrieved",
      item: {
        id: item._id,
        title: item.title,
        category: item.category,
        status: item.status,
        isClaimable: item.status === "found"
      }
    });
  } catch (err) {
    console.error("Error fetching item status:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default routerClaim;