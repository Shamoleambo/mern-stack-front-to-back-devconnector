const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");

const Post = require("../../models/Post");
const Profile = require("../../models/Profile");
const User = require("../../models/User");

const auth = require("../../middleware/auth");

router.get("/", auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server error");
  }
});

router.get("/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.log(error.message);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ msg: "Post not found" });
    }

    res.status(500).send("Server error");
  }
});

router.post(
  "/comment/:post_id",
  [
    auth,
    check("text", "Please insert a text for your comment").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: error.array() });
    }

    try {
      const user = await User.findById(req.user.id).select("-password");
      const post = await Post.findById(req.params.post_id);

      const newComment = {
        user: req.user.id,
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
      };

      post.comments.unshift(newComment);
      await post.save();

      res.json(post.comments);
    } catch (error) {
      console.log(error.message);
      res.status(500).send("Server error");
    }
  }
);

router.post(
  "/",
  [
    auth,
    [
      check("text", "Posts can not be empty. Plese write a comment")
        .not()
        .isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select("-password");

      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      });

      const post = await newPost.save();

      res.json(post);
    } catch (error) {
      console.log(error.message);
      res.status(500).send("Server error");
    }
  }
);

router.put("/like/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);

    if (
      post.likes.filter((like) => like.user.toString() === req.user.id).length >
      0
    ) {
      return res.status(400).json({ msg: "Post already liked" });
    }

    post.likes.unshift({ user: req.user.id });
    await post.save();

    res.json(post.likes);
  } catch (error) {
    console.log(errors.message);
    res.status(500).send("Server error");
  }
});

router.put("/unlike/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);

    if (
      post.likes.filter((like) => like.user.toString() === req.user.id)
        .length === 0
    ) {
      return res.status(400).json({ msg: "Post has not yet been liked" });
    }

    const removeIndex = post.likes
      .map((like) => like.user.toString())
      .indexOf(req.user.id);
    post.likes.splice(removeIndex, 1);

    await post.save();

    res.json(post);
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server error");
  }
});

router.delete("/comment/:post_id/:comment_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);
    const comment = post.comments.find(
      (comment) => comment.id.toString() === req.params.comment_id
    );

    if (!comment) {
      return res.status(400).json({ msg: "Comment does not exist" });
    }
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }

    const removeIndex = post.comments
      .map((comment) => comment.id.toString())
      .indexOf(req.params.comment_id);
    post.comments.splice(removeIndex, 1);

    await post.save();

    res.json(post.comments);
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server error");
  }
});

router.delete("/:post_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.post_id);

    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "User not authorized" });
    }
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    await post.remove();
    res.json({ msg: "Post removed" });
  } catch (error) {
    console.log(error.message);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ msg: "Post not found" });
    }
    res.status(500).send("Server error");
  }
});

module.exports = router;
