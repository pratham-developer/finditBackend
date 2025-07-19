import admin from "../config/firebase.js";

const authenticateFirebaseUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const email = decodedToken.email;
        if(!email.endsWith('@vitstudent.ac.in')){
            return res.status(401).json({ message: "use Vit student email" });
        }
        const name = decodedToken.name;
        const regIndex = name.lastIndexOf(" ");
        const firstName = name.slice(0, regIndex);
        const reg = name.slice(regIndex + 1);
        decodedToken.name = firstName;
        decodedToken.regNo = reg;
        req.user = decodedToken;
        next();
    } catch (err) {
        // Removed detailed error log for security
        return res.status(401).json({ message: "Unauthorized" });
    }
};

export default authenticateFirebaseUser;
