import fs from "fs";

// Cleanup middleware to remove temporary files in case of errors
export const cleanupTemp = (err, req, res, next) => {
  // If an error occurs and there's a file in the request, delete it
  if (req.file) {
    try {
      fs.unlinkSync(req.file.path);
      // Removed detailed log for security
    } catch (unlinkError) {
      // Removed detailed error log for security
    }
  }
  next(err);
};