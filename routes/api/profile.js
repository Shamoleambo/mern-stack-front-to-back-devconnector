const express = require("express");

const auth = require("../../middleware/auth");

const Profile = require("../../models/Profile");
const User = require("../../models/User");

const router = express.Router();

router.get("/me", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate(
      "user",
      ["name", "avatar"]
    );
    if (!profile) {
      return res.status(400).json({ msg: "There is no profile for this user" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
});

module.exports = router;
