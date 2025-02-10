import React, { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [image, setImage] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [resultImage, setResultImage] = useState(null);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/progress/");
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data.progress);
    };
    return () => socket.close();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/user-history/");
      setHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch history", error);
    }
  };

  const handleImageUpload = (event) => {
    setImage(event.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!image || !prompt) return alert("Please upload an image and enter a prompt!");

    const formData = new FormData();
    formData.append("file", image);
    formData.append("prompt", prompt);

    try {
      const response = await axios.post("http://localhost:8000/stylize-image/", formData, {
        responseType: "blob",
      });

      setResultImage(URL.createObjectURL(response.data));
      fetchHistory();
    } catch (error) {
      alert("Error generating image: " + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">AI Image Styler 🎨</h1>
      <input type="file" className="border p-2 mb-4" onChange={handleImageUpload} />
      <input
        type="text"
        placeholder="Enter style prompt (e.g., Van Gogh)"
        className="border p-2 mb-4"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        onClick={handleSubmit}
      >
        Generate Image
      </button>
      {progress > 0 && <p className="text-gray-600 mt-2">Generating: {progress}% complete</p>}
      {resultImage && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <img src={resultImage} alt="AI Generated" className="border" />
        </div>
      )}
      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Previously Generated Images</h2>
          <div className="grid grid-cols-3 gap-4">
            {history.map((img, idx) => (
              <img key={idx} src={img.image_url} alt="AI Image" className="border w-32 h-32 object-cover" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
