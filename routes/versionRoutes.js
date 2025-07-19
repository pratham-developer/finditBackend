import express from 'express';
import fs from 'fs';
import path from 'path';
import { adminOnly } from "../middleware/adminOnly.js";
import authenticateFirebaseUser from "../middleware/googleAuth.js";

const router = express.Router();
const versionFilePath = path.join(path.resolve(), 'version.json');

// GET /api/version
router.get('/version', (req, res) => {
  fs.readFile(versionFilePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Could not read version file' });
    }
    try {
      const versionData = JSON.parse(data);
      return res.json({ message: "Server Working", ...versionData });
    } catch (parseErr) {
      return res.status(500).json({ error: 'Invalid version file format' });
    }
  });
});

// POST /api/admin/version (admin only)
router.post('/admin/version', authenticateFirebaseUser, adminOnly, (req, res) => {
  const { versionName, versionCode, forceUpdate, url } = req.body;
  if (!versionName || !versionCode || typeof forceUpdate !== 'boolean' || !url) {
    return res.status(400).json({ error: 'Missing or invalid fields' });
  }
  const newVersion = { versionName, versionCode, forceUpdate, url };
  fs.writeFile(versionFilePath, JSON.stringify(newVersion, null, 2), 'utf8', (err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not update version file' });
    }
    return res.json({ message: 'Version updated successfully', version: newVersion });
  });
});

export default router; 