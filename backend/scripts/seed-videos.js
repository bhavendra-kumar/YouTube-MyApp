import mongoose from "mongoose";
import "../src/config/env.js";
import { env } from "../src/config/env.js";
import User from "../src/models/user.js";
import Video from "../src/models/video.js";

function requireEnv(name) {
  const value = env[name] ?? process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

// =============================
// UTIL FUNCTIONS
// =============================

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDuration(isShort) {
  if (isShort) {
    const seconds = randomInt(15, 59);
    return `0:${seconds.toString().padStart(2, "0")}`;
  }

  const minutes = randomInt(3, 15);
  const seconds = randomInt(0, 59);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function calculateTrendingScore(views, likes, comments, hoursAgo) {
  const engagement = views * 0.6 + likes * 0.3 + comments * 0.1;
  return engagement / Math.pow(hoursAgo + 2, 1.5);
}

// =============================
// SEED DATA (category-wise)
// =============================

const seedCategories = [
  {
    name: "Music",
    tags: ["music", "acoustic", "chill", "beats"],
    titles: ["Late Night Acoustic Vibes", "Deep Focus Piano Mix"],
    videos: [
      "https://res.cloudinary.com/demo/video/upload/samples/elephants.mp4",
      "https://res.cloudinary.com/demo/video/upload/samples/sea_turtle.mp4",
    ],
    thumbnails: [
      "https://picsum.photos/seed/music1/800/450",
      "https://picsum.photos/seed/music2/800/450",
    ],
  },

  {
    name: "Movies",
    tags: ["movies", "cinema", "review", "hollywood"],
    titles: ["Top 10 Unexpected Plot Twists", "Hidden Movie Gems You Missed"],
    videos: [
      "https://res.cloudinary.com/demo/video/upload/samples/cld-sample-video.mp4",
      "https://res.cloudinary.com/demo/video/upload/samples/dog.mp4",
    ],
    thumbnails: [
      "https://picsum.photos/seed/movie1/800/450",
      "https://picsum.photos/seed/movie2/800/450",
    ],
  },

  {
    name: "Gaming",
    tags: ["gaming", "fps", "gameplay", "esports"],
    titles: ["Pro Gamer Settings Guide", "Insane Clutch Moments Compilation"],
    videos: [
      "https://res.cloudinary.com/demo/video/upload/samples/horse.mp4",
      "https://res.cloudinary.com/demo/video/upload/samples/snow.mp4",
    ],
    thumbnails: [
      "https://picsum.photos/seed/game1/800/450",
      "https://picsum.photos/seed/game2/800/450",
    ],
  },

  {
    name: "Sports",
    tags: ["sports", "football", "training", "highlights"],
    titles: ["Last-Minute Goal Thriller", "Elite Athlete Training Secrets"],
    videos: [
      "https://res.cloudinary.com/demo/video/upload/samples/clouds.mp4",
      "https://res.cloudinary.com/demo/video/upload/samples/people.mp4",
    ],
    thumbnails: [
      "https://picsum.photos/seed/sport1/800/450",
      "https://picsum.photos/seed/sport2/800/450",
    ],
  },

  {
    name: "Technology",
    tags: ["tech", "programming", "backend", "coding"],
    titles: ["Build REST API From Scratch", "How Databases Scale to Millions"],
    videos: [
      "https://res.cloudinary.com/demo/video/upload/samples/bike.mp4",
      "https://res.cloudinary.com/demo/video/upload/samples/animals.mp4",
    ],
    thumbnails: [
      "https://picsum.photos/seed/tech1/800/450",
      "https://picsum.photos/seed/tech2/800/450",
    ],
  },

  {
    name: "Comedy",
    tags: ["funny", "meme", "comedy", "viral"],
    titles: ["When Code Works First Try", "Programmer Life in 60 Seconds"],
    videos: [
      "https://res.cloudinary.com/demo/video/upload/samples/cat.mp4",
      "https://res.cloudinary.com/demo/video/upload/samples/soccer.mp4",
    ],
    thumbnails: [
      "https://picsum.photos/seed/comedy1/800/450",
      "https://picsum.photos/seed/comedy2/800/450",
    ],
  },

  {
    name: "Education",
    tags: ["education", "react", "mongodb", "tutorial"],
    titles: ["Master React in 20 Minutes", "MongoDB Crash Course"],
    videos: [
      "https://res.cloudinary.com/demo/video/upload/samples/landscape.mp4",
    ],
    thumbnails: [
      "https://picsum.photos/seed/edu1/800/450",
    ],
  },

  {
    name: "Travel",
    tags: ["travel", "vlog", "explore", "adventure"],
    titles: ["Hidden Paradise Destinations", "Cinematic Travel Vlog"],
    videos: [
      "https://res.cloudinary.com/demo/video/upload/samples/mountains.mp4",
      "https://res.cloudinary.com/demo/video/upload/samples/beach.mp4",
    ],
    thumbnails: [
      "https://picsum.photos/seed/travel1/800/450",
      "https://picsum.photos/seed/travel2/800/450",
    ],
  },

  {
    name: "Food",
    tags: ["food", "recipe", "cooking", "streetfood"],
    titles: ["10-Minute Pasta Magic", "Street Food Heaven Tour"],
    videos: [
      "https://res.cloudinary.com/demo/video/upload/samples/cooking.mp4",
    ],
    thumbnails: [
      "https://picsum.photos/seed/food1/800/450",
    ],
  },

  {
    name: "Fashion",
    tags: ["fashion", "style", "outfit", "trend"],
    titles: ["Minimalist Wardrobe Guide", "5 Outfits for 7 Days"],
    videos: [
      "https://res.cloudinary.com/demo/video/upload/samples/city.mp4",
    ],
    thumbnails: [
      "https://picsum.photos/seed/fashion1/800/450",
    ],
  },
];

// =============================
// YOUTUBE SHORTS POOL (20)
// =============================

const shortPool = [
  "https://res.cloudinary.com/demo/video/upload/samples/elephants.mp4",
  "https://res.cloudinary.com/demo/video/upload/samples/sea_turtle.mp4",
  "https://res.cloudinary.com/demo/video/upload/samples/dog.mp4",
  "https://res.cloudinary.com/demo/video/upload/samples/horse.mp4",
  "https://res.cloudinary.com/demo/video/upload/samples/snow.mp4",
  "https://res.cloudinary.com/demo/video/upload/samples/clouds.mp4",
  "https://res.cloudinary.com/demo/video/upload/samples/people.mp4",
  "https://res.cloudinary.com/demo/video/upload/samples/bike.mp4",
  "https://res.cloudinary.com/demo/video/upload/samples/animals.mp4",
  "https://res.cloudinary.com/demo/video/upload/samples/cat.mp4",
  
];

async function main() {
  const DB_URL = env.dbUrl || requireEnv("DB_URL");
  await mongoose.connect(DB_URL);

  const force =
    process.argv.includes("--force") ||
    process.env.SEED_FORCE === "1" ||
    process.env.npm_config_force === "true";

  const seedEmail = "bhavendrakumar007@gmail.com";
  const seedName = "Demo";

  let seedUser = await User.findOne({ email: seedEmail });

  if (!seedUser) {
    seedUser = await User.create({
      email: seedEmail,
      name: seedName,
      channelname: seedName,
      description: "Demo channel for seeded videos",
      image: "",
    });
  }

  const uploaderId = String(seedUser._id);

  const existing = await Video.countDocuments({ uploader: uploaderId });
  if (!force && existing > 0) {
    console.log("Seed data already exists. Skipping...");
    return;
  }

  if (force && existing > 0) {
    await Video.deleteMany({ uploader: uploaderId });
    console.log("Existing seed videos removed (force mode).");
  }

  const now = Date.now();

  const finalVideos = [];

  for (const category of seedCategories) {
    const categoryName = String(category?.name || "").trim();
    if (!categoryName) continue;

    const tags = Array.isArray(category.tags) ? category.tags : [];
    const titles = Array.isArray(category.titles) ? category.titles : [];
    const videos = Array.isArray(category.videos) ? category.videos : [];
    const thumbs = Array.isArray(category.thumbnails) ? category.thumbnails : [];

    const count = Math.min(titles.length, videos.length, thumbs.length);
    for (let i = 0; i < count; i++) {
      const isShort = Math.random() < 0.3;

      const views = randomInt(1000, 80000);
      const likes = randomInt(50, 5000);
      const comments = randomInt(5, 500);
      const hoursAgo = randomInt(1, 200);

      finalVideos.push({
        category: categoryName,
        tags,
        videotitle: String(titles[i] || "Untitled").trim(),
        contentType: isShort ? "short" : "video",
        filename: "demo.mp4",
        filetype: "video/mp4",
        filepath: String(videos[i] || "").trim(),
        thumbnailUrl: String(thumbs[i] || "").trim(),
        filesize: "0",
        videochanel: seedName,
        uploader: uploaderId,
        views,
        Like: likes,
        Dislike: randomInt(0, 50),
        duration: generateDuration(isShort),
        createdAt: new Date(now - hoursAgo * 60 * 60 * 1000),
      });
    }
  }

  // =============================
  // ADD 20 YOUTUBE SHORTS
  // =============================

  for (let i = 0; i < shortPool.length; i++) {
    const views = randomInt(500, 50000);
    const likes = randomInt(20, 4000);
    const comments = randomInt(2, 300);
    const hoursAgo = randomInt(1, 150);

    finalVideos.push({
      category: "Shorts",
      tags: ["shorts", "viral", "quick", "trending"],
      videotitle: `Viral Short Clip #${i + 1}`,
      contentType: "short",
      isShort: true,
      filename: `short-${i + 1}.mp4`,
      filetype: "video/mp4",
      filepath: shortPool[i],
      thumbnailUrl: `https://picsum.photos/seed/short${i + 1}/450/800`,
      filesize: "0",
      videochanel: seedName,
      uploader: uploaderId,
      views,
      Like: likes,
      Dislike: randomInt(0, 20),
      duration: generateDuration(true),
      createdAt: new Date(now - hoursAgo * 60 * 60 * 1000),
    });
  }

  await Video.insertMany(finalVideos);

  console.log(`Seeded ${finalVideos.length} category-wise videos successfully.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });