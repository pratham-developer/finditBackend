import express from "express";
import authenticateFirebaseUser from "../middleware/googleAuth.js";
import { Item } from "../models/item.js";
import { User } from "../models/user.js";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";

import fs from "fs";
import path from "path";

const routerItem = express.Router();

// Configure local disk storage first
const upload = multer({ 
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadsDir = path.join(process.cwd(), 'temp-uploads');
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max size
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Create a new item
routerItem.post("/", authenticateFirebaseUser, upload.single("image"), async (req, res) => {
  try {
    const { title, description, contact, category, location, dateFound } = req.body;
    const { email } = req.user;

    // Validate required fields
    if (!title || !description || !contact || !category || !location || !dateFound) {
      // Delete the temporary file if it exists
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find the user posting the item
    const user = await User.findOne({ email });
    if (!user) {
      // Delete the temporary file if it exists
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: "User not found" });
    }

    // Check if image was uploaded
    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "lost-found-items",
      resource_type: "image"
    });

    // Delete temporary file after Cloudinary upload
    fs.unlinkSync(req.file.path);
    
    // Get image URL from Cloudinary
    const imageUrl = result.secure_url;

    // Create the new item
    const newItem = new Item({
      title,
      description,
      contact,
      category,
      imageUrl,
      location,
      dateFound: new Date(dateFound),
      postedBy: user._id,
      status: "found"
    });

    await newItem.save();

    // Add the item reference to the user's registeredItems
    user.registeredItems.push(newItem._id);
    await user.save();

    return res.status(201).json({ 
      message: "Item posted successfully", 
      item: newItem 
    });
  } catch (err) {
    console.error("Error posting item:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get all items with pagination and filters
routerItem.get("/", authenticateFirebaseUser, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      status = "found",
      search 
    } = req.query;
    
    // Build query object
    const query = { status };
    
    // Add category filter if provided
    if (category) {
      query.category = category;
    }
    
    // Add search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } }
      ];
    }

    // Find items that match the query
    const items = await Item.find(query)
      .populate("postedBy", "name regNo")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Get total count for pagination
    const total = await Item.countDocuments(query);

    return res.status(200).json({
      message: "Items retrieved successfully",
      items,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    });
  } catch (err) {
    console.error("Error fetching items:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get an item by ID
routerItem.get("/:id", authenticateFirebaseUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    const item = await Item.findById(id)
      .populate("postedBy", "name regNo email")
      .populate("claimedBy", "name regNo email");
    
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    return res.status(200).json({
      message: "Item retrieved successfully",
      item
    });
  } catch (err) {
    console.error("Error fetching item:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get items posted by the logged-in user
routerItem.get("/user/posts", authenticateFirebaseUser, async (req, res) => {
  try {
    const { email } = req.user;
    
    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Find items posted by the user, populate postedBy and claimedBy
    const items = await Item.find({ postedBy: user._id })
      .populate("postedBy", "name regNo email")
      .populate("claimedBy", "name regNo email")
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      message: "User posted items retrieved successfully",
      items
    });
  } catch (err) {
    console.error("Error fetching user items:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get items claimed by the logged-in user
routerItem.get("/user/claims", authenticateFirebaseUser, async (req, res) => {
  try {
    const { email } = req.user;
    
    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Find items claimed by the user, populate postedBy and claimedBy
    const items = await Item.find({ claimedBy: user._id })
      .populate("postedBy", "name regNo email")
      .populate("claimedBy", "name regNo email")
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      message: "User claimed items retrieved successfully",
      items
    });
  } catch (err) {
    console.error("Error fetching user items:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default routerItem;