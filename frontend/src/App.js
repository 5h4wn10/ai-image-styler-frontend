import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function App() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [maskPreview, setMaskPreview] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [resultImage, setResultImage] = useState(null);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState([]);
  const [coordinates, setCoordinates] = useState([]);
  const imageRef = useRef(null);

  // 🟢 WebSocket för progress
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

  // 🟢 Ladda upp bild
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setMaskPreview(null);
    setCoordinates([]); // Rensa tidigare koordinater
  };

  // 🟢 Klicka på bild för att markera punkter
  const handleImageClick = (event) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.round(event.clientX - rect.left);
    const y = Math.round(event.clientY - rect.top);
    setCoordinates([...coordinates, `${x},${y}`]);
  };

  // 🟢 Förhandsvisa masken innan generering
  const handlePreviewMask = async () => {
    if (!image || coordinates.length === 0) return alert("Select an image and mark at least one point!");

    const formData = new FormData();
    formData.append("file", image);
    formData.append("coordinates", coordinates.join(";"));

    try {
      const response = await axios.post("http://localhost:8000/preview-mask/", formData, { responseType: "blob" });
      setMaskPreview(URL.createObjectURL(response.data));
    } catch (error) {
      alert("Error generating mask: " + (error.response?.data?.message || error.message));
    }
  };

  // 🟢 Skicka bild + koordinater för AI-generering
  const handleSubmit = async () => {
    if (!image || !prompt) return alert("Please upload an image and enter a prompt!");

    const formData = new FormData();
    formData.append("file", image);
    formData.append("prompt", prompt);
    formData.append("coordinates", coordinates.join(";"));

    try {
      const response = await axios.post("http://localhost:8000/stylize-image/", formData, { responseType: "blob" });
      setResultImage(URL.createObjectURL(response.data));
      fetchHistory();
    } catch (error) {
      alert("Error generating image: " + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">🎨 AI Image Styler</h1>

      <input type="file" className="border p-2 mb-4 rounded bg-white shadow-md" onChange={handleImageUpload} />
      <input
        type="text"
        placeholder="Enter style prompt (e.g., Van Gogh)"
        className="border p-2 mb-4 w-96 rounded shadow-md"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div className="flex space-x-4">
        <button className="bg-gray-500 text-white px-4 py-2 rounded shadow-md" onClick={handlePreviewMask}>
          Preview Mask
        </button>
        <button className="bg-blue-500 text-white px-4 py-2 rounded shadow-md" onClick={handleSubmit}>
          Generate Image
        </button>
      </div>

      {progress > 0 && <p className="text-gray-600 mt-2">Generating: {progress}% complete</p>}

      {/* 🟢 Visa bild och låt användaren klicka */}
      {imagePreview && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Click on the image to select areas</h2>
          <div className="relative">
            <img
              src={imagePreview}
              alt="Uploaded"
              ref={imageRef}
              className="border cursor-pointer max-w-xs"
              onClick={handleImageClick}
            />
            <p className="mt-2 text-gray-500">Selected Points: {coordinates.join("; ")}</p>
          </div>
        </div>
      )}

      {/* 🟢 Visa maskförhandsvisning */}
      {maskPreview && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Generated Mask Preview</h2>
          <img src={maskPreview} alt="Mask Preview" className="border max-w-xs" />
        </div>
      )}

      {/* 🟢 Visa genererad bild */}
      {resultImage && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <img src={resultImage} alt="AI Generated" className="border max-w-xs" />
        </div>
      )}

      {/* 🟢 Visa historik */}
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
