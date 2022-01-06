const express = require("express");
const request = require("request");
const config = require("config");
const { check, validationResult } = require("express-validator");

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
    console.log(error.message);
    res.status(500).send("Server error");
  }
});

router.get("/github/:username", (req, res) => {
  try {
    const options = {
      uri: `https://api.github.com/users/${
        req.params.username
      }/repos?per_page=5&sort=created:asc&client_id=${config.get(
        "githubClientId"
      )}&client_secret=${config.get("githubSecret")}`,
      method: "GET",
      headers: { "user-agent": "node.js" },
    };

    request(options, (error, response, body) => {
      if (error) console.error(error);

      if (response.statusCode !== 200) {
        return res.status(404).json({ msg: "Github profile not found" });
      }

      res.json(JSON.parse(body));
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server error");
  }
});

router.get("/", async (req, res) => {
  try {
    const profiles = await Profile.find().populate("user", ["name", "avatar"]);
    res.json(profiles);
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server error");
  }
});

router.get("/user/:user_id", async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id,
    }).populate("user", ["name", "avatar"]);

    if (!profile) {
      return res.status(400).json({ msg: "Profile not found" });
    }

    res.json(profile);
  } catch (error) {
    if (error.kind == "ObjectId") {
      return res.status(400).json({ msg: "Profile not found" });
    }
    console.log(error.message);
    res.status(500).send("Server error");
  }
});

router.post(
  "/",
  [
    auth,
    [
      check("status", "Status is required").not().isEmpty(),
      check("skills", "Skills field is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      company,
      website,
      location,
      bio,
      status,
      githubusername,
      skills,
      youtube,
      facebook,
      twitter,
      instagram,
      linkedin,
    } = req.body;

    const profileFields = {};
    profileFields.user = req.user.id;
    if (company) profileFields.company = company;
    if (website) profileFields.website = website;
    if (location) profileFields.location = location;
    if (bio) profileFields.bio = bio;
    if (status) profileFields.status = status;
    if (githubusername) profileFields.githubusername = githubusername;
    if (skills) {
      profileFields.skills = skills.split(",").map((skill) => skill.trim());
    }

    profileFields.social = {};
    if (youtube) profileFields.social.youtube = youtube;
    if (facebook) profileFields.social.facebook = facebook;
    if (twitter) profileFields.social.twitter = twitter;
    if (instagram) profileFields.social.instagram = instagram;
    if (linkedin) profileFields.social.linkedin = linkedin;

    try {
      let profile = await Profile.findOne({ user: req.user.id });
      if (profile) {
        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields },
          { new: true }
        );

        return res.json(profile);
      }

      profile = new Profile(profileFields);
      await profile.save();
      res.json(profile);
    } catch (error) {
      console.log(error.message);
      res.status(500).send("Server error");
    }
  }
);

router.put(
  "/experience",
  [
    auth,
    [
      check("title", "Title is required").not().isEmpty(),
      check("company", "Company is required").not().isEmpty(),
      check("from", "Starting date is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, company, location, from, to, current, description } =
      req.body;
    const newExp = { title, company, location, from, to, current, description };

    try {
      const profile = await Profile.findOne({ user: req.user.id });
      profile.experience.unshift(newExp);
      await profile.save();

      res.json(profile);
    } catch (error) {
      console.log(error.message);
      res.status(500).send("Server error");
    }
  }
);

router.put(
  "/education",
  [
    auth,
    [
      check("school", "Please insert a school").not().isEmpty(),
      check("degree", "Please insert a degree").not().isEmpty(),
      check("fieldofstudy", "Please insert a field of study").not().isEmpty(),
      check("from", "Please insert a starting date").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    console.log("mano");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { school, degree, fieldofstudy, from, to, current, description } =
      req.body;
    const newEdu = {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description,
    };

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      profile.education.unshift(newEdu);

      await profile.save();
      res.json(profile);
    } catch (error) {
      console.log(error.message);
      res.status(500).send("Server error");
    }
  }
);

router.delete("/experience/:experience_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });

    const removeIndex = profile.experience
      .map((item) => item.id)
      .indexOf(req.params.experience_id);
    if (removeIndex < 0) {
      return res
        .status(400)
        .send("The experience you're trying to delete doesn't exist");
    }

    profile.experience.splice(removeIndex, 1);
    await profile.save();

    res.json(profile);
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server error");
  }
});

router.delete("/education/:education_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    const removeIndex = profile.education
      .map((item) => item.id)
      .indexOf(req.params.education_id);
    if (removeIndex < 0) {
      return res
        .status(400)
        .send("The education experience you're trying to delete doesn't exist");
    }

    profile.education.splice(removeIndex, 1);
    await profile.save();

    res.json(profile);
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server error");
  }
});

router.delete("/", auth, async (req, res) => {
  try {
    await Profile.findOneAndDelete({ user: req.user.id });
    await User.findByIdAndDelete(req.user.id);

    res.json({ msg: "User deleted" });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
