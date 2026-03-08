// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Not authenticated" });
  }
};

export { protect, protect as authMiddleware };