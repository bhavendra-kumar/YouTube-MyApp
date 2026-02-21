import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../Modals/Auth.js";
import Video from "../Modals/video.js";

dotenv.config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main() {
  const DB_URL = requireEnv("DB_URL");

  await mongoose.connect(DB_URL);

  const seedEmail = "seed@youtube-clone.local";
  const seedName = "Seed Channel";

  let seedUser = await User.findOne({ email: seedEmail });
  if (!seedUser) {
    seedUser = await User.create({
      email: seedEmail,
      name: seedName,
      channelname: seedName,
      description: "Seeded channel used for demo videos",
      image: "",
    });
  }

  const seedUploaderId = String(seedUser._id);
  const existingSeedCount = await Video.countDocuments({ uploader: seedUploaderId });
  if (existingSeedCount > 0) {
    console.log(
      `Seed videos already exist for ${seedEmail} (${existingSeedCount}). Skipping seeding.`
    );
    return;
  }

  const now = Date.now();
  const channelName = seedUser.channelname || seedUser.name || "Seed Channel";

  const items = [
    // Music
    {
      category: "Music",
      videotitle: "Lo-fi Beats to Code To (Seed)",
      filename: "video.mp4",
      filetype: "video/mp4",
      filepath: "uploads/video.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader: seedUploaderId,
      views: 120300,
      Like: 4521,
      Dislike: 87,
      createdAt: new Date(now - 1000 * 60 * 60 * 6),
    },
    {
      category: "Music",
      videotitle: "Acoustic Session: Weekend Vibes (Seed)",
      filename: "video1.mp4",
      filetype: "video/mp4",
      filepath: "uploads/video1.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader: seedUploaderId,
      views: 18450,
      Like: 911,
      Dislike: 12,
      createdAt: new Date(now - 1000 * 60 * 60 * 18),
    },

    // Movies
    {
      category: "Movies",
      videotitle: "Top 10 Movie Plot Twists (Seed)",
      filename: "video.mp4",
      filetype: "video/mp4",
      filepath: "uploads/video.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader: seedUploaderId,
      views: 9055,
      Like: 322,
      Dislike: 9,
      createdAt: new Date(now - 1000 * 60 * 60 * 30),
    },
    {
      category: "Movies",
      videotitle: "Behind the Scenes: Mini Short Film (Seed)",
      filename: "video1.mp4",
      filetype: "video/mp4",
      filepath: "uploads/video1.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader: seedUploaderId,
      views: 2210,
      Like: 140,
      Dislike: 3,
      createdAt: new Date(now - 1000 * 60 * 60 * 44),
    },

    // Gaming
    {
      category: "Gaming",
      videotitle: "Gaming Highlights: Clutch Win (Seed)",
      filename: "video.mp4",
      filetype: "video/mp4",
      filepath: "uploads/video.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader: seedUploaderId,
      views: 55321,
      Like: 3210,
      Dislike: 41,
      createdAt: new Date(now - 1000 * 60 * 60 * 54),
    },
    {
      category: "Gaming",
      videotitle: "Beginner Tips: Settings That Help (Seed)",
      filename: "video1.mp4",
      filetype: "video/mp4",
      filepath: "uploads/video1.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader: seedUploaderId,
      views: 8130,
      Like: 540,
      Dislike: 7,
      createdAt: new Date(now - 1000 * 60 * 60 * 70),
    },

    // Sports
    {
      category: "Sports",
      videotitle: "Match Highlights: Last-Minute Winner (Seed)",
      filename: "video.mp4",
      filetype: "video/mp4",
      filepath: "uploads/video.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader: seedUploaderId,
      views: 44780,
      Like: 2122,
      Dislike: 25,
      createdAt: new Date(now - 1000 * 60 * 60 * 82),
    },
    {
      category: "Sports",
      videotitle: "Training Drill: Improve Your Sprint (Seed)",
      filename: "video1.mp4",
      filetype: "video/mp4",
      filepath: "uploads/video1.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader: seedUploaderId,
      views: 3920,
      Like: 188,
      Dislike: 2,
      createdAt: new Date(now - 1000 * 60 * 60 * 96),
    },

    // News
    {
      category: "News",
      videotitle: "Daily Tech News Roundup (Seed)",
      filename: "video.mp4",
      filetype: "video/mp4",
      filepath: "uploads/video.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader: seedUploaderId,
      views: 6120,
      Like: 204,
      Dislike: 6,
      createdAt: new Date(now - 1000 * 60 * 60 * 12),
    },

    // Technology
    {
      category: "Technology",
      videotitle: "Backend API Demo: /video/getall (Seed)",
      filename: "video1.mp4",
      filetype: "video/mp4",
      filepath: "uploads/video1.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader: seedUploaderId,
      views: 2520,
      Like: 180,
      Dislike: 1,
      createdAt: new Date(now - 1000 * 60 * 60 * 72),
    },

    // Comedy
    {
      category: "Comedy",
      videotitle: "When Your Code Works First Try (Seed)",
      filename: "video.mp4",
      filetype: "video/mp4",
      filepath: "uploads/video.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader: seedUploaderId,
      views: 33010,
      Like: 2501,
      Dislike: 13,
      createdAt: new Date(now - 1000 * 60 * 60 * 120),
    },

    // Education
    {
      category: "Education",
      videotitle: "React + Next.js UI Tour (Seed)",
      filename: "video1.mp4",
      filetype: "video/mp4",
      filepath: "uploads/video1.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader: seedUploaderId,
      views: 7842,
      Like: 312,
      Dislike: 9,
      createdAt: new Date(now - 1000 * 60 * 60 * 26),
    },

    // Travel
    {
      category: "Travel",
      videotitle: "A Day Trip Guide: Hidden Spots (Seed)",
      filename: "video.mp4",
      filetype: "video/mp4",
      filepath: "uploads/video.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader: seedUploaderId,
      views: 4990,
      Like: 260,
      Dislike: 5,
      createdAt: new Date(now - 1000 * 60 * 60 * 150),
    },

    // Food
    {
      category: "Food",
      videotitle: "Quick Recipe: 10-Min Pasta (Seed)",
      filename: "video1.mp4",
      filetype: "video/mp4",
      filepath: "uploads/video1.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader: seedUploaderId,
      views: 10120,
      Like: 640,
      Dislike: 11,
      createdAt: new Date(now - 1000 * 60 * 60 * 160),
    },

    // Fashion
    {
      category: "Fashion",
      videotitle: "Style Basics: 5 Outfits, 1 Week (Seed)",
      filename: "video.mp4",
      filetype: "video/mp4",
      filepath: "uploads/video.mp4",
      filesize: "0",
      videochanel: channelName,
      uploader: seedUploaderId,
      views: 7420,
      Like: 380,
      Dislike: 8,
      createdAt: new Date(now - 1000 * 60 * 60 * 200),
    },
  ];

  await Video.insertMany(items);

  const finalCount = await Video.countDocuments();
  console.log(`Seeded ${items.length} videos. Total videos now: ${finalCount}`);
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
  });
