import "../src/config/env.js";

import mongoose from "mongoose";

import { connectDb } from "../src/config/db.js";
import User from "../src/models/user.js";
import Video from "../src/models/video.js";

const now = Date.now();

const seedEmail = process.env.SEED_UPLOADER_EMAIL || "seed@ytdemo.local";
const seedChannelName = process.env.SEED_CHANNEL_NAME || "Demo Channel";

async function upsertSeedUser() {
  const existing = await User.findOne({ email: seedEmail });
  if (existing) {
    if (!existing.channelname) {
      existing.channelname = seedChannelName;
    }
    if (!existing.name) {
      existing.name = "Demo";
    }
    if (!existing.description) {
      existing.description = "Seeded channel for local development";
    }
    if (!existing.image) {
      existing.image = "https://github.com/shadcn.png";
    }
    await existing.save();
    return existing;
  }

  return User.create({
    email: seedEmail,
    name: "Demo",
    image: "https://github.com/shadcn.png",
    channelname: seedChannelName,
    description: "Seeded channel for local development",
    role: "user",
  });
}

function buildItems({ uploaderId, channelName }) {
  const uploader = String(uploaderId);
  return [
    {
      category: "Music",
      videotitle: "Late Night Acoustic - Chill Vibes You'll Replay 🔥",
      filename: "video1.mp4",
      filetype: "video/mp4",
      filepath: "https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader,
      views: 18450,
      Like: 911,
      Dislike: 12,
      createdAt: new Date(now - 1000 * 60 * 60 * 18),
      updatedAt: new Date(now - 1000 * 60 * 60 * 18),
    },
    {
      category: "Movies",
      videotitle: "Top 10 Mind-Blowing Movie Plot Twists You Didn’t See Coming 🎬",
      filename: "video.mp4",
      filetype: "video/mp4",
      filepath: "https://res.cloudinary.com/demo/video/upload/dog.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader,
      views: 9055,
      Like: 322,
      Dislike: 9,
      createdAt: new Date(now - 1000 * 60 * 60 * 30),
      updatedAt: new Date(now - 1000 * 60 * 60 * 30),
    },
    {
      category: "Gaming",
      videotitle: "Pro Settings Every Beginner Must Enable (Instant Improvement!) 🎮",
      filename: "video1.mp4",
      filetype: "video/mp4",
      filepath: "https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader,
      views: 8130,
      Like: 540,
      Dislike: 7,
      createdAt: new Date(now - 1000 * 60 * 60 * 70),
      updatedAt: new Date(now - 1000 * 60 * 60 * 70),
    },
    {
      category: "Sports",
      videotitle: "Last-Minute Winner! Insane Match Highlights ⚽🔥",
      filename: "video.mp4",
      filetype: "video/mp4",
      filepath: "https://res.cloudinary.com/demo/video/upload/dog.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader,
      views: 44780,
      Like: 2122,
      Dislike: 25,
      createdAt: new Date(now - 1000 * 60 * 60 * 82),
      updatedAt: new Date(now - 1000 * 60 * 60 * 82),
    },
    {
      category: "Sports",
      videotitle: "Speed Training Secrets to Boost Your Sprint Performance 🏃‍♂️",
      filename: "video1.mp4",
      filetype: "video/mp4",
      filepath: "https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader,
      views: 3920,
      Like: 188,
      Dislike: 2,
      createdAt: new Date(now - 1000 * 60 * 60 * 96),
      updatedAt: new Date(now - 1000 * 60 * 60 * 96),
    },
    {
      category: "News",
      videotitle: "Tech News Today: AI Breakthroughs & Startup Shocks 🚀",
      filename: "video.mp4",
      filetype: "video/mp4",
      filepath: "https://res.cloudinary.com/demo/video/upload/dog.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader,
      views: 6120,
      Like: 204,
      Dislike: 6,
      createdAt: new Date(now - 1000 * 60 * 60 * 12),
      updatedAt: new Date(now - 1000 * 60 * 60 * 12),
    },
    {
      category: "Technology",
      videotitle: "Building a Real Backend API from Scratch (Step-by-Step Guide) 💻",
      filename: "video1.mp4",
      filetype: "video/mp4",
      filepath: "https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader,
      views: 2520,
      Like: 180,
      Dislike: 1,
      createdAt: new Date(now - 1000 * 60 * 60 * 72),
      updatedAt: new Date(now - 1000 * 60 * 60 * 72),
    },
    {
      category: "Comedy",
      videotitle: "When your pet dog listens to you for first time 😂",
      filename: "video.mp4",
      filetype: "video/mp4",
      filepath: "https://res.cloudinary.com/demo/video/upload/dog.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader,
      views: 33010,
      Like: 2501,
      Dislike: 13,
      createdAt: new Date(now - 1000 * 60 * 60 * 120),
      updatedAt: new Date(now - 1000 * 60 * 60 * 120),
    },
    {
      category: "Education",
      videotitle: "Complete React + Next.js UI Walkthrough for Beginners 📘",
      filename: "video.mp4",
      filetype: "video/mp4",
      filepath: "https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader,
      views: 7842,
      Like: 312,
      Dislike: 9,
      createdAt: new Date(now - 1000 * 60 * 60 * 26),
      updatedAt: new Date(now - 1000 * 60 * 60 * 26),
    },
    {
      category: "Travel",
      videotitle: "Hidden Travel Spots You Must Visit Once in Your Life 🌍",
      filename: "video.mp4",
      filetype: "video/mp4",
      filepath: "https://res.cloudinary.com/demo/video/upload/dog.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader,
      views: 4990,
      Like: 260,
      Dislike: 5,
      createdAt: new Date(now - 1000 * 60 * 60 * 150),
      updatedAt: new Date(now - 1000 * 60 * 60 * 150),
    },
    {
      category: "Food",
      videotitle: "10-Minute Pasta Recipe That Tastes Like Restaurant Style 🍝",
      filename: "video1.mp4",
      filetype: "video/mp4",
      filepath: "https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader,
      views: 10120,
      Like: 640,
      Dislike: 11,
      createdAt: new Date(now - 1000 * 60 * 60 * 160),
      updatedAt: new Date(now - 1000 * 60 * 60 * 160),
    },
    {
      category: "Fashion",
      videotitle: "5 Outfits for 7 Days – Smart Wardrobe Hacks 👕✨",
      filename: "video.mp4",
      filetype: "video/mp4",
      filepath: "https://res.cloudinary.com/demo/video/upload/dog.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader,
      views: 7420,
      Like: 380,
      Dislike: 8,
      createdAt: new Date(now - 1000 * 60 * 60 * 200),
      updatedAt: new Date(now - 1000 * 60 * 60 * 200),
    },
  ];
}

async function main() {
  await connectDb();
  const seedUser = await upsertSeedUser();
  const uploaderId = seedUser._id;
  const channelName = String(seedUser.channelname || seedChannelName).trim() || seedChannelName;

  // Idempotent: clear previously-seeded videos for this uploader
  await Video.deleteMany({ uploader: String(uploaderId) });

  const items = buildItems({ uploaderId, channelName });
  await Video.insertMany(items);

  // eslint-disable-next-line no-console
  console.log(`[seed:videos] Inserted ${items.length} videos for ${seedEmail} (${String(uploaderId)})`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[seed:videos] Failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
  });