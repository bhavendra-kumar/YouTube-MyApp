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
    titles: ["Aaya Ser Lyrical Song - The Paradise",
      "One Direction - Night Changes",
      "The Nights - My Father told me",
      "Shararat Song - Dhurandhar",
      "The Weeknd - Blinding Lights",
      "Raavana Mavandaa Song - Jana Nayagan",
      "Beast Mode Song - Beast",
    ],
    videos: [
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1771955017/Aaya_Sher_-_Lyrical_The_Paradise_Nani_Anirudh_Ravichander_Srikanth_Odela_480P_mjjvv1.mp4",
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772171167/One_Direction_-_Night_Changes_480p_vmn7vn.mp4",
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772171223/Avicii_-_The_Nights_Lyrics_my_father_told_me_480p_d9ubz6.mp4",
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1771955093/Shararat_Dhurandhar_Ranveer_Aditya_Dhar_Shashwat_Jasmine_Madhubanti_Ayesha_Krystle_480p_i4fxqs.mp4",
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772171461/The_Weeknd_-_Blinding_Lights_Official_Video_720p_ae3gek.mp4",
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772171832/Jana_Nayagan_-_Raavana_Mavandaa_Lyrical_Thalapathy_Vijay_Pooja_Hegde_H_Vinoth_Anirudh_KVN_720P_b2lejq.mp4",
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772179575/Beast_Mode_-_Video_Song_Beast_Thalapathy_Vijay_Nelson_Anirudh_Sun_Music_1080p_ie2lie.mp4",
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772181240/ROCKSTAR_Kun_Faya_Kun_Song_8K_Full_Video_Ranbir_Kapoor_A.R._Rahman_Javed_Ali_Mohit_Chauhan_720P_xke6ix.mp4",

    ],

  },

  {
    name: "Movies",
    tags: ["movies", "cinema", "review", "trailer"],
    titles: ["Top 10 Unexpected Plot Twists", "Hidden Movie Gems You Missed"],
    videos: [
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772180866/VARANASI_to_the_WORLD_-_Mahesh_Babu_Official_Trailer_Filmed_For_IMAX_1080p_jk9tlx.mp4",
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772181506/Making_Of_Ram_Charan_s_ICONIC_Intro_Ft._S._S._Rajamouli_RRR_Behind_Beyond_Netflix_India_720P_pugjan.mp4",

    ],

  },

  {
    name: "Gaming",
    tags: ["gaming", "fps", "gameplay", "esports"],
    titles: ["Pro Gamer Settings Guide", "Insane Clutch Moments Compilation"],
    videos: [
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772181432/Dimitri_Vegas_Like_Mike_-_Rampage_Free_Fire_Rampage_Theme_Song_Official_Music_Video_720P_ynzwvk.mp4",

    ],

  },

  {
    name: "Sports",
    tags: ["sports", "football", "training", "highlights"],
    titles: ["IND vs ZIM Match Highlights - Men's T20 World Cup 2026",
      "IND vs SL Match Highlight - Jadeja get Wicket of Shanaka",
      "Rohit rolls to unbeaten ton in clinical ODI chase",
      "Impossible Moments in Sports Compilation",

    ],
    videos: [
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772182069/_Hindi_Highlights_IND_v_ZIM_Men_s_T20_World_Cup_2026_720P_s28vvl.mp4",
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772182216/IND_vs_SL_Live_Now_Ravindra_Jadeja_Gets_the_Wicket_of_Shanaka_144P_du43sx.mp4",
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772182443/Rohit_rolls_to_unbeaten_ton_in_clinical_ODI_chase_1080P_zfdozh.mp4",
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772182510/Impossible_Moments_in_Sports_720P_bpukc6.mp4",


    ],

  },

  {
    name: "Technology",
    tags: ["tech", "programming", "backend", "coding"],
    titles: ["NVIDIA's Big Return to PCs - Tech Giant Plans to Launch Laptop Chips with Dell and Lenovo Models in 2026",
      "How Life Will Look Like in 2050",
    ],
    videos: [
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772182452/NVIDIA_s_BIG_Return_To_PCs_Tech_Giant_Plans_To_Launch_Laptop_Chips_With_Dell_Lenovo_Models_In_2026_720P_t42xvj.mp4",
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772182516/How_Life_Will_Look_Like_In_2050_720p_cjtifm.mp4",

    ],

  },

  {
    name: "Comedy",
    tags: ["funny", "meme", "comedy", "viral"],
    titles: ["My situations in school and home",
      "MAD vs MAD Square- Comedy Scene",
      "Reality - Funny Video",
    ],
    videos: [
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772179628/My_situation_in_school_with_Sahiba_song_videoediting_catreel_funny_viralvideo_720P_vaine8.mp4",
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772184388/_mad_vs_mad_square_movie_comedy_shorts_trending_720P_df5x6s.mp4",
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772184528/Reality_azhar2408_shorts_funny_comedy_youtube_720P_ez7iot.mp4",


    ],

  },

  {
    name: "Education",
    tags: ["education", "react", "mongodb", "tutorial"],
    titles: ["How to connect Frontend and Backend - Connect React and Node Step by Step tutorial CoderzArea 1080P pqbm6r",
    ],
    videos: [
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772181273/How_to_connect_Frontend_and_Backend_Connect_React_and_Node_Step_by_Step_tutorial_CoderzArea_1080P_pqbm6r.mp4",

    ],

  },

  {
    name: "Travel",
    tags: ["travel", "vlog", "explore", "adventure"],
    titles: ["Should never buy BMW, Why?",

    ],
    videos: [
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772179681/Wait_for_end..._720P_yivmy7.mp4",
    ],

  },

  {
    name: "Food",
    tags: ["food", "recipe", "cooking", "streetfood"],
    titles: ["10-Minute Pasta Magic", "Street Food Heaven Tour"],
    videos: [
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772181381/Wedding-style_Chicken_Biryani_Marriage_Biryani_Chicken_Vadi_Biryani_Chicken_Biryani_Cookd_480P_hvqevg.mp4",

    ],

  },

  {
    name: "Fashion",
    tags: ["fashion", "style", "outfit", "trend"],
    titles: ["Minimalist Wardrobe Guide", "5 Outfits for 7 Days"],
    videos: [
      "https://res.cloudinary.com/drf0cgstx/video/upload/v1772179609/Summer_Outfits_fashion_formal_short_720P_kz5ofk.mp4",
    ],

  },
];

// =============================
// YOUTUBE SHORTS POOL (20)
// =============================

const shortPool = [
  "https://res.cloudinary.com/drf0cgstx/video/upload/v1772179602/LET_THE_WORLD_BURN_-_Chris_Grey_lyrics_aesthetic_english_songs_whatsapp_status_speed_up_720P_amcji4.mp4",
  "https://res.cloudinary.com/drf0cgstx/video/upload/v1772179609/Cheap_Thrills_-_Sia_ft._Sean_Paul_lyrics_aesthetic_English_song_lyrics_aesthetic_music_edit_240P_gc6bly.mp4",
  "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
  "https://res.cloudinary.com/drf0cgstx/video/upload/v1772182216/IND_vs_SL_Live_Now_Ravindra_Jadeja_Gets_the_Wicket_of_Shanaka_144P_du43sx.mp4",
  "https://filesamples.com/samples/video/mp4/sample_640x360.mp4",
  "https://filesamples.com/samples/video/mp4/sample_960x400_ocean_with_audio.mp4",
  "https://res.cloudinary.com/drf0cgstx/video/upload/v1772179609/Summer_Outfits_fashion_formal_short_720P_kz5ofk.mp4",
  "https://res.cloudinary.com/drf0cgstx/video/upload/v1772179628/My_situation_in_school_with_Sahiba_song_videoediting_catreel_funny_viralvideo_720P_vaine8.mp4",
  "https://res.cloudinary.com/drf0cgstx/video/upload/v1772179633/Cute_Shorts_for_summer_outfitideas_meesho_meeshohaul_viralshort_trendingshorts_720P_vfgs9a.mp4",
  "https://media.w3.org/2010/05/sintel/trailer.mp4",
  "https://res.cloudinary.com/drf0cgstx/video/upload/v1772184528/Reality_azhar2408_shorts_funny_comedy_youtube_720P_ez7iot.mp4",
"https://res.cloudinary.com/drf0cgstx/video/upload/v1772184388/_mad_vs_mad_square_movie_comedy_shorts_trending_720P_df5x6s.mp4",
  "https://media.w3.org/2010/05/bunny/trailer.mp4",
  "https://res.cloudinary.com/drf0cgstx/video/upload/v1772179638/Shape_of_You_-_Ed_Sheeran_lyrics_aesthetic_whatsapp_Status_English_songs_slowed_sped_up_720P_jfqpj7.mp4",
  "https://res.cloudinary.com/drf0cgstx/video/upload/v1772179681/Wait_for_end..._720P_yivmy7.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/river.mp4",
  "https://media.w3.org/2010/05/video/movie_300.mp4",
  "https://res.cloudinary.com/drf0cgstx/video/upload/v1772182216/IND_vs_SL_Live_Now_Ravindra_Jadeja_Gets_the_Wicket_of_Shanaka_144P_du43sx.mp4",
  "https://media.w3.org/2010/05/video/movie_300.webm",
  "https://res.cloudinary.com/drf0cgstx/video/upload/v1772179701/Sugar_Brownies_-_DHARIA_lyrics_aesthetic_whatsapp_Status_English_songs_slowed_speed_up_720p60_sv4m7x.mp4",
  "https://res.cloudinary.com/drf0cgstx/video/upload/v1772179727/My_situation_in_school_with_Sahiba_song_videoediting_catreel_funny_viralvideo_720P_ngjhcy.mp4",
  "https://res.cloudinary.com/drf0cgstx/video/upload/v1772180117/_720P_te4r6e.mp4",


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