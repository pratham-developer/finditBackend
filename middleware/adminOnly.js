const ADMIN_EMAILS = process.env.ADMIN_EMAILS
? process.env.ADMIN_EMAILS.split(',').map(e => e.trim())
: [];

export function adminOnly(req, res, next) {
  if (!req.user || !ADMIN_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }
  next();
} 