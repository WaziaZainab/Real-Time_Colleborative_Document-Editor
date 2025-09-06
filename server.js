const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- MongoDB connection (no deprecated options) ---
mongoose.connect("mongodb://127.0.0.1:27017/collabdocs")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error(err));

// --- Schema & Model ---
const docSchema = new mongoose.Schema({
  _id: String,
  content: String
});
const Document = mongoose.model("Document", docSchema);

// --- Find or create document ---
async function findOrCreateDoc(id) {
  if (!id) return null;
  let doc = await Document.findById(id);
  if (!doc) {
    doc = new Document({
      _id: id,
      content: "<h1>New Document</h1><p>Start typing...</p>"
    });
    await doc.save();
  }
  return doc;
}

// --- Socket.io events ---
io.on("connection", (socket) => {
  console.log("✅ User connected");

  socket.on("get-document", async (docId) => {
    const document = await findOrCreateDoc(docId);
    socket.join(docId);

    socket.emit("load-document", document.content);

    socket.on("send-changes", async (delta) => {
      await Document.findByIdAndUpdate(docId, { content: delta });
      socket.to(docId).emit("receive-changes", delta);
    });
  });

  socket.on("disconnect", () => console.log("❌ User disconnected"));
});

// --- Serve frontend ---
app.use(express.static("public"));

// --- Dynamic Port Handling (fix EADDRINUSE) ---
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/`);
});

