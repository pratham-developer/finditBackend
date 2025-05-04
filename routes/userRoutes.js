import express from "express";
import authenticateFirebaseUser from "../middleware/googleAuth.js";
import { User } from "../models/user.js";

const routerUser = express.Router();

// Login or Register User
routerUser.post("/login", authenticateFirebaseUser, async (req, res) => {
    const { email, name, regNo} = req.user;
    if (!email || !name || !regNo) {
        return res.status(400).json({ message: "Email, Name and RegNo are required" });
    }

    try {
        let user = await User.findOne({ email:email, name: name, regNo: regNo });
        if (!user) {
            user = new User({ email:email, name:name, regNo:regNo });
            await user.save();
        }
        return res.status(200).json({
            message: "Logged in successfully",
            user,
        });
    } catch (err) {
        console.error("Error logging in user:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get User Details
routerUser.get("/", authenticateFirebaseUser, async (req, res) => {
    const { email } = req.user;
    if (!email) {
        return res.status(400).json({ message: "email is required" });
    }

    try {
        const user = await User.findOne({ email:email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({ message: "User retrieved successfully", user });
    } catch (err) {
        console.error("Error fetching user", err);
        return res.status(500).json({ message: "Server error" });
    }
});

export default routerUser;
