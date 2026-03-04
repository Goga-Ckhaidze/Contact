import express from "express";
import User from "../models/User.js";

const router = express.Router();

router.get("/search", async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ message: "Search name required" });
    }

    const users = await User.find({
      username: { $regex: name, $options: "i" }
    }).select("_id username");

    res.json(users);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;