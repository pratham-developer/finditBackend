import fs from "fs";

// Cleanup middleware to remove temporary files in case of errors
export const cleanupTemp = (err, req, res, next) => {
  // If an error occurs and there's a file in the request, delete it
  if (req.file) {
    try {
      fs.unlinkSync(req.file.path);
      console.log(`Temporary file ${req.file.path} deleted due to error`);
    } catch (unlinkError) {
      console.error("Error cleaning up temporary file:", unlinkError);
    }
  }
  next(err);
};