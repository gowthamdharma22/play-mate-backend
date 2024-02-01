import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { YoutubeTranscript } from "youtube-transcript";
import { config } from "dotenv";
import ytdl from "ytdl-core";

const app = express();

config();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);

const extractVideoId = (url) => {
  const urlParams = new URLSearchParams(new URL(url).search);
  return urlParams.get("v");
};

const fetchTranscript = async (videoId) => {
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  return transcript;
};

app.route("/summarize").post(async (req, res) => {
  try {
    const youtubeUrl = req.body.url;
    const videoId = extractVideoId(youtubeUrl);
    const transcriptData = await fetchTranscript(videoId);
    const transcript = transcriptData.map((item) => item.text).join(" ");
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Summarize the given paragraph and it is the transcript of a youtube video so give in video summarize but in .md format , Transcript : '${transcript}'`;
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const textBuffer = Buffer.from(text, "utf-8");
    res.setHeader("Content-Type", "text/markdown");
    res.setHeader("Content-Disposition", "attachment; filename=summary.md");
    res.setHeader("Content-Length", textBuffer.length);
    res.send(textBuffer);
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

app.route("/download_chrome_ex").get((req, res) => {
  const videoUrl = req.query.videoUrl;
  if (!videoUrl.includes("www.youtube.com/watch")) {
    res.status(400).send("This is not a YouTube page.");
  } else {
    res.setHeader("Content-Disposition", 'attachment; filename="video.mp4"');
    ytdl(videoUrl, {
      format: "mp4",
    }).pipe(res);
  }
});

app.listen(4004, () => {
  try {
    console.log("Server is listening in port 4004");
  } catch (error) {
    console.log("Error in listening", error);
  }
});
